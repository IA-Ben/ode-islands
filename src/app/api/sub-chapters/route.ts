import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { storage } from '../../../../server/storage';

export async function GET(request: NextRequest) {
  try {
    const chapterId = request.nextUrl.searchParams.get('chapterId');
    if (!chapterId) {
      return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 });
    }
    
    const subChapters = await storage.getSubChapters(chapterId);
    
    // Get custom buttons for each sub-chapter
    const subChaptersWithButtons = await Promise.all(
      subChapters.map(async (subChapter) => {
        const buttons = await storage.getCustomButtons('sub_chapter', subChapter.id);
        return {
          ...subChapter,
          customButtons: buttons,
        };
      })
    );
    
    return NextResponse.json(subChaptersWithButtons);
  } catch (error) {
    console.error('Error fetching sub-chapters:', error);
    return NextResponse.json({ error: 'Failed to fetch sub-chapters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const subChapter = await storage.createSubChapter({
      chapterId: data.chapterId,
      title: data.title,
      summary: data.summary,
      order: data.order || 0,
      unlockConditions: data.unlockConditions || null,
    });
    
    return NextResponse.json(subChapter);
  } catch (error) {
    console.error('Error creating sub-chapter:', error);
    return NextResponse.json({ error: 'Failed to create sub-chapter' }, { status: 500 });
  }
}