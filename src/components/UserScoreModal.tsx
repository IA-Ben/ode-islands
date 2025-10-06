"use client";

import { useState, useEffect } from 'react';
import { X, TrendingUp, Target, Trophy, ChevronRight, ChevronDown, ChevronUp, Share2, Crown, Zap, Sparkles, Star } from 'lucide-react';
import { useFanScore } from '@/hooks/useFanScore';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface UserScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: 'tier_pill' | 'rewards' | 'wallet' | 'discounts';
}

interface ScoreData {
  userScore: number;
  momentum: {
    last7Days: number;
    percentChange: number;
  };
  diversity: {
    uniqueTypes: number;
    totalTypes: number;
  };
  highlights: string[];
  recommendations: Array<{
    id: string;
    title: string;
    points: number;
    hint: string;
    deepLink: string;
    category: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    points: number;
    timestamp: Date;
    description: string;
  }>;
}

export default function UserScoreModal({ isOpen, onClose, source = 'tier_pill' }: UserScoreModalProps) {
  const { scoreData } = useFanScore();
  const [scoreDetails, setScoreDetails] = useState<ScoreData | null>(null);
  const [perksExpanded, setPerksExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const points = scoreData?.currentScore?.totalScore || 0;
  const level = scoreData?.currentScore?.level || 1;
  const pointsToNextLevel = scoreData?.currentScore?.pointsToNextLevel || 0;

  const getTierName = (lvl: number): "Bronze" | "Silver" | "Gold" => {
    if (lvl >= 8) return "Gold";
    if (lvl >= 4) return "Silver";
    return "Bronze";
  };

  const getNextTierName = (lvl: number): "Silver" | "Gold" | "Legend" => {
    if (lvl >= 8) return "Legend";
    if (lvl >= 4) return "Gold";
    return "Silver";
  };

  const tier = getTierName(level);
  const nextTier = getNextTierName(level);

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return "Elite";
    if (score >= 70) return "Great";
    if (score >= 40) return "Good";
    return "Getting started";
  };

  const getTierIcon = (tierName: string) => {
    switch (tierName) {
      case 'Gold': return <Crown className="w-5 h-5" />;
      case 'Silver': return <Star className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getTierColor = (tierName: string) => {
    switch (tierName) {
      case 'Gold': return 'bg-yellow-500';
      case 'Silver': return 'bg-slate-400';
      default: return 'bg-orange-600';
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScoreDetails();
      trackOpen();
    }
  }, [isOpen]);

  const fetchScoreDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user-score');
      if (response.ok) {
        const data = await response.json();
        setScoreDetails(data);
      }
    } catch (error) {
      console.error('Failed to load score details:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackOpen = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'user_score_open', {
        source: source
      });
    }
  };

  const trackRecommendationClick = (actionId: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'user_score_reco_click', {
        actionId: actionId
      });
    }
  };

  const trackSectionView = (section: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'user_score_view_section', {
        section: section
      });
    }
  };

  const handleDeepLink = (link: string, actionId: string) => {
    trackRecommendationClick(actionId);
    window.location.href = link;
  };

  const currentScore = scoreDetails?.userScore || 0;
  const scoreLabel = getScoreLabel(currentScore);

  const getTierThresholds = (lvl: number) => {
    if (lvl >= 8) return { current: 8000, next: 32000 };
    if (lvl >= 4) return { current: 500, next: 8000 };
    return { current: 0, next: 500 };
  };

  const thresholds = getTierThresholds(level);
  const progressPercentage = ((points - thresholds.current) / (thresholds.next - thresholds.current)) * 100;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`${surfaces.cardGlass} rounded-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Header (Sticky) */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`${getTierColor(tier)} rounded-full p-2 text-white`}>
                {getTierIcon(tier)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{tier}</h2>
                <p className="text-sm text-white/70">{points} pts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* User Score Dial */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-3xl font-bold text-white">{currentScore}</div>
                <div className="text-sm text-white/60">/ 100</div>
              </div>
              <div className="text-sm text-fuchsia-400 font-medium">{scoreLabel}</div>
            </div>
            <button
              onClick={() => {
                const element = document.getElementById('recommendations');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`${components.buttonPrimary} text-sm`}
            >
              How to level up
            </button>
          </div>

          <p className="text-xs text-white/50 mt-2">Your engagement at a glance</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Progress to Next Tier */}
          <div className={`${surfaces.subtleGlass} rounded-xl border border-slate-700/50 p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Progress to {nextTier}</span>
              <span className="text-sm font-semibold text-fuchsia-400">{pointsToNextLevel} pts to go</span>
            </div>
            <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-white/50">
              <span>{tier}</span>
              <span>{nextTier}</span>
            </div>
          </div>

          {/* Score Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`${surfaces.cardGlass} rounded-xl border border-slate-700/50 p-4 cursor-pointer hover:border-fuchsia-500/50 transition`}
              onClick={() => trackSectionView('breakdown')}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-fuchsia-400" />
                <h3 className="font-semibold text-white">Momentum</h3>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {loading ? '...' : `+${scoreDetails?.momentum.last7Days || 0}`}
              </p>
              <p className="text-xs text-white/60 mb-3">Last 7 days</p>
              <button className="text-xs text-fuchsia-400 hover:underline">
                Keep it up →
              </button>
            </div>

            <div
              className={`${surfaces.cardGlass} rounded-xl border border-slate-700/50 p-4 cursor-pointer hover:border-fuchsia-500/50 transition`}
              onClick={() => trackSectionView('breakdown')}
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Diversity</h3>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {loading ? '...' : `${scoreDetails?.diversity.uniqueTypes || 0}/${scoreDetails?.diversity.totalTypes || 12}`}
              </p>
              <p className="text-xs text-white/60 mb-3">Action types tried</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeepLink('/event', 'try_more_actions');
                }}
                className="text-xs text-emerald-400 hover:underline"
              >
                Try something new →
              </button>
            </div>

            <div
              className={`${surfaces.cardGlass} rounded-xl border border-slate-700/50 p-4 cursor-pointer hover:border-fuchsia-500/50 transition`}
              onClick={() => trackSectionView('breakdown')}
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Highlights</h3>
              </div>
              <p className="text-sm text-white/80 mb-3">
                {loading ? '...' : scoreDetails?.highlights[0] || 'Keep collecting!'}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeepLink('/memory-wallet', 'view_wallet');
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                View wallet →
              </button>
            </div>
          </div>

          {/* Recommendations */}
          <div id="recommendations" className={`${surfaces.subtleGlass} rounded-xl border border-slate-700/50 p-4`}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-fuchsia-400" />
              How to level up
            </h3>
            <div className="space-y-3">
              {loading ? (
                <div className="text-white/60 text-sm">Loading recommendations...</div>
              ) : (scoreDetails?.recommendations && scoreDetails.recommendations.length > 0) ? (
                scoreDetails.recommendations.slice(0, 5).map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer"
                    onClick={() => handleDeepLink(rec.deepLink, rec.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                        <span className="text-xs text-fuchsia-400 font-semibold">+{rec.points} pts</span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">{rec.hint}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-white/60 text-sm mb-2">Great start!</p>
                  <p className="text-xs text-white/50">Complete activities to unlock recommendations</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity History */}
          <div className={`${surfaces.subtleGlass} rounded-xl border border-slate-700/50 p-4`}>
            <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {loading ? (
                <div className="text-white/60 text-sm">Loading activity...</div>
              ) : (scoreDetails?.recentActivity && scoreDetails.recentActivity.length > 0) ? (
                scoreDetails.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-white">{activity.description}</p>
                      <p className="text-xs text-white/50">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-fuchsia-400">+{activity.points}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-white/60 text-sm mb-4">No recent activity</p>
                  <p className="text-xs text-white/50">Start exploring to earn points!</p>
                </div>
              )}
            </div>
          </div>

          {/* Perks Accordion */}
          <div className={`${surfaces.subtleGlass} rounded-xl border border-slate-700/50 overflow-hidden`}>
            <button
              onClick={() => setPerksExpanded(!perksExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition"
            >
              <h3 className="text-lg font-bold text-white">Tier Perks</h3>
              {perksExpanded ? (
                <ChevronUp className="w-5 h-5 text-white/60" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/60" />
              )}
            </button>
            {perksExpanded && (
              <div className="px-4 pb-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-fuchsia-400 mb-2">Current: {tier}</h4>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Collect memories and start earning</li>
                    {tier !== 'Bronze' && <li>• 10% off F&B purchases</li>}
                    {tier === 'Gold' && <li>• Priority merch access</li>}
                    {tier === 'Gold' && <li>• Exclusive character unlock</li>}
                  </ul>
                </div>
                {tier !== 'Gold' && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/60 mb-2">Next: {nextTier}</h4>
                    <ul className="text-sm text-white/50 space-y-1">
                      {tier === 'Bronze' && <li>• Unlock 10% F&B discount</li>}
                      {tier === 'Bronze' && <li>• Bonus AR scene access</li>}
                      {tier === 'Silver' && <li>• Priority merchandise</li>}
                      {tier === 'Silver' && <li>• Exclusive character</li>}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-white/40 pt-2 border-t border-slate-700/30">
                  Perks apply automatically at checkout
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-700/30">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'user_score_share');
                  }
                  alert('Share functionality coming soon!');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition"
              >
                <Share2 className="w-4 h-4" />
                Share score
              </button>
            </div>
            <p className="text-xs text-white/40 text-center">
              Only you can see your detailed score. <a href="/privacy" className="underline hover:text-white/60">Learn more</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
