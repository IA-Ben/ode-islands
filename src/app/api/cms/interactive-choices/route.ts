import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../server/auth';
import { db } from '../../../../../server/db';
import { interactiveChoices, choiceResponses } from '../../../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// Get interactive choices with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const chapterId = searchParams.get('chapterId');
    const status = searchParams.get('status');
    const choiceType = searchParams.get('choiceType');
    
    // Build query conditions
    const conditions = [];
    if (eventId) conditions.push(eq(interactiveChoices.eventId, eventId));
    if (chapterId) conditions.push(eq(interactiveChoices.chapterId, chapterId));
    if (status) conditions.push(eq(interactiveChoices.status, status));
    if (choiceType) conditions.push(eq(interactiveChoices.choiceType, choiceType));
    
    // Fetch interactive choices
    const choices = await db
      .select()
      .from(interactiveChoices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(interactiveChoices.createdAt));
    
    // For each choice, get response statistics
    const choicesWithStats = await Promise.all(
      choices.map(async (choice) => {
        const responses = await db
          .select()
          .from(choiceResponses)
          .where(eq(choiceResponses.choiceId, choice.id));
        
        const totalResponses = responses.length;
        const responseStats: Record<string, any> = {};
        
        // Calculate statistics based on choice type
        if (choice.choiceType === 'multi_choice' || choice.choiceType === 'grouped_choices') {
          // Count selections for each choice option
          const choiceData = choice.choices as any[];
          choiceData.forEach((option: any) => {
            const count = responses.filter(r => {
              const selected = r.selectedChoices as string[];
              return selected.includes(option.id || option.value);
            }).length;
            responseStats[option.id || option.value] = {
              count,
              percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
            };
          });
        } else if (choice.choiceType === 'ranking') {
          // Calculate average rankings
          const choiceData = choice.choices as any[];
          choiceData.forEach((option: any) => {
            const rankings = responses.map(r => {
              const ranking = r.ranking as any[];
              const position = ranking.findIndex(item => item === option.id || item === option.value);
              return position >= 0 ? position + 1 : choiceData.length + 1;
            });
            const avgRanking = rankings.reduce((sum, rank) => sum + rank, 0) / rankings.length;
            responseStats[option.id || option.value] = {
              count: rankings.length,
              averageRanking: Math.round(avgRanking * 10) / 10,
              percentage: totalResponses > 0 ? Math.round((rankings.length / totalResponses) * 100) : 0
            };
          });
        }
        
        return {
          ...choice,
          totalResponses,
          responseStats,
          participationRate: choice.eventId ? 
            Math.round((totalResponses / Math.max(totalResponses, 1)) * 100) : 100
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      choices: choicesWithStats,
      total: choicesWithStats.length
    });
    
  } catch (error) {
    console.error('Error fetching interactive choices:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch interactive choices' },
      { status: 500 }
    );
  }
}

// Create new interactive choice (admin only)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.choiceType || !data.choices) {
      return NextResponse.json(
        { success: false, message: 'Title, choice type, and choices are required' },
        { status: 400 }
      );
    }
    
    // Create the interactive choice
    const newChoice = await db.insert(interactiveChoices).values({
      eventId: data.eventId,
      chapterId: data.chapterId,
      cardIndex: data.cardIndex,
      title: data.title,
      description: data.description,
      choiceType: data.choiceType,
      choices: data.choices,
      maxSelections: data.maxSelections,
      minSelections: data.minSelections || 1,
      allowCustomInput: data.allowCustomInput || false,
      visualizationType: data.visualizationType || 'bar_chart',
      showLiveResults: data.showLiveResults !== false,
      showPercentages: data.showPercentages !== false,
      animateResults: data.animateResults !== false,
      requireConsensus: data.requireConsensus || false,
      consensusThreshold: data.consensusThreshold || 75,
      allowDiscussion: data.allowDiscussion || false,
      discussionTimeLimit: data.discussionTimeLimit,
      status: data.status || 'draft',
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      timeLimit: data.timeLimit,
      showResults: data.showResults !== false,
      resultsVisibleTo: data.resultsVisibleTo || 'all',
      feedbackMessage: data.feedbackMessage,
      cmsConfig: data.cmsConfig,
      themeSettings: data.themeSettings,
      createdBy: data.createdBy
    }).returning();
    
    return NextResponse.json({
      success: true,
      choice: newChoice[0]
    });
    
  } catch (error) {
    console.error('Error creating interactive choice:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create interactive choice' },
      { status: 500 }
    );
  }
});