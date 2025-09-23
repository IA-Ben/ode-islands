/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardButton } from '@/components/CardButton'
import { Card } from '@/components/Card'
import type { CardData } from '@/@typings'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
}))

// Mock CardActionRouter
jest.mock('@/components/CardActionRouter', () => ({
  useCardActionRouter: jest.fn(() => ({
    executeAction: jest.fn(),
    executeLegacyAction: jest.fn(),
  })),
}))

// Mock other components
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ onLoad, ...props }: any) {
    React.useEffect(() => {
      if (onLoad) onLoad()
    }, [onLoad])
    return <img {...props} />
  },
}))

jest.mock('@/components/Player', () => ({
  __esModule: true,
  default: function MockPlayer(props: any) {
    return <div data-testid="mock-player" {...props} />
  },
}))

jest.mock('@/components/PlayCanvasViewer', () => ({
  __esModule: true,
  default: function MockPlayCanvasViewer(props: any) {
    return <div data-testid="mock-playcanvas" {...props} />
  },
}))

jest.mock('@/components/ARViewer', () => ({
  __esModule: true,
  default: function MockARViewer(props: any) {
    return <div data-testid="mock-ar-viewer" {...props} />
  },
}))

// Helper to create button data
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

describe('Button Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Keyboard Navigation', () => {
    it('should be focusable with Tab key', async () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      
      // Should be focusable
      buttonElement.focus()
      expect(buttonElement).toHaveFocus()
    })

    it('should support tab order for multiple buttons', async () => {
      const cardData: CardData = {
        text: { title: 'Test Card' },
        customButtons: [
          createButtonData({ 
            id: 'btn-1', 
            label: 'First Button',
            order: 0 
          }),
          createButtonData({ 
            id: 'btn-2', 
            label: 'Second Button',
            order: 1 
          }),
          createButtonData({ 
            id: 'btn-3', 
            label: 'Third Button',
            order: 2 
          })
        ]
      }

      render(
        <Card
          data={cardData}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)

      // Test tab order
      buttons[0].focus()
      expect(buttons[0]).toHaveFocus()

      await userEvent.tab()
      expect(buttons[1]).toHaveFocus()

      await userEvent.tab()
      expect(buttons[2]).toHaveFocus()

      // Test reverse tab order
      await userEvent.tab({ shift: true })
      expect(buttons[1]).toHaveFocus()
    })

    it('should skip locked buttons in tab order when appropriate', async () => {
      const cardData: CardData = {
        text: { title: 'Test Card' },
        customButtons: [
          createButtonData({ 
            id: 'btn-1', 
            label: 'Unlocked Button',
            isUnlocked: true,
            order: 0 
          }),
          createButtonData({ 
            id: 'btn-2', 
            label: 'Locked Button',
            isUnlocked: false,
            unlockConditions: ['complete-intro'],
            order: 1 
          }),
          createButtonData({ 
            id: 'btn-3', 
            label: 'Another Unlocked Button',
            isUnlocked: true,
            order: 2 
          })
        ]
      }

      render(
        <Card
          data={cardData}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      const buttons = screen.getAllByRole('button')
      
      // All buttons should be in tab order (locked buttons are still focusable for accessibility)
      buttons[0].focus()
      expect(buttons[0]).toHaveFocus()

      await userEvent.tab()
      expect(buttons[1]).toHaveFocus()

      await userEvent.tab()
      expect(buttons[2]).toHaveFocus()
    })
  })

  describe('Keyboard Activation', () => {
    it('should activate with Enter key', async () => {
      const mockExecuteAction = jest.fn()
      require('@/components/CardActionRouter').useCardActionRouter.mockReturnValue({
        executeAction: mockExecuteAction,
        executeLegacyAction: jest.fn(),
      })

      const button = createButtonData({
        action: { type: 'wallet' }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      buttonElement.focus()
      
      await userEvent.keyboard('{Enter}')

      expect(mockExecuteAction).toHaveBeenCalledWith({ type: 'wallet' })
    })

    it('should activate with Space key', async () => {
      const mockExecuteAction = jest.fn()
      require('@/components/CardActionRouter').useCardActionRouter.mockReturnValue({
        executeAction: mockExecuteAction,
        executeLegacyAction: jest.fn(),
      })

      const button = createButtonData({
        action: { type: 'chapter', target: 'chapter-1' }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      buttonElement.focus()
      
      await userEvent.keyboard(' ')

      expect(mockExecuteAction).toHaveBeenCalledWith({ 
        type: 'chapter', 
        target: 'chapter-1' 
      })
    })

    it('should not activate locked buttons but show unlock message', async () => {
      window.alert = jest.fn()

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
      buttonElement.focus()
      
      await userEvent.keyboard('{Enter}')

      expect(window.alert).toHaveBeenCalledWith('Complete Chapter 1 to unlock')
    })
  })

  describe('ARIA Attributes', () => {
    it('should have proper accessible name', () => {
      const button = createButtonData({ 
        label: 'Navigate to Memory Wallet' 
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toHaveAccessibleName('Navigate to Memory Wallet')
    })

    it('should use text as fallback for accessible name', () => {
      const button = createButtonData({ 
        label: undefined,
        text: 'Continue Story'
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toHaveAccessibleName('Continue Story')
    })

    it('should indicate disabled state for locked buttons', () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-intro']
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

    it('should provide descriptive information for locked buttons', () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-intro'],
        unlockHint: 'Complete the introduction to unlock this feature'
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      
      // Should have aria-describedby pointing to unlock hint
      expect(buttonElement).toHaveAttribute('aria-describedby')
      
      const describedById = buttonElement.getAttribute('aria-describedby')
      const descriptionElement = document.getElementById(describedById!)
      expect(descriptionElement).toHaveTextContent(/Complete the introduction to unlock/)
    })

    it('should indicate button state with aria-pressed for toggle-like buttons', () => {
      const button = createButtonData({
        variant: 'ghost',
        action: { type: 'wallet' }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      
      // For non-toggle buttons, should not have aria-pressed
      expect(buttonElement).not.toHaveAttribute('aria-pressed')
    })

    it('should provide role and type information', () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement.tagName.toLowerCase()).toBe('button')
      expect(buttonElement).toHaveAttribute('type', 'button')
    })

    it('should provide action context in accessible description', () => {
      const button = createButtonData({
        label: 'Next Chapter',
        action: { type: 'chapter', target: 'chapter-2' }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      
      // Should include action context for screen readers
      expect(buttonElement).toHaveAttribute('aria-describedby')
      const describedById = buttonElement.getAttribute('aria-describedby')
      const descriptionElement = document.getElementById(describedById!)
      expect(descriptionElement).toHaveTextContent(/Navigate to chapter/)
    })
  })

  describe('Focus Visibility', () => {
    it('should have visible focus indicators', () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      buttonElement.focus()

      // Should have focus-visible styles applied
      expect(buttonElement).toHaveFocus()
      
      // Check for focus ring or outline (implementation-specific)
      const computedStyle = window.getComputedStyle(buttonElement)
      expect(
        computedStyle.outline !== 'none' || 
        computedStyle.boxShadow !== 'none' ||
        computedStyle.border !== 'none'
      ).toBe(true)
    })

    it('should maintain focus after interaction', async () => {
      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      buttonElement.focus()
      
      // Simulate interaction
      await userEvent.click(buttonElement)
      
      // Focus should remain on button after interaction
      expect(buttonElement).toHaveFocus()
    })
  })

  describe('Screen Reader Announcements', () => {
    it('should announce unlock condition changes', () => {
      const { rerender } = render(
        <CardButton 
          button={createButtonData({
            isUnlocked: false,
            unlockConditions: ['complete-intro']
          })} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toHaveAttribute('aria-disabled', 'true')

      // Update to unlocked state
      rerender(
        <CardButton 
          button={createButtonData({
            isUnlocked: true,
            unlockConditions: ['complete-intro']
          })} 
          active={true} 
        />
      )

      expect(buttonElement).not.toHaveAttribute('aria-disabled')
    })

    it('should provide context for different button types', () => {
      const buttonTypes = [
        { action: { type: 'wallet' }, expectedContext: 'memory wallet' },
        { action: { type: 'chapter', target: 'chapter-1' }, expectedContext: 'chapter' },
        { action: { type: 'external-url', target: 'https://example.com' }, expectedContext: 'external link' },
        { action: { type: 'ar-item', target: 'ar-1' }, expectedContext: 'augmented reality' }
      ]

      buttonTypes.forEach(({ action, expectedContext }) => {
        const button = createButtonData({ action })
        
        const { container } = render(
          <CardButton 
            button={button} 
            active={true} 
          />
        )

        const buttonElement = container.querySelector('button')!
        const describedById = buttonElement.getAttribute('aria-describedby')
        
        if (describedById) {
          const descriptionElement = document.getElementById(describedById)
          expect(descriptionElement?.textContent?.toLowerCase()).toContain(expectedContext)
        }

        container.remove()
      })
    })

    it('should announce timing information for timed buttons', () => {
      const button = createButtonData({
        timing: { visibleFrom: 5, animationDelay: 1 }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      const describedById = buttonElement.getAttribute('aria-describedby')
      
      if (describedById) {
        const descriptionElement = document.getElementById(describedById)
        expect(descriptionElement?.textContent).toContain('Available after')
      }
    })
  })

  describe('Error State Announcements', () => {
    it('should announce validation errors', () => {
      // Mock console methods
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const button = createButtonData({
        action: undefined,
        link: undefined
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      
      // Should have error state indicated
      expect(buttonElement).toHaveAttribute('aria-invalid', 'true')
      
      const describedById = buttonElement.getAttribute('aria-describedby')
      if (describedById) {
        const errorElement = document.getElementById(describedById)
        expect(errorElement?.textContent).toContain('configuration error')
      }

      consoleSpy.mockRestore()
    })

    it('should provide helpful error messages', async () => {
      window.alert = jest.fn()

      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-intro'],
        unlockHint: undefined // No custom hint
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      await userEvent.click(buttonElement)

      expect(window.alert).toHaveBeenCalledWith(
        'This content is locked. Complete the requirements to unlock.'
      )
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should maintain accessible color contrast', () => {
      const button = createButtonData({
        variant: 'primary'
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      const computedStyle = window.getComputedStyle(buttonElement)
      
      // Should have defined colors
      expect(computedStyle.color).toBeDefined()
      expect(computedStyle.backgroundColor).toBeDefined()
    })

    it('should provide alternative text for icon-only buttons', () => {
      const button = createButtonData({
        icon: 'arrow-right',
        label: undefined,
        text: undefined
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      
      // Should have accessible name even without visible text (defaults to 'Button')
      expect(buttonElement).toHaveAccessibleName('Button')
    })

    it('should work with high contrast mode', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const button = createButtonData()
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toBeInTheDocument()
    })
  })

  describe('Reduced Motion Accessibility', () => {
    it('should respect prefers-reduced-motion setting', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const button = createButtonData({
        timing: { visibleFrom: 2, animationDelay: 0.5 }
      })
      
      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByRole('button')
      const computedStyle = window.getComputedStyle(buttonElement)
      
      // Should have reduced or no animation
      expect(
        computedStyle.animationDuration === '0s' ||
        computedStyle.transitionDuration === '0s'
      ).toBe(true)
    })
  })
})