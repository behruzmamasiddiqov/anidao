import { Link, useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { HomeIcon, CompassIcon, HeartIcon, HistoryIcon } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();

  // Fetch trending anime for sidebar
  const { data: trendingAnime, isLoading } = useQuery<any[]>({
    queryKey: ['/api/animes/trending'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Genres list
  const genres = [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy",
    "Horror", "Mystery", "Romance", "Sci-Fi"
  ];

  return (
    <aside
      id="sidebar"
      className={`fixed top-0 left-0 h-full w-64 bg-card z-40 transform transition-transform duration-300 overflow-y-auto pt-20 border-r border-border ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <ScrollArea className="h-full pb-6">
        <div className="px-4 py-2">
          <h3 className="text-xs uppercase text-muted-foreground tracking-wider">Browse</h3>
          <nav className="mt-2">
            <Link href="/" className={`flex items-center px-4 py-3 rounded-md ${
                location === '/' ? 'text-foreground bg-primary/20' : 'text-muted-foreground hover:bg-primary/10'
              }`}>
                <HomeIcon className="mr-3 h-4 w-4" />
                <span>Home</span>
            </Link>
            <Link href="/explore" className={`flex items-center px-4 py-3 rounded-md ${
                location.startsWith('/explore') ? 'text-foreground bg-primary/20' : 'text-muted-foreground hover:bg-primary/10'
              }`}>
                <CompassIcon className="mr-3 h-4 w-4" />
                <span>Explore</span>
            </Link>
            <Link href="/favorites" className={`flex items-center px-4 py-3 rounded-md ${
                location.startsWith('/favorites') ? 'text-foreground bg-primary/20' : 'text-muted-foreground hover:bg-primary/10'
              }`}>
                <HeartIcon className="mr-3 h-4 w-4" />
                <span>My List</span>
            </Link>
            <Link href="/history" className={`flex items-center px-4 py-3 rounded-md ${
                location.startsWith('/history') ? 'text-foreground bg-primary/20' : 'text-muted-foreground hover:bg-primary/10'
              }`}>
                <HistoryIcon className="mr-3 h-4 w-4" />
                <span>History</span>
            </Link>
          </nav>
        </div>
        
        <div className="px-4 py-2 mt-6">
          <h3 className="text-xs uppercase text-muted-foreground tracking-wider">Genres</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Link key={genre} href={`/genre/${genre.toLowerCase()}`}>
                <Badge
                  variant="outline"
                  className="bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 cursor-pointer"
                >
                  {genre}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="px-4 py-2 mt-6">
          <h3 className="text-xs uppercase text-muted-foreground tracking-wider">Trending</h3>
          <div className="mt-2 space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading trending anime...</div>
            ) : (
              trendingAnime && trendingAnime.map((anime: any) => (
                <Link key={anime.id} href={`/anime/${anime.id}`} className="flex items-start hover:bg-primary/10 p-1 rounded-md">
                  <div 
                    className="w-12 h-16 rounded bg-muted"
                    style={{
                      backgroundImage: `url(${anime.coverImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <div className="ml-2">
                    <p className="text-sm font-medium line-clamp-2">{anime.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {anime.type} • {anime.year}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
