# Immersive Event Platform

An interactive storytelling platform built with Next.js that creates immersive experiences through cards, AR content, and memory collection features.

## 🚀 Quick Start

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📋 Table of Contents

- [Multi-Button Card Actions System](#multi-button-card-actions-system)
- [Action Types](#action-types)
- [Button Configuration](#button-configuration)
- [Positioning System](#positioning-system)
- [Accessibility Features](#accessibility-features)
- [Migration Guide](#migration-guide)
- [API Reference](#api-reference)
- [Development](#development)

---

## 🎯 Multi-Button Card Actions System

The unified Multi-Button Card Actions system provides a comprehensive solution for creating interactive buttons on story cards. This system consolidates the functionality of legacy `CustomButton` and `EnhancedCustomButton` components into a single, powerful `CardButton` component.

### Key Features

- **7 Unified Action Types**: Navigate to chapters, sub-chapters, cards, external URLs, AR content, memory wallet, and embedded content
- **Advanced Positioning**: Percentage-based and pixel-based positioning with visual safety boundaries
- **Rich Animations**: Built-in animation system with timing controls and customizable transitions
- **Unlock Conditions**: Progressive disclosure system with conditional button visibility
- **Accessibility Support**: Full keyboard navigation, screen reader support, and focus management
- **Backward Compatibility**: Seamless migration from legacy button systems

---

## 🎬 Action Types

The system supports 7 distinct action types, each optimized for specific use cases:

### 1. Sub-Chapter Navigation (`sub-chapter`)
Navigate to hidden content sections or bonus chapters.

```javascript
{
  type: 'sub-chapter',
  target: 'chapter-1-bonus'
}
```

**Use Cases:**
- Bonus content unlocked by achievements
- Hidden story branches
- Character backstory sections
- Easter egg content

### 2. Chapter Navigation (`chapter`)
Navigate to main story chapters.

```javascript
{
  type: 'chapter',
  target: 'chapter-2'
}
```

**Use Cases:**
- Story progression buttons
- Chapter selection menus
- Continue story functionality
- Flashback sequences

### 3. Card Navigation (`card`)
Direct navigation to specific cards within chapters.

```javascript
{
  type: 'card',
  target: 'chapter-1/card-3'
}
```

**Use Cases:**
- Jump to specific story moments
- Reference previous conversations
- Navigate to character introductions
- Skip to key story beats

### 4. External URL (`external-url`)
Links to external websites with security validation.

```javascript
{
  type: 'external-url',
  target: 'https://example.com'
}
```

**Use Cases:**
- Artist portfolio links
- Social media connections
- Merchandise stores
- Community forums

**Security Features:**
- HTTPS enforcement for external links
- `noopener,noreferrer` attributes
- URL validation and sanitization

### 5. AR Item (`ar-item`)
Launch augmented reality experiences.

```javascript
{
  type: 'ar-item',
  target: 'ar-character-model'
}
```

**Use Cases:**
- 3D character viewing
- Environmental AR scenes
- Interactive object inspection
- Location-based AR content

### 6. Memory Wallet (`wallet`)
Access memory collection features.

```javascript
{
  type: 'wallet'
  // No target required - navigates to memory wallet
}
```

**Use Cases:**
- View collected memories
- Access character profiles
- Review story achievements
- Check collectible progress

### 7. Embedded Content (`iframe`)
Display external content in a secure modal overlay.

```javascript
{
  type: 'iframe',
  target: 'https://example.com/embed',
  iframeConfig: {
    width: 800,
    height: 600,
    allowFullscreen: true
  }
}
```

**Use Cases:**
- YouTube video embeds
- Interactive maps
- External forms
- Third-party content integration

**Security Features:**
- Sandboxed iframes with restricted permissions
- Content Security Policy enforcement
- Escape key and click-outside closing
- Fullscreen capability control

---

## ⚙️ Button Configuration

### Basic Button Structure

```javascript
const button = {
  id: 'unique-button-id',
  label: 'Button Text',
  variant: 'primary', // 'primary' | 'secondary' | 'ghost' | 'link'
  icon: 'arrow-right', // Optional icon
  action: {
    type: 'chapter',
    target: 'chapter-2'
  },
  position: {
    x: 50,
    y: 80,
    unit: 'percent' // 'percent' | 'pixel'
  },
  timing: {
    visibleFrom: 2.0, // Seconds delay
    animationDelay: 0.5
  },
  animation: {
    type: 'fadeIn', // 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'bounce' | 'scale'
    duration: 0.6,
    easing: 'ease'
  },
  styling: {
    backgroundColor: '#3B82F6',
    textColor: '#FFFFFF',
    borderRadius: '9999px',
    padding: '12px 24px'
  },
  unlockConditions: [], // Optional unlock requirements
  isUnlocked: true,
  unlockHint: 'Complete Chapter 1 to unlock'
}
```

### Button Variants

#### Primary Button
- **Usage**: Main call-to-action buttons
- **Style**: Bold background, high contrast
- **Best for**: Story progression, important actions

#### Secondary Button
- **Usage**: Alternative actions
- **Style**: Muted background, medium contrast
- **Best for**: Optional content, settings

#### Ghost Button
- **Usage**: Subtle interactions
- **Style**: Transparent background, border outline
- **Best for**: Navigation, back buttons

#### Link Button
- **Usage**: Text-based actions
- **Style**: Underlined text, minimal styling
- **Best for**: References, external links

### Icon Library

Available icons for enhanced button communication:

- `arrow-right`: Navigation and progression
- `play`: Media and interactive content
- `ar`: Augmented reality experiences
- `gift`: Collectibles and rewards
- `wallet`: Memory wallet access
- `external`: External links
- `lock`: Locked content indicators

---

## 📍 Positioning System

### Percentage-Based Positioning (Recommended)

Percentage positioning provides responsive layout that adapts to different screen sizes:

```javascript
position: {
  x: 50,    // 50% from left edge
  y: 80,    // 80% from top edge
  unit: 'percent'
}
```

**Benefits:**
- Responsive across all screen sizes
- Consistent relative positioning
- Safe boundaries (5%-95% recommended)
- Automatic centering with transform

**Best Practices:**
- Keep buttons within 5%-95% range for safety
- Use 50% for center positioning
- Consider mobile screen ratios
- Test on various viewport sizes

### Pixel-Based Positioning

Pixel positioning provides exact placement for specific designs:

```javascript
position: {
  x: 320,   // 320px from left edge
  y: 240,   // 240px from top edge
  unit: 'pixel'
}
```

**Use Cases:**
- Fixed layout designs
- Pixel-perfect alignment
- Desktop-specific interfaces
- Precise positioning requirements

### Position Safety Guidelines

The CMS editor includes validation to ensure buttons remain visible and accessible:

- **Safe Zone**: 5%-95% for percentage positioning
- **Mobile Considerations**: Avoid edges where system UI might interfere
- **Overlap Prevention**: Visual preview helps identify positioning conflicts
- **Accessibility**: Ensure buttons meet minimum touch target sizes (44px)

---

## ♿ Accessibility Features

### Keyboard Navigation

All buttons support full keyboard accessibility:

```javascript
// Automatic keyboard support
onFocus={(e) => {
  e.currentTarget.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
  e.currentTarget.style.outlineOffset = '2px';
}}
```

**Features:**
- Tab navigation through buttons
- Enter/Space key activation
- Visible focus indicators
- Focus management for modals

### Screen Reader Support

Enhanced screen reader accessibility:

```javascript
<button
  aria-label={displayText}
  title={isLocked ? unlockHint : undefined}
>
  <span className="sr-only">{unlockHint}</span>
</button>
```

**Features:**
- Descriptive aria-labels
- Hidden hint text for locked buttons
- Semantic button structure
- Status announcements

### Visual Accessibility

- **High Contrast**: Meets WCAG AA contrast requirements
- **Focus Indicators**: Clear visual focus states
- **Lock Indicators**: Visual and textual locked state communication
- **Animation Control**: Respects user motion preferences

### Touch Accessibility

- **Minimum Target Size**: 44px minimum for touch targets
- **Touch Feedback**: Visual feedback on touch interactions
- **Safe Positioning**: Prevents buttons in system gesture areas

---

## 🔄 Migration Guide

### From Legacy CustomButton

The unified system provides backward compatibility while encouraging migration to the new action format.

#### Legacy Link Format (Deprecated)
```javascript
// Old format - still supported
{
  link: {
    type: 'external',
    url: 'https://example.com'
  }
}
```

#### New Action Format (Recommended)
```javascript
// New format
{
  action: {
    type: 'external-url',
    target: 'https://example.com'
  }
}
```

### Action Type Mapping

| Legacy Type | New Type | Notes |
|-------------|----------|--------|
| `external` | `external-url` | Same functionality |
| `chapter` | `chapter` | No changes needed |
| `subchapter` | `sub-chapter` | Consistent naming |
| `iframe` | `iframe` | Enhanced security |

### Migration Helper Functions

#### Automatic Migration
```javascript
import { migrateLegacyButton } from '@/components/CardButton';

const modernButton = migrateLegacyButton(legacyButton);
```

#### Manual Migration Steps

1. **Update Action Format**
   ```javascript
   // Before
   link: { type: 'external', url: 'https://example.com' }
   
   // After
   action: { type: 'external-url', target: 'https://example.com' }
   ```

2. **Standardize Labels**
   ```javascript
   // Before
   text: 'Button Text'
   
   // After
   label: 'Button Text'
   ```

3. **Enhance Positioning**
   ```javascript
   // Before
   position: { x: 50, y: 80 }
   
   // After
   position: { x: 50, y: 80, unit: 'percent' }
   ```

### Common Migration Issues

#### Issue: Button Not Appearing
**Solution**: Check that `isUnlocked` is set to `true` or remove `unlockConditions`

#### Issue: Positioning Problems
**Solution**: Ensure position values are within safe boundaries (5%-95%)

#### Issue: Action Not Working
**Solution**: Verify action type matches new format and target is valid

---

## 📚 API Reference

### CardButton Component

Main component for rendering interactive buttons with unified action system.

```typescript
interface CardButtonProps {
  button: CustomButtonData;
  active: boolean;
  cardTheme?: CardTheme;
  className?: string;
  onClick?: () => void;
}
```

**Props:**
- `button`: Complete button configuration object
- `active`: Whether the card/button is currently active for timing
- `cardTheme`: Theme colors from parent card
- `className`: Additional CSS classes
- `onClick`: Optional override for button click behavior

### CardActionRouter Class

Centralized routing logic for all button actions with security validation.

#### Methods

```typescript
executeAction(action: ActionConfig): void
```
Execute a unified action with validation and security checks.

```typescript
executeLegacyAction(link: LegacyActionConfig): void
```
Execute legacy link actions for backward compatibility.

#### Security Features

- **URL Validation**: Ensures valid URL format
- **HTTPS Enforcement**: Blocks non-secure external URLs
- **Identifier Validation**: Validates internal navigation targets
- **Iframe Sandboxing**: Applies security restrictions to embedded content

### Validation Functions

#### validateButtonData()
```typescript
function validateButtonData(button: CustomButtonData): {
  isValid: boolean;
  errors: string[];
}
```

Validates button configuration and returns detailed error information.

**Validation Rules:**
- Required fields: `id`, `label` or `text`
- Action configuration completeness
- Position boundary checking
- Timing value validation
- URL format verification

#### migrateLegacyButton()
```typescript
function migrateLegacyButton(button: any): CustomButtonData
```

Converts legacy button format to unified system with enhanced features.

**Migration Features:**
- Preserves all existing functionality
- Adds enhanced features when possible
- Maintains backward compatibility
- Standardizes field naming

### Error Handling

The system provides comprehensive error handling:

```javascript
// Console warnings for development
console.warn('Button has no action or link configuration:', button);

// User-friendly error messages
alert('This content is locked. Complete the requirements to unlock.');

// Validation feedback
const validation = validateButtonData(button);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### Security Considerations

#### External URL Security
- HTTPS-only enforcement for production
- `noopener,noreferrer` attributes
- URL sanitization and validation

#### Iframe Security
- Sandboxed execution environment
- Restricted permissions (`allow-scripts allow-same-origin`)
- Content Security Policy enforcement
- Referrer policy protection

#### Input Validation
- Identifier format validation (`^[a-zA-Z0-9\-_\/]+$`)
- Position boundary checking
- Timing value sanitization

---

## 🛠 Development

### Environment Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Project Structure

```
src/
├── components/
│   ├── CardButton.tsx          # Unified button component
│   ├── CardActionRouter.tsx    # Action routing logic
│   └── CardEditorButtons.tsx   # CMS editing interface
├── app/
│   └── admin/cms/edit/         # Button management interface
├── types/                      # TypeScript definitions
└── utils/                      # Utility functions
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test CardButton
npm test CardActionRouter

# Run integration tests
npm test integration
```

### Building for Production

```bash
npm run build
npm start
```

---

## 📄 License

This project is built with [Next.js](https://nextjs.org) and follows modern web development best practices.

For more information about Next.js:
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub](https://github.com/vercel/next.js)
