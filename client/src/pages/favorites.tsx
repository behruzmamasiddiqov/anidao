import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { PlayIcon, XIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { LoginModal } from "@/components/modals/LoginModal";

export default function FavoritesPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Fetch user's favorites
  const { 
    data: favorites, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['/api/favorites'],
    enabled: isAuthenticated,
  });
  
  // Remove from favorites
  const handleRemoveFavorite = async (animeId: number) => {
    try {
      await apiRequest("DELETE", `/api/favorites/${animeId}`);
      refetch();
      
      toast({
        title: "Removed from favorites",
        description: "Anime has been removed from your favorites.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from favorites. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">My Favorites</h1>
          <p className="text-muted-foreground mb-6">
            Please log in to view and manage your favorite anime.
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => setIsLoginModalOpen(true)}
          >
            Login with Telegram
          </Button>
          
          <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Favorites</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-pulse">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-card rounded-md overflow-hidden">
              <div className="w-full aspect-[3/4] bg-muted"></div>
              <div className="p-3">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Favorites</h1>
      
      {favorites && favorites.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {favorites.map((favorite: any) => (
            <Card key={favorite.id} className="bg-card overflow-hidden group relative">
              <Link href={`/anime/${favorite.anime.id}`}>
                <div className="relative">
                  <div 
                    className="w-full aspect-[3/4] bg-muted"
                    style={{
                      backgroundImage: `url(${favorite.anime.coverImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Button className="bg-primary hover:bg-primary/90 text-white rounded-full w-10 h-10 flex items-center justify-center">
                      <PlayIcon size={16} />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium truncate">{favorite.anime.title}</h3>
                  {favorite.anime.year && (
                    <p className="text-xs text-muted-foreground">
                      {favorite.anime.year} • {favorite.anime.type}
                    </p>
                  )}
                </div>
              </Link>
              
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveFavorite(favorite.anime.id);
                }}
              >
                <XIcon size={16} />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-6">
            You haven't added any anime to your favorites yet.
          </p>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => navigate("/")}
          >
            Browse Anime
          </Button>
        </div>
      )}
    </div>
  );
}
