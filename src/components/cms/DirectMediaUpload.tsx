'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadVideo, VideoUploadStatus, VideoTranscodingStatus } from '@/utils/videoUpload';

interface DirectMediaUploadProps {
  onUploadComplete: (mediaAssetId: string, mediaUrl: string, mediaType: 'image' | 'video') => void;
  csrfToken: string;
  acceptedTypes?: 'image' | 'video' | 'both';
  className?: string;
}

export function DirectMediaUpload({ 
  onUploadComplete, 
  csrfToken,
  acceptedTypes = 'both',
  className = ''
}: DirectMediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<VideoUploadStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    const fileType = file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : null;

    if (!fileType) {
      setError('Invalid file type. Please upload an image or video.');
      return;
    }

    if (acceptedTypes !== 'both') {
      if (acceptedTypes === 'image' && fileType !== 'image') {
        setError('Only images are accepted.');
        return;
      }
      if (acceptedTypes === 'video' && fileType !== 'video') {
        setError('Only videos are accepted.');
        return;
      }
    }

    setUploading(true);
    setProgress(0);

    try {
      if (fileType === 'video') {
        // Upload video to GCS encoding pipeline
        const result = await uploadVideo(
          file,
          csrfToken,
          (progressUpdate) => {
            setProgress(progressUpdate.percentage);
          },
          (statusUpdate: VideoTranscodingStatus) => {
            setStatus(statusUpdate.status);
            setStatusMessage(statusUpdate.message || '');
          }
        );

        if (result.success && result.playbackUrl) {
          // Create a media asset record for the transcoded video
          const mediaAssetId = result.mediaAssetId || result.videoId || '';
          if (!mediaAssetId) {
            throw new Error('Video uploaded but no media asset ID was returned');
          }
          onUploadComplete(mediaAssetId, result.playbackUrl, 'video');
          
          // Reset state
          setTimeout(() => {
            setUploading(false);
            setProgress(0);
            setStatus('idle');
            setStatusMessage('');
          }, 2000);
        } else {
          throw new Error(result.error || 'Video upload failed');
        }
      } else {
        // Upload image to Replit Object Storage
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            setProgress(percentage);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              if (response.media && response.media.id) {
                onUploadComplete(response.media.id, response.media.url, 'image');
                
                // Reset state
                setTimeout(() => {
                  setUploading(false);
                  setProgress(0);
                }, 2000);
              } else {
                setError('Invalid response from server');
                setUploading(false);
                setProgress(0);
              }
            } else {
              let errorMessage = 'Upload failed';
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMessage = errorResponse.error || errorMessage;
              } catch (e) {
                errorMessage = `Upload failed: ${xhr.statusText}`;
              }
              setError(errorMessage);
              setUploading(false);
              setProgress(0);
            }
          } catch (err: any) {
            setError(err.message || 'Failed to process upload response');
            setUploading(false);
            setProgress(0);
          }
        });

        xhr.addEventListener('error', () => {
          setError('Network error during upload');
          setUploading(false);
          setProgress(0);
        });

        xhr.open('POST', '/api/cms/media');
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        xhr.send(formData);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      setUploading(false);
      setProgress(0);
      setStatus('error');
    }
  };

  const getAcceptString = () => {
    if (acceptedTypes === 'image') return 'image/*';
    if (acceptedTypes === 'video') return 'video/*';
    return 'image/*,video/*';
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-fuchsia-500 bg-fuchsia-500/10' 
            : 'border-slate-600 hover:border-fuchsia-400 hover:bg-slate-800/50'
          }
          ${uploading ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        {!uploading ? (
          <div className="space-y-3">
            <div className="flex justify-center gap-4">
              {(acceptedTypes === 'both' || acceptedTypes === 'image') && (
                <ImageIcon className="w-12 h-12 text-fuchsia-400" />
              )}
              {(acceptedTypes === 'both' || acceptedTypes === 'video') && (
                <Video className="w-12 h-12 text-fuchsia-400" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">
                {acceptedTypes === 'image' && 'Click or drag image here'}
                {acceptedTypes === 'video' && 'Click or drag video here'}
                {acceptedTypes === 'both' && 'Click or drag image or video here'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {acceptedTypes === 'image' && 'PNG, JPG, GIF up to 100MB'}
                {acceptedTypes === 'video' && 'MP4, MOV, WebM up to 2GB'}
                {acceptedTypes === 'both' && 'Images (100MB) or Videos (2GB)'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-fuchsia-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Status Message */}
            <div className="flex items-center justify-center gap-2">
              {status === 'completed' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400">{statusMessage || 'Upload complete!'}</span>
                </>
              ) : status === 'error' ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">{statusMessage || 'Upload failed'}</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-fuchsia-400 animate-pulse" />
                  <span className="text-white">
                    {statusMessage || `Uploading... ${progress}%`}
                  </span>
                </>
              )}
            </div>

            {/* Cancel/Close Button */}
            {status === 'uploading' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUploading(false);
                  setProgress(0);
                  setStatus('idle');
                }}
                className="text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
