import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyTelegramAuth, isAuthExpired, getSessionExpiryDate, isAdminTelegramId } from "./telegram";
import { initBot } from "./bot";
import { z } from "zod";
import { 
  insertCommentSchema, 
  insertRatingSchema, 
  insertWatchHistorySchema,
  insertFavoriteSchema 
} from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import fs from "fs";
import path from "path";

// Initialize session store
const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize bot
  initBot();
  
  // Setup session middleware
  app.use(session({
    secret: 'anidao-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    },
    store: new SessionStore({
      checkPeriod: 24 * 60 * 60 * 1000 // Clear expired sessions every 24h
    })
  }));
  
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if session expired
    const now = new Date();
    const expiryDate = new Date(req.session.user.sessionExpiry);
    
    if (now > expiryDate) {
      req.session.destroy();
      return res.status(401).json({ message: 'Session expired' });
    }
    
    next();
  };
  
  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  };
  
  // Telegram Login Authentication
  app.post('/api/auth/telegram', async (req, res) => {
    try {
      const authData = req.body;
      
      // Verify Telegram auth data
      if (!verifyTelegramAuth(authData)) {
        return res.status(401).json({ message: 'Invalid authentication data' });
      }
      
      // Check if auth is expired
      if (isAuthExpired(authData.auth_date)) {
        return res.status(401).json({ message: 'Authentication expired' });
      }
      
      // Get or create user
      let user = await storage.getUserByTelegramId(authData.id);
      const sessionExpiry = getSessionExpiryDate();
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          telegramId: authData.id,
          username: authData.username,
          firstName: authData.first_name,
          lastName: authData.last_name || null,
          photoUrl: authData.photo_url || null,
          authDate: authData.auth_date,
          sessionExpiry,
          isAdmin: isAdminTelegramId(authData.id),
        });
      } else {
        // Update existing user session
        user = await storage.updateUserSession(user.id, sessionExpiry);
      }
      
      // Set session data
      req.session.user = user;
      
      // Return user info (without sensitive data)
      return res.status(200).json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        isAdmin: user.isAdmin,
        sessionExpiry: user.sessionExpiry,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Authentication failed' });
    }
  });
  
  // Check auth status
  app.get('/api/auth/status', (req, res) => {
    if (req.session.user) {
      return res.status(200).json({
        authenticated: true,
        user: {
          id: req.session.user.id,
          username: req.session.user.username,
          firstName: req.session.user.firstName,
          lastName: req.session.user.lastName,
          photoUrl: req.session.user.photoUrl,
          isAdmin: req.session.user.isAdmin,
          sessionExpiry: req.session.user.sessionExpiry,
        }
      });
    } else {
      return res.status(200).json({ authenticated: false });
    }
  });
  
  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      return res.status(200).json({ message: 'Logged out successfully' });
    });
  });
  
  // Get all animes
  app.get('/api/animes', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const animes = await storage.getAnimes(limit, offset);
      return res.status(200).json(animes);
    } catch (error) {
      console.error('Error getting animes:', error);
      return res.status(500).json({ message: 'Failed to get animes' });
    }
  });
  
  // Get trending animes
  app.get('/api/animes/trending', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      const animes = await storage.getTrendingAnimes(limit);
      return res.status(200).json(animes);
    } catch (error) {
      console.error('Error getting trending animes:', error);
      return res.status(500).json({ message: 'Failed to get trending animes' });
    }
  });
  
  // Get new releases
  app.get('/api/animes/new', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
      
      const animes = await storage.getNewReleases(limit);
      return res.status(200).json(animes);
    } catch (error) {
      console.error('Error getting new releases:', error);
      return res.status(500).json({ message: 'Failed to get new releases' });
    }
  });
  
  // Search animes
  app.get('/api/animes/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const animes = await storage.searchAnimes(query);
      return res.status(200).json(animes);
    } catch (error) {
      console.error('Error searching animes:', error);
      return res.status(500).json({ message: 'Failed to search animes' });
    }
  });
  
  // Get anime by ID
  app.get('/api/animes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid anime ID' });
      }
      
      const anime = await storage.getAnimeById(id);
      
      if (!anime) {
        return res.status(404).json({ message: 'Anime not found' });
      }
      
      // Get genres for this anime
      const genres = await storage.getAnimeGenres(id);
      
      // Get episodes for this anime
      const episodes = await storage.getEpisodesByAnimeId(id);
      
      // Get average rating
      const ratings = await storage.getRatingsByAnimeId(id);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length 
        : null;
      
      // Check if the user has this anime in favorites
      let isFavorite = false;
      if (req.session.user) {
        const favorite = await storage.getFavoriteByUserAndAnime(req.session.user.id, id);
        isFavorite = !!favorite;
      }
      
      return res.status(200).json({
        ...anime,
        genres: genres.map(g => g.genre),
        episodes,
        averageRating,
        ratingCount: ratings.length,
        isFavorite,
      });
    } catch (error) {
      console.error('Error getting anime by ID:', error);
      return res.status(500).json({ message: 'Failed to get anime' });
    }
  });
  
  // Get episode by ID
  app.get('/api/episodes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid episode ID' });
      }
      
      const episode = await storage.getEpisodeById(id);
      
      if (!episode) {
        return res.status(404).json({ message: 'Episode not found' });
      }
      
      // Get anime data
      const anime = await storage.getAnimeById(episode.animeId);
      
      if (!anime) {
        return res.status(404).json({ message: 'Related anime not found' });
      }
      
      // Get watch progress if user is logged in
      let watchProgress = null;
      if (req.session.user) {
        const history = await storage.getWatchHistoryByUserAndEpisode(
          req.session.user.id,
          id
        );
        
        if (history) {
          watchProgress = {
            progress: history.progress,
            completed: history.completed,
          };
        }
      }
      
      return res.status(200).json({
        ...episode,
        anime,
        watchProgress,
      });
    } catch (error) {
      console.error('Error getting episode by ID:', error);
      return res.status(500).json({ message: 'Failed to get episode' });
    }
  });
  
  // Update watch history
  app.post('/api/watch-history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Validate request body
      const validatedData = insertWatchHistorySchema.parse({
        ...req.body,
        userId,
      });
      
      const watchHistory = await storage.createOrUpdateWatchHistory(validatedData);
      
      return res.status(200).json(watchHistory);
    } catch (error) {
      console.error('Error updating watch history:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Failed to update watch history' });
    }
  });
  
  // Get user's watch history
  app.get('/api/watch-history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      const watchHistory = await storage.getWatchHistoryByUserId(userId);
      
      return res.status(200).json(watchHistory);
    } catch (error) {
      console.error('Error getting watch history:', error);
      return res.status(500).json({ message: 'Failed to get watch history' });
    }
  });
  
  // Add to favorites
  app.post('/api/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Validate request body
      const validatedData = insertFavoriteSchema.parse({
        ...req.body,
        userId,
      });
      
      const favorite = await storage.addFavorite(validatedData);
      
      return res.status(200).json(favorite);
    } catch (error) {
      console.error('Error adding to favorites:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Failed to add to favorites' });
    }
  });
  
  // Remove from favorites
  app.delete('/api/favorites/:animeId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const animeId = parseInt(req.params.animeId);
      
      if (isNaN(animeId)) {
        return res.status(400).json({ message: 'Invalid anime ID' });
      }
      
      const result = await storage.removeFavorite(userId, animeId);
      
      if (!result) {
        return res.status(404).json({ message: 'Favorite not found' });
      }
      
      return res.status(200).json({ message: 'Removed from favorites successfully' });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return res.status(500).json({ message: 'Failed to remove from favorites' });
    }
  });
  
  // Get user's favorites
  app.get('/api/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      const favorites = await storage.getFavoritesByUserId(userId);
      
      return res.status(200).json(favorites);
    } catch (error) {
      console.error('Error getting favorites:', error);
      return res.status(500).json({ message: 'Failed to get favorites' });
    }
  });
  
  // Add a comment
  app.post('/api/comments', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Validate request body
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        userId,
      });
      
      const comment = await storage.addComment(validatedData);
      
      // Get user data to return with comment
      const user = {
        id: req.session.user.id,
        username: req.session.user.username,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        photoUrl: req.session.user.photoUrl,
      };
      
      return res.status(200).json({
        ...comment,
        user,
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Failed to add comment' });
    }
  });
  
  // Get comments for an episode
  app.get('/api/episodes/:id/comments', async (req, res) => {
    try {
      const episodeId = parseInt(req.params.id);
      
      if (isNaN(episodeId)) {
        return res.status(400).json({ message: 'Invalid episode ID' });
      }
      
      const comments = await storage.getCommentsByEpisodeId(episodeId);
      
      return res.status(200).json(comments);
    } catch (error) {
      console.error('Error getting comments:', error);
      return res.status(500).json({ message: 'Failed to get comments' });
    }
  });
  
  // Like a comment
  app.post('/api/comments/:id/like', requireAuth, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      
      if (isNaN(commentId)) {
        return res.status(400).json({ message: 'Invalid comment ID' });
      }
      
      const comment = await storage.likeComment(commentId);
      
      return res.status(200).json(comment);
    } catch (error) {
      console.error('Error liking comment:', error);
      return res.status(500).json({ message: 'Failed to like comment' });
    }
  });
  
  // Dislike a comment
  app.post('/api/comments/:id/dislike', requireAuth, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      
      if (isNaN(commentId)) {
        return res.status(400).json({ message: 'Invalid comment ID' });
      }
      
      const comment = await storage.dislikeComment(commentId);
      
      return res.status(200).json(comment);
    } catch (error) {
      console.error('Error disliking comment:', error);
      return res.status(500).json({ message: 'Failed to dislike comment' });
    }
  });
  
  // Rate an anime
  app.post('/api/ratings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Validate request body
      const validatedData = insertRatingSchema.parse({
        ...req.body,
        userId,
      });
      
      const rating = await storage.addOrUpdateRating(validatedData);
      
      return res.status(200).json(rating);
    } catch (error) {
      console.error('Error rating anime:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Failed to rate anime' });
    }
  });
  
  // Get user's rating for an anime
  app.get('/api/animes/:id/rating', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const animeId = parseInt(req.params.id);
      
      if (isNaN(animeId)) {
        return res.status(400).json({ message: 'Invalid anime ID' });
      }
      
      const rating = await storage.getRatingByUserAndAnime(userId, animeId);
      
      if (!rating) {
        return res.status(404).json({ message: 'Rating not found' });
      }
      
      return res.status(200).json(rating);
    } catch (error) {
      console.error('Error getting rating:', error);
      return res.status(500).json({ message: 'Failed to get rating' });
    }
  });
  
  // Get admin data (recent uploads, stats, etc.)
  app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (req, res) => {
    try {
      const animes = await storage.getAnimeWithEpisodes();
      
      return res.status(200).json({
        totalAnimes: animes.length,
        recentUploads: animes.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5),
      });
    } catch (error) {
      console.error('Error getting admin dashboard data:', error);
      return res.status(500).json({ message: 'Failed to get admin dashboard data' });
    }
  });
  
  const httpServer = createServer(app);
  
  return httpServer;
}
