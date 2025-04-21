import { useQuery } from "@tanstack/react-query";
import AnimeSection from "@/components/anime/AnimeSection";
import HeroSection from "@/components/anime/HeroSection";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  
  // Fetch trending anime for hero section
  const { data: trendingAnimes, isLoading: isTrendingLoading } = useQuery({
    queryKey: ['/api/animes/trending?limit=1'],
  });
  
  // Fetch new releases
  const { data: newReleases, isLoading: isNewReleasesLoading } = useQuery({
    queryKey: ['/api/animes/new'],
  });
  
  // Fetch popular anime
  const { data: popularAnimes, isLoading: isPopularLoading } = useQuery({
    queryKey: ['/api/animes?limit=12'],
  });
  
  // Fetch user's continue watching list if authenticated
  const { data: watchHistory, isLoading: isWatchHistoryLoading } = useQuery({
    queryKey: ['/api/watch-history'],
    enabled: isAuthenticated,
  });
  
  // Featured anime for hero section
  const featuredAnime = trendingAnimes && trendingAnimes.length > 0 ? trendingAnimes[0] : null;
  
  return (
    <>
      {/* Hero Section */}
      {featuredAnime && (
        <HeroSection
          anime={featuredAnime}
          episodes={featuredAnime.episodes}
        />
      )}
      
      {/* Continue Watching Section (only show if user is authenticated and has watch history) */}
      {isAuthenticated && watchHistory && watchHistory.length > 0 && (
        <AnimeSection
          title="Continue Watching"
          type="continue-watching"
          items={watchHistory}
          loading={isWatchHistoryLoading}
          emptyText="Start watching anime to see your progress here"
        />
      )}
      
      {/* Popular This Week Section */}
      <AnimeSection
        title="Popular This Week"
        viewAllLink="/explore"
        items={popularAnimes || []}
        loading={isPopularLoading}
        emptyText="No popular anime available"
      />
      
      {/* New Releases Section */}
      <AnimeSection
        title="New Releases"
        viewAllLink="/explore?filter=new"
        items={newReleases || []}
        loading={isNewReleasesLoading}
        emptyText="No new releases available"
      />
    </>
  );
}
