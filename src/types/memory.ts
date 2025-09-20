// Memory Wallet Type Definitions

export type MemoryType = 'stamp' | 'sticker' | 'photo' | 'ar';
export type MemoryRarity = 'common' | 'rare' | 'legendary';

// Memory summary for grid display
export interface MemorySummary {
  id: string;
  title: string;
  thumbnailUrl?: string;
  owned: boolean;
  type: MemoryType;
  rarity: MemoryRarity;
  // Additional display fields
  points?: number;
  chapterTitle?: string;
  subChapterTitle?: string;
}

// Full memory detail
export interface MemoryDetail {
  id: string;
  title: string;
  heroUrl?: string;
  description?: string;
  chapterTitle?: string;
  subChapterTitle?: string;
  collectedAt?: string | null; // ISO date string or null if not collected
  type: MemoryType;
  rarity: MemoryRarity;
  points: number;
  tags: string[];
  source?: string; // e.g., "QR Act I"
  unlockRule?: string;
  shareUrl?: string;
  arItemId?: string; // Optional AR item ID for AR replay
  credits?: string; // Artist/photographer credits
  alt?: string; // Alt text for accessibility
  license?: string;
  // Additional metadata
  mediaUrl?: string;
  mediaType?: string;
  thumbnail?: string;
  sourceType?: string;
  sourceId?: string;
  sourceMetadata?: any;
  eventId?: string;
  chapterId?: string;
  cardIndex?: number;
  userNotes?: string;
  isFavorite?: boolean;
  memoryCategory?: string;
  emotionalTone?: string;
}

// Wallet response type
export interface WalletResponse {
  totalSlots: number;
  items: MemorySummary[];
  unlockedCount: number;
  progress: {
    percentage: number;
    level?: string;
  };
}

// Error response type
export interface ErrorResponse {
  success: false;
  message: string;
}

// Success response types
export interface WalletSuccessResponse {
  success: true;
  data: WalletResponse;
}

export interface MemoryDetailSuccessResponse {
  success: true;
  data: MemoryDetail;
}