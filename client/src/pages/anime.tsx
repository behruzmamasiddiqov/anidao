import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import HeroSection from "@/components/anime/HeroSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayIcon } from "lucide-react";
import { Link } from "wouter";
import { VideoPlayerModal } from "@/components/modals/VideoPlayerModal";
import CommentSection from "@/components/anime/CommentSection";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AnimePage() {
  const { id } = useParams<{ id: string }>();
  const animeId = parseInt(id);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  
  // Fetch anime details
  const { 
    data: anime, 
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/animes/${animeId}`],
    enabled: !isNaN(animeId),
  });
  
  // Fetch user's rating if authenticated
  const { data: userRatingData } = useQuery({
    queryKey: [`/api/animes/${animeId}/rating`],
    enabled: isAuthenticated && !isNaN(animeId),
  });
  
  // Fetch comments for the first episode
  const firstEpisodeId = anime?.episodes?.[0]?.id;
  const { 
    data: comments, 
    isLoading: isCommentsLoading 
  } = useQuery({
    queryKey: [`/api/episodes/${firstEpisodeId}/comments`],
    enabled: !!firstEpisodeId,
  });
  
  // Set user rating from API
  useEffect(() => {
    if (userRatingData) {
      setUserRating(userRatingData.score);
    }
  }, [userRatingData]);
  
  // Handle rating submission
  const handleRateAnime = async (score: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to rate this anime.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest("POST", "/api/ratings", {
        animeId,
        score,
      });
      
      setUserRating(score);
      
      toast({
        title: "Rating submitted",
        description: "Your rating has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Open video player modal
  const handleWatchEpisode = (episodeId: number) => {
    setSelectedEpisodeId(episodeId);
    setPlayerModalOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error || !anime) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Anime Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The anime you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <>
      {/* Hero Section */}
      <HeroSection anime={anime} episodes={anime.episodes} />
      
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="episodes" className="w-full">
          <TabsList>
            <TabsTrigger value="episodes">Episodes</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="episodes" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">Episodes</h2>
              <Select defaultValue="newest">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anime.episodes && anime.episodes.length > 0 ? (
                anime.episodes.map((episode: any) => (
                  <Card key={episode.id} className="overflow-hidden">
                    <div className="relative aspect-video bg-muted group">
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url(${episode.thumbnail || anime.coverImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Button 
                          className="bg-primary hover:bg-primary/90 text-white"
                          onClick={() => handleWatchEpisode(episode.id)}
                        >
                          <PlayIcon className="mr-2 h-4 w-4" /> Watch Now
                        </Button>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Episode {episode.number}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium mb-1 line-clamp-1">{episode.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(episode.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-10">
                  <p className="text-muted-foreground">No episodes available yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h2 className="text-xl font-medium mb-4">About {anime.title}</h2>
                <p className="text-muted-foreground mb-4">{anime.description}</p>
                
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p>{anime.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p>{anime.year}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="capitalize">{anime.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Episodes</p>
                      <p>{anime.episodes?.length || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {anime.genres && anime.genres.length > 0 ? (
                      anime.genres.map((genre: string) => (
                        <Badge key={genre} variant="outline" className="capitalize">
                          {genre.replace('_', ' ')}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No genres specified</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-4">Rate This Anime</h3>
                <div className="bg-card p-4 rounded-lg">
                  <div className="flex justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        className="text-2xl px-1"
                        onClick={() => handleRateAnime(star)}
                      >
                        {userRating && star <= userRating ? (
                          <i className="fas fa-star text-yellow-400"></i>
                        ) : (
                          <i className="far fa-star text-yellow-400"></i>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    {userRating 
                      ? `You rated this ${userRating}/5 stars` 
                      : "Click to rate this anime"}
                  </p>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-4">Average Rating</h3>
                  <div className="bg-card p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold mb-2">
                      {anime.averageRating ? anime.averageRating.toFixed(1) : "N/A"}
                      <span className="text-lg font-normal text-muted-foreground">/5</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Based on {anime.ratingCount || 0} ratings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="comments" className="mt-6">
            <div className="max-w-3xl mx-auto">
              <CommentSection
                episodeId={firstEpisodeId || 0}
                comments={comments || []}
                isLoading={isCommentsLoading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Video player modal */}
      {selectedEpisodeId && (
        <VideoPlayerModal
          isOpen={playerModalOpen}
          onClose={() => setPlayerModalOpen(false)}
          episodeId={selectedEpisodeId}
        />
      )}
    </>
  );
}
