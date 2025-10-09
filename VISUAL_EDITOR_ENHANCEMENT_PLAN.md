# Visual Story Card Editor - Enhancement Plan

**Project**: The Ode Islands - Story Builder Visual Editor
**Date**: October 9, 2025
**Status**: Planning Phase

---

## Executive Summary

This document outlines a comprehensive plan to enhance the Story Builder's visual editor with advanced features for creating immersive, interactive story cards. The enhancements focus on:

1. **Drag & Drop Positioning** - Precise element placement
2. **Video Controls** - Start/end points and looping
3. **Animation System** - Element transitions and effects
4. **Responsive Preview** - Multi-device testing
5. **Layer Management** - Professional layout control
6. **Interactive Elements** - Hotspots and actions

---

## 1. Drag & Drop Positioning System

### Priority: 🔴 **HIGH**

### Description
Allow content creators to position text, images, and video elements anywhere on the card canvas using intuitive drag-and-drop.

### Technical Implementation

#### Frontend Components
```typescript
// New Component: DraggableElement.tsx
interface DraggableElementProps {
  type: 'text' | 'image' | 'video';
  position: { x: number; y: number }; // Percentage-based (0-100)
  size: { width: number; height: number }; // Percentage-based
  zIndex: number;
  onPositionChange: (position: Position) => void;
  onSizeChange: (size: Size) => void;
}
```

#### Libraries Required
- `@dnd-kit/core` - Modern drag-and-drop toolkit
- `@dnd-kit/modifiers` - Restrict dragging, snap to grid
- `react-rnd` - Resizable and draggable component

#### Data Schema Changes
```typescript
interface ElementPosition {
  x: number;          // Percentage (0-100)
  y: number;          // Percentage (0-100)
  width: number;      // Percentage (0-100)
  height: number;     // Percentage (0-100)
  zIndex: number;     // Layer order
  anchor: 'top-left' | 'center' | 'top-right' | 'bottom-left' | 'bottom-right';
  rotation: number;   // Degrees (0-360)
}

interface VisualCardLayout {
  text?: ElementPosition;
  image?: ElementPosition;
  video?: ElementPosition;
  overlays?: ElementPosition[];
}
```

#### Features
- [x] Drag elements to reposition
- [x] Resize elements with corner handles
- [x] Snap to grid (optional, toggle on/off)
- [x] Alignment guides (show when near center/edges)
- [x] Z-index controls (bring forward/send back)
- [x] Rotation handle
- [x] Lock element to prevent accidental moves
- [x] Keyboard shortcuts (arrow keys for fine-tuning)

#### Card Renderer Changes
```typescript
// src/components/StoryCardRenderer.tsx
const renderElement = (element: any, position: ElementPosition) => {
  const style = {
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    width: `${position.width}%`,
    height: `${position.height}%`,
    zIndex: position.zIndex,
    transform: `rotate(${position.rotation}deg)`,
    transformOrigin: position.anchor,
  };

  return <div style={style}>{/* element content */}</div>;
};
```

#### Milestones
1. **Week 1**: Basic drag-and-drop for text elements
2. **Week 2**: Add image and video dragging
3. **Week 3**: Resize handles and rotation
4. **Week 4**: Snap to grid and alignment guides
5. **Week 5**: Z-index controls and layer panel

---

## 2. Video Start/End Points & Trimming

### Priority: 🔴 **HIGH**

### Description
Allow precise control over which portion of a video plays on a story card without re-encoding the video file.

### Technical Implementation

#### Frontend Components
```typescript
// New Component: VideoTrimmer.tsx
interface VideoTrimmerProps {
  videoUrl: string;
  duration: number;
  startTime: number;
  endTime: number;
  onStartChange: (time: number) => void;
  onEndChange: (time: number) => void;
}
```

#### Data Schema
```typescript
interface VideoSettings {
  url: string;
  startTime: number;      // Seconds (e.g., 5.5)
  endTime: number;        // Seconds (e.g., 30.25)
  loop: VideoLoopMode;
  loopCount?: number;     // For 'loop-count' mode
  autoplay: boolean;
  muted: boolean;
  playbackSpeed: number;  // 0.5, 1, 1.5, 2
  opacity: number;        // 0-1
  blendMode?: string;     // CSS blend mode
}

type VideoLoopMode = 'once' | 'loop' | 'loop-count' | 'ping-pong';
```

#### UI Components
- Timeline scrubber with drag handles
- Current time display
- Preview thumbnails at key points
- Play/pause controls
- Frame-by-frame navigation (arrow keys)
- Visual waveform (if audio present)

#### Video Trimming Logic
```typescript
// Card renderer implementation
const videoRef = useRef<HTMLVideoElement>(null);

useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  // Set start time
  video.currentTime = settings.startTime;

  // Monitor playback
  const handleTimeUpdate = () => {
    if (video.currentTime >= settings.endTime) {
      handleVideoEnd();
    }
  };

  const handleVideoEnd = () => {
    switch (settings.loop) {
      case 'once':
        video.pause();
        break;
      case 'loop':
        video.currentTime = settings.startTime;
        video.play();
        break;
      case 'loop-count':
        if (loopCounter < settings.loopCount!) {
          video.currentTime = settings.startTime;
          video.play();
          setLoopCounter(c => c + 1);
        } else {
          video.pause();
        }
        break;
      case 'ping-pong':
        video.playbackRate *= -1; // Reverse playback (requires polyfill)
        break;
    }
  };

  video.addEventListener('timeupdate', handleTimeUpdate);
  return () => video.removeEventListener('timeupdate', handleTimeUpdate);
}, [settings]);
```

#### Milestones
1. **Week 1**: Basic timeline UI and scrubbing
2. **Week 2**: Start/end point selection
3. **Week 3**: Loop mode implementation
4. **Week 4**: Playback controls (speed, autoplay, muted)
5. **Week 5**: Preview thumbnails and waveform

---

## 3. Animation System

### Priority: 🟡 **MEDIUM-HIGH**

### Description
Add entrance, exit, and transition animations for all card elements.

### Technical Implementation

#### Animation Types
```typescript
interface ElementAnimation {
  entrance?: {
    type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'none';
    direction?: 'top' | 'bottom' | 'left' | 'right';
    duration: number;     // milliseconds
    delay: number;        // milliseconds
    easing: string;       // CSS easing function
  };
  exit?: {
    type: 'fade' | 'slide' | 'zoom' | 'none';
    direction?: 'top' | 'bottom' | 'left' | 'right';
    duration: number;
    easing: string;
  };
  loop?: {
    type: 'pulse' | 'shake' | 'rotate' | 'none';
    duration: number;
    iterations: number | 'infinite';
  };
}
```

#### Libraries
- **Framer Motion** (recommended) - React animation library
- Alternative: CSS animations with `@keyframes`

#### Example Implementation
```typescript
import { motion } from 'framer-motion';

const AnimatedElement = ({ animation, children }) => {
  const variants = {
    hidden: getHiddenState(animation.entrance),
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration: animation.entrance.duration / 1000,
        delay: animation.entrance.delay / 1000,
        ease: animation.entrance.easing,
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
    >
      {children}
    </motion.div>
  );
};
```

#### UI Components
- Animation preset gallery (show examples)
- Custom animation timeline editor
- Stagger controls (for multiple elements)
- Preview button to test animations

#### Milestones
1. **Week 1**: Entrance animations (fade, slide)
2. **Week 2**: Exit animations
3. **Week 3**: Loop animations
4. **Week 4**: Animation presets library
5. **Week 5**: Custom timeline editor

---

## 4. Responsive Preview System

### Priority: 🟡 **MEDIUM-HIGH**

### Description
Preview how story cards will look on different devices and orientations.

### Technical Implementation

#### Device Presets
```typescript
interface DevicePreset {
  name: string;
  width: number;
  height: number;
  dpi: number;
  userAgent: string;
}

const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'iPhone 15 Pro', width: 393, height: 852, dpi: 3, userAgent: '...' },
  { name: 'iPhone 15 Pro Max', width: 430, height: 932, dpi: 3, userAgent: '...' },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366, dpi: 2, userAgent: '...' },
  { name: 'Desktop HD', width: 1920, height: 1080, dpi: 1, userAgent: '...' },
  { name: 'Desktop 4K', width: 3840, height: 2160, dpi: 2, userAgent: '...' },
];
```

#### UI Components
```typescript
// New Component: ResponsivePreviewPanel.tsx
interface ResponsivePreviewProps {
  cardData: CardData;
  selectedDevice: DevicePreset;
  orientation: 'portrait' | 'landscape';
  showSafeArea: boolean;
  zoom: number; // 0.5, 0.75, 1, 1.5
}
```

#### Features
- Device preset selector
- Portrait/landscape toggle
- Safe area guides (for notches, status bars)
- Zoom controls
- Side-by-side comparison view
- Device frame overlay (optional)

#### Implementation
```tsx
const ResponsivePreview = ({ device, orientation, children }) => {
  const [width, height] = orientation === 'portrait'
    ? [device.width, device.height]
    : [device.height, device.width];

  return (
    <div className="preview-container" style={{
      width: `${width}px`,
      height: `${height}px`,
      transform: `scale(${zoom})`,
    }}>
      {showSafeArea && <SafeAreaGuide device={device} />}
      <iframe
        srcDoc={renderCardHTML(children)}
        width={width}
        height={height}
        style={{ border: 'none' }}
      />
    </div>
  );
};
```

#### Milestones
1. **Week 1**: Basic device presets
2. **Week 2**: Orientation toggle
3. **Week 3**: Safe area guides
4. **Week 4**: Zoom controls
5. **Week 5**: Side-by-side comparison

---

## 5. Layer Management Panel

### Priority: 🟢 **MEDIUM**

### Description
Professional-grade layer management for complex card layouts.

### Technical Implementation

#### UI Components
```typescript
// New Component: LayerPanel.tsx
interface Layer {
  id: string;
  type: 'text' | 'image' | 'video' | 'overlay';
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  opacity: number;
}

interface LayerPanelProps {
  layers: Layer[];
  selectedLayerId: string;
  onLayerSelect: (id: string) => void;
  onLayerReorder: (layers: Layer[]) => void;
  onLayerToggleVisible: (id: string) => void;
  onLayerToggleLock: (id: string) => void;
  onLayerDuplicate: (id: string) => void;
  onLayerDelete: (id: string) => void;
}
```

#### Features
- Drag to reorder layers (changes z-index)
- Show/hide eye icon
- Lock/unlock padlock icon
- Rename layers (double-click)
- Duplicate layer
- Delete layer
- Group layers (optional)
- Layer opacity slider
- Blend mode selector

#### UI Layout
```
┌─ Layers ────────────┐
│ 🔒 👁 Background    │
│ 👁 Video            │
│ 👁 Title Text   ← Selected
│ 🔒 👁 Subtitle      │
│ 👁 CTA Button       │
└─────────────────────┘
```

#### Implementation
```tsx
const LayerPanel = ({ layers, onLayerReorder }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={layers} strategy={verticalListSortingStrategy}>
        {layers.map(layer => (
          <SortableLayerItem key={layer.id} layer={layer} />
        ))}
      </SortableContext>
    </DndContext>
  );
};
```

#### Milestones
1. **Week 1**: Basic layer list
2. **Week 2**: Show/hide and lock
3. **Week 3**: Drag to reorder
4. **Week 4**: Duplicate and delete
5. **Week 5**: Groups and blend modes

---

## 6. Interactive Elements & Hotspots

### Priority: 🟢 **MEDIUM**

### Description
Add clickable areas to cards that trigger actions or navigation.

### Technical Implementation

#### Data Schema
```typescript
interface Hotspot {
  id: string;
  position: ElementPosition;
  shape: 'rectangle' | 'circle' | 'polygon';
  action: HotspotAction;
  label?: string;
  hoverEffect?: 'glow' | 'pulse' | 'bounce';
}

interface HotspotAction {
  type: 'navigate' | 'play-sound' | 'show-overlay' | 'external-link' | 'trigger-event';
  target?: string;      // URL, card ID, sound URL, etc.
  data?: any;           // Additional action data
}
```

#### UI Components
```typescript
// New Component: HotspotEditor.tsx
interface HotspotEditorProps {
  hotspots: Hotspot[];
  onHotspotAdd: (hotspot: Hotspot) => void;
  onHotspotEdit: (id: string, hotspot: Hotspot) => void;
  onHotspotDelete: (id: string) => void;
}
```

#### Card Renderer
```tsx
const HotspotRenderer = ({ hotspot, onClick }) => {
  const style = {
    position: 'absolute',
    left: `${hotspot.position.x}%`,
    top: `${hotspot.position.y}%`,
    width: `${hotspot.position.width}%`,
    height: `${hotspot.position.height}%`,
    cursor: 'pointer',
    border: '2px dashed rgba(255,255,255,0.3)', // Only in editor
  };

  return (
    <div
      style={style}
      onClick={() => handleHotspotClick(hotspot.action)}
      className={`hotspot-${hotspot.hoverEffect}`}
    />
  );
};

const handleHotspotClick = (action: HotspotAction) => {
  switch (action.type) {
    case 'navigate':
      router.push(action.target);
      break;
    case 'play-sound':
      new Audio(action.target).play();
      break;
    case 'show-overlay':
      setOverlayVisible(true);
      break;
    case 'external-link':
      window.open(action.target, '_blank');
      break;
    case 'trigger-event':
      eventBus.emit(action.target, action.data);
      break;
  }
};
```

#### Features
- Draw hotspot areas with mouse
- Shape options: rectangle, circle, custom polygon
- Action type selector
- Link to other cards in the story
- Play audio on click
- Show/hide overlays
- External link support
- Custom event triggers
- Hover effects and animations
- Analytics tracking (which hotspots are clicked)

#### Milestones
1. **Week 1**: Rectangle hotspots with navigate action
2. **Week 2**: Circle and polygon shapes
3. **Week 3**: Additional action types
4. **Week 4**: Hover effects
5. **Week 5**: Analytics integration

---

## 7. Additional Enhancements

### Asset Library Integration
- **Priority**: 🟢 **MEDIUM**
- Searchable library of pre-approved images, videos, sounds
- Drag from library directly onto canvas
- Tag and categorize assets
- Upload and manage custom assets

### Undo/Redo System
- **Priority**: 🔴 **HIGH**
- Full history of editor changes
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Timeline view of changes
- Revert to any previous state

### Collaboration Features
- **Priority**: 🟢 **LOW**
- Real-time multi-user editing
- Comments and annotations
- Change requests and approvals
- Version history

### Templates & Presets
- **Priority**: 🟡 **MEDIUM**
- Pre-built card templates
- Save custom templates
- Style presets (fonts, colors, layouts)
- Import/export templates

---

## Implementation Roadmap

### Phase 1: Foundation (Months 1-2)
- ✅ Drag & drop positioning
- ✅ Video trimming UI
- ✅ Basic animation system
- ✅ Undo/redo

### Phase 2: Polish (Months 3-4)
- ✅ Responsive preview
- ✅ Layer management
- ✅ Advanced video controls
- ✅ Animation presets

### Phase 3: Interactivity (Months 5-6)
- ✅ Hotspots and interactions
- ✅ Asset library
- ✅ Templates system
- ✅ Analytics

### Phase 4: Collaboration (Months 7+)
- ✅ Multi-user editing
- ✅ Comments and approvals
- ✅ Version control
- ✅ Advanced features

---

## Technical Architecture

### Component Structure
```
src/components/
├── VisualCardEditor/
│   ├── Canvas/
│   │   ├── DraggableElement.tsx
│   │   ├── ResizeHandles.tsx
│   │   ├── AlignmentGuides.tsx
│   │   └── SnapToGrid.tsx
│   ├── Panels/
│   │   ├── LayerPanel.tsx
│   │   ├── PropertyPanel.tsx
│   │   ├── AnimationPanel.tsx
│   │   └── HotspotPanel.tsx
│   ├── Controls/
│   │   ├── VideoTrimmer.tsx
│   │   ├── AnimationTimeline.tsx
│   │   └── DevicePreview.tsx
│   ├── AssetLibrary/
│   │   ├── AssetBrowser.tsx
│   │   └── AssetUploader.tsx
│   └── index.tsx
└── StoryCardRenderer/
    ├── ElementRenderer.tsx
    ├── AnimationRenderer.tsx
    ├── HotspotRenderer.tsx
    └── index.tsx
```

### State Management
```typescript
// Use Zustand or Redux for editor state
interface EditorState {
  elements: Element[];
  selectedElementId: string | null;
  history: EditorState[];
  historyIndex: number;
  previewDevice: DevicePreset;
  previewOrientation: 'portrait' | 'landscape';
  showGrid: boolean;
  snapToGrid: boolean;
}

const useEditorStore = create<EditorState>((set) => ({
  // ... state and actions
}));
```

### Database Schema Updates
```sql
-- Add to story_cards table
ALTER TABLE story_cards ADD COLUMN visual_layout JSONB;
ALTER TABLE story_cards ADD COLUMN animations JSONB;
ALTER TABLE story_cards ADD COLUMN hotspots JSONB;
ALTER TABLE story_cards ADD COLUMN video_settings JSONB;

-- New table for templates
CREATE TABLE card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  template_data JSONB NOT NULL,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- New table for asset library
CREATE TABLE media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'image', 'video', 'audio'
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  file_size BIGINT,
  duration FLOAT, -- for video/audio
  width INTEGER, -- for image/video
  height INTEGER, -- for image/video
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing Strategy

### Unit Tests
- Component rendering
- Drag/drop logic
- Animation calculations
- Video trimming accuracy

### Integration Tests
- Editor → Database save/load
- Card renderer displays correctly
- Hotspot interactions work
- Responsive preview accuracy

### End-to-End Tests
- Create a card from scratch
- Edit existing card
- Preview on multiple devices
- Publish and view in app

### Performance Tests
- Large cards (10+ elements)
- Video playback performance
- Animation frame rate
- Editor responsiveness

---

## Success Metrics

### User Experience
- Time to create a card: **< 5 minutes** (down from 15)
- Editor learning curve: **< 30 minutes** (down from 2 hours)
- User satisfaction: **> 8/10**

### Technical Performance
- Editor load time: **< 2 seconds**
- Drag/drop responsiveness: **60 FPS**
- Video preview lag: **< 100ms**
- Save operation: **< 1 second**

### Business Impact
- Cards created per week: **3x increase**
- Card quality score: **+40%**
- Developer time saved: **20 hours/week**
- Content creator satisfaction: **+50%**

---

## Risk Assessment

### High Risk
- **Video trimming browser compatibility** - Not all browsers support reverse playback
  - *Mitigation*: Polyfill or fallback to standard playback

- **Performance with complex cards** - Many animations may lag
  - *Mitigation*: Implement element limit, optimize rendering

### Medium Risk
- **Learning curve for new features** - Users may find it overwhelming
  - *Mitigation*: Gradual rollout, tooltips, video tutorials

- **Data migration** - Existing cards may not work with new schema
  - *Mitigation*: Migration scripts, backward compatibility

### Low Risk
- **Browser compatibility** - Older browsers may not support all features
  - *Mitigation*: Progressive enhancement, feature detection

---

## Resource Requirements

### Team
- **1 Senior Frontend Developer** (Full-time, 6 months)
- **1 UI/UX Designer** (Full-time, 3 months)
- **1 QA Engineer** (Part-time, ongoing)
- **1 Technical Writer** (Part-time, 1 month)

### Infrastructure
- **Asset CDN** - For media library ($100-500/month)
- **Video processing** - For thumbnail generation ($50-200/month)
- **Testing devices** - Physical devices for QA ($1000-2000 one-time)

### Third-Party Services
- **Framer Motion License** - Free (open source)
- **@dnd-kit License** - Free (open source)
- **Video processing API** - Optional (Mux, Cloudinary) ($50-500/month)

---

## Next Steps

1. **Review and approve plan** ✅
2. **Set up project tracking** (Jira/Linear/GitHub Projects)
3. **Create detailed technical specs** for Phase 1
4. **Design mockups** for new UI components
5. **Begin Phase 1 development** (Drag & Drop + Video Trimming)

---

## Questions for Stakeholders

1. What is the **priority order** for these features?
2. What is the **timeline/deadline** for completion?
3. Are there any **additional features** not covered here?
4. What is the **budget** for third-party services?
5. Who will be the **primary users** to test with?
6. Are there any **technical constraints** (browser support, devices)?

---

**Document Owner**: Development Team
**Last Updated**: October 9, 2025
**Status**: ✅ Ready for Review
