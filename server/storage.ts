import { db } from "./db";
import { eq, and, desc, sql, asc, like } from "drizzle-orm";
import {
  Anime,
  InsertAnime,
  Episode,
  InsertEpisode,
  User,
  InsertUser,
  WatchHistory,
  InsertWatchHistory,
  Favorite,
  InsertFavorite,
  Comment,
  InsertComment,
  Rating,
  InsertRating,
  AnimeGenre,
  InsertAnimeGenre,
  users,
  animes,
  episodes,
  watchHistory,
  favorites,
  comments,
  ratings,
  animeGenres
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSession(userId: number, expiryDate: Date): Promise<User>;
  
  // Anime operations
  getAnimes(limit?: number, offset?: number): Promise<Anime[]>;
  getAnimeById(id: number): Promise<Anime | undefined>;
  getTrendingAnimes(limit?: number): Promise<Anime[]>;
  getNewReleases(limit?: number): Promise<Anime[]>;
  searchAnimes(query: string): Promise<Anime[]>;
  createAnime(anime: InsertAnime): Promise<Anime>;
  
  // Anime Genre operations
  getAnimeGenres(animeId: number): Promise<AnimeGenre[]>;
  addAnimeGenre(animeGenre: InsertAnimeGenre): Promise<AnimeGenre>;
  
  // Episode operations
  getEpisodesByAnimeId(animeId: number): Promise<Episode[]>;
  getEpisodeById(id: number): Promise<Episode | undefined>;
  createEpisode(episode: InsertEpisode): Promise<Episode>;
  
  // Watch History operations
  getWatchHistoryByUserId(userId: number): Promise<(WatchHistory & { anime: Anime, episode: Episode })[]>;
  getWatchHistoryByUserAndEpisode(userId: number, episodeId: number): Promise<WatchHistory | undefined>;
  createOrUpdateWatchHistory(watchHistory: InsertWatchHistory): Promise<WatchHistory>;
  
  // Favorites operations
  getFavoritesByUserId(userId: number): Promise<(Favorite & { anime: Anime })[]>;
  getFavoriteByUserAndAnime(userId: number, animeId: number): Promise<Favorite | undefined>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, animeId: number): Promise<boolean>;
  
  // Comments operations
  getCommentsByEpisodeId(episodeId: number): Promise<(Comment & { user: User })[]>;
  addComment(comment: InsertComment): Promise<Comment>;
  likeComment(commentId: number): Promise<Comment>;
  dislikeComment(commentId: number): Promise<Comment>;
  
  // Ratings operations
  getRatingsByAnimeId(animeId: number): Promise<Rating[]>;
  getRatingByUserAndAnime(userId: number, animeId: number): Promise<Rating | undefined>;
  addOrUpdateRating(rating: InsertRating): Promise<Rating>;
  
  // Admin operations
  getAnimeWithEpisodes(): Promise<(Anime & { episodeCount: number })[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private animes: Map<number, Anime>;
  private animeGenres: Map<number, AnimeGenre>;
  private episodes: Map<number, Episode>;
  private watchHistory: Map<number, WatchHistory>;
  private favorites: Map<number, Favorite>;
  private comments: Map<number, Comment>;
  private ratings: Map<number, Rating>;
  
  private userId: number;
  private animeId: number;
  private animeGenreId: number;
  private episodeId: number;
  private watchHistoryId: number;
  private favoriteId: number;
  private commentId: number;
  private ratingId: number;
  
  constructor() {
    this.users = new Map();
    this.animes = new Map();
    this.animeGenres = new Map();
    this.episodes = new Map();
    this.watchHistory = new Map();
    this.favorites = new Map();
    this.comments = new Map();
    this.ratings = new Map();
    
    this.userId = 1;
    this.animeId = 1;
    this.animeGenreId = 1;
    this.episodeId = 1;
    this.watchHistoryId = 1;
    this.favoriteId = 1;
    this.commentId = 1;
    this.ratingId = 1;
    
    // Seed with admin
    const adminExpiryDate = new Date();
    adminExpiryDate.setDate(adminExpiryDate.getDate() + 30); // 30 days for admin
    
    this.users.set(this.userId++, {
      id: 1,
      telegramId: "1295145079", // Admin telegram ID as specified
      username: "admin",
      firstName: "Admin",
      lastName: null,
      photoUrl: null,
      authDate: Math.floor(Date.now() / 1000),
      sessionExpiry: adminExpiryDate,
      isAdmin: true,
    });
  }
  
  // User operations
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.telegramId === telegramId,
    );
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUserSession(userId: number, expiryDate: Date): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      sessionExpiry: expiryDate,
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Anime operations
  async getAnimes(limit = 20, offset = 0): Promise<Anime[]> {
    return Array.from(this.animes.values())
      .sort((a, b) => b.id - a.id)
      .slice(offset, offset + limit);
  }
  
  async getAnimeById(id: number): Promise<Anime | undefined> {
    return this.animes.get(id);
  }
  
  async getTrendingAnimes(limit = 5): Promise<Anime[]> {
    // For memory storage, we'll just sort by ID (newest first) and limit
    return Array.from(this.animes.values())
      .sort((a, b) => b.id - a.id)
      .slice(0, limit);
  }
  
  async getNewReleases(limit = 6): Promise<Anime[]> {
    return Array.from(this.animes.values())
      .sort((a, b) => b.id - a.id)
      .slice(0, limit);
  }
  
  async searchAnimes(query: string): Promise<Anime[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.animes.values()).filter(
      (anime) => anime.title.toLowerCase().includes(searchTerm) || 
                 anime.description.toLowerCase().includes(searchTerm)
    );
  }
  
  async createAnime(anime: InsertAnime): Promise<Anime> {
    const id = this.animeId++;
    const now = new Date();
    const newAnime: Anime = {
      ...anime,
      id,
      createdAt: now,
    };
    this.animes.set(id, newAnime);
    return newAnime;
  }
  
  // Anime Genre operations
  async getAnimeGenres(animeId: number): Promise<AnimeGenre[]> {
    return Array.from(this.animeGenres.values()).filter(
      (animeGenre) => animeGenre.animeId === animeId
    );
  }
  
  async addAnimeGenre(animeGenre: InsertAnimeGenre): Promise<AnimeGenre> {
    const id = this.animeGenreId++;
    const newAnimeGenre: AnimeGenre = {
      ...animeGenre,
      id,
    };
    this.animeGenres.set(id, newAnimeGenre);
    return newAnimeGenre;
  }
  
  // Episode operations
  async getEpisodesByAnimeId(animeId: number): Promise<Episode[]> {
    return Array.from(this.episodes.values())
      .filter((episode) => episode.animeId === animeId)
      .sort((a, b) => a.number - b.number);
  }
  
  async getEpisodeById(id: number): Promise<Episode | undefined> {
    return this.episodes.get(id);
  }
  
  async createEpisode(episode: InsertEpisode): Promise<Episode> {
    const id = this.episodeId++;
    const now = new Date();
    const newEpisode: Episode = {
      ...episode,
      id,
      createdAt: now,
    };
    this.episodes.set(id, newEpisode);
    return newEpisode;
  }
  
  // Watch History operations
  async getWatchHistoryByUserId(userId: number): Promise<(WatchHistory & { anime: Anime, episode: Episode })[]> {
    const watchHistoryList = Array.from(this.watchHistory.values())
      .filter((wh) => wh.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return watchHistoryList.map((wh) => {
      const episode = this.episodes.get(wh.episodeId)!;
      const anime = this.animes.get(episode.animeId)!;
      return {
        ...wh,
        anime,
        episode,
      };
    });
  }
  
  async getWatchHistoryByUserAndEpisode(userId: number, episodeId: number): Promise<WatchHistory | undefined> {
    return Array.from(this.watchHistory.values()).find(
      (wh) => wh.userId === userId && wh.episodeId === episodeId
    );
  }
  
  async createOrUpdateWatchHistory(watchHistory: InsertWatchHistory): Promise<WatchHistory> {
    const existing = await this.getWatchHistoryByUserAndEpisode(
      watchHistory.userId,
      watchHistory.episodeId
    );
    
    const now = new Date();
    
    if (existing) {
      const updated: WatchHistory = {
        ...existing,
        progress: watchHistory.progress,
        completed: watchHistory.completed,
        updatedAt: now,
      };
      this.watchHistory.set(existing.id, updated);
      return updated;
    }
    
    const id = this.watchHistoryId++;
    const newWatchHistory: WatchHistory = {
      ...watchHistory,
      id,
      progress: watchHistory.progress ?? 0,
      completed: watchHistory.completed ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.watchHistory.set(id, newWatchHistory);
    return newWatchHistory;
  }
  
  // Favorites operations
  async getFavoritesByUserId(userId: number): Promise<(Favorite & { anime: Anime })[]> {
    const favoritesList = Array.from(this.favorites.values())
      .filter((fav) => fav.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return favoritesList.map((fav) => {
      const anime = this.animes.get(fav.animeId)!;
      return {
        ...fav,
        anime,
      };
    });
  }
  
  async getFavoriteByUserAndAnime(userId: number, animeId: number): Promise<Favorite | undefined> {
    return Array.from(this.favorites.values()).find(
      (fav) => fav.userId === userId && fav.animeId === animeId
    );
  }
  
  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const existing = await this.getFavoriteByUserAndAnime(
      favorite.userId,
      favorite.animeId
    );
    
    if (existing) {
      return existing;
    }
    
    const id = this.favoriteId++;
    const now = new Date();
    const newFavorite: Favorite = {
      ...favorite,
      id,
      createdAt: now,
    };
    this.favorites.set(id, newFavorite);
    return newFavorite;
  }
  
  async removeFavorite(userId: number, animeId: number): Promise<boolean> {
    const favorite = await this.getFavoriteByUserAndAnime(userId, animeId);
    if (!favorite) {
      return false;
    }
    
    return this.favorites.delete(favorite.id);
  }
  
  // Comments operations
  async getCommentsByEpisodeId(episodeId: number): Promise<(Comment & { user: User })[]> {
    const commentsList = Array.from(this.comments.values())
      .filter((comment) => comment.episodeId === episodeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return commentsList.map((comment) => {
      const user = this.users.get(comment.userId)!;
      return {
        ...comment,
        user,
      };
    });
  }
  
  async addComment(comment: InsertComment): Promise<Comment> {
    const id = this.commentId++;
    const now = new Date();
    const newComment: Comment = {
      ...comment,
      id,
      likes: 0,
      dislikes: 0,
      createdAt: now,
    };
    this.comments.set(id, newComment);
    return newComment;
  }
  
  async likeComment(commentId: number): Promise<Comment> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }
    
    const updatedComment: Comment = {
      ...comment,
      likes: comment.likes + 1,
    };
    
    this.comments.set(commentId, updatedComment);
    return updatedComment;
  }
  
  async dislikeComment(commentId: number): Promise<Comment> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }
    
    const updatedComment: Comment = {
      ...comment,
      dislikes: comment.dislikes + 1,
    };
    
    this.comments.set(commentId, updatedComment);
    return updatedComment;
  }
  
  // Ratings operations
  async getRatingsByAnimeId(animeId: number): Promise<Rating[]> {
    return Array.from(this.ratings.values())
      .filter((rating) => rating.animeId === animeId);
  }
  
  async getRatingByUserAndAnime(userId: number, animeId: number): Promise<Rating | undefined> {
    return Array.from(this.ratings.values()).find(
      (rating) => rating.userId === userId && rating.animeId === animeId
    );
  }
  
  async addOrUpdateRating(rating: InsertRating): Promise<Rating> {
    const existing = await this.getRatingByUserAndAnime(
      rating.userId,
      rating.animeId
    );
    
    const now = new Date();
    
    if (existing) {
      const updated: Rating = {
        ...existing,
        score: rating.score,
        createdAt: now,
      };
      this.ratings.set(existing.id, updated);
      return updated;
    }
    
    const id = this.ratingId++;
    const newRating: Rating = {
      ...rating,
      id,
      createdAt: now,
    };
    this.ratings.set(id, newRating);
    return newRating;
  }
  
  // Admin operations
  async getAnimeWithEpisodes(): Promise<(Anime & { episodeCount: number })[]> {
    return Array.from(this.animes.values()).map((anime) => {
      const episodeCount = Array.from(this.episodes.values()).filter(
        (episode) => episode.animeId === anime.id
      ).length;
      
      return {
        ...anime,
        episodeCount,
      };
    });
  }
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserSession(userId: number, expiryDate: Date): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ sessionExpiry: expiryDate })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Anime operations
  async getAnimes(limit = 20, offset = 0): Promise<Anime[]> {
    return db.select().from(animes).limit(limit).offset(offset);
  }

  async getAnimeById(id: number): Promise<Anime | undefined> {
    const [anime] = await db.select().from(animes).where(eq(animes.id, id));
    return anime;
  }

  async getTrendingAnimes(limit = 5): Promise<Anime[]> {
    // Get animes with highest average rating
    return db.select()
      .from(animes)
      .orderBy(desc(animes.averageRating))
      .limit(limit);
  }

  async getNewReleases(limit = 6): Promise<Anime[]> {
    // Get latest animes based on createdAt
    return db.select()
      .from(animes)
      .orderBy(desc(animes.createdAt))
      .limit(limit);
  }

  async searchAnimes(query: string): Promise<Anime[]> {
    return db.select()
      .from(animes)
      .where(like(animes.title, `%${query}%`));
  }

  async createAnime(anime: InsertAnime): Promise<Anime> {
    const [newAnime] = await db.insert(animes).values(anime).returning();
    return newAnime;
  }

  // Anime Genre operations
  async getAnimeGenres(animeId: number): Promise<AnimeGenre[]> {
    return db.select()
      .from(animeGenres)
      .where(eq(animeGenres.animeId, animeId));
  }

  async addAnimeGenre(animeGenre: InsertAnimeGenre): Promise<AnimeGenre> {
    const [newAnimeGenre] = await db.insert(animeGenres).values(animeGenre).returning();
    return newAnimeGenre;
  }

  // Episode operations
  async getEpisodesByAnimeId(animeId: number): Promise<Episode[]> {
    return db.select()
      .from(episodes)
      .where(eq(episodes.animeId, animeId))
      .orderBy(asc(episodes.number));
  }

  async getEpisodeById(id: number): Promise<Episode | undefined> {
    const [episode] = await db.select().from(episodes).where(eq(episodes.id, id));
    return episode;
  }

  async createEpisode(episode: InsertEpisode): Promise<Episode> {
    const [newEpisode] = await db.insert(episodes).values(episode).returning();
    return newEpisode;
  }

  // Watch History operations
  async getWatchHistoryByUserId(userId: number): Promise<(WatchHistory & { anime: Anime, episode: Episode })[]> {
    const result = await db.select({
      watchHistory: watchHistory,
      anime: animes,
      episode: episodes
    })
    .from(watchHistory)
    .innerJoin(episodes, eq(watchHistory.episodeId, episodes.id))
    .innerJoin(animes, eq(episodes.animeId, animes.id))
    .where(eq(watchHistory.userId, userId))
    .orderBy(desc(watchHistory.updatedAt));

    return result.map(({ watchHistory: wh, anime, episode }) => ({
      ...wh,
      anime,
      episode
    }));
  }

  async getWatchHistoryByUserAndEpisode(userId: number, episodeId: number): Promise<WatchHistory | undefined> {
    const [history] = await db.select()
      .from(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, userId),
          eq(watchHistory.episodeId, episodeId)
        )
      );
    return history;
  }

  async createOrUpdateWatchHistory(history: InsertWatchHistory): Promise<WatchHistory> {
    // Check if a record already exists
    const existing = await this.getWatchHistoryByUserAndEpisode(
      history.userId,
      history.episodeId
    );

    if (existing) {
      // Update existing record
      const [updated] = await db.update(watchHistory)
        .set({
          progress: history.progress,
          completed: history.completed,
          updatedAt: new Date()
        })
        .where(eq(watchHistory.id, existing.id))
        .returning();
      return updated;
    }

    // Create new record
    const [newHistory] = await db.insert(watchHistory)
      .values({
        ...history,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newHistory;
  }

  // Favorites operations
  async getFavoritesByUserId(userId: number): Promise<(Favorite & { anime: Anime })[]> {
    const result = await db.select({
      favorite: favorites,
      anime: animes
    })
    .from(favorites)
    .innerJoin(animes, eq(favorites.animeId, animes.id))
    .where(eq(favorites.userId, userId));

    return result.map(({ favorite, anime }) => ({
      ...favorite,
      anime
    }));
  }

  async getFavoriteByUserAndAnime(userId: number, animeId: number): Promise<Favorite | undefined> {
    const [favorite] = await db.select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.animeId, animeId)
        )
      );
    return favorite;
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db.insert(favorites)
      .values({
        ...favorite,
        createdAt: new Date()
      })
      .returning();
    return newFavorite;
  }

  async removeFavorite(userId: number, animeId: number): Promise<boolean> {
    const result = await db.delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.animeId, animeId)
        )
      );
    return !!result;
  }

  // Comments operations
  async getCommentsByEpisodeId(episodeId: number): Promise<(Comment & { user: User })[]> {
    const result = await db.select({
      comment: comments,
      user: users
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.episodeId, episodeId))
    .orderBy(desc(comments.createdAt));

    return result.map(({ comment, user }) => ({
      ...comment,
      user
    }));
  }

  async addComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments)
      .values({
        ...comment,
        createdAt: new Date(),
        likes: 0,
        dislikes: 0
      })
      .returning();
    return newComment;
  }

  async likeComment(commentId: number): Promise<Comment> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
    
    if (!comment) {
      throw new Error("Comment not found");
    }
    
    const [updatedComment] = await db.update(comments)
      .set({ likes: comment.likes + 1 })
      .where(eq(comments.id, commentId))
      .returning();
    
    return updatedComment;
  }

  async dislikeComment(commentId: number): Promise<Comment> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
    
    if (!comment) {
      throw new Error("Comment not found");
    }
    
    const [updatedComment] = await db.update(comments)
      .set({ dislikes: comment.dislikes + 1 })
      .where(eq(comments.id, commentId))
      .returning();
    
    return updatedComment;
  }

  // Ratings operations
  async getRatingsByAnimeId(animeId: number): Promise<Rating[]> {
    return db.select()
      .from(ratings)
      .where(eq(ratings.animeId, animeId));
  }

  async getRatingByUserAndAnime(userId: number, animeId: number): Promise<Rating | undefined> {
    const [rating] = await db.select()
      .from(ratings)
      .where(
        and(
          eq(ratings.userId, userId),
          eq(ratings.animeId, animeId)
        )
      );
    return rating;
  }

  async addOrUpdateRating(rating: InsertRating): Promise<Rating> {
    // Check if a rating already exists
    const existing = await this.getRatingByUserAndAnime(
      rating.userId,
      rating.animeId
    );

    if (existing) {
      // Update existing rating
      const [updated] = await db.update(ratings)
        .set({ score: rating.score })
        .where(eq(ratings.id, existing.id))
        .returning();
      
      // Update anime average rating
      await this.updateAnimeAverageRating(rating.animeId);
      
      return updated;
    }

    // Create new rating
    const [newRating] = await db.insert(ratings)
      .values(rating)
      .returning();
    
    // Update anime average rating
    await this.updateAnimeAverageRating(rating.animeId);
    
    return newRating;
  }

  // Admin operations
  async getAnimeWithEpisodes(): Promise<(Anime & { episodeCount: number })[]> {
    const result = await db
      .select({
        anime: animes,
        episodeCount: sql<number>`count(${episodes.id})::int`
      })
      .from(animes)
      .leftJoin(episodes, eq(animes.id, episodes.animeId))
      .groupBy(animes.id)
      .orderBy(desc(animes.createdAt));

    return result.map(({ anime, episodeCount }) => ({
      ...anime,
      episodeCount
    }));
  }

  // Helper methods
  private async updateAnimeAverageRating(animeId: number): Promise<void> {
    // Calculate the new average rating
    const result = await db
      .select({
        averageRating: sql<number>`avg(${ratings.score})`
      })
      .from(ratings)
      .where(eq(ratings.animeId, animeId));

    const averageRating = result[0]?.averageRating || 0;

    // Update the anime record
    await db.update(animes)
      .set({ averageRating })
      .where(eq(animes.id, animeId));
  }
}

export const storage = new DatabaseStorage();
