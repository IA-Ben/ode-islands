import React from 'react';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  Scan, 
  Image as ImageIcon,
  Video,
  Sparkles,
  ShoppingBag,
  Coffee,
  Edit,
  Copy,
  Archive
} from 'lucide-react';
import { surfaces, pills, focus, colors, interactive, borders, shadows, typography } from '@/lib/admin/designTokens';

export interface CardData {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  scope: 'story' | 'event';
  eventLane?: 'info' | 'interact' | 'rewards';
  publishStatus: 'draft' | 'in_review' | 'published' | 'archived';
  minTier?: string;
  updatedAt: string;
  imageMedia?: { publicUrl: string };
}

interface CardTileProps {
  card: CardData;
  onEdit: (card: CardData) => void;
  onDuplicate: (card: CardData) => void;
  onArchive: (card: CardData) => void;
}

const getTypeIcon = (type: string) => {
  const iconClass = 'w-5 h-5';
  
  switch (type) {
    case 'text-story':
    case 'text':
      return <FileText className={iconClass} />;
    case 'schedule':
      return <Calendar className={iconClass} />;
    case 'map':
    case 'venue':
      return <MapPin className={iconClass} />;
    case 'qr-scan':
      return <Scan className={iconClass} />;
    case 'user-media':
      return <ImageIcon className={iconClass} />;
    case 'video':
      return <Video className={iconClass} />;
    case 'ar-story':
    case 'live-ar':
      return <Sparkles className={iconClass} />;
    case 'merch':
      return <ShoppingBag className={iconClass} />;
    case 'food-beverage':
      return <Coffee className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
};

const getScopeBadgeClass = (scope: 'story' | 'event') => {
  return scope === 'story' 
    ? 'bg-purple-500/90 text-white' 
    : 'bg-blue-500/90 text-white';
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'published':
      return 'bg-green-500/90 text-white';
    case 'in_review':
      return 'bg-yellow-500/90 text-white';
    case 'archived':
      return 'bg-slate-500/90 text-white';
    case 'draft':
    default:
      return 'bg-slate-600/90 text-white';
  }
};

const getLaneLabel = (lane?: 'info' | 'interact' | 'rewards') => {
  switch (lane) {
    case 'info':
      return 'Info';
    case 'interact':
      return 'Interact';
    case 'rewards':
      return 'Rewards';
    default:
      return null;
  }
};

export const CardTile: React.FC<CardTileProps> = ({ card, onEdit, onDuplicate, onArchive }) => {
  return (
    <div
      className={`
        ${surfaces.cardGlass}
        ${borders.glassBorder}
        ${borders.radius.xl}
        ${shadows.md}
        ${interactive.hoverSubtle}
        p-4
        hover:shadow-lg hover:shadow-fuchsia-500/10
        group
      `}
      role="article"
      aria-label={`Card: ${card.title}`}
    >
      {/* Card Image */}
      {card.imageMedia?.publicUrl && (
        <div className={`${borders.radius.lg} overflow-hidden mb-3`}>
          <img
            src={card.imageMedia.publicUrl}
            alt={card.title}
            className="w-full h-32 object-cover"
          />
        </div>
      )}

      {/* Header with Type Icon and Badges */}
      <div className="flex items-start justify-between mb-3">
        <div className={`${colors.accent.primary} p-2 ${surfaces.subtleGlass} ${borders.radius.lg}`}>
          {getTypeIcon(card.type)}
        </div>
        
        <div className="flex gap-2 flex-wrap justify-end">
          <span className={`${pills.base} ${pills.padding.sm} ${getScopeBadgeClass(card.scope)} text-xs font-medium`}>
            {card.scope === 'story' ? 'Story' : 'Event'}
          </span>
          {card.scope === 'event' && card.eventLane && (
            <span className={`${pills.base} ${pills.padding.sm} bg-fuchsia-600/90 text-white text-xs font-medium`}>
              {getLaneLabel(card.eventLane)}
            </span>
          )}
        </div>
      </div>

      {/* Title and Subtitle */}
      <div className="mb-3">
        <h3 className={`${typography.h4} text-base mb-1 line-clamp-2`}>
          {card.title}
        </h3>
        {card.subtitle && (
          <p className={`${typography.bodyMuted} line-clamp-1`}>
            {card.subtitle}
          </p>
        )}
      </div>

      {/* Status and Tier */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`${pills.base} ${pills.padding.sm} ${getStatusBadgeClass(card.publishStatus)} text-xs font-medium`}>
          {card.publishStatus.replace('_', ' ')}
        </span>
        {card.minTier && (
          <span className={`${pills.base} ${pills.padding.sm} ${surfaces.subtleGlass} ${colors.slate.textMuted} text-xs font-medium`}>
            Tier: {card.minTier}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => onEdit(card)}
          className={`
            flex-1 flex items-center justify-center gap-2
            ${pills.base} ${pills.padding.sm}
            ${surfaces.darkGlass}
            ${borders.glassBorder}
            ${focus.ring}
            ${interactive.hoverSubtle}
            ${interactive.active}
            ${colors.slate.text}
            hover:bg-slate-800/80
            text-sm font-medium
          `}
          aria-label={`Edit ${card.title}`}
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
        
        <button
          onClick={() => onDuplicate(card)}
          className={`
            px-3 py-2
            ${pills.base}
            ${surfaces.darkGlass}
            ${borders.glassBorder}
            ${focus.ring}
            ${interactive.hoverSubtle}
            ${interactive.active}
            ${colors.slate.text}
            hover:bg-slate-800/80
          `}
          aria-label={`Duplicate ${card.title}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        
        <button
          onClick={() => onArchive(card)}
          className={`
            px-3 py-2
            ${pills.base}
            ${surfaces.darkGlass}
            ${borders.glassBorder}
            ${focus.ring}
            ${interactive.hoverSubtle}
            ${interactive.active}
            ${colors.slate.text}
            hover:bg-slate-800/80
          `}
          aria-label={`Archive ${card.title}`}
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
