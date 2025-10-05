'use client';

import React, { useState, useEffect } from 'react';
import { useVersioning, type VersionComparison } from '@/hooks/useVersioning';
import { format } from 'date-fns';

interface VersionComparisonViewProps {
  contentType: string;
  contentId: string;
  version1: number;
  version2: number;
  onClose: () => void;
}

export default function VersionComparisonView({
  contentType,
  contentId,
  version1,
  version2,
  onClose,
}: VersionComparisonViewProps) {
  const { compareVersions, loading, error } = useVersioning();
  const [comparison, setComparison] = useState<VersionComparison | null>(null);

  useEffect(() => {
    loadComparison();
  }, [contentType, contentId, version1, version2]);

  const loadComparison = async () => {
    const result = await compareVersions(contentType, contentId, version1, version2);
    setComparison(result);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '(empty)';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (loading && !comparison) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Comparing versions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Version Comparison</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Version {comparison.version1.versionNumber}</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>By: {comparison.version1.createdBy}</div>
                <div>{format(new Date(comparison.version1.createdAt), 'MMM d, yyyy h:mm a')}</div>
                <div className="italic">{comparison.version1.changeDescription || 'No description'}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Version {comparison.version2.versionNumber}</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>By: {comparison.version2.createdBy}</div>
                <div>{format(new Date(comparison.version2.createdAt), 'MMM d, yyyy h:mm a')}</div>
                <div className="italic">{comparison.version2.changeDescription || 'No description'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {comparison.differences.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">No differences found between these versions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comparison.differences.map((diff, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-900">{diff.field}</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-4 bg-red-50">
                      <div className="text-xs font-medium text-red-700 mb-2 uppercase">Old Value</div>
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                        {formatValue(diff.oldValue)}
                      </pre>
                    </div>
                    <div className="p-4 bg-green-50">
                      <div className="text-xs font-medium text-green-700 mb-2 uppercase">New Value</div>
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                        {formatValue(diff.newValue)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
