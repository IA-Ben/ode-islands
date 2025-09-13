'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdvancedAnalyticsProps {
  dateRange: { startDate: string; endDate: string };
  eventId: string;
  realTimeEnabled: boolean;
}

interface FilterOptions {
  contentType: string;
  userSegment: string;
  metric: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

interface InsightData {
  title: string;
  description: string;
  metric: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  actionable: boolean;
}

interface PredictiveData {
  metric: string;
  current: number;
  predicted: number;
  timeframe: string;
  confidence: number;
}

interface ComparisonData {
  metric: string;
  currentPeriod: number;
  previousPeriod: number;
  percentageChange: number;
}

export default function AdvancedAnalytics({ dateRange, eventId, realTimeEnabled }: AdvancedAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'insights' | 'predictive' | 'comparison' | 'export'>('insights');
  const [filters, setFilters] = useState<FilterOptions>({
    contentType: 'all',
    userSegment: 'all',
    metric: 'engagement',
    granularity: 'day'
  });

  // Real data from API
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [predictiveData, setPredictiveData] = useState<PredictiveData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch analytics data from API
  const fetchAnalyticsData = async (type: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        type,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(eventId && { eventId })
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} analytics`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || `Failed to load ${type} data`);
      }
      
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${type} analytics`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load data for all analytics types
  const loadAllAnalytics = async () => {
    if (dataLoaded) return;
    
    setLoading(true);
    try {
      const [insightsResult, predictiveResult, comparisonResult] = await Promise.all([
        fetchAnalyticsData('insights'),
        fetchAnalyticsData('predictive'),
        fetchAnalyticsData('comparison')
      ]);

      if (insightsResult?.insights) {
        setInsights(insightsResult.insights);
      }
      
      if (predictiveResult?.predictiveData) {
        setPredictiveData(predictiveResult.predictiveData);
      }
      
      if (comparisonResult?.comparisonData) {
        setComparisonData(comparisonResult.comparisonData);
      }
      
      setDataLoaded(true);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or date range changes
  useEffect(() => {
    setDataLoaded(false);
  }, [dateRange.startDate, dateRange.endDate, eventId]);

  useEffect(() => {
    loadAllAnalytics();
  }, [dataLoaded, dateRange, eventId]);

  const handleExport = async (format: 'csv' | 'json') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'export',
        exportType: selectedView === 'export' ? 'overview' : selectedView,
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(eventId && { eventId })
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get the filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `analytics_export_${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when filters change
  const handleFilterChange = () => {
    setDataLoaded(false);
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header with View Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
        <div className="flex items-center gap-2">
          {['insights', 'predictive', 'comparison', 'export'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view as any)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedView === view
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Filters & Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Content Type</label>
              <select
                value={filters.contentType}
                onChange={(e) => {
                  setFilters({...filters, contentType: e.target.value});
                  handleFilterChange();
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="all">All Content</option>
                <option value="chapter">Chapters</option>
                <option value="poll">Polls</option>
                <option value="video">Videos</option>
                <option value="ar">AR Content</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">User Segment</label>
              <select
                value={filters.userSegment}
                onChange={(e) => {
                  setFilters({...filters, userSegment: e.target.value});
                  handleFilterChange();
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="all">All Users</option>
                <option value="new">New Users</option>
                <option value="returning">Returning Users</option>
                <option value="high_engagement">High Engagement</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Primary Metric</label>
              <select
                value={filters.metric}
                onChange={(e) => {
                  setFilters({...filters, metric: e.target.value});
                  handleFilterChange();
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="engagement">Engagement</option>
                <option value="completion">Completion Rate</option>
                <option value="retention">Retention</option>
                <option value="satisfaction">Satisfaction</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Time Granularity</label>
              <select
                value={filters.granularity}
                onChange={(e) => {
                  setFilters({...filters, granularity: e.target.value as any});
                  handleFilterChange();
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="hour">Hourly</option>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights View */}
      {selectedView === 'insights' && (
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">🔬 Automated Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-400">Loading insights...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-red-400">{error}</div>
                </div>
              ) : insights.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-400">No insights available for the selected date range.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                  <div key={index} className="p-4 bg-gray-800 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-white flex items-center gap-2 mb-2">
                          {getTrendIcon(insight.trend)}
                          {insight.title}
                          {insight.actionable && <span className="text-xs bg-orange-600 px-2 py-1 rounded">ACTIONABLE</span>}
                        </h4>
                        <p className="text-gray-300 text-sm">{insight.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold ${getTrendColor(insight.trend)}`}>
                          {insight.metric}%
                        </div>
                        <div className={`text-sm ${getConfidenceColor(insight.confidence)}`}>
                          {insight.confidence}% confidence
                        </div>
                      </div>
                    </div>
                    
                    {insight.actionable && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Take Action
                        </Button>
                        <Button size="sm" variant="outline" className="text-gray-300">
                          Learn More
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Predictive View */}
      {selectedView === 'predictive' && (
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">🔮 Predictive Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {predictiveData.map((prediction, index) => (
                  <div key={index} className="p-4 bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-white mb-3">{prediction.metric}</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Current</span>
                        <span className="text-lg font-bold text-white">
                          {typeof prediction.current === 'number' && prediction.current > 100 
                            ? formatNumber(prediction.current)
                            : prediction.current + (prediction.metric.includes('Rate') || prediction.metric.includes('Duration') ? (prediction.metric.includes('Duration') ? 'm' : '%') : '')
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Predicted</span>
                        <span className="text-lg font-bold text-blue-400">
                          {typeof prediction.predicted === 'number' && prediction.predicted > 100 
                            ? formatNumber(prediction.predicted)
                            : prediction.predicted + (prediction.metric.includes('Rate') || prediction.metric.includes('Duration') ? (prediction.metric.includes('Duration') ? 'm' : '%') : '')
                          }
                        </span>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{prediction.timeframe}</span>
                          <span className={getConfidenceColor(prediction.confidence)}>
                            {prediction.confidence}% confidence
                          </span>
                        </div>
                      </div>
                      
                      {/* Change indicator */}
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${prediction.predicted > prediction.current ? 'text-green-400' : 'text-red-400'}`}>
                          {prediction.predicted > prediction.current ? '📈' : '📉'}
                          {((prediction.predicted - prediction.current) / prediction.current * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400">change expected</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">📊 Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-lg font-semibold text-white mb-2">Advanced Trend Visualization</h3>
                <p className="text-gray-400 mb-4">
                  Interactive charts with predictive modeling would be displayed here.
                  This would include machine learning-powered forecasting and anomaly detection.
                </p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Configure Trend Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison View */}
      {selectedView === 'comparison' && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">📊 Period Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comparisonData.map((comparison, index) => (
                <div key={index} className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">{comparison.metric}</h4>
                    <div className={`text-lg font-bold flex items-center gap-2 ${
                      comparison.percentageChange > 0 ? 'text-green-400' : 
                      comparison.percentageChange < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {comparison.percentageChange > 0 ? '📈' : comparison.percentageChange < 0 ? '📉' : '➡️'}
                      {Math.abs(comparison.percentageChange).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Current Period</div>
                      <div className="text-xl font-bold text-white">
                        {comparison.currentPeriod}{comparison.metric.includes('Duration') ? 'm' : 
                         comparison.metric.includes('Rate') || comparison.metric.includes('Participation') ? '%' : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Previous Period</div>
                      <div className="text-xl font-bold text-gray-400">
                        {comparison.previousPeriod}{comparison.metric.includes('Duration') ? 'm' : 
                         comparison.metric.includes('Rate') || comparison.metric.includes('Participation') ? '%' : ''}
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual comparison bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-xs text-gray-400">Current</div>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(comparison.currentPeriod / Math.max(comparison.currentPeriod, comparison.previousPeriod)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-xs text-gray-400">Previous</div>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gray-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(comparison.previousPeriod / Math.max(comparison.currentPeriod, comparison.previousPeriod)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export View */}
      {selectedView === 'export' && (
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">📊 Export Analytics Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CSV Export */}
                <div className="p-4 bg-gray-800 rounded-lg text-center">
                  <div className="text-4xl mb-3">📄</div>
                  <h4 className="font-medium text-white mb-2">CSV Export</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Export raw data in CSV format for spreadsheet analysis
                  </p>
                  <Button 
                    onClick={() => handleExport('csv')}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>

                {/* PDF Export */}
                <div className="p-4 bg-gray-800 rounded-lg text-center">
                  <div className="text-4xl mb-3">📑</div>
                  <h4 className="font-medium text-white mb-2">PDF Report</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Generate a comprehensive PDF report with visualizations
                  </p>
                  <Button 
                    onClick={() => handleExport('pdf')}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {loading ? 'Generating...' : 'Generate PDF'}
                  </Button>
                </div>

                {/* JSON Export */}
                <div className="p-4 bg-gray-800 rounded-lg text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <h4 className="font-medium text-white mb-2">JSON Data</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Export structured data in JSON format for API integration
                  </p>
                  <Button 
                    onClick={() => handleExport('json')}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Exporting...' : 'Export JSON'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">⚙️ Export Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Include Data</label>
                    <div className="space-y-2">
                      {['Raw Analytics', 'Insights', 'Predictions', 'Comparisons'].map((item) => (
                        <label key={item} className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked className="text-blue-600" />
                          <span className="text-sm text-white">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Format Options</label>
                    <div className="space-y-2">
                      {['Include Charts', 'Anonymize Data', 'Include Metadata', 'Compress Files'].map((item) => (
                        <label key={item} className="flex items-center gap-2">
                          <input type="checkbox" className="text-blue-600" />
                          <span className="text-sm text-white">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-red-300">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Refresh Info */}
      <div className="text-center text-sm text-gray-500">
        Advanced analytics • Powered by machine learning insights
        {realTimeEnabled && ' • Real-time data processing active'}
      </div>
    </div>
  );
}