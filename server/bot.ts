import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import { isAdminTelegramId } from './telegram';
import { InsertAnime, InsertEpisode, InsertAnimeGenre } from '@shared/schema';

// Bot token from environment or use the provided one
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7677348721:AAE9JIinYDRlYNSBSw1ZWAmz1iMnS-BKVfQ';

// State management for multi-message conversations
type ConversationState = {
  stage: 'idle' | 'add_anime' | 'add_episode';
  animeData?: Partial<InsertAnime & { genres: string[] }>;
  episodeData?: Partial<InsertEpisode>;
  currentAnimeId?: number;
};

const userStates: Map<number, ConversationState> = new Map();

// Initialize the bot
export const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Start the bot
export function initBot() {
  console.log('Telegram bot initialized');

  // Start command handler
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString() || '';
    
    if (isAdminTelegramId(telegramId)) {
      bot.sendMessage(chatId, 
        `Welcome, Admin! You can manage anime content with these commands:\n\n` +
        `/addanime - Add a new anime\n` +
        `/addepisode - Add a new episode to an existing anime\n` +
        `/list - List all animes with their episodes\n` +
        `/cancel - Cancel the current operation`
      );
    } else {
      bot.sendMessage(chatId, 
        `Welcome to ANI DAO Bot!\n\n` +
        `This bot is for administrators only. If you're a user, please visit our website to stream anime.`
      );
    }
  });

  // Command to add a new anime
  bot.onText(/\/addanime/, (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString() || '';
    
    if (!isAdminTelegramId(telegramId)) {
      bot.sendMessage(chatId, "You don't have permission to use this command.");
      return;
    }
    
    userStates.set(chatId, { 
      stage: 'add_anime',
      animeData: {}
    });
    
    bot.sendMessage(chatId, 
      "Let's add a new anime. Please provide the following information:\n\n" +
      "What's the title of the anime?"
    );
  });

  // Command to add a new episode
  bot.onText(/\/addepisode/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString() || '';
    
    if (!isAdminTelegramId(telegramId)) {
      bot.sendMessage(chatId, "You don't have permission to use this command.");
      return;
    }
    
    // Get all animes to let admin choose
    const animes = await storage.getAnimes(100, 0);
    
    if (animes.length === 0) {
      bot.sendMessage(chatId, "No animes found. Please add an anime first with /addanime");
      return;
    }
    
    let message = "Please select the anime to add an episode to:\n\n";
    animes.forEach((anime, index) => {
      message += `${index + 1}. ${anime.title} (${anime.year})\n`;
    });
    
    userStates.set(chatId, { 
      stage: 'add_episode',
      episodeData: {}
    });
    
    bot.sendMessage(chatId, message);
  });

  // List all animes with their episodes
  bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString() || '';
    
    if (!isAdminTelegramId(telegramId)) {
      bot.sendMessage(chatId, "You don't have permission to use this command.");
      return;
    }
    
    const animes = await storage.getAnimeWithEpisodes();
    
    if (animes.length === 0) {
      bot.sendMessage(chatId, "No animes found in the database.");
      return;
    }
    
    let message = "📚 *Anime List*\n\n";
    
    for (const anime of animes) {
      message += `*${anime.title}* (${anime.year})\n`;
      message += `Status: ${anime.status}\n`;
      message += `Episodes: ${anime.episodeCount}\n\n`;
    }
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });

  // Cancel the current operation
  bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    userStates.delete(chatId);
    bot.sendMessage(chatId, "Operation cancelled.");
  });

  // Handle all messages for the conversation flow
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString() || '';
    
    if (!isAdminTelegramId(telegramId)) {
      return;
    }
    
    const state = userStates.get(chatId);
    if (!state) return;
    
    // Handle add anime flow
    if (state.stage === 'add_anime') {
      await handleAddAnimeFlow(chatId, msg.text, state);
    }
    
    // Handle add episode flow
    if (state.stage === 'add_episode') {
      await handleAddEpisodeFlow(chatId, msg.text, state);
    }
  });

  // Handle file uploads (for cover images and videos)
  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString() || '';
    
    if (!isAdminTelegramId(telegramId)) {
      return;
    }
    
    const state = userStates.get(chatId);
    if (!state) return;
    
    // Get the largest photo (best quality)
    const photo = msg.photo!.pop();
    if (!photo) return;
    
    const fileId = photo.file_id;
    
    // Get file path
    const file = await bot.getFile(fileId);
    const filePath = file.file_path;
    
    if (!filePath) {
      bot.sendMessage(chatId, "Error retrieving the image. Please try again.");
      return;
    }
    
    // For demo, we're using the telegram file path directly
    // In production, you'd download and upload this to your own storage
    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    
    if (state.stage === 'add_anime' && state.animeData) {
      state.animeData.coverImage = imageUrl;
      bot.sendMessage(chatId, 
        "Cover image received! Now, what's the release year of the anime? (e.g., 2023)"
      );
    }
  });

  // Handle document uploads (for videos)
  bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString() || '';
    
    if (!isAdminTelegramId(telegramId)) {
      return;
    }
    
    const state = userStates.get(chatId);
    if (!state || state.stage !== 'add_episode' || !state.episodeData) return;
    
    const fileId = msg.document?.file_id;
    if (!fileId) return;
    
    // Here, in a real application, you would:
    // 1. Download the video file
    // 2. Upload it to bunny.net
    // 3. Get the bunny.net URL
    
    // For this demo, we'll use a placeholder bunny.net URL
    const videoUrl = "https://iframe.mediadelivery.net/play/412175/fa9e4829-e5d9-47d5-a4d9-77e945fa08d5";
    
    state.episodeData.videoUrl = videoUrl;
    
    // If we have all required data, save the episode
    if (state.currentAnimeId && 
        state.episodeData.title && 
        state.episodeData.number && 
        state.episodeData.videoUrl) {
      
      try {
        const episode = await storage.createEpisode({
          animeId: state.currentAnimeId,
          title: state.episodeData.title,
          number: state.episodeData.number,
          videoUrl: state.episodeData.videoUrl,
          thumbnail: state.episodeData.thumbnail || null,
          duration: state.episodeData.duration || null
        });
        
        bot.sendMessage(chatId, 
          `✅ Episode successfully added!\n\n` +
          `Anime ID: ${episode.animeId}\n` +
          `Episode: ${episode.number} - ${episode.title}\n` +
          `Video URL: ${episode.videoUrl}`
        );
        
        // Reset state
        userStates.delete(chatId);
      } catch (error) {
        bot.sendMessage(chatId, `Error saving episode: ${error}`);
      }
    } else {
      bot.sendMessage(chatId, 
        "Video received! Please provide any missing information."
      );
    }
  });
}

// Helper function to handle the add anime conversation flow
async function handleAddAnimeFlow(chatId: number, text: string, state: ConversationState) {
  if (!state.animeData) {
    state.animeData = {};
  }
  
  const anime = state.animeData;
  
  // Title
  if (!anime.title) {
    anime.title = text;
    bot.sendMessage(chatId, 
      `Great! Now, please provide a description for "${anime.title}".`
    );
    return;
  }
  
  // Description
  if (!anime.description) {
    anime.description = text;
    bot.sendMessage(chatId, 
      "Thank you! Now, please upload a cover image for the anime."
    );
    return;
  }
  
  // Cover image is handled in the photo event handler
  
  // Year
  if (anime.coverImage && !anime.year) {
    const year = parseInt(text);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 5) {
      bot.sendMessage(chatId, "Please enter a valid year (e.g., 2023).");
      return;
    }
    
    anime.year = year;
    bot.sendMessage(chatId, 
      "What's the status of this anime? (airing, completed, upcoming)"
    );
    return;
  }
  
  // Status
  if (!anime.status) {
    const status = text.toLowerCase();
    if (!['airing', 'completed', 'upcoming'].includes(status)) {
      bot.sendMessage(chatId, 
        "Please enter one of the following: airing, completed, upcoming"
      );
      return;
    }
    
    anime.status = status;
    bot.sendMessage(chatId, 
      "What type of anime is this? (TV, Movie, OVA, etc.)"
    );
    return;
  }
  
  // Type
  if (!anime.type) {
    anime.type = text;
    bot.sendMessage(chatId, 
      "What genres does this anime belong to? (comma-separated, e.g., action, adventure, comedy)"
    );
    return;
  }
  
  // Genres
  if (!anime.genres) {
    const genres = text.split(',').map(g => g.trim().toLowerCase());
    anime.genres = genres;
    
    // Summary before saving
    bot.sendMessage(chatId, 
      `📝 *Summary*\n\n` +
      `*Title:* ${anime.title}\n` +
      `*Description:* ${anime.description}\n` +
      `*Year:* ${anime.year}\n` +
      `*Status:* ${anime.status}\n` +
      `*Type:* ${anime.type}\n` +
      `*Genres:* ${anime.genres.join(', ')}\n\n` +
      `Is this information correct? (yes/no)`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  // Confirmation
  if (text.toLowerCase() === 'yes') {
    try {
      // Save the anime
      const savedAnime = await storage.createAnime({
        title: anime.title!,
        description: anime.description!,
        coverImage: anime.coverImage!,
        year: anime.year!,
        status: anime.status!,
        type: anime.type!
      });
      
      // Save genres
      if (anime.genres && anime.genres.length > 0) {
        for (const genre of anime.genres) {
          await storage.addAnimeGenre({
            animeId: savedAnime.id,
            genre
          });
        }
      }
      
      bot.sendMessage(chatId, 
        `✅ Anime successfully added!\n\n` +
        `ID: ${savedAnime.id}\n` +
        `Title: ${savedAnime.title}\n` +
        `You can now add episodes using the /addepisode command.`
      );
      
      // Reset state
      userStates.delete(chatId);
    } catch (error) {
      bot.sendMessage(chatId, `Error saving anime: ${error}`);
    }
  } else if (text.toLowerCase() === 'no') {
    bot.sendMessage(chatId, 
      "Let's start over. What's the title of the anime?"
    );
    userStates.set(chatId, { 
      stage: 'add_anime',
      animeData: {}
    });
  } else {
    bot.sendMessage(chatId, "Please answer with 'yes' or 'no'.");
  }
}

// Helper function to handle the add episode conversation flow
async function handleAddEpisodeFlow(chatId: number, text: string, state: ConversationState) {
  if (!state.episodeData) {
    state.episodeData = {};
  }
  
  const episode = state.episodeData;
  
  // Select anime
  if (!state.currentAnimeId) {
    const animes = await storage.getAnimes(100, 0);
    const animeIndex = parseInt(text) - 1;
    
    if (isNaN(animeIndex) || animeIndex < 0 || animeIndex >= animes.length) {
      bot.sendMessage(chatId, "Please select a valid anime number from the list.");
      return;
    }
    
    state.currentAnimeId = animes[animeIndex].id;
    bot.sendMessage(chatId, 
      `Selected anime: ${animes[animeIndex].title}\n\n` +
      `What's the episode number?`
    );
    return;
  }
  
  // Episode number
  if (!episode.number) {
    const episodeNumber = parseInt(text);
    if (isNaN(episodeNumber) || episodeNumber < 1) {
      bot.sendMessage(chatId, "Please enter a valid episode number (e.g., 1, 2, 3).");
      return;
    }
    
    episode.number = episodeNumber;
    bot.sendMessage(chatId, 
      `What's the title of episode ${episodeNumber}?`
    );
    return;
  }
  
  // Episode title
  if (!episode.title) {
    episode.title = text;
    bot.sendMessage(chatId, 
      "Please upload the video file for this episode. For large files, you might need to provide a bunny.net URL directly."
    );
    return;
  }
  
  // If it's not a file upload but a URL
  if (!episode.videoUrl && text.startsWith('http')) {
    episode.videoUrl = text;
    
    // If we have all required data, save the episode
    if (state.currentAnimeId && episode.title && episode.number && episode.videoUrl) {
      try {
        const savedEpisode = await storage.createEpisode({
          animeId: state.currentAnimeId,
          title: episode.title,
          number: episode.number,
          videoUrl: episode.videoUrl,
          thumbnail: episode.thumbnail || null,
          duration: episode.duration || null
        });
        
        bot.sendMessage(chatId, 
          `✅ Episode successfully added!\n\n` +
          `Anime ID: ${savedEpisode.animeId}\n` +
          `Episode: ${savedEpisode.number} - ${savedEpisode.title}\n` +
          `Video URL: ${savedEpisode.videoUrl}`
        );
        
        // Reset state
        userStates.delete(chatId);
      } catch (error) {
        bot.sendMessage(chatId, `Error saving episode: ${error}`);
      }
    }
  } else if (episode.videoUrl) {
    // Process additional information like duration
    if (!episode.duration) {
      const duration = parseInt(text);
      if (!isNaN(duration) && duration > 0) {
        episode.duration = duration;
        
        bot.sendMessage(chatId, 
          "Duration saved. Please upload a thumbnail image or type 'skip' to use the default."
        );
      } else if (text.toLowerCase() === 'skip') {
        // Save the episode
        try {
          const savedEpisode = await storage.createEpisode({
            animeId: state.currentAnimeId!,
            title: episode.title!,
            number: episode.number!,
            videoUrl: episode.videoUrl,
            thumbnail: episode.thumbnail || null,
            duration: episode.duration || null
          });
          
          bot.sendMessage(chatId, 
            `✅ Episode successfully added!\n\n` +
            `Anime ID: ${savedEpisode.animeId}\n` +
            `Episode: ${savedEpisode.number} - ${savedEpisode.title}\n` +
            `Video URL: ${savedEpisode.videoUrl}`
          );
          
          // Reset state
          userStates.delete(chatId);
        } catch (error) {
          bot.sendMessage(chatId, `Error saving episode: ${error}`);
        }
      } else {
        bot.sendMessage(chatId, 
          "Please enter a valid duration in seconds or type 'skip'."
        );
      }
    }
  }
}
