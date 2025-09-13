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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/95 border border-white/20 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Notification Settings</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="p-6 space-y-6">
          {/* Sound Settings */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Notification Sounds</h4>
              <p className="text-white/60 text-sm">Play sound when notifications arrive</p>
            </div>
            <button
              onClick={() => handleSoundsToggle(!settings.soundsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.soundsEnabled ? 'bg-blue-600' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.soundsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Vibration Settings */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Vibration</h4>
              <p className="text-white/60 text-sm">Vibrate device for notifications</p>
            </div>
            <button
              onClick={() => handleVibrationToggle(!settings.vibrationEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.vibrationEnabled ? 'bg-blue-600' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Browser Notifications</h4>
              <p className="text-white/60 text-sm">Show system notifications</p>
            </div>
            <button
              onClick={handleBrowserNotificationToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.browserNotifications ? 'bg-blue-600' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.browserNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Test Notification */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={testNotification}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Test Notification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;