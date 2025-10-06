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
  Archive,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { surfaces, pills, focus, colors, interactive, borders, typography } from '@/lib/admin/designTokens';
import { CardData } from './CardTile';

interface CardTableProps {
  cards: CardData[];
  onEdit: (card: CardData) => void;
  onDuplicate: (card: CardData) => void;
  onArchive: (card: CardData) => void;
}

const getTypeIcon = (type: string) => {
  const iconClass = 'w-4 h-4';
  
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

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'text-story': 'Text Story',
    'ar-story': 'AR Story',
    'schedule': 'Schedule',
    'map': 'Map',
    'venue': 'Venue Info',
    'live-ar': 'Live AR',
    'qr-scan': 'QR Scan',
    'user-media': 'User Media',
    'merch': 'Merchandise',
    'food-beverage': 'Food & Beverage',
    'text': 'Text',
    'video': 'Video'
  };
  return labels[type] || type;
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
      return '—';
  }
};

export const CardTable: React.FC<CardTableProps> = ({ cards, onEdit, onDuplicate, onArchive }) => {
  return (
    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full" role="table" aria-label="Cards table">
          {/* Sticky Header */}
          <thead className={`${surfaces.darkGlass} sticky top-0 z-10 ${borders.glassBorder} border-b`}>
            <tr>
              <th 
                scope="col" 
                className={`${typography.labelMuted} px-4 py-3 text-left`}
              >
                Title
              </th>
              <th 
                scope="col" 
                className={`${typography.labelMuted} px-4 py-3 text-left`}
              >
                Type
              </th>
              <th 
                scope="col" 
                className={`${typography.labelMuted} px-4 py-3 text-left`}
              >
                Scope
              </th>
              <th 
                scope="col" 
                className={`${typography.labelMuted} px-4 py-3 text-left`}
              >
                Lane
              </th>
              <th 
                scope="col" 
                className={`${typography.labelMuted} px-4 py-3 text-left`}
              >
                Status
              </th>
              <th 
                scope="col" 
                className={`${typography.labelMuted} px-4 py-3 text-left`}
              >
                Visibility
              </th>
              <th 
                scope="col" 
                className={`${typography.labelMuted} px-4 py-3 text-left`}
              >
                Updated
              </th>
              <th 
                scope="col" 
                className={`${typography.labelMuted} px-4 py-3 text-right`}
              >
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {cards.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <p className={typography.bodyMuted}>No cards found</p>
                </td>
              </tr>
            ) : (
              cards.map((card, index) => (
                <tr
                  key={card.id}
                  className={`
                    ${index % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'}
                    hover:bg-slate-700/30
                    ${interactive.hoverSubtle}
                    ${borders.glassBorder}
                    border-b border-white/5
                    last:border-b-0
                  `}
                  role="row"
                  aria-label={`Card row: ${card.title}`}
                >
                  {/* Title */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {card.imageMedia?.publicUrl && (
                        <img
                          src={card.imageMedia.publicUrl}
                          alt=""
                          className={`w-10 h-10 ${borders.radius.md} object-cover`}
                        />
                      )}
                      <div className="min-w-0">
                        <p className={`${typography.body} text-sm font-medium truncate`}>
                          {card.title}
                        </p>
                        {card.subtitle && (
                          <p className={`${typography.bodyMuted} text-xs truncate`}>
                            {card.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={colors.accent.primary}>
                        {getTypeIcon(card.type)}
                      </span>
                      <span className={`${typography.body} text-sm`}>
                        {getTypeLabel(card.type)}
                      </span>
                    </div>
                  </td>

                  {/* Scope */}
                  <td className="px-4 py-3">
                    <span className={`${pills.base} ${pills.padding.sm} ${getScopeBadgeClass(card.scope)} text-xs font-medium`}>
                      {card.scope === 'story' ? 'Story' : 'Event'}
                    </span>
                  </td>

                  {/* Lane */}
                  <td className="px-4 py-3">
                    {card.scope === 'event' && card.eventLane ? (
                      <span className={`${pills.base} ${pills.padding.sm} bg-fuchsia-600/90 text-white text-xs font-medium`}>
                        {getLaneLabel(card.eventLane)}
                      </span>
                    ) : (
                      <span className={typography.bodyMuted}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`${pills.base} ${pills.padding.sm} ${getStatusBadgeClass(card.publishStatus)} text-xs font-medium`}>
                      {card.publishStatus.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Visibility (minTier) */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {card.minTier ? (
                        <>
                          <Eye className={`w-4 h-4 ${colors.slate.textMuted}`} />
                          <span className={`${typography.body} text-sm`}>
                            Tier {card.minTier}+
                          </span>
                        </>
                      ) : (
                        <>
                          <EyeOff className={`w-4 h-4 ${colors.slate.textMuted}`} />
                          <span className={`${typography.bodyMuted} text-sm`}>
                            All
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-3">
                    <span className={`${typography.bodyMuted} text-sm`}>
                      {format(new Date(card.updatedAt), 'MMM d, yyyy')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(card)}
                        className={`
                          p-2
                          ${pills.base}
                          ${interactive.hoverSubtle}
                          ${interactive.active}
                          ${focus.ring}
                          ${colors.slate.text}
                          hover:bg-slate-700/50
                        `}
                        aria-label={`Edit ${card.title}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => onDuplicate(card)}
                        className={`
                          p-2
                          ${pills.base}
                          ${interactive.hoverSubtle}
                          ${interactive.active}
                          ${focus.ring}
                          ${colors.slate.text}
                          hover:bg-slate-700/50
                        `}
                        aria-label={`Duplicate ${card.title}`}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => onArchive(card)}
                        className={`
                          p-2
                          ${pills.base}
                          ${interactive.hoverSubtle}
                          ${interactive.active}
                          ${focus.ring}
                          ${colors.slate.text}
                          hover:bg-slate-700/50
                        `}
                        aria-label={`Archive ${card.title}`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
