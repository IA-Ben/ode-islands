"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import MemoryCard from './MemoryCard';
import MemoryUploadModal from './MemoryUploadModal';
import MemoryDetailModal from './MemoryDetailModal';
import { Button } from '@/components/ui/button';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

export interface Memory {
  id: string;
  eventId?: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: string;
  tags?: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  authorName?: string;
  authorAvatar?: string;
}

interface EventMemoriesGalleryProps {
  eventId?: string;
  showUploadButton?: boolean;
  showPrivateMemories?: boolean;
  className?: string;
}

export default function EventMemoriesGallery({ 
  eventId, 
  showUploadButton = true, 
  showPrivateMemories = false,
  className = ""
}: EventMemoriesGalleryProps) {
  const { theme } = useTheme();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchMemories();
  }, [eventId, showPrivateMemories]);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (eventId) params.append('eventId', eventId);
      if (!showPrivateMemories) params.append('isPublic', 'true');
      params.append('limit', '50');

      const response = await fetch(`/api/memories?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const processedMemories = data.memories.map((memory: any) => ({
          ...memory,
          tags: typeof memory.tags === 'string' ? JSON.parse(memory.tags || '[]') : memory.tags || []
        }));
        setMemories(processedMemories);
      } else {
        setError(data.message || 'Failed to fetch memories');
      }
    } catch (err) {
      console.error('Fetch memories error:', err);
      setError('Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const handleMemoryUploaded = () => {
    setShowUploadModal(false);
    fetchMemories();
  };

  const handleMemoryDeleted = (memoryId: string) => {
    setMemories(prev => prev.filter(m => m.id !== memoryId));
    setSelectedMemory(null);
  };

  const filteredMemories = memories.filter(memory => {
    if (filterType !== 'all' && memory.mediaType !== filterType) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        memory.title.toLowerCase().includes(query) ||
        memory.description?.toLowerCase().includes(query) ||
        memory.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="flex items-center space-x-3 text-white/60">
          <div className="w-6 h-6 border-2 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading memories...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="text-center text-white/60 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg mb-2">Failed to load memories</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={fetchMemories}
          className={components.buttonSecondary}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 ${surfaces.subtleGlass} border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400`}
            />
          </div>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className={`px-4 py-2 ${surfaces.subtleGlass} border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400`}
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
        </select>

        <div className={`flex ${surfaces.subtleGlass} border border-slate-700/50 rounded-lg overflow-hidden`}>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 text-sm transition-colors ${viewMode === 'grid' ? 'bg-fuchsia-600 text-white' : 'text-white/60 hover:text-white/80 hover:bg-white/5'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-sm transition-colors ${viewMode === 'list' ? 'bg-fuchsia-600 text-white' : 'text-white/60 hover:text-white/80 hover:bg-white/5'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>

        {showUploadButton && (
          <button
            onClick={() => setShowUploadModal(true)}
            className={components.buttonPrimary}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Memory
          </button>
        )}
      </div>

      {filteredMemories.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-white/40 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-white/60 mb-2">No memories found</h3>
          <p className="text-white/40 mb-6">
            {searchQuery || filterType !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Be the first to share a memorable moment'}
          </p>
          {showUploadButton && !searchQuery && filterType === 'all' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className={components.buttonSecondary}
            >
              Share Your First Memory
            </button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              viewMode={viewMode}
              onClick={() => setSelectedMemory(memory)}
              onDeleted={handleMemoryDeleted}
            />
          ))}
        </div>
      )}

      {showUploadModal && (
        <MemoryUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploaded={handleMemoryUploaded}
          eventId={eventId}
        />
      )}

      {selectedMemory && (
        <MemoryDetailModal
          memory={selectedMemory}
          isOpen={!!selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onDeleted={handleMemoryDeleted}
        />
      )}
    </div>
  );
}
