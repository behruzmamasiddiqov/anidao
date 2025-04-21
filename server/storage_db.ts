import { db } from "./db";
import { eq, and, desc, sql, asc, like } from "drizzle-orm";
import {
  User,
  InsertUser,
  Anime,
  InsertAnime,
  Episode,
  InsertEpisode,
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
import { IStorage } from "./storage";

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
        // Both createdAt and updatedAt have default values in the schema
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
      .values(favorite)
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
        likes: 0,
        dislikes: 0
        // createdAt is handled by defaultNow()
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