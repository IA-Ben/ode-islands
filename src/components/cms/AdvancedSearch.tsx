'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import SearchResults from './SearchResults';

interface SearchFilters {
  eventId?: string;
  hasAR?: boolean;
  minDepth?: number;
  maxDepth?: number;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  parentId?: string;
  contentTypes?: string[];
}

interface SearchState extends SearchFilters {
  query: string;
  page: number;
  pageSize: number;
  sort: 'relevance' | 'date' | 'title';
}

interface AdvancedSearchProps {
  onResultClick?: (result: any) => void;
}

export default function AdvancedSearch({ onResultClick }: AdvancedSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [searchState, setSearchState] = useState<SearchState>({
    query: searchParams.get('q') || '',
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: 20,
    sort: (searchParams.get('sort') || 'relevance') as 'relevance' | 'date' | 'title',
    contentTypes: searchParams.get('types')?.split(',') || ['chapter', 'card']
  });

  const [results, setResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [facets, setFacets] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchState.query) params.set('q', searchState.query);
    if (searchState.page !== 1) params.set('page', searchState.page.toString());
    if (searchState.sort !== 'relevance') params.set('sort', searchState.sort);
    if (searchState.eventId) params.set('eventId', searchState.eventId);
    if (searchState.hasAR !== undefined) params.set('hasAR', searchState.hasAR.toString());
    if (searchState.minDepth) params.set('minDepth', searchState.minDepth.toString());
    if (searchState.maxDepth) params.set('maxDepth', searchState.maxDepth.toString());
    if (searchState.createdFrom) params.set('createdFrom', searchState.createdFrom);
    if (searchState.createdTo) params.set('createdTo', searchState.createdTo);
    if (searchState.updatedFrom) params.set('updatedFrom', searchState.updatedFrom);
    if (searchState.updatedTo) params.set('updatedTo', searchState.updatedTo);
    if (searchState.parentId) params.set('parentId', searchState.parentId);
    if (searchState.contentTypes && searchState.contentTypes.length < 2) {
      params.set('types', searchState.contentTypes.join(','));
    }
    return params;
  }, [searchState]);

  const performSearch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const params = buildSearchParams();
      const response = await fetch(`/api/cms/search?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      setTotalCount(data.totalCount || 0);
      setFacets(data.facets || null);

      const newParams = buildSearchParams();
      router.push(`?${newParams.toString()}`, { scroll: false });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
        setError('Failed to perform search. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [buildSearchParams, router]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchState.query || Object.keys(searchState).some(key => {
        if (key === 'query' || key === 'page' || key === 'pageSize' || key === 'sort') return false;
        if (key === 'contentTypes') return searchState[key]?.length !== 2;
        return searchState[key as keyof SearchState] !== undefined;
      })) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchState, performSearch]);

  const handleQueryChange = (query: string) => {
    setSearchState(prev => ({ ...prev, query, page: 1 }));
  };

  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchState(prev => ({ ...prev, ...filters, page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchState(prev => ({
      query: prev.query,
      page: 1,
      pageSize: prev.pageSize,
      sort: prev.sort,
      contentTypes: ['chapter', 'card']
    }));
  };

  const handlePageChange = (page: number) => {
    setSearchState(prev => ({ ...prev, page }));
  };

  const handleSortChange = (sort: string) => {
    setSearchState(prev => ({ ...prev, sort: sort as 'relevance' | 'date' | 'title', page: 1 }));
  };

  const handleResultClick = (result: any) => {
    if (onResultClick) {
      onResultClick(result);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <SearchBar
        value={searchState.query}
        onChange={handleQueryChange}
        onSearch={performSearch}
        loading={loading}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Panel */}
        <div className="lg:col-span-1">
          <FilterPanel
            filters={{
              eventId: searchState.eventId,
              hasAR: searchState.hasAR,
              minDepth: searchState.minDepth,
              maxDepth: searchState.maxDepth,
              createdFrom: searchState.createdFrom,
              createdTo: searchState.createdTo,
              updatedFrom: searchState.updatedFrom,
              updatedTo: searchState.updatedTo,
              parentId: searchState.parentId,
              contentTypes: searchState.contentTypes
            }}
            onChange={handleFiltersChange}
            onClearAll={handleClearFilters}
          />
        </div>

        {/* Search Results */}
        <div className="lg:col-span-3">
          <SearchResults
            results={results}
            totalCount={totalCount}
            page={searchState.page}
            pageSize={searchState.pageSize}
            sort={searchState.sort}
            loading={loading}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
            onResultClick={handleResultClick}
          />
        </div>
      </div>
    </div>
  );
}
