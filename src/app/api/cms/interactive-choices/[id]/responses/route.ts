import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '../../../../../../../server/auth';
import { db } from '../../../../../../../server/db';
import { choiceResponses, interactiveChoices } from '../../../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { webSocketManager } from '../../../../../../../server/websocket';

// Submit or update a response to an interactive choice
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: choiceId } = params;
    const data = await request.json();
    
    // Get user session
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.userId!;
    
    // Validate that the interactive choice exists and is active
    const choice = await db
      .select()
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
    
    // Check if choice is active
    if (choiceData.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'This choice is not currently active' },
        { status: 400 }
      );
    }
    
    // Check time constraints
    const now = new Date();
    if (choiceData.startTime && now < choiceData.startTime) {
      return NextResponse.json(
        { success: false, message: 'This choice has not started yet' },
        { status: 400 }
      );
    }
    
    if (choiceData.endTime && now > choiceData.endTime) {
      return NextResponse.json(
        { success: false, message: 'This choice has ended' },
        { status: 400 }
      );
    }
    
    // Validate response data based on choice type
    const { selectedChoices, customInput, ranking, responseTime, confidence, isAnonymous } = data;
    
    if (!selectedChoices && !ranking && !customInput) {
      return NextResponse.json(
        { success: false, message: 'Response data is required' },
        { status: 400 }
      );
    }
    
    // Validate selection constraints
    if (selectedChoices && Array.isArray(selectedChoices)) {
      if (choiceData.minSelections && selectedChoices.length < choiceData.minSelections) {
        return NextResponse.json(
          { success: false, message: `At least ${choiceData.minSelections} selections required` },
          { status: 400 }
        );
      }
      
      if (choiceData.maxSelections && selectedChoices.length > choiceData.maxSelections) {
        return NextResponse.json(
          { success: false, message: `Maximum ${choiceData.maxSelections} selections allowed` },
          { status: 400 }
        );
      }
    }
    
    // Check if user has already responded
    const existingResponse = await db
      .select()
      .from(choiceResponses)
      .where(and(
        eq(choiceResponses.choiceId, choiceId),
        eq(choiceResponses.userId, userId)
      ))
      .limit(1);
    
    let response;
    
    if (existingResponse.length > 0) {
      // Update existing response
      response = await db
        .update(choiceResponses)
        .set({
          selectedChoices: selectedChoices || existingResponse[0].selectedChoices,
          customInput: customInput || existingResponse[0].customInput,
          ranking: ranking || existingResponse[0].ranking,
          responseTime: responseTime,
          confidence: confidence,
          isAnonymous: isAnonymous !== undefined ? isAnonymous : existingResponse[0].isAnonymous,
          lastModified: new Date()
        })
        .where(and(
          eq(choiceResponses.choiceId, choiceId),
          eq(choiceResponses.userId, userId)
        ))
        .returning();
    } else {
      // Create new response
      response = await db
        .insert(choiceResponses)
        .values({
          choiceId,
          userId,
          selectedChoices: selectedChoices || [],
          customInput,
          ranking,
          responseTime,
          confidence,
          isAnonymous: isAnonymous || false
        })
        .returning();
    }
    
    // Calculate updated response statistics for real-time updates
    const updatedResponses = await db
      .select()
      .from(choiceResponses)
      .where(eq(choiceResponses.choiceId, choiceId));
    
    const totalResponses = updatedResponses.length;
    const responseStats: Record<string, any> = {};
    const choices = choiceData.choices as any[];
    
    // Calculate real-time statistics
    if (choiceData.choiceType === 'multi_choice' || choiceData.choiceType === 'grouped_choices') {
      choices.forEach((option: any) => {
        const count = updatedResponses.filter(r => {
          const selected = r.selectedChoices as string[];
          return selected && selected.includes(option.id || option.value);
        }).length;
        responseStats[option.id || option.value] = {
          count,
          percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
          label: option.label || option.text || option.value
        };
      });
    } else if (choiceData.choiceType === 'ranking') {
      choices.forEach((option: any) => {
        const rankings = updatedResponses.map(r => {
          const ranking = r.ranking as any[];
          if (!ranking) return choices.length + 1;
          const position = ranking.findIndex(item => item === (option.id || option.value));
          return position >= 0 ? position + 1 : choices.length + 1;
        });
        const avgRanking = rankings.reduce((sum, rank) => sum + rank, 0) / rankings.length;
        responseStats[option.id || option.value] = {
          count: rankings.filter(r => r <= choices.length).length,
          averageRanking: Math.round(avgRanking * 10) / 10,
          label: option.label || option.text || option.value
        };
      });
    }
    
    // Broadcast real-time update via WebSocket if this choice is part of an event
    if (choiceData.eventId) {
      webSocketManager.broadcastChoiceUpdate(
        choiceData.eventId,
        choiceId,
        responseStats,
        totalResponses
      );
    }

    return NextResponse.json({
      success: true,
      response: response[0],
      message: existingResponse.length > 0 ? 'Response updated successfully' : 'Response submitted successfully',
      realTimeStats: {
        totalResponses,
        responseStats
      }
    });
    
  } catch (error) {
    console.error('Error submitting choice response:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit response' },
      { status: 500 }
    );
  }
}

// Get responses for an interactive choice (admin only for detailed view)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: choiceId } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeDetails = searchParams.get('includeDetails') === 'true';
    
    // Get user session to determine access level
    const session = await getSessionFromHeaders(request);
    
    // Get the interactive choice
    const choice = await db
      .select()
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
    
    // Get responses based on access level
    let responses;
    if (includeDetails && session.isAuthenticated && session.isAdmin) {
      // Admin view: include all response details
      responses = await db
        .select()
        .from(choiceResponses)
        .where(eq(choiceResponses.choiceId, choiceId))
        .orderBy(choiceResponses.submittedAt);
    } else {
      // Public view: only aggregated statistics
      responses = await db
        .select({
          selectedChoices: choiceResponses.selectedChoices,
          ranking: choiceResponses.ranking,
          submittedAt: choiceResponses.submittedAt,
          isAnonymous: choiceResponses.isAnonymous
        })
        .from(choiceResponses)
        .where(eq(choiceResponses.choiceId, choiceId))
        .orderBy(choiceResponses.submittedAt);
    }
    
    // Calculate real-time statistics
    const totalResponses = responses.length;
    const responseStats: Record<string, any> = {};
    
    // Calculate statistics based on choice type
    const choices = choiceData.choices as any[];
    
    if (choiceData.choiceType === 'multi_choice' || choiceData.choiceType === 'grouped_choices') {
      choices.forEach((option: any) => {
        const count = responses.filter(r => {
          const selected = r.selectedChoices as string[];
          return selected && selected.includes(option.id || option.value);
        }).length;
        responseStats[option.id || option.value] = {
          count,
          percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
          label: option.label || option.text || option.value
        };
      });
    } else if (choiceData.choiceType === 'ranking') {
      choices.forEach((option: any) => {
        const rankings = responses.map(r => {
          const ranking = r.ranking as any[];
          if (!ranking) return choices.length + 1;
          const position = ranking.findIndex(item => item === (option.id || option.value));
          return position >= 0 ? position + 1 : choices.length + 1;
        });
        const avgRanking = rankings.reduce((sum, rank) => sum + rank, 0) / rankings.length;
        responseStats[option.id || option.value] = {
          count: rankings.filter(r => r <= choices.length).length,
          averageRanking: Math.round(avgRanking * 10) / 10,
          label: option.label || option.text || option.value
        };
      });
    }
    
    return NextResponse.json({
      success: true,
      choice: {
        id: choiceData.id,
        title: choiceData.title,
        description: choiceData.description,
        choiceType: choiceData.choiceType,
        choices: choiceData.choices,
        showLiveResults: choiceData.showLiveResults,
        visualizationType: choiceData.visualizationType
      },
      totalResponses,
      responseStats,
      responses: includeDetails ? responses : undefined
    });
    
  } catch (error) {
    console.error('Error fetching choice responses:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}