import { useState, useCallback } from 'react';
import { httpClient } from '@/lib/csrfUtils';

export interface Version {
  id: string;
  contentType: string;
  contentId: string;
  versionNumber: number;
  changeDescription: string;
  createdAt: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface VersionComparison {
  version1: Version;
  version2: Version;
  differences: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

interface UseVersioningReturn {
  loading: boolean;
  error: string | null;
  fetchVersionHistory: (contentType: string, contentId: string) => Promise<Version[]>;
  compareVersions: (contentType: string, contentId: string, v1: number, v2: number) => Promise<VersionComparison | null>;
  restoreVersion: (contentType: string, contentId: string, versionNumber: number, description?: string) => Promise<boolean>;
}

export function useVersioning(): UseVersioningReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersionHistory = useCallback(async (contentType: string, contentId: string): Promise<Version[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await httpClient.get<Version[]>(
        `/api/cms/versions/${contentType}/${contentId}`
      );

      if (!response.success) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          window.location.href = '/auth/login';
          return [];
        }
        throw new Error(response.error || 'Failed to fetch version history');
      }

      return response.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch version history';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const compareVersions = useCallback(async (
    contentType: string,
    contentId: string,
    v1: number,
    v2: number
  ): Promise<VersionComparison | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await httpClient.get<VersionComparison>(
        `/api/cms/versions/${contentType}/${contentId}/compare`,
        { v1: v1.toString(), v2: v2.toString() }
      );

      if (!response.success) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          window.location.href = '/auth/login';
          return null;
        }
        throw new Error(response.error || 'Failed to compare versions');
      }

      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare versions';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreVersion = useCallback(async (
    contentType: string,
    contentId: string,
    versionNumber: number,
    description?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await httpClient.post(
        `/api/cms/versions/${contentType}/${contentId}/restore`,
        { versionNumber, description }
      );

      if (!response.success) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          window.location.href = '/auth/login';
          return false;
        }
        throw new Error(response.error || 'Failed to restore version');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore version';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchVersionHistory,
    compareVersions,
    restoreVersion,
  };
}
