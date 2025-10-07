/**
 * Admin CMS Design System Tokens
 * 
 * Dark glass aesthetic with fuchsia accents for the Admin interface.
 * These tokens ensure visual consistency across all Admin CMS components.
 * 
 * Usage:
 * ```tsx
 * import { surfaces, focus, pills } from '@/lib/admin/designTokens'
 * 
 * <div className={surfaces.darkGlass}>
 *   <button className={`${pills.base} ${focus.ring}`}>
 *     Action
 *   </button>
 * </div>
 * ```
 */

/**
 * Surface Tokens
 * Glass morphism surfaces with backdrop blur for depth and hierarchy
 */
export const surfaces = {
  /**
   * Dark glass surface - primary background for Admin UI
   * Semi-transparent slate with blur for depth
   */
  darkGlass: 'bg-slate-900/70 backdrop-blur-md',
  
  /**
   * Light glass surface - secondary/overlay backgrounds
   * Semi-transparent white with blur for contrast
   */
  lightGlass: 'bg-white/85 backdrop-blur-md',
  
  /**
   * Subtle glass - less prominent sections
   */
  subtleGlass: 'bg-slate-800/50 backdrop-blur-sm',
  
  /**
   * Card glass - for card components
   */
  cardGlass: 'bg-slate-900/60 backdrop-blur-lg',
  
  /**
   * Overlay glass - for modals and drawers
   */
  overlayGlass: 'bg-slate-950/80 backdrop-blur-xl',
} as const;

/**
 * Backdrop Blur Tokens
 * Varying levels of blur for different UI depths
 */
export const blur = {
  none: 'backdrop-blur-none',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
  '3xl': 'backdrop-blur-3xl',
} as const;

/**
 * Pill Tokens
 * Rounded pill shapes for navigation and tags
 */
export const pills = {
  /**
   * Base pill shape - fully rounded
   */
  base: 'rounded-full',
  
  /**
   * Pill with dark glass surface
   */
  dark: 'rounded-full bg-slate-900/70 backdrop-blur-md',
  
  /**
   * Pill with light glass surface
   */
  light: 'rounded-full bg-white/85 backdrop-blur-md',
  
  /**
   * Interactive pill with hover states
   */
  interactive: 'rounded-full bg-slate-900/70 backdrop-blur-md hover:bg-slate-800/80 transition-colors',
  
  /**
   * Active/selected pill state
   */
  active: 'rounded-full bg-fuchsia-600/90 backdrop-blur-md',
  
  /**
   * Pill padding variants
   */
  padding: {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
  },
} as const;

/**
 * Focus State Tokens
 * Accessible focus indicators using fuchsia accent
 */
export const focus = {
  /**
   * Primary focus ring - fuchsia with 2px width
   */
  ring: 'focus-visible:ring-2 ring-fuchsia-400 focus-visible:outline-none',
  
  /**
   * Focus ring with offset for better visibility
   */
  ringOffset: 'focus-visible:ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-slate-900 focus-visible:outline-none',
  
  /**
   * Focus ring inset variant
   */
  ringInset: 'focus-visible:ring-2 focus-visible:ring-inset ring-fuchsia-400 focus-visible:outline-none',
  
  /**
   * Subtle focus state
   */
  ringSubtle: 'focus-visible:ring-1 ring-fuchsia-400/50 focus-visible:outline-none',
} as const;

/**
 * Color Tokens
 * Fuchsia accent colors and slate backgrounds
 */
export const colors = {
  /**
   * Fuchsia accent colors
   */
  accent: {
    primary: 'text-fuchsia-400',
    hover: 'hover:text-fuchsia-300',
    bg: 'bg-fuchsia-600',
    bgHover: 'hover:bg-fuchsia-500',
    bgTranslucent: 'bg-fuchsia-600/20',
    bgDragOver: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-400',
    borderSubtle: 'border-fuchsia-400/50',
    borderTranslucent: 'border-fuchsia-500/30',
    borderTop: 'border-t-fuchsia-600',
    ring: 'ring-fuchsia-400',
  },
  
  /**
   * Slate background colors
   */
  slate: {
    bg50: 'bg-slate-50',
    bg100: 'bg-slate-100',
    bg800: 'bg-slate-800',
    bg900: 'bg-slate-900',
    bg950: 'bg-slate-950',
    text: 'text-slate-100',
    textMuted: 'text-slate-400',
    border: 'border-slate-700',
    borderHover: 'hover:border-slate-600',
  },
  
  /**
   * Status colors
   */
  status: {
    live: 'bg-green-500/90',
    draft: 'bg-yellow-500/90',
    scheduled: 'bg-blue-500/90',
    archived: 'bg-slate-500/90',
    purple: 'bg-purple-500/90',
    orange: 'bg-orange-500/90',
  },
  
  /**
   * Error and warning colors
   */
  error: {
    text: 'text-rose-400',
    textAlt: 'text-red-400',
    textLight: 'text-red-600',
    hover: 'hover:text-red-300',
    hoverTextDark: 'hover:text-red-700',
    bg: 'bg-red-500/10',
    bgLight: 'bg-red-100',
    bgHover: 'hover:bg-red-500/10',
    border: 'border-red-500/30',
    borderLight: 'border-red-300',
  },
  warning: 'text-amber-400',
  success: 'text-emerald-400',
  info: 'text-sky-400',
  
  /**
   * Page background
   */
  pageBg: 'bg-slate-950',
  
  /**
   * Modal/overlay backgrounds
   */
  modalOverlay: 'bg-slate-950/80 backdrop-blur-md',
  
  /**
   * Gradients
   */
  gradients: {
    primary: 'bg-gradient-to-br from-fuchsia-500 to-purple-500',
    dark: 'bg-gradient-to-t from-black/90 via-black/50 to-transparent',
    darker: 'bg-gradient-to-t from-black/80 via-transparent to-transparent',
  },
  
  /**
   * Icon and badge colors
   */
  icon: {
    muted: 'text-slate-400',
    active: 'text-white',
    accent: 'text-fuchsia-400',
  },
} as const;

/**
 * Border Tokens
 * Border radius and border styles
 */
export const borders = {
  /**
   * Border radius values
   */
  radius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  },
  
  /**
   * Border widths
   */
  width: {
    0: 'border-0',
    1: 'border',
    2: 'border-2',
    4: 'border-4',
  },
  
  /**
   * Border styles with glass aesthetic
   */
  glassBorder: 'border border-white/10',
  accentBorder: 'border border-fuchsia-400/30',
} as const;

/**
 * Spacing Tokens
 * Consistent spacing for layout
 */
export const spacing = {
  /**
   * Container max widths
   */
  container: {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
  },
  
  /**
   * Common gaps
   */
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },
  
  /**
   * Padding values
   */
  padding: {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
} as const;

/**
 * Navigation Tokens
 * Top bar and sub-navigation styles
 */
export const navigation = {
  /**
   * Top bar - global admin navigation
   */
  topBar: `${surfaces.darkGlass} ${borders.glassBorder} sticky top-0 z-50`,
  
  /**
   * Section sub-navigation - sticky pills below top bar
   */
  subNav: `${surfaces.darkGlass} sticky top-16 z-40 ${borders.glassBorder}`,
  
  /**
   * Sub-nav horizontal scroll on mobile
   */
  subNavScroll: 'flex overflow-x-auto scrollbar-hide space-x-2 px-4 py-3',
  
  /**
   * Nav item base
   */
  navItem: `${pills.base} ${pills.padding.md} ${focus.ring} transition-all duration-200`,
  
  /**
   * Active nav item
   */
  navItemActive: `${pills.active} text-white font-medium`,
  
  /**
   * Inactive nav item
   */
  navItemInactive: `${pills.dark} text-slate-300 hover:text-white hover:bg-slate-800/80`,
} as const;

/**
 * Layout Tokens
 * Common layout patterns
 */
export const layout = {
  /**
   * Admin page wrapper
   */
  page: 'min-h-screen bg-slate-950',
  
  /**
   * Content container
   */
  content: `${spacing.container.lg} mx-auto px-4 py-6`,
  
  /**
   * Drawer/modal overlay
   */
  overlay: 'fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40',
  
  /**
   * Drawer panel (right side)
   */
  drawer: `${surfaces.overlayGlass} ${borders.glassBorder} fixed right-0 top-0 h-full w-full md:w-2xl z-50 transform transition-transform duration-300`,
  
  /**
   * Card grid layout
   */
  grid: {
    cols2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    cols3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
    cols4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  },
} as const;

/**
 * Interactive States
 * Hover, active, disabled states
 */
export const interactive = {
  /**
   * Hover transitions
   */
  hover: 'transition-all duration-200 hover:scale-105',
  hoverSubtle: 'transition-colors duration-200',
  
  /**
   * Active/pressed state
   */
  active: 'active:scale-95',
  
  /**
   * Disabled state
   */
  disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
  
  /**
   * Clickable/interactive indicator
   */
  clickable: 'cursor-pointer',
} as const;

/**
 * Typography Tokens
 * Text styles for admin interface
 */
export const typography = {
  /**
   * Headings
   */
  h1: 'text-3xl font-bold text-white',
  h2: 'text-2xl font-bold text-white',
  h3: 'text-xl font-semibold text-white',
  h4: 'text-lg font-semibold text-white',
  
  /**
   * Body text
   */
  body: 'text-base text-slate-100',
  bodyMuted: 'text-sm text-slate-400',
  
  /**
   * Labels
   */
  label: 'text-sm font-medium text-slate-200',
  labelMuted: 'text-xs font-medium text-slate-400 uppercase tracking-wide',
  
  /**
   * Interactive text
   */
  link: `${colors.accent.primary} ${colors.accent.hover} ${interactive.hoverSubtle}`,
} as const;

/**
 * Shadow Tokens
 * Elevation and depth
 */
export const shadows = {
  sm: 'shadow-sm shadow-black/20',
  md: 'shadow-md shadow-black/30',
  lg: 'shadow-lg shadow-black/40',
  xl: 'shadow-xl shadow-black/50',
  inner: 'shadow-inner shadow-black/30',
  glow: 'shadow-lg shadow-fuchsia-500/20',
} as const;

/**
 * Animation Tokens
 * Transition and animation utilities
 */
export const animations = {
  /**
   * Transition speeds
   */
  transition: {
    fast: 'transition-all duration-150',
    base: 'transition-all duration-200',
    slow: 'transition-all duration-300',
  },
  
  /**
   * Common animations
   */
  fadeIn: 'animate-fade-in',
  slideIn: 'animate-slide-in',
  
  /**
   * Loading states
   */
  pulse: 'animate-pulse',
  spin: 'animate-spin',
} as const;

/**
 * Utility function to combine token classes
 * Useful for creating component variants
 */
export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Pre-composed component tokens for common patterns
 */
export const components = {
  /**
   * Primary button with glass effect
   */
  buttonPrimary: cx(
    pills.base,
    pills.padding.md,
    colors.accent.bg,
    colors.accent.bgHover,
    focus.ring,
    interactive.hoverSubtle,
    interactive.active,
    'text-white font-medium'
  ),
  
  /**
   * Secondary button with glass effect
   */
  buttonSecondary: cx(
    pills.base,
    pills.padding.md,
    surfaces.darkGlass,
    borders.glassBorder,
    focus.ring,
    'text-white hover:bg-slate-800/80',
    interactive.hoverSubtle,
    interactive.active
  ),
  
  /**
   * Card component
   */
  card: cx(
    surfaces.cardGlass,
    borders.glassBorder,
    borders.radius.xl,
    spacing.padding.md,
    shadows.md
  ),
  
  /**
   * Input field
   */
  input: cx(
    surfaces.darkGlass,
    borders.glassBorder,
    borders.radius.lg,
    spacing.padding.md,
    focus.ring,
    'text-white placeholder:text-slate-400'
  ),
  
  /**
   * Badge/status pill
   */
  badge: cx(
    pills.base,
    pills.padding.sm,
    'text-xs font-medium backdrop-blur-md'
  ),
} as const;
