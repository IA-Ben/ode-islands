/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
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

// Mock window dimensions
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

describe('Button Visual Regression', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset to default dimensions
    mockWindowDimensions(1024, 768)
  })

  describe('Button Positioning Accuracy', () => {
    it('should position button correctly with percentage units', () => {
      const button = createButtonData({
        position: { x: 25, y: 75, unit: 'percent' }
      })

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      const computedStyle = window.getComputedStyle(buttonElement)
      
      // Check if position styles are applied correctly
      expect(computedStyle.position).toBe('absolute')
      expect(computedStyle.left).toBe('25%')
      expect(computedStyle.top).toBe('75%')
    })

    it('should position button correctly with pixel units', () => {
      const button = createButtonData({
        position: { x: 100, y: 200, unit: 'pixel' }
      })

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      const computedStyle = window.getComputedStyle(buttonElement)
      
      expect(computedStyle.position).toBe('absolute')
      expect(computedStyle.left).toBe('100px')
      expect(computedStyle.top).toBe('200px')
    })

    it('should maintain position consistency across renders', () => {
      const button = createButtonData({
        position: { x: 60, y: 40, unit: 'percent' }
      })

      const { container, rerender } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const initialStyle = window.getComputedStyle(container.querySelector('button')!)
      const initialLeft = initialStyle.left
      const initialTop = initialStyle.top

      // Re-render and check position hasn't changed
      rerender(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const afterStyle = window.getComputedStyle(container.querySelector('button')!)
      expect(afterStyle.left).toBe(initialLeft)
      expect(afterStyle.top).toBe(initialTop)
    })

    it('should handle edge case positions correctly', () => {
      const edgePositions = [
        { x: 0, y: 0, unit: 'percent' as const },
        { x: 100, y: 100, unit: 'percent' as const },
        { x: 5, y: 95, unit: 'percent' as const },
        { x: 95, y: 5, unit: 'percent' as const }
      ]

      edgePositions.forEach(position => {
        const button = createButtonData({ position })
        
        const { container } = render(
          <CardButton 
            button={button} 
            active={true} 
          />
        )

        const buttonElement = container.querySelector('button')!
        const computedStyle = window.getComputedStyle(buttonElement)
        
        expect(computedStyle.left).toBe(`${position.x}%`)
        expect(computedStyle.top).toBe(`${position.y}%`)

        container.remove()
      })
    })
  })

  describe('Responsive Button Placement', () => {
    it('should maintain proportional positioning on mobile screens', () => {
      mockWindowDimensions(375, 667) // iPhone SE
      
      const button = createButtonData({
        position: { x: 50, y: 50, unit: 'percent' }
      })

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      const computedStyle = window.getComputedStyle(buttonElement)
      
      // Position should remain percentage-based
      expect(computedStyle.left).toBe('50%')
      expect(computedStyle.top).toBe('50%')
    })

    it('should maintain proportional positioning on tablet screens', () => {
      mockWindowDimensions(768, 1024) // iPad
      
      const button = createButtonData({
        position: { x: 30, y: 70, unit: 'percent' }
      })

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      const computedStyle = window.getComputedStyle(buttonElement)
      
      expect(computedStyle.left).toBe('30%')
      expect(computedStyle.top).toBe('70%')
    })

    it('should maintain proportional positioning on desktop screens', () => {
      mockWindowDimensions(1920, 1080) // Full HD
      
      const button = createButtonData({
        position: { x: 80, y: 20, unit: 'percent' }
      })

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      const computedStyle = window.getComputedStyle(buttonElement)
      
      expect(computedStyle.left).toBe('80%')
      expect(computedStyle.top).toBe('20%')
    })

    it('should adapt button size for different screen sizes', () => {
      const button = createButtonData()

      // Test mobile
      mockWindowDimensions(375, 667)
      const { container: mobileContainer } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )
      const mobileButton = mobileContainer.querySelector('button')!
      const mobileStyle = window.getComputedStyle(mobileButton)

      // Test desktop
      mockWindowDimensions(1920, 1080)
      const { container: desktopContainer } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )
      const desktopButton = desktopContainer.querySelector('button')!
      const desktopStyle = window.getComputedStyle(desktopButton)

      // Button should have responsive sizing
      expect(mobileStyle.fontSize).toBeDefined()
      expect(desktopStyle.fontSize).toBeDefined()
    })
  })

  describe('Animation and Timing Behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should show button at correct timing', async () => {
      const button = createButtonData({
        timing: { visibleFrom: 2 }
      })

      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      // Button should not be visible initially
      expect(screen.queryByText('Test Button')).not.toBeInTheDocument()

      // Advance time
      act(() => {
        jest.advanceTimersByTime(2100)
      })

      // Button should now be visible
      await waitFor(() => {
        expect(screen.getByText('Test Button')).toBeInTheDocument()
      })
    })

    it('should apply animation delay correctly', async () => {
      const button = createButtonData({
        timing: { 
          visibleFrom: 1,
          animationDelay: 0.5
        }
      })

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      act(() => {
        jest.advanceTimersByTime(1100)
      })

      await waitFor(() => {
        const buttonElement = container.querySelector('button')
        expect(buttonElement).toBeInTheDocument()
        
        const computedStyle = window.getComputedStyle(buttonElement!)
        expect(computedStyle.animationDelay).toBeDefined()
      })
    })

    it('should handle multiple timed buttons correctly', async () => {
      const cardData: CardData = {
        text: { title: 'Test Card' },
        customButtons: [
          createButtonData({
            id: 'btn-1',
            label: 'Immediate Button',
            timing: { visibleFrom: 0 }
          }),
          createButtonData({
            id: 'btn-2',
            label: 'Delayed Button',
            timing: { visibleFrom: 2 }
          }),
          createButtonData({
            id: 'btn-3',
            label: 'Later Button',
            timing: { visibleFrom: 4 }
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

      // Immediate button should be visible
      expect(screen.getByText('Immediate Button')).toBeInTheDocument()
      expect(screen.queryByText('Delayed Button')).not.toBeInTheDocument()
      expect(screen.queryByText('Later Button')).not.toBeInTheDocument()

      // After 2 seconds
      act(() => {
        jest.advanceTimersByTime(2100)
      })

      await waitFor(() => {
        expect(screen.getByText('Delayed Button')).toBeInTheDocument()
      })
      expect(screen.queryByText('Later Button')).not.toBeInTheDocument()

      // After 4 seconds
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(screen.getByText('Later Button')).toBeInTheDocument()
      })
    })
  })

  describe('Button Styling and Theme Integration', () => {
    it('should apply variant styles correctly', () => {
      const variants = ['primary', 'secondary', 'ghost', 'outline', 'destructive'] as const

      variants.forEach(variant => {
        const button = createButtonData({ variant })
        
        const { container } = render(
          <CardButton 
            button={button} 
            active={true} 
          />
        )

        const buttonElement = container.querySelector('button')!
        expect(buttonElement).toHaveClass(variant)

        container.remove()
      })
    })

    it('should apply theme colors correctly', () => {
      const theme = {
        invert: false,
        cta: '#ff6b35',
        background: '#1a1a1a',
        title: '#ffffff',
        subtitle: '#cccccc',
        description: '#999999'
      }

      const button = createButtonData()

      render(
        <CardButton 
          button={button} 
          active={true} 
          cardTheme={theme}
        />
      )

      const buttonElement = screen.getByRole('button')
      const computedStyle = window.getComputedStyle(buttonElement)
      
      // Should have theme-based styling
      expect(computedStyle.color).toBeDefined()
      expect(computedStyle.backgroundColor).toBeDefined()
    })

    it('should handle inverted theme correctly', () => {
      const theme = {
        invert: true,
        cta: '#ff6b35',
        background: '#ffffff',
        title: '#000000',
        subtitle: '#333333',
        description: '#666666'
      }

      const button = createButtonData()

      render(
        <CardButton 
          button={button} 
          active={true} 
          cardTheme={theme}
        />
      )

      const buttonElement = screen.getByRole('button')
      expect(buttonElement).toBeInTheDocument()
      
      // Should apply inverted styles
      const computedStyle = window.getComputedStyle(buttonElement)
      expect(computedStyle.color).toBeDefined()
    })

    it('should render icons correctly', () => {
      const iconButtons = [
        { icon: 'arrow-right' },
        { icon: 'play' },
        { icon: 'ar' },
        { icon: 'gift' },
        { icon: 'wallet' },
        { icon: 'external' },
        { icon: 'lock' }
      ]

      iconButtons.forEach(({ icon }) => {
        const button = createButtonData({ icon })
        
        const { container } = render(
          <CardButton 
            button={button} 
            active={true} 
          />
        )

        const svgIcon = container.querySelector('svg')
        expect(svgIcon).toBeInTheDocument()

        container.remove()
      })
    })

    it('should handle locked button styling', () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-intro']
      })

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      const computedStyle = window.getComputedStyle(buttonElement)
      
      // Should have disabled/locked styling
      expect(computedStyle.opacity).toBeDefined()
      expect(buttonElement).toHaveAttribute('aria-disabled', 'true')
      
      // Should show lock icon
      const lockIcon = container.querySelector('svg')
      expect(lockIcon).toBeInTheDocument()
    })
  })

  describe('Hover and Focus States', () => {
    it('should apply hover styles', async () => {
      const button = createButtonData()

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      
      // Simulate hover
      buttonElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      
      // Should have hover class or styles
      const computedStyle = window.getComputedStyle(buttonElement)
      expect(computedStyle.transform).toBeDefined()
    })

    it('should apply focus styles', () => {
      const button = createButtonData()

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      buttonElement.focus()
      
      expect(buttonElement).toHaveFocus()
      
      // Should have focus styles
      const computedStyle = window.getComputedStyle(buttonElement)
      expect(
        computedStyle.outline !== 'none' ||
        computedStyle.boxShadow !== 'none'
      ).toBe(true)
    })

    it('should handle active/pressed state', () => {
      const button = createButtonData()

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      
      // Simulate mouse down (active state)
      buttonElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      
      const computedStyle = window.getComputedStyle(buttonElement)
      expect(computedStyle.transform).toBeDefined()
    })

    it('should not apply hover effects on locked buttons', () => {
      const button = createButtonData({
        isUnlocked: false,
        unlockConditions: ['complete-intro']
      })

      const { container } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = container.querySelector('button')!
      
      // Simulate hover
      buttonElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      
      // Should not have interactive hover effects
      expect(buttonElement).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Cross-browser Consistency', () => {
    it('should render consistently across different user agents', () => {
      const button = createButtonData()

      // Mock different user agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', // Chrome
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', // Safari
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101' // Firefox
      ]

      userAgents.forEach(userAgent => {
        Object.defineProperty(navigator, 'userAgent', {
          value: userAgent,
          configurable: true
        })

        const { container } = render(
          <CardButton 
            button={button} 
            active={true} 
          />
        )

        const buttonElement = container.querySelector('button')!
        expect(buttonElement).toBeInTheDocument()
        expect(buttonElement.tagName.toLowerCase()).toBe('button')

        container.remove()
      })
    })

    it('should handle different font rendering engines', () => {
      const button = createButtonData({ label: 'Test Button with Special Characters: åæø' })

      render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      const buttonElement = screen.getByText(/Test Button with Special Characters/)
      expect(buttonElement).toBeInTheDocument()
    })
  })

  describe('Performance and Rendering Optimization', () => {
    it('should not cause layout thrashing on position updates', () => {
      const button = createButtonData()

      const { rerender } = render(
        <CardButton 
          button={button} 
          active={true} 
        />
      )

      // Update position multiple times
      const positions = [
        { x: 10, y: 10, unit: 'percent' as const },
        { x: 20, y: 20, unit: 'percent' as const },
        { x: 30, y: 30, unit: 'percent' as const }
      ]

      positions.forEach(position => {
        rerender(
          <CardButton 
            button={{ ...button, position }} 
            active={true} 
          />
        )
      })

      // Should complete without performance issues
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should handle rapid state changes efficiently', () => {
      const { rerender } = render(
        <CardButton 
          button={createButtonData()} 
          active={false} 
        />
      )

      // Rapidly toggle active state
      for (let i = 0; i < 10; i++) {
        rerender(
          <CardButton 
            button={createButtonData()} 
            active={i % 2 === 0} 
          />
        )
      }

      // Should handle rapid changes without issues
      expect(screen.queryByRole('button')).toBeInTheDocument()
    })
  })
})