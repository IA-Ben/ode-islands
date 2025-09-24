import { NextRequest, NextResponse } from 'next/server';
import { 
  readOdeIslandsData, 
  addNewChapter, 
  writeOdeIslandsData
} from '@/lib/utils/jsonFileUtils';
import { chapters } from '@/server/storage';

// POST /api/chapters/create - Create a new chapter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, summary, hasAR = false, initialCards = [] } = body;
    
    if (!title || !summary) {
      return NextResponse.json(
        { error: 'Title and summary are required' },
        { status: 400 }
      );
    }

    // Add the new chapter to JSON file
    const chapterKey = await addNewChapter(title, initialCards);
    
    // Also create a corresponding database entry for metadata
    try {
      const data = await readOdeIslandsData();
      const existingChapters = await chapters.findMany();
      const nextOrder = Math.max(...existingChapters.map(c => c.order), 0) + 1;
      
      const dbChapter = await chapters.insert({
        title,
        summary,
        hasAR,
        order: nextOrder,
        eventId: null, // Default to no specific event
      }).returning();

      return NextResponse.json({
        message: 'Chapter created successfully',
        chapterKey,
        dbChapter: dbChapter[0],
        cardCount: data[chapterKey]?.length || 0
      }, { status: 201 });
      
    } catch (dbError) {
      console.warn('Database chapter creation failed, but JSON chapter created:', dbError);
      // Even if DB fails, JSON chapter was created successfully
      return NextResponse.json({
        message: 'Chapter created in JSON (database sync failed)',
        chapterKey,
        cardCount: initialCards.length
      }, { status: 201 });
    }
    
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create chapter' },
      { status: 500 }
    );
  }
}