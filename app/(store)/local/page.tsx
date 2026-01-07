// app/(store)/local/page.tsx
// Local products browse page - filter by location and find pickup items

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  MapPin,
  Search,
  Filter,
  Package,
  Store,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceSol: number;
  priceUsdc: number | null;
  images: string[];
  allowsShipping: boolean;
  allowsLocalPickup: boolean;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    city?: string;
    state?: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

// US States for filtering
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export default function LocalBrowsePage() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedState, setSelectedState] = useState(searchParams.get('state') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [pickupOnly, setPickupOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }
    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (pickupOnly) params.set('pickupOnly', 'true');
        if (selectedState) params.set('state', selectedState);
        if (selectedCity) params.set('city', selectedCity);
        if (selectedCategory) params.set('categorySlug', selectedCategory);
        if (searchQuery) params.set('search', searchQuery);
        params.set('limit', '50');

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [pickupOnly, selectedState, selectedCity, selectedCategory, searchQuery]);

  const clearFilters = () => {
    setSelectedState('');
    setSelectedCity('');
    setSelectedCategory('');
    setSearchQuery('');
    setPickupOnly(true);
  };

  const hasActiveFilters = selectedState || selectedCity || selectedCategory || searchQuery;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Local Marketplace</h1>
          </div>
          <p className="text-gray-400 mt-2">
            Find products available for local pickup near you
          </p>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>

            {/* State Select */}
            <div className="relative">
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity(''); // Clear city when state changes
                }}
                className="appearance-none pl-4 pr-10 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 min-w-[160px]"
              >
                <option value="">All States</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* City Input */}
            <div className="relative">
              <input
                type="text"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                placeholder="City (optional)"
                className="w-full md:w-40 px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Category Select */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 min-w-[140px]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Pickup Toggle */}
            <label className="flex items-center gap-2 px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600">
              <input
                type="checkbox"
                checked={pickupOnly}
                onChange={(e) => setPickupOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-white whitespace-nowrap">Pickup Only</span>
            </label>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-sm text-gray-500">Active filters:</span>
              {selectedState && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-sm rounded">
                  {US_STATES.find(s => s.code === selectedState)?.name || selectedState}
                  <button onClick={() => setSelectedState('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCity && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-sm rounded">
                  {selectedCity}
                  <button onClick={() => setSelectedCity('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-sm rounded">
                  {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
                  <button onClick={() => setSelectedCategory('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-white underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No products found</h3>
            <p className="text-gray-400 mb-4">
              Try adjusting your filters or search in a different area
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400">
                {products.length} product{products.length !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/store/${product.store.slug}/${product.slug}`}
                  className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all group"
                >
                  <div className="aspect-square relative bg-[#1f2937]">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    {/* Pickup badge */}
                    {product.allowsLocalPickup && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/90 text-white text-xs font-medium rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Pickup
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-white text-sm truncate group-hover:text-green-400 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      {product.store.logoUrl ? (
                        <img
                          src={product.store.logoUrl}
                          alt={product.store.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <Store className="w-3 h-3" />
                      )}
                      <span className="truncate">{product.store.name}</span>
                    </div>
                    {(product.store.city || product.store.state) && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
                        <MapPin className="w-3 h-3" />
                        {[product.store.city, product.store.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                    <div className="mt-2">
                      <span className="text-green-400 font-semibold">
                        ${product.priceUsdc?.toFixed(2) || (product.priceSol * 200).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
