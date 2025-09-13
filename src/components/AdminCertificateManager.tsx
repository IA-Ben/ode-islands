'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Certificate {
  id: string;
  userId: string;
  eventId?: string;
  chapterId?: string;
  certificateType: string;
  title: string;
  description?: string;
  certificateUrl?: string;
  issuedAt: string;
}

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
}

interface CertificateStats {
  total: number;
  byType: { [key: string]: number };
  recentlyIssued: number;
  topUsers: { userId: string; count: number; userName?: string }[];
}

interface AdminCertificateManagerProps {
  className?: string;
}

export default function AdminCertificateManager({ className = '' }: AdminCertificateManagerProps) {
  const { theme } = useTheme();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'certificates' | 'issue' | 'users'>('overview');
  
  // Issue certificate form state
  const [issueForm, setIssueForm] = useState({
    userId: '',
    certificateType: 'completion',
    title: '',
    description: '',
    chapterId: '',
    eventId: ''
  });
  const [isIssuing, setIsIssuing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load certificates, users, and stats in parallel
      const [certsResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/certificates'),
        fetch('/api/admin/users')
      ]);

      if (!certsResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const [certsData, usersData] = await Promise.all([
        certsResponse.json(),
        usersResponse.json()
      ]);

      if (certsData.success && usersData.success) {
        setCertificates(certsData.certificates || []);
        setUsers(usersData.users || []);
        calculateStats(certsData.certificates || [], usersData.users || []);
      } else {
        throw new Error('Failed to load admin data');
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (certs: Certificate[], userList: User[]) => {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const byType: { [key: string]: number } = {};
    const userCounts: { [key: string]: number } = {};
    
    let recentlyIssued = 0;
    
    certs.forEach(cert => {
      // Count by type
      byType[cert.certificateType] = (byType[cert.certificateType] || 0) + 1;
      
      // Count by user
      userCounts[cert.userId] = (userCounts[cert.userId] || 0) + 1;
      
      // Count recent
      if (new Date(cert.issuedAt) > lastWeek) {
        recentlyIssued++;
      }
    });

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => {
        const user = userList.find(u => u.id === userId);
        return {
          userId,
          count,
          userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown User'
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      total: certs.length,
      byType,
      recentlyIssued,
      topUsers
    });
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueForm.userId || !issueForm.title || !issueForm.certificateType) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsIssuing(true);
      setError(null);

      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueForm)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCertificates(prev => [...prev, result.certificate]);
          setIssueForm({
            userId: '',
            certificateType: 'completion',
            title: '',
            description: '',
            chapterId: '',
            eventId: ''
          });
          
          // Recalculate stats
          calculateStats([...certificates, result.certificate], users);
          
          setActiveTab('certificates');
        }
      } else {
        throw new Error('Failed to issue certificate');
      }
    } catch (err) {
      console.error('Error issuing certificate:', err);
      setError(err instanceof Error ? err.message : 'Failed to issue certificate');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleDeleteCertificate = async (certificateId: string) => {
    if (!confirm('Are you sure you want to delete this certificate?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/certificates/${certificateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCertificates(prev => prev.filter(c => c.id !== certificateId));
        if (stats) {
          calculateStats(certificates.filter(c => c.id !== certificateId), users);
        }
      } else {
        throw new Error('Failed to delete certificate');
      }
    } catch (err) {
      console.error('Error deleting certificate:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete certificate');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown User';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Certificate Administration</h1>
        <p className="text-white/60">Manage certificates, view analytics, and issue new certificates</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-400 hover:text-red-300 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-white/10">
        <div className="flex space-x-6">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'certificates', label: 'Certificates', icon: '🏆' },
            { key: 'issue', label: 'Issue Certificate', icon: '➕' },
            { key: 'users', label: 'Users', icon: '👥' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === tab.key
                  ? 'text-white border-blue-500'
                  : 'text-white/60 border-transparent hover:text-white/90'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Total Certificates</p>
                  <p className="text-3xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="text-3xl">🏆</div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">This Week</p>
                  <p className="text-3xl font-bold text-white">{stats.recentlyIssued}</p>
                </div>
                <div className="text-3xl">📈</div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Certificate Types</p>
                  <p className="text-3xl font-bold text-white">{Object.keys(stats.byType).length}</p>
                </div>
                <div className="text-3xl">🎯</div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Active Users</p>
                  <p className="text-3xl font-bold text-white">{users.filter(u => !u.isAdmin).length}</p>
                </div>
                <div className="text-3xl">👥</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Certificate Types */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Certificates by Type</h3>
              <div className="space-y-3">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-white/80 capitalize">{type}</span>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="h-2 bg-blue-500 rounded"
                        style={{ width: `${(count / stats.total) * 100}px` }}
                      />
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Top Certificate Earners</h3>
              <div className="space-y-3">
                {stats.topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: theme.colors.accent }}
                      >
                        {index + 1}
                      </span>
                      <span className="text-white/80">{user.userName}</span>
                    </div>
                    <span className="text-white font-medium">{user.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'certificates' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">All Certificates ({certificates.length})</h2>
            <button
              onClick={loadData}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Certificate</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Issued</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{cert.title}</p>
                          {cert.description && (
                            <p className="text-white/60 text-sm mt-1">{cert.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white/80">{getUserName(cert.userId)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full capitalize">
                          {cert.certificateType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/60 text-sm">{formatDate(cert.issuedAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => window.open(`/certificates/${cert.id}`, '_blank')}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                            title="View certificate"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                            title="Delete certificate"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'issue' && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">Issue New Certificate</h2>
          
          <form onSubmit={handleIssueCertificate} className="max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">User</label>
                <select
                  value={issueForm.userId}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a user</option>
                  {users.filter(u => !u.isAdmin).map(user => (
                    <option key={user.id} value={user.id}>
                      {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Certificate Type</label>
                <select
                  value={issueForm.certificateType}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, certificateType: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="completion">Completion</option>
                  <option value="participation">Participation</option>
                  <option value="achievement">Achievement</option>
                  <option value="excellence">Excellence</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-2">Certificate Title</label>
                <input
                  type="text"
                  value={issueForm.title}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Chapter 1 Completion Certificate"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                <textarea
                  value={issueForm.description}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the achievement"
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Chapter ID (Optional)</label>
                <input
                  type="text"
                  value={issueForm.chapterId}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, chapterId: e.target.value }))}
                  placeholder="e.g., chapter-1"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Event ID (Optional)</label>
                <input
                  type="text"
                  value={issueForm.eventId}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, eventId: e.target.value }))}
                  placeholder="Event identifier"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={isIssuing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center space-x-2"
              >
                {isIssuing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{isIssuing ? 'Issuing...' : 'Issue Certificate'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">User Management</h2>
          
          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Certificates</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const userCertCount = certificates.filter(c => c.userId === user.id).length;
                    return (
                      <tr key={user.id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 text-white">
                          {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name set'}
                        </td>
                        <td className="py-3 px-4 text-white/80">{user.email || 'No email'}</td>
                        <td className="py-3 px-4 text-white/60">{userCertCount}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.isAdmin 
                              ? 'bg-red-500/20 text-red-300' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {user.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setIssueForm(prev => ({ ...prev, userId: user.id }))}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                            title="Issue certificate to user"
                          >
                            Issue Certificate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}