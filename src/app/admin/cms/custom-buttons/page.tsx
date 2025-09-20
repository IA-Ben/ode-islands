'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';
import Link from 'next/link';

interface UnlockCondition {
  type: 'stamp-required' | 'task-required' | 'time-window' | 'geofence' | 'sign-in';
  stampId?: string;
  stampName?: string;
  taskId?: string;
  taskName?: string;
  startTime?: string;
  endTime?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

interface CustomButton {
  id: string;
  parentType: string;
  parentId: string;
  label: string;
  variant: 'primary' | 'secondary' | 'link' | 'ghost';
  icon?: string;
  destinationType: string;
  destinationId?: string;
  unlockConditions?: UnlockCondition[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface GroupedButtons {
  chapters: CustomButton[];
  subChapters: CustomButton[];
  storyCards: CustomButton[];
}

export default function CustomButtonsCMSPage() {
  const [buttons, setButtons] = useState<GroupedButtons>({
    chapters: [],
    subChapters: [],
    storyCards: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'chapters' | 'subChapters' | 'storyCards'>('chapters');
  const [editingButton, setEditingButton] = useState<CustomButton | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState<{
    parentType: string;
    parentId: string;
    label: string;
    variant: 'primary' | 'secondary' | 'link' | 'ghost';
    icon: string;
    destinationType: string;
    destinationId: string;
    unlockConditions: UnlockCondition[];
    order: number;
  }>({
    parentType: 'chapter',
    parentId: '',
    label: '',
    variant: 'primary',
    icon: '',
    destinationType: 'sub-chapter',
    destinationId: '',
    unlockConditions: [],
    order: 0
  });
  
  const [newCondition, setNewCondition] = useState<UnlockCondition>({
    type: 'sign-in'
  });

  const theme: ImmersiveTheme = {
    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
    title: '#ffffff',
    subtitle: '#e0f2fe',
    description: '#bae6fd',
    shadow: true
  };

  useEffect(() => {
    fetchCSRFToken();
    fetchButtons();
  }, []);

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
    }
  };

  const fetchButtons = async () => {
    try {
      const response = await fetch('/api/cms/custom-buttons', {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        setButtons(data);
      }
    } catch (error) {
      console.error('Error fetching buttons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csrfToken) {
      alert('Security token not available. Please refresh the page.');
      return;
    }

    try {
      const url = editingButton 
        ? '/api/custom-buttons' 
        : '/api/custom-buttons';
      
      const method = editingButton ? 'PUT' : 'POST';
      
      const body = editingButton
        ? { id: editingButton.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert(editingButton ? 'Button updated!' : 'Button created!');
        setShowForm(false);
        setEditingButton(null);
        resetForm();
        fetchButtons();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save button'}`);
      }
    } catch (error) {
      console.error('Error saving button:', error);
      alert('Failed to save button');
    }
  };

  const handleDelete = async (buttonId: string) => {
    if (!confirm('Are you sure you want to delete this button?')) return;
    
    if (!csrfToken) {
      alert('Security token not available. Please refresh the page.');
      return;
    }

    try {
      const response = await fetch(`/api/custom-buttons?id=${buttonId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert('Button deleted!');
        fetchButtons();
      } else {
        alert('Failed to delete button');
      }
    } catch (error) {
      console.error('Error deleting button:', error);
      alert('Failed to delete button');
    }
  };

  const handleEdit = (button: CustomButton) => {
    setEditingButton(button);
    setFormData({
      parentType: button.parentType,
      parentId: button.parentId,
      label: button.label,
      variant: button.variant,
      icon: button.icon || '',
      destinationType: button.destinationType,
      destinationId: button.destinationId || '',
      unlockConditions: button.unlockConditions || [],
      order: button.order
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      parentType: 'chapter',
      parentId: '',
      label: '',
      variant: 'primary',
      icon: '',
      destinationType: 'sub-chapter',
      destinationId: '',
      unlockConditions: [],
      order: 0
    });
    setEditingButton(null);
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      unlockConditions: [...formData.unlockConditions, { ...newCondition }]
    });
    setNewCondition({ type: 'sign-in' });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      unlockConditions: formData.unlockConditions.filter((_, i) => i !== index)
    });
  };

  const handleReorder = async (buttonList: CustomButton[]) => {
    if (!csrfToken) {
      alert('Security token not available. Please refresh the page.');
      return;
    }

    try {
      const response = await fetch('/api/cms/custom-buttons', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ reorderedButtons: buttonList }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        fetchButtons();
      }
    } catch (error) {
      console.error('Error reordering buttons:', error);
    }
  };

  const renderButtonList = (buttonList: CustomButton[]) => {
    if (buttonList.length === 0) {
      return <p className="text-white/60">No buttons configured for this section.</p>;
    }

    return (
      <div className="space-y-4">
        {buttonList.sort((a, b) => a.order - b.order).map((button, index) => (
          <Card key={button.id} className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    {button.icon && <span>{button.icon}</span>}
                    {button.label}
                  </h3>
                  <div className="text-white/60 text-sm mt-1">
                    <span className="mr-4">Type: {button.parentType}</span>
                    <span className="mr-4">Parent ID: {button.parentId}</span>
                    <span className="mr-4">Variant: {button.variant}</span>
                    <span>Destination: {button.destinationType}</span>
                  </div>
                  {button.unlockConditions && button.unlockConditions.length > 0 && (
                    <div className="text-white/60 text-sm mt-2">
                      Unlock conditions: {button.unlockConditions.map(c => c.type).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(button)}
                    className="text-white hover:bg-white/20"
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(button.id)}
                    className="text-red-400 hover:bg-red-900/20"
                  >
                    Delete
                  </Button>
                  {index > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const newList = [...buttonList];
                        [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
                        handleReorder(newList);
                      }}
                      className="text-white hover:bg-white/20"
                    >
                      ↑
                    </Button>
                  )}
                  {index < buttonList.length - 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const newList = [...buttonList];
                        [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
                        handleReorder(newList);
                      }}
                      className="text-white hover:bg-white/20"
                    >
                      ↓
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <ImmersivePageLayout
        title="Loading"
        subtitle="Custom Buttons Manager"
        description="Fetching button configurations..."
        theme={theme}
        animateIn={true}
      >
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </ImmersivePageLayout>
    );
  }

  return (
    <ImmersivePageLayout
      title="Custom Buttons Manager"
      subtitle="Configure Interactive Elements"
      description="Manage custom buttons across chapters, sub-chapters, and story cards"
      theme={theme}
      animateIn={true}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex gap-4">
          <Link href="/admin/cms">
            <Button variant="ghost" className="text-white hover:bg-white/20">
              ← Back to CMS
            </Button>
          </Link>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-white text-blue-700 hover:bg-blue-50"
          >
            + Create New Button
          </Button>
        </div>

        {showForm && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white">
                {editingButton ? 'Edit Button' : 'Create New Button'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-1">Parent Type</label>
                    <select 
                      value={formData.parentType}
                      onChange={(e) => setFormData({...formData, parentType: e.target.value})}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                    >
                      <option value="chapter">Chapter</option>
                      <option value="sub_chapter">Sub-Chapter</option>
                      <option value="story_card">Story Card</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-1">Parent ID</label>
                    <input 
                      type="text"
                      value={formData.parentId}
                      onChange={(e) => setFormData({...formData, parentId: e.target.value})}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40"
                      placeholder="Enter parent entity ID"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-1">Label</label>
                    <input 
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData({...formData, label: e.target.value})}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40"
                      placeholder="Button text"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-1">Variant</label>
                    <select 
                      value={formData.variant}
                      onChange={(e) => setFormData({...formData, variant: e.target.value as any})}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="link">Link</option>
                      <option value="ghost">Ghost</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-1">Icon (optional)</label>
                    <input 
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40"
                      placeholder="Icon name or emoji"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-1">Order</label>
                    <input 
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-1">Destination Type</label>
                    <select 
                      value={formData.destinationType}
                      onChange={(e) => setFormData({...formData, destinationType: e.target.value})}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                    >
                      <option value="sub-chapter">Sub-Chapter</option>
                      <option value="chapter">Chapter</option>
                      <option value="ar-item">AR Item</option>
                      <option value="event-route">Event Route</option>
                      <option value="wallet">Wallet</option>
                      <option value="presents">Presents</option>
                      <option value="external-link">External Link</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-1">Destination ID/URL</label>
                    <input 
                      type="text"
                      value={formData.destinationId}
                      onChange={(e) => setFormData({...formData, destinationId: e.target.value})}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40"
                      placeholder="Target ID or URL"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-1">Unlock Conditions</label>
                  <div className="space-y-2">
                    {formData.unlockConditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                        <span className="text-white flex-1">{condition.type}</span>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeCondition(index)}
                          className="text-red-400"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <select 
                      value={newCondition.type}
                      onChange={(e) => setNewCondition({...newCondition, type: e.target.value as any})}
                      className="flex-1 p-2 bg-white/10 border border-white/20 rounded text-white"
                    >
                      <option value="sign-in">Sign-In Required</option>
                      <option value="stamp-required">Stamp Required</option>
                      <option value="task-required">Task Required</option>
                      <option value="time-window">Time Window</option>
                      <option value="geofence">Geofence</option>
                    </select>
                    <Button 
                      type="button"
                      onClick={addCondition}
                      className="bg-white/20 text-white hover:bg-white/30"
                    >
                      Add Condition
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-white text-blue-700 hover:bg-blue-50"
                  >
                    {editingButton ? 'Update Button' : 'Create Button'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mb-4">
          <div className="flex gap-2">
            {(['chapters', 'subChapters', 'storyCards'] as const).map(tab => (
              <Button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                variant={selectedTab === tab ? 'default' : 'ghost'}
                className={selectedTab === tab 
                  ? 'bg-white text-blue-700' 
                  : 'text-white hover:bg-white/20'}
              >
                {tab === 'chapters' ? 'Chapters' : 
                 tab === 'subChapters' ? 'Sub-Chapters' : 'Story Cards'}
              </Button>
            ))}
          </div>
        </div>

        <div>
          {renderButtonList(buttons[selectedTab])}
        </div>
      </div>
    </ImmersivePageLayout>
  );
}