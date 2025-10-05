'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useVersioning, type Version } from '@/hooks/useVersioning';
import { format } from 'date-fns';

interface RestoreVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  version: Version | null;
  contentType: string;
  contentId: string;
}

export default function RestoreVersionModal({
  isOpen,
  onClose,
  onSuccess,
  version,
  contentType,
  contentId,
}: RestoreVersionModalProps) {
  const { restoreVersion, loading, error } = useVersioning();
  const [description, setDescription] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  if (!isOpen || !version) return null;

  const handleRestore = async () => {
    setRestoreError(null);
    setRestoreSuccess(false);

    const success = await restoreVersion(
      contentType,
      contentId,
      version.versionNumber,
      description || `Restored to version ${version.versionNumber}`
    );

    if (success) {
      setRestoreSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } else {
      setRestoreError(error || 'Failed to restore version');
    }
  };

  const handleClose = () => {
    setDescription('');
    setRestoreError(null);
    setRestoreSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Restore Version</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {restoreSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-800 text-sm font-medium">Version restored successfully!</p>
              </div>
            </div>
          )}

          {restoreError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{restoreError}</p>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-yellow-800 text-sm font-medium mb-1">Warning</p>
                <p className="text-yellow-700 text-sm">
                  This will restore the content to version {version.versionNumber}. 
                  The current version will be saved in history.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Version Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-medium text-gray-900">{version.versionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created by:</span>
                <span className="font-medium text-gray-900">{version.createdBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created at:</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              {version.changeDescription && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-600 block mb-1">Description:</span>
                  <p className="text-gray-900 italic">{version.changeDescription}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restore Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md h-20"
              placeholder={`Restored to version ${version.versionNumber}`}
              disabled={loading || restoreSuccess}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading || restoreSuccess}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            disabled={loading || restoreSuccess}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Restoring...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Restore Version
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
