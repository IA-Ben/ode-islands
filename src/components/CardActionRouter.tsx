'use client';

import { useRouter } from 'next/navigation';

// Unified action types
export type ActionType = 'sub-chapter' | 'chapter' | 'card' | 'external-url' | 'ar-item' | 'wallet' | 'iframe';

// Legacy action types for backward compatibility
export type LegacyActionType = 'iframe' | 'external' | 'chapter' | 'subchapter';

// Action configuration interface
export interface ActionConfig {
  type: ActionType;
  target?: string;
  iframeConfig?: {
    width?: number;
    height?: number;
    allowFullscreen?: boolean;
  };
}

// Legacy action configuration for backward compatibility
export interface LegacyActionConfig {
  type: LegacyActionType;
  url?: string;
  target?: string;
  iframeConfig?: {
    width?: number;
    height?: number;
    allowFullscreen?: boolean;
  };
}

/**
 * Centralized navigation logic for all card button actions
 * Handles both new unified actions and legacy link types for backward compatibility
 */
export class CardActionRouter {
  private router: ReturnType<typeof useRouter>;

  constructor(router: ReturnType<typeof useRouter>) {
    this.router = router;
  }

  /**
   * Execute a unified action
   */
  executeAction(action: ActionConfig): void {
    const { type, target, iframeConfig } = action;

    switch (type) {
      case 'sub-chapter':
        this.navigateToSubChapter(target);
        break;
      case 'chapter':
        this.navigateToChapter(target);
        break;
      case 'card':
        this.navigateToCard(target);
        break;
      case 'external-url':
        this.openExternalUrl(target);
        break;
      case 'ar-item':
        this.navigateToARItem(target);
        break;
      case 'wallet':
        this.navigateToWallet();
        break;
      case 'iframe':
        this.openIframe(target, iframeConfig);
        break;
      default:
        console.warn('Unknown action type:', type);
    }
  }

  /**
   * Execute a legacy link action (backward compatibility)
   */
  executeLegacyAction(link: LegacyActionConfig): void {
    const { type, url, target, iframeConfig } = link;

    switch (type) {
      case 'external':
        this.openExternalUrl(url);
        break;
      case 'chapter':
        this.navigateToChapter(target);
        break;
      case 'subchapter':
        this.navigateToSubChapter(target);
        break;
      case 'iframe':
        this.openIframe(url, iframeConfig);
        break;
      default:
        console.warn('Unknown legacy link type:', type);
    }
  }

  /**
   * Navigate to a chapter
   */
  private navigateToChapter(chapterId?: string): void {
    if (!chapterId) {
      console.error('Chapter ID is required for chapter navigation');
      return;
    }

    if (!this.isValidIdentifier(chapterId)) {
      console.error('Invalid chapter ID format:', chapterId);
      return;
    }

    this.router.push(`/before/story/${chapterId}`);
  }

  /**
   * Navigate to a sub-chapter
   */
  private navigateToSubChapter(subChapterId?: string): void {
    if (!subChapterId) {
      console.error('Sub-chapter ID is required for sub-chapter navigation');
      return;
    }

    if (!this.isValidIdentifier(subChapterId)) {
      console.error('Invalid sub-chapter ID format:', subChapterId);
      return;
    }

    // Handle both formats: "chapter-id/sub-id" or just "sub-id"
    if (subChapterId.includes('/')) {
      this.router.push(`/before/story/${subChapterId}`);
    } else {
      // For standalone sub-chapter IDs, might need to derive chapter
      this.router.push(`/before/story/${subChapterId}`);
    }
  }

  /**
   * Navigate to a specific card
   */
  private navigateToCard(cardId?: string): void {
    if (!cardId) {
      console.error('Card ID is required for card navigation');
      return;
    }

    if (!this.isValidIdentifier(cardId)) {
      console.error('Invalid card ID format:', cardId);
      return;
    }

    // Handle card navigation based on the routing structure
    // Cards can be in format: "chapterId" or "chapterId/subId" 
    if (cardId.includes('/')) {
      // Handle chapter/sub format
      this.router.push(`/before/story/${cardId}`);
    } else {
      // Handle single card ID - route to chapter
      this.router.push(`/before/story/${cardId}`);
    }
  }

  /**
   * Navigate to AR item
   */
  private navigateToARItem(arItemId?: string): void {
    if (!arItemId) {
      console.error('AR item ID is required for AR navigation');
      return;
    }

    if (!this.isValidIdentifier(arItemId)) {
      console.error('Invalid AR item ID format:', arItemId);
      return;
    }

    this.router.push(`/before/ar/${arItemId}`);
  }

  /**
   * Navigate to wallet
   */
  private navigateToWallet(): void {
    this.router.push('/memory-wallet');
  }

  /**
   * Open external URL with security validation
   */
  private openExternalUrl(url?: string): void {
    if (!url) {
      console.error('URL is required for external navigation');
      return;
    }

    if (!this.isValidUrl(url)) {
      console.error('Invalid URL format:', url);
      return;
    }

    // Security check for external URLs
    if (this.isSecureUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.error('Unsafe URL blocked:', url);
    }
  }

  /**
   * Open iframe modal with security validation
   */
  private openIframe(url?: string, config?: { width?: number; height?: number; allowFullscreen?: boolean }): void {
    if (!url) {
      console.error('URL is required for iframe');
      return;
    }

    if (!this.isValidUrl(url)) {
      console.error('Invalid iframe URL format:', url);
      return;
    }

    if (!this.isSecureUrl(url)) {
      console.error('Unsafe iframe URL blocked:', url);
      return;
    }

    // Create iframe modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.sandbox = 'allow-scripts allow-same-origin';
    iframe.referrerPolicy = 'no-referrer';
    iframe.style.cssText = `
      width: ${config?.width || 800}px;
      height: ${config?.height || 600}px;
      border: none;
      border-radius: 8px;
      max-width: 90vw;
      max-height: 90vh;
      background: white;
    `;

    if (config?.allowFullscreen) {
      iframe.allowFullscreen = true;
      iframe.allow = 'fullscreen';
    }

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 18px;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;

    closeButton.onclick = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };

    modal.onclick = (e) => {
      if (e.target === modal && document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };

    // Escape key handler
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.body.contains(modal)) {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    modal.appendChild(iframe);
    modal.appendChild(closeButton);
    document.body.appendChild(modal);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is secure (HTTPS or relative)
   */
  private isSecureUrl(url: string): boolean {
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true; // Relative URLs are considered safe
    }

    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
    } catch {
      return false;
    }
  }

  /**
   * Validate identifier format (alphanumeric, hyphens, underscores)
   */
  private isValidIdentifier(id: string): boolean {
    return /^[a-zA-Z0-9\-_\/]+$/.test(id);
  }

  /**
   * Get display text for action type
   */
  static getActionTypeLabel(type: ActionType): string {
    const labels: Record<ActionType, string> = {
      'sub-chapter': 'Sub-Chapter',
      'chapter': 'Chapter',
      'card': 'Card',
      'external-url': 'External URL',
      'ar-item': 'AR Item',
      'wallet': 'Memory Wallet',
      'iframe': 'Embedded Content'
    };
    return labels[type] || type;
  }

  /**
   * Migration helper: Convert legacy link to unified action
   */
  static migrateLegacyToAction(link: LegacyActionConfig): ActionConfig {
    const typeMapping: Record<LegacyActionType, ActionType> = {
      'external': 'external-url',
      'chapter': 'chapter',
      'subchapter': 'sub-chapter',
      'iframe': 'iframe'
    };

    return {
      type: typeMapping[link.type] || 'external-url',
      target: link.url || link.target,
      iframeConfig: link.iframeConfig
    };
  }
}

/**
 * React hook for using the CardActionRouter
 */
export function useCardActionRouter() {
  const router = useRouter();
  return new CardActionRouter(router);
}