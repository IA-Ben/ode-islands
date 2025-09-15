import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../server/auth';
import { db } from '../../../../../../server/db';
import { 
  afterEventConfig, 
  afterTabs, 
  recapHeroConfig,
  eventMessageSettings,
  messageTemplates,
  communitySettings,
  upcomingEvents,
  merchCollections,
  merchProducts,
  gallerySettings,
  featureFlags
} from '../../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Comprehensive After Experience Configuration Cache
interface AfterExperienceDTO {
  eventId: string;
  config: any;
  tabs: any[];
  recapHero: any;
  messageSettings: any;
  communitySettings: any;
  upcomingEvents: any[];
  merchCollections: any[];
  gallerySettings: any;
  featureFlags: any[];
}

// In-memory cache for After Experience configuration
const configCache = new Map<string, { data: AfterExperienceDTO; timestamp: number }>();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  return withAuth(async (session: any) => {
    try {
      const { eventId } = params;
      
      // Check cache first
      const cached = configCache.get(eventId);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return NextResponse.json({
          success: true,
          config: cached.data
        }, {
          headers: {
            'Cache-Control': 'private, max-age=2592000', // 30 days
            'ETag': `"${cached.timestamp}"`
          }
        });
      }

      // Load all After experience configuration for the event
      const [
        eventConfig,
        tabs,
        heroConfig,
        messageSettings,
        commSettings,
        upcomingEventsData,
        merchData,
        galleryData,
        flagsData
      ] = await Promise.all([
        // Event config
        db.select().from(afterEventConfig)
          .where(and(eq(afterEventConfig.eventId, eventId), eq(afterEventConfig.status, 'published')))
          .limit(1),
        
        // Tabs configuration
        db.select().from(afterTabs)
          .where(eq(afterTabs.eventId, eventId))
          .orderBy(afterTabs.displayOrder),
        
        // Recap hero config
        db.select().from(recapHeroConfig)
          .where(eq(recapHeroConfig.eventId, eventId))
          .limit(1),
        
        // Message settings with template
        db.select({
          settings: eventMessageSettings,
          template: messageTemplates
        })
        .from(eventMessageSettings)
        .leftJoin(messageTemplates, eq(eventMessageSettings.templateId, messageTemplates.id))
        .where(and(eq(eventMessageSettings.eventId, eventId), eq(eventMessageSettings.isEnabled, true)))
        .limit(1),
        
        // Community settings
        db.select().from(communitySettings)
          .where(eq(communitySettings.eventId, eventId))
          .limit(1),
        
        // Upcoming events
        db.select().from(upcomingEvents)
          .where(and(eq(upcomingEvents.eventId, eventId), eq(upcomingEvents.isVisible, true)))
          .orderBy(upcomingEvents.displayOrder, upcomingEvents.eventDate),
        
        // Merchandise collections and products
        db.select({
          collection: merchCollections,
          products: merchProducts
        })
        .from(merchCollections)
        .leftJoin(merchProducts, eq(merchProducts.collectionId, merchCollections.id))
        .where(and(eq(merchCollections.eventId, eventId), eq(merchCollections.isVisible, true)))
        .orderBy(merchCollections.displayOrder),
        
        // Gallery settings
        db.select().from(gallerySettings)
          .where(eq(gallerySettings.eventId, eventId))
          .limit(1),
        
        // Feature flags
        db.select().from(featureFlags)
          .where(eq(featureFlags.eventId, eventId))
      ]);

      // Build comprehensive configuration DTO
      const afterExperienceConfig: AfterExperienceDTO = {
        eventId,
        config: eventConfig[0] || getDefaultEventConfig(eventId),
        tabs: tabs.length > 0 ? tabs : getDefaultTabs(eventId),
        recapHero: heroConfig[0] || getDefaultRecapHeroConfig(),
        messageSettings: messageSettings[0] || null,
        communitySettings: commSettings[0] || getDefaultCommunitySettings(),
        upcomingEvents: upcomingEventsData || [],
        merchCollections: organizeMerchData(merchData),
        gallerySettings: galleryData[0] || getDefaultGallerySettings(),
        featureFlags: flagsData || []
      };

      // Cache the configuration
      configCache.set(eventId, {
        data: afterExperienceConfig,
        timestamp: Date.now()
      });

      return NextResponse.json({
        success: true,
        config: afterExperienceConfig
      }, {
        headers: {
          'Cache-Control': 'private, max-age=2592000', // 30 days
          'ETag': `"${Date.now()}"`
        }
      });

    } catch (error) {
      console.error('After config fetch error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch After experience configuration' },
        { status: 500 }
      );
    }
  })(request);
}

// Default configurations when no CMS data exists
function getDefaultEventConfig(eventId: string) {
  return {
    eventId,
    status: 'published',
    version: 1
  };
}

function getDefaultTabs(eventId: string) {
  return [
    { tabKey: 'message', title: 'Personalized Message', displayOrder: 1, isVisible: true, theme: {} },
    { tabKey: 'wallet', title: 'Memory Wallet', displayOrder: 2, isVisible: true, theme: {} },
    { tabKey: 'gallery', title: 'Community Gallery', displayOrder: 3, isVisible: true, theme: {} },
    { tabKey: 'merch', title: 'Exclusive Merchandise', displayOrder: 4, isVisible: true, theme: {} },
    { tabKey: 'community', title: 'Join the Community', displayOrder: 5, isVisible: true, theme: {} }
  ];
}

function getDefaultRecapHeroConfig() {
  return {
    copy: {
      title: 'Your Journey Complete',
      subtitle: 'Celebrating your experience through The Ode Islands',
      shareText: 'Share your achievement'
    },
    metrics: {
      showChapters: true,
      showMemories: true,
      showProgress: true
    },
    shareImage: {
      theme: 'default',
      backgroundColor: '#1e293b',
      accentColor: '#3b82f6'
    }
  };
}

function getDefaultCommunitySettings() {
  return {
    newsletter: {
      enabled: true,
      title: 'Stay Updated',
      description: 'Get updates on new experiences and exclusive content'
    },
    discord: {
      enabled: true,
      title: 'Discord Community',
      description: 'Chat with other travelers and share your experiences',
      inviteUrl: '#'
    },
    socialLinks: []
  };
}

function getDefaultGallerySettings() {
  return {
    uploadRules: {
      maxItems: 10,
      maxFileSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    moderationMode: 'auto',
    visibilitySettings: {
      defaultPublic: true
    }
  };
}

function organizeMerchData(merchData: any[]) {
  const collections = new Map();
  
  merchData.forEach(row => {
    if (!collections.has(row.collection.id)) {
      collections.set(row.collection.id, {
        ...row.collection,
        products: []
      });
    }
    
    if (row.products) {
      collections.get(row.collection.id).products.push(row.products);
    }
  });
  
  return Array.from(collections.values());
}

// Cache invalidation endpoint for admins
export async function DELETE(request: NextRequest, { params }: { params: { eventId: string } }) {
  return withAuth(async (session: any) => {
    // Check admin permissions
    if (!session.user.isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { eventId } = params;
    configCache.delete(eventId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared for event' 
    });
  })(request);
}