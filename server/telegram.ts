import crypto from 'crypto';

interface TelegramAuthData {
  id: string;
  first_name: string;
  last_name?: string;
  username: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7677348721:AAE9JIinYDRlYNSBSw1ZWAmz1iMnS-BKVfQ';

export function verifyTelegramAuth(authData: TelegramAuthData): boolean {
  const { hash, ...data } = authData;
  
  // Sort keys in alphabetical order
  const dataCheckString = Object.keys(data)
    .sort()
    .map(k => `${k}=${data[k as keyof typeof data]}`)
    .join('\n');
  
  // Secret key for HMAC
  const secretKey = crypto
    .createHash('sha256')
    .update(BOT_TOKEN)
    .digest();
  
  // Calculate hash
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return computedHash === hash;
}

export function isAuthExpired(authDate: number): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const maxAge = 86400; // 24 hours in seconds
  
  return currentTime - authDate > maxAge;
}

export function getSessionExpiryDate(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 3); // 3 days from now
  return expiryDate;
}

export function isAdminTelegramId(telegramId: string): boolean {
  return telegramId === '1295145079'; // Admin Telegram ID as specified
}
