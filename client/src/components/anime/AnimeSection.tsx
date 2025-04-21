import { Link } from "wouter";
import AnimeCard from "./AnimeCard";
import ContinueWatchingCard from "./ContinueWatchingCard";

interface AnimeSectionProps {
  title: string;
  viewAllLink?: string;
  type?: "default" | "continue-watching";
  items: any[];
  loading?: boolean;
  emptyText?: string;
}

export default function AnimeSection({
  title,
  viewAllLink,
  type = "default",
  items,
  loading = false,
  emptyText = "No items found",
}: AnimeSectionProps) {
  // Calculate appropriate grid columns based on content type
  const gridCols = type === "continue-watching"
    ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
  
  return (
    <section className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">{title}</h2>
        {viewAllLink && (
          <Link href={viewAllLink} className="text-primary text-sm hover:underline">
            View All
          </Link>
        )}
      </div>
      
      {loading ? (
        <div className="grid gap-4 animate-pulse">
          <div className="bg-muted rounded h-64 w-full"></div>
        </div>
      ) : items.length > 0 ? (
        <div className={`grid ${gridCols} gap-4`}>
          {type === "continue-watching" ? (
            items.map((item) => (
              <ContinueWatchingCard key={item.id} item={item} />
            ))
          ) : (
            items.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">{emptyText}</p>
        </div>
      )}
    </section>
  );
}
