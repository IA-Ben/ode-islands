/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardButton, validateButtonData, migrateLegacyButton } from '@/components/CardButton'
import { useCardActionRouter } from '@/components/CardActionRouter'
import type { CardData } from '@/@typings'

// Mock the CardActionRouter hook
jest.mock('@/components/CardActionRouter', () => ({
  useCardActionRouter: jest.fn(),
  CardActionRouter: jest.fn(),
}))

const mockActionRouter = {
  executeAction: jest.fn(),
  executeLegacyAction: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useCardActionRouter as jest.Mock).mockReturnValue(mockActionRouter)
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

// Helper to create a minimal button data object
const createButtonData = (overrides = {}): NonNullable<CardData['customButtons']>[0] => ({
  id: 'test-button',
  label: 'Test Button',
  variant: 'primary',
  action: {
    type: 'external-url',
    target: 'https://example.com'
  },
  position: {
    x: 50,
    y: 50,
    unit: 'percent'
  },
  timing: {
    visibleFrom: 0
  },
  order: 0,
  isUnlocked: true,
  ...overrides
})

describe('CardButton', () => {
  describe('basic rendering', () => {
    it('should render button with label', () => {
      const button = createButtonData({ label: 'Test Label' })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      expect(screen.getByText('Test Label')).toBeInTheDocument()
    })

    it('should render button with text fallback', () => {
      const button = createButtonData({ 
        label: undefined,
        text: 'Test Text'
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      expect(screen.getByText('Test Text')).toBeInTheDocument()
    })

    it('should render button with default text when both label and text are missing', () => {
      const button = createButtonData({ 
        label: undefined,
        text: undefined
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      expect(screen.getByText('Button')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
          className="custom-class"
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toHaveClass('custom-class')
    })

    it('should render different button variants', () => {
      const variants = ['primary', 'secondary', 'ghost', 'outline', 'destructive'] as const
      
      variants.forEach(variant => {
        const button = createButtonData({ variant })
        const { container } = render(
          <CardButton 
            button={button} 
            active={true} 
          />
        )
        
        const buttonElement = container.querySelector('button')
        expect(buttonElement).toBeInTheDocument()
        
        // Clean up for next iteration
        container.remove()
      })
    })
  })

  describe('icon rendering', () => {
    it('should render icon when specified', () => {
      const button = createButtonData({ icon: 'arrow-right' })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      // Check for SVG icon presence
      const icon = screen.getByRole('button').querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should handle unknown icon gracefully', () => {
      const button = createButtonData({ icon: 'unknown-icon' })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      // Should still render the button without throwing
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('timing and visibility', () => {
    it('should be visible immediately when visibleFrom is 0', () => {
      const button = createButtonData({
        timing: { visibleFrom: 0 }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should be hidden initially when visibleFrom is greater than 0', () => {
      const button = createButtonData({
        timing: { visibleFrom: 5 }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should become visible after visibleFrom time elapses', async () => {
      const button = createButtonData({
        timing: { visibleFrom: 2 }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      // Initially hidden
      expect(screen.queryByRole('button')).not.toBeInTheDocument()

      // Advance time
      act(() => {
        jest.advanceTimersByTime(2100) // 2.1 seconds
      })

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })
    })

    it('should reset visibility when card becomes inactive', () => {
      const button = createButtonData({
        timing: { visibleFrom: 1 }
      })
      
      const { rerender } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      // Advance time to make visible
      act(() => {
        jest.advanceTimersByTime(1100)
      })

      // Make inactive
      rerender(
        <CardButton 
          button={button} 
          active={false} 
        />
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should handle timing without visibleFrom property', () => {
      const button = createButtonData({
        timing: {}
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('unlock conditions', () => {
    it('should render unlocked button normally', () => {
      const button = createButtonData({
        isUnlocked: true,
        unlockConditions: ['some-condition']
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toBeInTheDocument()
      expect(buttonElement).not.toBeDisabled()
    })

    it('should render locked button with lock icon', () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-chapter-1']
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toBeInTheDocument()
      
      // Check for lock icon
      const lockIcon = buttonElement.querySelector('svg')
      expect(lockIcon).toBeInTheDocument()
    })

    it('should show unlock hint when locked button is clicked', async () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-chapter-1'],
        unlockHint: 'Complete Chapter 1 to unlock this content'
      })

      // Mock window.alert
      window.alert = jest.fn()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      await userEvent.click(buttonElement)

      expect(window.alert).toHaveBeenCalledWith('Complete Chapter 1 to unlock this content')
      expect(mockActionRouter.executeAction).not.toHaveBeenCalled()
    })

    it('should show default unlock hint when custom hint is not provided', async () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-chapter-1']
      })

      window.alert = jest.fn()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      await userEvent.click(buttonElement)

      expect(window.alert).toHaveBeenCalledWith('This content is locked. Complete the requirements to unlock.')
    })

    it('should handle button without unlock conditions', () => {
      const button = createButtonData({
        isUnlocked: true
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('action execution', () => {
    it('should execute action when unlocked button is clicked', async () => {
      const button = createButtonData({
        action: {
          type: 'chapter',
          target: 'chapter-1'
        }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      await userEvent.click(buttonElement)

      expect(mockActionRouter.executeAction).toHaveBeenCalledWith({
        type: 'chapter',
        target: 'chapter-1'
      })
    })

    it('should execute legacy action when no modern action is present', async () => {
      const button = createButtonData({
        action: undefined,
        link: {
          type: 'external',
          url: 'https://example.com'
        }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      await userEvent.click(buttonElement)

      expect(mockActionRouter.executeLegacyAction).toHaveBeenCalledWith({
        type: 'external',
        url: 'https://example.com'
      })
    })

    it('should prefer custom onClick over action execution', async () => {
      const customOnClick = jest.fn()
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
          onClick={customOnClick}
        />
      )

      const buttonElement = screen.getByRole('button')
      await userEvent.click(buttonElement)

      expect(customOnClick).toHaveBeenCalled()
      expect(mockActionRouter.executeAction).not.toHaveBeenCalled()
    })

    it('should warn when button has no action or link configuration', async () => {
      const button = createButtonData({
        action: undefined,
        link: undefined
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      await userEvent.click(buttonElement)

      expect(consoleSpy).toHaveBeenCalledWith('Button has no action or link configuration:', button)
      
      consoleSpy.mockRestore()
    })
  })

  describe('theme integration', () => {
    it('should apply theme colors', () => {
      const button = createButtonData()
      const theme = {
        invert: true,
        cta: '#ff0000',
        background: '#000000',
        title: '#ffffff',
        subtitle: '#cccccc',
        description: '#999999'
      }
      
      render(
        <CardButton 
          button={button} 
          active={true} 
          cardTheme={theme}
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should handle missing theme', () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('keyboard accessibility', () => {
    it('should be focusable', () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      buttonElement.focus()
      expect(buttonElement).toHaveFocus()
    })

    it('should be activatable with Enter key', async () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      buttonElement.focus()
      
      await userEvent.keyboard('{Enter}')

      expect(mockActionRouter.executeAction).toHaveBeenCalled()
    })

    it('should be activatable with Space key', async () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      buttonElement.focus()
      
      await userEvent.keyboard(' ')

      expect(mockActionRouter.executeAction).toHaveBeenCalled()
    })
  })

  describe('ARIA attributes', () => {
    it('should have proper ARIA label', () => {
      const button = createButtonData({ label: 'Navigate to Chapter 1' })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toHaveAccessibleName('Navigate to Chapter 1')
    })

    it('should indicate disabled state for locked buttons', () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-chapter-1']
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toHaveAttribute('aria-disabled', 'true')
    })

    it('should provide unlock condition information to screen readers', () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-chapter-1'],
        unlockHint: 'Complete Chapter 1 to unlock'
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toHaveAttribute('aria-describedby')
    })
  })
})

describe('validateButtonData', () => {
  it('should validate button with all required fields', () => {
    const button = createButtonData()
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should require button ID', () => {
    const button = createButtonData({ id: '' })
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Button ID is required')
  })

  it('should require button text or label', () => {
    const button = createButtonData({ 
      text: undefined,
      label: undefined
    })
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Button text or label is required')
  })

  it('should require action or link configuration', () => {
    const button = createButtonData({ 
      action: undefined,
      link: undefined
    })
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Button must have either action or link configuration')
  })

  it('should require action type', () => {
    const button = createButtonData({
      action: { type: undefined as any, target: 'test' }
    })
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Action type is required')
  })

  it('should require target for external-url and iframe actions', () => {
    const buttonExternal = createButtonData({
      action: { type: 'external-url' }
    })
    const resultExternal = validateButtonData(buttonExternal)
    
    expect(resultExternal.isValid).toBe(false)
    expect(resultExternal.errors).toContain('Action target is required for external-url')

    const buttonIframe = createButtonData({
      action: { type: 'iframe' }
    })
    const resultIframe = validateButtonData(buttonIframe)
    
    expect(resultIframe.isValid).toBe(false)
    expect(resultIframe.errors).toContain('Action target is required for iframe')
  })

  it('should validate position bounds for percentage units', () => {
    const button = createButtonData({
      position: { x: 150, y: 50, unit: 'percent' }
    })
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Position X is out of bounds')
  })

  it('should validate position bounds for pixel units', () => {
    const button = createButtonData({
      position: { x: 10000, y: 50, unit: 'pixel' }
    })
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Position X is out of bounds')
  })

  it('should validate timing constraints', () => {
    const button = createButtonData({
      timing: { 
        visibleFrom: -1,
        animationDelay: -2
      }
    })
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Visible from time cannot be negative')
    expect(result.errors).toContain('Animation delay cannot be negative')
  })

  it('should allow valid button configuration', () => {
    const button = createButtonData({
      position: { x: 50, y: 50, unit: 'percent' },
      timing: { visibleFrom: 2, animationDelay: 0.5 }
    })
    const result = validateButtonData(button)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('migrateLegacyButton', () => {
  it('should migrate basic legacy button', () => {
    const legacyButton = {
      id: 'legacy-btn',
      text: 'Legacy Button',
      position: { x: 50, y: 50, unit: 'percent' }
    }

    const result = migrateLegacyButton(legacyButton)

    expect(result.id).toBe('legacy-btn')
    expect(result.text).toBe('Legacy Button')
    expect(result.label).toBe('Legacy Button')
    expect(result.position).toEqual({ x: 50, y: 50, unit: 'percent' })
  })

  it('should migrate legacy link to action', () => {
    const legacyButton = {
      id: 'legacy-btn',
      text: 'Legacy Button',
      link: {
        type: 'external',
        url: 'https://example.com'
      }
    }

    const result = migrateLegacyButton(legacyButton)

    expect(result.action).toEqual({
      type: 'external-url',
      target: 'https://example.com',
      iframeConfig: undefined
    })
    expect(result.link).toEqual(legacyButton.link)
  })

  it('should migrate all legacy link types', () => {
    const typeMapping = [
      { legacy: 'external', modern: 'external-url' },
      { legacy: 'chapter', modern: 'chapter' },
      { legacy: 'subchapter', modern: 'sub-chapter' },
      { legacy: 'iframe', modern: 'iframe' }
    ]

    typeMapping.forEach(({ legacy, modern }) => {
      const legacyButton = {
        id: 'btn',
        text: 'Button',
        link: {
          type: legacy,
          url: 'https://example.com'
        }
      }

      const result = migrateLegacyButton(legacyButton)
      expect(result.action?.type).toBe(modern)
    })
  })

  it('should preserve enhanced features', () => {
    const legacyButton = {
      id: 'enhanced-btn',
      text: 'Enhanced Button',
      variant: 'secondary',
      icon: 'arrow-right',
      order: 5,
      unlockConditions: ['complete-intro'],
      isUnlocked: false,
      unlockHint: 'Complete the intro'
    }

    const result = migrateLegacyButton(legacyButton)

    expect(result.variant).toBe('secondary')
    expect(result.icon).toBe('arrow-right')
    expect(result.order).toBe(5)
    expect(result.unlockConditions).toEqual(['complete-intro'])
    expect(result.isUnlocked).toBe(false)
    expect(result.unlockHint).toBe('Complete the intro')
  })

  it('should handle legacy button without link', () => {
    const legacyButton = {
      id: 'no-link-btn',
      text: 'No Link Button'
    }

    const result = migrateLegacyButton(legacyButton)

    expect(result.id).toBe('no-link-btn')
    expect(result.text).toBe('No Link Button')
    expect(result.action).toBeUndefined()
  })

  it('should prefer existing action over link migration', () => {
    const legacyButton = {
      id: 'conflict-btn',
      text: 'Conflict Button',
      action: {
        type: 'wallet'
      },
      link: {
        type: 'external',
        url: 'https://example.com'
      }
    }

    const result = migrateLegacyButton(legacyButton)

    expect(result.action).toEqual({ type: 'wallet' })
    expect(result.link).toEqual(legacyButton.link)
  })

  it('should handle iframe config migration', () => {
    const legacyButton = {
      id: 'iframe-btn',
      text: 'Iframe Button',
      link: {
        type: 'iframe',
        url: 'https://example.com',
        iframeConfig: {
          width: 800,
          height: 600,
          allowFullscreen: true
        }
      }
    }

    const result = migrateLegacyButton(legacyButton)

    expect(result.action).toEqual({
      type: 'iframe',
      target: 'https://example.com',
      iframeConfig: {
        width: 800,
        height: 600,
        allowFullscreen: true
      }
    })
  })
})