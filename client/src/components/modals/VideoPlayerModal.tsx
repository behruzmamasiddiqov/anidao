import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/ui/video-player";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { XIcon } from "lucide-react";
import CommentSection from "@/components/anime/CommentSection";
import { apiRequest } from "@/lib/queryClient";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  episodeId: number;
}

export function VideoPlayerModal({ isOpen, onClose, episodeId }: VideoPlayerModalProps) {
  const { toast } = useToast();
  
  // Fetch episode data
  const { 
    data: episode, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [`/api/episodes/${episodeId}`],
    enabled: isOpen && !!episodeId,
  });
  
  // Fetch episode comments
  const { 
    data: comments, 
    isLoading: isLoadingComments 
  } = useQuery({
    queryKey: [`/api/episodes/${episodeId}/comments`],
    enabled: isOpen && !!episodeId,
  });
  
  // Update watch progress
  const handleProgressUpdate = async (progress: number, completed: boolean) => {
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
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load episode. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  // Episodes navigation
  const handleEpisodeSelect = (id: number) => {
    // Close this modal and open a new one with the selected episode
    onClose();
    // Implement logic to navigate to the selected episode
  };
  
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl p-0 bg-card">
          <div className="p-4 flex justify-end">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XIcon className="h-6 w-6" />
            </Button>
          </div>
          <div className="p-8 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!episode) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl p-0 bg-card">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 text-white"
          onClick={onClose}
        >
          <XIcon className="h-6 w-6" />
        </Button>
        
        <div className="relative bg-black rounded-t-lg overflow-hidden">
          <VideoPlayer
            src={episode.videoUrl}
            title={`${episode.anime.title} - Episode ${episode.number}`}
            episodeId={episode.id}
            initialProgress={episode.watchProgress?.progress || 0}
            onProgressUpdate={handleProgressUpdate}
          />
        </div>
        
        <div className="p-4 bg-card">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-medium mb-1">{episode.anime.title}</h2>
              <p className="text-sm text-muted-foreground mb-2">
                Season 1, Episode {episode.number}: {episode.title}
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
                variant="default"
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => {
                  apiRequest("POST", "/api/favorites", { animeId: episode.anime.id })
                    .then(() => {
                      toast({
                        title: "Added to favorites",
                        description: `"${episode.anime.title}" has been added to your favorites.`,
                      });
                    })
                    .catch(() => {
                      toast({
                        title: "Error",
                        description: "Failed to add to favorites. Please try again.",
                        variant: "destructive",
                      });
                    });
                }}
              >
                <i className="fas fa-plus mr-2"></i> My List
              </Button>
              <Button variant="outline">
                <i className="fas fa-share-alt mr-2"></i> Share
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            {episode.anime.description}
          </p>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Episodes</h3>
              <select className="bg-background text-foreground border border-border rounded px-2 py-1 text-xs">
                <option>Season 1</option>
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {episode.anime.episodes?.map((ep: any) => (
                <button
                  key={ep.id}
                  className={`text-left rounded p-2 ${
                    ep.id === episode.id
                      ? "bg-primary/20 border-l-4 border-primary"
                      : "bg-background hover:bg-card"
                  }`}
                  onClick={() => handleEpisodeSelect(ep.id)}
                >
                  <div className="text-xs font-medium">Episode {ep.number}</div>
                  <div className="text-xs text-muted-foreground truncate">{ep.title}</div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Comments Section */}
          <CommentSection 
            episodeId={episodeId} 
            comments={comments || []} 
            isLoading={isLoadingComments} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
