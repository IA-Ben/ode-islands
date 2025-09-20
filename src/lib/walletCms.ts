// CMS Wallet API Fetchers

import type { 
  WalletResponse, 
  MemoryDetail, 
  WalletSuccessResponse,
  MemoryDetailSuccessResponse,
  ErrorResponse
} from '@/types/memory';

// Get wallet data (all collectibles with owned status)
export async function getWallet(): Promise<WalletResponse | null> {
  try {
    const response = await fetch('/api/cms/wallet', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch wallet:', response.statusText);
      return null;
    }

    const data: WalletSuccessResponse | ErrorResponse = await response.json();
    
    if (!data.success) {
      console.error('Wallet fetch error:', (data as ErrorResponse).message);
      return null;
    }

    return (data as WalletSuccessResponse).data;
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return null;
  }
}

// Get specific memory details
export async function getMemory(id: string): Promise<{ memory: MemoryDetail; isLocked: boolean } | null> {
  try {
    const response = await fetch(`/api/cms/memory/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch memory:', response.statusText);
      return null;
    }

    const data: (MemoryDetailSuccessResponse & { isLocked?: boolean }) | ErrorResponse = await response.json();
    
    if (!data.success) {
      console.error('Memory fetch error:', (data as ErrorResponse).message);
      return null;
    }

    return {
      memory: (data as MemoryDetailSuccessResponse).data,
      isLocked: data.isLocked || false
    };
  } catch (error) {
    console.error('Error fetching memory:', error);
    return null;
  }
}

// Share memory using Web Share API
export async function shareMemory(memory: MemoryDetail): Promise<boolean> {
  const shareData = {
    title: memory.title,
    text: `Check out my ${memory.type} from The Ode Islands: ${memory.title}`,
    url: window.location.origin + memory.shareUrl,
  };

  // Check if Web Share API is available
  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      // User cancelled or error occurred
      console.log('Share cancelled or failed:', error);
      return false;
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      const shareText = `${shareData.text}\n${shareData.url}`;
      await navigator.clipboard.writeText(shareText);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }
}

// Helper to format collection date
export function formatCollectedDate(isoDate: string | null): string {
  if (!isoDate) return 'Not collected yet';
  
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Helper to get rarity color
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary':
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
    case 'rare':
      return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    case 'common':
    default:
      return 'bg-gray-200 text-gray-700';
  }
}

// Helper to get rarity text color
export function getRarityTextColor(rarity: string): string {
  switch (rarity) {
    case 'legendary':
      return 'text-purple-500';
    case 'rare':
      return 'text-blue-500';
    case 'common':
    default:
      return 'text-gray-500';
  }
}

// Helper to get type icon
export function getTypeIcon(type: string): string {
  switch (type) {
    case 'stamp':
      return '🎯';
    case 'sticker':
      return '✨';
    case 'photo':
      return '📷';
    case 'ar':
      return '🔮';
    default:
      return '💎';
  }
}