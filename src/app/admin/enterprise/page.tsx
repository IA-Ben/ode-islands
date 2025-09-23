'use client';

import { useState, useEffect } from 'react';

interface FeatureFlag {
  flagKey: string;
  flagName: string;
  description?: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  isEmergencyDisabled: boolean;
  category: 'feature' | 'experiment' | 'operational' | 'killswitch';
  lastModifiedBy?: string;
  updatedAt: string;
}

interface SystemHealth {
  metrics: {
    overall: 'healthy' | 'degraded' | 'critical';
    score: number;
    activeAlerts: number;
    criticalAlerts: number;
  };
  featureFlags: {
    status: 'healthy' | 'degraded' | 'critical';
    flagCount: number;
    globalKillSwitch: boolean;
    emergencyFlags: number;
  };
}

interface RollbackEvent {
  id: string;
  rollbackType: string;
  scope: string;
  status: string;
  reason: string;
  initiatedBy: string;
  initiatedAt: string;
  success?: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

export default function EnterpriseAdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [rollbacks, setRollbacks] = useState<RollbackEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load dashboard data after authentication
  useEffect(() => {
    if (user?.isAdmin) {
      loadDashboardData();
      
      // Refresh every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      const userResponse = await fetch('/api/auth/user', {
        credentials: 'same-origin'
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        
        if (userData && userData.id) {
          setUser(userData);
          
          // Redirect non-admin users
          if (!userData.isAdmin) {
            window.location.href = '/admin/cms';
            return;
          }
        } else {
          setUser(null);
          window.location.href = '/admin/cms';
          return;
        }
      } else {
        setUser(null);
        window.location.href = '/admin/cms';
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      window.location.href = '/admin/cms';
      return;
    } finally {
      setAuthLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [flagsRes, healthRes, rollbacksRes] = await Promise.all([
        fetch('/api/admin/enterprise/feature-flags'),
        fetch('/api/admin/enterprise/system/health'),
        fetch('/api/admin/enterprise/rollbacks')
      ]);

      if (flagsRes.ok) {
        const flagsData = await flagsRes.json();
        setFeatureFlags(Object.values(flagsData.flags) as FeatureFlag[]);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemHealth(healthData);
      }

      if (rollbacksRes.ok) {
        const rollbacksData = await rollbacksRes.json();
        setRollbacks(rollbacksData.rollbacks || []);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const emergencyDisableFlag = async (flagKey: string) => {
    const reason = prompt(`Enter reason for emergency disabling ${flagKey}:`);
    if (!reason) return;

    setActionLoading(flagKey);
    try {
      const response = await fetch(`/api/admin/enterprise/feature-flags/${flagKey}/emergency-disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await loadDashboardData();
        alert(`Feature flag ${flagKey} has been emergency disabled`);
      } else {
        const error = await response.json();
        alert(`Failed to disable feature flag: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to disable feature flag');
    } finally {
      setActionLoading(null);
    }
  };

  const activateGlobalKillSwitch = async () => {
    const reason = prompt('Enter reason for activating global kill switch (THIS WILL DISABLE ALL FEATURES):');
    if (!reason) return;

    if (!confirm('⚠️ WARNING: This will disable ALL feature flags globally. Are you sure?')) return;

    setActionLoading('global-kill-switch');
    try {
      const response = await fetch('/api/admin/enterprise/feature-flags/global-kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await loadDashboardData();
        alert('Global kill switch activated - all features disabled');
      } else {
        const error = await response.json();
        alert(`Failed to activate global kill switch: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to activate global kill switch');
    } finally {
      setActionLoading(null);
    }
  };

  const deactivateGlobalKillSwitch = async () => {
    if (!confirm('Are you sure you want to deactivate the global kill switch?')) return;

    setActionLoading('global-kill-switch');
    try {
      const response = await fetch('/api/admin/enterprise/feature-flags/global-kill-switch', {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadDashboardData();
        alert('Global kill switch deactivated');
      } else {
        const error = await response.json();
        alert(`Failed to deactivate global kill switch: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to deactivate global kill switch');
    } finally {
      setActionLoading(null);
    }
  };

  const initiateEmergencyRollback = async () => {
    const reason = prompt('Enter reason for emergency rollback:');
    if (!reason) return;

    if (!confirm('⚠️ WARNING: This will initiate a system-wide emergency rollback. Are you sure?')) return;

    setActionLoading('emergency-rollback');
    try {
      const response = await fetch('/api/admin/enterprise/rollbacks/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, scope: 'global' })
      });

      if (response.ok) {
        await loadDashboardData();
        alert('Emergency rollback initiated');
      } else {
        const error = await response.json();
        alert(`Failed to initiate emergency rollback: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to initiate emergency rollback');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please log in to access the enterprise admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading enterprise dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-900/20 border-green-500/30';
      case 'degraded': return 'bg-yellow-900/20 border-yellow-500/30';
      case 'critical': return 'bg-red-900/20 border-red-500/30';
      default: return 'bg-gray-900/20 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Enterprise Admin Dashboard</h1>
          <p className="text-gray-400">
            Centralized control for feature flags, system monitoring, and emergency rollbacks
          </p>
        </div>

        {/* System Health Overview */}
        {systemHealth && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`p-6 rounded-lg border ${getHealthStatusBg(systemHealth.metrics.overall)}`}>
              <h3 className="text-lg font-semibold text-white mb-2">System Metrics</h3>
              <div className={`text-2xl font-bold ${getHealthStatusColor(systemHealth.metrics.overall)} mb-2`}>
                {systemHealth.metrics.overall.toUpperCase()}
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Health Score: {systemHealth.metrics.score}/100</p>
                <p>Active Alerts: {systemHealth.metrics.activeAlerts}</p>
                <p>Critical Alerts: {systemHealth.metrics.criticalAlerts}</p>
              </div>
            </div>

            <div className={`p-6 rounded-lg border ${getHealthStatusBg(systemHealth.featureFlags.status)}`}>
              <h3 className="text-lg font-semibold text-white mb-2">Feature Flags</h3>
              <div className={`text-2xl font-bold ${getHealthStatusColor(systemHealth.featureFlags.status)} mb-2`}>
                {systemHealth.featureFlags.status.toUpperCase()}
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Total Flags: {systemHealth.featureFlags.flagCount}</p>
                <p>Emergency Disabled: {systemHealth.featureFlags.emergencyFlags}</p>
                <p className={systemHealth.featureFlags.globalKillSwitch ? 'text-red-400' : 'text-green-400'}>
                  Kill Switch: {systemHealth.featureFlags.globalKillSwitch ? 'ACTIVE' : 'Inactive'}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-lg border border-blue-500/30 bg-blue-900/20">
              <h3 className="text-lg font-semibold text-white mb-4">Emergency Controls</h3>
              <div className="space-y-2">
                <button
                  onClick={systemHealth.featureFlags.globalKillSwitch ? deactivateGlobalKillSwitch : activateGlobalKillSwitch}
                  disabled={actionLoading === 'global-kill-switch'}
                  className={`w-full px-4 py-2 rounded text-sm font-medium ${
                    systemHealth.featureFlags.globalKillSwitch
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {actionLoading === 'global-kill-switch' ? 'Processing...' : 
                   systemHealth.featureFlags.globalKillSwitch ? 'Deactivate Kill Switch' : 'GLOBAL KILL SWITCH'}
                </button>
                <button
                  onClick={initiateEmergencyRollback}
                  disabled={actionLoading === 'emergency-rollback'}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading === 'emergency-rollback' ? 'Processing...' : 'EMERGENCY ROLLBACK'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Flags Management */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Feature Flags</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Flag</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rollout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Modified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {featureFlags.map((flag) => (
                    <tr key={flag.flagKey}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{flag.flagName}</div>
                          <div className="text-sm text-gray-400">{flag.flagKey}</div>
                          {flag.description && (
                            <div className="text-xs text-gray-500 mt-1">{flag.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          flag.category === 'feature' ? 'bg-blue-100 text-blue-800' :
                          flag.category === 'experiment' ? 'bg-purple-100 text-purple-800' :
                          flag.category === 'operational' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {flag.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {flag.isEmergencyDisabled ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            EMERGENCY DISABLED
                          </span>
                        ) : flag.isEnabled ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Enabled
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {flag.rolloutPercentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <div>{new Date(flag.updatedAt).toLocaleDateString()}</div>
                        {flag.lastModifiedBy && (
                          <div className="text-xs">{flag.lastModifiedBy}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!flag.isEmergencyDisabled && (
                          <button
                            onClick={() => emergencyDisableFlag(flag.flagKey)}
                            disabled={actionLoading === flag.flagKey}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {actionLoading === flag.flagKey ? 'Disabling...' : 'Emergency Disable'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {featureFlags.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No feature flags found
              </div>
            )}
          </div>
        </div>

        {/* Recent Rollbacks */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Rollbacks</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Scope</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Initiated By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {rollbacks.slice(0, 10).map((rollback) => (
                    <tr key={rollback.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {rollback.rollbackType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {rollback.scope}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rollback.status === 'completed' && rollback.success ? 'bg-green-100 text-green-800' :
                          rollback.status === 'failed' ? 'bg-red-100 text-red-800' :
                          rollback.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rollback.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                        {rollback.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {rollback.initiatedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(rollback.initiatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rollbacks.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No rollbacks found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show error if user is not authenticated or not admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Access denied. Redirecting...</div>
      </div>
    );
  }
}