import odeIslandsData from '@/app/data/ode-islands.json';

export interface UserProgress {
  id: string;
  userId: string;
  chapterId: string;
  cardIndex: number;
  completedAt: string;
  timeSpent: number | null;
  lastAccessed: string;
}

export interface ChapterInfo {
  id: string;
  title: string;
  totalCards: number;
}

export interface CertificateEligibility {
  type: 'completion' | 'participation' | 'achievement' | 'excellence';
  title: string;
  description: string;
  chapterId?: string;
  eventId?: string;
  requirements: {
    completionPercentage?: number;
    minimumTimeSpent?: number;
    specificChapters?: string[];
    totalProgress?: number;
  };
  isEligible: boolean;
  progress: number; // 0-100
  missingRequirements?: string[];
}

export class CertificateEligibilityChecker {
  private static getChapterData(): ChapterInfo[] {
    return Object.keys(odeIslandsData).map(chapterId => {
      const chapterCards = (odeIslandsData as any)[chapterId] || [];
      const chapterTitles: { [key: string]: string } = {
        'chapter-1': 'The Ode Islands',
        'chapter-2': 'The Ode Island', 
        'chapter-3': 'Welcome to The Ode Islands',
        'chapter-playcanvas': 'PlayCanvas Experiences'
      };
      
      return {
        id: chapterId,
        title: chapterTitles[chapterId] || chapterId,
        totalCards: chapterCards.length
      };
    });
  }

  private static calculateChapterProgress(progress: UserProgress[], chapterId: string): {
    completionPercentage: number;
    completedCards: number;
    totalCards: number;
    totalTimeSpent: number;
  } {
    const chapters = this.getChapterData();
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) {
      return { completionPercentage: 0, completedCards: 0, totalCards: 0, totalTimeSpent: 0 };
    }

    const chapterProgress = progress.filter(p => p.chapterId === chapterId);
    const completedCards = new Set(chapterProgress.map(p => p.cardIndex)).size;
    const totalTimeSpent = chapterProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
    const completionPercentage = Math.round((completedCards / chapter.totalCards) * 100);

    return {
      completionPercentage,
      completedCards,
      totalCards: chapter.totalCards,
      totalTimeSpent
    };
  }

  private static calculateOverallProgress(progress: UserProgress[]): {
    totalCompletionPercentage: number;
    completedChapters: string[];
    totalTimeSpent: number;
    chaptersStarted: number;
  } {
    const chapters = this.getChapterData();
    const completedChapters: string[] = [];
    let totalTimeSpent = 0;
    let totalProgressSum = 0;
    let chaptersStarted = 0;

    chapters.forEach(chapter => {
      const chapterProgress = this.calculateChapterProgress(progress, chapter.id);
      totalProgressSum += chapterProgress.completionPercentage;
      totalTimeSpent += chapterProgress.totalTimeSpent;
      
      if (chapterProgress.completedCards > 0) {
        chaptersStarted++;
      }
      
      if (chapterProgress.completionPercentage === 100) {
        completedChapters.push(chapter.id);
      }
    });

    const totalCompletionPercentage = chapters.length > 0 ? Math.round(totalProgressSum / chapters.length) : 0;

    return {
      totalCompletionPercentage,
      completedChapters,
      totalTimeSpent,
      chaptersStarted
    };
  }

  static checkEligibility(progress: UserProgress[]): CertificateEligibility[] {
    const chapters = this.getChapterData();
    const overallProgress = this.calculateOverallProgress(progress);
    const eligibilities: CertificateEligibility[] = [];

    // Chapter Completion Certificates
    chapters.forEach(chapter => {
      const chapterProgress = this.calculateChapterProgress(progress, chapter.id);
      const isEligible = chapterProgress.completionPercentage === 100;
      const missingRequirements = isEligible ? [] : [
        `Complete all ${chapter.totalCards} cards in ${chapter.title}`
      ];

      eligibilities.push({
        type: 'completion',
        title: `${chapter.title} - Completion Certificate`,
        description: `Certificate of completion for finishing all content in ${chapter.title}`,
        chapterId: chapter.id,
        requirements: {
          completionPercentage: 100
        },
        isEligible,
        progress: chapterProgress.completionPercentage,
        missingRequirements: missingRequirements.length > 0 ? missingRequirements : undefined
      });
    });

    // Journey Participation Certificate (for starting the journey)
    const participationEligible = overallProgress.chaptersStarted > 0;
    eligibilities.push({
      type: 'participation',
      title: 'Ode Islands Journey - Participation Certificate',
      description: 'Certificate recognizing your participation in The Ode Islands experience',
      requirements: {
        totalProgress: 1
      },
      isEligible: participationEligible,
      progress: overallProgress.chaptersStarted > 0 ? 100 : 0,
      missingRequirements: participationEligible ? undefined : ['Start exploring The Ode Islands']
    });

    // Explorer Achievement (50% overall completion)
    const explorerEligible = overallProgress.totalCompletionPercentage >= 50;
    eligibilities.push({
      type: 'achievement',
      title: 'Ode Islands Explorer - Achievement Certificate',
      description: 'Certificate recognizing significant exploration and progress through The Ode Islands',
      requirements: {
        totalProgress: 50
      },
      isEligible: explorerEligible,
      progress: overallProgress.totalCompletionPercentage,
      missingRequirements: explorerEligible ? undefined : [
        `Reach 50% overall completion (currently ${overallProgress.totalCompletionPercentage}%)`
      ]
    });

    // Master Explorer Achievement (75% overall completion)
    const masterEligible = overallProgress.totalCompletionPercentage >= 75;
    eligibilities.push({
      type: 'achievement',
      title: 'Ode Islands Master Explorer - Achievement Certificate',
      description: 'Certificate recognizing mastery and extensive exploration of The Ode Islands',
      requirements: {
        totalProgress: 75
      },
      isEligible: masterEligible,
      progress: overallProgress.totalCompletionPercentage,
      missingRequirements: masterEligible ? undefined : [
        `Reach 75% overall completion (currently ${overallProgress.totalCompletionPercentage}%)`
      ]
    });

    // Journey Excellence Certificate (100% completion)
    const excellenceEligible = overallProgress.totalCompletionPercentage === 100;
    eligibilities.push({
      type: 'excellence',
      title: 'Ode Islands Journey - Excellence Certificate',
      description: 'Certificate of excellence for completing the entire Ode Islands journey',
      requirements: {
        totalProgress: 100,
        specificChapters: chapters.map(c => c.id)
      },
      isEligible: excellenceEligible,
      progress: overallProgress.totalCompletionPercentage,
      missingRequirements: excellenceEligible ? undefined : [
        `Complete all chapters (${overallProgress.completedChapters.length}/${chapters.length} completed)`
      ]
    });

    // Time Dedication Achievement (minimum 30 minutes total)
    const timeThreshold = 30 * 60; // 30 minutes in seconds
    const dedicationEligible = overallProgress.totalTimeSpent >= timeThreshold;
    eligibilities.push({
      type: 'achievement',
      title: 'Dedicated Explorer - Achievement Certificate',
      description: 'Certificate recognizing dedicated time and engagement with The Ode Islands',
      requirements: {
        minimumTimeSpent: timeThreshold
      },
      isEligible: dedicationEligible,
      progress: Math.min(100, Math.round((overallProgress.totalTimeSpent / timeThreshold) * 100)),
      missingRequirements: dedicationEligible ? undefined : [
        `Spend at least 30 minutes exploring (${Math.round(overallProgress.totalTimeSpent / 60)} minutes completed)`
      ]
    });

    return eligibilities;
  }

  static getNewCertificates(
    progress: UserProgress[], 
    existingCertificates: { chapterId?: string; certificateType: string }[]
  ): CertificateEligibility[] {
    const allEligible = this.checkEligibility(progress).filter(cert => cert.isEligible);
    
    return allEligible.filter(eligible => {
      // Check if this certificate already exists
      return !existingCertificates.some(existing => 
        existing.certificateType === eligible.type && 
        existing.chapterId === eligible.chapterId
      );
    });
  }

  static generateCertificateData(eligibility: CertificateEligibility, userId: string) {
    return {
      userId,
      eventId: eligibility.eventId,
      chapterId: eligibility.chapterId,
      certificateType: eligibility.type,
      title: eligibility.title,
      description: eligibility.description
    };
  }

  static formatTimeSpent(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hours ${remainingMinutes} minutes`;
  }

  static getCertificateStats(progress: UserProgress[]) {
    const eligibilities = this.checkEligibility(progress);
    const earned = eligibilities.filter(e => e.isEligible);
    const available = eligibilities.filter(e => !e.isEligible);
    const overallProgress = this.calculateOverallProgress(progress);

    return {
      total: eligibilities.length,
      earned: earned.length,
      available: available.length,
      overallProgress: overallProgress.totalCompletionPercentage,
      timeSpent: this.formatTimeSpent(overallProgress.totalTimeSpent),
      nextCertificate: available
        .sort((a, b) => b.progress - a.progress)[0] // Closest to completion
    };
  }
}