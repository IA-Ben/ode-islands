'use client';

import { useState } from 'react';
import { Check, X, Clock, Eye, FileText, Calendar } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

export type PublishStatus = 'draft' | 'in_review' | 'published' | 'archived';

interface ContentStatusManagerProps {
  entityType: 'chapter' | 'story_card' | 'card';
  entityId: string;
  currentStatus: PublishStatus;
  publishedAt?: string | null;
  publishedBy?: string | null;
  scheduledPublishAt?: string | null;
  onStatusChange?: (newStatus: PublishStatus) => void;
  onScheduleChange?: (date: string | null) => void;
}

export function ContentStatusManager({
  entityType,
  entityId,
  currentStatus,
  publishedAt,
  publishedBy,
  scheduledPublishAt,
  onStatusChange,
  onScheduleChange,
}: ContentStatusManagerProps) {
  const [status, setStatus] = useState<PublishStatus>(currentStatus);
  const [scheduleDate, setScheduleDate] = useState(scheduledPublishAt || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  const handleStatusChange = async (newStatus: PublishStatus) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/content/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        setStatus(newStatus);
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSchedule = async () => {
    if (isUpdating || !scheduleDate) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/content/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          scheduledPublishAt: scheduleDate,
        }),
      });

      if (response.ok) {
        if (onScheduleChange) {
          onScheduleChange(scheduleDate);
        }
        setShowScheduler(false);
      } else {
        throw new Error('Failed to schedule');
      }
    } catch (error) {
      console.error('Schedule error:', error);
      alert('Failed to schedule publication');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (s: PublishStatus) => {
    switch (s) {
      case 'draft':
        return <FileText className="w-4 h-4" />;
      case 'in_review':
        return <Eye className="w-4 h-4" />;
      case 'published':
        return <Check className="w-4 h-4" />;
      case 'archived':
        return <X className="w-4 h-4" />;
    }
  };

  const getStatusColor = (s: PublishStatus) => {
    switch (s) {
      case 'draft':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'in_review':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'published':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'archived':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  const statuses: PublishStatus[] = ['draft', 'in_review', 'published', 'archived'];

  return (
    <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Publishing Workflow</h3>
        <span className={`${components.badge} ${getStatusColor(status)} flex items-center gap-1.5 border`}>
          {getStatusIcon(status)}
          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            disabled={isUpdating || status === s}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
              status === s
                ? `${getStatusColor(s)} border`
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-slate-700/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {getStatusIcon(s)}
            <span className="hidden sm:inline">
              {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </button>
        ))}
      </div>

      {publishedAt && (
        <div className={`${surfaces.subtleGlass} rounded-lg p-3 mb-4 border border-slate-700/50`}>
          <p className="text-xs text-slate-400 mb-1">Published</p>
          <p className="text-sm text-slate-300">
            {new Date(publishedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            {publishedBy && <span className="text-slate-500"> by {publishedBy}</span>}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={() => setShowScheduler(!showScheduler)}
          className={`w-full ${components.buttonSecondary} justify-center`}
        >
          <Calendar className="w-4 h-4" />
          {scheduledPublishAt ? 'Update Schedule' : 'Schedule Publication'}
        </button>

        {showScheduler && (
          <div className={`${surfaces.subtleGlass} rounded-lg p-4 border border-slate-700/50`}>
            <label className="block text-sm text-slate-400 mb-2">
              Publish Date & Time
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              />
              <button
                onClick={handleSchedule}
                disabled={isUpdating || !scheduleDate}
                className={`${components.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Clock className="w-4 h-4" />
                Set
              </button>
            </div>
            {scheduledPublishAt && (
              <p className="text-xs text-slate-500 mt-2">
                Currently scheduled for{' '}
                {new Date(scheduledPublishAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {status === 'draft' && (
        <div className={`${surfaces.subtleGlass} rounded-lg p-3 mt-4 border border-amber-500/30`}>
          <p className="text-xs text-amber-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            This content is in draft mode and not visible to users
          </p>
        </div>
      )}

      {status === 'in_review' && (
        <div className={`${surfaces.subtleGlass} rounded-lg p-3 mt-4 border border-blue-500/30`}>
          <p className="text-xs text-blue-400 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            This content is under review and awaiting approval
          </p>
        </div>
      )}
    </div>
  );
}
