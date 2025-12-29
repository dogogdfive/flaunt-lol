// app/(merchant)/merchant/notifications/page.tsx
// Merchant notifications page

'use client';

import { useState, useEffect } from 'react';
import { Bell, Package, Truck, DollarSign, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: any;
  readAt: string | null;
  createdAt: string;
}

const notificationIcons: Record<string, any> = {
  ORDER_PLACED: { icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ORDER_PAID: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
  ORDER_SHIPPED: { icon: Truck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  TRACKING_ADDED: { icon: Truck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  PRODUCT_APPROVED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  PRODUCT_REJECTED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  PRODUCT_UPDATED: { icon: Package, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  STORE_APPROVED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  STORE_REJECTED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  PAYOUT_COMPLETED: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
  LOW_STOCK: { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  SYSTEM: { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === 'unread') params.set('unread', 'true');
      
      const res = await fetch(`/api/merchant/notifications?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/merchant/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications read:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/merchant/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">All caught up!</p>
        </div>
        <button
          onClick={fetchNotifications}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-[#1f2937] rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No notifications yet</p>
            <p className="text-sm text-gray-500 mt-1">
              You'll be notified when orders come in, tracking is updated, and more
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {notifications.map((notification) => {
              const iconConfig = notificationIcons[notification.type] || notificationIcons.SYSTEM;
              const IconComponent = iconConfig.icon;
              const isUnread = !notification.readAt;

              return (
                <div
                  key={notification.id}
                  onClick={() => isUnread && markAsRead(notification.id)}
                  className={`p-4 hover:bg-[#1f2937]/50 transition-colors cursor-pointer ${
                    isUnread ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`p-2.5 rounded-lg ${iconConfig.bg} flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${iconConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-medium ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                          {notification.title}
                        </h3>
                        {isUnread && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>📅 {new Date(notification.createdAt).toLocaleDateString()}</span>
                        <span>{timeAgo(notification.createdAt)}</span>
                      </div>
                      
                      {/* Show tracking details if available */}
                      {notification.metadata?.trackingNumber && (
                        <div className="mt-2 p-2 bg-[#1f2937] rounded text-sm">
                          <span className="text-gray-400">Tracking: </span>
                          <span className="text-white font-mono">
                            {notification.metadata.trackingNumber}
                          </span>
                          {notification.metadata.carrier && (
                            <span className="text-gray-500 ml-2">
                              via {notification.metadata.carrier}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
