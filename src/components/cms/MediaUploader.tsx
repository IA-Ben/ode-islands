'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UploadStatus {
  videoId: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export function MediaUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pollStatus = useCallback(async (videoId: string) => {
    try {
      const response = await fetch(`/api/cms/media/upload?videoId=${videoId}`);
      
      if (!response.ok) {
        console.error('Status check failed:', response.status);
        
        // Treat non-200 as terminal error
        let errorMessage = 'Failed to check processing status';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Use default message if JSON parse fails
        }
        
        setUploadStatus(prev => ({
          ...prev!,
          status: 'error',
          error: errorMessage
        }));
        return;
      }
      
      const data = await response.json();
      
      // Handle all possible status states from backend
      if (data.status === 'completed') {
        setUploadStatus(prev => ({
          ...prev!,
          status: 'completed',
          progress: 100
        }));
      } else if (data.status === 'error' || data.status === 'failed') {
        setUploadStatus(prev => ({
          ...prev!,
          status: 'error',
          error: data.error || 'Processing failed'
        }));
      } else if (data.status === 'processing') {
        setUploadStatus(prev => ({
          ...prev!,
          status: 'processing',
          progress: data.percentage || prev!.progress
        }));
        
        // Continue polling
        setTimeout(() => pollStatus(videoId), 2000);
      } else if (data.status === 'uploaded') {
        // Still waiting for processing to start
        setUploadStatus(prev => ({
          ...prev!,
          status: 'processing',
          progress: 0
        }));
        
        setTimeout(() => pollStatus(videoId), 2000);
      } else {
        // Unknown status - treat as processing and keep polling
        console.warn('Unknown status:', data.status);
        setTimeout(() => pollStatus(videoId), 2000);
      }
    } catch (error) {
      console.error('Status poll error:', error);
      setUploadStatus(prev => ({
        ...prev!,
        status: 'error',
        error: 'Failed to check processing status'
      }));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus(null);
    }
  };

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
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Client-side validation before upload
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (selectedFile.size > maxSize) {
      setUploadStatus({
        videoId: '',
        fileName: selectedFile.name,
        status: 'error',
        progress: 0,
        error: `File too large. Maximum size is ${(maxSize / (1024 * 1024 * 1024))}GB`
      });
      return;
    }

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setUploadStatus({
        videoId: '',
        fileName: selectedFile.name,
        status: 'error',
        progress: 0,
        error: `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploadStatus({
      videoId: '',
      fileName: selectedFile.name,
      status: 'uploading',
      progress: 0
    });

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadStatus(prev => ({
            ...prev!,
            progress
          }));
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          
          setUploadStatus({
            videoId: response.videoId,
            fileName: response.fileName || selectedFile.name,
            status: 'processing',
            progress: 0
          });
          
          // Start polling for status updates
          pollStatus(response.videoId);
        } else {
          let errorMessage = 'Upload failed';
          try {
            const error = JSON.parse(xhr.responseText);
            errorMessage = error.error || error.details || errorMessage;
          } catch (e) {
            errorMessage = xhr.responseText || errorMessage;
          }
          
          setUploadStatus(prev => ({
            ...prev!,
            status: 'error',
            error: errorMessage
          }));
        }
      });

      xhr.addEventListener('error', () => {
        setUploadStatus(prev => ({
          ...prev!,
          status: 'error',
          error: 'Network error during upload'
        }));
      });

      xhr.open('POST', '/api/cms/media/upload');
      xhr.send(formData);

    } catch (error: any) {
      setUploadStatus(prev => ({
        ...prev!,
        status: 'error',
        error: error.message || 'Upload failed'
      }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadStatus(null);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
          <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Media Uploader
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selectedFile && !uploadStatus && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
              isDragging
                ? 'border-blue-400 bg-blue-400/10 scale-105'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
            }`}
          >
            <svg
              className="mx-auto h-16 w-16 text-slate-400 mb-4"
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
            <p className="text-lg text-slate-300 mb-2">Drag and drop your video here</p>
            <p className="text-sm text-slate-400 mb-4">or</p>
            <label className="cursor-pointer">
              <span className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-block">
                Browse Files
              </span>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <p className="text-xs text-slate-500 mt-4">
              Supported formats: MP4, MOV, AVI, WebM (Max 2GB)
            </p>
          </div>
        )}

        {selectedFile && !uploadStatus && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button
                  onClick={resetUpload}
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>

            <Button
              onClick={handleUpload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 text-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload & Transcode
            </Button>
          </div>
        )}

        {uploadStatus && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                {uploadStatus.status === 'uploading' && (
                  <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                {uploadStatus.status === 'processing' && (
                  <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                {uploadStatus.status === 'completed' && (
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {uploadStatus.status === 'error' && (
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="flex-1">
                  <p className="text-white font-medium">{uploadStatus.fileName}</p>
                  <p className="text-sm text-slate-400">
                    {uploadStatus.status === 'uploading' && 'Uploading...'}
                    {uploadStatus.status === 'processing' && 'Transcoding video...'}
                    {uploadStatus.status === 'completed' && 'Processing complete!'}
                    {uploadStatus.status === 'error' && `Error: ${uploadStatus.error}`}
                  </p>
                </div>
              </div>

              {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-white font-medium">{uploadStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        uploadStatus.status === 'uploading' ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${uploadStatus.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {uploadStatus.status === 'completed' && uploadStatus.videoId && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-sm text-green-400 font-mono break-all">
                    Video ID: {uploadStatus.videoId}
                  </p>
                </div>
              )}
            </div>

            {(uploadStatus.status === 'completed' || uploadStatus.status === 'error') && (
              <Button
                onClick={resetUpload}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white"
              >
                Upload Another Video
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
