import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayIcon, HeartIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AnimeCardProps {
  anime: {
    id: number;
    title: string;
    coverImage: string;
    year?: number;
    averageRating?: number;
    isFavorite?: boolean;
  };
  className?: string;
}

export default function AnimeCard({ anime, className = "" }: AnimeCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(anime.isFavorite || false);
  
  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to add anime to your favorites.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${anime.id}`);
        setIsFavorite(false);
      } else {
        await apiRequest("POST", "/api/favorites", { animeId: anime.id });
        setIsFavorite(true);
      }
      
      // Invalidate favorites and anime queries
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: [`/api/animes/${anime.id}`] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Calculate star rating display
  const rating = anime.averageRating || 0;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <Link href={`/anime/${anime.id}`} className="block">
      <Card className={`bg-card overflow-hidden group transition hover:scale-105 ${className}`}>
        <div className="relative">
          <div 
            className="w-full aspect-[3/4] bg-muted"
            style={{
              backgroundImage: `url(${anime.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 text-white hover:bg-white/20 ${
              isFavorite ? 'text-primary' : 'text-muted'
            }`}
            onClick={handleFavoriteToggle}
          >
            <HeartIcon className={isFavorite ? "fill-primary" : ""} size={18} />
          </Button>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-full w-10 h-10 flex items-center justify-center">
              <PlayIcon size={16} />
            </Button>
          </div>
        </div>
        <div className="p-2">
          <h3 className="text-sm font-medium truncate">{anime.title}</h3>
          <div className="flex items-center mt-1">
            <div className="flex text-yellow-400 text-xs">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}>
                  {i < fullStars ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                    </svg>
                  ) : i === fullStars && hasHalfStar ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M12 18.354L7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006c.448-1.077 1.976-1.077 2.424 0l.038.09L12 18.354z" fill="black" fillOpacity="0.6" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
            {anime.year && (
              <span className="text-xs text-muted-foreground ml-auto">{anime.year}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
