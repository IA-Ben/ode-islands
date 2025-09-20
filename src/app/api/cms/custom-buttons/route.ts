import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../../server/storage';
import { withAuth } from '../../../../../server/auth';

// Get all custom buttons for CMS management
export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Fetch all custom buttons across all entities
    const buttons = await storage.getAllCustomButtons();
    
    // Group buttons by parent for easier management
    const groupedButtons = {
      chapters: buttons.filter(b => b.parentType === 'chapter'),
      subChapters: buttons.filter(b => b.parentType === 'sub_chapter'),
      storyCards: buttons.filter(b => b.parentType === 'story_card'),
    };
    
    return NextResponse.json(groupedButtons);
  } catch (error) {
    console.error('Error fetching all custom buttons:', error);
    return NextResponse.json({ error: 'Failed to fetch custom buttons' }, { status: 500 });
  }
});

// Create multiple buttons at once for CMS bulk operations
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { buttons } = await request.json();
    
    if (!Array.isArray(buttons)) {
      return NextResponse.json({ error: 'Buttons array required' }, { status: 400 });
    }
    
    const createdButtons = await Promise.all(
      buttons.map(buttonData => 
        storage.createCustomButton({
          parentType: buttonData.parentType,
          parentId: buttonData.parentId,
          label: buttonData.label,
          variant: buttonData.variant || 'primary',
          icon: buttonData.icon,
          destinationType: buttonData.destinationType,
          destinationId: buttonData.destinationId,
          unlockConditions: buttonData.unlockConditions || null,
          order: buttonData.order || 0,
        })
      )
    );
    
    return NextResponse.json(createdButtons);
  } catch (error) {
    console.error('Error creating custom buttons:', error);
    return NextResponse.json({ error: 'Failed to create custom buttons' }, { status: 500 });
  }
});

// Update button order for drag-and-drop reordering
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const { reorderedButtons } = await request.json();
    
    if (!Array.isArray(reorderedButtons)) {
      return NextResponse.json({ error: 'Reordered buttons array required' }, { status: 400 });
    }
    
    await Promise.all(
      reorderedButtons.map((item, index) => 
        storage.updateCustomButton(item.id, { order: index })
      )
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering custom buttons:', error);
    return NextResponse.json({ error: 'Failed to reorder custom buttons' }, { status: 500 });
  }
});