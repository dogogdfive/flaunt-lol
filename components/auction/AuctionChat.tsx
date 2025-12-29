'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Lock } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    walletAddress: string | null;
    isVerified: boolean;
  };
}

interface AuctionChatProps {
  auctionId: string;
  auctionStatus: string;
  isLoggedIn: boolean;
  walletAddress?: string | null;
  onSendMessage?: (content: string) => Promise<void>;
}

export default function AuctionChat({
  auctionId,
  auctionStatus,
  isLoggedIn,
  walletAddress,
  onSendMessage,
}: AuctionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/auctions/${auctionId}/messages`);
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [auctionId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (auctionStatus !== 'LIVE') return;

    const eventSource = new EventSource(`/api/auctions/${auctionId}/messages/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        } else if (data.type === 'auction_ended') {
          eventSource.close();
        }
      } catch (err) {
        // Ignore parse errors (heartbeats)
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [auctionId, auctionStatus]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !isLoggedIn) return;

    setError('');
    setSending(true);

    try {
      if (onSendMessage) {
        await onSendMessage(newMessage.trim());
      } else {
        const res = await fetch(`/api/auctions/${auctionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': walletAddress || '',
          },
          body: JSON.stringify({ content: newMessage.trim() }),
        });

        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Failed to send message');
          return;
        }

        // Add message optimistically (will be deduplicated by SSE)
        setMessages((prev) => [...prev, data.message]);
      }

      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatWalletAddress = (address: string | null) => {
    if (!address) return 'Anonymous';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isChatDisabled = auctionStatus !== 'LIVE';

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          <span className="font-medium text-white">Live Chat</span>
        </div>
        <span className="text-xs text-gray-500">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Be the first to chat!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="group">
              <div className="flex items-start gap-2">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden">
                  {msg.user.avatarUrl ? (
                    <img
                      src={msg.user.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                      {(msg.user.name || msg.user.walletAddress || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-300">
                      {msg.user.name || msg.user.username || formatWalletAddress(msg.user.walletAddress)}
                    </span>
                    {msg.user.isVerified && (
                      <svg className="w-3.5 h-3.5 text-pink-500" viewBox="0 0 22 22" fill="currentColor">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                      </svg>
                    )}
                    <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 break-words">{msg.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-3">
        {error && (
          <div className="mb-2 text-xs text-red-400">{error}</div>
        )}

        {isChatDisabled ? (
          <div className="flex items-center justify-center gap-2 py-2 text-gray-500 text-sm">
            <Lock className="w-4 h-4" />
            Chat is {auctionStatus === 'SCHEDULED' ? 'available when auction starts' : 'closed'}
          </div>
        ) : !isLoggedIn ? (
          <div className="flex items-center justify-center gap-2 py-2 text-gray-500 text-sm">
            <Lock className="w-4 h-4" />
            Connect wallet to chat
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              disabled={sending}
              className="flex-1 px-3 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
