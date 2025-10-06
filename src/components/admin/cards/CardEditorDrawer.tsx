'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FileText,
  Award,
  Eye,
  Settings,
  History,
  Globe,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
} from 'lucide-react';
import { surfaces, pills, focus, colors, interactive, borders, shadows, typography, layout, components } from '@/lib/admin/designTokens';
import { MediaSelectorModal } from '@/components/cms/MediaSelectorModal';
import { CMSCardPreview } from '@/components/CMSCardPreview';
import type { CardData as CMSCardData } from '@/@typings';

export interface CardData {
  id?: string;
  scope: 'story' | 'event';
  type: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  content: any;
  imageMediaId?: string | null;
  videoMediaId?: string | null;
  iconName?: string | null;
  size?: string | null;
  publishStatus: 'draft' | 'in_review' | 'published' | 'archived';
  publishedAt?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  imageMedia?: {
    id: string;
    publicUrl: string;
    title: string;
  };
  videoMedia?: {
    id: string;
    publicUrl: string;
    title: string;
  };
  assignments?: Array<{
    id: string;
    parentType: string;
    parentId: string;
    order: number;
  }>;
  minTier?: string;
  visibilityStartDate?: string;
  visibilityEndDate?: string;
  geoZones?: string[];
  rewardConfig?: {
    enabled: boolean;
    templateId?: string;
    trigger?: string;
    minScore?: number;
    cooldownSec?: number;
    oneTime?: boolean;
  };
  auditLog?: Array<{
    timestamp: string;
    user: string;
    action: string;
    changes: any;
  }>;
}

interface CardEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card?: CardData;
  onSave: (cardData: Partial<CardData>) => void;
}

type Tab = 'basics' | 'reward' | 'visibility' | 'params' | 'preview' | 'audit';

const getDefaultFormData = (): Partial<CardData> => ({
  scope: 'story',
  type: 'text-story',
  title: '',
  subtitle: '',
  summary: '',
  content: {},
  size: 'M',
  publishStatus: 'draft',
  minTier: 'any',
  geoZones: [],
  rewardConfig: {
    enabled: false,
  },
});

export function CardEditorDrawer({ isOpen, onClose, card, onSave }: CardEditorDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [mediaSelectionType, setMediaSelectionType] = useState<'image' | 'video'>('image');
  const [memoryTemplates, setMemoryTemplates] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<Partial<CardData>>(getDefaultFormData());

  useEffect(() => {
    if (isOpen) {
      if (card) {
        setFormData({ ...card });
      } else {
        setFormData(getDefaultFormData());
        setActiveTab('basics');
      }
    }
  }, [card, isOpen]);

  useEffect(() => {
    if (activeTab === 'reward') {
      fetchMemoryTemplates();
    }
  }, [activeTab]);

  const fetchMemoryTemplates = async () => {
    try {
      const response = await fetch('/api/cms/memory-templates', {
        credentials: 'same-origin',
      });
      if (response.ok) {
        const templates = await response.json();
        setMemoryTemplates(templates);
      }
    } catch (error) {
      console.error('Failed to fetch memory templates:', error);
    }
  };

  const handleInputChange = (field: keyof CardData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRewardConfigChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      rewardConfig: {
        enabled: prev.rewardConfig?.enabled ?? false,
        templateId: prev.rewardConfig?.templateId,
        trigger: prev.rewardConfig?.trigger,
        minScore: prev.rewardConfig?.minScore,
        cooldownSec: prev.rewardConfig?.cooldownSec,
        oneTime: prev.rewardConfig?.oneTime,
        [field]: value,
      },
    }));
  };

  const handleMediaSelect = (media: any) => {
    if (mediaSelectionType === 'image') {
      handleInputChange('imageMediaId', media?.id || null);
      setFormData((prev) => ({
        ...prev,
        imageMedia: media ? {
          id: media.id,
          publicUrl: media.url || media.publicUrl,
          title: media.title || media.fileName,
        } : undefined,
      }));
    } else {
      handleInputChange('videoMediaId', media?.id || null);
      setFormData((prev) => ({
        ...prev,
        videoMedia: media ? {
          id: media.id,
          publicUrl: media.url || media.publicUrl,
          title: media.title || media.fileName,
        } : undefined,
      }));
    }
    setShowMediaSelector(false);
  };

  const handleSave = async () => {
    setError(null);
    
    if (!formData.title || !formData.type) {
      setError('Title and Type are required');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save card');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure? Unsaved changes will be lost.')) {
      onClose();
    }
  };

  const tabs = [
    { id: 'basics' as Tab, label: 'Basics', icon: FileText },
    { id: 'reward' as Tab, label: 'Reward', icon: Award },
    { id: 'visibility' as Tab, label: 'Visibility', icon: Globe },
    { id: 'params' as Tab, label: 'Params', icon: Settings },
    { id: 'preview' as Tab, label: 'Preview', icon: Eye },
    { id: 'audit' as Tab, label: 'Audit', icon: History },
  ];

  const getPreviewCardData = (): CMSCardData => {
    return {
      text: {
        title: formData.title || '',
        subtitle: formData.subtitle || '',
        description: formData.summary || '',
      },
      image: formData.imageMedia?.publicUrl ? {
        url: formData.imageMedia.publicUrl,
        width: 1920,
        height: 1080,
      } : undefined,
      video: formData.videoMedia?.publicUrl ? {
        url: formData.videoMedia.publicUrl,
        width: 1920,
        height: 1080,
        type: 'immersive',
      } : undefined,
    };
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={layout.overlay}
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          ${surfaces.overlayGlass}
          ${borders.glassBorder}
          fixed right-0 top-0 h-full
          w-full md:w-2/3 lg:w-1/2
          z-50
          transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className={`${surfaces.darkGlass} ${borders.glassBorder} border-b p-6 flex items-center justify-between`}>
          <h2 id="drawer-title" className={typography.h2}>
            {card ? 'Edit Card' : 'New Card'}
          </h2>
          <button
            onClick={handleCancel}
            className={`
              ${pills.base}
              p-2
              ${surfaces.subtleGlass}
              ${focus.ring}
              ${interactive.hoverSubtle}
              ${colors.slate.text}
              hover:bg-slate-800/80
            `}
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`${surfaces.darkGlass} ${borders.glassBorder} border-b px-6 py-3 overflow-x-auto`}>
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2
                    ${pills.base}
                    ${pills.padding.md}
                    ${focus.ring}
                    ${interactive.hoverSubtle}
                    transition-all duration-200
                    whitespace-nowrap
                    ${isActive 
                      ? `${pills.active} text-white font-medium` 
                      : `${surfaces.subtleGlass} ${colors.slate.text} hover:bg-slate-800/80`
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basics Tab */}
          {activeTab === 'basics' && (
            <div className="space-y-6">
              <div>
                <label className={typography.label}>
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={components.input}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label className={typography.label}>Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  className={components.input}
                />
              </div>

              <div>
                <label className={typography.label}>Summary</label>
                <textarea
                  value={formData.summary || ''}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  className={components.input}
                  rows={3}
                />
              </div>

              {/* Image Media */}
              <div>
                <label className={typography.label}>Image</label>
                <div className="flex gap-2">
                  {formData.imageMedia?.publicUrl && (
                    <img
                      src={formData.imageMedia.publicUrl}
                      alt={formData.imageMedia.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <button
                    onClick={() => {
                      setMediaSelectionType('image');
                      setShowMediaSelector(true);
                    }}
                    className={`
                      ${components.buttonSecondary}
                      flex items-center gap-2
                    `}
                  >
                    <Upload className="w-4 h-4" />
                    {formData.imageMedia ? 'Change Image' : 'Select Image'}
                  </button>
                  {formData.imageMedia && (
                    <button
                      onClick={() => handleMediaSelect(null)}
                      className={`
                        ${pills.base}
                        ${pills.padding.md}
                        ${surfaces.darkGlass}
                        ${borders.glassBorder}
                        ${focus.ring}
                        text-red-400 hover:bg-red-500/10
                      `}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Video Media */}
              <div>
                <label className={typography.label}>Video</label>
                <div className="flex gap-2">
                  {formData.videoMedia?.publicUrl && (
                    <video
                      src={formData.videoMedia.publicUrl}
                      className="w-24 h-24 object-cover rounded-lg"
                      controls
                    />
                  )}
                  <button
                    onClick={() => {
                      setMediaSelectionType('video');
                      setShowMediaSelector(true);
                    }}
                    className={`
                      ${components.buttonSecondary}
                      flex items-center gap-2
                    `}
                  >
                    <Upload className="w-4 h-4" />
                    {formData.videoMedia ? 'Change Video' : 'Select Video'}
                  </button>
                  {formData.videoMedia && (
                    <button
                      onClick={() => {
                        setMediaSelectionType('video');
                        handleMediaSelect(null);
                      }}
                      className={`
                        ${pills.base}
                        ${pills.padding.md}
                        ${surfaces.darkGlass}
                        ${borders.glassBorder}
                        ${focus.ring}
                        text-red-400 hover:bg-red-500/10
                      `}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Size Selector */}
              <div>
                <label className={typography.label}>Size</label>
                <div className="flex gap-3">
                  {['S', 'M', 'L'].map((size) => (
                    <label key={size} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="size"
                        value={size}
                        checked={formData.size === size}
                        onChange={(e) => handleInputChange('size', e.target.value)}
                        className={focus.ring}
                      />
                      <span className={typography.body}>{size}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scope Selector */}
              <div>
                <label className={typography.label}>
                  Scope <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'story', label: 'Story' },
                    { value: 'event', label: 'Event' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scope"
                        value={option.value}
                        checked={formData.scope === option.value}
                        onChange={(e) => handleInputChange('scope', e.target.value as 'story' | 'event')}
                        className={focus.ring}
                        required
                        aria-required="true"
                      />
                      <span className={typography.body}>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lane Selector (only for event scope) */}
              {formData.scope === 'event' && (
                <div>
                  <label className={typography.label}>Event Lane</label>
                  <select
                    value={formData.assignments?.[0]?.parentId || ''}
                    onChange={(e) => {
                      const laneId = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        assignments: laneId ? [{
                          id: prev.assignments?.[0]?.id || '',
                          parentType: 'event_lane',
                          parentId: laneId,
                          order: prev.assignments?.[0]?.order || 0,
                        }] : [],
                      }));
                    }}
                    className={components.input}
                  >
                    <option value="">Select lane...</option>
                    <option value="info">Info</option>
                    <option value="interact">Interact</option>
                    <option value="rewards">Rewards</option>
                  </select>
                </div>
              )}

              {/* Order Number */}
              <div>
                <label className={typography.label}>Order</label>
                <input
                  type="number"
                  value={formData.assignments?.[0]?.order || 0}
                  onChange={(e) => {
                    const order = parseInt(e.target.value, 10);
                    setFormData((prev) => ({
                      ...prev,
                      assignments: prev.assignments ? [{
                        ...prev.assignments[0],
                        order,
                      }] : [{
                        id: '',
                        parentType: 'event_lane',
                        parentId: '',
                        order,
                      }],
                    }));
                  }}
                  className={components.input}
                  min="0"
                />
              </div>

              {/* Card Type */}
              <div>
                <label className={typography.label}>
                  Card Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.type || ''}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className={components.input}
                  required
                  aria-required="true"
                >
                  <option value="text-story">Text Story</option>
                  <option value="ar-story">AR Story</option>
                  <option value="video">Video</option>
                  <option value="schedule">Schedule</option>
                  <option value="map">Map</option>
                  <option value="venue">Venue Info</option>
                  <option value="qr-scan">QR Scan</option>
                  <option value="user-media">User Media</option>
                  <option value="live-ar">Live AR</option>
                  <option value="merch">Merchandise</option>
                  <option value="food-beverage">Food & Beverage</option>
                </select>
              </div>
            </div>
          )}

          {/* Reward Tab */}
          {activeTab === 'reward' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="reward-enabled"
                  checked={formData.rewardConfig?.enabled || false}
                  onChange={(e) => handleRewardConfigChange('enabled', e.target.checked)}
                  className={focus.ring}
                />
                <label htmlFor="reward-enabled" className={typography.label}>
                  Award Memory
                </label>
              </div>

              {formData.rewardConfig?.enabled && (
                <>
                  <div>
                    <label className={typography.label}>Memory Template</label>
                    <select
                      value={formData.rewardConfig?.templateId || ''}
                      onChange={(e) => handleRewardConfigChange('templateId', e.target.value)}
                      className={components.input}
                    >
                      <option value="">Select template...</option>
                      {memoryTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={typography.label}>Trigger</label>
                    <select
                      value={formData.rewardConfig?.trigger || 'onComplete'}
                      onChange={(e) => handleRewardConfigChange('trigger', e.target.value)}
                      className={components.input}
                    >
                      <option value="onOpen">On Open</option>
                      <option value="onComplete">On Complete</option>
                      <option value="onShare">On Share</option>
                      <option value="onOrderComplete">On Order Complete</option>
                      <option value="onPair">On Pair</option>
                      <option value="onScore">On Score</option>
                    </select>
                  </div>

                  <div>
                    <label className={typography.label}>Minimum Score</label>
                    <input
                      type="number"
                      value={formData.rewardConfig?.minScore || ''}
                      onChange={(e) => handleRewardConfigChange('minScore', parseInt(e.target.value, 10) || undefined)}
                      className={components.input}
                      min="0"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className={typography.label}>Cooldown (seconds)</label>
                    <input
                      type="number"
                      value={formData.rewardConfig?.cooldownSec || ''}
                      onChange={(e) => handleRewardConfigChange('cooldownSec', parseInt(e.target.value, 10) || undefined)}
                      className={components.input}
                      min="0"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="reward-one-time"
                      checked={formData.rewardConfig?.oneTime || false}
                      onChange={(e) => handleRewardConfigChange('oneTime', e.target.checked)}
                      className={focus.ring}
                    />
                    <label htmlFor="reward-one-time" className={typography.label}>
                      One-time reward only
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Visibility Tab */}
          {activeTab === 'visibility' && (
            <div className="space-y-6">
              <div>
                <label className={typography.label}>Minimum Tier</label>
                <select
                  value={formData.minTier || 'any'}
                  onChange={(e) => handleInputChange('minTier', e.target.value)}
                  className={components.input}
                >
                  <option value="any">Any</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                </select>
              </div>

              <div>
                <label className={typography.label}>Visibility Start Date</label>
                <input
                  type="datetime-local"
                  value={formData.visibilityStartDate || ''}
                  onChange={(e) => handleInputChange('visibilityStartDate', e.target.value)}
                  className={components.input}
                />
              </div>

              <div>
                <label className={typography.label}>Visibility End Date</label>
                <input
                  type="datetime-local"
                  value={formData.visibilityEndDate || ''}
                  onChange={(e) => handleInputChange('visibilityEndDate', e.target.value)}
                  className={components.input}
                />
              </div>

              <div>
                <label className={typography.label}>Geo Zones</label>
                <div className="space-y-2">
                  {['main-stage', 'lobby', 'vip-lounge', 'food-court', 'merchandise', 'any'].map((zone) => (
                    <label key={zone} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.geoZones || []).includes(zone)}
                        onChange={(e) => {
                          const zones = formData.geoZones || [];
                          if (e.target.checked) {
                            handleInputChange('geoZones', [...zones, zone]);
                          } else {
                            handleInputChange('geoZones', zones.filter((z) => z !== zone));
                          }
                        }}
                        className={focus.ring}
                      />
                      <span className={typography.body}>{zone}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Params Tab */}
          {activeTab === 'params' && (
            <div className="space-y-6">
              <div>
                <label className={typography.label}>Content JSON</label>
                <p className={typography.bodyMuted}>
                  Type-specific configuration in JSON format
                </p>
                <textarea
                  value={JSON.stringify(formData.content, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleInputChange('content', parsed);
                      setError(null);
                    } catch (err) {
                      setError('Invalid JSON format');
                    }
                  }}
                  className={`${components.input} font-mono text-sm`}
                  rows={20}
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className={typography.h3}>Card Preview</h3>
                <p className={typography.bodyMuted}>
                  This is how the card will appear to users
                </p>
              </div>
              <div className="min-h-[400px] flex items-center justify-center">
                <CMSCardPreview
                  data={getPreviewCardData()}
                  className="max-w-md w-full"
                />
              </div>
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h3 className={typography.h3}>Audit Log</h3>
                <p className={typography.bodyMuted}>
                  History of changes to this card
                </p>
              </div>
              {formData.auditLog && formData.auditLog.length > 0 ? (
                <div className="space-y-3">
                  {formData.auditLog.map((entry, index) => (
                    <div
                      key={index}
                      className={`
                        ${surfaces.cardGlass}
                        ${borders.glassBorder}
                        ${borders.radius.lg}
                        p-4
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`${typography.label} text-fuchsia-400`}>
                          {entry.action}
                        </span>
                        <span className={typography.bodyMuted}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className={typography.bodyMuted}>
                        User: {entry.user}
                      </div>
                      {entry.changes && (
                        <div className="mt-2">
                          <pre className="text-xs text-slate-400 overflow-x-auto">
                            {JSON.stringify(entry.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className={typography.bodyMuted}>
                    {card ? 'No audit history available' : 'Audit history will appear after saving'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`${surfaces.darkGlass} ${borders.glassBorder} border-t p-6 flex items-center justify-between`}>
          <button
            onClick={handleCancel}
            className={components.buttonSecondary}
            disabled={loading}
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {formData.publishStatus === 'published' ? (
              <button
                onClick={handleSave}
                className={components.buttonPrimary}
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save & Publish'}
              </button>
            ) : (
              <button
                onClick={handleSave}
                className={components.buttonPrimary}
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Draft'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media Selector Modal */}
      {showMediaSelector && (
        <MediaSelectorModal
          isOpen={showMediaSelector}
          onClose={() => setShowMediaSelector(false)}
          onSelect={handleMediaSelect}
          filter={{ type: mediaSelectionType === 'image' ? 'image/' : 'video/' }}
          csrfToken=""
        />
      )}
    </>
  );
}
