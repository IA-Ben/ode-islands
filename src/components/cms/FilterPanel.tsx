'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface FilterPanelProps {
  filters: {
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
  };
  onChange: (filters: any) => void;
  onClearAll: () => void;
}

export default function FilterPanel({ filters, onChange, onClearAll }: FilterPanelProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['contentType']));

  useEffect(() => {
    fetchEvents();
    fetchChapters();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/chapters');
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleContentTypeChange = (type: string, checked: boolean) => {
    const currentTypes = filters.contentTypes || ['chapter', 'card'];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    onChange({ ...filters, contentTypes: newTypes.length > 0 ? newTypes : undefined });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'contentTypes') return value && (value as string[]).length < 2;
    return value !== undefined && value !== '';
  }).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Filters</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Content Type Filter */}
      <div className="border-b border-gray-200 pb-3">
        <button
          onClick={() => toggleSection('contentType')}
          className="w-full flex items-center justify-between text-left font-medium mb-2"
        >
          <span>Content Type</span>
          {expandedSections.has('contentType') ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {expandedSections.has('contentType') && (
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.contentTypes?.includes('chapter') !== false}
                onChange={(e) => handleContentTypeChange('chapter', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Chapters</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.contentTypes?.includes('card') !== false}
                onChange={(e) => handleContentTypeChange('card', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Story Cards</span>
            </label>
          </div>
        )}
      </div>

      {/* Event Filter */}
      <div className="border-b border-gray-200 pb-3">
        <button
          onClick={() => toggleSection('event')}
          className="w-full flex items-center justify-between text-left font-medium mb-2"
        >
          <span>Event</span>
          {expandedSections.has('event') ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {expandedSections.has('event') && (
          <select
            value={filters.eventId || ''}
            onChange={(e) => onChange({ ...filters, eventId: e.target.value || undefined })}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* AR Status Filter */}
      <div className="border-b border-gray-200 pb-3">
        <button
          onClick={() => toggleSection('ar')}
          className="w-full flex items-center justify-between text-left font-medium mb-2"
        >
          <span>AR Status</span>
          {expandedSections.has('ar') ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {expandedSections.has('ar') && (
          <select
            value={filters.hasAR === undefined ? 'all' : filters.hasAR.toString()}
            onChange={(e) => {
              const value = e.target.value === 'all' ? undefined : e.target.value === 'true';
              onChange({ ...filters, hasAR: value });
            }}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="true">With AR</option>
            <option value="false">Without AR</option>
          </select>
        )}
      </div>

      {/* Depth Range Filter */}
      <div className="border-b border-gray-200 pb-3">
        <button
          onClick={() => toggleSection('depth')}
          className="w-full flex items-center justify-between text-left font-medium mb-2"
        >
          <span>Hierarchy Depth</span>
          {expandedSections.has('depth') ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {expandedSections.has('depth') && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="text-sm text-gray-600">Min Depth</label>
              <input
                type="number"
                min="0"
                max="5"
                value={filters.minDepth || ''}
                onChange={(e) => onChange({ ...filters, minDepth: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Max Depth</label>
              <input
                type="number"
                min="0"
                max="5"
                value={filters.maxDepth || ''}
                onChange={(e) => onChange({ ...filters, maxDepth: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Date Range Filters */}
      <div className="border-b border-gray-200 pb-3">
        <button
          onClick={() => toggleSection('dates')}
          className="w-full flex items-center justify-between text-left font-medium mb-2"
        >
          <span>Date Range</span>
          {expandedSections.has('dates') ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {expandedSections.has('dates') && (
          <div className="mt-2 space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Created</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.createdFrom || ''}
                  onChange={(e) => onChange({ ...filters, createdFrom: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.createdTo || ''}
                  onChange={(e) => onChange({ ...filters, createdTo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="To"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Updated</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.updatedFrom || ''}
                  onChange={(e) => onChange({ ...filters, updatedFrom: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.updatedTo || ''}
                  onChange={(e) => onChange({ ...filters, updatedTo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parent Chapter Filter */}
      <div>
        <button
          onClick={() => toggleSection('parent')}
          className="w-full flex items-center justify-between text-left font-medium mb-2"
        >
          <span>Parent Chapter</span>
          {expandedSections.has('parent') ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {expandedSections.has('parent') && (
          <select
            value={filters.parentId || ''}
            onChange={(e) => onChange({ ...filters, parentId: e.target.value || undefined })}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
