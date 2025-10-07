'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Users, Eye, Calendar, Download } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

type AnalyticsTab = 'overview' | 'engagement' | 'content' | 'events';

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'engagement' as const, label: 'User Engagement', icon: Users },
    { id: 'content' as const, label: 'Content Performance', icon: TrendingUp },
    { id: 'events' as const, label: 'Events', icon: Calendar },
  ];

  const stats = [
    { label: 'Total Users', value: '1,234', change: '+12%', icon: Users, trend: 'up' },
    { label: 'Page Views', value: '45.2K', change: '+8%', icon: Eye, trend: 'up' },
    { label: 'Active Events', value: '8', change: '+2', icon: Calendar, trend: 'up' },
    { label: 'Engagement Rate', value: '68%', change: '+5%', icon: TrendingUp, trend: 'up' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${colors.gradients.primary} flex items-center justify-center shadow-lg`}>
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Analytics
                </h1>
                <p className="text-slate-400 mt-1">
                  Track performance and user engagement metrics
                </p>
              </div>
            </div>
            <button className={components.buttonSecondary}>
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-fuchsia-600 text-white'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg ${surfaces.subtleGlass} flex items-center justify-center border border-slate-700/50`}>
                    <Icon className="w-5 h-5 text-fuchsia-400" />
                  </div>
                  <span className={`${components.badge} ${stat.trend === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className={`${surfaces.cardGlass} rounded-xl p-8 border border-slate-700/50`}>
          <div className="text-center py-12">
            <div className={`w-24 h-24 rounded-2xl ${colors.gradients.primary} flex items-center justify-center mx-auto mb-6 shadow-xl`}>
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Advanced Analytics Coming Soon
            </h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              Detailed analytics dashboards with real-time metrics, custom reports, and data visualization are currently under development.
            </p>
            <div className={`${surfaces.subtleGlass} rounded-xl p-6 border border-slate-700/50 max-w-2xl mx-auto`}>
              <h3 className="text-lg font-semibold text-white mb-4">Planned Analytics Features</h3>
              <ul className="text-left space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Real-time user activity tracking and monitoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Content performance metrics and engagement analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Event analytics with attendance and interaction data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Custom dashboards and exportable reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Advanced data visualization with charts and graphs</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
