'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMedia, MediaItem, MediaFilters as MediaFiltersType } from '@/hooks/useMedia';
import { MediaBrowser } from './MediaBrowser';
import { MediaFilters } from './MediaFilters';
import { MediaUpload } from './MediaUpload';
import { MediaDetail } from './MediaDetail';
import { BulkActionsBar } from './BulkActionsBar';

interface MediaLibraryProps {
  csrfToken: string;
}

export function MediaLibrary({ csrfToken }: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<MediaFiltersType>({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const mediaApi = useMedia(csrfToken);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMedia = useCallback(async () => {
    try {
      const result = await mediaApi.listMedia(filters, { page, pageSize });
      setItems(result.items);
      setTotalPages(result.pagination.totalPages);
      setTotalItems(result.pagination.totalItems);
    } catch (error) {
      console.error('Failed to load media:', error);
      showToast('Failed to load media', 'error');
    }
  }, [filters, page, pageSize, mediaApi]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleItemClick = (media: MediaItem) => {
    setSelectedMediaId(media.id);
  };

  const handleUpdateMedia = async (id: string, updates: Partial<MediaItem>) => {
    try {
      await mediaApi.updateMedia(id, updates);
      showToast('Media updated successfully', 'success');
      await loadMedia();
    } catch (error) {
      showToast('Failed to update media', 'error');
      throw error;
    }
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      await mediaApi.deleteMedia(id, false);
      showToast('Media deleted successfully', 'success');
      await loadMedia();
    } catch (error: any) {
      if (error.message.includes('in use')) {
        throw new Error('This media is currently in use and cannot be deleted');
      }
      showToast('Failed to delete media', 'error');
      throw error;
    }
  };

  const handleBulkTag = async (tags: string[]) => {
    if (selectedIds.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          mediaApi.updateMedia(id, {
            tags: [...(items.find((i) => i.id === id)?.tags || []), ...tags],
          })
        )
      );
      showToast(`Added tags to ${selectedIds.size} items`, 'success');
      await loadMedia();
      handleClearSelection();
    } catch (error) {
      showToast('Failed to add tags', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} items? This action cannot be undone.`)) {
      return;
    }

    try {
      await mediaApi.bulkDelete(Array.from(selectedIds), false);
      showToast(`Deleted ${selectedIds.size} items`, 'success');
      await loadMedia();
      handleClearSelection();
    } catch (error: any) {
      if (error.message.includes('in use')) {
        showToast('Some items are in use and cannot be deleted', 'error');
      } else {
        showToast('Failed to delete items', 'error');
      }
    }
  };

  const handleUploadComplete = () => {
    showToast('Upload complete', 'success');
    loadMedia();
    setActiveTab('browse');
  };

  const handleFiltersChange = (newFilters: MediaFiltersType) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && activeTab === 'browse') {
        e.preventDefault();
        handleSelectAll();
      }
      if (e.key === 'Delete' && selectedIds.size > 0 && activeTab === 'browse') {
        e.preventDefault();
        handleBulkDelete();
      }
      if (e.key === 'Escape') {
        if (selectedMediaId) {
          setSelectedMediaId(null);
        } else if (selectedIds.size > 0) {
          handleClearSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedIds, selectedMediaId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
          <p className="text-gray-600 mt-1">Manage your media files, images, videos, and documents</p>
        </div>

        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'browse'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Browse</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload</span>
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <MediaFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClear={handleClearFilters}
            />
          </div>

          <div className="lg:col-span-3">
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
              loading={mediaApi.loading}
            />
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <MediaUpload onUploadComplete={handleUploadComplete} csrfToken={csrfToken} />
      )}

      <BulkActionsBar
        selectedIds={selectedIds}
        totalItems={items.length}
        onBulkTag={handleBulkTag}
        onBulkDelete={handleBulkDelete}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {selectedMediaId && (
        <MediaDetail
          mediaId={selectedMediaId}
          onClose={() => setSelectedMediaId(null)}
          onUpdate={handleUpdateMedia}
          onDelete={handleDeleteMedia}
          getMedia={mediaApi.getMedia}
          getUsage={mediaApi.getUsage}
        />
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
