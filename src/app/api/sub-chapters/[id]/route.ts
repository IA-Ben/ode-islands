import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { storage } from '../../../../../server/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subChapter = await storage.getSubChapter(params.id);
    if (!subChapter) {
      return NextResponse.json({ error: 'Sub-chapter not found' }, { status: 404 });
    }
    
    // Get custom buttons for this sub-chapter
    const buttons = await storage.getCustomButtons('sub_chapter', subChapter.id);
    
    return NextResponse.json({
      ...subChapter,
      customButtons: buttons,
    });
  } catch (error) {
    console.error('Error fetching sub-chapter:', error);
    return NextResponse.json({ error: 'Failed to fetch sub-chapter' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const updated = await storage.updateSubChapter(params.id, data);
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating sub-chapter:', error);
    return NextResponse.json({ error: 'Failed to update sub-chapter' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await storage.deleteSubChapter(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sub-chapter:', error);
    return NextResponse.json({ error: 'Failed to delete sub-chapter' }, { status: 500 });
  }
}