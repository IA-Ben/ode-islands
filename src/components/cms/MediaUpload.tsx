'use client';

import React, { useState, useCallback } from 'react';

interface UploadFile {
  id: string;
  file: File;
  title: string;
  altText: string;
  tags: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface MediaUploadProps {
  onUploadComplete: () => void;
  csrfToken: string;
}

export function MediaUpload({ onUploadComplete, csrfToken }: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFilesToQueue(files);
  };

  const addFilesToQueue = (files: File[]) => {
    const newFiles: UploadFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      altText: '',
      tags: '',
      status: 'pending',
      progress: 0,
    }));

    setUploadQueue((prev) => [...prev, ...newFiles]);
  };

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setUploadQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (id: string) => {
    setUploadQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = useCallback(async (uploadFile: UploadFile) => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('title', uploadFile.title);
    formData.append('altText', uploadFile.altText);
    formData.append('tags', uploadFile.tags);

    updateFile(uploadFile.id, { status: 'uploading', progress: 0 });

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          updateFile(uploadFile.id, { progress });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateFile(uploadFile.id, { status: 'completed', progress: 100 });
          setTimeout(() => removeFile(uploadFile.id), 2000);
          onUploadComplete();
        } else {
          let errorMessage = 'Upload failed';
          try {
            const error = JSON.parse(xhr.responseText);
            errorMessage = error.message || error.error || errorMessage;
          } catch (e) {
            errorMessage = xhr.responseText || errorMessage;
          }
          updateFile(uploadFile.id, { status: 'error', error: errorMessage });
        }
      });

      xhr.addEventListener('error', () => {
        updateFile(uploadFile.id, { status: 'error', error: 'Network error during upload' });
      });

      xhr.open('POST', '/api/cms/media');
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      xhr.send(formData);
    } catch (error: any) {
      updateFile(uploadFile.id, { status: 'error', error: error.message || 'Upload failed' });
    }
  }, [csrfToken, onUploadComplete]);

  const uploadAll = () => {
    uploadQueue
      .filter((f) => f.status === 'pending')
      .forEach((file) => uploadFile(file));
  };

  const clearCompleted = () => {
    setUploadQueue((prev) => prev.filter((f) => f.status !== 'completed' && f.status !== 'error'));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const pendingCount = uploadQueue.filter((f) => f.status === 'pending').length;
  const uploadingCount = uploadQueue.filter((f) => f.status === 'uploading').length;

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-lg text-gray-700 mb-2">Drag and drop files here</p>
        <p className="text-sm text-gray-500 mb-4">or</p>
        <label className="cursor-pointer">
          <span className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Browse Files
          </span>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />
        </label>
        <p className="text-xs text-gray-500 mt-4">
          Supported: Images, Videos, Audio, Documents
        </p>
      </div>

      {uploadQueue.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              Upload Queue ({uploadQueue.length})
            </h3>
            <div className="flex items-center space-x-2">
              {pendingCount > 0 && (
                <button
                  onClick={uploadAll}
                  disabled={uploadingCount > 0}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Upload All ({pendingCount})
                </button>
              )}
              <button
                onClick={clearCompleted}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
              >
                Clear Completed
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {uploadQueue.map((uploadFile) => (
              <div key={uploadFile.id} className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {uploadFile.file.name}
                        </p>
                        <span className="text-sm text-gray-500">
                          {formatFileSize(uploadFile.file.size)}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(uploadFile.id)}
                        disabled={uploadFile.status === 'uploading'}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                        aria-label="Remove file"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {uploadFile.status === 'pending' && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <input
                          type="text"
                          value={uploadFile.title}
                          onChange={(e) => updateFile(uploadFile.id, { title: e.target.value })}
                          placeholder="Title"
                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          value={uploadFile.altText}
                          onChange={(e) => updateFile(uploadFile.id, { altText: e.target.value })}
                          placeholder="Alt text"
                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          value={uploadFile.tags}
                          onChange={(e) => updateFile(uploadFile.id, { tags: e.target.value })}
                          placeholder="Tags (comma-separated)"
                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    )}

                    {uploadFile.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Uploading...</span>
                          <span className="font-medium text-gray-900">{uploadFile.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadFile.status === 'completed' && (
                      <div className="flex items-center text-green-600 text-sm mt-2">
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Upload complete
                      </div>
                    )}

                    {uploadFile.status === 'error' && (
                      <div className="flex items-center text-red-600 text-sm mt-2">
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {uploadFile.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
