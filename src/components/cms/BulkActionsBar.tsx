'use client';

import React, { useState } from 'react';

interface BulkActionsBarProps {
  selectedIds: Set<string>;
  totalItems: number;
  onBulkTag: (tags: string[]) => void;
  onBulkDelete: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedIds,
  totalItems,
  onBulkTag,
  onBulkDelete,
  onSelectAll,
  onClearSelection,
}: BulkActionsBarProps) {
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [tagInput, setTagInput] = useState('');

  if (selectedIds.size === 0) {
    return null;
  }

  const handleAddTags = () => {
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      onBulkTag(tags);
      setTagInput('');
      setShowTagEditor(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
        <div className="flex items-center divide-x divide-gray-700">
          <div className="px-4 py-3 bg-blue-600">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">
                {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-4">
            {selectedIds.size < totalItems ? (
              <button
                onClick={onSelectAll}
                className="px-3 py-2 text-sm hover:bg-gray-800 rounded transition-colors"
              >
                Select All ({totalItems})
              </button>
            ) : (
              <button
                onClick={onClearSelection}
                className="px-3 py-2 text-sm hover:bg-gray-800 rounded transition-colors"
              >
                Deselect All
              </button>
            )}

            <button
              onClick={() => setShowTagEditor(!showTagEditor)}
              className="px-3 py-2 text-sm hover:bg-gray-800 rounded transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Add Tags</span>
            </button>

            <button
              onClick={onBulkDelete}
              className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>

            <button
              onClick={onClearSelection}
              className="px-3 py-2 text-sm hover:bg-gray-800 rounded transition-colors"
              aria-label="Clear selection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {showTagEditor && (
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTags()}
                placeholder="Enter tags separated by commas..."
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddTags}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowTagEditor(false);
                  setTagInput('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
