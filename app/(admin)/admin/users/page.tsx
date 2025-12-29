// app/(admin)/admin/users/page.tsx
// Admin users management page

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Search,
  Users,
  Shield,
  Store,
  Ban,
  MoreVertical,
  ChevronDown,
  UserCheck,
  UserX,
} from 'lucide-react';

interface User {
  id: string;
  email: string | null;
  walletAddress: string | null;
  name: string | null;
  username: string | null;
  role: string;
  isVerified: boolean;
  isBanned: boolean;
  bannedReason: string | null;
  createdAt: string;
  _count: {
    stores: number;
    orders: number;
  };
}

const roleColors: Record<string, string> = {
  CUSTOMER: 'bg-gray-500/10 text-gray-400',
  MERCHANT: 'bg-blue-500/10 text-blue-400',
  ADMIN: 'bg-purple-500/10 text-purple-400',
  SUPER_ADMIN: 'bg-yellow-500/10 text-yellow-400',
};

export default function AdminUsersPage() {
  const { publicKey } = useWallet();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, byRole: {} as Record<string, number> });

  useEffect(() => {
    if (publicKey) {
      fetchUsers();
    }
  }, [roleFilter, searchQuery, publicKey]);

  const fetchUsers = async () => {
    if (!publicKey) return;

    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success) {
        setUsers(data.users);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    if (!publicKey) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchUsers();
        setShowRoleModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const truncateWallet = (address: string | null) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-gray-400 mt-1">Manage platform users and roles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Users</div>
            </div>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-2xl font-bold text-white">{stats.byRole?.CUSTOMER || 0}</div>
              <div className="text-sm text-gray-400">Customers</div>
            </div>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-white">{stats.byRole?.MERCHANT || 0}</div>
              <div className="text-sm text-gray-400">Merchants</div>
            </div>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-2xl font-bold text-white">{stats.byRole?.ADMIN || 0}</div>
              <div className="text-sm text-gray-400">Admins</div>
            </div>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-2xl font-bold text-white">{stats.byRole?.SUPER_ADMIN || 0}</div>
              <div className="text-sm text-gray-400">Super Admins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email, wallet, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="MERCHANT">Merchants</option>
            <option value="ADMIN">Admins</option>
            <option value="SUPER_ADMIN">Super Admins</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wallet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stores</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#1f2937]/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {user.name?.[0] || user.username?.[0] || user.email?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {user.name || user.username || 'Anonymous'}
                            {user.isBanned && (
                              <span className="ml-2 text-xs text-red-400">(Banned)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.username ? `@${user.username}` : user.email || 'No username or email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-gray-400 bg-[#1f2937] px-2 py-1 rounded">
                        {truncateWallet(user.walletAddress)}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{user._count.stores}</td>
                    <td className="px-6 py-4 text-gray-400">{user._count.orders}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          Change Role
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Change User Role</h2>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-400 text-sm">
                  Change role for <span className="text-white font-medium">{selectedUser.name || selectedUser.email || truncateWallet(selectedUser.walletAddress)}</span>
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Current role: <span className={`${roleColors[selectedUser.role]} px-2 py-0.5 rounded`}>{selectedUser.role}</span>
                </p>
              </div>
              <div className="space-y-2">
                {['CUSTOMER', 'MERCHANT', 'ADMIN', 'SUPER_ADMIN'].map((role) => (
                  <button
                    key={role}
                    onClick={() => changeUserRole(selectedUser.id, role)}
                    disabled={selectedUser.role === role}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedUser.role === role
                        ? 'bg-blue-600 text-white cursor-default'
                        : 'bg-[#1f2937] text-gray-300 hover:bg-[#374151]'
                    }`}
                  >
                    <div className="font-medium">{role}</div>
                    <div className="text-xs opacity-70">
                      {role === 'CUSTOMER' && 'Can browse and purchase'}
                      {role === 'MERCHANT' && 'Can manage stores and products'}
                      {role === 'ADMIN' && 'Can approve stores and products'}
                      {role === 'SUPER_ADMIN' && 'Full platform access'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
