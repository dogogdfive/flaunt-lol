// components/ProductReviews.tsx
// Product reviews display and submission component

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Star, ThumbsUp, User, CheckCircle, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  images: string[];
  isVerified: boolean;
  createdAt: string;
  user: {
    name: string;
    avatar: string | null;
  };
}

interface ReviewsData {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  distribution: Record<number, number>;
}

interface Props {
  productId: string;
  orderId?: string; // If provided, show review form
}

export default function ProductReviews({ productId, orderId }: Props) {
  const { publicKey } = useWallet();
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Review form state
  const [showForm, setShowForm] = useState(!!orderId);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId, page]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}&page=${page}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !orderId || rating === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          productId,
          orderId,
          rating,
          title: title || null,
          content: content || null,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        fetchReviews();
      }
    } catch (error) {
      console.error('Submit review error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = data?.reviews.length
    ? data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length
    : 0;

  const totalReviews = data?.pagination.total || 0;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold text-white mb-6">Customer Reviews</h2>

      {/* Rating Summary */}
      {data && totalReviews > 0 && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Average Rating */}
            <div className="text-center md:text-left">
              <div className="text-4xl font-bold text-white mb-2">{avgRating.toFixed(1)}</div>
              <div className="flex justify-center md:justify-start gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= avgRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                  />
                ))}
              </div>
              <div className="text-gray-400 text-sm">{totalReviews} reviews</div>
            </div>

            {/* Distribution */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = data.distribution[stars] || 0;
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-8">{stars} star</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-gray-500 text-sm w-10">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Review Form */}
      {showForm && !submitted && publicKey && orderId && (
        <form onSubmit={handleSubmit} className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Write a Review</h3>

          {/* Star Rating */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="w-full px-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Review (optional)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts about this product..."
              rows={4}
              className="w-full px-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={rating === 0 || submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Review
          </button>
        </form>
      )}

      {submitted && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">Thank you for your review!</h3>
          <p className="text-gray-400">Your feedback helps other shoppers make informed decisions.</p>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : data?.reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Star className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p>No reviews yet</p>
          <p className="text-sm mt-2">Be the first to review this product!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.reviews.map((review) => (
            <div key={review.id} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#1f2937] flex items-center justify-center flex-shrink-0">
                  {review.user.avatar ? (
                    <img src={review.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium">{review.user.name}</span>
                    {review.isVerified && (
                      <span className="flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                      />
                    ))}
                    <span className="text-gray-500 text-sm ml-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Title & Content */}
                  {review.title && <h4 className="text-white font-medium mb-2">{review.title}</h4>}
                  {review.content && <p className="text-gray-400">{review.content}</p>}

                  {/* Images */}
                  {review.images.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {review.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {data && data.pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: data.pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    page === p
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
