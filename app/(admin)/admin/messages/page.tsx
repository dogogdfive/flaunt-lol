// app/(admin)/admin/messages/page.tsx
// Admin messaging with merchants

'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  MessageSquare,
  Send,
  Loader2,
  Store,
  ChevronLeft,
  Search,
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  subject?: string;
  createdAt: string;
  readAt?: string;
  sender: {
    id: string;
    walletAddress?: string;
    name?: string;
    username?: string;
    avatarUrl?: string | null;
    role: string;
  };
  receiver: {
    id: string;
    walletAddress?: string;
    name?: string;
    username?: string;
    avatarUrl?: string | null;
    role: string;
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
  lastMessageAt?: string;
  stores?: { id: string; name: string; slug: string }[];
}

interface Merchant {
  id: string;
  walletAddress?: string;
  name?: string;
  username?: string;
  avatarUrl?: string | null;
  stores: { id: string; name: string; slug: string }[];
}

export default function AdminMessagesPage() {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    fetchMerchants();
  }, [publicKey]);

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

  const fetchMerchants = async () => {
    if (!publicKey) return;

    try {
      // Fetch ALL stores by paginating through all pages
      const allStores: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch(`/api/admin/stores?limit=100&page=${page}`, {
          headers: {
            'x-wallet-address': publicKey.toBase58(),
          },
        });
        const data = await res.json();

        if (data.success && data.stores) {
          allStores.push(...data.stores);
          // Check if there are more pages
          hasMore = data.pagination && page < data.pagination.pages;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Group stores by owner
      const merchantMap = new Map<string, Merchant>();
      for (const store of allStores) {
        if (store.owner) {
          const existing = merchantMap.get(store.owner.id);
          if (existing) {
            existing.stores.push({ id: store.id, name: store.name, slug: store.slug });
          } else {
            merchantMap.set(store.owner.id, {
              id: store.owner.id,
              walletAddress: store.owner.walletAddress,
              name: store.owner.name,
              username: store.owner.username,
              avatarUrl: store.owner.avatarUrl,
              stores: [{ id: store.id, name: store.name, slug: store.slug }],
            });
          }
        }
      }
      setMerchants(Array.from(merchantMap.values()));
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
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
        // Add to conversations if not already there
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

  const startNewConversation = (merchant: Merchant) => {
    const conv: Conversation = {
      id: merchant.id,
      walletAddress: merchant.walletAddress,
      name: merchant.name,
      username: merchant.username,
      avatarUrl: merchant.avatarUrl,
      role: 'MERCHANT',
      unreadCount: 0,
      stores: merchant.stores,
    };
    setSelectedConversation(conv);
    setShowNewChat(false);
    setSearchQuery('');
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

  const filteredMerchants = merchants.filter(m => {
    const query = searchQuery.toLowerCase();
    return (
      m.walletAddress?.toLowerCase().includes(query) ||
      m.name?.toLowerCase().includes(query) ||
      m.stores?.some(s => s.name.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <p className="text-gray-400">Chat with merchants</p>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl h-[calc(100%-5rem)] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-gray-400">Chat with merchants</p>
        </div>
        <button
          onClick={() => setShowNewChat(!showNewChat)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Message
        </button>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden h-[calc(100%-5rem)] flex">
        {/* Conversations List */}
        <div className={`w-full md:w-80 border-r border-gray-800 ${selectedConversation ? 'hidden md:block' : ''}`}>
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Conversations</h2>
          </div>

          {showNewChat ? (
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search merchants..."
                  className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredMerchants.map((merchant) => (
                  <button
                    key={merchant.id}
                    onClick={() => startNewConversation(merchant)}
                    className="w-full p-3 text-left hover:bg-[#1f2937] rounded-lg transition-colors flex items-start gap-3"
                  >
                    {merchant.avatarUrl ? (
                      <img
                        src={merchant.avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                        {merchant.username?.charAt(0)?.toUpperCase() || merchant.name?.charAt(0)?.toUpperCase() || <Store className="w-5 h-5 text-white" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {merchant.stores && merchant.stores.length > 1 ? (
                        <>
                          <span className="text-white font-medium block">
                            {merchant.stores.length} Stores
                          </span>
                          <div className="text-gray-400 text-xs mt-1 space-y-0.5">
                            {merchant.stores.map((store, idx) => (
                              <p key={store.id} className="truncate">
                                {store.name}
                              </p>
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className="text-white font-medium truncate block">
                          {merchant.stores?.[0]?.name || 'Merchant'}
                        </span>
                      )}
                      <p className="text-gray-500 text-xs truncate mt-1">
                        {merchant.walletAddress?.slice(0, 8)}...
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : !conversationsLoaded ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No messages yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Click "New Message" to start chatting
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
                  {conv.avatarUrl ? (
                    <img
                      src={conv.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      {conv.username?.charAt(0)?.toUpperCase() || conv.name?.charAt(0)?.toUpperCase() || <Store className="w-5 h-5 text-white" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium truncate">
                        {conv.stores?.[0]?.name || (conv.username ? `@${conv.username}` : conv.name) || 'Merchant'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm truncate">
                      {conv.walletAddress?.slice(0, 8)}...{conv.walletAddress?.slice(-4)}
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
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                    {selectedConversation.username?.charAt(0)?.toUpperCase() || selectedConversation.name?.charAt(0)?.toUpperCase() || <Store className="w-5 h-5 text-white" />}
                  </div>
                )}
                <div>
                  <h3 className="text-white font-medium">
                    {selectedConversation.stores?.[0]?.name || (selectedConversation.username ? `@${selectedConversation.username}` : selectedConversation.name) || 'Merchant'}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {selectedConversation.username ? `@${selectedConversation.username}` : `${selectedConversation.walletAddress?.slice(0, 8)}...${selectedConversation.walletAddress?.slice(-4)}`}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.sender.id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar for merchant (other person) */}
                      {!isMe && (
                        msg.sender.avatarUrl ? (
                          <img
                            src={msg.sender.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {msg.sender.username?.charAt(0)?.toUpperCase() || msg.sender.name?.charAt(0)?.toUpperCase() || 'M'}
                            </span>
                          </div>
                        )
                      )}
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
                      {/* Avatar for admin (me) */}
                      {isMe && (
                        msg.sender.avatarUrl ? (
                          <img
                            src={msg.sender.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {msg.sender.username?.charAt(0)?.toUpperCase() || 'A'}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
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
    </div>
  );
}
