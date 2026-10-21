import NewsList from "@/components/NewsList";
import { isAppTab, type Tab } from "@/lib/tabs";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const t = Array.isArray(tab) ? tab[0] : tab;
  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col">
      {/* Pass the URL tab so the server renders the same branch the client hydrates with */}
      <NewsList initialTab={(isAppTab(t) ? t : "ask") as Tab} />
    </div>
  );
}
