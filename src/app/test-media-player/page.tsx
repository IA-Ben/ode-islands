"use client";

import React, { useState } from 'react';
import MediaPlayer, { VideoPlayer, PlayCanvasPlayer, ARPlayer } from '@/components/MediaPlayer';
import { CardData } from '@/@typings';

/**
 * Test page for the unified MediaPlayer system
 * This page demonstrates all three media types and tests the unified API
 */
export default function TestMediaPlayerPage() {
  const [activeTab, setActiveTab] = useState<'video' | 'playcanvas' | 'ar'>('video');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test configurations for each media type
  const testVideo: NonNullable<CardData['video']> = {
    url: 'sample-video', // This would be a real video ID/URL
    width: 1920,
    height: 1080,
    audio: true,
    audioMuted: false,
  };

  const testPlayCanvas: NonNullable<CardData['playcanvas']> = {
    type: 'iframe',
    projectId: 'test-project',
    width: 800,
    height: 600,
    fillMode: 'FILL_WINDOW',
    autoPlay: true,
  };

  const testAR: NonNullable<CardData['ar']> = {
    mode: 'object',
    glbUrl: 'https://example.com/model.glb',
    usdzUrl: 'https://example.com/model.usdz',
    title: 'Test AR Model',
    placement: 'floor',
    cameraControls: true,
    autoRotate: true,
  };

  const [isAROpen, setIsAROpen] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
    console.log('Media player loaded successfully');
  };

  const handleError = (err: Error) => {
    setIsLoading(false);
    setError(err.message);
    console.error('Media player error:', err);
  };

  const handleProgress = (progress: number) => {
    console.log('Loading progress:', progress + '%');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Unified MediaPlayer Test Suite
        </h1>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 p-1 rounded-lg flex">
            {(['video', 'playcanvas', 'ar'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab === 'video' && '🎬'} Video Player
                {tab === 'playcanvas' && '🎮'} 3D Engine
                {tab === 'ar' && '🥽'} AR Viewer
              </button>
            ))}
          </div>
        </div>

        {/* Status Display */}
        {(isLoading || error) && (
          <div className="mb-6 p-4 rounded-lg bg-gray-800">
            {isLoading && (
              <div className="flex items-center text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent mr-3"></div>
                Loading media player...
              </div>
            )}
            {error && (
              <div className="text-red-400">
                Error: {error}
              </div>
            )}
          </div>
        )}

        {/* Media Player Container */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Testing: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Player
          </h2>

          <div className="w-full h-96 bg-black rounded-lg overflow-hidden">
            {activeTab === 'video' && (
              <div>
                <h3 className="text-lg mb-4">Unified API Test:</h3>
                <MediaPlayer
                  type="video"
                  video={testVideo}
                  active={true}
                  controls={true}
                  className="w-full h-full"
                  onLoad={handleLoad}
                  onError={handleError}
                  onProgress={handleProgress}
                />
              </div>
            )}

            {activeTab === 'playcanvas' && (
              <div>
                <h3 className="text-lg mb-4">Specialized Component Test:</h3>
                <PlayCanvasPlayer
                  playcanvas={testPlayCanvas}
                  active={true}
                  className="w-full h-full"
                  onLoad={handleLoad}
                  onError={handleError}
                  onSceneReady={() => console.log('PlayCanvas scene ready')}
                  onUserInteraction={(event: Event) => console.log('User interaction:', event)}
                />
              </div>
            )}

            {activeTab === 'ar' && (
              <div>
                <h3 className="text-lg mb-4">AR Component Test:</h3>
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <button
                    onClick={() => setIsAROpen(true)}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Open AR Experience
                  </button>
                  
                  <ARPlayer
                    ar={testAR}
                    isOpen={isAROpen}
                    onClose={() => setIsAROpen(false)}
                    onVideoStateChange={(playing: boolean) => console.log('Video state:', playing)}
                    active={true}
                    className="w-full h-full"
                    onLoad={handleLoad}
                    onError={handleError}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Demonstration */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">🎯 Unified Features</h3>
            <ul className="space-y-2 text-gray-300">
              <li>✅ Single API for all media types</li>
              <li>✅ Device capability optimization</li>
              <li>✅ Consistent loading states</li>
              <li>✅ Centralized error handling</li>
              <li>✅ Memory efficient resource management</li>
            </ul>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">⚡ Performance</h3>
            <ul className="space-y-2 text-gray-300">
              <li>✅ Lazy loading components</li>
              <li>✅ Device profile optimization</li>
              <li>✅ Quality adaptive streaming</li>
              <li>✅ Memory cleanup</li>
              <li>✅ Progressive loading</li>
            </ul>
          </div>
        </div>

        {/* API Examples */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">📝 API Examples</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-medium mb-2">Unified MediaPlayer:</h4>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
{`<MediaPlayer 
  type="video"
  video={videoConfig}
  onLoad={handleLoad}
  onError={handleError}
  className="w-full h-64"
/>`}
              </pre>
            </div>

            <div>
              <h4 className="text-lg font-medium mb-2">Specialized Components:</h4>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
{`<VideoPlayer video={videoConfig} />
<PlayCanvasPlayer playcanvas={pcConfig} />
<ARPlayer ar={arConfig} isOpen={true} />`}
              </pre>
            </div>
          </div>
        </div>

        {/* Migration Guide */}
        <div className="mt-8 bg-blue-900/20 border border-blue-500/20 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-blue-400">🔄 Migration Guide</h3>
          <div className="text-gray-300 space-y-2">
            <p><strong>Before:</strong> Import Player, PlayCanvasViewer, ARViewer separately</p>
            <p><strong>After:</strong> Import MediaPlayer or specialized components</p>
            <p><strong>Benefit:</strong> Unified API, better performance, consistent behavior</p>
          </div>
        </div>
      </div>
    </div>
  );
}