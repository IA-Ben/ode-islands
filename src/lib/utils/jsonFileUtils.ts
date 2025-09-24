import fs from 'fs';
import path from 'path';
import type { CardData } from '@/@typings';

// Use the existing CardData structure, optionally with ID
export interface CardDataWithOptionalId extends CardData {
  id?: string;
}

export interface ChapterData {
  [key: string]: CardDataWithOptionalId[];
}

const JSON_FILE_PATH = path.join(process.cwd(), 'src/app/data/ode-islands.json');

/**
 * Safely read the ode-islands.json file
 */
export async function readOdeIslandsData(): Promise<ChapterData> {
  try {
    const fileContent = await fs.promises.readFile(JSON_FILE_PATH, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading ode-islands.json:', error);
    throw new Error('Failed to read chapter data');
  }
}

/**
 * Safely write data to the ode-islands.json file with backup
 */
export async function writeOdeIslandsData(data: ChapterData): Promise<void> {
  try {
    // Create backup before writing
    const backupPath = `${JSON_FILE_PATH}.backup-${Date.now()}`;
    try {
      await fs.promises.copyFile(JSON_FILE_PATH, backupPath);
    } catch (backupError) {
      console.warn('Could not create backup:', backupError);
    }

    // Write new data with proper formatting
    const jsonString = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(JSON_FILE_PATH, jsonString, 'utf8');
    
    console.log('Successfully updated ode-islands.json');
  } catch (error) {
    console.error('Error writing ode-islands.json:', error);
    throw new Error('Failed to write chapter data');
  }
}

/**
 * Validate card data structure - cards need at least some content
 */
export function validateCardData(card: Partial<CardDataWithOptionalId>): card is CardDataWithOptionalId {
  // Check if card has at least one content field (text, video, image, etc.)
  const hasContent = !!(
    card.text || card.video || card.image || card.playcanvas || 
    card.ar || card.poll || card.quiz || card.cta
  );
  return hasContent && typeof card === 'object';
}

/**
 * Generate next available chapter key
 */
export function getNextChapterKey(existingData: ChapterData): string {
  const existingChapters = Object.keys(existingData)
    .filter(key => key.startsWith('chapter-'))
    .map(key => parseInt(key.replace('chapter-', '')))
    .filter(num => !isNaN(num));
  
  const maxChapter = existingChapters.length > 0 ? Math.max(...existingChapters) : 0;
  return `chapter-${maxChapter + 1}`;
}

/**
 * Generate unique card ID
 */
export function generateCardId(chapterKey: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${chapterKey}-card-${timestamp}-${random}`;
}

/**
 * Add a new card to a chapter
 */
export async function addCardToChapter(chapterKey: string, newCard: CardDataWithOptionalId): Promise<void> {
  if (!validateCardData(newCard)) {
    throw new Error('Invalid card data provided');
  }

  const data = await readOdeIslandsData();
  
  if (!data[chapterKey]) {
    throw new Error(`Chapter ${chapterKey} does not exist`);
  }

  // Add optional ID for tracking
  const cardWithId = {
    ...newCard,
    id: newCard.id || generateCardId(chapterKey)
  };
  
  data[chapterKey].push(cardWithId);
  await writeOdeIslandsData(data);
}

/**
 * Add a new chapter
 */
export async function addNewChapter(chapterTitle: string, initialCards: CardDataWithOptionalId[] = []): Promise<string> {
  const data = await readOdeIslandsData();
  const chapterKey = getNextChapterKey(data);
  
  // Validate and assign IDs to initial cards
  const validatedCards = initialCards.map(card => {
    if (!validateCardData(card)) {
      throw new Error('Invalid card data in initial cards');
    }
    return {
      ...card,
      id: card.id || generateCardId(chapterKey)
    };
  });
  
  data[chapterKey] = validatedCards;
  await writeOdeIslandsData(data);
  
  return chapterKey;
}