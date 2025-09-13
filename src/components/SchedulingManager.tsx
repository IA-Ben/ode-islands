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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Scheduling Manager</h1>
        <p className="text-gray-600">Manage scheduled content releases for The Ode Islands experience</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'schedules', label: 'Schedules', count: schedules.length },
          { id: 'jobs', label: 'Recent Jobs', count: recentJobs.length },
          { id: 'status', label: 'Scheduler Status' },
          { id: 'create', label: 'Create Schedule' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Content Schedules</h2>
            <Button onClick={loadSchedules}>Refresh</Button>
          </div>

          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{schedule.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                        {schedule.status}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {schedule.contentType}
                      </span>
                    </div>
                    
                    {schedule.description && (
                      <p className="text-gray-600 mb-3">{schedule.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Schedule Type:</span>
                        <p className="text-gray-600">{schedule.scheduleType}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Next Execution:</span>
                        <p className="text-gray-600">
                          {schedule.nextExecutionAt ? formatDate(schedule.nextExecutionAt) : 'Not scheduled'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Executions:</span>
                        <p className="text-gray-600">{schedule.executionCount}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Priority:</span>
                        <p className="text-gray-600">{schedule.priority}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => triggerSchedule(schedule.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Trigger Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSchedule(schedule)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSchedule(schedule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {schedules.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No schedules found. Create your first schedule to get started!</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Job Executions</h2>
            <Button onClick={loadRecentJobs}>Refresh</Button>
          </div>

          <div className="grid gap-3">
            {recentJobs.map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">{job.jobType}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-sm text-gray-500">Attempt {job.attemptCount}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Scheduled:</span>
                        <p className="text-gray-600">{formatDate(job.scheduledFor)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Started:</span>
                        <p className="text-gray-600">
                          {job.startedAt ? formatDate(job.startedAt) : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Completed:</span>
                        <p className="text-gray-600">
                          {job.completedAt ? formatDate(job.completedAt) : 'Not completed'}
                        </p>
                      </div>
                    </div>

                    {job.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <span className="font-medium text-red-700">Error:</span>
                        <p className="text-red-600 text-sm">{job.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {recentJobs.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No recent job executions found.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Status Tab */}
      {activeTab === 'status' && schedulerStatus && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Scheduler Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Running:</span>
                  <span className={schedulerStatus.isRunning ? 'text-green-600' : 'text-red-600'}>
                    {schedulerStatus.isRunning ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active Jobs:</span>
                  <span>{schedulerStatus.activeJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Health Status:</span>
                  <span className={schedulerStatus.metrics.isHealthy ? 'text-green-600' : 'text-red-600'}>
                    {schedulerStatus.metrics.isHealthy ? 'Healthy' : 'Unhealthy'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Job Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Processed:</span>
                  <span>{schedulerStatus.metrics.totalJobsProcessed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful:</span>
                  <span className="text-green-600">{schedulerStatus.metrics.successfulJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="text-red-600">{schedulerStatus.metrics.failedJobs}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Avg Execution Time:</span>
                  <span>{Math.round(schedulerStatus.metrics.averageExecutionTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span>
                    {schedulerStatus.metrics.totalJobsProcessed > 0
                      ? Math.round((schedulerStatus.metrics.successfulJobs / schedulerStatus.metrics.totalJobsProcessed) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Health Check:</span>
                  <span className="text-sm">
                    {formatDate(schedulerStatus.metrics.lastHealthCheck)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Create Schedule Tab */}
      {activeTab === 'create' && (
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold mb-6">Create New Schedule</h2>

          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter schedule title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter schedule description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type *
                  </label>
                  <select
                    value={newSchedule.contentType}
                    onChange={(e) => setNewSchedule({ ...newSchedule, contentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="chapter">Chapter</option>
                    <option value="poll">Poll</option>
                    <option value="notification">Notification</option>
                    <option value="certificate">Certificate</option>
                    <option value="event">Event</option>
                    <option value="memory">Memory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content ID
                  </label>
                  <input
                    type="text"
                    value={newSchedule.contentId}
                    onChange={(e) => setNewSchedule({ ...newSchedule, contentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., chapter-1, poll-123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Type *
                  </label>
                  <select
                    value={newSchedule.scheduleType}
                    onChange={(e) => setNewSchedule({ ...newSchedule, scheduleType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="absolute">Absolute Time</option>
                    <option value="relative">Relative to Event</option>
                    <option value="conditional">Conditional</option>
                    <option value="manual">Manual Trigger</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newSchedule.priority}
                    onChange={(e) => setNewSchedule({ ...newSchedule, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {newSchedule.scheduleType === 'absolute' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trigger Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newSchedule.triggerTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, triggerTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience (JSON)
                </label>
                <textarea
                  value={newSchedule.targetAudience}
                  onChange={(e) => setNewSchedule({ ...newSchedule, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder='{"userType": "all"} or {"completedChapters": ["chapter-1"]}'
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={createSchedule}
                  disabled={loading || !newSchedule.title}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Creating...' : 'Create Schedule'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('schedules')}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Schedule Details Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">{selectedSchedule.title}</h3>
              <button
                onClick={() => setSelectedSchedule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-600">{selectedSchedule.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Content Type:</span>
                  <p className="text-gray-600">{selectedSchedule.contentType}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Content ID:</span>
                  <p className="text-gray-600">{selectedSchedule.contentId || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Schedule Type:</span>
                  <p className="text-gray-600">{selectedSchedule.scheduleType}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <p className={getStatusColor(selectedSchedule.status)}>{selectedSchedule.status}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Priority:</span>
                  <p className="text-gray-600">{selectedSchedule.priority}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Executions:</span>
                  <p className="text-gray-600">{selectedSchedule.executionCount}</p>
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
  );
}