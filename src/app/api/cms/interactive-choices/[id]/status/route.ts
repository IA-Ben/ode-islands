import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '../../../../../../../server/auth';
import { db } from '../../../../../../../server/db';
import { interactiveChoices } from '../../../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { webSocketManager } from '../../../../../../../server/websocket';

// Update choice status (activate/deactivate) - Admin only
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: choiceId } = params;
    const data = await request.json();
    
    // Get user session and verify admin access
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin privileges required' },
        { status: 403 }
      );
    }
    
    const { status } = data;
    
    // Validate status value
    if (!['draft', 'active', 'paused', 'completed', 'archived'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    // Check if interactive choice exists
    const existingChoice = await db
      .select()
      .from(interactiveChoices)
      .where(eq(interactiveChoices.id, choiceId))
      .limit(1);
    
    if (existingChoice.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Interactive choice not found' },
        { status: 404 }
      );
    }
    
    const choiceData = existingChoice[0];
    const previousStatus = choiceData.status;
    
    // Update the choice status
    const updatedChoice = await db
      .update(interactiveChoices)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(interactiveChoices.id, choiceId))
      .returning();
    
    // Notify via WebSocket if this choice is part of an event
    if (choiceData.eventId) {
      if (status === 'active' && previousStatus !== 'active') {
        // Choice activated
        webSocketManager.notifyChoiceActivated(choiceData.eventId, choiceId, updatedChoice[0]);
      } else if (status !== 'active' && previousStatus === 'active') {
        // Choice deactivated
        webSocketManager.notifyChoiceDeactivated(choiceData.eventId, choiceId);
      }
    }
    
    return NextResponse.json({
      success: true,
      choice: updatedChoice[0],
      message: `Choice ${status === 'active' ? 'activated' : status === 'paused' ? 'paused' : status === 'completed' ? 'completed' : status === 'archived' ? 'archived' : 'updated'} successfully`,
      previousStatus,
      newStatus: status
    });
    
  } catch (error) {
    console.error('Error updating choice status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update choice status' },
      { status: 500 }
    );
  }
}

// Get choice status information - Admin only
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: choiceId } = params;
    
    // Get user session and verify admin access
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin privileges required' },
        { status: 403 }
      );
    }
    
    // Get the interactive choice
    const choice = await db
      .select({
        id: interactiveChoices.id,
        title: interactiveChoices.title,
        status: interactiveChoices.status,
        eventId: interactiveChoices.eventId,
        chapterId: interactiveChoices.chapterId,
        startTime: interactiveChoices.startTime,
        endTime: interactiveChoices.endTime,
        createdAt: interactiveChoices.createdAt,
        updatedAt: interactiveChoices.updatedAt
      })
      .from(interactiveChoices)
      .where(eq(interactiveChoices.id, choiceId))
      .limit(1);
    
    if (choice.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Interactive choice not found' },
        { status: 404 }
      );
    }
    
    const choiceData = choice[0];
    
    // Check if choice can be activated based on time constraints
    const now = new Date();
    const canActivate = (!choiceData.startTime || now >= choiceData.startTime) &&
                       (!choiceData.endTime || now <= choiceData.endTime);
    
    // Determine next possible status transitions
    const possibleTransitions = [];
    
    switch (choiceData.status) {
      case 'draft':
        if (canActivate) {
          possibleTransitions.push('active');
        }
        possibleTransitions.push('archived');
        break;
      case 'active':
        possibleTransitions.push('paused', 'completed');
        break;
      case 'paused':
        if (canActivate) {
          possibleTransitions.push('active');
        }
        possibleTransitions.push('completed', 'archived');
        break;
      case 'completed':
        possibleTransitions.push('active', 'archived');
        break;
      case 'archived':
        possibleTransitions.push('draft');
        break;
    }
    
    return NextResponse.json({
      success: true,
      choice: choiceData,
      canActivate,
      possibleTransitions,
      timeConstraints: {
        hasStartTime: !!choiceData.startTime,
        hasEndTime: !!choiceData.endTime,
        isInTimeWindow: canActivate
      }
    });
    
  } catch (error) {
    console.error('Error fetching choice status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch choice status' },
      { status: 500 }
    );
  }
}