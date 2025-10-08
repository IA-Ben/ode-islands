'use client';

import { useState, useEffect } from 'react';
import { X, Search, Upload, Image as ImageIcon, Video, File, Check } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface MediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  createdAt: string;
  tags?: string[];
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  accept?: 'image' | 'video' | 'all';
  multiple?: boolean;
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  accept = 'all',
  multiple = false,
}: MediaPickerModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen]);

  useEffect(() => {
    filterAssets();
  }, [searchQuery, assets, accept]);

  const loadAssets = async () => {
    try {
      const response = await fetch('/api/cms/media');
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAssets = () => {
    let filtered = [...assets];

    // Filter by type
    if (accept === 'image') {
      filtered = filtered.filter(a => a.mimeType.startsWith('image/'));
    } else if (accept === 'video') {
      filtered = filtered.filter(a => a.mimeType.startsWith('video/'));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.filename.toLowerCase().includes(query) ||
          a.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredAssets(filtered);
  };

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/cms/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        loadAssets();
        setActiveTab('browse');
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = (asset: MediaAsset) => {
    if (multiple) {
      const newSelected = new Set(selectedAssets);
      if (newSelected.has(asset.id)) {
        newSelected.delete(asset.id);
      } else {
        newSelected.add(asset.id);
      }
      setSelectedAssets(newSelected);
    } else {
      onSelect(asset);
      onClose();
    }
  };

  const handleConfirmMultiple = () => {
    const selected = assets.filter(a => selectedAssets.has(a.id));
    selected.forEach(asset => onSelect(asset));
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Video;
    return File;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`${surfaces.overlayGlass} rounded-xl border border-fuchsia-500/50 max-w-6xl w-full max-h-[85vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div>
            <h2 className="text-2xl font-bold text-white">Media Library</h2>
            <p className="text-sm text-slate-400 mt-1">
              {accept === 'image'
                ? 'Select images'
                : accept === 'video'
                ? 'Select videos'
                : 'Select media files'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'browse'
                ? 'bg-fuchsia-600 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'upload'
                ? 'bg-fuchsia-600 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'browse' ? (
            <>
              {/* Search */}
              <div className="p-6 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by filename or tags..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
              </div>

              {/* Asset Grid */}
              <div className="px-6 pb-6 overflow-y-auto max-h-[calc(85vh-280px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">
                      {searchQuery ? 'No assets found matching your search' : 'No assets uploaded yet'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAssets.map(asset => {
                      const Icon = getFileIcon(asset.mimeType);
                      const isSelected = selectedAssets.has(asset.id);

                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleSelect(asset)}
                          className={`group relative ${surfaces.cardGlass} rounded-lg p-3 border ${
                            isSelected ? 'border-fuchsia-500' : 'border-slate-700/50'
                          } hover:border-fuchsia-500/50 transition-all text-left`}
                        >
                          {/* Preview */}
                          <div className="aspect-square rounded-lg bg-slate-800/50 mb-3 overflow-hidden relative">
                            {asset.mimeType.startsWith('image/') ? (
                              <img
                                src={asset.thumbnailUrl || asset.url}
                                alt={asset.filename}
                                className="w-full h-full object-cover"
                              />
                            ) : asset.mimeType.startsWith('video/') ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="w-8 h-8 text-slate-500" />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon className="w-8 h-8 text-slate-500" />
                              </div>
                            )}

                            {isSelected && (
                              <div className="absolute inset-0 bg-fuchsia-600/20 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-fuchsia-600 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <p className="text-sm text-white font-medium truncate mb-1">
                            {asset.filename}
                          </p>
                          <p className="text-xs text-slate-500">{formatFileSize(asset.size)}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6">
              <div
                className={`${surfaces.cardGlass} rounded-xl p-12 border-2 border-dashed border-slate-700/50 hover:border-fuchsia-500/50 transition-all text-center`}
              >
                <input
                  type="file"
                  multiple
                  accept={accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : '*'}
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploading ? (
                    <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  ) : (
                    <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  )}
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {accept === 'image'
                      ? 'Images only (PNG, JPG, WebP)'
                      : accept === 'video'
                      ? 'Videos only (MP4, WebM)'
                      : 'All media types supported'}
                  </p>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {multiple && selectedAssets.size > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">{selectedAssets.size} selected</p>
            <div className="flex gap-3">
              <button onClick={onClose} className={components.buttonSecondary}>
                Cancel
              </button>
              <button onClick={handleConfirmMultiple} className={components.buttonPrimary}>
                <Check className="w-4 h-4" />
                Select {selectedAssets.size} {selectedAssets.size === 1 ? 'File' : 'Files'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
