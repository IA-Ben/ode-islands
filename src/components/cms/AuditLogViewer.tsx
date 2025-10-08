'use client';

import { useState, useEffect } from 'react';
import { Clock, User, FileText, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: any;
  metadata?: any;
  category?: string;
  severity?: string;
  description?: string;
  createdAt: string;
}

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
}

export function AuditLogViewer({ entityType, entityId, userId, limit = 50 }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [entityType, entityId, userId]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId);
      if (userId) params.append('userId', userId);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      } else {
        setError('Failed to load audit logs');
      }
    } catch (err) {
      setError('Failed to load audit logs');
      console.error('Audit log error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityBadgeClass = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-500/20 text-green-400';
      case 'update':
        return 'bg-blue-500/20 text-blue-400';
      case 'delete':
        return 'bg-red-500/20 text-red-400';
      case 'publish':
        return 'bg-purple-500/20 text-purple-400';
      case 'unpublish':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const formatEntityType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-red-500/30`}>
        <p className="text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className={`${surfaces.cardGlass} rounded-xl p-12 border border-slate-700/50 text-center`}>
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No audit logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity History ({logs.length})
        </h3>
        <button
          onClick={loadLogs}
          className={`${components.buttonSecondary} text-sm`}
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`${surfaces.cardGlass} rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">
                  {getSeverityIcon(log.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`${components.badge} ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-sm text-slate-300">
                      {formatEntityType(log.entityType)}
                    </span>
                    <span className="text-xs text-slate-500">#{log.entityId.slice(0, 8)}</span>
                  </div>

                  {log.description && (
                    <p className="text-sm text-slate-400 mb-2">{log.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.userEmail || 'Unknown user'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>

                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-fuchsia-400 cursor-pointer hover:text-fuchsia-300">
                        View changes
                      </summary>
                      <div className={`mt-2 p-3 ${surfaces.subtleGlass} rounded border border-slate-700/50 text-xs`}>
                        <pre className="text-slate-300 overflow-x-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>

              {log.severity && (
                <span className={`${components.badge} ${getSeverityBadgeClass(log.severity)}`}>
                  {log.severity}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
