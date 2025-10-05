'use client';

import { useState } from 'react';
import { VisualCardLayout, CardElement, CardElementType, createDefaultElement, createEmptyLayout } from '@/../../shared/cardTypes';
import { CardRenderer } from './CardRenderer';

interface VisualCardEditorProps {
  initialLayout?: VisualCardLayout;
  onChange: (layout: VisualCardLayout) => void;
}

export function VisualCardEditor({ initialLayout, onChange }: VisualCardEditorProps) {
  const [layout, setLayout] = useState<VisualCardLayout>(
    initialLayout || createEmptyLayout()
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const updateLayout = (newLayout: VisualCardLayout) => {
    setLayout(newLayout);
    onChange(newLayout);
  };
  
  const addElement = (type: CardElementType) => {
    const newElement = createDefaultElement(type, layout.elements.length);
    updateLayout({
      ...layout,
      elements: [...layout.elements, newElement],
    });
    setSelectedElementId(newElement.id);
  };
  
  const deleteElement = (elementId: string) => {
    updateLayout({
      ...layout,
      elements: layout.elements.filter((el) => el.id !== elementId),
    });
    setSelectedElementId(null);
  };
  
  const moveElement = (elementId: string, direction: 'up' | 'down') => {
    const index = layout.elements.findIndex((el) => el.id === elementId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= layout.elements.length) return;
    
    const newElements = [...layout.elements];
    [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
    
    newElements.forEach((el, i) => {
      el.order = i;
    });
    
    updateLayout({ ...layout, elements: newElements });
  };
  
  const updateElement = (elementId: string, updates: Partial<CardElement>) => {
    updateLayout({
      ...layout,
      elements: layout.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } as CardElement : el
      ),
    });
  };
  
  const selectedElement = layout.elements.find((el) => el.id === selectedElementId);
  
  return (
    <div className="visual-card-editor grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Add Elements</h3>
        <div className="space-y-2">
          <button
            onClick={() => addElement('text')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Text
          </button>
          <button
            onClick={() => addElement('image')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Image
          </button>
          <button
            onClick={() => addElement('video')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Video
          </button>
          <button
            onClick={() => addElement('button')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Button
          </button>
          <button
            onClick={() => addElement('divider')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Divider
          </button>
          <button
            onClick={() => addElement('spacer')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Spacer
          </button>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Card Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Background Color</label>
              <input
                type="color"
                value={layout.backgroundColor || '#ffffff'}
                onChange={(e) => updateLayout({ ...layout, backgroundColor: e.target.value })}
                className="w-full h-10 rounded border"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
      </div>
      
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Canvas</h3>
          <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-[400px]">
            {layout.elements.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Add elements from the toolbar to get started
              </div>
            ) : (
              layout.elements.sort((a, b) => a.order - b.order).map((element) => (
                <div
                  key={element.id}
                  className={`
                    border-2 rounded p-3 mb-3 cursor-pointer transition-colors
                    ${selectedElementId === element.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'}
                  `}
                  onClick={() => setSelectedElementId(element.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      {element.type.charAt(0).toUpperCase() + element.type.slice(1)} Element
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveElement(element.id, 'up'); }}
                        disabled={element.order === 0}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveElement(element.id, 'down'); }}
                        disabled={element.order === layout.elements.length - 1}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        ↓
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {renderElementEditor(element, updateElement)}
                </div>
              ))
            )}
          </div>
        </div>
        
        {showPreview && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>
            <CardRenderer layout={layout} className="border border-gray-300 rounded" />
          </div>
        )}
      </div>
    </div>
  );
}

function renderElementEditor(element: CardElement, updateElement: (id: string, updates: any) => void) {
  switch (element.type) {
    case 'text':
      return (
        <div className="space-y-2">
          <textarea
            value={element.properties.content}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, content: e.target.value }
            })}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Enter text..."
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={element.properties.variant}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, variant: e.target.value }
              })}
              className="p-2 border rounded"
            >
              <option value="heading1">Heading 1</option>
              <option value="heading2">Heading 2</option>
              <option value="heading3">Heading 3</option>
              <option value="paragraph">Paragraph</option>
              <option value="caption">Caption</option>
            </select>
            <select
              value={element.properties.alignment}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, alignment: e.target.value }
              })}
              className="p-2 border rounded"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      );
    
    case 'image':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={element.properties.src || ''}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, src: e.target.value }
            })}
            className="w-full p-2 border rounded"
            placeholder="Image URL"
          />
          <input
            type="text"
            value={element.properties.alt}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, alt: e.target.value }
            })}
            className="w-full p-2 border rounded"
            placeholder="Alt text"
          />
        </div>
      );
    
    case 'button':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={element.properties.text}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, text: e.target.value }
            })}
            className="w-full p-2 border rounded"
            placeholder="Button text"
          />
          <select
            value={element.properties.variant}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, variant: e.target.value }
            })}
            className="w-full p-2 border rounded"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="outline">Outline</option>
          </select>
        </div>
      );
    
    default:
      return <div className="text-sm text-gray-500">No editable properties</div>;
  }
}
