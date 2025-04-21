import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ThumbsUpIcon, ThumbsDownIcon, UserIcon, ReplyIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface CommentSectionProps {
  episodeId: number;
  comments: any[];
  isLoading: boolean;
}

export default function CommentSection({ episodeId, comments = [], isLoading }: CommentSectionProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to add a comment.",
        variant: "destructive",
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Empty comment",
        description: "Please write something before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await apiRequest("POST", "/api/comments", {
        episodeId,
        content: content.trim(),
      });
      
      setContent("");
      queryClient.invalidateQueries({ queryKey: [`/api/episodes/${episodeId}/comments`] });
      
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to add comment",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLike = async (commentId: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to like comments.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest("POST", `/api/comments/${commentId}/like`);
      queryClient.invalidateQueries({ queryKey: [`/api/episodes/${episodeId}/comments`] });
    } catch (error) {
      toast({
        title: "Failed to like comment",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDislike = async (commentId: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to dislike comments.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest("POST", `/api/comments/${commentId}/dislike`);
      queryClient.invalidateQueries({ queryKey: [`/api/episodes/${episodeId}/comments`] });
    } catch (error) {
      toast({
        title: "Failed to dislike comment",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // For time since comment was posted
  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (e) {
      return "some time ago";
    }
  };
  
  return (
    <div>
      <h3 className="font-medium mb-3">Comments</h3>
      <div className="mb-4">
        <form onSubmit={handleCommentSubmit}>
          <Textarea
            placeholder="Add a comment..."
            className="w-full bg-background border border-border rounded p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!isAuthenticated || isSubmitting}
          />
          <div className="flex justify-end mt-2">
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={!isAuthenticated || isSubmitting}
            >
              Comment
            </Button>
          </div>
        </form>
      </div>
      
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="flex">
              <div className="rounded-full bg-muted h-8 w-8 mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full mb-1"></div>
                <div className="h-3 bg-muted rounded w-4/5"></div>
              </div>
            </div>
            <div className="flex">
              <div className="rounded-full bg-muted h-8 w-8 mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full mb-1"></div>
                <div className="h-3 bg-muted rounded w-3/5"></div>
              </div>
            </div>
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex">
              <Avatar className="h-8 w-8 rounded-full mr-3">
                <AvatarImage src={comment.user.photoUrl || ""} alt={comment.user.username} />
                <AvatarFallback>
                  {comment.user.firstName?.[0] || <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center">
                  <h4 className="text-sm font-medium mr-2">{comment.user.username}</h4>
                  <span className="text-xs text-muted-foreground">
                    {getTimeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm mt-1">{comment.content}</p>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs flex items-center mr-3 hover:text-primary"
                    onClick={() => handleLike(comment.id)}
                  >
                    <ThumbsUpIcon className="h-3 w-3 mr-1" /> {comment.likes}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs flex items-center mr-3 hover:text-destructive"
                    onClick={() => handleDislike(comment.id)}
                  >
                    <ThumbsDownIcon className="h-3 w-3 mr-1" /> {comment.dislikes}
                  </Button>
                  {/* <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs hover:text-primary"
                  >
                    <ReplyIcon className="h-3 w-3 mr-1" /> Reply
                  </Button> */}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
}
