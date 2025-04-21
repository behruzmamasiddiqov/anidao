import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { PlayIcon, PauseIcon, Volume2Icon, VolumeXIcon, ExpandIcon, MinimizeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTime } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  title?: string;
  episodeId: number;
  initialProgress?: number;
  onProgressUpdate?: (progress: number, completed: boolean) => void;
}

export function VideoPlayer({
  src,
  title,
  episodeId,
  initialProgress = 0,
  onProgressUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Initial progress
    video.currentTime = initialProgress;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Send progress every 10 seconds
      if (Math.floor(video.currentTime) % 10 === 0) {
        updateProgress(video.currentTime, false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      updateProgress(video.duration, true);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [initialProgress]);

  const updateProgress = (progress: number, completed: boolean) => {
    if (onProgressUpdate) onProgressUpdate(progress, completed);

    apiRequest("POST", "/api/watch-history", {
      episodeId,
      progress: Math.floor(progress),
      completed,
    }).catch(err => console.error("Failed to update watch progress:", err));
  };

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeout) clearTimeout(controlsTimeout);

      const timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);

      setControlsTimeout(timeout);
    };

    const player = playerRef.current;
    player?.addEventListener("mousemove", handleMouseMove);

    return () => {
      player?.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeout) clearTimeout(controlsTimeout);
    };
  }, [isPlaying, controlsTimeout]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (val: number[]) => {
    const volume = val[0];
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = volume === 0;
    setVolume(volume);
    setIsMuted(volume === 0);
  };

  const handleSeek = (val: number[]) => {
    const seekTime = val[0] * duration;
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleFullscreen = () => {
    const player = playerRef.current;
    if (!player) return;

    if (!isFullscreen) {
      player.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div
      ref={playerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 w-full h-full"
        controls={false}
        playsInline
      />

      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <h2 className="text-white text-lg font-medium">{title}</h2>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Slider
          value={[currentTime / duration || 0]}
          max={1}
          step={0.001}
          onValueChange={handleSeek}
          className="h-1 mb-4"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeXIcon size={20} /> : <Volume2Icon size={20} />}
              </Button>

              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-24 h-1"
              />
            </div>

            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <MinimizeIcon size={20} /> : <ExpandIcon size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}