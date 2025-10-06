import { db } from '../db';
import { cards, cardAssignments, eventLanes, liveEvents } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface EventLaneCard {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  size: 'S' | 'M' | 'L';
  description: string;
}

const infoLaneCards: EventLaneCard[] = [
  {
    id: 'schedule',
    type: 'schedule',
    title: 'Schedule',
    subtitle: 'Event Timeline',
    size: 'M',
    description: 'View tonight\'s full schedule'
  },
  {
    id: 'map',
    type: 'map',
    title: 'Map & Wayfinding',
    subtitle: 'Find Your Way',
    size: 'M',
    description: 'Navigate the venue with our interactive map'
  },
  {
    id: 'venue',
    type: 'venue',
    title: 'Venue Info',
    subtitle: 'Know Before You Go',
    size: 'S',
    description: 'Important venue information and guidelines'
  },
  {
    id: 'safety',
    type: 'safety',
    title: 'Safety & Help',
    subtitle: 'We\'re Here For You',
    size: 'S',
    description: 'Emergency contacts and assistance'
  }
];

const interactLaneCards: EventLaneCard[] = [
  {
    id: 'live-ar',
    type: 'live-ar',
    title: 'Live AR Experience',
    subtitle: 'Augmented Reality',
    size: 'L',
    description: 'Immerse yourself in the Ode Islands world'
  },
  {
    id: 'qr-scan',
    type: 'qr-scan',
    title: 'QR Scanner',
    subtitle: 'Unlock Content',
    size: 'M',
    description: 'Scan codes around the venue for exclusive content'
  },
  {
    id: 'wearables',
    type: 'wearables',
    title: 'Wearables Sync',
    subtitle: 'Connect Your Device',
    size: 'S',
    description: 'Sync with wearables for enhanced experiences'
  },
  {
    id: 'ai-create',
    type: 'ai-create',
    title: 'AI Creation Studio',
    subtitle: 'Create with AI',
    size: 'M',
    description: 'Generate personalized Ode Islands artwork'
  },
  {
    id: 'user-media',
    type: 'user-media',
    title: 'Share Your Moment',
    subtitle: 'Upload Media',
    size: 'S',
    description: 'Share your photos and videos from tonight'
  }
];

const rewardsLaneCards: EventLaneCard[] = [
  {
    id: 'superfan',
    type: 'points-superfan',
    title: 'Superfan Status',
    subtitle: 'Your Progress',
    size: 'L',
    description: 'Track your tier and unlock exclusive rewards'
  },
  {
    id: 'merch',
    type: 'merch',
    title: 'Exclusive Merch',
    subtitle: 'Limited Edition',
    size: 'M',
    description: 'Shop exclusive Ode Islands merchandise'
  },
  {
    id: 'food-bev',
    type: 'f&b',
    title: 'Food & Beverage',
    subtitle: 'Dining Options',
    size: 'M',
    description: 'Browse menu and pre-order from your seat'
  }
];

export async function seedEventCards(eventId?: string): Promise<{ success: boolean; seededCount: number; error?: string }> {
  console.log('Starting event cards seeding...');
  
  let seededCount = 0;
  const errors: string[] = [];

  try {
    let targetEventId = eventId;
    
    if (!targetEventId) {
      const events = await db.select().from(liveEvents).limit(1);
      if (events.length > 0) {
        targetEventId = events[0].id;
        console.log(`Using existing event: ${targetEventId}`);
      } else {
        console.log('No events found. Event cards will be created without event association.');
      }
    }

    await db.transaction(async (tx) => {
      const laneConfigs = [
        { laneKey: 'info', title: 'Info', description: 'Essential event information', iconName: 'Info', cards: infoLaneCards },
        { laneKey: 'interact', title: 'Interact', description: 'Interactive experiences', iconName: 'Zap', cards: interactLaneCards },
        { laneKey: 'rewards', title: 'Rewards', description: 'Rewards and benefits', iconName: 'Gift', cards: rewardsLaneCards }
      ];

      for (const laneConfig of laneConfigs) {
        try {
          let lane;
          
          if (targetEventId) {
            const existingLanes = await tx
              .select()
              .from(eventLanes)
              .where(
                and(
                  eq(eventLanes.eventId, targetEventId),
                  eq(eventLanes.laneKey, laneConfig.laneKey)
                )
              );

            if (existingLanes.length > 0) {
              lane = existingLanes[0];
              console.log(`Using existing ${laneConfig.laneKey} lane: ${lane.id}`);
            } else {
              const [newLane] = await tx
                .insert(eventLanes)
                .values({
                  eventId: targetEventId,
                  laneKey: laneConfig.laneKey,
                  title: laneConfig.title,
                  description: laneConfig.description,
                  iconName: laneConfig.iconName,
                  order: laneConfigs.indexOf(laneConfig),
                  isActive: true,
                })
                .returning();
              
              lane = newLane;
              console.log(`Created ${laneConfig.laneKey} lane: ${lane.id}`);
            }
          }

          for (let i = 0; i < laneConfig.cards.length; i++) {
            const cardData = laneConfig.cards[i];
            
            try {
              const existingCards = await tx
                .select()
                .from(cards)
                .where(
                  sql`${cards.scope} = 'event' AND ${cards.metadata}->>'seedId' = ${cardData.id}`
                );

              if (existingCards.length > 0) {
                console.log(`Card ${cardData.id} already seeded, skipping...`);
                continue;
              }

              const [newCard] = await tx
                .insert(cards)
                .values({
                  scope: 'event',
                  type: cardData.type,
                  schemaVersion: 1,
                  title: cardData.title,
                  subtitle: cardData.subtitle,
                  summary: null,
                  content: {
                    description: cardData.description,
                    size: cardData.size,
                  },
                  imageMediaId: null,
                  videoMediaId: null,
                  iconName: null,
                  size: cardData.size,
                  publishStatus: 'published',
                  publishedAt: new Date(),
                  publishedBy: null,
                  scheduledPublishAt: null,
                  reviewedBy: null,
                  reviewedAt: null,
                  reviewNotes: null,
                  isActive: true,
                  metadata: {
                    seedId: cardData.id,
                    laneKey: laneConfig.laneKey,
                    seededAt: new Date().toISOString(),
                  },
                  createdBy: null,
                })
                .returning();

              if (lane) {
                await tx.insert(cardAssignments).values({
                  cardId: newCard.id,
                  parentType: 'event_lane',
                  parentId: lane.id,
                  order: i,
                  visibilityStartAt: null,
                  visibilityEndAt: null,
                  status: 'active',
                });
              }

              seededCount++;
              console.log(`  ✓ Seeded ${cardData.type} card: ${cardData.title}`);
            } catch (error: any) {
              const errorMsg = `Failed to seed card ${cardData.id}: ${error.message}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          }
        } catch (error: any) {
          const errorMsg = `Failed to process ${laneConfig.laneKey} lane: ${error.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
    });

    console.log(`✓ Successfully seeded ${seededCount} event cards`);
    
    if (errors.length > 0) {
      console.warn(`Seeding completed with ${errors.length} errors:`);
      errors.forEach(err => console.warn(`  - ${err}`));
    }

    return { success: true, seededCount };
  } catch (error: any) {
    const errorMsg = `Seeding failed: ${error.message}`;
    console.error(errorMsg);
    return { success: false, seededCount, error: errorMsg };
  }
}
