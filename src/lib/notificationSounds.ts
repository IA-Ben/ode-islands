// Notification sound and visual feedback utility
export class NotificationSoundService {
  private static audioContext: AudioContext | null = null;
  private static soundsEnabled = false; // Default to OFF until user enables
  private static vibrationEnabled = false; // Default to OFF until user enables

  /**
   * Enable/disable sound notifications
   */
  static setSoundsEnabled(enabled: boolean): void {
    this.soundsEnabled = enabled;
  }

  /**
   * Enable/disable vibration notifications
   */
  static setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
  }

  /**
   * Get current sound settings
   */
  static getSettings(): { soundsEnabled: boolean; vibrationEnabled: boolean } {
    return {
      soundsEnabled: this.soundsEnabled,
      vibrationEnabled: this.vibrationEnabled,
    };
  }

  /**
   * Initialize audio context (call this on user interaction to avoid browser restrictions)
   */
  static async initializeAudio(): Promise<void> {
    if (!this.audioContext && typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        this.audioContext = new AudioContext();
        // Resume context if it's suspended (required by some browsers)
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } catch (error) {
        console.warn('Failed to initialize audio context:', error);
      }
    }
  }

  /**
   * Play a notification sound using Web Audio API
   */
  static async playNotificationSound(type: 'default' | 'achievement' | 'urgent' | 'gentle' = 'default'): Promise<void> {
    if (!this.soundsEnabled || !this.audioContext || typeof window === 'undefined') {
      return;
    }

    try {
      // Ensure audio context is running
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Generate different tones for different notification types
      const frequencies = this.getFrequenciesForType(type);
      const duration = type === 'achievement' ? 0.6 : 0.3;

      // Create a simple tone sequence
      for (let i = 0; i < frequencies.length; i++) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Configure the tone
        oscillator.type = type === 'gentle' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequencies[i], this.audioContext.currentTime);

        // Configure volume envelope
        const startTime = this.audioContext.currentTime + (i * 0.15);
        const endTime = startTime + (duration / frequencies.length);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

        // Start and stop the tone
        oscillator.start(startTime);
        oscillator.stop(endTime);
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  /**
   * Get frequency patterns for different notification types
   */
  private static getFrequenciesForType(type: string): number[] {
    switch (type) {
      case 'achievement':
        return [523, 659, 784, 1047]; // C, E, G, C (major chord ascending)
      case 'urgent':
        return [800, 600, 800]; // Alert pattern
      case 'gentle':
        return [440, 554]; // A, C# (gentle tone)
      default:
        return [660, 840]; // Default pleasant tone
    }
  }

  /**
   * Trigger device vibration if supported
   */
  static vibrate(pattern: number | number[] = 200): void {
    if (!this.vibrationEnabled || typeof navigator === 'undefined' || !navigator.vibrate) {
      return;
    }

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Vibration not supported or failed:', error);
    }
  }

  /**
   * Show browser notification if permission is granted
   */
  static async showBrowserNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<Notification | null> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    // Check permission
    if (Notification.permission === 'granted') {
      try {
        return new Notification(title, {
          icon: '/favicon.ico',
          tag: 'ode-notification',
          renotify: false,
          ...options,
        });
      } catch (error) {
        console.warn('Failed to show browser notification:', error);
        return null;
      }
    } else if (Notification.permission === 'default') {
      // Request permission if not already determined
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          return this.showBrowserNotification(title, options);
        }
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }

    return null;
  }

  /**
   * Create visual flash effect for notifications
   */
  static createFlashEffect(element?: HTMLElement): void {
    if (typeof document === 'undefined') return;

    const targetElement = element || document.body;
    
    // Create flash overlay
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.1);
      pointer-events: none;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;

    document.body.appendChild(flash);

    // Trigger flash animation
    requestAnimationFrame(() => {
      flash.style.opacity = '1';
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => {
          if (flash.parentNode) {
            flash.parentNode.removeChild(flash);
          }
        }, 150);
      }, 100);
    });
  }

  /**
   * Combined notification feedback (sound + vibration + visual)
   */
  static async playNotificationFeedback(
    type: 'default' | 'achievement' | 'urgent' | 'gentle' = 'default',
    options: {
      sound?: boolean;
      vibration?: boolean;
      flash?: boolean;
      browserNotification?: { title: string; options?: NotificationOptions };
    } = {}
  ): Promise<void> {
    const {
      sound = true,
      vibration = true,
      flash = true,
      browserNotification
    } = options;

    // Initialize audio context if needed
    await this.initializeAudio();

    // Play sound
    if (sound) {
      await this.playNotificationSound(type);
    }

    // Vibrate device
    if (vibration) {
      const vibrationPatterns = {
        achievement: [100, 50, 100, 50, 200],
        urgent: [200, 100, 200],
        gentle: [100],
        default: [150],
      };
      this.vibrate(vibrationPatterns[type] || [150]);
    }

    // Visual flash
    if (flash) {
      this.createFlashEffect();
    }

    // Browser notification
    if (browserNotification) {
      await this.showBrowserNotification(
        browserNotification.title,
        browserNotification.options
      );
    }
  }

  /**
   * Enable/disable sounds
   */
  static setSoundsEnabled(enabled: boolean): void {
    this.soundsEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ode-notifications-sounds', enabled.toString());
    }
  }

  /**
   * Enable/disable vibration
   */
  static setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ode-notifications-vibration', enabled.toString());
    }
  }

  /**
   * Load settings from localStorage
   */
  static loadSettings(): void {
    if (typeof localStorage === 'undefined') return;

    const soundsSetting = localStorage.getItem('ode-notifications-sounds');
    const vibrationSetting = localStorage.getItem('ode-notifications-vibration');

    if (soundsSetting !== null) {
      this.soundsEnabled = soundsSetting === 'true';
    }

    if (vibrationSetting !== null) {
      this.vibrationEnabled = vibrationSetting === 'true';
    }
  }

  /**
   * Get current settings
   */
  static getSettings() {
    return {
      soundsEnabled: this.soundsEnabled,
      vibrationEnabled: this.vibrationEnabled,
    };
  }
}

// Load settings on initialization
if (typeof window !== 'undefined') {
  NotificationSoundService.loadSettings();
}

export default NotificationSoundService;