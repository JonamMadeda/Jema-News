// Shared multi-provider AI helper with a fast, interleaved fallback chain.
//
// Providers: openrouter (primary) -> groq (very fast) -> gemini (fast).
// Only providers whose API key is set are attempted. Attempts are interleaved
// by model rank — the first model of every provider is tried before the next
// model of any provider — so one degraded provider can't stall the response.
//
// Free tiers are best-effort: models can 429, time out or return empty
// content. Each attempt has a short timeout and the whole chain has a
// deadline, so callers fail fast instead of hanging.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export type ChatMessage = { role: 'system' | 'user'; content: string };

type Opts = { temperature?: number; maxTokens?: number };

type ProviderId = 'openrouter' | 'groq' | 'gemini';

type Provider = {
    id: ProviderId;
    keyEnvs: string[];
    modelEnv: string;
    defaultModels: string[];
};

const PROVIDERS: Provider[] = [
    {
        id: 'openrouter',
        keyEnvs: ['OPENROUTER_API_KEY'],
        modelEnv: 'OPENROUTER_MODEL',
        defaultModels: [
            'inclusionai/ling-3.0-flash-sante:free',
            'dots-studio/dots-3-note-preview:free',
            'google/gemma-4-26b-a4b-it:free',
        ],
    },
    {
        id: 'groq',
        keyEnvs: ['GROQ_API_KEY'],
        modelEnv: 'GROQ_MODEL',
        defaultModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    },
    {
        id: 'gemini',
        keyEnvs: ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY'],
        modelEnv: 'GEMINI_MODEL',
        defaultModels: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    },
];

function envNumber(name: string, fallback: number, min: number, max: number): number {
    const n = Number.parseInt(process.env[name] ?? '', 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

// Per-attempt cap, and an overall cap for the whole fallback chain.
const ATTEMPT_TIMEOUT_MS = envNumber('AI_TIMEOUT_MS', 12000, 2000, 45000);
const DEADLINE_MS = envNumber('AI_DEADLINE_MS', 25000, 5000, 90000);
// After a 429, skip that provider for a short while so later requests don't
// pay the same latency. Best-effort: lives for the life of this instance.
const COOLDOWN_MS = envNumber('AI_COOLDOWN_MS', 30000, 5000, 300000);
const cooldownUntil = new Map<ProviderId, number>();

function isCoolingDown(id: ProviderId): boolean {
    const until = cooldownUntil.get(id);
    if (!until) return false;
    if (Date.now() >= until) {
        cooldownUntil.delete(id);
        return false;
    }
    return true;
}

function providerKey(p: Provider): string | undefined {
    for (const name of p.keyEnvs) {
        const key = process.env[name];
        if (key) return key;
    }
    return undefined;
}

function providerModels(p: Provider): string[] {
    const raw = process.env[p.modelEnv];
    if (!raw) return p.defaultModels;
    const list = raw
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
    return list.length > 0 ? list : p.defaultModels;
}

function orderedProviders(): Provider[] {
    const order = process.env.AI_PROVIDER_ORDER?.split(',')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
    if (!order || order.length === 0) return PROVIDERS;
    const rank = new Map(order.map((id, i) => [id, i]));
    return [...PROVIDERS].sort(
        (a, b) =>
            (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
}

export function hasAiProvider(): boolean {
    return PROVIDERS.some((p) => Boolean(providerKey(p)));
}

function stripThinking(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function readError(res: Response): Promise<string> {
    const text = await res.text().catch(() => '');
    return `HTTP ${res.status} ${text.slice(0, 140)}`.trim();
}

async function runOpenAiCompatible(
    url: string,
    key: string,
    model: string,
    messages: ChatMessage[],
    opts: Opts,
    signal: AbortSignal,
    extra: Record<string, unknown> = {},
    headers: Record<string, string> = {},
    tokenField: 'max_tokens' | 'max_completion_tokens' = 'max_tokens'
): Promise<string> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            ...headers,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.3,
            [tokenField]: opts.maxTokens ?? 500,
            ...extra,
        }),
        signal,
    });
    if (!res.ok) throw new Error(await readError(res));
    const json = await res.json().catch(() => null);
    return stripThinking(json?.choices?.[0]?.message?.content);
}

async function runGemini(
    key: string,
    model: string,
    messages: ChatMessage[],
    opts: Opts,
    signal: AbortSignal
): Promise<string> {
    const system = messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n');
    const user = messages
        .filter((m) => m.role !== 'system')
        .map((m) => m.content)
        .join('\n\n');

    const url = `${GEMINI_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    const send = (withThinking: boolean) =>
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
                contents: [{ role: 'user', parts: [{ text: user }] }],
                generationConfig: {
                    temperature: opts.temperature ?? 0.3,
                    maxOutputTokens: opts.maxTokens ?? 500,
                    // 2.5 Flash spends tokens "thinking" unless told otherwise.
                    ...(withThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
                },
            }),
            signal,
        });

    let res = await send(true);
    if (res.status === 400) {
        // Some models reject thinkingConfig; retry once without it.
        await res.text().catch(() => '');
        res = await send(false);
    }
    if (!res.ok) throw new Error(await readError(res));

    const json = await res.json().catch(() => null);
    const parts = json?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts
        .filter((p: { thought?: boolean }) => !p?.thought)
        .map((p: { text?: string }) => p?.text ?? '')
        .join('')
        .trim();
}

function runAttempt(
    provider: ProviderId,
    key: string,
    model: string,
    messages: ChatMessage[],
    opts: Opts,
    signal: AbortSignal
): Promise<string> {
    switch (provider) {
        case 'openrouter':
            return runOpenAiCompatible(
                OPENROUTER_URL,
                key,
                model,
                messages,
                opts,
                signal,
                { reasoning: { enabled: false } },
                { 'HTTP-Referer': 'https://jema-news.local', 'X-Title': 'Jemanews' }
            );
        case 'groq':
            return runOpenAiCompatible(
                GROQ_URL,
                key,
                model,
                messages,
                opts,
                signal,
                {},
                {},
                'max_completion_tokens'
            );
        case 'gemini':
            return runGemini(key, model, messages, opts, signal);
        default:
            return Promise.reject(new Error('Unknown AI provider'));
    }
}

export async function completeWithFallback(
    messages: ChatMessage[],
    opts: Opts = {}
): Promise<{ text: string; model: string }> {
    const ranked = orderedProviders()
        .map((p) => ({ provider: p, key: providerKey(p), models: providerModels(p) }))
        .filter((p): p is { provider: Provider; key: string; models: string[] } => Boolean(p.key));

    if (ranked.length === 0) {
        throw new Error(
            'AI not configured. Set OPENROUTER_API_KEY, GROQ_API_KEY or GEMINI_API_KEY.'
        );
    }

    const deadline = Date.now() + DEADLINE_MS;
    const errors: string[] = [];
    const dead = new Set<ProviderId>();
    const maxModels = Math.max(...ranked.map((r) => r.models.length));

    for (let i = 0; i < maxModels; i++) {
        for (const { provider, key, models } of ranked) {
            if (dead.has(provider.id)) continue;
            if (isCoolingDown(provider.id)) {
                errors.push(`${provider.id}: rate-limited (cooldown)`);
                continue;
            }
            const model = models[i];
            if (!model) continue;

            const remaining = deadline - Date.now();
            if (remaining <= 0) {
                errors.push('deadline exceeded');
                i = maxModels;
                break;
            }

            const controller = new AbortController();
            const timer = setTimeout(
                () => controller.abort(),
                Math.min(ATTEMPT_TIMEOUT_MS, remaining)
            );
            try {
                const text = await runAttempt(
                    provider.id,
                    key,
                    model,
                    messages,
                    opts,
                    controller.signal
                );
                if (text) {
                    cooldownUntil.delete(provider.id);
                    return { text, model };
                }
                errors.push(`${provider.id}/${model}: empty response`);
            } catch (err) {
                if (controller.signal.aborted) {
                    errors.push(`${provider.id}/${model}: timed out`);
                } else {
                    const message = err instanceof Error ? err.message : 'request failed';
                    errors.push(`${provider.id}/${model}: ${message}`);
                    // Bad credentials won't recover for this provider's other models.
                    if (/\bHTTP (401|403)\b/.test(message)) dead.add(provider.id);
                    // Rate limits affect every model on the provider.
                    if (/\b429\b|rate.?limit/i.test(message)) {
                        cooldownUntil.set(provider.id, Date.now() + COOLDOWN_MS);
                    }
                }
            } finally {
                clearTimeout(timer);
            }
        }
    }

    console.error('All AI providers failed:', errors.join(' | '));
    const rateLimited = errors.some((e) => /\b429\b|rate.?limit/i.test(e));
    throw new Error(
        rateLimited
            ? 'AI is rate-limited right now. Try again in a minute.'
            : 'AI providers are unavailable right now. Try again shortly.'
    );
}
