import { NextResponse, NextRequest } from 'next/server';
import { getServerUser } from '../../../../../../server/auth';
import { db } from '../../../../../../server/db';
import { liveEvents, chapters, storyCards, cards } from '../../../../../../shared/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await params;
    const { templateId, name } = await request.json();

    let createdContent;

    switch (type) {
      case 'event':
        createdContent = await createEventFromTemplate(templateId, name, user.id);
        break;
      case 'story':
        createdContent = await createStoryFromTemplate(templateId, name, user.id);
        break;
      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, content: createdContent });
  } catch (error) {
    console.error('Template creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create from template' },
      { status: 500 }
    );
  }
}

async function createEventFromTemplate(templateId: string, name: string, userId: string) {
  const templates: Record<string, any> = {
    'concert-event': {
      title: name || 'New Concert Event',
      description: 'Live concert experience with interactive features',
      settings: {
        allowPolls: true,
        allowQA: true,
        allowChat: true,
        moderationRequired: true,
      },
    },
    'festival-event': {
      title: name || 'New Festival',
      description: 'Multi-day festival with multiple stages',
      settings: {
        allowPolls: true,
        allowQA: true,
        allowChat: true,
        multiDay: true,
      },
    },
    'ar-treasure-hunt': {
      title: name || 'AR Treasure Hunt',
      description: 'Location-based AR experience',
      settings: {
        allowPolls: false,
        allowQA: false,
        arEnabled: true,
        locationBased: true,
      },
    },
  };

  const template = templates[templateId] || templates['concert-event'];

  const [event] = await db
    .insert(liveEvents)
    .values({
      ...template,
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
      isActive: false,
      createdBy: userId,
    })
    .returning();

  return event;
}

async function createStoryFromTemplate(templateId: string, name: string, userId: string) {
  const templates: Record<string, any> = {
    'branching-story': {
      chapters: [
        { title: 'Prologue', summary: 'The story begins...', order: 0 },
        { title: 'Chapter 1: The Choice', summary: 'A decision must be made', order: 1 },
        { title: 'Path A: Adventure', summary: 'You chose adventure', order: 2, parentId: null },
        { title: 'Path B: Caution', summary: 'You chose caution', order: 3, parentId: null },
        { title: 'Epilogue', summary: 'The story concludes', order: 4 },
      ],
    },
    'linear-story': {
      chapters: [
        { title: 'Chapter 1', summary: 'Introduction', order: 0 },
        { title: 'Chapter 2', summary: 'Rising Action', order: 1 },
        { title: 'Chapter 3', summary: 'Climax', order: 2 },
        { title: 'Chapter 4', summary: 'Resolution', order: 3 },
      ],
    },
    'artist-bts': {
      chapters: [
        { title: 'Meet the Artist', summary: 'Get to know the artist', order: 0 },
        { title: 'Behind the Scenes', summary: 'Exclusive backstage content', order: 1 },
        { title: 'The Creative Process', summary: 'How the music is made', order: 2 },
      ],
    },
  };

  const template = templates[templateId] || templates['linear-story'];

  const createdChapters = [];
  for (const chapterData of template.chapters) {
    const [chapter] = await db
      .insert(chapters)
      .values({
        title: chapterData.title,
        summary: chapterData.summary,
        order: chapterData.order,
        publishStatus: 'draft',
      })
      .returning();

    createdChapters.push(chapter);
  }

  return { chapters: createdChapters };
}
