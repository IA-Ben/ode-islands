'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardData } from '@/@typings';
import { validateButtonData, migrateLegacyButton } from './CardButton';
import { CardActionRouter } from './CardActionRouter';

type CustomButtonData = NonNullable<CardData['customButtons']>[0];

interface CardEditorButtonsProps {
  cardData: CardData;
  onCardDataChange: (cardData: CardData) => void;
  className?: string;
}

interface ButtonValidationError {
  buttonIndex: number;
  field: string;
  message: string;
}

/**
 * Enhanced CMS editing interface for card buttons with CRUD operations,
 * positioning, validation, and visual preview
 */
export const CardEditorButtons: React.FC<CardEditorButtonsProps> = ({
  cardData,
  onCardDataChange,
  className = ''
}) => {
  const [validationErrors, setValidationErrors] = useState<ButtonValidationError[]>([]);
  const [draggedButton, setDraggedButton] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Get current buttons or initialize empty array
  const buttons = cardData.customButtons || [];

  // Validate all buttons
  const validateAllButtons = useCallback((buttonsToValidate: CustomButtonData[]): ButtonValidationError[] => {
    const errors: ButtonValidationError[] = [];
    const usedNames = new Set<string>();

    buttonsToValidate.forEach((button, index) => {
      // Validate individual button
      const validation = validateButtonData(button);
      validation.errors.forEach(error => {
        errors.push({
          buttonIndex: index,
          field: 'general',
          message: error
        });
      });

      // Check for unique names
      const name = button.label || button.text || '';
      if (name) {
        if (usedNames.has(name.toLowerCase())) {
          errors.push({
            buttonIndex: index,
            field: 'label',
            message: 'Button name must be unique within the card'
          });
        }
        usedNames.add(name.toLowerCase());
      }

      // Validate URLs
      if (button.action?.type === 'external-url' && button.action.target) {
        try {
          new URL(button.action.target);
        } catch {
          errors.push({
            buttonIndex: index,
            field: 'action.target',
            message: 'Invalid URL format'
          });
        }
      }

      // Validate position boundaries (safe frame)
      if (button.position && button.position.unit === 'percent') {
        if (button.position.x < 5 || button.position.x > 95) {
          errors.push({
            buttonIndex: index,
            field: 'position.x',
            message: 'Position X should be between 5% and 95% for safety'
          });
        }
        if (button.position.y < 5 || button.position.y > 95) {
          errors.push({
            buttonIndex: index,
            field: 'position.y',
            message: 'Position Y should be between 5% and 95% for safety'
          });
        }
      }
    });

    return errors;
  }, []);

  // Update validation when buttons change
  React.useEffect(() => {
    const errors = validateAllButtons(buttons);
    setValidationErrors(errors);
  }, [buttons, validateAllButtons]);

  // Helper to update a specific button
  const updateButton = useCallback((index: number, updates: Partial<CustomButtonData>) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], ...updates };
    
    onCardDataChange({
      ...cardData,
      customButtons: newButtons
    });
  }, [buttons, cardData, onCardDataChange]);

  // Helper to update button order
  const updateButtonOrder = useCallback((newButtons: CustomButtonData[]) => {
    // Update order property based on array position
    const orderedButtons = newButtons.map((button, index) => ({
      ...button,
      order: index
    }));

    onCardDataChange({
      ...cardData,
      customButtons: orderedButtons
    });
  }, [cardData, onCardDataChange]);

  // Add new button
  const addButton = useCallback(() => {
    const newButton: CustomButtonData = {
      id: `btn-${Date.now()}`,
      label: 'New Button',
      variant: 'primary',
      action: {
        type: 'external-url',
        target: ''
      },
      position: {
        x: 50,
        y: 50,
        unit: 'percent'
      },
      timing: {
        visibleFrom: 0
      },
      order: buttons.length,
      isUnlocked: true
    };

    onCardDataChange({
      ...cardData,
      customButtons: [...buttons, newButton]
    });
  }, [buttons, cardData, onCardDataChange]);

  // Remove button
  const removeButton = useCallback((index: number) => {
    const newButtons = buttons.filter((_, i) => i !== index);
    updateButtonOrder(newButtons);
  }, [buttons, updateButtonOrder]);

  // Duplicate button
  const duplicateButton = useCallback((index: number) => {
    const buttonToDuplicate = buttons[index];
    const duplicatedButton: CustomButtonData = {
      ...buttonToDuplicate,
      id: `btn-${Date.now()}`,
      label: `${buttonToDuplicate.label || buttonToDuplicate.text || 'Button'} Copy`,
      order: buttons.length
    };

    onCardDataChange({
      ...cardData,
      customButtons: [...buttons, duplicatedButton]
    });
  }, [buttons, cardData, onCardDataChange]);

  // Move button up/down
  const moveButton = useCallback((index: number, direction: 'up' | 'down') => {
    const newButtons = [...buttons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newButtons.length) {
      [newButtons[index], newButtons[targetIndex]] = [newButtons[targetIndex], newButtons[index]];
      updateButtonOrder(newButtons);
    }
  }, [buttons, updateButtonOrder]);

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedButton(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (draggedButton === null) return;

    const newButtons = [...buttons];
    const draggedItem = newButtons[draggedButton];
    
    // Remove dragged item
    newButtons.splice(draggedButton, 1);
    // Insert at new position
    newButtons.splice(targetIndex, 0, draggedItem);

    updateButtonOrder(newButtons);
    setDraggedButton(null);
  }, [draggedButton, buttons, updateButtonOrder]);

  // Get errors for a specific button
  const getButtonErrors = useCallback((buttonIndex: number) => {
    return validationErrors.filter(error => error.buttonIndex === buttonIndex);
  }, [validationErrors]);

  // Action type options
  const actionTypes = [
    { value: 'sub-chapter', label: 'Sub-Chapter' },
    { value: 'chapter', label: 'Chapter' },
    { value: 'card', label: 'Card' },
    { value: 'external-url', label: 'External URL' },
    { value: 'ar-item', label: 'AR Item' },
    { value: 'wallet', label: 'Memory Wallet' },
    { value: 'iframe', label: 'Embedded Content' }
  ];

  // Variant options
  const variantOptions = [
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'ghost', label: 'Ghost' },
    { value: 'link', label: 'Link' }
  ];

  // Icon options
  const iconOptions = [
    { value: '', label: 'No Icon' },
    { value: 'arrow-right', label: 'Arrow Right' },
    { value: 'play', label: 'Play' },
    { value: 'ar', label: 'AR' },
    { value: 'gift', label: 'Gift' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'external', label: 'External Link' }
  ];

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex justify-between items-center">
          Custom Buttons
          <div className="flex gap-2">
            <Button
              onClick={() => setPreviewMode(!previewMode)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              onClick={addButton}
              className="bg-blue-600 hover:bg-blue-700 text-xs"
            >
              + Add Button
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-400">
          Create interactive buttons with positioning, animations, and advanced features
        </p>

        {/* Validation Summary */}
        {validationErrors.length > 0 && (
          <div className="bg-red-900/20 border border-red-600 rounded p-3">
            <h4 className="text-red-400 font-medium text-sm mb-2">
              Validation Issues ({validationErrors.length})
            </h4>
            <div className="text-xs text-red-300 space-y-1">
              {validationErrors.slice(0, 3).map((error, index) => (
                <div key={index}>
                  Button {error.buttonIndex + 1}: {error.message}
                </div>
              ))}
              {validationErrors.length > 3 && (
                <div className="text-red-400">
                  ... and {validationErrors.length - 3} more issues
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Mode */}
        {previewMode && (
          <div className="bg-gray-900 border border-gray-600 rounded p-4 h-64 relative">
            <div className="text-xs text-gray-400 mb-2">Button Preview (relative positions)</div>
            {buttons.map((button, index) => {
              const errors = getButtonErrors(index);
              return (
                <div
                  key={button.id}
                  className={`absolute text-xs px-3 py-1 rounded border ${
                    errors.length > 0 
                      ? 'bg-red-900 border-red-600 text-red-200' 
                      : 'bg-blue-900 border-blue-600 text-blue-200'
                  }`}
                  style={{
                    left: button.position ? `${button.position.x}%` : '50%',
                    top: button.position ? `${button.position.y}%` : '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {button.label || button.text || 'Button'}
                </div>
              );
            })}
          </div>
        )}

        {/* Button List */}
        {!previewMode && (
          <div className="space-y-4">
            {buttons.map((button, index) => {
              const errors = getButtonErrors(index);
              
              return (
                <div
                  key={button.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`border rounded p-4 space-y-4 cursor-move ${
                    errors.length > 0 
                      ? 'border-red-600 bg-red-900/10' 
                      : 'border-gray-600 bg-gray-900/50'
                  } ${draggedButton === index ? 'opacity-50' : ''}`}
                >
                  {/* Button Header */}
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-blue-400">
                      Button {index + 1}
                      {errors.length > 0 && (
                        <span className="text-red-400 ml-2">({errors.length} issues)</span>
                      )}
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => moveButton(index, 'up')}
                        disabled={index === 0}
                        className="bg-gray-600 hover:bg-gray-500 text-xs px-2 py-1"
                      >
                        ↑
                      </Button>
                      <Button
                        onClick={() => moveButton(index, 'down')}
                        disabled={index === buttons.length - 1}
                        className="bg-gray-600 hover:bg-gray-500 text-xs px-2 py-1"
                      >
                        ↓
                      </Button>
                      <Button
                        onClick={() => duplicateButton(index)}
                        className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                      >
                        Duplicate
                      </Button>
                      <Button
                        onClick={() => removeButton(index)}
                        className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Basic Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Button Label *</label>
                      <input
                        type="text"
                        value={button.label || button.text || ''}
                        onChange={(e) => updateButton(index, { label: e.target.value })}
                        className={`w-full px-3 py-2 bg-gray-700 border rounded text-white ${
                          errors.some(e => e.field === 'label') ? 'border-red-500' : 'border-gray-600'
                        }`}
                        placeholder="Enter button text"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Variant</label>
                      <select
                        value={button.variant || 'primary'}
                        onChange={(e) => updateButton(index, { variant: e.target.value as any })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      >
                        {variantOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action Configuration */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">Action Configuration</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Action Type *</label>
                        <select
                          value={button.action?.type || 'external-url'}
                          onChange={(e) => updateButton(index, {
                            action: {
                              ...button.action,
                              type: e.target.value as any,
                              target: ''
                            }
                          })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          {actionTypes.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          {button.action?.type === 'external-url' ? 'URL *' : 'Target ID *'}
                        </label>
                        <input
                          type="text"
                          value={button.action?.target || ''}
                          onChange={(e) => updateButton(index, {
                            action: button.action 
                              ? { ...button.action, target: e.target.value }
                              : { type: 'external-url', target: e.target.value }
                          })}
                          className={`w-full px-3 py-2 bg-gray-700 border rounded text-white text-sm ${
                            errors.some(e => e.field === 'action.target') ? 'border-red-500' : 'border-gray-600'
                          }`}
                          placeholder={
                            button.action?.type === 'external-url' 
                              ? 'https://example.com' 
                              : 'chapter-id or item-id'
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Position & Timing */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Position X (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={button.position?.x || 50}
                        onChange={(e) => updateButton(index, {
                          position: {
                            ...button.position,
                            x: parseInt(e.target.value) || 0,
                            y: button.position?.y || 50,
                            unit: 'percent'
                          }
                        })}
                        className={`w-full px-3 py-2 bg-gray-700 border rounded text-white text-sm ${
                          errors.some(e => e.field === 'position.x') ? 'border-red-500' : 'border-gray-600'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Position Y (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={button.position?.y || 50}
                        onChange={(e) => updateButton(index, {
                          position: {
                            ...button.position,
                            x: button.position?.x || 50,
                            y: parseInt(e.target.value) || 0,
                            unit: 'percent'
                          }
                        })}
                        className={`w-full px-3 py-2 bg-gray-700 border rounded text-white text-sm ${
                          errors.some(e => e.field === 'position.y') ? 'border-red-500' : 'border-gray-600'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Visible From (s)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={button.timing?.visibleFrom || 0}
                        onChange={(e) => updateButton(index, {
                          timing: {
                            ...button.timing,
                            visibleFrom: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <details className="border border-gray-600 rounded p-3">
                    <summary className="text-sm font-medium cursor-pointer">Advanced Options</summary>
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Icon</label>
                          <select
                            value={button.icon || ''}
                            onChange={(e) => updateButton(index, { icon: e.target.value || undefined })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          >
                            {iconOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Animation Delay (s)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={button.timing?.animationDelay || 0}
                            onChange={(e) => updateButton(index, {
                              timing: {
                                ...button.timing,
                                animationDelay: parseFloat(e.target.value) || undefined
                              }
                            })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Unlock Conditions */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          <input
                            type="checkbox"
                            checked={!button.unlockConditions || button.isUnlocked}
                            onChange={(e) => updateButton(index, { 
                              isUnlocked: e.target.checked,
                              unlockConditions: e.target.checked ? undefined : []
                            })}
                            className="mr-2"
                          />
                          Unlocked by default
                        </label>
                        {button.unlockConditions && !button.isUnlocked && (
                          <input
                            type="text"
                            value={button.unlockHint || ''}
                            onChange={(e) => updateButton(index, { unlockHint: e.target.value })}
                            className="w-full mt-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            placeholder="Unlock hint message"
                          />
                        )}
                      </div>
                    </div>
                  </details>

                  {/* Error Display */}
                  {errors.length > 0 && (
                    <div className="bg-red-900/20 border border-red-600 rounded p-2">
                      <div className="text-xs text-red-300 space-y-1">
                        {errors.map((error, errorIndex) => (
                          <div key={errorIndex}>{error.message}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {buttons.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="mb-4">No buttons created yet</p>
            <Button
              onClick={addButton}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Your First Button
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CardEditorButtons;