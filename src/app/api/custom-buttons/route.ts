import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../server/storage';
import { withAuth, getSessionFromHeaders } from '../../../../server/auth';

// Helper function to check unlock conditions
export function checkUnlockConditions(conditions: any, context: any = {}): {
  isUnlocked: boolean;
  hint?: string;
} {
  if (!conditions || conditions.length === 0) {
    return { isUnlocked: true };
  }
  
  for (const condition of conditions) {
    switch (condition.type) {
      case 'stamp-required':
        if (!context.stamps || !context.stamps.includes(condition.stampId)) {
          return { 
            isUnlocked: false, 
            hint: `Requires stamp: ${condition.stampName || 'Special stamp'}` 
          };
        }
        break;
        
      case 'task-required':
        if (!context.completedTasks || !context.completedTasks.includes(condition.taskId)) {
          return { 
            isUnlocked: false, 
            hint: `Complete task: ${condition.taskName || 'Previous task'}` 
          };
        }
        break;
        
      case 'time-window':
        const now = new Date();
        const start = new Date(condition.startTime);
        const end = new Date(condition.endTime);
        if (now < start || now > end) {
          return { 
            isUnlocked: false, 
            hint: `Available between ${start.toLocaleString()} and ${end.toLocaleString()}` 
          };
        }
        break;
        
      case 'geofence':
        if (!context.location) {
          return { 
            isUnlocked: false, 
            hint: 'Location access required' 
          };
        }
        // Additional geofence logic would go here
        break;
        
      case 'sign-in':
        if (!context.userId) {
          return { 
            isUnlocked: false, 
            hint: 'Sign in required' 
          };
        }
        break;
    }
  }
  
  return { isUnlocked: true };
}

export async function GET(request: NextRequest) {
  try {
    const parentType = request.nextUrl.searchParams.get('parentType');
    const parentId = request.nextUrl.searchParams.get('parentId');
    
    if (!parentType || !parentId) {
      return NextResponse.json({ error: 'Parent type and ID required' }, { status: 400 });
    }
    
    const buttons = await storage.getCustomButtons(parentType, parentId);
    
    // Check unlock conditions for each button
    const session = await getSessionFromHeaders(request);
    const userId = session?.userId || null;
    
    const buttonsWithUnlock = buttons.map(button => {
      const unlockStatus = checkUnlockConditions(button.unlockConditions, {
        userId,
        // Additional context would be loaded here (stamps, tasks, location, etc.)
      });
      
      return {
        ...button,
        isUnlocked: unlockStatus.isUnlocked,
        unlockHint: unlockStatus.hint,
      };
    });
    
    return NextResponse.json(buttonsWithUnlock);
  } catch (error) {
    console.error('Error fetching custom buttons:', error);
    return NextResponse.json({ error: 'Failed to fetch custom buttons' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = (request as any).session;
    const data = await request.json();
    const button = await storage.createCustomButton({
      parentType: data.parentType,
      parentId: data.parentId,
      label: data.label,
      variant: data.variant || 'primary',
      icon: data.icon,
      destinationType: data.destinationType,
      destinationId: data.destinationId,
      unlockConditions: data.unlockConditions || null,
      order: data.order || 0,
    });
    
    return NextResponse.json(button);
  } catch (error) {
    console.error('Error creating custom button:', error);
    return NextResponse.json({ error: 'Failed to create custom button' }, { status: 500 });
  }
}

export const POST = withAuth(handlePOST);