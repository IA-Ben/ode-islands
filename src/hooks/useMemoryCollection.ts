'use client';

import { useState, useCallback } from 'react';
import { getCsrfToken } from '../lib/csrfUtils';

interface CollectMemoryParams {
  sourceType: 'card' | 'chapter' | 'event';
  sourceId: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  sourceMetadata?: Record<string, any>;
  collectionContext?: Record<string, any>;
}

interface UseMemoryCollectionReturn {
  isCollecting: boolean;
  isCollected: boolean;
  collectMemory: (params: CollectMemoryParams) => Promise<boolean>;
  checkExistingMemory: (params: Pick<CollectMemoryParams, 'sourceType' | 'sourceId'>) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

export const useMemoryCollection = (): UseMemoryCollectionReturn => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedSources, setCheckedSources] = useState<Set<string>>(new Set());

  const collectMemory = useCallback(async (params: CollectMemoryParams): Promise<boolean> => {
    try {
      setIsCollecting(true);
      setError(null);

      // Get CSRF token
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        throw new Error('CSRF token not available. Please refresh the page and try again.');
      }

      const response = await fetch('/api/memory-wallet/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to collect memory';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Handle duplicate memory collection more gracefully
        if (response.status === 409) {
          setIsCollected(true);
          return true; // Treat as success since memory is already collected
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        setIsCollected(true);
        return true;
      } else {
        throw new Error(result.message || 'Failed to collect memory');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to collect memory';
      setError(errorMessage);
      console.error('Memory collection error:', errorMessage);
      return false;
    } finally {
      setIsCollecting(false);
    }
  }, []);

  const checkExistingMemory = useCallback(async (params: Pick<CollectMemoryParams, 'sourceType' | 'sourceId'>): Promise<boolean> => {
    try {
      const sourceKey = `${params.sourceType}-${params.sourceId}`;
      
      // Don't check the same source multiple times
      if (checkedSources.has(sourceKey)) {
        return isCollected;
      }

      const searchParams = new URLSearchParams({
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      });

      const response = await fetch(`/api/memory-wallet/collect?${searchParams}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && !result.canCollect) {
          setIsCollected(true);
          setCheckedSources(prev => new Set(prev).add(sourceKey));
          return true;
        }
      }
      
      setCheckedSources(prev => new Set(prev).add(sourceKey));
      return false;
    } catch (error) {
      console.warn('Failed to check existing memory:', error);
      return false;
    }
  }, [checkedSources, isCollected]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isCollecting,
    isCollected,
    collectMemory,
    checkExistingMemory,
    error,
    clearError,
  };
};