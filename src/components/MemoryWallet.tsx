"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import MemoryWalletCard from './MemoryWalletCard';
import MemoryWalletDetailModal from './MemoryWalletDetailModal';
import { Button } from '@/components/ui/button';

export interface WalletMemory {
  id: string;
  userId: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: string;
  thumbnail?: string;
  sourceType: string; // 'card', 'chapter', 'event', 'poll', 'quiz', 'manual'
  sourceId?: string;
  sourceMetadata?: any;
  eventId?: string;
  chapterId?: string;
  cardIndex?: number;
  collectedAt: string;
  collectionTrigger?: string;
  collectionContext?: any;
  userNotes?: string;
  isFavorite: boolean;
  tags?: string[];
  memoryCategory?: string;
  emotionalTone?: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

interface MemoryWalletProps {
  className?: string;
  showHeader?: boolean;
  filterBySource?: string;
  filterByEvent?: string;
  filterByChapter?: string;
}

export default function MemoryWallet({ 
  className = '',
  showHeader = true,
  filterBySource,
  filterByEvent,
  filterByChapter
}: MemoryWalletProps) {
  const { theme } = useTheme();
  const [memories, setMemories] = useState<WalletMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<WalletMemory | null>(null);
  
  // Filters and sorting
  const [sourceFilter, setSourceFilter] = useState<string>(filterBySource || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [favoriteFilter, setFavoriteFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'category' | 'source'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMemories();
  }, [filterBySource, filterByEvent, filterByChapter, sourceFilter, categoryFilter, favoriteFilter]);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterBySource || sourceFilter !== 'all') {
        params.append('sourceType', filterBySource || sourceFilter);
      }
      if (filterByEvent) params.append('eventId', filterByEvent);
      if (filterByChapter) params.append('chapterId', filterByChapter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (favoriteFilter) params.append('isFavorite', 'true');
      params.append('limit', '100');

      const response = await fetch(`/api/memory-wallet?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMemories(data.memories || []);
      } else {
        setError(data.message || 'Failed to fetch memory wallet');
      }
    } catch (err) {
      console.error('Fetch memory wallet error:', err);
      setError('Failed to fetch memory wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleMemoryUpdate = (updatedMemory: WalletMemory) => {
    setMemories(prev => prev.map(memory => 
      memory.id === updatedMemory.id ? updatedMemory : memory
    ));
  };

  const handleMemoryDelete = (memoryId: string) => {
    setMemories(prev => prev.filter(memory => memory.id !== memoryId));
  };

  // Filter and sort memories
  const filteredAndSortedMemories = memories
    .filter(memory => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return memory.title.toLowerCase().includes(query) ||
               memory.description?.toLowerCase().includes(query) ||
               memory.tags?.some(tag => tag.toLowerCase().includes(query));
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime();
        case 'oldest':
          return new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime();
        case 'category':
          return (a.memoryCategory || '').localeCompare(b.memoryCategory || '');
        case 'source':
          return a.sourceType.localeCompare(b.sourceType);
        default:
          return 0;
      }
    });

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'card':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'chapter':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'event':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'poll':
      case 'quiz':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`memory-wallet-loading ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
          <span className="ml-3 text-white/60">Loading your memory wallet...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`memory-wallet-error ${className}`}>
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <Button 
            onClick={fetchMemories}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`memory-wallet ${className}`}>
      {showHeader && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 
              className="text-3xl font-bold"
              style={{ color: theme.colors.secondary }}
            >
              Memory Wallet
            </h2>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </Button>
            </div>
          </div>

          <div className="text-white/60 mb-6">
            Collected memories from your journey through cards, chapters, and events
          </div>

          {/* Filters and Search */}
          <div className="flex flex-wrap gap-4 mb-6">
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
            >
              <option value="all">All Sources</option>
              <option value="card">Cards</option>
              <option value="chapter">Chapters</option>
              <option value="event">Events</option>
              <option value="poll">Polls</option>
              <option value="quiz">Quizzes</option>
              <option value="manual">Manual</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
            >
              <option value="all">All Categories</option>
              <option value="milestone">Milestones</option>
              <option value="learning">Learning</option>
              <option value="interaction">Interactions</option>
              <option value="achievement">Achievements</option>
              <option value="moment">Moments</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="category">By Category</option>
              <option value="source">By Source</option>
            </select>

            <label className="flex items-center gap-2 text-white/60">
              <input
                type="checkbox"
                checked={favoriteFilter}
                onChange={(e) => setFavoriteFilter(e.target.checked)}
                className="rounded border-white/30"
              />
              Favorites Only
            </label>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{memories.length}</div>
              <div className="text-sm text-white/60">Total Memories</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {memories.filter(m => m.isFavorite).length}
              </div>
              <div className="text-sm text-white/60">Favorites</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {new Set(memories.map(m => m.sourceType)).size}
              </div>
              <div className="text-sm text-white/60">Source Types</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {new Set(memories.map(m => m.memoryCategory)).size}
              </div>
              <div className="text-sm text-white/60">Categories</div>
            </div>
          </div>
        </div>
      )}

      {/* Memory Grid/List */}
      {filteredAndSortedMemories.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-white/40 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-white/60 mb-2">No memories found</h3>
          <p className="text-white/40">
            {searchQuery || sourceFilter !== 'all' || categoryFilter !== 'all' || favoriteFilter
              ? 'Try adjusting your filters or search query'
              : 'Start exploring cards, chapters, and events to collect memories'
            }
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {filteredAndSortedMemories.map((memory) => (
            <MemoryWalletCard
              key={memory.id}
              memory={memory}
              viewMode={viewMode}
              onClick={() => setSelectedMemory(memory)}
              onUpdate={handleMemoryUpdate}
              onDelete={handleMemoryDelete}
              getSourceIcon={getSourceIcon}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <MemoryWalletDetailModal
          memory={selectedMemory}
          isOpen={!!selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onUpdate={handleMemoryUpdate}
          onDelete={handleMemoryDelete}
          getSourceIcon={getSourceIcon}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}