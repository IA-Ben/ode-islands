import fs from 'fs';
import path from 'path';
import type { CardData } from '@/@typings';

export interface ChapterData {
  [key: string]: CardData[];
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
 * Validate card data structure
 */
export function validateCardData(card: Partial<CardData>): card is CardData {
  const required = ['id', 'type', 'content'];
  return required.every(field => card.hasOwnProperty(field) && card[field as keyof CardData] !== undefined);
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
export async function addCardToChapter(chapterKey: string, newCard: CardData): Promise<void> {
  if (!validateCardData(newCard)) {
    throw new Error('Invalid card data provided');
  }

  const data = await readOdeIslandsData();
  
  if (!data[chapterKey]) {
    throw new Error(`Chapter ${chapterKey} does not exist`);
  }

  // Ensure unique ID
  newCard.id = generateCardId(chapterKey);
  
  data[chapterKey].push(newCard);
  await writeOdeIslandsData(data);
}

/**
 * Add a new chapter
 */
export async function addNewChapter(chapterTitle: string, initialCards: CardData[] = []): Promise<string> {
  const data = await readOdeIslandsData();
  const chapterKey = getNextChapterKey(data);
  
  // Validate and assign IDs to initial cards
  const validatedCards = initialCards.map(card => {
    if (!validateCardData(card)) {
      throw new Error('Invalid card data in initial cards');
    }
    return {
      ...card,
      id: generateCardId(chapterKey)
    };
  });
  
  data[chapterKey] = validatedCards;
  await writeOdeIslandsData(data);
  
  return chapterKey;
}