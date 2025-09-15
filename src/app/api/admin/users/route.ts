import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { users } from '../../../../../shared/schema';
import { desc, count, sql } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Sanitize input parameters with proper validation
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const rawOffset = parseInt(searchParams.get('offset') || '0');
    const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 50 : rawLimit, 200));
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);
    const search = searchParams.get('search') || '';

    // Build base query with optional search (fix undefined whereClause issue)
    const searchCondition = search ? sql`(
      ${users.email} ILIKE ${`%${search}%`} OR 
      ${users.firstName} ILIKE ${`%${search}%`} OR 
      ${users.lastName} ILIKE ${`%${search}%`} OR 
      (${users.firstName} || ' ' || ${users.lastName}) ILIKE ${`%${search}%`}
    )` : undefined;

    // Get total count and users data in parallel with conditional where clauses
    const [totalCountResult, allUsers] = await Promise.all([
      // Use conditional query building to avoid undefined where clause
      search 
        ? db.select({ count: count() }).from(users).where(searchCondition!)
        : db.select({ count: count() }).from(users),
      
      // Build users query conditionally
      (() => {
        const baseQuery = db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          isAdmin: users.isAdmin,
          emailVerified: users.emailVerified,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt
        })
        .from(users);
        
        const withSearch = search ? baseQuery.where(searchCondition!) : baseQuery;
        
        return withSearch
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset);
      })()
    ]);

    const totalCount = totalCountResult[0]?.count || 0;
    const hasMore = offset + limit < totalCount;
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return NextResponse.json({
      success: true,
      users: allUsers,
      pagination: {
        total: totalCount,
        limit,
        offset,
        currentPage,
        totalPages,
        hasMore,
        hasPrevious: offset > 0
      },
      search: search || null
    });

  } catch (error) {
    console.error('Admin users fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Apply admin authentication middleware
export const GET = withAuth(handleGET, { requireAdmin: true });