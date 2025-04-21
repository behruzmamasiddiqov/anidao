import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlayIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface HeroSectionProps {
  anime: {
    id: number;
    title: string;
    description: string;
    coverImage: string;
    year: number;
    type: string;
    averageRating?: number | null;
    isFavorite?: boolean;
  };
  episodes?: any[];
}

export default function HeroSection({ anime, episodes }: HeroSectionProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(anime.isFavorite || false);
  
  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to add this anime to your favorites.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${anime.id}`);
        setIsFavorite(false);
        toast({
          title: "Removed from favorites",
          description: `"${anime.title}" has been removed from your favorites.`,
        });
      } else {
        await apiRequest("POST", "/api/favorites", { animeId: anime.id });
        setIsFavorite(true);
        toast({
          title: "Added to favorites",
          description: `"${anime.title}" has been added to your favorites.`,
        });
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
  
  return (
    <section className="relative h-[500px] overflow-hidden">
      <div className="absolute inset-0">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `url(${anime.coverImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>
      </div>
      
      <div className="relative h-full container mx-auto px-4 flex flex-col justify-end pb-10">
        <div className="max-w-2xl">
          <Badge className="bg-primary/90 text-white text-xs px-2 py-1 rounded mb-3">
            {anime.type}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">{anime.title}</h1>
          <div className="flex items-center mb-3 text-sm">
            <span className="mr-3">{anime.year}</span>
            <span className="mr-3">|</span>
            <span className="mr-3">{anime.type}</span>
            {anime.averageRating && (
              <>
                <span className="mr-3">|</span>
                <span className="text-primary mr-1">
                  {(anime.averageRating * 20).toFixed(0)}%
                </span>
                <span className="mr-3">Match</span>
              </>
            )}
          </div>
          <p className="text-muted-foreground mb-5 max-w-xl">{anime.description}</p>
          <div className="flex flex-wrap gap-3">
            {episodes && episodes.length > 0 && (
              <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                <Link href={`/watch/${episodes[0].id}`}>
                  <PlayIcon className="mr-2 h-4 w-4" /> Watch Now
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              className="border-border hover:bg-card"
              onClick={handleFavoriteToggle}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {isFavorite ? "Remove from List" : "Add to My List"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
