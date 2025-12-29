// app/(store)/account/messages/page.tsx
// Buyer messaging page - contact merchants about orders

'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  Loader2,
  Store,
  ChevronLeft,
  ArrowLeft,
  Package,
  HelpCircle,
  Shield,
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  readAt?: string;
  sender: {
    id: string;
    walletAddress?: string;
    role: string;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
  receiver: {
    id: string;
    walletAddress?: string;
    role: string;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
  store?: {
    id: string;
    name: string;
  };
}

interface Conversation {
  id: string;
  walletAddress?: string;
  name?: string;
  username?: string;
  avatarUrl?: string | null;
  role: string;
  unreadCount: number;
  stores?: { id: string; name: string; slug: string }[];
}

interface Order {
  id: string;
  orderNumber: string;
  store: {
    id: string;
    name: string;
    owner?: {
      id: string;
      walletAddress: string;
    };
  };
}

interface Admin {
  id: string;
  walletAddress: string;
  name: string | null;
  username: string | null;
}

export default function BuyerMessagesPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const { publicKey } = wallet;
  const connected = mounted ? wallet.connected : false;
  const searchParams = useSearchParams();
  const storeIdParam = searchParams.get('storeId');

  const [loading, setLoading] = useState(true);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [autoSelectHandled, setAutoSelectHandled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      fetchMessages();
      fetchOrders();
      fetchAdmins();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  // Auto-select conversation based on storeId query param
  useEffect(() => {
    if (storeIdParam && orders.length > 0 && !autoSelectHandled && !loading) {
      const matchingOrder = orders.find(o => o.store.id === storeIdParam);
      if (matchingOrder && matchingOrder.store.owner) {
        startMerchantChat(matchingOrder);
        setAutoSelectHandled(true);
      }
    }
  }, [storeIdParam, orders, autoSelectHandled, loading]);

  useEffect(() => {
    if (selectedConversation) {
      fetchConversationMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!publicKey) return;

    try {
      const res = await fetch('/api/messages', {
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success) {
        setConversations(data.conversations);
        if (data.messages.length > 0) {
          const firstMsg = data.messages[0];
          const userId = firstMsg.sender.walletAddress === publicKey.toBase58()
            ? firstMsg.sender.id
            : firstMsg.receiver.id;
          setCurrentUserId(userId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
      setConversationsLoaded(true);
    }
  };

  const fetchOrders = async () => {
    if (!publicKey) return;

    try {
      const res = await fetch('/api/account/orders', {
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const fetchAdmins = async () => {
    if (!publicKey) return;

    try {
      const res = await fetch('/api/admins', {
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success) {
        setAdmins(data.admins);
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  };

  const fetchConversationMessages = async (userId: string) => {
    if (!publicKey) return;

    try {
      const res = await fetch(`/api/messages?with=${userId}`, {
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success) {
        setMessages(data.messages.reverse());
      }
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    }
  };

  const markAsRead = async (userId: string) => {
    if (!publicKey) return;

    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ conversationWith: userId }),
      });

      setConversations(prev =>
        prev.map(c => c.id === userId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const sendMessage = async () => {
    if (!publicKey || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          receiverId: selectedConversation.id,
          content: newMessage.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        if (!conversations.find(c => c.id === selectedConversation.id)) {
          setConversations(prev => [selectedConversation, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const startMerchantChat = (order: Order) => {
    if (!order.store.owner) return;

    const conv: Conversation = {
      id: order.store.owner.id,
      walletAddress: order.store.owner.walletAddress,
      name: order.store.name,
      role: 'MERCHANT',
      unreadCount: 0,
      stores: [{ id: order.store.id, name: order.store.name, slug: '' }],
    };
    setSelectedConversation(conv);
    setShowNewChat(false);
  };

  const startAdminChat = (admin: Admin) => {
    const conv: Conversation = {
      id: admin.id,
      walletAddress: admin.walletAddress,
      name: admin.name || admin.username || 'Admin',
      role: 'ADMIN',
      unreadCount: 0,
    };
    setSelectedConversation(conv);
    setShowNewChat(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Messages</h1>
          <p className="text-gray-400 mb-8">
            Connect your wallet to view your messages.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Connect Wallet
          </button>
          <Link href="/" className="block mt-4 text-gray-500 hover:text-gray-300">
            ← Back to store
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a]">
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Store</span>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-white">Messages</h1>
            </div>
          </div>
        </header>
        <main className="pt-16 max-w-7xl mx-auto px-4 py-6">
          <div className="bg-[#111827] border border-gray-800 rounded-xl h-[calc(100vh-8rem)] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Loading messages...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Store</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">Messages</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 max-w-7xl mx-auto px-4 py-6">
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden h-[calc(100vh-8rem)] flex">
          {/* Conversations List */}
          <div className={`w-full md:w-80 border-r border-gray-800 ${selectedConversation ? 'hidden md:block' : ''}`}>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-white">Conversations</h2>
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {showNewChat ? 'Cancel' : 'New Chat'}
              </button>
            </div>

            {showNewChat ? (
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Message a Merchant</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Select an order to message the merchant about it.
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No orders yet. Make a purchase to message merchants.
                    </p>
                  ) : (
                    orders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => startMerchantChat(order)}
                        disabled={!order.store.owner}
                        className="w-full p-3 text-left hover:bg-[#1f2937] rounded-lg transition-colors flex items-center gap-3 disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                          <Store className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium truncate block">
                            {order.store.name}
                          </span>
                          <p className="text-gray-500 text-xs">
                            Order #{order.orderNumber}
                          </p>
                        </div>
                        <Package className="w-4 h-4 text-gray-500" />
                      </button>
                    ))
                  )}
                </div>

                {/* Contact Admin */}
                {admins.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Contact Admin</h3>
                    <div className="space-y-2">
                      {admins.map((admin) => (
                        <button
                          key={admin.id}
                          onClick={() => startAdminChat(admin)}
                          className="w-full p-3 text-left hover:bg-[#1f2937] rounded-lg transition-colors flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-white font-medium truncate block">
                              {admin.name || admin.username || 'Admin'}
                            </span>
                            <p className="text-gray-500 text-xs">
                              {admin.username ? `@${admin.username}` : 'Platform Admin'}
                            </p>
                          </div>
                          <Shield className="w-4 h-4 text-pink-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <Link
                    href="/support"
                    className="flex items-center gap-3 p-3 text-blue-400 hover:bg-[#1f2937] rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-medium">Contact Support</span>
                      <p className="text-xs text-gray-500">Get help from flaunt.lol team</p>
                    </div>
                  </Link>
                </div>
              </div>
            ) : !conversationsLoaded ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No messages yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Click "New Chat" to message a merchant
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-[#1f2937] transition-colors flex items-center gap-3 ${
                      selectedConversation?.id === conv.id ? 'bg-[#1f2937]' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      conv.role === 'ADMIN'
                        ? 'bg-gradient-to-br from-pink-500 to-purple-600'
                        : 'bg-green-600'
                    }`}>
                      {conv.role === 'ADMIN' ? (
                        <Shield className="w-5 h-5 text-white" />
                      ) : (
                        <Store className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium truncate">
                          {conv.stores?.[0]?.name || conv.name || (conv.role === 'ADMIN' ? 'Admin' : 'Merchant')}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm truncate">
                        {conv.role === 'ADMIN' ? 'Platform Admin' : conv.role === 'MERCHANT' ? 'Merchant' : 'Support'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : ''}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-800 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {selectedConversation.avatarUrl ? (
                    <img
                      src={selectedConversation.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedConversation.role === 'ADMIN'
                        ? 'bg-gradient-to-br from-pink-500 to-purple-600'
                        : 'bg-green-600'
                    }`}>
                      {selectedConversation.role === 'ADMIN' ? (
                        <Shield className="w-5 h-5 text-white" />
                      ) : (
                        <Store className="w-5 h-5 text-white" />
                      )}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-medium">
                      {selectedConversation.name || selectedConversation.username || selectedConversation.stores?.[0]?.name || (selectedConversation.role === 'ADMIN' ? 'Admin' : 'Merchant')}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {selectedConversation.username ? `@${selectedConversation.username}` : (selectedConversation.role === 'ADMIN' ? 'Platform Admin' : selectedConversation.role === 'MERCHANT' ? 'Merchant' : 'Support')}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No messages yet</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Send a message to start the conversation
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender.id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isMe
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1f2937] text-white'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                              {formatDate(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Select a conversation or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
