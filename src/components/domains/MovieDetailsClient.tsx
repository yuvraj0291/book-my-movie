"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Heart, Play, X, Trash2, MessageSquare } from "lucide-react";
import { toggleFavoriteAction, addMovieReviewAction, deleteMovieReviewAction } from "@/app/actions/movieActions";
import { IMovieDetails } from "@/types";


interface MovieDetailsClientProps {
  movie: IMovieDetails;
  isFavoriteInitial: boolean;
  userId: string | null;
}

export function MovieDetailsClient({ movie, isFavoriteInitial, userId }: MovieDetailsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);
  const [showTrailer, setShowTrailer] = useState(false);

  // Review form state
  const [rating, setRating] = useState(10);
  const [content, setContent] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFavoriteToggle = async () => {
    if (!userId) {
      router.push("/login");
      return;
    }

    // Optimistic UI
    setIsFavorite(!isFavorite);

    startTransition(async () => {
      const res = await toggleFavoriteAction(movie.id);
      if (res.error) {
        setIsFavorite(isFavorite); // Revert
      } else if (res.success) {
        setIsFavorite(res.isFavorite ?? false);
      }
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    setReviewError(null);

    const res = await addMovieReviewAction(movie.id, rating, content);
    setIsSubmitting(false);

    if (res.error) {
      setReviewError(res.error);
    } else if (res.success) {
      setContent("");
      setRating(10);
      router.refresh();
    }
  };

  const handleReviewDelete = async (reviewId: string) => {
    if (confirm("Are you sure you want to delete your review?")) {
      const res = await deleteMovieReviewAction(reviewId);
      if (res.error) {
        alert(res.error);
      } else if (res.success) {
        router.refresh();
      }
    }
  };

  // Calculate review metrics
  const totalReviews = movie.reviews.length;
  const ratingDistribution = Array(10).fill(0);
  movie.reviews.forEach((r) => {
    const idx = Math.min(9, Math.max(0, r.rating - 1));
    ratingDistribution[idx]++;
  });

  const ratingPercentages = ratingDistribution.map((count) =>
    totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
  );

  return (
    <div className="space-y-12">
      
      {/* Banner Action Row (Rendered via portal or directly in page layout) */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => setShowTrailer(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 text-zinc-900 dark:text-white font-bold text-sm border border-zinc-300 dark:border-white/10 backdrop-blur-md transition-all hover:scale-102 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current text-rose-600" />
          <span>Play Trailer</span>
        </button>

        <button
          onClick={handleFavoriteToggle}
          className={`p-3 rounded-full border transition-all hover:scale-105 cursor-pointer ${
            isFavorite
              ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/35 dark:border-rose-900/50"
              : "bg-white/5 border-zinc-300 dark:border-white/10 text-zinc-650 dark:text-zinc-400 hover:text-rose-650 dark:hover:text-rose-500"
          }`}
          aria-label="Add to favorites"
        >
          <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Reviews & Ratings Section */}
      <section className="space-y-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            User <span className="text-rose-600">Reviews</span>
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Hear what other moviegoers are saying about {movie.title}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Rating Distribution Metrics */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-zinc-900 dark:text-white">
                {movie.rating.toFixed(1)}
              </span>
              <span className="text-sm text-zinc-400 font-bold">/ 10</span>
            </div>
            <p className="text-xs font-bold text-zinc-450 uppercase tracking-wider">
              Based on {totalReviews} Ratings
            </p>

            <div className="space-y-2 pt-2">
              {ratingPercentages.slice().reverse().map((percentage, index) => {
                const starVal = 10 - index;
                return (
                  <div key={starVal} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-zinc-500 font-bold text-right">★ {starVal}</span>
                    <div className="flex-1 h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-zinc-450 font-semibold text-right">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List & Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Review Submission Form */}
            {userId ? (
              <form onSubmit={handleReviewSubmit} className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-4">
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-rose-600" />
                  Write a Review
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-450 block">Your Rating</label>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRating(val)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                          rating === val
                            ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20"
                            : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-450 block">Your Comments</label>
                  <textarea
                    placeholder="Tell us what you thought of the movie..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={3}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                </div>

                {reviewError && (
                  <p className="text-xs font-semibold text-red-500">{reviewError}</p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-250 dark:border-zinc-850 text-center space-y-3">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                  Want to share your thoughts on {movie.title}?
                </p>
                <Link
                  href="/login"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors inline-block"
                >
                  Log In to Write a Review
                </Link>
              </div>
            )}

            {/* List of Reviews */}
            <div className="space-y-4">
              {movie.reviews.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-450 text-sm italic py-4">
                  No reviews yet. Be the first to share your thoughts!
                </p>
              ) : (
                movie.reviews.map((review) => {
                  const initials = review.user.name ? review.user.name[0].toUpperCase() : "?";
                  const canDelete = userId === review.userId;
                  return (
                    <div
                      key={review.id}
                      className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs flex gap-4 items-start"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300">
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">
                              {review.user.name || "Anonymous User"}
                            </p>
                            <p className="text-[10px] text-zinc-450 font-medium">
                              {new Date(review.createdAt).toLocaleDateString(undefined, {
                                dateStyle: "medium",
                              })}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 font-extrabold text-xs border border-yellow-500/20">
                              ★ {review.rating}
                            </span>

                            {canDelete && (
                              <button
                                onClick={() => handleReviewDelete(review.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                aria-label="Delete review"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {review.content && (
                          <p className="text-sm text-zinc-650 dark:text-zinc-350 font-normal leading-relaxed break-words">
                            {review.content}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Trailer Widescreen Modal Overlay */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-video animate-in scale-in duration-250">
            
            {/* Close Button */}
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 z-55 p-2.5 bg-black/60 hover:bg-black/80 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10"
              aria-label="Close trailer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Embedded Iframe Player (Dune 2 Trailer) */}
            <iframe
              src="https://www.youtube.com/embed/Go8nDbRyDxU?autoplay=1"
              title={`${movie.title} Trailer`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}
      
    </div>
  );
}
