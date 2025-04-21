import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (options: any) => void;
      };
    };
    onTelegramAuth: (user: any) => void;
  }
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Function to handle Telegram login
  const handleTelegramLogin = () => {
    setIsLoggingIn(true);
    
    // Create a script that will load the Telegram Login Widget
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    
    // Add the script to the head
    document.head.appendChild(script);
    
    script.onload = () => {
      if (window.Telegram) {
        // Define the callback function that Telegram will use
        window.onTelegramAuth = async (user: any) => {
          if (!user) {
            toast({
              title: "Login cancelled",
              description: "Telegram login was cancelled.",
              variant: "destructive",
            });
            setIsLoggingIn(false);
            return;
          }
          
          try {
            await login(user);
            toast({
              title: "Login successful",
              description: "You have been logged in successfully.",
            });
            onClose();
          } catch (error) {
            console.error("Login error:", error);
            toast({
              title: "Login failed",
              description: "Failed to authenticate with Telegram. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsLoggingIn(false);
          }
        };
        
        // Open the Telegram login popup
        window.Telegram.Login.auth(
          {
            bot_id: "anidaotvbot",
            request_access: true,
            return_to: window.location.origin,
            lang: "en",
            callback: window.onTelegramAuth,
          },
          "anidaotvbot"
        );
      } else {
        toast({
          title: "Error",
          description: "Telegram login is not available. Please try again later.",
          variant: "destructive",
        });
        setIsLoggingIn(false);
      }
    };
    
    script.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load Telegram login. Please try again later.",
        variant: "destructive",
      });
      setIsLoggingIn(false);
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-6">
            <span className="text-primary font-bold text-3xl">
              ANI<span className="text-purple-400">DAO</span>
            </span>
            <DialogTitle className="text-xl font-medium mt-4 mb-2">Welcome Back!</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Sign in to access your favorites and continue watching.
            </DialogDescription>
          </div>

          <div className="mb-6">
            <Button
              className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white py-3 px-4 rounded-md flex items-center justify-center"
              onClick={handleTelegramLogin}
              disabled={isLoggingIn}
            >
              <i className="fab fa-telegram mr-2 text-lg"></i>
              <span>{isLoggingIn ? "Connecting..." : "Continue with Telegram"}</span>
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              By continuing, you agree to ANI DAO's Terms of Service and acknowledge our Privacy Policy.
            </p>
            <p className="mt-4">Your session will be valid for 3 days.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
