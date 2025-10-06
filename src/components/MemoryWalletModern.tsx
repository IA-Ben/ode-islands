"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Lock, Star, Sparkles, TrendingUp, X } from 'lucide-react';
import { surfaces, borders, spacing, typography, components, colors, focus, pills, interactive, shadows } from '@/lib/admin/designTokens';
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
      router.push(`/memory-wallet/${memory.id}`);
    } else {
      setSelectedLockedMemory(memory);
    }
  };

  const closeLockedModal = () => {
    setSelectedLockedMemory(null);
  };

  const filteredMemories = walletData?.items.filter(memory => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!memory.title.toLowerCase().includes(query)) {
        return false;
      }
    }

    if (filterType !== 'all' && memory.type !== filterType) {
      return false;
    }

    if (filterRarity !== 'all' && memory.rarity !== filterRarity) {
      return false;
    }

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
      <div className={className}>
        <div className={`${components.card} p-8`}>
          <div className="space-y-6">
            <div className={`h-8 ${surfaces.subtleGlass} ${borders.radius.full} w-48 animate-pulse`}></div>
            <div className={`h-24 ${surfaces.subtleGlass} ${borders.radius.xl} animate-pulse`}></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(18)].map((_, i) => (
                <div key={i} className={`aspect-square ${surfaces.subtleGlass} ${borders.radius.xl} animate-pulse`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className={`${components.card} p-8 text-center`}>
          <p className={`${colors.error} mb-4`}>{error}</p>
          <button
            onClick={fetchWalletData}
            className={`${components.buttonPrimary} ${focus.ring}`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!walletData || walletData.items.length === 0) {
    return (
      <div className={className}>
        <div className={`${components.card} p-12 text-center`}>
          <div className="text-6xl mb-4">📦</div>
          <h3 className={`${typography.h2} mb-2`}>No memories yet</h3>
          <p className={`${typography.bodyMuted} mb-6`}>
            Start exploring to collect your first memory!
          </p>
          <button
            onClick={() => router.push('/before')}
            className={`${components.buttonPrimary} ${focus.ring}`}
          >
            Start Exploring
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Progress Card */}
        <div className={`${components.card} p-6`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${borders.radius.xl} ${colors.gradients.primary} flex items-center justify-center`}>
                <Sparkles className={`w-6 h-6 ${colors.icon.active}`} />
              </div>
              <div>
                <p className={typography.h4}>Collection Progress</p>
                <p className={typography.bodyMuted}>
                  {walletData.unlockedCount} of {walletData.totalSlots} collected
                </p>
              </div>
            </div>
            <span className={`text-2xl font-bold ${colors.accent.primary}`}>
              {walletData.progress.percentage}%
            </span>
          </div>
          
          <div className={`h-3 ${borders.radius.full} ${surfaces.subtleGlass} overflow-hidden`}>
            <div 
              className={`h-full ${borders.radius.full} ${colors.gradients.primary} transition-all duration-500`}
              style={{ width: `${walletData.progress.percentage}%` }}
            />
          </div>
          
          {walletData.progress.level && (
            <div className="mt-3 flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${colors.success}`} />
              <span className={typography.bodyMuted}>
                Level: <span className={`${colors.icon.active} font-medium capitalize`}>{walletData.progress.level}</span>
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className={`${components.card} p-4`}>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.icon.muted}`} />
              <input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${components.input} w-full pl-12`}
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`${pills.base} ${pills.padding.md} ${surfaces.darkGlass} ${borders.glassBorder} ${colors.icon.active} text-sm ${focus.ring}`}
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
                className={`${pills.base} ${pills.padding.md} ${surfaces.darkGlass} ${borders.glassBorder} ${colors.icon.active} text-sm ${focus.ring}`}
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="legendary">Legendary</option>
              </select>

              <select
                value={filterOwned}
                onChange={(e) => setFilterOwned(e.target.value)}
                className={`${pills.base} ${pills.padding.md} ${surfaces.darkGlass} ${borders.glassBorder} ${colors.icon.active} text-sm ${focus.ring}`}
              >
                <option value="all">All Items</option>
                <option value="owned">Owned</option>
                <option value="locked">Locked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Memory Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMemories.map((memory) => (
            <button
              key={memory.id}
              onClick={() => handleMemoryClick(memory)}
              className={`
                group relative aspect-square ${borders.radius.xl} overflow-hidden ${interactive.hoverSubtle}
                ${memory.owned 
                  ? `${surfaces.darkGlass} ${borders.glassBorder} ${interactive.hover} ${shadows.md} hover:${shadows.glow}` 
                  : `${surfaces.subtleGlass} ${borders.glassBorder}`}
                ${focus.ring}
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
                        className="object-cover transition-transform duration-200 group-hover:scale-110"
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                        loading="lazy"
                      />
                      <div className={`absolute inset-0 ${colors.gradients.darker} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-3xl">
                      {getTypeIcon(memory.type)}
                    </div>
                  )}

                  {/* Info Overlay */}
                  <div className={`absolute inset-x-0 bottom-0 ${colors.gradients.dark} p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200`}>
                    <p className={`${typography.label} truncate mb-1.5`}>
                      {memory.title}
                    </p>
                    <span className={`${components.badge} ${getRarityColor(memory.rarity)}`}>
                      {memory.rarity}
                    </span>
                  </div>

                  {/* Points Badge */}
                  {memory.points && (
                    <div className={`absolute top-2 right-2 ${surfaces.overlayGlass} ${pills.base} ${pills.padding.sm} flex items-center gap-1 ${borders.accentBorder}`}>
                      <Star className={`w-3 h-3 ${colors.warning} fill-current`} />
                      <span className={`${typography.labelMuted} ${colors.icon.active} font-bold`}>{memory.points}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Locked Memory */}
                  <div className="flex flex-col items-center justify-center h-full p-3 space-y-2">
                    <Lock className={`w-8 h-8 ${colors.icon.muted} ${interactive.hoverSubtle} group-hover:opacity-70`} />
                    <span className={`${typography.bodyMuted} group-hover:opacity-70`}>Locked</span>
                    <span className={`${typography.labelMuted} uppercase tracking-wide`}>{memory.type}</span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Locked Memory Modal */}
      {selectedLockedMemory && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${colors.modalOverlay}`}
          onClick={closeLockedModal}
        >
          <div 
            className={`${surfaces.overlayGlass} ${borders.glassBorder} ${borders.radius['2xl']} max-w-md w-full p-6 ${shadows.xl} ${shadows.glow}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`${typography.h3} flex items-center gap-2`}>
                <Lock className={`w-5 h-5 ${colors.accent.primary}`} />
                Locked Memory
              </h3>
              <button
                onClick={closeLockedModal}
                className={`${colors.icon.muted} hover:${colors.icon.active} ${interactive.hoverSubtle} p-1 ${borders.radius.lg} hover:${surfaces.subtleGlass} ${focus.ring}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl mb-4">{getTypeIcon(selectedLockedMemory.type)}</div>
              <h4 className={`${typography.h4} mb-3`}>{selectedLockedMemory.title}</h4>
              <div className="flex items-center justify-center gap-2">
                <span className={`${components.badge} ${getRarityColor(selectedLockedMemory.rarity)}`}>
                  {selectedLockedMemory.rarity}
                </span>
                {selectedLockedMemory.points && (
                  <span className={`${components.badge} ${colors.status.draft} ${borders.accentBorder} flex items-center gap-1`}>
                    <Star className={`w-3 h-3 ${colors.warning} fill-current`} />
                    {selectedLockedMemory.points} pts
                  </span>
                )}
              </div>
            </div>

            <div className={`${surfaces.subtleGlass} ${borders.radius.xl} p-4 mb-6 ${borders.glassBorder}`}>
              <p className={`${typography.body} leading-relaxed`}>
                This memory is locked. Complete the required actions to unlock it and add it to your collection.
              </p>
              {selectedLockedMemory.chapterTitle && (
                <p className={`${typography.bodyMuted} mt-3 pt-3 ${borders.glassBorder} border-t`}>
                  <span className="font-medium">Chapter:</span> {selectedLockedMemory.chapterTitle}
                  {selectedLockedMemory.subChapterTitle && ` • ${selectedLockedMemory.subChapterTitle}`}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  router.push(`/memory-wallet/${selectedLockedMemory.id}`);
                  closeLockedModal();
                }}
                className={`flex-1 ${components.buttonPrimary} ${focus.ring}`}
              >
                View Details
              </button>
              <button
                onClick={closeLockedModal}
                className={`flex-1 ${components.buttonSecondary} ${focus.ring}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
