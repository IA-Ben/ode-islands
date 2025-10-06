"use client";

import { Settings, Bell, Shield, Palette, Globe } from 'lucide-react';
import { surfaces, gradients, buttons } from '@/lib/admin/designTokens';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${gradients.primary} flex items-center justify-center shadow-lg`}>
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Settings
              </h1>
              <p className="text-slate-400 mt-1">
                Configure system-wide settings and preferences
              </p>
            </div>
          </div>
        </div>

        <div className={`${surfaces.cardGlass} rounded-xl p-8 border border-slate-700/50`}>
          <div className="text-center py-12">
            <div className={`w-24 h-24 rounded-2xl ${gradients.primary} flex items-center justify-center mx-auto mb-6 shadow-xl`}>
              <Settings className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Settings Coming Soon
            </h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              The Settings feature is currently under development. This central hub will allow you to configure all aspects of your application.
            </p>
            <div className={`${surfaces.subtleGlass} rounded-xl p-6 border border-slate-700/50 max-w-2xl mx-auto`}>
              <h3 className="text-lg font-semibold text-white mb-4">Planned Settings Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${surfaces.subtleGlass} flex items-center justify-center border border-slate-700/50 flex-shrink-0`}>
                    <Bell className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Notifications</h4>
                    <p className="text-sm text-slate-400">Configure alerts and email preferences</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${surfaces.subtleGlass} flex items-center justify-center border border-slate-700/50 flex-shrink-0`}>
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Security</h4>
                    <p className="text-sm text-slate-400">Manage access controls and authentication</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${surfaces.subtleGlass} flex items-center justify-center border border-slate-700/50 flex-shrink-0`}>
                    <Palette className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Appearance</h4>
                    <p className="text-sm text-slate-400">Customize themes and branding</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${surfaces.subtleGlass} flex items-center justify-center border border-slate-700/50 flex-shrink-0`}>
                    <Globe className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Localization</h4>
                    <p className="text-sm text-slate-400">Set language and regional preferences</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
