import { getVideoUrl } from '@/lib/cdnConfig';

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
export const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

export type VideoUploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export interface VideoUploadProgress {
  percentage: number;
}

export interface VideoTranscodingStatus {
  status: VideoUploadStatus;
  message?: string;
  percentage?: number;
  profiles?: string;
}

export interface VideoUploadResult {
  success: boolean;
  videoId?: string;
  mediaAssetId?: string;
  playbackUrl?: string;
  error?: string;
}

const pollTranscodingStatus = async (
  videoId: string,
  onStatusChange: (status: VideoTranscodingStatus) => void,
  attemptCount = 0
): Promise<VideoUploadResult> => {
  const MAX_ATTEMPTS = 60;
  const POLL_INTERVAL = 5000;
  
  if (attemptCount >= MAX_ATTEMPTS) {
    onStatusChange({
      status: 'error',
      message: 'Transcoding timeout - please check video status later'
    });
    return { success: false, error: 'Transcoding timeout' };
  }
  
  try {
    const response = await fetch(`/api/video-status/${videoId}`);
    
    if (!response.ok) {
      throw new Error('Failed to check transcoding status');
    }
    
    const data = await response.json();
    
    if (data.status === 'completed' || data.status === 'ready') {
      onStatusChange({
        status: 'completed',
        message: 'Video ready for playback'
      });
      
      const playbackUrl = getVideoUrl(videoId);
      
      let mediaAssetId: string | undefined;
      try {
        const mediaResponse = await fetch(`/api/cms/media?videoId=${videoId}`);
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          if (mediaData && mediaData.id) {
            mediaAssetId = mediaData.id;
          }
        }
      } catch (error) {
        console.log('Media asset not found in library (this is expected for direct uploads)');
      }
      
      return { success: true, videoId, mediaAssetId, playbackUrl };
    } else if (data.status === 'processing') {
      const percentage = data.percentage || 0;
      const profiles = data.profiles ? `${data.profiles}` : '';
      onStatusChange({
        status: 'processing',
        percentage,
        profiles,
        message: profiles ? `Processing: ${profiles}` : `Processing: ${percentage}%`
      });
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(pollTranscodingStatus(videoId, onStatusChange, attemptCount + 1));
        }, POLL_INTERVAL);
      });
    } else if (data.status === 'error') {
      onStatusChange({
        status: 'error',
        message: data.error || 'Transcoding failed'
      });
      return { success: false, error: data.error || 'Transcoding failed' };
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(pollTranscodingStatus(videoId, onStatusChange, attemptCount + 1));
        }, POLL_INTERVAL);
      });
    }
  } catch (err: any) {
    console.error('Polling error:', err);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(pollTranscodingStatus(videoId, onStatusChange, attemptCount + 1));
      }, POLL_INTERVAL);
    });
  }
};

export const uploadVideo = async (
  file: File,
  csrfToken: string,
  onProgress: (progress: VideoUploadProgress) => void,
  onStatusChange: (status: VideoTranscodingStatus) => void
): Promise<VideoUploadResult> => {
  if (file.size > MAX_FILE_SIZE) {
    onStatusChange({
      status: 'error',
      message: 'File too large. Maximum size is 2GB.'
    });
    return { success: false, error: 'File too large. Maximum size is 2GB.' };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    onStatusChange({
      status: 'error',
      message: 'Invalid file type. Allowed: MP4, MOV, AVI, WebM'
    });
    return { success: false, error: 'Invalid file type. Allowed: MP4, MOV, AVI, WebM' };
  }
  
  onStatusChange({ status: 'uploading', message: 'Uploading video...' });
  
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentage = Math.round((e.loaded / e.total) * 100);
        onProgress({ percentage });
      }
    });
    
    xhr.addEventListener('load', async () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        
        if (data.success && data.videoId) {
          onStatusChange({
            status: 'processing',
            message: 'Upload complete. Starting transcoding...'
          });
          onProgress({ percentage: 100 });
          
          const result = await pollTranscodingStatus(data.videoId, onStatusChange);
          resolve(result);
        } else {
          onStatusChange({
            status: 'error',
            message: data.error || 'Upload failed'
          });
          resolve({ success: false, error: data.error || 'Upload failed' });
        }
      } else {
        onStatusChange({
          status: 'error',
          message: `Upload failed: ${xhr.statusText}`
        });
        resolve({ success: false, error: `Upload failed: ${xhr.statusText}` });
      }
    });
    
    xhr.addEventListener('error', () => {
      onStatusChange({
        status: 'error',
        message: 'Network error during upload'
      });
      resolve({ success: false, error: 'Network error during upload' });
    });
    
    xhr.open('POST', '/api/cms/media/upload');
    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    xhr.send(formData);
  });
};
