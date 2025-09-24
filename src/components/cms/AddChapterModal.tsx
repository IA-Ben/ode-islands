'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AddChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChapterAdded: () => void;
}

export default function AddChapterModal({ isOpen, onClose, onChapterAdded }: AddChapterModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    hasAR: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chapters/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create chapter');
      }

      const result = await response.json();
      console.log('Chapter created:', result);
      
      onChapterAdded();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      summary: '',
      hasAR: false
    });
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add New Chapter</CardTitle>
              <Button variant="outline" onClick={onClose}>×</Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Chapter Title</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter chapter title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Summary</label>
                <textarea
                  required
                  className="w-full p-2 border border-gray-300 rounded-md h-24"
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Enter chapter summary or description"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasAR"
                  checked={formData.hasAR}
                  onChange={(e) => setFormData(prev => ({ ...prev, hasAR: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="hasAR" className="text-sm font-medium">
                  This chapter includes AR experiences
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating Chapter...' : 'Create Chapter'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}