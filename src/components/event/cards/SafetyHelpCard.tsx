"use client";

import { Shield, Phone, AlertTriangle, MapPin } from "lucide-react";
import { EventCard } from "./EventCard";

export interface EmergencyContact {
  id: string;
  label: string;
  number: string;
  type: "emergency" | "security" | "medical" | "support";
}

export interface SafetyHelpCardProps {
  contacts: EmergencyContact[];
  locationHint?: string;
  reportForm?: {
    available: boolean;
    types: string[];
  };
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onContactClick?: (contact: EmergencyContact) => void;
  onReportClick?: () => void;
  analyticsTag?: string;
}

export function SafetyHelpCard({
  contacts,
  locationHint,
  reportForm,
  title = "Safety & Help",
  subtitle = "We're here for you",
  image,
  size = "M",
  onContactClick,
  onReportClick,
  analyticsTag,
}: SafetyHelpCardProps) {
  const contactTypeConfig = {
    emergency: {
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/20",
      border: "border-red-500/30",
    },
    security: {
      icon: Shield,
      color: "text-amber-400",
      bg: "bg-amber-500/20",
      border: "border-amber-500/30",
    },
    medical: {
      icon: Phone,
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      border: "border-blue-500/30",
    },
    support: {
      icon: Phone,
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
    },
  };

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Shield className="w-6 h-6" />}
      analyticsTag={analyticsTag || "safety-help-card"}
      theme="red"
      badge={{ type: "CUSTOM", label: "EMERGENCY", color: "bg-red-500" }}
    >
      {locationHint && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-300">{locationHint}</p>
        </div>
      )}

      <div className="space-y-2">
        {contacts.map((contact) => {
          const config = contactTypeConfig[contact.type];
          const ContactIcon = config.icon;

          return (
            <button
              key={contact.id}
              onClick={() => onContactClick?.(contact)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border ${config.border} hover:bg-white/5 transition-all duration-200 text-left group`}
            >
              <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <ContactIcon className={`w-5 h-5 ${config.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">
                  {contact.label}
                </div>
                <div className={`text-xs ${config.color} font-medium`}>
                  {contact.number}
                </div>
              </div>

              <Phone className={`w-5 h-5 ${config.color} group-hover:scale-110 transition-transform`} />
            </button>
          );
        })}
      </div>

      {reportForm && reportForm.available && (
        <button
          onClick={onReportClick}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 hover:border-white/30 transition-all duration-200"
        >
          Report an Incident
        </button>
      )}

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
        <p className="text-xs text-slate-400 text-center">
          For immediate emergencies, always call local emergency services
        </p>
      </div>
    </EventCard>
  );
}
