"use client";

import { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";

export type CardSize = "S" | "M" | "L";

export type CardBadge = {
  type: "NEW" | "LIVE" | "ENDING_SOON" | "CUSTOM";
  label?: string;
  color?: string;
};

export interface EventCardProps {
  title: string;
  subtitle?: string;
  image?: string;
  size?: CardSize;
  badge?: CardBadge;
  icon?: ReactNode;
  onClick?: () => void;
  isLocked?: boolean;
  isLoading?: boolean;
  hasMemoryAward?: boolean;
  analyticsTag?: string;
  children?: ReactNode;
  theme?: "blue" | "fuchsia" | "amber" | "emerald" | "red";
  className?: string;
}

export function EventCard({
  title,
  subtitle,
  image,
  size = "M",
  badge,
  icon,
  onClick,
  isLocked = false,
  isLoading = false,
  hasMemoryAward = false,
  analyticsTag,
  children,
  theme = "fuchsia",
  className = "",
}: EventCardProps) {
  const sizeClasses = {
    S: "min-h-[180px]",
    M: "min-h-[240px]",
    L: "min-h-[320px]",
  };

  const themeConfig = {
    blue: {
      gradient: "from-blue-600/20 to-blue-700/10",
      border: "border-blue-500/20",
      hoverBorder: "hover:border-blue-500/40",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
      textColor: "text-blue-400",
      shadow: "hover:shadow-blue-500/20",
      overlay: "from-blue-500/0 to-blue-500/10",
    },
    fuchsia: {
      gradient: "from-fuchsia-600/20 to-fuchsia-700/10",
      border: "border-fuchsia-500/20",
      hoverBorder: "hover:border-fuchsia-500/40",
      iconBg: "bg-fuchsia-500/20",
      iconColor: "text-fuchsia-400",
      textColor: "text-fuchsia-400",
      shadow: "hover:shadow-fuchsia-500/20",
      overlay: "from-fuchsia-500/0 to-fuchsia-500/10",
    },
    amber: {
      gradient: "from-amber-600/20 to-amber-700/10",
      border: "border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
      textColor: "text-amber-400",
      shadow: "hover:shadow-amber-500/20",
      overlay: "from-amber-500/0 to-amber-500/10",
    },
    emerald: {
      gradient: "from-emerald-600/20 to-emerald-700/10",
      border: "border-emerald-500/20",
      hoverBorder: "hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
      textColor: "text-emerald-400",
      shadow: "hover:shadow-emerald-500/20",
      overlay: "from-emerald-500/0 to-emerald-500/10",
    },
    red: {
      gradient: "from-red-600/20 to-red-700/10",
      border: "border-red-500/20",
      hoverBorder: "hover:border-red-500/40",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      textColor: "text-red-400",
      shadow: "hover:shadow-red-500/20",
      overlay: "from-red-500/0 to-red-500/10",
    },
  };

  const config = themeConfig[theme];

  const getBadgeStyles = (badgeType: CardBadge["type"]) => {
    switch (badgeType) {
      case "LIVE":
        return "bg-red-500 text-white";
      case "NEW":
        return "bg-emerald-500 text-white";
      case "ENDING_SOON":
        return "bg-amber-500 text-white";
      case "CUSTOM":
        return badge?.color || "bg-slate-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const cardContent = (
    <>
      {hasMemoryAward && (
        <div className="absolute -top-1 -right-1 z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/50 rounded-full blur-lg animate-pulse" />
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      )}

      {badge && (
        <div className="absolute top-3 left-3 z-10">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getBadgeStyles(badge.type)}`}>
            {badge.type === "LIVE" && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
            {badge.label || badge.type}
          </span>
        </div>
      )}

      {isLocked && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center mx-auto`}>
              <Lock className={`w-8 h-8 ${config.iconColor}`} />
            </div>
            <p className="text-sm text-white font-medium">Locked</p>
          </div>
        </div>
      )}

      <div className={`absolute inset-0 bg-gradient-to-br ${config.overlay} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      {image && (
        <div className="relative w-full h-40 overflow-hidden rounded-t-2xl">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        </div>
      )}

      <div className={`relative p-6 space-y-4 ${image ? "" : "pt-6"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {subtitle && (
              <div className={`text-xs font-medium ${config.textColor} uppercase tracking-wide`}>
                {subtitle}
              </div>
            )}

            <h3 className="text-xl font-bold text-white leading-tight group-hover:text-fuchsia-300 transition-colors">
              {title}
            </h3>
          </div>

          {icon && (
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center group-hover:scale-110 transition-all duration-300`}>
              <div className={config.iconColor}>
                {icon}
              </div>
            </div>
          )}
        </div>

        {children && (
          <div className="space-y-3">
            {children}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </>
  );

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      data-analytics={analyticsTag}
      className={`
        w-full group relative overflow-hidden rounded-2xl 
        bg-gradient-to-br ${config.gradient} 
        border ${config.border} ${onClick ? config.hoverBorder : ""} 
        transition-all duration-300 
        ${onClick ? `hover:shadow-xl ${config.shadow} cursor-pointer` : ""}
        ${sizeClasses[size]}
        ${onClick ? "text-left" : ""}
        ${className}
      `}
    >
      {cardContent}
    </Component>
  );
}
