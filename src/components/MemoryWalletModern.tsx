"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getWallet, getRarityColor, getTypeIcon } from '@/lib/walletCms';
import type { WalletResponse, MemorySummary } from '@/types/memory';

interface MemoryWalletModernProps {
  className?: string;
  showHeader?: boolean;
  filterBySource?: string;
  filterByEvent?: string;
  filterByChapter?: string;
}

export default function MemoryWalletModern({ 
  className = '',
  showHeader = true,
  filterBySource,
  filterByEvent,
  filterByChapter
}: MemoryWalletModernProps) {
  const router = useRouter();
  const [walletData, setWalletData] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLockedMemory, setSelectedLockedMemory] = useState<MemorySummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterOwned, setFilterOwned] = useState<string>('all');

  useEffect(() => {
    fetchWalletData();
  }, [filterBySource, filterByEvent, filterByChapter]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getWallet();
      if (data) {
        setWalletData(data);
      } else {
        setError('Failed to fetch memory wallet');
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError('Failed to fetch memory wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleMemoryClick = (memory: MemorySummary) => {
    if (memory.owned) {
      // Navigate to detail page for owned memories
      router.push(`/memory-wallet/${memory.id}`);
    } else {
      // Show unlock modal for locked memories
      setSelectedLockedMemory(memory);
    }
  };

  const closeLockedModal = () => {
    setSelectedLockedMemory(null);
  };

  // Filter memories based on search and filter criteria
  const filteredMemories = walletData?.items.filter(memory => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!memory.title.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Type filter
    if (filterType !== 'all' && memory.type !== filterType) {
      return false;
    }

    // Rarity filter
    if (filterRarity !== 'all' && memory.rarity !== filterRarity) {
      return false;
    }

    // Owned filter
    if (filterOwned === 'owned' && !memory.owned) {
      return false;
    }
    if (filterOwned === 'locked' && memory.owned) {
      return false;
    }

    return true;
  }) || [];

  if (loading) {
    return (
      <div className={`memory-wallet-modern ${className}`}>
        {showHeader && (
          <div className="mb-6">
            <div className="h-8 bg-gray-800 rounded w-48 mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-800 rounded w-64 mb-6 animate-pulse"></div>
          </div>
        )}
        
        {/* Progress Skeleton */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <div className="h-4 bg-gray-700 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-2 bg-gray-700 rounded-full animate-pulse"></div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`memory-wallet-modern ${className}`}>
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <Button 
            onClick={fetchWalletData}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!walletData || walletData.items.length === 0) {
    return (
      <div className={`memory-wallet-modern ${className}`}>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-white mb-2">No memories yet</h3>
          <p className="text-white/60 mb-6">Start exploring to collect your first memory!</p>
          <Button
            onClick={() => router.push('/before')}
            className="bg-white text-black hover:bg-gray-200"
          >
            Start Exploring
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`memory-wallet-modern ${className}`}>
      {showHeader && (
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Memory Wallet</h2>
          <p className="text-white/60">Your collection from The Ode Islands journey</p>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold">
            {walletData.unlockedCount} of {walletData.totalSlots} collected
          </span>
          <span className="text-green-500 font-bold">
            {walletData.progress.percentage}%
          </span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${walletData.progress.percentage}%` }}
          />
        </div>
        {walletData.progress.level && (
          <div className="mt-2 text-sm text-white/60">
            Level: <span className="text-white capitalize">{walletData.progress.level}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
          >
            <option value="all">All Types</option>
            <option value="stamp">Stamps</option>
            <option value="sticker">Stickers</option>
            <option value="photo">Photos</option>
            <option value="ar">AR Items</option>
          </select>

          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="legendary">Legendary</option>
          </select>

          <select
            value={filterOwned}
            onChange={(e) => setFilterOwned(e.target.value)}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
          >
            <option value="all">All Items</option>
            <option value="owned">Owned</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </div>

      {/* Memory Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredMemories.map((memory) => (
          <button
            key={memory.id}
            onClick={() => handleMemoryClick(memory)}
            className={`
              relative aspect-square rounded-lg overflow-hidden transition-all duration-200
              ${memory.owned 
                ? 'bg-gray-900 hover:scale-105 hover:shadow-xl cursor-pointer ring-2 ring-transparent hover:ring-green-500' 
                : 'bg-gray-800 hover:bg-gray-700 cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-green-500
              min-h-[44px]
            `}
          >
            {memory.owned ? (
              <>
                {/* Owned Memory */}
                {memory.thumbnailUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={memory.thumbnailUrl}
                      alt={`${memory.type} memory: ${memory.title}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-3xl">
                    {getTypeIcon(memory.type)}
                  </div>
                )}

                {/* Overlay Info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate mb-1">
                    {memory.title}
                  </p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${getRarityColor(memory.rarity)}`}>
                    {memory.rarity}
                  </span>
                </div>

                {/* Points Badge */}
                {memory.points && (
                  <div className="absolute top-2 right-2 bg-black/70 rounded-full px-2 py-1 flex items-center gap-1">
                    <span className="text-yellow-500 text-xs">⭐</span>
                    <span className="text-white text-xs font-bold">{memory.points}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Locked Memory */}
                <div className="flex flex-col items-center justify-center h-full p-2">
                  <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-gray-500 text-xs font-medium">Locked</span>
                  <span className="text-gray-600 text-[10px] mt-1">{memory.type}</span>
                </div>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Locked Memory Modal */}
      {selectedLockedMemory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={closeLockedModal}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Locked Memory</h3>
              <button
                onClick={closeLockedModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="text-4xl mb-3">{getTypeIcon(selectedLockedMemory.type)}</div>
              <h4 className="text-lg font-semibold text-white mb-2">{selectedLockedMemory.title}</h4>
              <div className="flex items-center justify-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getRarityColor(selectedLockedMemory.rarity)}`}>
                  {selectedLockedMemory.rarity}
                </span>
                {selectedLockedMemory.points && (
                  <span className="text-yellow-500 text-sm flex items-center gap-1">
                    <span>⭐</span>
                    {selectedLockedMemory.points} pts
                  </span>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <p className="text-white/80 text-sm">
                This memory is locked. Complete the required actions to unlock it and add it to your collection.
              </p>
              {selectedLockedMemory.chapterTitle && (
                <p className="text-white/60 text-xs mt-2">
                  Chapter: {selectedLockedMemory.chapterTitle}
                  {selectedLockedMemory.subChapterTitle && ` • ${selectedLockedMemory.subChapterTitle}`}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  router.push(`/memory-wallet/${selectedLockedMemory.id}`);
                  closeLockedModal();
                }}
                className="flex-1 bg-white text-black hover:bg-gray-200"
              >
                View Details
              </Button>
              <Button
                onClick={closeLockedModal}
                className="flex-1 bg-gray-700 text-white hover:bg-gray-600"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}