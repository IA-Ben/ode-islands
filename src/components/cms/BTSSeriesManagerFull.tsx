'use client';

import { useState, useEffect } from 'react';
import { Plus, Video, X, GripVertical } from 'lucide-react';
import { surfaces, components, borders } from '@/lib/admin/designTokens';
import { CardPicker } from './CardPicker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BTSSeries {
  id: string;
  title: string;
  description: string | null;
  coverImageMediaId: string | null;
}

interface SeriesVideo {
  id: string;
  cardId: string;
  order: number;
  card?: {
    title: string;
    subtitle?: string;
  };
  videoUrl?: string;
}

function SortableVideo({ video, onRemove }: { video: SeriesVideo; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-4 flex items-center gap-4`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>
      
      <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
        <Video className="w-8 h-8 text-slate-600" />
      </div>
      
      <div className="flex-1">
        <h4 className="font-bold text-white">{video.card?.title || 'Unknown Video'}</h4>
        {video.card?.subtitle && (
          <p className="text-sm text-slate-400">{video.card.subtitle}</p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
      >
        <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
      </button>
    </div>
  );
}

interface BTSSeriesManagerFullProps {
  csrfToken: string;
}

export function BTSSeriesManagerFull({ csrfToken }: BTSSeriesManagerFullProps) {
  const [seriesList, setSeriesList] = useState<BTSSeries[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<BTSSeries | null>(null);
  const [videos, setVideos] = useState<SeriesVideo[]>([]);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSeries();
  }, []);

  useEffect(() => {
    if (selectedSeries) {
      fetchSeriesVideos(selectedSeries.id);
    }
  }, [selectedSeries]);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/bts-series');
      if (response.ok) {
        const data = await response.json();
        setSeriesList(data.series || []);
        if (!selectedSeries && data.series?.length > 0) {
          setSelectedSeries(data.series[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSeriesVideos = async (seriesId: string) => {
    try {
      const response = await fetch(`/api/admin/bts-series/${seriesId}/videos`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleAddVideo = async (card: any) => {
    if (!selectedSeries) return;

    try {
      const response = await fetch(`/api/admin/bts-series/${selectedSeries.id}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          cardId: card.id,
          order: videos.length,
        }),
      });

      if (response.ok) {
        fetchSeriesVideos(selectedSeries.id);
        setShowCardPicker(false);
      }
    } catch (error) {
      console.error('Error adding video:', error);
    }
  };

  const handleRemoveVideo = async (cardId: string) => {
    if (!selectedSeries) return;

    try {
      const response = await fetch(
        `/api/admin/bts-series/${selectedSeries.id}/videos?cardId=${cardId}`,
        {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      if (response.ok) {
        fetchSeriesVideos(selectedSeries.id);
      }
    } catch (error) {
      console.error('Error removing video:', error);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setVideos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) {
    return <div className="text-white">Loading series...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">BTS Video Series Management</h3>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-2">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Series</h4>
          {seriesList.map((series) => (
            <button
              key={series.id}
              onClick={() => setSelectedSeries(series)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                selectedSeries?.id === series.id
                  ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="font-medium">{series.title}</div>
            </button>
          ))}
        </div>

        <div className="col-span-9 space-y-4">
          {selectedSeries ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white">{selectedSeries.title}</h4>
                  <p className="text-sm text-slate-400">{selectedSeries.description}</p>
                </div>
                <button
                  onClick={() => setShowCardPicker(true)}
                  className={`${components.buttonPrimary} flex items-center gap-2`}
                >
                  <Plus className="w-4 h-4" />
                  Add Video
                </button>
              </div>

              {videos.length === 0 ? (
                <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-12 text-center`}>
                  <p className="text-slate-400 mb-4">No videos in this series</p>
                  <button
                    onClick={() => setShowCardPicker(true)}
                    className={components.buttonPrimary}
                  >
                    Add First Video
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={videos.map(v => v.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {videos.map((video) => (
                        <SortableVideo
                          key={video.id}
                          video={video}
                          onRemove={() => handleRemoveVideo(video.cardId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </>
          ) : (
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-12 text-center`}>
              <p className="text-slate-400">Select a series to manage its videos</p>
            </div>
          )}
        </div>
      </div>

      {showCardPicker && (
        <CardPicker
          onSelect={handleAddVideo}
          onClose={() => setShowCardPicker(false)}
          scope="before"
          excludeIds={videos.map(v => v.cardId)}
        />
      )}
    </div>
  );
}
