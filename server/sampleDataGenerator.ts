import { eq, and } from 'drizzle-orm';
import { db } from './db';
import {
  liveEvents,
  polls,
  pollResponses,
  qaSessions,
  liveChatMessages,
  eventMemories,
  userMemoryWallet,
  collectibleDefinitions,
  userCollectibles,
  interactiveChoices,
  choiceResponses,
  communitySettings,
  merchCollections,
  merchProducts,
  upcomingEvents,
  messageTemplates,
  users
} from '../shared/schema';

interface SampleDataSummary {
  totalItems: number;
  events: number;
  polls: number;
  qaQuestions: number;
  chatMessages: number;
  memories: number;
  collectibles: number;
  interactiveChoices: number;
  community: number;
  merchandise: number;
}

// Sample data marker to ensure we only operate on demo data
const SAMPLE_MARKER = 'ode-islands-demo';

export async function generateSampleEventData(adminUserId: string): Promise<SampleDataSummary> {
  console.log('Starting comprehensive sample data generation...');
  
  // Check if sample data already exists to prevent duplicates
  const existingSampleEvents = await db
    .select()
    .from(liveEvents)
    .where(eq(liveEvents.title, "The Ode Islands: Immersive Journey"));
    
  if (existingSampleEvents.length > 0) {
    throw new Error('Sample data already exists. Please remove existing sample data first.');
  }

  let summary: SampleDataSummary = {
    totalItems: 0,
    events: 0,
    polls: 0,
    qaQuestions: 0,
    chatMessages: 0,
    memories: 0,
    collectibles: 0,
    interactiveChoices: 0,
    community: 0,
    merchandise: 0
  };

  // Use a database transaction for data consistency
  return await db.transaction(async (tx) => {
    // 1. Create a comprehensive live event with sample marker
    const eventData = {
      title: "The Ode Islands: Immersive Journey",
      description: "Experience the complete three-phase event companion with immersive storytelling, live interactions, and post-event community features. [DEMO DATA]",
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 6), // 6 hours from now
      isActive: true,
      venueName: "Digital Experience Theater",
      venueAddress: "Interactive Virtual Space, Cloud District",
      venueLatitude: 40.7128,
      venueLongitude: -74.0060,
      venueDetails: {
        capacity: 500,
        doorsOpen: "18:00",
        mainShow: "19:30",
        afterParty: "22:00",
        accessibility: "Full virtual accessibility support",
        parking: "Digital space - no physical parking needed",
        sampleMarker: SAMPLE_MARKER
      },
      settings: {
        allowChat: true,
        allowPolls: true,
        allowQA: true,
        moderationEnabled: true,
        recordingEnabled: false
      },
      createdBy: adminUserId
    };

    const [event] = await tx.insert(liveEvents).values([eventData]).returning();
    summary.events = 1;
    console.log('Created sample event:', event.id);

    // 2. Create interactive polls for the event
    const pollsData = [
      {
        eventId: event.id,
        question: "Which phase of The Ode Islands experience excites you most?",
        options: [
          { id: "before", text: "Before: Immersive Storytelling", emoji: "📖" },
          { id: "event", text: "Event: Live Interactive Features", emoji: "🎭" },
          { id: "after", text: "After: Community & Memories", emoji: "🌟" }
        ],
        pollType: "poll",
        status: "live",
        allowMultiple: false,
        showResults: true,
        createdBy: adminUserId
      },
      {
        eventId: event.id,
        question: "What type of content do you prefer in immersive experiences?",
        options: [
          { id: "video", text: "Video storytelling", emoji: "🎬" },
          { id: "ar", text: "Augmented reality", emoji: "📱" },
          { id: "interactive", text: "Interactive choices", emoji: "🎯" },
          { id: "community", text: "Community features", emoji: "👥" }
        ],
        pollType: "poll",
        status: "live",
        allowMultiple: true,
        showResults: true,
        createdBy: adminUserId
      },
      {
        eventId: event.id,
        question: "Test your knowledge: What brings balance to the Ode Islands?",
        options: [
          { id: "harmony", text: "Harmony between Orns and Nors", emoji: "⚖️" },
          { id: "magic", text: "Pure magical energy", emoji: "✨" },
          { id: "technology", text: "Advanced technology", emoji: "🔧" }
        ],
        pollType: "quiz",
        correctAnswer: "harmony",
        explanation: "The story tells us that balance comes from harmony between the positive Orns and negative Nors.",
        points: 10,
        showFeedback: true,
        status: "live",
        createdBy: adminUserId
      }
    ];

    const createdPolls = await tx.insert(polls).values(pollsData).returning();
    summary.polls = createdPolls.length;

    // Create some sample poll responses
    for (const poll of createdPolls) {
      const options = poll.options as any[];
      const responseData = {
        pollId: poll.id,
        userId: adminUserId,
        selectedOption: Array.isArray(options) && options.length > 0 ? options[0].id : 'option1',
        isCorrect: poll.pollType === 'quiz' ? poll.correctAnswer === (options?.[0]?.id || null) : null
      };
      await tx.insert(pollResponses).values(responseData);
    }

    // 3. Create Q&A sessions
    const qaData = [
      {
        eventId: event.id,
        question: "Will there be opportunities to collect digital memories during the experience?",
        askedBy: adminUserId,
        answeredBy: adminUserId,
        answer: "Absolutely! The Memory Wallet feature automatically collects moments from your journey, and you can also manually save special experiences.",
        isModerated: true,
        isAnswered: true,
        upvotes: 15,
        answeredAt: new Date()
      },
      {
        eventId: event.id,
        question: "How does the collectible system work in the app?",
        askedBy: adminUserId,
        answeredBy: adminUserId,
        answer: "Collectibles are unlocked through various actions like completing chapters, participating in polls, and attending events. Each has unique artwork and fits into your personal collection grid.",
        isModerated: true,
        isAnswered: true,
        upvotes: 12,
        answeredAt: new Date()
      },
      {
        eventId: event.id,
        question: "Can I share my experience with friends after the event?",
        askedBy: adminUserId,
        upvotes: 8,
        isModerated: false,
        isAnswered: false
      }
    ];

    const createdQA = await tx.insert(qaSessions).values(qaData).returning();
    summary.qaQuestions = createdQA.length;

    // 4. Create live chat messages
    const chatData = [
      {
        eventId: event.id,
        userId: adminUserId,
        message: "Welcome to The Ode Islands experience! 🌟",
        messageType: "text"
      },
      {
        eventId: event.id,
        userId: adminUserId,
        message: "The storytelling in Chapter 1 was absolutely beautiful! 📖✨",
        messageType: "text"
      },
      {
        eventId: event.id,
        userId: adminUserId,
        message: "❤️",
        messageType: "reaction"
      },
      {
        eventId: event.id,
        userId: adminUserId,
        message: "Looking forward to the AR experiences in the next phase! 📱",
        messageType: "text"
      },
      {
        eventId: event.id,
        userId: adminUserId,
        message: "Event phase starting now! Please check your interactive polls.",
        messageType: "system"
      }
    ];

    const createdChat = await tx.insert(liveChatMessages).values(chatData).returning();
    summary.chatMessages = createdChat.length;

    // 5. Create event memories
    const memoriesData = [
      {
        eventId: event.id,
        title: "First Steps into The Ode Islands",
        description: "The moment when the immersive journey began and the story unfolded",
        mediaType: "image",
        tags: ["milestone", "beginning", "story"],
        isPublic: true,
        createdBy: adminUserId
      },
      {
        eventId: event.id,
        title: "Interactive Poll Participation",
        description: "Engaging with the community through live polling features",
        mediaType: "achievement",
        tags: ["interaction", "community", "engagement"],
        isPublic: true,
        createdBy: adminUserId
      },
      {
        eventId: event.id,
        title: "Q&A Session Highlights",
        description: "Meaningful conversations and insights shared during the live Q&A",
        mediaType: "text",
        tags: ["learning", "community", "insights"],
        isPublic: true,
        createdBy: adminUserId
      }
    ];

    const createdMemories = await tx.insert(eventMemories).values(memoriesData).returning();
    summary.memories = createdMemories.length;

    // 6. Create memory wallet entries
    const walletData = [
      {
        userId: adminUserId,
        title: "Journey Begins Badge",
        description: "Commemorating the start of your Ode Islands adventure",
        mediaType: "achievement",
        sourceType: "event",
        sourceId: event.id,
        eventId: event.id,
        collectionTrigger: "auto",
        memoryCategory: "milestone",
        emotionalTone: "exciting",
        isFavorite: true
      },
      {
        userId: adminUserId,
        title: "First Poll Response",
        description: "Your first interaction with the community polling system",
        mediaType: "achievement",
        sourceType: "poll",
        sourceId: createdPolls[0]?.id,
        eventId: event.id,
        collectionTrigger: "auto",
        memoryCategory: "interaction",
        emotionalTone: "positive"
      },
      {
        userId: adminUserId,
        title: "Storytelling Chapter Memory",
        description: "A beautiful moment from the immersive story experience",
        mediaType: "image",
        sourceType: "chapter",
        sourceId: "chapter-1",
        eventId: event.id,
        collectionTrigger: "manual",
        memoryCategory: "learning",
        emotionalTone: "reflective",
        userNotes: "The moment when the girl washed ashore and brought hope to the island"
      }
    ];

    const createdWalletItems = await tx.insert(userMemoryWallet).values(walletData).returning();
    summary.memories += createdWalletItems.length;

    // 7. Create collectible definitions
    const collectiblesData = [
      {
        eventId: event.id,
        name: "Island Explorer",
        description: "Awarded for beginning your journey through The Ode Islands",
        type: "story_card",
        shape: "circle",
        gridPosition: 1,
        gridRow: 1,
        gridColumn: 1,
        primaryColor: "#3b82f6",
        accentColor: "#1d4ed8",
        unlockTrigger: "event_attend",
        unlockConditions: { eventId: event.id },
        rarity: "common",
        caption: "Every great journey begins with a single step"
      },
      {
        eventId: event.id,
        name: "Community Connector",
        description: "Unlocked by participating in live polls and Q&A",
        type: "show_activation",
        shape: "hexagon",
        gridPosition: 2,
        gridRow: 1,
        gridColumn: 2,
        primaryColor: "#10b981",
        accentColor: "#047857",
        unlockTrigger: "poll_answer",
        unlockConditions: { minimumPolls: 2 },
        rarity: "rare",
        caption: "Connection creates community"
      },
      {
        eventId: event.id,
        name: "Story Keeper",
        description: "Special collectible for engaging deeply with the narrative",
        type: "chapter_stamp",
        shape: "rectangle",
        gridPosition: 3,
        gridRow: 1,
        gridColumn: 3,
        primaryColor: "#8b5cf6",
        accentColor: "#7c3aed",
        unlockTrigger: "chapter_complete",
        unlockConditions: { chapterId: "chapter-1" },
        isBonus: true,
        bonusType: "holographic",
        rarity: "epic",
        caption: "Stories live forever in the hearts of those who cherish them"
      }
    ];

    const createdCollectibles = await tx.insert(collectibleDefinitions).values(collectiblesData).returning();
    summary.collectibles = createdCollectibles.length;

    // Create user collectible unlocks
    for (const collectible of createdCollectibles) {
      await tx.insert(userCollectibles).values({
        userId: adminUserId,
        collectibleId: collectible.id,
        isUnlocked: true,
        unlockedAt: new Date(),
        unlockContext: { trigger: "sample_data_generation" }
      });
    }

    // 8. Create interactive choices
    const choicesData = [
      {
        eventId: event.id,
        title: "Choose Your Island Adventure Path",
        description: "Select how you want to experience The Ode Islands journey",
        choiceType: "multi_choice",
        choices: [
          { id: "explorer", text: "Island Explorer", description: "Discover hidden secrets", icon: "🗺️" },
          { id: "storyteller", text: "Story Keeper", description: "Focus on narrative depth", icon: "📚" },
          { id: "connector", text: "Community Builder", description: "Engage with others", icon: "🤝" }
        ],
        maxSelections: 1,
        visualizationType: "pie_chart",
        showLiveResults: true,
        status: "active",
        createdBy: adminUserId
      },
      {
        eventId: event.id,
        title: "Rate Your Experience Elements",
        description: "Help us understand what resonates most with our community",
        choiceType: "ranking",
        choices: [
          { id: "visuals", text: "Visual Storytelling", description: "Video and imagery" },
          { id: "interaction", text: "Interactive Features", description: "Polls, Q&A, choices" },
          { id: "community", text: "Community Connection", description: "Chat and social features" },
          { id: "collection", text: "Memory Collection", description: "Wallet and collectibles" }
        ],
        visualizationType: "bar_chart",
        showLiveResults: true,
        status: "active",
        createdBy: adminUserId
      }
    ];

    const createdChoices = await tx.insert(interactiveChoices).values(choicesData).returning();
    summary.interactiveChoices = createdChoices.length;

    // Create sample choice responses
    for (const choice of createdChoices) {
      const choices = choice.choices as any[];
      if (choices && Array.isArray(choices) && choices.length > 0) {
        await tx.insert(choiceResponses).values({
          choiceId: choice.id,
          userId: adminUserId,
          selectedChoices: [choices[0].id],
          confidence: 8
        });
      }
    }

    // 9. Create community settings
    const communityData = {
      eventId: event.id,
      newsletter: {
        provider: "mailchimp",
        listId: "sample_list_001",
        title: "Stay Connected with The Ode Islands",
        description: "Get updates on new chapters, events, and community highlights",
        enabled: true
      },
      discord: {
        serverName: "The Ode Islands Community",
        inviteUrl: "https://discord.gg/odeislands",
        description: "Join fellow travelers in discussing the journey and sharing experiences",
        memberCount: 1247,
        enabled: true
      },
      moderation: {
        autoModeration: true,
        allowedWords: ["journey", "story", "community", "experience"],
        reportingEnabled: true
      },
      socialLinks: {
        twitter: "https://twitter.com/odeislands",
        instagram: "https://instagram.com/odeislands",
        website: "https://odeislands.com"
      }
    };

    await tx.insert(communitySettings).values(communityData);
    summary.community = 1;

    // 10. Create merchandise collections
    const merchCollectionData = {
      eventId: event.id,
      title: "Commemorative Journey Collection",
      description: "Exclusive items to remember your Ode Islands experience",
      displayOrder: 1,
      isVisible: true
    };

    const [merchCollection] = await tx.insert(merchCollections).values(merchCollectionData).returning();

    const merchProductsData = [
      {
        collectionId: merchCollection.id,
        title: "Limited Edition Journey Pin",
        description: "A beautiful enamel pin featuring the iconic Ode Islands artwork",
        stripePriceId: "price_sample_pin_001",
        badge: "Limited Edition",
        displayOrder: 1,
        isVisible: true
      },
      {
        collectionId: merchCollection.id,
        title: "Memory Keeper Art Print",
        description: "High-quality print of your personalized journey map and achievements",
        stripePriceId: "price_sample_print_001",
        displayOrder: 2,
        isVisible: true
      },
      {
        collectionId: merchCollection.id,
        title: "Digital Collectible Pack",
        description: "Exclusive digital collectibles for your Memory Wallet",
        stripePriceId: "price_sample_digital_001",
        badge: "Digital",
        displayOrder: 3,
        isVisible: true
      }
    ];

    const createdProducts = await tx.insert(merchProducts).values(merchProductsData).returning();
    summary.merchandise = createdProducts.length + 1; // +1 for collection

    // 11. Create upcoming events
    const upcomingEventData = {
      eventId: event.id,
      title: "Chapter 2: The Deeper Journey",
      description: "Continue your adventure with new stories and enhanced interactive features",
      eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1 week from now
      link: "/before/chapter-2",
      isVisible: true,
      displayOrder: 1
    };

    await tx.insert(upcomingEvents).values(upcomingEventData);

    // 12. Create message templates
    const messageTemplateData = {
      name: "Journey Completion Celebration",
      description: "Personalized message celebrating user's completed Ode Islands experience",
      templateType: "video",
      baseContent: {
        headline: "Congratulations on completing your journey!",
        subtitle: "Your adventure through The Ode Islands has been remarkable",
        videoUrl: "celebration-template.mp4",
        duration: 30
      },
      customizableParams: {
        userName: { type: "text", required: true },
        completionDate: { type: "date", required: true },
        achievementCount: { type: "number", required: false },
        favoriteMemory: { type: "text", required: false }
      },
      isActive: true
    };

    await tx.insert(messageTemplates).values(messageTemplateData);

    // Calculate total items
    summary.totalItems = summary.events + summary.polls + summary.qaQuestions + 
                         summary.chatMessages + summary.memories + summary.collectibles + 
                         summary.interactiveChoices + summary.community + summary.merchandise;

    console.log('Sample data generation completed successfully:', summary);
    return summary;
  }); // End transaction

  } catch (error) {
    console.error('Error generating sample data:', error);
    throw new Error(`Failed to generate sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function removeSampleEventData(): Promise<{ removedItems: number }> {
  console.log('Starting sample data removal...');
  
  // Use a database transaction for safe removal
  return await db.transaction(async (tx) => {
    // Find all sample events by exact title match to prevent removing real data
    const sampleEvents = await tx
      .select()
      .from(liveEvents)
      .where(eq(liveEvents.title, "The Ode Islands: Immersive Journey"));

    let removedItems = 0;

    for (const event of sampleEvents) {
      // Remove all data associated with this event
      const eventId = event.id;

      // Remove message templates
      const deletedTemplates = await tx.delete(messageTemplates).where(eq(messageTemplates.name, "Journey Completion Celebration")).returning();
      removedItems += deletedTemplates.length;

      // Remove upcoming events
      const deletedUpcoming = await tx.delete(upcomingEvents).where(eq(upcomingEvents.eventId, eventId)).returning();
      removedItems += deletedUpcoming.length;

      // Remove merchandise
      const merchCollectionsList = await tx.select().from(merchCollections).where(eq(merchCollections.eventId, eventId));
      for (const collection of merchCollectionsList) {
        const deletedProducts = await tx.delete(merchProducts).where(eq(merchProducts.collectionId, collection.id)).returning();
        removedItems += deletedProducts.length;
      }
      const deletedCollections = await tx.delete(merchCollections).where(eq(merchCollections.eventId, eventId)).returning();
      removedItems += deletedCollections.length;

      // Remove community settings
      await tx.delete(communitySettings).where(eq(communitySettings.eventId, eventId));
      removedItems++;

      // Remove choice responses
      const choicesList = await tx.select().from(interactiveChoices).where(eq(interactiveChoices.eventId, eventId));
      for (const choice of choicesList) {
        const deletedResponses = await tx.delete(choiceResponses).where(eq(choiceResponses.choiceId, choice.id)).returning();
        removedItems += deletedResponses.length;
      }

      // Remove interactive choices
      const deletedChoices = await tx.delete(interactiveChoices).where(eq(interactiveChoices.eventId, eventId)).returning();
      removedItems += deletedChoices.length;

      // Remove user collectibles
      const collectiblesList = await tx.select().from(collectibleDefinitions).where(eq(collectibleDefinitions.eventId, eventId));
      for (const collectible of collectiblesList) {
        const deletedUserCollectibles = await tx.delete(userCollectibles).where(eq(userCollectibles.collectibleId, collectible.id)).returning();
        removedItems += deletedUserCollectibles.length;
      }

      // Remove collectible definitions
      const deletedCollectibleDefs = await tx.delete(collectibleDefinitions).where(eq(collectibleDefinitions.eventId, eventId)).returning();
      removedItems += deletedCollectibleDefs.length;

      // Remove memory wallet items
      const deletedWalletItems = await tx.delete(userMemoryWallet).where(eq(userMemoryWallet.eventId, eventId)).returning();
      removedItems += deletedWalletItems.length;

      // Remove event memories
      const deletedMemories = await tx.delete(eventMemories).where(eq(eventMemories.eventId, eventId)).returning();
      removedItems += deletedMemories.length;

      // Remove live chat messages
      const deletedChatMessages = await tx.delete(liveChatMessages).where(eq(liveChatMessages.eventId, eventId)).returning();
      removedItems += deletedChatMessages.length;

      // Remove Q&A sessions
      const deletedQA = await tx.delete(qaSessions).where(eq(qaSessions.eventId, eventId)).returning();
      removedItems += deletedQA.length;

      // Remove poll responses
      const pollsList = await tx.select().from(polls).where(eq(polls.eventId, eventId));
      for (const poll of pollsList) {
        const deletedPollResponses = await tx.delete(pollResponses).where(eq(pollResponses.pollId, poll.id)).returning();
        removedItems += deletedPollResponses.length;
      }

      // Remove polls
      const deletedPolls = await tx.delete(polls).where(eq(polls.eventId, eventId)).returning();
      removedItems += deletedPolls.length;

      // Finally, remove the event itself
      await tx.delete(liveEvents).where(eq(liveEvents.id, eventId));
      removedItems++;
    }

    console.log(`Sample data removal completed. Removed ${removedItems} items.`);
    return { removedItems };
  }); // End transaction
}