'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiCallWithCSRF } from '@/lib/csrfUtils';

interface Schedule {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  contentId?: string;
  scheduleType: 'absolute' | 'relative' | 'conditional' | 'manual';
  triggerTime?: string;
  status: string;
  priority: number;
  executionCount: number;
  nextExecutionAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleJob {
  id: string;
  scheduleId: string;
  jobType: string;
  status: string;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount: number;
  errorMessage?: string;
  result?: any;
}

interface SchedulerStatus {
  isRunning: boolean;
  activeJobs: number;
  metrics: {
    totalJobsProcessed: number;
    successfulJobs: number;
    failedJobs: number;
    averageExecutionTime: number;
    lastHealthCheck: string;
    isHealthy: boolean;
  };
}

export default function SchedulingManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [recentJobs, setRecentJobs] = useState<ScheduleJob[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'jobs' | 'status' | 'create'>('schedules');
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    contentType: 'chapter',
    contentId: '',
    scheduleType: 'absolute' as const,
    triggerTime: '',
    targetAudience: '{}',
    priority: 5
  });

  useEffect(() => {
    loadSchedules();
    loadRecentJobs();
    loadSchedulerStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadSchedules();
      loadRecentJobs();
      loadSchedulerStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await apiCallWithCSRF('/api/scheduler/schedules');
      const data = await response.json();
      if (data.success) {
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadRecentJobs = async () => {
    try {
      const response = await apiCallWithCSRF('/api/scheduler/jobs?limit=50');
      const data = await response.json();
      if (data.success) {
        setRecentJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadSchedulerStatus = async () => {
    try {
      const response = await apiCallWithCSRF('/api/scheduler/status');
      const data = await response.json();
      if (data.success) {
        setSchedulerStatus(data.status);
      }
    } catch (error) {
      console.error('Error loading scheduler status:', error);
    }
  };

  const createSchedule = async () => {
    try {
      setLoading(true);
      const response = await apiCallWithCSRF('/api/scheduler/schedules', {
        method: 'POST',
        body: JSON.stringify({
          ...newSchedule,
          triggerTime: newSchedule.triggerTime ? new Date(newSchedule.triggerTime).toISOString() : null,
          targetAudience: newSchedule.targetAudience ? JSON.parse(newSchedule.targetAudience) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewSchedule({
          title: '',
          description: '',
          contentType: 'chapter',
          contentId: '',
          scheduleType: 'absolute',
          triggerTime: '',
          targetAudience: '{}',
          priority: 5
        });
        setActiveTab('schedules');
        loadSchedules();
        alert('Schedule created successfully!');
      } else {
        alert('Error creating schedule: ' + data.message);
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule');
    } finally {
      setLoading(false);
    }
  };

  const triggerSchedule = async (scheduleId: string) => {
    try {
      const response = await apiCallWithCSRF(`/api/scheduler/schedules/${scheduleId}/trigger`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        alert('Schedule triggered successfully!');
        loadSchedules();
        loadRecentJobs();
      } else {
        alert('Error triggering schedule: ' + data.message);
      }
    } catch (error) {
      console.error('Error triggering schedule:', error);
      alert('Error triggering schedule');
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await apiCallWithCSRF(`/api/scheduler/schedules/${scheduleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        alert('Schedule deleted successfully!');
        loadSchedules();
      } else {
        alert('Error deleting schedule: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error deleting schedule');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'completed': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'retrying': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
              Content Scheduling Manager
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Orchestrate your content releases with precision timing and intelligent automation
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-center">
            <div className="inline-flex bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-1.5 shadow-lg shadow-slate-900/5">
              {[
                { id: 'schedules', label: 'Active Schedules', count: schedules.length, icon: '📅' },
                { id: 'jobs', label: 'Job History', count: recentJobs.length, icon: '⚡' },
                { id: 'status', label: 'System Status', icon: '📊' },
                { id: 'create', label: 'Create Schedule', icon: '✨' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform translate-y-[-1px]'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        activeTab === tab.id 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Active Content Schedules</h2>
              <Button 
                onClick={loadSchedules}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="mr-2">🔄</span>
                Refresh
              </Button>
            </div>

            <div className="grid gap-6">
              {schedules.map((schedule) => (
                <Card key={schedule.id} className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-slate-900/10 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-2">{schedule.title}</h3>
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                              schedule.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                : schedule.status === 'paused'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : schedule.status === 'completed'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : schedule.status === 'failed'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {schedule.status === 'active' && '🟢'} 
                              {schedule.status === 'paused' && '🟡'}
                              {schedule.status === 'completed' && '🔵'}
                              {schedule.status === 'failed' && '🔴'}
                              {schedule.status === 'cancelled' && '⚪'}
                              {schedule.status}
                            </span>
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                              📄 {schedule.contentType}
                            </span>
                            <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-200">
                              Priority {schedule.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {schedule.description && (
                        <p className="text-slate-600 mb-6 leading-relaxed">{schedule.description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Schedule Type</span>
                          <p className="text-slate-900 font-medium capitalize">{schedule.scheduleType}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Next Execution</span>
                          <p className="text-slate-900 font-medium">
                            {schedule.nextExecutionAt ? formatDate(schedule.nextExecutionAt) : 'Not scheduled'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Executions</span>
                          <p className="text-slate-900 font-medium">{schedule.executionCount} times</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Content ID</span>
                          <p className="text-slate-900 font-medium">{schedule.contentId || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 ml-6">
                      <Button
                        size="sm"
                        onClick={() => triggerSchedule(schedule.id)}
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        ⚡ Trigger Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSchedule(schedule)}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-4 py-2 rounded-lg transition-all duration-300"
                      >
                        👁️ View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSchedule(schedule.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold px-4 py-2 rounded-lg transition-all duration-300"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {schedules.length === 0 && (
                <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-12 text-center shadow-lg">
                  <div className="max-w-md mx-auto">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Schedules Yet</h3>
                    <p className="text-slate-600 mb-6">Create your first schedule to begin automating your content releases with precision timing.</p>
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      ✨ Create First Schedule
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Job Execution History</h2>
              <Button 
                onClick={loadRecentJobs}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="mr-2">🔄</span>
                Refresh
              </Button>
            </div>

            <div className="grid gap-4">
              {recentJobs.map((job) => (
                <Card key={job.id} className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-xl p-6 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-slate-900/10 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-100">
                            <span className="text-lg">⚡</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{job.jobType}</h3>
                            <p className="text-sm text-slate-500">Job ID: {job.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                            job.status === 'pending' 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : job.status === 'processing'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : job.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : job.status === 'failed'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : job.status === 'retrying'
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {job.status === 'pending' && '🟡'} 
                            {job.status === 'processing' && '🔵'}
                            {job.status === 'completed' && '🟢'}
                            {job.status === 'failed' && '🔴'}
                            {job.status === 'retrying' && '🟠'}
                            {job.status}
                          </span>
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                            Attempt #{job.attemptCount}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Scheduled For</span>
                          <p className="text-slate-900 font-medium">{formatDate(job.scheduledFor)}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Started At</span>
                          <p className="text-slate-900 font-medium">
                            {job.startedAt ? formatDate(job.startedAt) : 'Not started'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Completed At</span>
                          <p className="text-slate-900 font-medium">
                            {job.completedAt ? formatDate(job.completedAt) : 'Not completed'}
                          </p>
                        </div>
                      </div>

                      {job.errorMessage && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <span className="text-red-500 text-lg">⚠️</span>
                            <div>
                              <span className="font-semibold text-red-700">Error Details:</span>
                              <p className="text-red-600 mt-1 leading-relaxed">{job.errorMessage}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {job.result && (
                        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <span className="text-emerald-500 text-lg">✅</span>
                            <div>
                              <span className="font-semibold text-emerald-700">Execution Result:</span>
                              <pre className="text-emerald-600 mt-1 text-sm">{JSON.stringify(job.result, null, 2)}</pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {recentJobs.length === 0 && (
                <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-12 text-center shadow-lg">
                  <div className="max-w-md mx-auto">
                    <div className="text-6xl mb-4">⚡</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Recent Jobs</h3>
                    <p className="text-slate-600">Job execution history will appear here as your schedules begin running.</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && schedulerStatus && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-slate-900">System Health & Performance</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-emerald-100">
                    <span className="text-2xl">🔧</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">System Status</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Scheduler Running</span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${schedulerStatus.isRunning ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span className={`font-bold ${schedulerStatus.isRunning ? 'text-emerald-700' : 'text-red-700'}`}>
                        {schedulerStatus.isRunning ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Active Jobs</span>
                    <span className="text-slate-900 font-bold text-lg">{schedulerStatus.activeJobs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Health Status</span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${schedulerStatus.metrics.isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span className={`font-bold ${schedulerStatus.metrics.isHealthy ? 'text-emerald-700' : 'text-red-700'}`}>
                        {schedulerStatus.metrics.isHealthy ? 'Healthy' : 'Unhealthy'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-blue-100">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Job Metrics</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Total Processed</span>
                    <span className="text-slate-900 font-bold text-lg">{schedulerStatus.metrics.totalJobsProcessed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Successful</span>
                    <span className="text-emerald-700 font-bold text-lg">{schedulerStatus.metrics.successfulJobs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Failed</span>
                    <span className="text-red-700 font-bold text-lg">{schedulerStatus.metrics.failedJobs}</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-purple-100">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Performance</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Avg Execution</span>
                    <span className="text-slate-900 font-bold text-lg">{Math.round(schedulerStatus.metrics.averageExecutionTime)}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Success Rate</span>
                    <div className="text-right">
                      <span className="text-slate-900 font-bold text-lg">
                        {schedulerStatus.metrics.totalJobsProcessed > 0
                          ? Math.round((schedulerStatus.metrics.successfulJobs / schedulerStatus.metrics.totalJobsProcessed) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Last Check</span>
                    <span className="text-slate-900 font-bold text-sm">
                      {formatDate(schedulerStatus.metrics.lastHealthCheck)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Performance Chart Area */}
            <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Scheduler Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-slate-900">{schedulerStatus.activeJobs}</div>
                  <div className="text-sm text-slate-600 font-medium">Active Jobs</div>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-700">{schedulerStatus.metrics.successfulJobs}</div>
                  <div className="text-sm text-slate-600 font-medium">Successful</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-700">{schedulerStatus.metrics.failedJobs}</div>
                  <div className="text-sm text-slate-600 font-medium">Failed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-700">{Math.round(schedulerStatus.metrics.averageExecutionTime)}</div>
                  <div className="text-sm text-slate-600 font-medium">Avg Time (ms)</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Create Schedule Tab */}
        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Create New Schedule</h2>
              <p className="text-slate-600">Configure automatic content releases with precision timing</p>
            </div>

            <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 shadow-lg">
              <div className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    Basic Information
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Schedule Title *
                      </label>
                      <input
                        type="text"
                        value={newSchedule.title}
                        onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium"
                        placeholder="e.g., Chapter 3 Release, Weekly Poll Launch"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Description
                      </label>
                      <textarea
                        value={newSchedule.description}
                        onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium"
                        rows={3}
                        placeholder="Describe what this schedule will accomplish..."
                      />
                    </div>
                  </div>
                </div>

                {/* Content Configuration */}
                <div className="space-y-6 border-t border-slate-200 pt-8">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Content Configuration
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Content Type *
                      </label>
                      <div className="relative">
                        <select
                          value={newSchedule.contentType}
                          onChange={(e) => setNewSchedule({ ...newSchedule, contentType: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium appearance-none"
                        >
                          <option value="chapter">📖 Chapter</option>
                          <option value="poll">📊 Poll</option>
                          <option value="notification">🔔 Notification</option>
                          <option value="certificate">🏆 Certificate</option>
                          <option value="event">📅 Event</option>
                          <option value="memory">💭 Memory</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Content ID
                      </label>
                      <input
                        type="text"
                        value={newSchedule.contentId}
                        onChange={(e) => setNewSchedule({ ...newSchedule, contentId: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium"
                        placeholder="e.g., chapter-3, poll-weekly-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Scheduling Configuration */}
                <div className="space-y-6 border-t border-slate-200 pt-8">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    Scheduling Configuration
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Schedule Type *
                      </label>
                      <div className="relative">
                        <select
                          value={newSchedule.scheduleType}
                          onChange={(e) => setNewSchedule({ ...newSchedule, scheduleType: e.target.value as any })}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium appearance-none"
                        >
                          <option value="absolute">🕐 Absolute Time</option>
                          <option value="relative">📈 Relative to Event</option>
                          <option value="conditional">🔀 Conditional</option>
                          <option value="manual">👆 Manual Trigger</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Priority Level (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newSchedule.priority}
                        onChange={(e) => setNewSchedule({ ...newSchedule, priority: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium"
                        placeholder="5"
                      />
                    </div>
                  </div>

                  {newSchedule.scheduleType === 'absolute' && (
                    <div className="mt-6">
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Trigger Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={newSchedule.triggerTime}
                        onChange={(e) => setNewSchedule({ ...newSchedule, triggerTime: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                <div className="space-y-6 border-t border-slate-200 pt-8">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-xl">⚙️</span>
                    Advanced Settings
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      Target Audience Configuration (JSON)
                    </label>
                    <textarea
                      value={newSchedule.targetAudience}
                      onChange={(e) => setNewSchedule({ ...newSchedule, targetAudience: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium font-mono text-sm"
                      rows={4}
                  placeholder='{"userType": "all"} or {"completedChapters": ["chapter-1"]}'
                />
              </div>

                {/* Action Buttons */}
                <div className="border-t border-slate-200 pt-8">
                  <div className="flex gap-4">
                    <Button
                      onClick={createSchedule}
                      disabled={loading || !newSchedule.title}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            Creating Schedule...
                          </>
                        ) : (
                          <>
                            <span className="text-lg">✨</span>
                            Create Schedule
                          </>
                        )}
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('schedules')}
                      className="px-8 py-4 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-semibold rounded-xl transition-all duration-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
        </div>
      )}

        {/* Schedule Details Modal */}
        {selectedSchedule && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="max-w-3xl w-full max-h-[80vh] overflow-y-auto bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900">{selectedSchedule.title}</h3>
                <button
                  onClick={() => setSelectedSchedule(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Description</span>
                  <p className="text-slate-700 mt-1 leading-relaxed">{selectedSchedule.description || 'No description provided'}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Content Type</span>
                    <p className="text-slate-900 font-medium capitalize">{selectedSchedule.contentType}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Content ID</span>
                    <p className="text-slate-900 font-medium">{selectedSchedule.contentId || 'Not specified'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Schedule Type</span>
                    <p className="text-slate-900 font-medium capitalize">{selectedSchedule.scheduleType}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Status</span>
                    <p className={`font-bold capitalize ${
                      selectedSchedule.status === 'active' ? 'text-emerald-700' :
                      selectedSchedule.status === 'paused' ? 'text-amber-700' :
                      selectedSchedule.status === 'completed' ? 'text-blue-700' :
                      selectedSchedule.status === 'failed' ? 'text-red-700' : 'text-slate-700'
                    }`}>{selectedSchedule.status}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Priority</span>
                    <p className="text-slate-900 font-medium">{selectedSchedule.priority}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Executions</span>
                    <p className="text-slate-900 font-medium">{selectedSchedule.executionCount} times</p>
                  </div>
              </div>

              <div>
                <span className="font-medium text-gray-700">Next Execution:</span>
                <p className="text-gray-600">
                  {selectedSchedule.nextExecutionAt ? formatDate(selectedSchedule.nextExecutionAt) : 'Not scheduled'}
                </p>
              </div>

              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-600">{formatDate(selectedSchedule.createdAt)}</p>
              </div>

              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <p className="text-gray-600">{formatDate(selectedSchedule.updatedAt)}</p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => {
                    triggerSchedule(selectedSchedule.id);
                    setSelectedSchedule(null);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Trigger Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedSchedule(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
    </div>
  );
}