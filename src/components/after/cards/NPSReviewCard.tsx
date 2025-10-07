"use client";

import { useState } from "react";
import { ArrowRight, Star, MessageSquare, ThumbsUp } from "lucide-react";

export interface NPSReviewCardData {
  id: string;
  title: string;
  description: string;
  surveyCompleted?: boolean;
  incentive?: string;
  pointsReward?: number;
}

interface NPSReviewCardProps {
  data: NPSReviewCardData;
  onSubmitReview?: (rating: number, feedback: string) => void;
}

export function NPSReviewCard({ data, onSubmitReview }: NPSReviewCardProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(data.surveyCompleted || false);

  const handleSubmit = () => {
    if (rating !== null && onSubmitReview) {
      onSubmitReview(rating, feedback);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-green-500/30 p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <ThumbsUp className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">Thank You!</h3>
          <p className="text-slate-300">
            Your feedback helps us create better experiences
          </p>
          {data.pointsReward && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-sm font-semibold border border-fuchsia-500/30">
              +{data.pointsReward} points earned
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
      <div className="relative p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-green-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white leading-tight">
            {data.title}
          </h3>
          
          <p className="text-slate-300 leading-relaxed">
            {data.description}
          </p>
          
          {data.incentive && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-xs font-medium border border-fuchsia-500/20">
              {data.incentive}
            </div>
          )}
        </div>
        
        {/* Star Rating */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-white">
            How would you rate your experience?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="transition-all duration-200 hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    (hoverRating !== null ? star <= hoverRating : star <= (rating || 0))
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-600"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        
        {/* Feedback Textarea */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            Tell us more (optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
          />
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={rating === null}
          className={`w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
            rating === null
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700 hover:scale-105 shadow-green-500/25"
          }`}
        >
          Submit Review
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
