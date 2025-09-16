'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  profileImageUrl?: string;
}

export default function AdminUsersPage() {
  const { user: currentUser, isLoading: authLoading, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/';
    }
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      // Fetch CSRF token on page load
      fetch('/api/csrf-token', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.csrfToken) {
            setCsrfToken(data.csrfToken);
          } else {
            console.error('Invalid CSRF token response:', data);
          }
        })
        .catch(console.error);
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, makeAdmin: boolean) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ isAdmin: makeAdmin }),
      });

      if (response.ok) {
        await loadUsers(); // Reload users to get updated data
      } else if (response.status === 403) {
        console.error('CSRF token validation failed. Please refresh the page.');
        alert('Session expired. Please refresh the page and try again.');
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'same-origin',
      });

      if (response.ok) {
        await loadUsers(); // Reload users to get updated data
        setSelectedUser(null);
      } else if (response.status === 403) {
        console.error('CSRF token validation failed. Please refresh the page.');
        alert('Session expired. Please refresh the page and try again.');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading User Management...</h2>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">Admin privileges required to access user management.</p>
          <Button onClick={() => window.location.href = '/'}>Return to Homepage</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-gray-400 mt-1">Manage users and their roles for The Ode Islands</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {currentUser?.firstName} {currentUser?.lastName}
                </p>
                <p className="text-xs text-gray-400">{currentUser?.email}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
              >
                ← Back to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white w-96"
              />
              <span className="text-sm text-gray-400">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>
            <Button onClick={loadUsers} className="bg-blue-600 hover:bg-blue-700">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {user.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.isAdmin && (
                            <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                              Admin
                            </span>
                          )}
                          {!user.emailVerified && (
                            <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                              Unverified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No users found matching your search.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Details */}
          <div>
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">User Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedUser ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      {selectedUser.profileImageUrl ? (
                        <img
                          src={selectedUser.profileImageUrl}
                          alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                          className="w-16 h-16 rounded-full mx-auto mb-4"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-4">
                          <span className="text-white text-xl font-medium">
                            {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                          </span>
                        </div>
                      )}
                      <h3 className="text-lg font-semibold text-white">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h3>
                      <p className="text-gray-400">{selectedUser.email}</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-400">Role</label>
                        <p className="text-white">
                          {selectedUser.isAdmin ? 'Administrator' : 'User'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400">Email Status</label>
                        <p className="text-white">
                          {selectedUser.emailVerified ? 'Verified' : 'Unverified'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400">Last Login</label>
                        <p className="text-white">
                          {selectedUser.lastLoginAt 
                            ? new Date(selectedUser.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400">Member Since</label>
                        <p className="text-white">
                          {new Date(selectedUser.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      {selectedUser.id !== currentUser?.id && (
                        <>
                          <Button
                            onClick={() => toggleAdminRole(selectedUser.id, !selectedUser.isAdmin)}
                            disabled={actionLoading === selectedUser.id}
                            className={`w-full ${
                              selectedUser.isAdmin 
                                ? 'bg-orange-600 hover:bg-orange-700' 
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            {actionLoading === selectedUser.id 
                              ? 'Updating...' 
                              : selectedUser.isAdmin 
                                ? 'Remove Admin' 
                                : 'Make Admin'
                            }
                          </Button>
                          
                          <Button
                            onClick={() => deleteUser(selectedUser.id)}
                            disabled={actionLoading === selectedUser.id}
                            variant="outline"
                            className="w-full text-red-400 border-red-600 hover:bg-red-600 hover:text-white"
                          >
                            {actionLoading === selectedUser.id ? 'Deleting...' : 'Delete User'}
                          </Button>
                        </>
                      )}
                      
                      {selectedUser.id === currentUser?.id && (
                        <p className="text-center text-gray-400 text-sm">
                          You cannot modify your own account
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Select a user to view details and actions.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}