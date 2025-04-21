import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ContinueWatchingCardProps {
  item: {
    episode: {
      id: number;
      title: string;
      number: number;
    };
    anime: {
      id: number;
      title: string;
      coverImage: string;
    };
    progress: number;
    completed: boolean;
  };
}

export default function ContinueWatchingCard({ item }: ContinueWatchingCardProps) {
  const { anime, episode, progress, completed } = item;
  
  // Calculate progress percentage
  const progressPercentage = completed ? 100 : 
    progress > 0 ? Math.min(100, progress / 100) : 65;
  
  return (
    <Link href={`/watch/${episode.id}`} className="block">
      <Card className="bg-card overflow-hidden group">
        <div className="relative">
          <div 
            className="w-full aspect-[3/4] bg-muted"
            style={{
              backgroundImage: `url(${anime.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-muted">
            <div className="bg-primary h-full" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-full w-12 h-12 flex items-center justify-center">
              <PlayIcon size={20} />
            </Button>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium truncate">{anime.title}</h3>
            <span className="text-xs text-muted-foreground">EP {episode.number}</span>
          </div>
          <div className="flex items-center mt-1">
            <div className="text-xs text-muted-foreground mr-2">
              {progressPercentage.toFixed(0)}% complete
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
