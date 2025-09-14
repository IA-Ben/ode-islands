'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationSoundService } from '@/lib/notificationSounds';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [settings, setSettings] = useState({
    soundsEnabled: true,
    vibrationEnabled: true,
    browserNotifications: true,
  });

  useEffect(() => {
    // Load current settings
    const currentSettings = NotificationSoundService.getSettings();
    setSettings({
      ...currentSettings,
      browserNotifications: Notification.permission === 'granted',
    });
  }, [isOpen]);

  const handleSoundsToggle = (enabled: boolean) => {
    NotificationSoundService.setSoundsEnabled(enabled);
    setSettings(prev => ({ ...prev, soundsEnabled: enabled }));
  };

  const handleVibrationToggle = (enabled: boolean) => {
    NotificationSoundService.setVibrationEnabled(enabled);
    setSettings(prev => ({ ...prev, vibrationEnabled: enabled }));
  };

  const handleBrowserNotificationToggle = async () => {
    if (Notification.permission === 'granted') {
      setSettings(prev => ({ ...prev, browserNotifications: false }));
    } else {
      const permission = await Notification.requestPermission();
      setSettings(prev => ({ 
        ...prev, 
        browserNotifications: permission === 'granted' 
      }));
    }
  };

  const testNotification = async () => {
    await NotificationSoundService.playNotificationFeedback('default', {
      sound: settings.soundsEnabled,
      vibration: settings.vibrationEnabled,
      flash: true,
      browserNotification: settings.browserNotifications ? {
        title: 'Test Notification',
        options: {
          body: 'This is a test notification from The Ode Islands.',
          icon: '/favicon.ico',
        }
      } : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden">
        {/* Header - Professional Design */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">Notification Preferences</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings - Professional Design */}
        <div className="p-8 space-y-8">
          {/* Sound Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.8 14.2l3.5-2.7c.3-.2.7-.3 1.1-.3H13a1 1 0 001-1V9a1 1 0 00-1-1h-2.6c-.4 0-.8-.1-1.1-.3L5.8 5"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-gray-900 font-semibold">Notification Sounds</h4>
                <p className="text-gray-600 text-sm">Play audio alerts when notifications arrive</p>
              </div>
            </div>
            <button
              onClick={() => handleSoundsToggle(!settings.soundsEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                settings.soundsEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  settings.soundsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Vibration Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5c3.5 0 6.5-1.7 6.5-3.8S15.5 11 12 11s-6.5 1.7-6.5 3.8 3 3.7 6.5 3.7zM12 11V7m0 0l3-3m-3 3L9 4"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-gray-900 font-semibold">Vibration</h4>
                <p className="text-gray-600 text-sm">Vibrate device for important notifications</p>
              </div>
            </div>
            <button
              onClick={() => handleVibrationToggle(!settings.vibrationEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                settings.vibrationEnabled ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-gray-900 font-semibold">Browser Notifications</h4>
                <p className="text-gray-600 text-sm">Show system notifications in your browser</p>
              </div>
            </div>
            <button
              onClick={handleBrowserNotificationToggle}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                settings.browserNotifications ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  settings.browserNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Test Notification - Professional Design */}
          <div className="pt-6 border-t border-gray-100">
            <button
              onClick={testNotification}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9.5a4.5 4.5 0 00-9 0V12L1 17h5m4 0v1a3 3 0 006 0v-1m-6 0H9" />
              </svg>
              <span>Test Notification</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;