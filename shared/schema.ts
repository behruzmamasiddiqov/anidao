import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  photoUrl: text("photo_url"),
  authDate: integer("auth_date").notNull(),
  sessionExpiry: timestamp("session_expiry").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Anime Genres Enum
export const genreEnum = pgEnum("genre", [
  "action", "adventure", "comedy", "drama", "fantasy",
  "horror", "mystery", "romance", "sci-fi", "slice_of_life",
  "sports", "supernatural", "thriller", "historical", "mecha"
]);

// Anime Schema
export const animes = pgTable("animes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverImage: text("cover_image").notNull(),
  year: integer("year").notNull(),
  status: text("status").notNull(), // airing, completed, upcoming
  type: text("type").notNull(), // TV, Movie, OVA, etc.
  averageRating: integer("average_rating").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnimeSchema = createInsertSchema(animes).omit({
  id: true,
  createdAt: true,
});

// Anime Genres (Many-to-Many)
export const animeGenres = pgTable("anime_genres", {
  id: serial("id").primaryKey(),
  animeId: integer("anime_id").notNull(),
  genre: text("genre").notNull(),
});

export const insertAnimeGenreSchema = createInsertSchema(animeGenres).omit({
  id: true,
});

// Episodes Schema
export const episodes = pgTable("episodes", {
  id: serial("id").primaryKey(),
  animeId: integer("anime_id").notNull(),
  title: text("title").notNull(),
  number: integer("number").notNull(),
  videoUrl: text("video_url").notNull(), // bunny.net URL
  thumbnail: text("thumbnail"),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEpisodeSchema = createInsertSchema(episodes).omit({
  id: true,
  createdAt: true,
});

// Watch History Schema
export const watchHistory = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  progress: integer("progress").default(0).notNull(), // in seconds
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWatchHistorySchema = createInsertSchema(watchHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Favorites Schema
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  animeId: integer("anime_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

// Comments Schema
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  content: text("content").notNull(),
  likes: integer("likes").default(0).notNull(),
  dislikes: integer("dislikes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  likes: true,
  dislikes: true,
  createdAt: true,
});

// Ratings Schema
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  animeId: integer("anime_id").notNull(),
  score: integer("score").notNull(), // 1-5
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Anime = typeof animes.$inferSelect;
export type InsertAnime = z.infer<typeof insertAnimeSchema>;

export type AnimeGenre = typeof animeGenres.$inferSelect;
export type InsertAnimeGenre = z.infer<typeof insertAnimeGenreSchema>;

export type Episode = typeof episodes.$inferSelect;
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;

export type WatchHistory = typeof watchHistory.$inferSelect;
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
