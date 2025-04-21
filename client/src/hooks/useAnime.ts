import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useAnimes(limit = 20, offset = 0) {
  return useQuery({
    queryKey: [`/api/animes?limit=${limit}&offset=${offset}`],
  });
}

export function useAnime(id: number | null) {
  return useQuery({
    queryKey: [`/api/animes/${id}`],
    enabled: !!id,
  });
}

export function useEpisode(id: number | null) {
  return useQuery({
    queryKey: [`/api/episodes/${id}`],
    enabled: !!id,
  });
}

export function useEpisodeComments(episodeId: number | null) {
  return useQuery({
    queryKey: [`/api/episodes/${episodeId}/comments`],
    enabled: !!episodeId,
  });
}

export function useTrendingAnimes(limit = 5) {
  return useQuery({
    queryKey: [`/api/animes/trending?limit=${limit}`],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNewReleases(limit = 6) {
  return useQuery({
    queryKey: [`/api/animes/new?limit=${limit}`],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWatchHistory() {
  return useQuery({
    queryKey: ['/api/watch-history'],
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ['/api/favorites'],
  });
}

export function useAnimeRating(animeId: number | null) {
  return useQuery({
    queryKey: [`/api/animes/${animeId}/rating`],
    enabled: !!animeId,
  });
}

export function useAddToFavorites() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (animeId: number) => {
      return apiRequest("POST", "/api/favorites", { animeId });
    },
    onSuccess: (_, animeId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: [`/api/animes/${animeId}`] });
      
      toast({
        title: "Added to favorites",
        description: "Anime has been added to your favorites.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add anime to favorites. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useRemoveFromFavorites() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (animeId: number) => {
      return apiRequest("DELETE", `/api/favorites/${animeId}`);
    },
    onSuccess: (_, animeId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: [`/api/animes/${animeId}`] });
      
      toast({
        title: "Removed from favorites",
        description: "Anime has been removed from your favorites.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove anime from favorites. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateWatchHistory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ episodeId, progress, completed }: { episodeId: number, progress: number, completed: boolean }) => {
      return apiRequest("POST", "/api/watch-history", { episodeId, progress, completed });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/watch-history'] });
      queryClient.invalidateQueries({ queryKey: [`/api/episodes/${variables.episodeId}`] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ episodeId, content }: { episodeId: number, content: string }) => {
      return apiRequest("POST", "/api/comments", { episodeId, content });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/episodes/${variables.episodeId}/comments`] });
      
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useAddRating() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ animeId, score }: { animeId: number, score: number }) => {
      return apiRequest("POST", "/api/ratings", { animeId, score });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/animes/${variables.animeId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/animes/${variables.animeId}/rating`] });
      
      toast({
        title: "Rating added",
        description: "Your rating has been submitted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useSearchAnimes(query: string) {
  return useQuery({
    queryKey: [`/api/animes/search?q=${encodeURIComponent(query)}`],
    enabled: !!query && query.length > 0,
  });
}
