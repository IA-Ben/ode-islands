import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../server/auth';
import { db } from '../../../../../../server/db';
import { interactiveChoices, choiceResponses } from '../../../../../../shared/schema';
import { eq } from 'drizzle-orm';

// Get specific interactive choice with detailed stats
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Fetch the interactive choice
    const choice = await db
      .select()
      .from(interactiveChoices)
      .where(eq(interactiveChoices.id, id))
      .limit(1);
    
    if (choice.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Interactive choice not found' },
        { status: 404 }
      );
    }
    
    // Get all responses for this choice
    const responses = await db
      .select()
      .from(choiceResponses)
      .where(eq(choiceResponses.choiceId, id))
      .orderBy(choiceResponses.submittedAt);
    
    // Calculate detailed statistics
    const totalResponses = responses.length;
    const responseStats = {};
    const responseTimeline = [];
    
    // Calculate statistics based on choice type
    const choiceData = choice[0];
    const choices = choiceData.choices as any[];
    
    if (choiceData.choiceType === 'multi_choice' || choiceData.choiceType === 'grouped_choices') {
      // Count selections for each choice option
      choices.forEach((option: any) => {
        const count = responses.filter(r => {
          const selected = r.selectedChoices as string[];
          return selected.includes(option.id || option.value);
        }).length;
        responseStats[option.id || option.value] = {
          count,
          percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
          label: option.label || option.text || option.value
        };
      });
    } else if (choiceData.choiceType === 'ranking') {
      // Calculate ranking statistics
      choices.forEach((option: any) => {
        const rankings = responses.map(r => {
          const ranking = r.ranking as any[];
          const position = ranking.findIndex(item => item === option.id || item === option.value);
          return position >= 0 ? position + 1 : choices.length + 1;
        });
        const avgRanking = rankings.reduce((sum, rank) => sum + rank, 0) / rankings.length;
        responseStats[option.id || option.value] = {
          count: rankings.length,
          averageRanking: Math.round(avgRanking * 10) / 10,
          label: option.label || option.text || option.value,
          percentage: totalResponses > 0 ? Math.round((rankings.length / totalResponses) * 100) : 0
        };
      });
    } else if (choiceData.choiceType === 'preference_scale') {
      // Calculate scale statistics
      choices.forEach((option: any) => {
        const values = responses.map(r => {
          const selected = r.selectedChoices as any[];
          const scaleValue = selected.find(s => s.optionId === (option.id || option.value));
          return scaleValue ? scaleValue.value : null;
        }).filter(v => v !== null);
        
        const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        responseStats[option.id || option.value] = {
          count: values.length,
          average: Math.round(average * 10) / 10,
          values: values,
          label: option.label || option.text || option.value
        };
      });
    }
    
    // Create response timeline (responses over time)
    responses.forEach((response, index) => {
      responseTimeline.push({
        timestamp: response.submittedAt,
        cumulativeCount: index + 1,
        responseTime: response.responseTime,
        isAnonymous: response.isAnonymous
      });
    });
    
    return NextResponse.json({
      success: true,
      choice: {
        ...choiceData,
        totalResponses,
        responseStats,
        responseTimeline,
        participationRate: totalResponses > 0 ? 100 : 0 // Could be calculated based on expected participants
      }
    });
    
  } catch (error) {
    console.error('Error fetching interactive choice:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch interactive choice' },
      { status: 500 }
    );
  }
}

// Update interactive choice (admin only)
export const PUT = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Update the interactive choice
    const updatedChoice = await db
      .update(interactiveChoices)
      .set({
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        updatedAt: new Date()
      })
      .where(eq(interactiveChoices.id, id))
      .returning();
    
    if (updatedChoice.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Interactive choice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      choice: updatedChoice[0]
    });
    
  } catch (error) {
    console.error('Error updating interactive choice:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update interactive choice' },
      { status: 500 }
    );
  }
});

// Delete interactive choice (admin only)
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    
    // First delete all responses
    await db.delete(choiceResponses).where(eq(choiceResponses.choiceId, id));
    
    // Then delete the choice
    const deletedChoice = await db
      .delete(interactiveChoices)
      .where(eq(interactiveChoices.id, id))
      .returning();
    
    if (deletedChoice.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Interactive choice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Interactive choice deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting interactive choice:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete interactive choice' },
      { status: 500 }
    );
  }
});