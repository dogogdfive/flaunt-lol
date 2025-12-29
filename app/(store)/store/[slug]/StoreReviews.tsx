// app/(store)/store/[slug]/StoreReviews.tsx
// Client component for store reviews

'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Star, CheckCircle, ChevronDown, Pencil, Trash2, X, Camera, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  images: string[];
  isVerified: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    walletAddress: string | null;
  };
}

interface StoreReviewsProps {
  storeSlug: string;
  initialAvgRating: number | null;
  initialReviewCount: number;
}

export default function StoreReviews({ storeSlug, initialAvgRating, initialReviewCount }: StoreReviewsProps) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(initialAvgRating);
  const [reviewCount, setReviewCount] = useState(initialReviewCount);
  const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [starFilter, setStarFilter] = useState<number | null>(null);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userReview, setUserReview] = useState<Review | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editHoverRating, setEditHoverRating] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchReviews();
    if (publicKey) {
      fetchUserRole();
    }
  }, [storeSlug, sort, publicKey]);

  const handleImageUpload = async (file: File) => {
    if (!publicKey) return;
    if (images.length >= 4) {
      setError('Maximum 4 images allowed');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'reviewImage');
      formData.append('walletAddress', publicKey.toBase58());

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setImages((prev) => [...prev, data.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchUserRole = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/account/profile', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success) {
        setUserRole(data.user.role);
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err);
    }
  };

  const fetchReviews = async (loadMore = false) => {
    try {
      const pageToFetch = loadMore ? page + 1 : 1;
      const res = await fetch(`/api/stores/${storeSlug}/reviews?page=${pageToFetch}&sort=${sort}`);
      const data = await res.json();

      if (data.success) {
        if (loadMore) {
          setReviews((prev) => [...prev, ...data.reviews]);
          setPage(pageToFetch);
        } else {
          setReviews(data.reviews);
          setPage(1);
        }
        setAvgRating(data.avgRating);
        setReviewCount(data.reviewCount);
        setDistribution(data.distribution);
        setHasMore(data.pagination.page < data.pagination.totalPages);

        // Check if current user has reviewed
        if (publicKey) {
          const foundReview = data.reviews.find(
            (r: Review) => r.user.walletAddress === publicKey.toBase58()
          );
          setUserReview(foundReview || null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      setVisible(true);
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/stores/${storeSlug}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ rating, title, content, images }),
      });

      const data = await res.json();

      if (data.success) {
        setShowForm(false);
        setRating(0);
        setTitle('');
        setContent('');
        setImages([]);
        fetchReviews();
      } else {
        setError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditTitle(review.title || '');
    setEditContent(review.content || '');
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !editingReview) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/stores/${storeSlug}/reviews`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          reviewId: editingReview.id,
          rating: editRating,
          title: editTitle,
          content: editContent,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setEditingReview(null);
        fetchReviews();
      } else {
        setError(data.error || 'Failed to update review');
      }
    } catch (err) {
      setError('Failed to update review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!publicKey) return;
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const res = await fetch(`/api/stores/${storeSlug}/reviews?reviewId=${reviewId}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });

      const data = await res.json();

      if (data.success) {
        fetchReviews();
      } else {
        alert(data.error || 'Failed to delete review');
      }
    } catch (err) {
      alert('Failed to delete review');
    }
  };

  const getDisplayName = (user: Review['user']) => {
    if (user.name) return user.name;
    if (user.username) return `@${user.username}`;
    if (user.walletAddress) return `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}`;
    return 'Anonymous';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRatingPercentage = (stars: number) => {
    if (reviewCount === 0) return 0;
    return Math.round((distribution[stars as keyof typeof distribution] / reviewCount) * 100);
  };

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const canReview = !userReview;

  // Filter reviews by star rating
  const filteredReviews = starFilter
    ? reviews.filter((r) => r.rating === starFilter)
    : reviews;

  return (
    <div className="border-t border-gray-800 pt-12">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-[#111827] rounded-xl p-4 flex items-center justify-between hover:bg-[#1a1f2e] transition-colors"
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Customer Reviews</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(avgRating || 0)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-white font-medium">{avgRating?.toFixed(1) || '0.0'}</span>
            <span className="text-gray-400">({reviewCount} reviews)</span>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Actions Row */}
          <div className="flex items-center justify-between">
            {/* Star Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Filter:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setStarFilter(null)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    starFilter === null ? 'bg-blue-600 text-white' : 'bg-[#1f2937] text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                {[5, 4, 3, 2, 1].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => setStarFilter(stars)}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                      starFilter === stars ? 'bg-blue-600 text-white' : 'bg-[#1f2937] text-gray-400 hover:text-white'
                    }`}
                  >
                    {stars} <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs">({distribution[stars as keyof typeof distribution]})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Write Review Button */}
            {canReview && (
              <button
                onClick={() => {
                  if (!publicKey) {
                    setVisible(true);
                  } else {
                    setShowForm(!showForm);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Write a Review
              </button>
            )}
          </div>

          {/* Review Form */}
          {showForm && (
            <div className="bg-[#111827] rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Write Your Review</h3>
          <form onSubmit={handleSubmit}>
            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Your Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1"
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
                className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Content */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Review (optional)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your experience with this store..."
                rows={4}
                className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Photos (optional, max 4)</label>
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                    <img src={img} alt={`Review ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 4 && (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-20 h-20 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 hover:border-gray-500 hover:text-gray-400 transition-colors disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </button>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-1">Images are automatically compressed</p>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Edit Your Review</h3>
              <button onClick={() => setEditingReview(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateReview}>
              {/* Star Rating */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Your Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      onMouseEnter={() => setEditHoverRating(star)}
                      onMouseLeave={() => setEditHoverRating(0)}
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (editHoverRating || editRating)
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
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Content */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Review (optional)</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Share your experience with this store..."
                  rows={4}
                  className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          {/* Reviews List */}
          {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#111827] rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-32 mb-3" />
              <div className="h-3 bg-gray-700 rounded w-full mb-2" />
              <div className="h-3 bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-12 bg-[#111827] rounded-xl">
          <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const isOwnReview = publicKey && review.user.walletAddress === publicKey.toBase58();
            const canDelete = isOwnReview || isAdmin;
            const canEdit = isOwnReview;

            return (
              <div key={review.id} className="bg-[#111827] rounded-xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{getDisplayName(review.user)}</span>
                      {review.isVerified && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-gray-500 text-sm">{formatDate(review.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <div className="flex gap-2">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(review)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit review"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {review.title && (
                  <h4 className="font-medium text-white mb-2">{review.title}</h4>
                )}
                {review.content && (
                  <p className="text-gray-300">{review.content}</p>
                )}
                {review.images && review.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {review.images.map((img, i) => (
                      <a
                        key={i}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-20 h-20 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <img src={img} alt={`Review image ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <button
              onClick={() => fetchReviews(true)}
              className="w-full py-3 bg-[#1a1f2e] hover:bg-[#252a3a] text-gray-400 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Load More Reviews
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
