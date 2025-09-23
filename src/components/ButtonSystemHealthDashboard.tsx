/**
 * Button System Health Dashboard
 * 
 * Real-time monitoring dashboard for button system health,
 * performance metrics, and rollback management.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useButtonHealthChecks } from '../lib/buttonHealthChecks';
import { useButtonFeatureFlags } from '../lib/buttonFeatureFlags';
import { useButtonRollback } from '../lib/buttonRollbackPlan';
import { useButtonMonitoring } from '../lib/buttonMonitoring';

interface HealthDashboardProps {
  className?: string;
}

export const ButtonSystemHealthDashboard: React.FC<HealthDashboardProps> = ({
  className = ''
}) => {
  const { lastHealthCheck, runHealthCheck, runQuickCheck } = useButtonHealthChecks();
  const { shouldUseUnifiedButtons, getSystemHealth } = useButtonFeatureFlags();
  const { currentRollback, executeRollback, getAvailablePlans } = useButtonRollback();
  const { getUsageStats, getRealTimeMetrics } = useButtonMonitoring();

  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [realTimeData, setRealTimeData] = useState({
    usageStats: getUsageStats(),
    realtimeMetrics: getRealTimeMetrics(),
    systemHealth: getSystemHealth()
  });

  // Update real-time data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData({
        usageStats: getUsageStats(),
        realtimeMetrics: getRealTimeMetrics(),
        systemHealth: getSystemHealth()
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [getUsageStats, getRealTimeMetrics, getSystemHealth]);

  const handleRunHealthCheck = async () => {
    setIsRunningHealthCheck(true);
    try {
      await runHealthCheck();
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  const handleEmergencyRollback = async () => {
    if (confirm('Are you sure you want to execute an emergency rollback? This will immediately disable unified buttons.')) {
      try {
        await executeRollback('emergency-rollback', 'Manual emergency rollback initiated from dashboard');
      } catch (error) {
        console.error('Emergency rollback failed:', error);
        alert('Emergency rollback failed. Check console for details.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'emergency_disabled': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getHealthScore = () => {
    return lastHealthCheck?.healthScore ?? realTimeData.realtimeMetrics.healthScore;
  };

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Button System Health Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleRunHealthCheck}
            disabled={isRunningHealthCheck}
            variant="outline"
          >
            {isRunningHealthCheck ? 'Running...' : 'Run Health Check'}
          </Button>
          <Button 
            onClick={handleEmergencyRollback}
            variant="destructive"
            disabled={!!currentRollback}
          >
            Emergency Rollback
          </Button>
        </div>
      </div>

      {/* Overall System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(realTimeData.systemHealth.status)}`}>
              {realTimeData.systemHealth.status.toUpperCase()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getHealthScore()}/100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unified Buttons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${shouldUseUnifiedButtons ? 'text-green-600' : 'text-gray-600'}`}>
              {shouldUseUnifiedButtons ? 'ENABLED' : 'DISABLED'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rollback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${currentRollback ? 'text-red-600' : 'text-green-600'}`}>
              {currentRollback ? currentRollback.status.toUpperCase() : 'NONE'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Average Render Time</span>
                <span className="font-mono">{realTimeData.usageStats.averageRenderTime.toFixed(1)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Average Action Time</span>
                <span className="font-mono">{realTimeData.usageStats.averageActionTime.toFixed(1)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Success Rate</span>
                <span className="font-mono">{(realTimeData.usageStats.successRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Total Interactions</span>
                <span className="font-mono">{realTimeData.usageStats.totalInteractions}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-time Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Active Operations</span>
                <span className="font-mono">{realTimeData.realtimeMetrics.activeOperations}</span>
              </div>
              <div className="flex justify-between">
                <span>Recent Errors</span>
                <span className={`font-mono ${realTimeData.realtimeMetrics.recentErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {realTimeData.realtimeMetrics.recentErrors}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Error Count</span>
                <span className="font-mono">{realTimeData.usageStats.errorCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Health Score</span>
                <span className="font-mono">{realTimeData.realtimeMetrics.healthScore}/100</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Check Results */}
      {lastHealthCheck && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Health Check Results</CardTitle>
            <p className="text-sm text-gray-600">
              Last updated: {new Date(lastHealthCheck.lastUpdated).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Health Checks */}
              <div>
                <h4 className="font-semibold mb-2">System Checks</h4>
                <div className="space-y-2">
                  {lastHealthCheck.healthChecks.map((check) => (
                    <div key={check.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{check.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          check.status === 'healthy' ? 'bg-green-100 text-green-800' :
                          check.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {check.status.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">{check.duration}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smoke Tests */}
              <div>
                <h4 className="font-semibold mb-2">Smoke Tests</h4>
                <div className="space-y-2">
                  {lastHealthCheck.smokeTests.map((test) => (
                    <div key={test.testName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{test.testName}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          test.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {test.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        <span className="text-sm text-gray-600">{test.duration}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {lastHealthCheck.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {lastHealthCheck.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-700">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Used Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Most Used Button Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {realTimeData.usageStats.mostUsedActions.slice(0, 5).map((action, index) => (
              <div key={action.action} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">#{index + 1} {action.action}</span>
                <span className="text-sm text-gray-600">{action.count} uses</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Rollback Status */}
      {currentRollback && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Active Rollback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>Plan:</strong> {currentRollback.planId}</div>
              <div><strong>Status:</strong> {currentRollback.status}</div>
              <div><strong>Started:</strong> {new Date(currentRollback.startTime).toLocaleString()}</div>
              <div><strong>Executed Steps:</strong> {currentRollback.executedSteps.length}</div>
              <div><strong>Failed Steps:</strong> {currentRollback.failedSteps.length}</div>
              {currentRollback.errors.length > 0 && (
                <div>
                  <strong>Errors:</strong>
                  <ul className="list-disc list-inside ml-4">
                    {currentRollback.errors.map((error, index) => (
                      <li key={index} className="text-red-700">{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Current Status: {realTimeData.systemHealth.status}</h4>
              {realTimeData.systemHealth.recommendations.length > 0 && (
                <div>
                  <strong>Current Recommendations:</strong>
                  <ul className="list-disc list-inside ml-4">
                    {realTimeData.systemHealth.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ButtonSystemHealthDashboard;