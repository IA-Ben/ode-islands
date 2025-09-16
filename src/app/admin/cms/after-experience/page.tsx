'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AfterExperienceConfig {
  eventId: string;
  tabs: Array<{
    tabKey: string;
    title: string;
    displayOrder: number;
    isVisible: boolean;
    theme: any;
  }>;
  recapHero: {
    copy: {
      title: string;
      subtitle: string;
      shareText: string;
    };
    metrics: {
      showChapters: boolean;
      showMemories: boolean;
      showProgress: boolean;
    };
    shareImage: {
      theme: string;
      backgroundColor: string;
      accentColor: string;
    };
  };
  communitySettings: {
    newsletter: {
      enabled: boolean;
      title: string;
      description: string;
    };
    discord: {
      enabled: boolean;
      title: string;
      description: string;
      inviteUrl: string;
    };
  };
  merchCollections: Array<{
    title: string;
    description: string;
    products: Array<{
      title: string;
      description: string;
      stripePriceId: string;
      badge?: string;
    }>;
  }>;
}

export default function AfterExperienceCMS() {
  const router = useRouter();
  const [previewMode, setPreviewMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<AfterExperienceConfig>({
    eventId: 'default-event',
    tabs: [
      { tabKey: 'message', title: 'Personalized Message', displayOrder: 1, isVisible: true, theme: {} },
      { tabKey: 'wallet', title: 'Memory Wallet', displayOrder: 2, isVisible: true, theme: {} },
      { tabKey: 'gallery', title: 'Community Gallery', displayOrder: 3, isVisible: true, theme: {} },
      { tabKey: 'merch', title: 'Exclusive Merchandise', displayOrder: 4, isVisible: true, theme: {} },
      { tabKey: 'community', title: 'Join the Community', displayOrder: 5, isVisible: true, theme: {} }
    ],
    recapHero: {
      copy: {
        title: 'Your Journey Complete',
        subtitle: 'Celebrating your experience through The Ode Islands',
        shareText: 'Share your achievement'
      },
      metrics: {
        showChapters: true,
        showMemories: true,
        showProgress: true
      },
      shareImage: {
        theme: 'default',
        backgroundColor: '#1e293b',
        accentColor: '#3b82f6'
      }
    },
    communitySettings: {
      newsletter: {
        enabled: true,
        title: 'Stay Updated',
        description: 'Get updates on new experiences and exclusive content'
      },
      discord: {
        enabled: true,
        title: 'Discord Community',
        description: 'Chat with other travelers and share your experiences',
        inviteUrl: '#'
      }
    },
    merchCollections: [
      {
        title: 'Commemorative Collection',
        description: 'Limited edition items to remember your journey',
        products: [
          {
            title: 'Commemorative Pin',
            description: 'Limited edition pin featuring the Ode Islands emblem',
            stripePriceId: 'price_demo_pin',
            badge: 'limited'
          },
          {
            title: 'Art Print Poster',
            description: 'High-quality print of your personalized journey map',
            stripePriceId: 'price_demo_poster'
          }
        ]
      }
    ]
  });

  const [activeSection, setActiveSection] = useState<'tabs' | 'recap' | 'community' | 'merch'>('recap');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // In a real implementation, this would save to the CMS API
      console.log('Saving After Experience Config:', config);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'After Experience configuration saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    // Open After page in new tab for preview with live updates
    const previewWindow = window.open('/after?preview=true', '_blank');
    setPreviewMode(true);
    setPreviewUrl('/after?preview=true');
    
    // Set up real-time communication
    const sendConfigUpdate = () => {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.postMessage({ 
          type: 'CMS_CONFIG_UPDATE', 
          config 
        }, window.location.origin);
      }
    };
    
    // Send initial config after window loads
    setTimeout(sendConfigUpdate, 1000);
  };

  const handleLiveUpdate = (field: string, value: any) => {
    // Update config in real-time
    const updatedConfig = { ...config };
    const keys = field.split('.');
    let current = updatedConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setConfig(updatedConfig);
    
    // Send live update to preview window
    if (previewMode && window.opener) {
      const previewWindows = [];
      try {
        window.postMessage({ 
          type: 'CMS_LIVE_UPDATE', 
          field, 
          value, 
          config: updatedConfig 
        }, window.location.origin);
      } catch (e) {
        console.log('Preview window communication error:', e);
      }
    }
  };

  return (
    <div className="scroll-container min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">After Experience CMS</h1>
              <p className="text-gray-600 mt-2">Manage the post-event experience configuration</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handlePreview}
                className={`px-4 py-2 ${previewMode ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-lg transition-colors flex items-center`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {previewMode ? 'Live Preview Active' : 'Preview'}
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          
          {message && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Section Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'recap', label: 'Hero Recap', icon: '🎯' },
                { key: 'tabs', label: 'Tab Configuration', icon: '📋' },
                { key: 'community', label: 'Community Settings', icon: '🤝' },
                { key: 'merch', label: 'Merchandise', icon: '🛍️' }
              ].map(section => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key as any)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeSection === section.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Section Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeSection === 'recap' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Hero Recap Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={config.recapHero.copy.title}
                    onChange={(e) => setConfig({
                      ...config,
                      recapHero: {
                        ...config.recapHero,
                        copy: { ...config.recapHero.copy, title: e.target.value }
                      }
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={config.recapHero.copy.subtitle}
                    onChange={(e) => setConfig({
                      ...config,
                      recapHero: {
                        ...config.recapHero,
                        copy: { ...config.recapHero.copy, subtitle: e.target.value }
                      }
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Share Text</label>
                  <input
                    type="text"
                    value={config.recapHero.copy.shareText}
                    onChange={(e) => setConfig({
                      ...config,
                      recapHero: {
                        ...config.recapHero,
                        copy: { ...config.recapHero.copy, shareText: e.target.value }
                      }
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                  <input
                    type="color"
                    value={config.recapHero.shareImage.accentColor}
                    onChange={(e) => setConfig({
                      ...config,
                      recapHero: {
                        ...config.recapHero,
                        shareImage: { ...config.recapHero.shareImage, accentColor: e.target.value }
                      }
                    })}
                    className="w-full h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Visible Metrics</h3>
                <div className="space-y-3">
                  {Object.entries(config.recapHero.metrics).map(([key, value]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) => setConfig({
                          ...config,
                          recapHero: {
                            ...config.recapHero,
                            metrics: { ...config.recapHero.metrics, [key]: e.target.checked }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'community' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Community Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Newsletter</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.communitySettings.newsletter.enabled}
                        onChange={(e) => setConfig({
                          ...config,
                          communitySettings: {
                            ...config.communitySettings,
                            newsletter: { ...config.communitySettings.newsletter, enabled: e.target.checked }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-gray-700">Enable Newsletter</span>
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={config.communitySettings.newsletter.title}
                        onChange={(e) => setConfig({
                          ...config,
                          communitySettings: {
                            ...config.communitySettings,
                            newsletter: { ...config.communitySettings.newsletter, title: e.target.value }
                          }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={config.communitySettings.newsletter.description}
                        onChange={(e) => setConfig({
                          ...config,
                          communitySettings: {
                            ...config.communitySettings,
                            newsletter: { ...config.communitySettings.newsletter, description: e.target.value }
                          }
                        })}
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Discord</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.communitySettings.discord.enabled}
                        onChange={(e) => setConfig({
                          ...config,
                          communitySettings: {
                            ...config.communitySettings,
                            discord: { ...config.communitySettings.discord, enabled: e.target.checked }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-gray-700">Enable Discord</span>
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={config.communitySettings.discord.title}
                        onChange={(e) => setConfig({
                          ...config,
                          communitySettings: {
                            ...config.communitySettings,
                            discord: { ...config.communitySettings.discord, title: e.target.value }
                          }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Invite URL</label>
                      <input
                        type="url"
                        value={config.communitySettings.discord.inviteUrl}
                        onChange={(e) => setConfig({
                          ...config,
                          communitySettings: {
                            ...config.communitySettings,
                            discord: { ...config.communitySettings.discord, inviteUrl: e.target.value }
                          }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'merch' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Merchandise Collections</h2>
              <p className="text-gray-600">Configure merchandise offerings for the After experience</p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Integration Note:</strong> Merchandise prices are managed through Stripe. 
                  Configure your products in Stripe Dashboard and reference the Price IDs here.
                </p>
              </div>

              {config.merchCollections.map((collection, collectionIndex) => (
                <div key={collectionIndex} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{collection.title}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Collection Title</label>
                      <input
                        type="text"
                        value={collection.title}
                        onChange={(e) => {
                          const newCollections = [...config.merchCollections];
                          newCollections[collectionIndex].title = e.target.value;
                          setConfig({ ...config, merchCollections: newCollections });
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <input
                        type="text"
                        value={collection.description}
                        onChange={(e) => {
                          const newCollections = [...config.merchCollections];
                          newCollections[collectionIndex].description = e.target.value;
                          setConfig({ ...config, merchCollections: newCollections });
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Products</h4>
                    {collection.products.map((product, productIndex) => (
                      <div key={productIndex} className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                            <input
                              type="text"
                              value={product.title}
                              onChange={(e) => {
                                const newCollections = [...config.merchCollections];
                                newCollections[collectionIndex].products[productIndex].title = e.target.value;
                                setConfig({ ...config, merchCollections: newCollections });
                              }}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID</label>
                            <input
                              type="text"
                              value={product.stripePriceId}
                              onChange={(e) => {
                                const newCollections = [...config.merchCollections];
                                newCollections[collectionIndex].products[productIndex].stripePriceId = e.target.value;
                                setConfig({ ...config, merchCollections: newCollections });
                              }}
                              placeholder="price_1234567890"
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Badge (Optional)</label>
                            <select
                              value={product.badge || ''}
                              onChange={(e) => {
                                const newCollections = [...config.merchCollections];
                                newCollections[collectionIndex].products[productIndex].badge = e.target.value || undefined;
                                setConfig({ ...config, merchCollections: newCollections });
                              }}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">No Badge</option>
                              <option value="limited">Limited Edition</option>
                              <option value="exclusive">Exclusive</option>
                              <option value="new">New</option>
                              <option value="bestseller">Bestseller</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={product.description}
                            onChange={(e) => {
                              const newCollections = [...config.merchCollections];
                              newCollections[collectionIndex].products[productIndex].description = e.target.value;
                              setConfig({ ...config, merchCollections: newCollections });
                            }}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}