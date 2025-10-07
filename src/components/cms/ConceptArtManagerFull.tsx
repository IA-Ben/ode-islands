'use client';

import { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, X, GripVertical } from 'lucide-react';
import { surfaces, components, borders } from '@/lib/admin/designTokens';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ConceptArtCollection {
  id: string;
  title: string;
  description: string | null;
  coverLayout: string;
}

interface ConceptArtImage {
  id: string;
  mediaId: string;
  title: string | null;
  description: string | null;
  order: number;
  imageUrl?: string;
}

function SortableImage({ image, onRemove }: { image: ConceptArtImage; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden group relative`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>
      
      {image.imageUrl ? (
        <img
          src={image.imageUrl}
          alt={image.title || 'Concept art'}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-slate-800 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-slate-600" />
        </div>
      )}
      
      <div className="p-3">
        <h5 className="font-medium text-white text-sm truncate">{image.title || 'Untitled'}</h5>
        {image.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mt-1">{image.description}</p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-2 bg-slate-900/80 backdrop-blur-sm rounded-lg hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
      </button>
    </div>
  );
}

interface ConceptArtManagerFullProps {
  csrfToken: string;
}

export function ConceptArtManagerFull({ csrfToken }: ConceptArtManagerFullProps) {
  const [collections, setCollections] = useState<ConceptArtCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<ConceptArtCollection | null>(null);
  const [images, setImages] = useState<ConceptArtImage[]>([]);
  const [showImageForm, setShowImageForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageFormData, setImageFormData] = useState({
    mediaId: '',
    title: '',
    description: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionImages(selectedCollection.id);
    }
  }, [selectedCollection]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/concept-art');
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
        if (!selectedCollection && data.collections?.length > 0) {
          setSelectedCollection(data.collections[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionImages = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/admin/concept-art/${collectionId}/images`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollection) return;

    try {
      const response = await fetch(`/api/admin/concept-art/${selectedCollection.id}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          ...imageFormData,
          order: images.length,
        }),
      });

      if (response.ok) {
        fetchCollectionImages(selectedCollection.id);
        setShowImageForm(false);
        setImageFormData({ mediaId: '', title: '', description: '' });
      }
    } catch (error) {
      console.error('Error adding image:', error);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!selectedCollection) return;

    try {
      const response = await fetch(
        `/api/admin/concept-art/${selectedCollection.id}/images?imageId=${imageId}`,
        {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      if (response.ok) {
        fetchCollectionImages(selectedCollection.id);
      }
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) {
    return <div className="text-white">Loading collections...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Concept Art Gallery Management</h3>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-2">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Collections</h4>
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => setSelectedCollection(collection)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                selectedCollection?.id === collection.id
                  ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="font-medium">{collection.title}</div>
              <div className="text-xs opacity-75">{collection.coverLayout}</div>
            </button>
          ))}
        </div>

        <div className="col-span-9 space-y-4">
          {selectedCollection ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white">{selectedCollection.title}</h4>
                  <p className="text-sm text-slate-400">{selectedCollection.description}</p>
                </div>
                <button
                  onClick={() => setShowImageForm(true)}
                  className={`${components.buttonPrimary} flex items-center gap-2`}
                >
                  <Plus className="w-4 h-4" />
                  Add Image
                </button>
              </div>

              {images.length === 0 ? (
                <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-12 text-center`}>
                  <p className="text-slate-400 mb-4">No images in this collection</p>
                  <button
                    onClick={() => setShowImageForm(true)}
                    className={components.buttonPrimary}
                  >
                    Add First Image
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={images.map(img => img.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {images.map((image) => (
                        <SortableImage
                          key={image.id}
                          image={image}
                          onRemove={() => handleRemoveImage(image.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </>
          ) : (
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-12 text-center`}>
              <p className="text-slate-400">Select a collection to manage its images</p>
            </div>
          )}
        </div>
      </div>

      {showImageForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 max-w-md w-full`}>
            <h4 className="text-xl font-bold text-white mb-4">Add Image</h4>
            <form onSubmit={handleAddImage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Media ID</label>
                <input
                  type="text"
                  value={imageFormData.mediaId}
                  onChange={(e) => setImageFormData({ ...imageFormData, mediaId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={imageFormData.title}
                  onChange={(e) => setImageFormData({ ...imageFormData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={imageFormData.description}
                  onChange={(e) => setImageFormData({ ...imageFormData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className={`flex-1 ${components.buttonPrimary}`}>
                  Add Image
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageForm(false)}
                  className={`flex-1 ${components.buttonSecondary}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
