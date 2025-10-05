'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useVersioning, type Version } from '@/hooks/useVersioning';
import { format } from 'date-fns';

interface VersionHistoryTimelineProps {
  contentType: string;
  contentId: string;
  onCompare: (v1: number, v2: number) => void;
  onRestore: (version: Version) => void;
}

export default function VersionHistoryTimeline({
  contentType,
  contentId,
  onCompare,
  onRestore,
}: VersionHistoryTimelineProps) {
  const { fetchVersionHistory, loading, error } = useVersioning();
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const versionsPerPage = 10;

  const loadVersionHistory = async () => {
    const history = await fetchVersionHistory(contentType, contentId);
    setVersions(history);
  };

  useEffect(() => {
    loadVersionHistory();
  }, [contentType, contentId]);

  const handleVersionSelect = (versionNumber: number) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionNumber)) {
        return prev.filter((v) => v !== versionNumber);
      }
      if (prev.length >= 2) {
        return [prev[1], versionNumber];
      }
      return [...prev, versionNumber];
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      onCompare(selectedVersions[0], selectedVersions[1]);
    }
  };

  const indexOfLastVersion = currentPage * versionsPerPage;
  const indexOfFirstVersion = indexOfLastVersion - versionsPerPage;
  const currentVersions = versions.slice(indexOfFirstVersion, indexOfLastVersion);
  const totalPages = Math.ceil(versions.length / versionsPerPage);

  if (loading && versions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading version history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500">No version history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedVersions.length === 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-blue-800 font-medium">
              2 versions selected (v{selectedVersions[0]} and v{selectedVersions[1]})
            </span>
          </div>
          <Button onClick={handleCompare} className="bg-blue-600 hover:bg-blue-700 text-white">
            Compare Versions
          </Button>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-4">
          {currentVersions.map((version, index) => {
            const isSelected = selectedVersions.includes(version.versionNumber);
            const isLatest = index === 0 && currentPage === 1;
            
            return (
              <div
                key={version.id}
                className={`relative pl-16 pr-4 py-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="absolute left-6 w-4 h-4 rounded-full bg-white border-4 border-blue-600"></div>
                
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        Version {version.versionNumber}
                      </span>
                      {isLatest && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                          Current
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleVersionSelect(version.versionNumber)}
                        className="ml-2 rounded"
                        disabled={!isSelected && selectedVersions.length >= 2}
                      />
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      {version.changeDescription || 'No description provided'}
                    </p>
                    
                    <div className="flex items-center text-xs text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {version.createdBy}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                  
                  {!isLatest && (
                    <Button
                      onClick={() => onRestore(version)}
                      variant="outline"
                      className="ml-4 text-sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            variant="outline"
          >
            Previous
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
