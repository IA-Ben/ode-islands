'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VersionHistoryTimeline from './VersionHistoryTimeline';
import VersionComparisonView from './VersionComparisonView';
import RestoreVersionModal from './RestoreVersionModal';
import type { Version } from '@/hooks/useVersioning';

interface AddChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChapterAdded: () => void;
  csrfToken?: string;
  editMode?: boolean;
  chapterId?: string;
  initialData?: {
    title: string;
    summary: string;
    hasAR: boolean;
  };
}

export default function AddChapterModal({ 
  isOpen, 
  onClose, 
  onChapterAdded, 
  csrfToken,
  editMode = false,
  chapterId,
  initialData
}: AddChapterModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    hasAR: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');
  
  // Versioning state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonVersions, setComparisonVersions] = useState<{ v1: number; v2: number } | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<Version | null>(null);
  const [versionHistoryKey, setVersionHistoryKey] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (isOpen && !editMode) {
      setActiveTab('edit');
    }
  }, [isOpen, editMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const url = editMode && chapterId 
        ? `/api/cms/chapters/${chapterId}` 
        : '/api/cms/chapters/create';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editMode ? 'update' : 'create'} chapter`);
      }

      const result = await response.json();
      console.log(`Chapter ${editMode ? 'updated' : 'created'}:`, result);
      
      onChapterAdded();
      
      if (editMode) {
        setVersionHistoryKey(prev => prev + 1);
        setActiveTab('history');
      } else {
        onClose();
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      summary: '',
      hasAR: false
    });
    setError('');
    setActiveTab('edit');
  };

  const handleCompare = (v1: number, v2: number) => {
    setComparisonVersions({ v1, v2 });
    setShowComparison(true);
  };

  const handleRestore = (version: Version) => {
    setVersionToRestore(version);
    setShowRestoreModal(true);
  };

  const handleRestoreSuccess = () => {
    setVersionHistoryKey(prev => prev + 1);
    onChapterAdded();
  };

  const handleClose = () => {
    resetForm();
    setShowComparison(false);
    setComparisonVersions(null);
    setShowRestoreModal(false);
    setVersionToRestore(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <Card className="border-0 shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editMode ? 'Edit Chapter' : 'Add New Chapter'}
                </CardTitle>
                <Button variant="outline" onClick={handleClose}>×</Button>
              </div>
            </CardHeader>

            {editMode && chapterId && (
              <div className="border-b">
                <div className="flex space-x-1 px-6">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'edit'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4 inline-block mr-2 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Chapter
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'history'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4 inline-block mr-2 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Version History
                  </button>
                </div>
              </div>
            )}

            <CardContent className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              {activeTab === 'edit' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Chapter Title</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter chapter title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Summary</label>
                    <textarea
                      required
                      className="w-full p-2 border border-gray-300 rounded-md h-24"
                      value={formData.summary}
                      onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Enter chapter summary or description"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasAR"
                      checked={formData.hasAR}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasAR: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="hasAR" className="text-sm font-medium">
                      This chapter includes AR experiences
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading 
                        ? `${editMode ? 'Updating' : 'Creating'} Chapter...` 
                        : `${editMode ? 'Update' : 'Create'} Chapter`}
                    </Button>
                  </div>
                </form>
              )}

              {activeTab === 'history' && editMode && chapterId && (
                <VersionHistoryTimeline
                  key={versionHistoryKey}
                  contentType="chapter"
                  contentId={chapterId}
                  onCompare={handleCompare}
                  onRestore={handleRestore}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showComparison && comparisonVersions && editMode && chapterId && (
        <VersionComparisonView
          contentType="chapter"
          contentId={chapterId}
          version1={comparisonVersions.v1}
          version2={comparisonVersions.v2}
          onClose={() => {
            setShowComparison(false);
            setComparisonVersions(null);
          }}
        />
      )}

      {showRestoreModal && versionToRestore && editMode && chapterId && (
        <RestoreVersionModal
          isOpen={showRestoreModal}
          onClose={() => {
            setShowRestoreModal(false);
            setVersionToRestore(null);
          }}
          onSuccess={handleRestoreSuccess}
          version={versionToRestore}
          contentType="chapter"
          contentId={chapterId}
        />
      )}
    </>
  );
}
