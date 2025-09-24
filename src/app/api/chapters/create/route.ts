import { NextRequest, NextResponse } from 'next/server';
import { 
  readOdeIslandsData, 
  addNewChapter, 
  writeOdeIslandsData
} from '@/lib/utils/jsonFileUtils';
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
    const data = await readOdeIslandsData();

    return NextResponse.json({
      message: 'Chapter created successfully',
      chapterKey,
      cardCount: data[chapterKey]?.length || 0
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create chapter' },
      { status: 500 }
    );
  }
}