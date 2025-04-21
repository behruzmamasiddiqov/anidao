import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlayIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { LoginModal } from "@/components/modals/LoginModal";
import { format, formatDistanceToNow } from "date-fns";

export default function HistoryPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Fetch user's watch history
  const { data: watchHistory, isLoading } = useQuery({
    queryKey: ['/api/watch-history'],
    enabled: isAuthenticated,
  });
  
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Watch History</h1>
          <p className="text-muted-foreground mb-6">
            Please log in to view your watch history.
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
        <h1 className="text-3xl font-bold mb-6">Watch History</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-card rounded-md overflow-hidden">
              <div className="w-full aspect-video bg-muted"></div>
              <div className="p-3">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Calculate relative time for display
  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (e) {
      return "some time ago";
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Watch History</h1>
      
      {watchHistory && watchHistory.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {watchHistory.map((item: any) => (
            <Link key={item.id} href={`/watch/${item.episode.id}`}>
              <Card className="bg-card overflow-hidden group hover:shadow-md transition">
                <div className="relative">
                  <div 
                    className="w-full aspect-video bg-muted"
                    style={{
                      backgroundImage: `url(${item.anime.coverImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      <PlayIcon className="mr-2 h-4 w-4" />
                      {item.completed ? "Watch Again" : "Continue Watching"}
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Episode {item.episode.number}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-medium mb-1">{item.anime.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.episode.title}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {item.completed ? "Completed" : "In Progress"}
                      </span>
                      <span>
                        Updated {getTimeAgo(item.updatedAt)}
                      </span>
                    </div>
                    
                    <Progress 
                      value={item.completed ? 100 : item.episode.duration ? (item.progress / item.episode.duration) * 100 : 0}
                      className="h-1"
                    />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-6">
            You haven't watched any anime yet.
          </p>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => navigate("/")}
          >
            Start Watching
          </Button>
        </div>
      )}
    </div>
  );
}
