'use client';

import React from 'react';
import { FileText, Image, ChevronLeft, ChevronRight } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'chapter' | 'card';
  title: string;
  summary?: string;
  highlight?: string;
  eventId?: string;
  hasAR: boolean;
  depth?: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResultsProps {
  results: SearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  sort: string;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (sort: string) => void;
  onResultClick: (result: SearchResult) => void;
}

export default function SearchResults({
  results,
  totalCount,
  page,
  pageSize,
  sort,
  loading = false,
  onPageChange,
  onSortChange,
  onResultClick
}: SearchResultsProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Searching...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {startIndex}-{endIndex} of {totalCount} results
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.id}
            onClick={() => onResultClick(result)}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {result.type === 'chapter' ? (
                  <FileText className="w-5 h-5 text-blue-600" />
                ) : (
                  <Image className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{result.title}</h4>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    result.type === 'chapter' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {result.type === 'chapter' ? 'Chapter' : 'Story Card'}
                  </span>
                  {result.hasAR && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                      AR
                    </span>
                  )}
                  {result.depth !== undefined && (
                    <span className="text-xs text-gray-500">
                      Depth {result.depth}
                    </span>
                  )}
                </div>
                {result.highlight && (
                  <p 
                    className="text-sm text-gray-600 line-clamp-2 mb-2"
                    dangerouslySetInnerHTML={{ __html: result.highlight }}
                  />
                )}
                {!result.highlight && result.summary && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {result.summary}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>Updated {new Date(result.updatedAt).toLocaleDateString()}</span>
                  <span>Created {new Date(result.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 rounded-lg ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
