// Shared OpenRouter helper with free-model fallback chain.
//
// Free-tier models are best-effort: individual models can 429, time out,
// or return empty content. We try each model in order and use the first
// one that returns usable text, so a single degraded model can't break
// the digest or per-article summaries.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Ordered by benchmarked quality/speed (Oct 2026, live tests with app prompts).
// 1. ling-flash-sante — 2.7–4.3s, clean bullets + digest structure.
// 2. dots-3-note — 2.7s, accurate bullets (note-taking model).
// 3. gemma-4-26b — top-5 production summarizer on OpenRouter; frequently
//    429-congested, kept as last resort.
const MODELS =
    process.env.OPENROUTER_MODEL?.split(',')
        .map((m) => m.trim())
        .filter(Boolean) ??
    [
        'inclusionai/ling-3.0-flash-sante:free',
        'dots-studio/dots-3-note-preview:free',
        'google/gemma-4-26b-a4b-it:free',
    ];

export type ChatMessage = { role: 'system' | 'user'; content: string };

export async function completeWithFallback(
    apiKey: string,
    messages: ChatMessage[],
    opts: { temperature?: number; maxTokens?: number } = {}
): Promise<{ text: string; model: string }> {
    let lastError = 'AI provider failed';
    const errors: string[] = [];

    for (const model of MODELS) {
        try {
            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://jema-news.local',
                    'X-Title': 'Jemanews',
                },
                body: JSON.stringify({
                    model,
                    // Free reasoning models can burn the token budget on hidden
                    // thinking and return empty content — disable it.
                    reasoning: { enabled: false },
                    messages,
                    temperature: opts.temperature ?? 0.3,
                    max_tokens: opts.maxTokens ?? 500,
                }),
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                errors.push(`${model}: HTTP ${response.status} ${errText.slice(0, 120)}`);
                continue;
            }

            const json = await response.json();
            const raw: string | undefined = json?.choices?.[0]?.message?.content;
            const text = raw?.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

            if (text) {
                return { text, model: json?.model || model };
            }
            errors.push(
                `${model}: empty content (finish=${json?.choices?.[0]?.finish_reason ?? '?'})`
            );
        } catch (err) {
            errors.push(`${model}: ${err instanceof Error ? err.message : 'fetch failed'}`);
        }
    }

    console.error('All AI models failed:', errors.join(' | '));
    if (errors.some((e) => e.includes('429'))) {
        lastError = 'AI is rate-limited right now (free tier). Try again in a minute.';
    }
    throw new Error(lastError);
}
