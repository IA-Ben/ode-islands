'use client';

import { useState, useEffect } from 'react';
import { Search, X, Image as ImageIcon } from 'lucide-react';
import { surfaces, borders, components } from '@/lib/admin/designTokens';

interface Card {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  scope: string;
  imageUrl?: string;
}

interface CardPickerProps {
  onSelect: (card: Card) => void;
  onClose: () => void;
  scope?: string;
  excludeIds?: string[];
}

export function CardPicker({ onSelect, onClose, scope, excludeIds = [] }: CardPickerProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchCards();
  }, [scope]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (scope) params.append('scope', scope);
      
      const response = await fetch(`/api/admin/cards?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(card => {
    if (excludeIds.includes(card.id)) return false;
    if (search && !card.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && card.type !== typeFilter) return false;
    return true;
  });

  const cardTypes = [...new Set(cards.map(c => c.type))];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} max-w-4xl w-full max-h-[80vh] flex flex-col`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">Select Card</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-700/50 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
          >
            <option value="">All Types</option>
            {cardTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Card List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading cards...</div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No cards found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => onSelect(card)}
                  className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-4 text-left hover:bg-white/10 transition-all flex items-start gap-4`}
                >
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white mb-1">{card.title}</h4>
                    {card.subtitle && (
                      <p className="text-sm text-slate-400 mb-2">{card.subtitle}</p>
                    )}
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-fuchsia-500/20 text-fuchsia-400 rounded">
                        {card.type}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                        {card.scope}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
