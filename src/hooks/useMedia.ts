import { useState, useCallback, useEffect } from 'react';

export interface MediaItem {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  description?: string;
  tags: string[];
  uploadedBy: string;
  uploaderName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFilters {
  type?: string;
  tags?: string[];
  uploadedBy?: string;
  createdFrom?: string;
  createdTo?: string;
  search?: string;
}

export interface MediaPagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export interface MediaListResponse {
  items: MediaItem[];
  pagination: MediaPagination;
}

export interface MediaUsage {
  chapters: Array<{ id: string; title: string }>;
  cards: Array<{ id: string; chapterId: string; title: string }>;
  totalUsages: number;
}

export function useMedia(csrfToken: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listMedia = useCallback(async (
    filters: MediaFilters = {},
    pagination: { page: number; pageSize: number } = { page: 1, pageSize: 20 }
  ): Promise<MediaListResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());
      
      if (filters.type) params.append('type', filters.type);
      if (filters.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
      if (filters.search) params.append('search', filters.search);
      if (filters.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters.createdFrom) params.append('createdFrom', filters.createdFrom);
      if (filters.createdTo) params.append('createdTo', filters.createdTo);

      const response = await fetch(`/api/cms/media?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch media');
      }
      
      return await response.json();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch media');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMedia = useCallback(async (id: string): Promise<MediaItem> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/cms/media/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch media');
      }
      
      return await response.json();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch media');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMedia = useCallback(async (id: string, updates: Partial<MediaItem>): Promise<MediaItem> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/cms/media/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update media');
      }
      
      return await response.json();
    } catch (err: any) {
      setError(err.message || 'Failed to update media');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [csrfToken]);

  const deleteMedia = useCallback(async (id: string, force: boolean = false): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `/api/cms/media/${id}${force ? '?force=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete media');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete media');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [csrfToken]);

  const bulkDelete = useCallback(async (ids: string[], force: boolean = false): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/cms/media/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ ids, force }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete media');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to bulk delete media');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [csrfToken]);

  const getUsage = useCallback(async (id: string): Promise<MediaUsage> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/cms/media/${id}/usage`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch media usage');
      }
      
      return await response.json();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch media usage');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    listMedia,
    getMedia,
    updateMedia,
    deleteMedia,
    bulkDelete,
    getUsage,
  };
}
