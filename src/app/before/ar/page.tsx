'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ARItem {
  id: string;
  type: string;
  content: any;
  order: number;
}

interface ChapterARGroup {
  chapterId: string;
  chapterTitle: string;
  arItems: ARItem[];
}

export default function ARIndexPage() {
  const router = useRouter();
  const [arGroups, setArGroups] = useState<ChapterARGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ARItem | null>(null);

  useEffect(() => {
    fetchARItems();
  }, []);

  const fetchARItems = async () => {
    try {
      const response = await fetch('/api/chapters/ar');
      if (response.ok) {
        const data = await response.json();
        setArGroups(data);
      }
    } catch (error) {
      console.error('Error fetching AR items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleARLaunch = (item: ARItem) => {
    setSelectedItem(item);
    // Here you would integrate with the AR viewer component
    // For now, we'll just show a modal or navigate to AR view
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AR experiences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/before" className="hover:text-gray-700">Before</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">AR Experiences</span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">AR Experiences</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Bring stories to life with augmented reality. View 3D objects, animations, and interactive content in your space.
          </p>
        </div>

        {/* AR items grouped by chapter */}
        {arGroups.length > 0 ? (
          <div className="space-y-8">
            {arGroups.map((group) => (
              <div key={group.chapterId} className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6 border-b pb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{group.chapterTitle}</h2>
                  <Link
                    href={`/before/story/${group.chapterId}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View Chapter →
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.arItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleARLaunch(item)}
                    >
                      <div className="flex items-center mb-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-medium text-gray-900">
                            {item.content.text?.title || `AR Item ${item.order}`}
                          </h3>
                          <p className="text-sm text-gray-500">Card {item.order}</p>
                        </div>
                      </div>

                      {item.content.text?.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {item.content.text.description}
                        </p>
                      )}

                      <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">
                        Launch AR
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No AR experiences available</h3>
            <p className="mt-1 text-sm text-gray-500">AR content will appear here once added to chapters.</p>
          </div>
        )}

        {/* AR Instructions */}
        <div className="mt-12 bg-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">How to use AR</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center mr-3 text-xs font-semibold">1</span>
              <span>Select an AR experience from the list above</span>
            </li>
            <li className="flex">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center mr-3 text-xs font-semibold">2</span>
              <span>Allow camera access when prompted</span>
            </li>
            <li className="flex">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center mr-3 text-xs font-semibold">3</span>
              <span>Point your device at a flat surface or scan the marker</span>
            </li>
            <li className="flex">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center mr-3 text-xs font-semibold">4</span>
              <span>Interact with the 3D content in your space</span>
            </li>
          </ol>
        </div>
      </main>

      {/* AR Modal/Viewer would go here */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-3">AR Viewer</h3>
            <p className="text-gray-600 mb-4">
              AR functionality would be integrated here with the AROrchestrator component.
            </p>
            <button
              onClick={() => setSelectedItem(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}