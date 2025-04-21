import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/ui/video-player";
import CommentSection from "@/components/anime/CommentSection";
import AnimeSection from "@/components/anime/AnimeSection";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Heart,
  Share2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const episodeId = parseInt(id);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Fetch episode data
  const { data: episode, isLoading, error } = useQuery({
    queryKey: [`/api/episodes/${episodeId}`],
    enabled: !isNaN(episodeId),
  });
  
  // Fetch episode comments
  const { data: comments, isLoading: isCommentsLoading } = useQuery({
    queryKey: [`/api/episodes/${episodeId}/comments`],
    enabled: !isNaN(episodeId),
  });
  
  // Fetch recommended animes
  const { data: recommendedAnimes, isLoading: isRecommendedLoading } = useQuery({
    queryKey: ['/api/animes?limit=6'],
    enabled: !!episode,
  });
  
  // Handle favorite toggle
  const [isFavorite, setIsFavorite] = useState(false);
  
  useEffect(() => {
    // Check if the anime is in user's favorites
    if (episode?.anime?.isFavorite) {
      setIsFavorite(true);
    }
  }, [episode]);
  
  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to add anime to your favorites.",
        variant: "destructive",
      });
      return;
    }
    
    if (!episode) return;
    
    try {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${episode.anime.id}`);
        setIsFavorite(false);
        toast({
          title: "Removed from favorites",
          description: `"${episode.anime.title}" has been removed from your favorites.`,
        });
      } else {
        await apiRequest("POST", "/api/favorites", { animeId: episode.anime.id });
        setIsFavorite(true);
        toast({
          title: "Added to favorites",
          description: `"${episode.anime.title}" has been added to your favorites.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Update watch progress
  const handleProgressUpdate = async (progress: number, completed: boolean) => {
    if (!isAuthenticated || !episode) return;
    
    try {
      await apiRequest("POST", "/api/watch-history", {
        episodeId,
        progress,
        completed,
      });
    } catch (error) {
      console.error("Failed to update watch progress:", error);
    }
  };
  
  // Navigate to previous or next episode
  const navigateToEpisode = (direction: 'prev' | 'next') => {
    if (!episode || !episode.anime || !episode.anime.episodes) return;
    
    const episodes = episode.anime.episodes;
    const currentIndex = episodes.findIndex((ep: any) => ep.id === episodeId);
    
    if (direction === 'prev' && currentIndex > 0) {
      navigate(`/watch/${episodes[currentIndex - 1].id}`);
    } else if (direction === 'next' && currentIndex < episodes.length - 1) {
      navigate(`/watch/${episodes[currentIndex + 1].id}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error || !episode) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Episode Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The episode you're looking for doesn't exist or has been removed.
        </p>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={() => navigate("/")}
        >
          Back to Home
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Video Player */}
          <VideoPlayer
            src={episode.videoUrl}
            title={`${episode.anime.title} - Episode ${episode.number}`}
            episodeId={episode.id}
            initialProgress={episode.watchProgress?.progress || 0}
            onProgressUpdate={handleProgressUpdate}
          />
          
          <div className="mt-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-medium mb-1">{episode.anime.title}</h1>
                <p className="text-sm text-muted-foreground mb-2">
                  Episode {episode.number}: {episode.title}
                </p>
                <div className="flex items-center mb-2">
                  {episode.anime.averageRating && (
                    <>
                      <div className="flex text-yellow-400 text-sm mr-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>
                            {i < Math.floor(episode.anime.averageRating) ? (
                              <i className="fas fa-star"></i>
                            ) : i === Math.floor(episode.anime.averageRating) && 
                               episode.anime.averageRating % 1 >= 0.5 ? (
                              <i className="fas fa-star-half-alt"></i>
                            ) : (
                              <i className="far fa-star"></i>
                            )}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm">{episode.anime.averageRating.toFixed(1)}</span>
                    </>
                  )}
                  <span className="mx-2">•</span>
                  <span className="text-sm">{episode.anime.year}</span>
                  <span className="mx-2">•</span>
                  <span className="text-sm">{episode.anime.type}</span>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-2 md:mt-0">
                <Button
                  variant="outline"
                  onClick={handleFavoriteToggle}
                  className={isFavorite ? "text-primary border-primary" : ""}
                >
                  <Heart className={`mr-2 h-4 w-4 ${isFavorite ? "fill-primary" : ""}`} />
                  {isFavorite ? "Added to List" : "Add to My List"}
                </Button>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              {episode.anime.description}
            </p>
            
            {/* Episode Navigation */}
            <div className="flex justify-between items-center mb-6">
              <Button
                variant="outline"
                onClick={() => navigateToEpisode('prev')}
                disabled={!episode.anime.episodes || episode.anime.episodes.findIndex((ep: any) => ep.id === episodeId) === 0}
              >
                <ChevronLeftIcon className="mr-2 h-4 w-4" /> Previous Episode
              </Button>
              
              <div className="text-sm">
                Episode {episode.number} / {episode.anime.episodes?.length || 0}
              </div>
              
              <Button
                variant="outline"
                onClick={() => navigateToEpisode('next')}
                disabled={!episode.anime.episodes || episode.anime.episodes.findIndex((ep: any) => ep.id === episodeId) === (episode.anime.episodes.length - 1)}
              >
                Next Episode <ChevronRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {/* Episodes List */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">All Episodes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {episode.anime.episodes && episode.anime.episodes.map((ep: any) => (
                  <Button
                    key={ep.id}
                    variant={ep.id === episodeId ? "default" : "outline"}
                    className={ep.id === episodeId ? "bg-primary" : ""}
                    onClick={() => navigate(`/watch/${ep.id}`)}
                  >
                    {ep.number}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Comments Section */}
            <CommentSection 
              episodeId={episodeId} 
              comments={comments || []} 
              isLoading={isCommentsLoading} 
            />
          </div>
        </div>
      </div>
      
      {/* Recommended Anime Section */}
      <AnimeSection
        title="You Might Also Like"
        items={recommendedAnimes || []}
        loading={isRecommendedLoading}
        emptyText="No recommendations available"
      />
    </>
  );
}
