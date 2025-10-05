'use client';

import React, { useState, useEffect } from 'react';
import { MediaBrowser } from './MediaBrowser';
import { MediaFilters } from './MediaFilters';
import { useMedia, type MediaItem } from '@/hooks/useMedia';

interface MediaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem | MediaItem[]) => void;
  multiple?: boolean;
  filter?: { type?: string };
  csrfToken: string;
}

export function MediaSelectorModal({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  filter,
  csrfToken,
}: MediaSelectorModalProps) {
  const { listMedia } = useMedia(csrfToken);
  
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState({
    type: filter?.type || '',
    search: '',
    tags: [] as string[],
  });

  // Load media
  const loadMedia = async () => {
    setLoading(true);
    try {
      const result = await listMedia(filters, { page, pageSize: 20 });
      setItems(result.items);
      setTotalPages(result.pagination.totalPages);
      setTotalItems(result.pagination.totalItems);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen, page, filters]);

  const handleSelect = (id: string, selected: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    
    if (multiple) {
      if (selected) {
        newSelectedIds.add(id);
      } else {
        newSelectedIds.delete(id);
      }
    } else {
      // Single select mode
      if (selected) {
        newSelectedIds.clear();
        newSelectedIds.add(id);
      } else {
        newSelectedIds.delete(id);
      }
    }
    
    setSelectedIds(newSelectedIds);
  };

  const handleConfirm = () => {
    const selectedMedia = items.filter((item) => selectedIds.has(item.id));
    
    if (multiple) {
      onSelect(selectedMedia);
    } else {
      onSelect(selectedMedia[0] || null);
    }
    
    handleClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setPage(1);
    setFilters({ type: filter?.type || '', search: '', tags: [] });
    onClose();
  };

  const handleItemClick = (media: MediaItem) => {
    // Toggle selection on click
    handleSelect(media.id, !selectedIds.has(media.id));
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({ type: filter?.type || '', search: '', tags: [] });
    setPage(1);
  };

  if (!isOpen) return null;

  const selectedMedia = items.filter((item) => selectedIds.has(item.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Select Media {multiple && `(${selectedIds.size} selected)`}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <MediaFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedMedia.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Selected Media:</h3>
              <div className="space-y-2">
                {selectedMedia.map((media) => (
                  <div key={media.id} className="flex items-center space-x-3">
                    {media.fileType.startsWith('image/') && media.url && (
                      <img
                        src={media.url}
                        alt={media.altText || media.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    {media.fileType.startsWith('video/') && (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{media.title}</p>
                      <p className="text-sm text-gray-500 truncate">{media.fileName}</p>
                    </div>
                    <button
                      onClick={() => handleSelect(media.id, false)}
                      className="text-red-600 hover:text-red-800"
                      aria-label="Remove"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <MediaBrowser
            items={items}
            viewMode={viewMode}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onViewModeChange={setViewMode}
            onItemClick={handleItemClick}
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
            loading={loading}
          />
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {multiple
                ? `${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''} selected`
                : selectedIds.size > 0
                ? '1 item selected'
                : 'No items selected'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Select {selectedIds.size > 0 && `(${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
