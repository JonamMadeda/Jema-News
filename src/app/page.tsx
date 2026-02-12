import NewsList from "@/components/NewsList";

export default function Home() {
  return (
    <div className="container mx-auto px-6 py-16">
      <div className="mb-12">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#001f3f] mb-2">
          Latest Updates
        </h2>
        <div className="h-1 w-12 bg-[#001f3f] mb-8"></div>
      </div>

      <NewsList />
    </div>
  );
}
