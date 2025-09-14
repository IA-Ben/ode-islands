"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QRScanResult {
  text: string;
  rawBytes?: Uint8Array;
  format?: string;
}

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (result: QRScanResult) => void;
  onError: (error: string) => void;
}

export default function QRScanner({ isOpen, onClose, onResult, onError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize camera when scanner opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeCamera();
    } else if (!isOpen && streamRef.current) {
      cleanup();
    }
  }, [isOpen]);

  // Initialize camera and scanner
  const initializeCamera = async () => {
    try {
      setError(null);
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera for scanning
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        videoRef.current.onloadedmetadata = () => {
          setIsInitialized(true);
          startScanning();
        };
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  // Start QR code scanning
  const startScanning = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isScanning) return;

    setIsScanning(true);
    
    // Use a simple interval-based scanning approach
    // In production, you might want to use a more sophisticated QR library like jsQR
    scanIntervalRef.current = setInterval(() => {
      scanFrame();
    }, 100); // Scan 10 times per second
  }, [isScanning]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  // Scan a single video frame for QR codes
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Get image data from canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple QR detection (this is a basic implementation)
      // In production, use a library like jsQR: 
      // const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      // For now, we'll simulate QR detection for development
      // TODO: Integrate proper QR scanning library
      const mockQRDetection = detectMockQR(imageData);
      
      if (mockQRDetection) {
        stopScanning();
        onResult({
          text: mockQRDetection,
          format: 'QR_CODE'
        });
      }
    } catch (err) {
      console.error('QR scanning error:', err);
    }
  }, [onResult, stopScanning]);

  // Mock QR detection for development (replace with real QR library)
  const detectMockQR = (imageData: ImageData): string | null => {
    // This is just a placeholder - in production, use jsQR or similar
    // For demo purposes, let's simulate finding a QR code occasionally
    const random = Math.random();
    if (random < 0.01) { // 1% chance per scan
      return `E:ode-islands|C:chapter-1|S:001|V:1|H:abc123`;
    }
    return null;
  };

  // Cleanup camera and scanning
  const cleanup = useCallback(() => {
    stopScanning();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsInitialized(false);
    setError(null);
  }, [stopScanning]);

  // Handle manual close
  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video preview */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      
      {/* Hidden canvas for frame analysis */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 bg-black/50">
          <h2 className="text-white text-lg font-medium">Scan Chapter QR</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Scanning area overlay */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* Scanning frame */}
          <div className="relative">
            <div className="w-64 h-64 border-2 border-white/60 rounded-lg relative">
              {/* Corner indicators */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
              
              {/* Scanning line animation */}
              {isScanning && (
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div className="w-full h-0.5 bg-white/80 animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* Status indicators */}
          <div className="absolute bottom-20 left-0 right-0 text-center">
            {error ? (
              <Card className="mx-4 bg-red-500/20 border-red-500/40">
                <CardContent className="p-4">
                  <p className="text-red-300 text-sm">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={initializeCamera}
                    className="mt-2 border-red-500/40 text-red-300 hover:bg-red-500/20"
                  >
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : !isInitialized ? (
              <div className="flex items-center justify-center space-x-2 text-white">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Initializing camera...</span>
              </div>
            ) : (
              <div className="text-white/80 text-sm">
                <p className="mb-2">Position the QR code within the frame</p>
                <p className="text-xs text-white/60">
                  Look for QR codes next to chapter titles on stage
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="p-4 bg-black/50">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-white/40 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            
            {/* Flashlight toggle (if supported) */}
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Implement flashlight toggle
                console.log('Toggle flashlight');
              }}
              className="border-white/40 text-white hover:bg-white/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}