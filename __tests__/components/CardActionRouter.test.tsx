/**
 * @jest-environment jsdom
 */

import { CardActionRouter, ActionConfig, LegacyActionConfig, ActionType, LegacyActionType } from '@/components/CardActionRouter'

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

// Mock console methods to avoid cluttering test output
const originalConsole = global.console
beforeEach(() => {
  global.console = {
    ...originalConsole,
    warn: jest.fn(),
    error: jest.fn(),
  }
  jest.clearAllMocks()
  // Reset DOM state
  document.body.innerHTML = ''
})

afterEach(() => {
  global.console = originalConsole
})

describe('CardActionRouter', () => {
  let router: CardActionRouter

  beforeEach(() => {
    router = new CardActionRouter(mockRouter as any)
  })

  describe('executeAction', () => {
    describe('sub-chapter navigation', () => {
      it('should navigate to sub-chapter with valid ID', () => {
        const action: ActionConfig = {
          type: 'sub-chapter',
          target: 'chapter1/sub1'
        }

        router.executeAction(action)

        expect(mockRouter.push).toHaveBeenCalledWith('/before/story/chapter1/sub1')
      })

      it('should navigate to standalone sub-chapter', () => {
        const action: ActionConfig = {
          type: 'sub-chapter',
          target: 'sub1'
        }

        router.executeAction(action)

        expect(mockRouter.push).toHaveBeenCalledWith('/before/story/sub1')
      })

      it('should handle missing sub-chapter ID', () => {
        const action: ActionConfig = {
          type: 'sub-chapter'
        }

        router.executeAction(action)

        expect(mockRouter.push).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('Sub-chapter ID is required for sub-chapter navigation')
      })

      it('should handle invalid sub-chapter ID format', () => {
        const action: ActionConfig = {
          type: 'sub-chapter',
          target: 'invalid-id-with-@-symbol'
        }

        router.executeAction(action)

        expect(mockRouter.push).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('Invalid sub-chapter ID format:', 'invalid-id-with-@-symbol')
      })
    })

    describe('chapter navigation', () => {
      it('should navigate to chapter with valid ID', () => {
        const action: ActionConfig = {
          type: 'chapter',
          target: 'chapter1'
        }

        router.executeAction(action)

        expect(mockRouter.push).toHaveBeenCalledWith('/before/story/chapter1')
      })

      it('should handle missing chapter ID', () => {
        const action: ActionConfig = {
          type: 'chapter'
        }

        router.executeAction(action)

        expect(mockRouter.push).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('Chapter ID is required for chapter navigation')
      })

      it('should handle invalid chapter ID format', () => {
        const action: ActionConfig = {
          type: 'chapter',
          target: 'chapter@invalid'
        }

        router.executeAction(action)

        expect(mockRouter.push).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('Invalid chapter ID format:', 'chapter@invalid')
      })
    })

    describe('card navigation', () => {
      it('should navigate to card with chapter/sub format', () => {
        const action: ActionConfig = {
          type: 'card',
          target: 'chapter1/sub1'
        }

        router.executeAction(action)

        expect(mockRouter.push).toHaveBeenCalledWith('/before/story/chapter1/sub1')
      })

      it('should navigate to single card', () => {
        const action: ActionConfig = {
          type: 'card',
          target: 'card1'
        }

        router.executeAction(action)

        expect(mockRouter.push).toHaveBeenCalledWith('/before/story/card1')
      })

      it('should handle missing card ID', () => {
        const action: ActionConfig = {
          type: 'card'
        }

        router.executeAction(action)

        expect(mockRouter.push).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('Card ID is required for card navigation')
      })
    })

    describe('external URL navigation', () => {
      beforeEach(() => {
        Object.defineProperty(window, 'open', {
          writable: true,
          value: jest.fn(),
        })
      })

      it('should open valid HTTPS URL', () => {
        const action: ActionConfig = {
          type: 'external-url',
          target: 'https://example.com'
        }

        router.executeAction(action)

        expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
      })

      it('should open valid HTTP URL', () => {
        const action: ActionConfig = {
          type: 'external-url',
          target: 'http://example.com'
        }

        router.executeAction(action)

        expect(window.open).toHaveBeenCalledWith('http://example.com', '_blank', 'noopener,noreferrer')
      })

      it('should block invalid URL', () => {
        const action: ActionConfig = {
          type: 'external-url',
          target: 'not-a-url'
        }

        router.executeAction(action)

        expect(window.open).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('Invalid URL format:', 'not-a-url')
      })

      it('should handle missing URL', () => {
        const action: ActionConfig = {
          type: 'external-url'
        }

        router.executeAction(action)

        expect(window.open).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('URL is required for external navigation')
      })
    })

    describe('AR item navigation', () => {
      it('should navigate to AR item with valid ID', () => {
        const action: ActionConfig = {
          type: 'ar-item',
          target: 'ar-model-1'
        }

        router.executeAction(action)

        expect(mockRouter.push).toHaveBeenCalledWith('/before/ar/ar-model-1')
      })

      it('should handle missing AR item ID', () => {
        const action: ActionConfig = {
          type: 'ar-item'
        }

        router.executeAction(action)

        expect(mockRouter.push).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('AR item ID is required for AR navigation')
      })
    })

    describe('wallet navigation', () => {
      it('should navigate to memory wallet', () => {
        const action: ActionConfig = {
          type: 'wallet'
        }

        router.executeAction(action)

        expect(mockRouter.push).toHaveBeenCalledWith('/memory-wallet')
      })
    })

    describe('iframe modal', () => {
      it('should create iframe modal with valid URL', () => {
        const action: ActionConfig = {
          type: 'iframe',
          target: 'https://example.com',
          iframeConfig: {
            width: 800,
            height: 600,
            allowFullscreen: true
          }
        }

        router.executeAction(action)

        // Check that iframe was created and added to DOM
        const modal = document.querySelector('div[style*="position: fixed"]')
        expect(modal).toBeTruthy()

        const iframe = modal?.querySelector('iframe')
        expect(iframe?.src).toBe('https://example.com/')
        expect(iframe?.style.width).toBe('800px')
        expect(iframe?.style.height).toBe('600px')
        expect(iframe?.allowFullscreen).toBe(true)
      })

      it('should handle missing iframe URL', () => {
        const action: ActionConfig = {
          type: 'iframe'
        }

        router.executeAction(action)

        expect(document.querySelector('div[style*="position: fixed"]')).toBeFalsy()
        expect(console.error).toHaveBeenCalledWith('URL is required for iframe')
      })

      it('should block unsafe iframe URL', () => {
        const action: ActionConfig = {
          type: 'iframe',
          target: 'javascript:alert("xss")'
        }

        router.executeAction(action)

        expect(document.querySelector('div[style*="position: fixed"]')).toBeFalsy()
        expect(console.error).toHaveBeenCalledWith('Unsafe iframe URL blocked:', 'javascript:alert("xss")')
      })
    })

    describe('unknown action types', () => {
      it('should handle unknown action type', () => {
        const action = {
          type: 'unknown-type' as ActionType,
          target: 'test'
        }

        router.executeAction(action)

        expect(console.warn).toHaveBeenCalledWith('Unknown action type:', 'unknown-type')
      })
    })
  })

  describe('executeLegacyAction', () => {
    describe('external legacy actions', () => {
      beforeEach(() => {
        Object.defineProperty(window, 'open', {
          writable: true,
          value: jest.fn(),
        })
      })

      it('should handle legacy external action', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'external',
          url: 'https://example.com'
        }

        router.executeLegacyAction(legacyAction)

        expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
      })
    })

    describe('chapter legacy actions', () => {
      it('should handle legacy chapter action', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'chapter',
          target: 'chapter1'
        }

        router.executeLegacyAction(legacyAction)

        expect(mockRouter.push).toHaveBeenCalledWith('/before/story/chapter1')
      })
    })

    describe('subchapter legacy actions', () => {
      it('should handle legacy subchapter action', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'subchapter',
          target: 'sub1'
        }

        router.executeLegacyAction(legacyAction)

        expect(mockRouter.push).toHaveBeenCalledWith('/before/story/sub1')
      })
    })

    describe('iframe legacy actions', () => {
      it('should handle legacy iframe action', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'iframe',
          url: 'https://example.com'
        }

        router.executeLegacyAction(legacyAction)

        const modal = document.querySelector('div[style*="position: fixed"]')
        expect(modal).toBeTruthy()
      })
    })

    describe('unknown legacy types', () => {
      it('should handle unknown legacy type', () => {
        const legacyAction = {
          type: 'unknown' as LegacyActionType,
          url: 'test'
        }

        router.executeLegacyAction(legacyAction)

        expect(console.warn).toHaveBeenCalledWith('Unknown legacy link type:', 'unknown')
      })
    })
  })

  describe('validation methods', () => {
    describe('isValidUrl', () => {
      it('should validate HTTPS URLs', () => {
        const router = new CardActionRouter(mockRouter as any)
        // Access private method via type assertion
        const isValidUrl = (router as any).isValidUrl.bind(router)

        expect(isValidUrl('https://example.com')).toBe(true)
        expect(isValidUrl('https://subdomain.example.com/path?query=1')).toBe(true)
      })

      it('should validate HTTP URLs', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isValidUrl = (router as any).isValidUrl.bind(router)

        expect(isValidUrl('http://example.com')).toBe(true)
        expect(isValidUrl('http://localhost:3000')).toBe(true)
      })

      it('should reject invalid URLs', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isValidUrl = (router as any).isValidUrl.bind(router)

        expect(isValidUrl('not-a-url')).toBe(false)
        expect(isValidUrl('javascript:alert("xss")')).toBe(true) // Valid URL but unsafe protocol
        expect(isValidUrl('')).toBe(false)
        expect(isValidUrl('ftp://example.com')).toBe(true) // Valid URL but different protocol
      })
    })

    describe('isSecureUrl', () => {
      it('should allow HTTPS URLs', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isSecureUrl = (router as any).isSecureUrl.bind(router)

        expect(isSecureUrl('https://example.com')).toBe(true)
      })

      it('should allow HTTP URLs', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isSecureUrl = (router as any).isSecureUrl.bind(router)

        expect(isSecureUrl('http://example.com')).toBe(true)
      })

      it('should allow relative URLs', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isSecureUrl = (router as any).isSecureUrl.bind(router)

        expect(isSecureUrl('/relative/path')).toBe(true)
        expect(isSecureUrl('./relative/path')).toBe(true)
        expect(isSecureUrl('../relative/path')).toBe(true)
      })

      it('should reject unsafe protocols', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isSecureUrl = (router as any).isSecureUrl.bind(router)

        expect(isSecureUrl('javascript:alert("xss")')).toBe(false)
        expect(isSecureUrl('data:text/html,<script>alert("xss")</script>')).toBe(false)
      })

      it('should reject invalid URLs', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isSecureUrl = (router as any).isSecureUrl.bind(router)

        expect(isSecureUrl('not-a-url')).toBe(false)
        expect(isSecureUrl('')).toBe(false)
      })
    })

    describe('isValidIdentifier', () => {
      it('should allow valid identifiers', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isValidIdentifier = (router as any).isValidIdentifier.bind(router)

        expect(isValidIdentifier('chapter1')).toBe(true)
        expect(isValidIdentifier('chapter-1')).toBe(true)
        expect(isValidIdentifier('chapter_1')).toBe(true)
        expect(isValidIdentifier('chapter1/sub1')).toBe(true)
        expect(isValidIdentifier('a')).toBe(true)
        expect(isValidIdentifier('123')).toBe(true)
      })

      it('should reject invalid identifiers', () => {
        const router = new CardActionRouter(mockRouter as any)
        const isValidIdentifier = (router as any).isValidIdentifier.bind(router)

        expect(isValidIdentifier('chapter@1')).toBe(false)
        expect(isValidIdentifier('chapter 1')).toBe(false)
        expect(isValidIdentifier('chapter.1')).toBe(false)
        expect(isValidIdentifier('chapter#1')).toBe(false)
        expect(isValidIdentifier('')).toBe(false)
      })
    })
  })

  describe('static methods', () => {
    describe('getActionTypeLabel', () => {
      it('should return correct labels for all action types', () => {
        expect(CardActionRouter.getActionTypeLabel('sub-chapter')).toBe('Sub-Chapter')
        expect(CardActionRouter.getActionTypeLabel('chapter')).toBe('Chapter')
        expect(CardActionRouter.getActionTypeLabel('card')).toBe('Card')
        expect(CardActionRouter.getActionTypeLabel('external-url')).toBe('External URL')
        expect(CardActionRouter.getActionTypeLabel('ar-item')).toBe('AR Item')
        expect(CardActionRouter.getActionTypeLabel('wallet')).toBe('Memory Wallet')
        expect(CardActionRouter.getActionTypeLabel('iframe')).toBe('Embedded Content')
      })

      it('should return the type itself for unknown types', () => {
        expect(CardActionRouter.getActionTypeLabel('unknown' as ActionType)).toBe('unknown')
      })
    })

    describe('migrateLegacyToAction', () => {
      it('should migrate external legacy action', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'external',
          url: 'https://example.com'
        }

        const result = CardActionRouter.migrateLegacyToAction(legacyAction)

        expect(result).toEqual({
          type: 'external-url',
          target: 'https://example.com',
          iframeConfig: undefined
        })
      })

      it('should migrate chapter legacy action', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'chapter',
          target: 'chapter1'
        }

        const result = CardActionRouter.migrateLegacyToAction(legacyAction)

        expect(result).toEqual({
          type: 'chapter',
          target: 'chapter1',
          iframeConfig: undefined
        })
      })

      it('should migrate subchapter legacy action', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'subchapter',
          target: 'sub1'
        }

        const result = CardActionRouter.migrateLegacyToAction(legacyAction)

        expect(result).toEqual({
          type: 'sub-chapter',
          target: 'sub1',
          iframeConfig: undefined
        })
      })

      it('should migrate iframe legacy action with config', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'iframe',
          url: 'https://example.com',
          iframeConfig: {
            width: 800,
            height: 600,
            allowFullscreen: true
          }
        }

        const result = CardActionRouter.migrateLegacyToAction(legacyAction)

        expect(result).toEqual({
          type: 'iframe',
          target: 'https://example.com',
          iframeConfig: {
            width: 800,
            height: 600,
            allowFullscreen: true
          }
        })
      })

      it('should handle unknown legacy types', () => {
        const legacyAction = {
          type: 'unknown' as LegacyActionType,
          url: 'https://example.com'
        }

        const result = CardActionRouter.migrateLegacyToAction(legacyAction)

        expect(result.type).toBe('external-url')
        expect(result.target).toBe('https://example.com')
      })

      it('should prefer url over target', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'external',
          url: 'https://url.com',
          target: 'https://target.com'
        }

        const result = CardActionRouter.migrateLegacyToAction(legacyAction)

        expect(result.target).toBe('https://url.com')
      })

      it('should use target when url is not available', () => {
        const legacyAction: LegacyActionConfig = {
          type: 'chapter',
          target: 'chapter1'
        }

        const result = CardActionRouter.migrateLegacyToAction(legacyAction)

        expect(result.target).toBe('chapter1')
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle multiple iframe modals', () => {
      const action: ActionConfig = {
        type: 'iframe',
        target: 'https://example.com'
      }

      // Create first modal
      router.executeAction(action)
      const firstModal = document.querySelector('div[style*="position: fixed"]')
      expect(firstModal).toBeTruthy()

      // Create second modal
      router.executeAction(action)
      const allModals = document.querySelectorAll('div[style*="position: fixed"]')
      expect(allModals.length).toBe(2)
    })

    it('should handle iframe close button clicks', () => {
      const action: ActionConfig = {
        type: 'iframe',
        target: 'https://example.com'
      }

      router.executeAction(action)

      const modal = document.querySelector('div[style*="position: fixed"]')
      const closeButton = modal?.querySelector('button')
      
      expect(modal).toBeTruthy()
      expect(closeButton).toBeTruthy()

      // Simulate close button click
      closeButton?.click()

      // Modal should be removed from DOM
      expect(document.querySelector('div[style*="position: fixed"]')).toBeFalsy()
    })

    it('should handle iframe modal background clicks', () => {
      const action: ActionConfig = {
        type: 'iframe',
        target: 'https://example.com'
      }

      router.executeAction(action)

      const modal = document.querySelector('div[style*="position: fixed"]') as HTMLElement
      expect(modal).toBeTruthy()

      // Simulate background click (target should be the modal itself)
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: modal })
      modal.onclick?.(clickEvent)

      // Modal should be removed from DOM
      expect(document.querySelector('div[style*="position: fixed"]')).toBeFalsy()
    })
  })
})