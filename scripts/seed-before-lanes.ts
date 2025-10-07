import { db } from '../server/db';
import { beforeLanes } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function seedBeforeLanes() {
  console.log('🌱 Seeding Before lanes...');

  const lanes = [
    {
      laneKey: 'plan',
      title: 'Plan',
      description: 'Get ready for your event experience',
      iconName: 'Calendar',
      order: 1,
      isActive: true,
    },
    {
      laneKey: 'discover',
      title: 'Discover',
      description: 'Explore stories, videos, and art',
      iconName: 'Compass',
      order: 2,
      isActive: true,
    },
    {
      laneKey: 'community',
      title: 'Community',
      description: 'Connect with fellow fans',
      iconName: 'Users',
      order: 3,
      isActive: true,
    },
    {
      laneKey: 'bts',
      title: 'BTS',
      description: 'Behind the scenes content',
      iconName: 'Film',
      order: 4,
      isActive: true,
    },
  ];

  for (const lane of lanes) {
    const existing = await db
      .select()
      .from(beforeLanes)
      .where(eq(beforeLanes.laneKey, lane.laneKey))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(beforeLanes).values({
        ...lane,
        eventId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`  ✓ Created lane: ${lane.title}`);
    } else {
      console.log(`  - Lane already exists: ${lane.title}`);
    }
  }

  console.log('✅ Before lanes seeding complete');
}

seedBeforeLanes().catch(console.error);
