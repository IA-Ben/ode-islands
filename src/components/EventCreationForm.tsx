"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EventCreationFormProps {
  onEventCreated: () => void;
  onCancel: () => void;
  theme: any;
}

export default function EventCreationForm({ onEventCreated, onCancel, theme }: EventCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    settings: {
      allowPolls: true,
      allowQA: true,
      allowChat: false,
      moderationRequired: true,
      maxParticipants: null,
      theme: 'default'
    }
  });

  // Get CSRF token from cookies
  const getCsrfToken = (): string => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf-token') {
        return decodeURIComponent(value);
      }
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate dates
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endTime);
      
      if (startDate >= endDate) {
        throw new Error('End time must be after start time');
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: formData.startTime,
          endTime: formData.endTime,
          settings: formData.settings
        })
      });

      if (response.ok) {
        onEventCreated();
        onCancel(); // Return to overview
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingsChange = (setting: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }));
  };

  // Generate default times (current time + 1 hour for start, + 3 hours for end)
  const getDefaultTimes = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    const end = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3 hours
    
    return {
      start: start.toISOString().slice(0, 16), // Format for datetime-local input
      end: end.toISOString().slice(0, 16)
    };
  };

  const defaultTimes = getDefaultTimes();

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle style={{ color: theme.colors.primary }}>Create New Event</CardTitle>
          <p className="text-white/60">
            Set up a new live event with interactive features for your audience.
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Basic event details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/15"
                    placeholder="Enter event title..."
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime || defaultTimes.start}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:bg-white/15"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime || defaultTimes.end}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:bg-white/15"
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/15 resize-none"
                    placeholder="Describe your event..."
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Max Participants (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.settings.maxParticipants || ''}
                    onChange={(e) => handleSettingsChange('maxParticipants', e.target.value ? parseInt(e.target.value) : null)}
                    min="1"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/15"
                    placeholder="No limit"
                  />
                </div>
              </div>
            </div>

            {/* Event features */}
            <div>
              <h3 className="text-white text-lg font-medium mb-4">Event Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <div className="text-white font-medium">Live Polls</div>
                    <div className="text-white/60 text-sm">Enable interactive polling during the event</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.settings.allowPolls}
                    onChange={(e) => handleSettingsChange('allowPolls', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <div className="text-white font-medium">Q&A Session</div>
                    <div className="text-white/60 text-sm">Allow audience questions and responses</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.settings.allowQA}
                    onChange={(e) => handleSettingsChange('allowQA', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <div className="text-white font-medium">Live Chat</div>
                    <div className="text-white/60 text-sm">Enable real-time chat messages</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.settings.allowChat}
                    onChange={(e) => handleSettingsChange('allowChat', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <div className="text-white font-medium">Moderation Required</div>
                    <div className="text-white/60 text-sm">Require admin approval for user content</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.settings.moderationRequired}
                    onChange={(e) => handleSettingsChange('moderationRequired', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex gap-4 pt-6 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="border-white/20 text-white/70 hover:bg-white/5"
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting || !formData.title || !formData.startTime || !formData.endTime}
                style={{ 
                  backgroundColor: theme.colors.primary, 
                  color: theme.colors.background,
                  opacity: (isSubmitting || !formData.title || !formData.startTime || !formData.endTime) ? 0.5 : 1
                }}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}