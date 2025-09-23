/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardEditorButtons } from '@/components/CardEditorButtons'
import { Card } from '@/components/Card'
import { CardButton } from '@/components/CardButton'
import type { CardData } from '@/@typings'

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// Mock CardActionRouter
jest.mock('@/components/CardActionRouter', () => ({
  useCardActionRouter: jest.fn(() => ({
    executeAction: jest.fn(),
    executeLegacyAction: jest.fn(),
  })),
  CardActionRouter: jest.fn(),
}))

// Mock Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt, onLoad, ...props }: any) {
    return (
      <img 
        src={src} 
        alt={alt} 
        onLoad={onLoad}
        {...props}
      />
    )
  },
}))

// Mock other components that might not be relevant for this test
jest.mock('@/components/Player', () => ({
  __esModule: true,
  default: function MockPlayer({ active, ...props }: any) {
    return <div data-testid="mock-player" data-active={active} {...props} />
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

describe('ButtonSystem Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Editor → Runtime Round-trip', () => {
    it('should create button in CMS and render it in Card component', async () => {
      const initialCardData: CardData = {
        text: {
          title: 'Test Card',
          subtitle: 'Test Subtitle',
          description: 'Test Description'
        },
        customButtons: []
      }

      let currentCardData = initialCardData
      const handleCardDataChange = jest.fn((newData: CardData) => {
        currentCardData = newData
      })

      // Render CMS Editor
      const { rerender } = render(
        <CardEditorButtons
          cardData={currentCardData}
          onCardDataChange={handleCardDataChange}
        />
      )

      // Add a new button
      const addButton = screen.getByText('Add Button')
      await userEvent.click(addButton)

      expect(handleCardDataChange).toHaveBeenCalled()
      const newCardData = handleCardDataChange.mock.calls[0][0]
      expect(newCardData.customButtons).toHaveLength(1)
      expect(newCardData.customButtons![0]).toMatchObject({
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
        }
      })

      // Update card data for next render
      currentCardData = newCardData

      // Now render the Card component with the new button
      render(
        <Card
          data={currentCardData}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      // Verify button appears in Card component
      expect(screen.getByText('New Button')).toBeInTheDocument()
    })

    it('should update button position in CMS and reflect in Card rendering', async () => {
      const cardDataWithButton: CardData = {
        text: { title: 'Test Card' },
        customButtons: [{
          id: 'btn-1',
          label: 'Test Button',
          variant: 'primary',
          action: { type: 'wallet' },
          position: { x: 25, y: 25, unit: 'percent' },
          timing: { visibleFrom: 0 },
          order: 0,
          isUnlocked: true
        }]
      }

      let currentCardData = cardDataWithButton
      const handleCardDataChange = jest.fn((newData: CardData) => {
        currentCardData = newData
      })

      // Render CMS Editor
      render(
        <CardEditorButtons
          cardData={currentCardData}
          onCardDataChange={handleCardDataChange}
        />
      )

      // Find position inputs and update them
      const xInput = screen.getByDisplayValue('25')
      const yInput = screen.getByDisplayValue('25')

      await userEvent.clear(xInput)
      await userEvent.type(xInput, '75')
      
      await userEvent.clear(yInput)
      await userEvent.type(yInput, '80')

      expect(handleCardDataChange).toHaveBeenCalled()
      
      // Verify updated position data
      const lastCall = handleCardDataChange.mock.calls[handleCardDataChange.mock.calls.length - 1]
      const updatedData = lastCall[0]
      expect(updatedData.customButtons![0].position).toEqual({
        x: 75,
        y: 80,
        unit: 'percent'
      })
    })

    it('should configure action in CMS and execute correctly in Card', async () => {
      const cardDataWithButton: CardData = {
        text: { title: 'Test Card' },
        customButtons: [{
          id: 'btn-1',
          label: 'Chapter Button',
          variant: 'primary',
          action: { type: 'chapter', target: 'chapter-1' },
          position: { x: 50, y: 50, unit: 'percent' },
          timing: { visibleFrom: 0 },
          order: 0,
          isUnlocked: true
        }]
      }

      // Mock the action router
      const mockExecuteAction = jest.fn()
      require('@/components/CardActionRouter').useCardActionRouter.mockReturnValue({
        executeAction: mockExecuteAction,
        executeLegacyAction: jest.fn(),
      })

      // Render Card with button
      render(
        <Card
          data={cardDataWithButton}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      // Click the button
      const button = screen.getByText('Chapter Button')
      await userEvent.click(button)

      // Verify action was executed
      expect(mockExecuteAction).toHaveBeenCalledWith({
        type: 'chapter',
        target: 'chapter-1'
      })
    })

    it('should handle validation errors in CMS editor', async () => {
      const cardDataWithInvalidButton: CardData = {
        text: { title: 'Test Card' },
        customButtons: [{
          id: '', // Invalid: empty ID
          label: '',  // Invalid: empty label
          variant: 'primary',
          action: { type: 'external-url', target: '' }, // Invalid: empty target
          position: { x: 150, y: 50, unit: 'percent' }, // Invalid: out of bounds
          timing: { visibleFrom: -1 }, // Invalid: negative time
          order: 0,
          isUnlocked: true
        }]
      }

      const handleCardDataChange = jest.fn()

      render(
        <CardEditorButtons
          cardData={cardDataWithInvalidButton}
          onCardDataChange={handleCardDataChange}
        />
      )

      // Should display validation errors
      await waitFor(() => {
        expect(screen.getByText(/Button ID is required/)).toBeInTheDocument()
        expect(screen.getByText(/Button text or label is required/)).toBeInTheDocument()
        expect(screen.getByText(/Position X should be between 5% and 95%/)).toBeInTheDocument()
      })
    })

    it('should handle button deletion and reordering', async () => {
      const cardDataWithButtons: CardData = {
        text: { title: 'Test Card' },
        customButtons: [
          {
            id: 'btn-1',
            label: 'Button 1',
            variant: 'primary',
            action: { type: 'wallet' },
            position: { x: 25, y: 25, unit: 'percent' },
            timing: { visibleFrom: 0 },
            order: 0,
            isUnlocked: true
          },
          {
            id: 'btn-2',
            label: 'Button 2',
            variant: 'secondary',
            action: { type: 'wallet' },
            position: { x: 75, y: 75, unit: 'percent' },
            timing: { visibleFrom: 0 },
            order: 1,
            isUnlocked: true
          }
        ]
      }

      let currentCardData = cardDataWithButtons
      const handleCardDataChange = jest.fn((newData: CardData) => {
        currentCardData = newData
      })

      render(
        <CardEditorButtons
          cardData={currentCardData}
          onCardDataChange={handleCardDataChange}
        />
      )

      // Find delete button for first button
      const deleteButtons = screen.getAllByText('Delete')
      await userEvent.click(deleteButtons[0])

      expect(handleCardDataChange).toHaveBeenCalled()
      const updatedData = handleCardDataChange.mock.calls[handleCardDataChange.mock.calls.length - 1][0]
      
      // Should have one button remaining
      expect(updatedData.customButtons).toHaveLength(1)
      expect(updatedData.customButtons![0].id).toBe('btn-2')
      expect(updatedData.customButtons![0].order).toBe(0) // Order should be updated
    })
  })

  describe('Legacy Button Migration', () => {
    it('should migrate legacy button format to new format', () => {
      const cardDataWithLegacyButton: CardData = {
        text: { title: 'Test Card' },
        customButtons: [{
          id: 'legacy-btn',
          text: 'Legacy Button',
          variant: 'primary',
          link: {
            type: 'external',
            url: 'https://example.com'
          },
          position: { x: 50, y: 50, unit: 'percent' },
          timing: { visibleFrom: 0 },
          order: 0,
          isUnlocked: true
        } as any] // Cast to any to allow legacy format
      }

      // Mock the migration function
      const mockExecuteLegacyAction = jest.fn()
      require('@/components/CardActionRouter').useCardActionRouter.mockReturnValue({
        executeAction: jest.fn(),
        executeLegacyAction: mockExecuteLegacyAction,
      })

      render(
        <Card
          data={cardDataWithLegacyButton}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      const button = screen.getByText('Legacy Button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('Button Timing and Visibility', () => {
    it('should handle timed button visibility correctly', async () => {
      jest.useFakeTimers()

      const cardDataWithTimedButton: CardData = {
        text: { title: 'Test Card' },
        customButtons: [{
          id: 'timed-btn',
          label: 'Timed Button',
          variant: 'primary',
          action: { type: 'wallet' },
          position: { x: 50, y: 50, unit: 'percent' },
          timing: { visibleFrom: 3 }, // Appears after 3 seconds
          order: 0,
          isUnlocked: true
        }]
      }

      render(
        <Card
          data={cardDataWithTimedButton}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      // Button should not be visible initially
      expect(screen.queryByText('Timed Button')).not.toBeInTheDocument()

      // Advance time to 3 seconds
      jest.advanceTimersByTime(3100)

      // Button should now be visible
      await waitFor(() => {
        expect(screen.getByText('Timed Button')).toBeInTheDocument()
      })

      jest.useRealTimers()
    })

    it('should reset button visibility when card becomes inactive', async () => {
      jest.useFakeTimers()

      const cardDataWithTimedButton: CardData = {
        text: { title: 'Test Card' },
        customButtons: [{
          id: 'timed-btn',
          label: 'Timed Button',
          variant: 'primary',
          action: { type: 'wallet' },
          position: { x: 50, y: 50, unit: 'percent' },
          timing: { visibleFrom: 1 },
          order: 0,
          isUnlocked: true
        }]
      }

      const { rerender } = render(
        <Card
          data={cardDataWithTimedButton}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      // Advance time to make button visible
      jest.advanceTimersByTime(1100)

      await waitFor(() => {
        expect(screen.getByText('Timed Button')).toBeInTheDocument()
      })

      // Make card inactive
      rerender(
        <Card
          data={cardDataWithTimedButton}
          active={false}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      // Button should be hidden when inactive
      expect(screen.queryByText('Timed Button')).not.toBeInTheDocument()

      jest.useRealTimers()
    })
  })

  describe('Theme Integration', () => {
    it('should apply theme to buttons correctly', () => {
      const cardDataWithThemedButton: CardData = {
        text: { title: 'Test Card' },
        theme: {
          invert: true,
          cta: '#ff0000',
          background: '#000000',
          title: '#ffffff',
          subtitle: '#cccccc',
          description: '#999999'
        },
        customButtons: [{
          id: 'themed-btn',
          label: 'Themed Button',
          variant: 'primary',
          action: { type: 'wallet' },
          position: { x: 50, y: 50, unit: 'percent' },
          timing: { visibleFrom: 0 },
          order: 0,
          isUnlocked: true
        }]
      }

      render(
        <Card
          data={cardDataWithThemedButton}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      const button = screen.getByText('Themed Button')
      expect(button).toBeInTheDocument()
      
      // Check if the button exists and is styled (theme application is tested in unit tests)
      expect(button.closest('button')).toBeInTheDocument()
    })
  })

  describe('Multiple Buttons Interaction', () => {
    it('should handle multiple buttons with different configurations', async () => {
      const cardDataWithMultipleButtons: CardData = {
        text: { title: 'Test Card' },
        customButtons: [
          {
            id: 'btn-1',
            label: 'Wallet Button',
            variant: 'primary',
            action: { type: 'wallet' },
            position: { x: 25, y: 50, unit: 'percent' },
            timing: { visibleFrom: 0 },
            order: 0,
            isUnlocked: true
          },
          {
            id: 'btn-2',
            label: 'Chapter Button',
            variant: 'secondary',
            action: { type: 'chapter', target: 'chapter-1' },
            position: { x: 75, y: 50, unit: 'percent' },
            timing: { visibleFrom: 1 },
            order: 1,
            isUnlocked: true
          },
          {
            id: 'btn-3',
            label: 'Locked Button',
            variant: 'ghost',
            action: { type: 'external-url', target: 'https://example.com' },
            position: { x: 50, y: 75, unit: 'percent' },
            timing: { visibleFrom: 0 },
            order: 2,
            isUnlocked: false,
            unlockConditions: [{
              type: 'task-required',
              taskId: 'complete-intro',
              taskName: 'Complete Introduction'
            }]
          }
        ]
      }

      const mockExecuteAction = jest.fn()
      require('@/components/CardActionRouter').useCardActionRouter.mockReturnValue({
        executeAction: mockExecuteAction,
        executeLegacyAction: jest.fn(),
      })

      jest.useFakeTimers()

      render(
        <Card
          data={cardDataWithMultipleButtons}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      // First button should be visible immediately
      expect(screen.getByText('Wallet Button')).toBeInTheDocument()
      
      // Third button (locked) should be visible but disabled
      expect(screen.getByText('Locked Button')).toBeInTheDocument()
      
      // Second button should not be visible yet
      expect(screen.queryByText('Chapter Button')).not.toBeInTheDocument()

      // Advance time to show second button
      jest.advanceTimersByTime(1100)

      await waitFor(() => {
        expect(screen.getByText('Chapter Button')).toBeInTheDocument()
      })

      // Click unlocked buttons
      await userEvent.click(screen.getByText('Wallet Button'))
      expect(mockExecuteAction).toHaveBeenCalledWith({ type: 'wallet' })

      await userEvent.click(screen.getByText('Chapter Button'))
      expect(mockExecuteAction).toHaveBeenCalledWith({ 
        type: 'chapter', 
        target: 'chapter-1' 
      })

      // Click locked button - should show alert
      window.alert = jest.fn()
      await userEvent.click(screen.getByText('Locked Button'))
      expect(window.alert).toHaveBeenCalled()
      expect(mockExecuteAction).not.toHaveBeenCalledWith({
        type: 'external-url',
        target: 'https://example.com'
      })

      jest.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed button data gracefully', () => {
      const cardDataWithMalformedButton: CardData = {
        text: { title: 'Test Card' },
        customButtons: [
          {
            // Missing required fields
            variant: 'primary'
          } as any // Cast to bypass TypeScript validation
        ]
      }

      // Should not crash when rendering malformed data
      render(
        <Card
          data={cardDataWithMalformedButton}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      // Card should still render
      expect(screen.getByText('Test Card')).toBeInTheDocument()
    })

    it('should handle missing customButtons array', () => {
      const cardDataWithoutButtons: CardData = {
        text: { title: 'Test Card' }
        // No customButtons property
      }

      render(
        <Card
          data={cardDataWithoutButtons}
          active={true}
          cardId="test-card"
          chapterId="test-chapter"
        />
      )

      // Should render without errors
      expect(screen.getByText('Test Card')).toBeInTheDocument()
    })
  })
})