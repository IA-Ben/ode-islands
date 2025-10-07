"use client";

import { X, MapPin, Navigation, Car, Train, Bus, Bike, PersonStanding, Sparkles } from "lucide-react";
import { useState } from "react";

interface VenueMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TransportOption {
  id: string;
  type: 'car' | 'train' | 'bus' | 'bike' | 'walk';
  name: string;
  duration: string;
  cost: string;
  aiTip: string;
  icon: any;
}

export default function VenueMapModal({ isOpen, onClose }: VenueMapModalProps) {
  const [selectedTransport, setSelectedTransport] = useState<string | null>(null);

  if (!isOpen) return null;

  // Mock venue data
  const venue = {
    name: "Ode Islands Arena",
    address: "2500 Event Boulevard, SF",
    coordinates: "37.7749° N, 122.4194° W"
  };

  const transportOptions: TransportOption[] = [
    {
      id: 'car',
      type: 'car',
      name: 'Drive',
      duration: '25 min',
      cost: '$8 parking',
      aiTip: 'Leave by 6:30 PM to avoid traffic. Parking fills up fast - arrive early!',
      icon: Car
    },
    {
      id: 'train',
      type: 'train',
      name: 'BART',
      duration: '35 min',
      cost: '$4.50',
      aiTip: 'Take the Red Line to Arena Station. Last train back is at 12:15 AM.',
      icon: Train
    },
    {
      id: 'bus',
      type: 'bus',
      name: 'Bus',
      duration: '40 min',
      cost: '$2.50',
      aiTip: 'Route 88 stops right at the venue. Buses run every 15 minutes.',
      icon: Bus
    },
    {
      id: 'bike',
      type: 'bike',
      name: 'Bike Share',
      duration: '20 min',
      cost: '$5',
      aiTip: 'Bike lanes all the way! Secure bike parking available at the venue.',
      icon: Bike
    },
    {
      id: 'walk',
      type: 'walk',
      name: 'Walk',
      duration: '45 min',
      cost: 'Free',
      aiTip: 'Scenic route along the waterfront. Perfect for pre-event vibes!',
      icon: PersonStanding
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 backdrop-blur-sm"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 h-full max-h-[90vh]">
          {/* Map Section */}
          <div className="relative bg-slate-800 p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Venue Location</h2>
              <div className="flex items-start gap-2 text-slate-300">
                <MapPin className="w-5 h-5 mt-1 text-fuchsia-400" />
                <div>
                  <p className="font-semibold text-white">{venue.name}</p>
                  <p className="text-sm">{venue.address}</p>
                  <p className="text-xs text-slate-400 mt-1">{venue.coordinates}</p>
                </div>
              </div>
            </div>

            {/* Mock Map */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-700 border-2 border-slate-600">
              {/* Grid Background for Map Effect */}
              <div className="absolute inset-0 opacity-20">
                <div className="grid grid-cols-8 grid-rows-8 h-full">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} className="border border-slate-500" />
                  ))}
                </div>
              </div>
              
              {/* Mock Streets */}
              <div className="absolute inset-0">
                <div className="absolute top-1/4 left-0 right-0 h-1 bg-slate-500" />
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-500" />
                <div className="absolute top-3/4 left-0 right-0 h-1 bg-slate-500" />
                <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-slate-500" />
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-500" />
                <div className="absolute left-3/4 top-0 bottom-0 w-1 bg-slate-500" />
              </div>

              {/* Venue Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                <div className="relative">
                  <div className="absolute -inset-4 bg-fuchsia-500/30 rounded-full animate-ping" />
                  <div className="relative bg-fuchsia-500 rounded-full p-3 shadow-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Your Location */}
              <div className="absolute top-3/4 left-1/4 -translate-x-1/2 -translate-y-1/2">
                <div className="bg-blue-500 rounded-full p-2 shadow-lg border-2 border-white">
                  <Navigation className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs text-blue-400 font-semibold">You</span>
                </div>
              </div>

              {/* Route Line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                  d="M 25% 75%, Q 40% 60%, 50% 50%"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="8 4"
                  className="opacity-50"
                />
              </svg>
            </div>
          </div>

          {/* AI Transport Guide */}
          <div className="bg-slate-900 p-8 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">AI Travel Guide</h3>
                <p className="text-sm text-slate-400">Smart suggestions for your journey</p>
              </div>
            </div>

            {/* Transport Options */}
            <div className="space-y-3">
              {transportOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedTransport === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedTransport(isSelected ? null : option.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                      isSelected
                        ? 'border-fuchsia-500 bg-fuchsia-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        isSelected ? 'bg-fuchsia-500' : 'bg-slate-700'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-white">{option.name}</h4>
                          <div className="text-right">
                            <p className="text-sm font-bold text-fuchsia-400">{option.duration}</p>
                            <p className="text-xs text-slate-400">{option.cost}</p>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-fuchsia-500/30">
                            <p className="text-sm text-slate-300 flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-fuchsia-400 mt-0.5 flex-shrink-0" />
                              <span>{option.aiTip}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="mt-6 p-4 rounded-xl bg-slate-800 border border-slate-700">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-fuchsia-400">💡 Pro Tip:</span> Download offline maps before the event. 
                Cell service can be spotty near the venue!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
