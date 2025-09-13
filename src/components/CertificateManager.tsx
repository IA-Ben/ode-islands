'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import CertificateDisplay from './CertificateDisplay';
import { CertificateEligibilityChecker, CertificateEligibility, UserProgress } from '@/lib/certificateEligibility';

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

interface CertificateManagerProps {
  className?: string;
  showEligibility?: boolean;
  autoIssue?: boolean;
}

export default function CertificateManager({ 
  className = '', 
  showEligibility = true,
  autoIssue = false 
}: CertificateManagerProps) {
  const { theme } = useTheme();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eligibilities, setEligibilities] = useState<CertificateEligibility[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load progress and certificates in parallel
      const [progressResponse, certificatesResponse] = await Promise.all([
        fetch('/api/progress'),
        fetch('/api/certificates')
      ]);

      if (!progressResponse.ok || !certificatesResponse.ok) {
        if (progressResponse.status === 401 || certificatesResponse.status === 401) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const [progressData, certificatesData] = await Promise.all([
        progressResponse.json(),
        certificatesResponse.json()
      ]);

      if (progressData.success && certificatesData.success) {
        setIsAuthenticated(true);
        setProgress(progressData.progress || []);
        setCertificates(certificatesData.certificates || []);
        
        // Calculate eligibilities
        const eligibilityResults = CertificateEligibilityChecker.checkEligibility(progressData.progress || []);
        setEligibilities(eligibilityResults);

        // Auto-issue new certificates if enabled
        if (autoIssue) {
          await issueNewCertificates(progressData.progress || [], certificatesData.certificates || []);
        }
      } else {
        throw new Error('Failed to load data');
      }
    } catch (err) {
      console.error('Error loading certificate data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  const issueNewCertificates = async (userProgress: UserProgress[], existingCerts: Certificate[]) => {
    try {
      setIsIssuing(true);
      
      const newCertificates = CertificateEligibilityChecker.getNewCertificates(
        userProgress,
        existingCerts.map(c => ({ chapterId: c.chapterId, certificateType: c.certificateType }))
      );

      if (newCertificates.length === 0) {
        return;
      }

      // Issue certificates one by one
      const issuedCertificates: Certificate[] = [];
      for (const eligibility of newCertificates) {
        try {
          const certificateData = CertificateEligibilityChecker.generateCertificateData(
            eligibility, 
            'current-user' // This would come from session in real implementation
          );

          const response = await fetch('/api/certificates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(certificateData)
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              issuedCertificates.push(result.certificate);
            }
          }
        } catch (error) {
          console.error('Error issuing certificate:', error);
        }
      }

      if (issuedCertificates.length > 0) {
        setCertificates(prev => [...prev, ...issuedCertificates]);
        // Show notification or toast about new certificates
        console.log(`${issuedCertificates.length} new certificates issued!`);
      }
    } catch (error) {
      console.error('Error auto-issuing certificates:', error);
    } finally {
      setIsIssuing(false);
    }
  };

  const handleClaimCertificate = async (eligibility: CertificateEligibility) => {
    try {
      const certificateData = CertificateEligibilityChecker.generateCertificateData(
        eligibility,
        'current-user' // This would come from session
      );

      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(certificateData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCertificates(prev => [...prev, result.certificate]);
          
          // Update eligibilities to reflect the new certificate
          setEligibilities(prev => 
            prev.map(e => 
              e.title === eligibility.title && e.type === eligibility.type 
                ? { ...e, isEligible: false } 
                : e
            )
          );
        }
      } else {
        throw new Error('Failed to issue certificate');
      }
    } catch (error) {
      console.error('Error claiming certificate:', error);
      setError('Failed to claim certificate. Please try again.');
    }
  };

  const getEligibilityStatusColor = (eligibility: CertificateEligibility) => {
    if (eligibility.isEligible) return theme.colors.success;
    if (eligibility.progress >= 75) return theme.colors.warning;
    if (eligibility.progress >= 25) return theme.colors.accent;
    return theme.colors.textMuted;
  };

  const stats = CertificateEligibilityChecker.getCertificateStats(progress);

  if (!isAuthenticated) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="text-4xl mb-4">🔐</div>
          <h3 className="text-xl font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-white/60 mb-6">
            Please sign in to view your certificates and achievements.
          </p>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading certificates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">Error Loading Certificates</h3>
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Certificate Stats */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Earned</p>
                <p className="text-2xl font-bold text-white">{stats.earned}</p>
              </div>
              <div className="text-2xl">🏆</div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Available</p>
                <p className="text-2xl font-bold text-white">{stats.available}</p>
              </div>
              <div className="text-2xl">⭐</div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Progress</p>
                <p className="text-2xl font-bold text-white">{stats.overallProgress}%</p>
              </div>
              <div className="text-2xl">📈</div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Time Spent</p>
                <p className="text-lg font-bold text-white">{stats.timeSpent}</p>
              </div>
              <div className="text-2xl">⏱️</div>
            </div>
          </div>
        </div>

        {/* Auto-issue controls */}
        {showEligibility && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Certificate Management</h2>
            <div className="flex items-center space-x-4">
              {isIssuing && (
                <div className="flex items-center text-white/60">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Issuing certificates...
                </div>
              )}
              <button
                onClick={() => issueNewCertificates(progress, certificates)}
                disabled={isIssuing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Check for New Certificates
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Earned Certificates */}
      {certificates.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Your Certificates ({certificates.length})</h3>
          <CertificateDisplay 
            certificates={certificates}
            showEmpty={false}
            variant="grid"
            showControls={false}
          />
        </div>
      )}

      {/* Available Certificates */}
      {showEligibility && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Available Certificates</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {eligibilities
              .filter(e => !certificates.some(c => 
                c.certificateType === e.type && c.chapterId === e.chapterId
              ))
              .map((eligibility, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white text-sm leading-tight">
                        {eligibility.title}
                      </h4>
                      <p className="text-xs text-white/60 mt-1">
                        {eligibility.description}
                      </p>
                    </div>
                    <div 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: getEligibilityStatusColor(eligibility) + '20',
                        color: getEligibilityStatusColor(eligibility)
                      }}
                    >
                      {eligibility.isEligible ? 'Ready' : `${eligibility.progress}%`}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${eligibility.progress}%`,
                        backgroundColor: getEligibilityStatusColor(eligibility)
                      }}
                    />
                  </div>

                  {/* Requirements or Claim Button */}
                  {eligibility.isEligible ? (
                    <button
                      onClick={() => handleClaimCertificate(eligibility)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                    >
                      Claim Certificate
                    </button>
                  ) : (
                    <div className="text-xs text-white/50">
                      <p className="mb-1">Requirements:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {eligibility.missingRequirements?.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {certificates.length === 0 && eligibilities.every(e => !e.isEligible) && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌟</div>
          <h3 className="text-xl font-semibold text-white mb-2">Start Your Journey</h3>
          <p className="text-white/60 mb-6">
            Begin exploring The Ode Islands to earn your first certificates!
          </p>
          <button
            onClick={() => window.location.href = '/before/chapter-1'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Begin Journey
          </button>
        </div>
      )}
    </div>
  );
}