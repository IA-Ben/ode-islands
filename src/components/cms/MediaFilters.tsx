'use client';

import React, { useState } from 'react';
import { MediaFilters as MediaFiltersType } from '@/hooks/useMedia';

interface MediaFiltersProps {
  filters: MediaFiltersType;
  onFiltersChange: (filters: MediaFiltersType) => void;
  onClear: () => void;
}

export function MediaFilters({ filters, onFiltersChange, onClear }: MediaFiltersProps) {
  const [expanded, setExpanded] = useState(true);

  const fileTypes = [
    { value: '', label: 'All Types' },
    { value: 'image/', label: 'Images' },
    { value: 'video/', label: 'Videos' },
    { value: 'audio/', label: 'Audio' },
    { value: 'application/', label: 'Documents' },
  ];

  const hasActiveFilters = 
    filters.type || 
    filters.tags?.length || 
    filters.uploadedBy || 
    filters.createdFrom || 
    filters.createdTo || 
    filters.search;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium text-gray-900">Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
              placeholder="Search by title or filename..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Type
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {fileTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={filters.tags?.join(', ') || ''}
              onChange={(e) => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                onFiltersChange({ ...filters, tags: tags.length > 0 ? tags : undefined });
              }}
              placeholder="Enter tags separated by commas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={filters.createdFrom || ''}
                onChange={(e) => onFiltersChange({ ...filters, createdFrom: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="From"
              />
              <input
                type="date"
                value={filters.createdTo || ''}
                onChange={(e) => onFiltersChange({ ...filters, createdTo: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="To"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
