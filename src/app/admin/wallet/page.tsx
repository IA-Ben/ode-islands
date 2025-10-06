'use client';

import { useState, useEffect } from 'react';
import { Wallet, Search, Filter, Award, Trash2, Heart, Calendar, Tag, User } from 'lucide-react';
import { surfaces, borders, spacing, typography, components, colors, focus, pills, interactive } from '@/lib/admin/designTokens';

interface WalletMemory {
  id: string;
  userId: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: string;
  thumbnail?: string;
  sourceType: string;
  sourceId?: string;
  eventId?: string;
  chapterId?: string;
  collectedAt: string;
  isFavorite: boolean;
  tags?: string[];
  memoryCategory?: string;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function WalletPage() {
  const [memories, setMemories] = useState<WalletMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFavorite, setFilterFavorite] = useState<string>('all');

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/memory-wallet?limit=100', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.memories) {
          setMemories(data.memories);
        }
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemories = memories.filter(memory => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = memory.title.toLowerCase().includes(query);
      const matchesUser = memory.user?.email.toLowerCase().includes(query) ||
        memory.user?.firstName?.toLowerCase().includes(query) ||
        memory.user?.lastName?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesUser) return false;
    }

    if (filterType !== 'all' && memory.sourceType !== filterType) {
      return false;
    }

    if (filterFavorite === 'favorites' && !memory.isFavorite) {
      return false;
    }

    return true;
  });

  const getSourceTypeBadge = (type: string) => {
    const badges = {
      card: `${components.badge} ${colors.status.scheduled}`,
      chapter: `${components.badge} ${colors.status.purple}`,
      event: `${components.badge} ${colors.status.live}`,
      manual: `${components.badge} ${colors.status.orange}`,
    };
    return badges[type as keyof typeof badges] || `${components.badge} ${colors.status.archived}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={colors.pageBg}>
      {/* Header */}
      <div className={`${surfaces.darkGlass} ${borders.glassBorder} border-b sticky top-0 z-10`}>
        <div className={`${spacing.container.xl} mx-auto px-6 py-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${borders.radius.xl} ${colors.gradients.primary} flex items-center justify-center`}>
              <Wallet className={`w-6 h-6 ${colors.icon.active}`} />
            </div>
            <div>
              <h1 className={typography.h1}>Memory Wallet</h1>
              <p className={typography.bodyMuted}>Manage user collected memories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`${surfaces.darkGlass} ${borders.glassBorder} border-b sticky top-[73px] z-10`}>
        <div className={`${spacing.container.xl} mx-auto px-6 py-4`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.icon.muted}`} />
              <input
                type="text"
                placeholder="Search memories or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${components.input} w-full pl-10`}
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`${components.input} min-w-[160px]`}
            >
              <option value="all">All Types</option>
              <option value="card">Card</option>
              <option value="chapter">Chapter</option>
              <option value="event">Event</option>
              <option value="manual">Manual</option>
            </select>

            {/* Favorite Filter */}
            <select
              value={filterFavorite}
              onChange={(e) => setFilterFavorite(e.target.value)}
              className={`${components.input} min-w-[160px]`}
            >
              <option value="all">All Memories</option>
              <option value="favorites">Favorites Only</option>
            </select>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${borders.radius.full} ${colors.accent.bg}`}></div>
              <span className={colors.slate.text}>Total: {filteredMemories.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className={`w-4 h-4 ${colors.error}`} />
              <span className={colors.slate.text}>
                Favorites: {filteredMemories.filter(m => m.isFavorite).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`${spacing.container.xl} mx-auto px-6 py-6`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className={colors.icon.muted}>Loading memories...</div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className={`${components.card} text-center py-20`}>
            <Wallet className={`w-16 h-16 ${colors.icon.muted} mx-auto mb-4`} />
            <h3 className={typography.h3 + ' mb-2'}>No memories found</h3>
            <p className={typography.bodyMuted}>
              {searchQuery || filterType !== 'all' || filterFavorite !== 'all'
                ? 'Try adjusting your filters'
                : 'Users haven\'t collected any memories yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMemories.map((memory) => (
              <div
                key={memory.id}
                className={`${components.card} group ${interactive.hover} ${interactive.active}`}
              >
                {/* Media Preview */}
                {memory.thumbnail || memory.mediaUrl ? (
                  <div className={`relative w-full h-48 mb-4 ${borders.radius.lg} overflow-hidden ${surfaces.subtleGlass}`}>
                    <img
                      src={memory.thumbnail || memory.mediaUrl}
                      alt={memory.title}
                      className="w-full h-full object-cover"
                    />
                    {memory.isFavorite && (
                      <div className="absolute top-2 right-2">
                        <Heart className={`w-5 h-5 ${colors.error} fill-current`} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`w-full h-48 mb-4 ${borders.radius.lg} ${surfaces.subtleGlass} flex items-center justify-center`}>
                    <Wallet className={`w-12 h-12 ${colors.icon.muted}`} />
                  </div>
                )}

                {/* Content */}
                <div className="space-y-3">
                  {/* Title */}
                  <h3 className={`${typography.h4} line-clamp-2`}>
                    {memory.title}
                  </h3>

                  {/* Description */}
                  {memory.description && (
                    <p className={`${typography.bodyMuted} line-clamp-2`}>
                      {memory.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2">
                    {/* Source Type Badge */}
                    <span className={getSourceTypeBadge(memory.sourceType)}>
                      {memory.sourceType}
                    </span>

                    {/* Category */}
                    {memory.memoryCategory && (
                      <span className={`${components.badge} ${surfaces.subtleGlass} ${colors.slate.text}`}>
                        <Tag className="w-3 h-3 inline mr-1" />
                        {memory.memoryCategory}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className={`flex items-center gap-2 pt-2 ${borders.glassBorder} border-t`}>
                    <User className={`w-4 h-4 ${colors.icon.muted}`} />
                    <span className={typography.bodyMuted}>
                      {memory.user?.firstName || memory.user?.lastName
                        ? `${memory.user.firstName || ''} ${memory.user.lastName || ''}`.trim()
                        : memory.user?.email || 'Unknown User'}
                    </span>
                  </div>

                  {/* Date */}
                  <div className={`flex items-center gap-2 ${typography.bodyMuted}`}>
                    <Calendar className="w-3 h-3" />
                    {formatDate(memory.collectedAt)}
                  </div>

                  {/* Tags */}
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {memory.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={`${pills.base} ${pills.padding.sm} ${surfaces.subtleGlass} ${typography.bodyMuted}`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
