'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import * as htmlToImage from 'html-to-image';

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

interface CertificateDisplayProps {
  certificates?: Certificate[];
  showEmpty?: boolean;
  className?: string;
  variant?: 'grid' | 'list';
  showControls?: boolean;
}

interface CertificateCardProps {
  certificate: Certificate;
  onDownload?: (certificate: Certificate) => void;
  onShare?: (certificate: Certificate) => void;
  className?: string;
}

const CertificateCard = ({ certificate, onDownload, onShare, className = '' }: CertificateCardProps) => {
  const { theme } = useTheme();
  const certificateRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCertificateTypeInfo = (type: string) => {
    const types = {
      completion: {
        icon: '🏆',
        label: 'Completion Certificate',
        color: theme.colors.success
      },
      participation: {
        icon: '🎯',
        label: 'Participation Certificate',
        color: theme.colors.accent
      },
      achievement: {
        icon: '⭐',
        label: 'Achievement Certificate',
        color: theme.colors.warning
      },
      excellence: {
        icon: '💎',
        label: 'Excellence Certificate',
        color: theme.colors.secondary
      }
    };
    return types[type as keyof typeof types] || types.participation;
  };

  const typeInfo = getCertificateTypeInfo(certificate.certificateType);

  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    
    try {
      const dataUrl = await htmlToImage.toPng(certificateRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `${certificate.title.replace(/\s+/g, '_')}_certificate.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating PNG:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    
    try {
      // For PDF, we'll use a simpler approach with window.print()
      // In a production app, you'd want to use a proper PDF library
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${certificate.title}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                .certificate { 
                  max-width: 800px; 
                  margin: 0 auto; 
                  padding: 40px; 
                  border: 3px solid ${typeInfo.color}; 
                  text-align: center;
                  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                }
                .header { font-size: 32px; font-weight: bold; margin-bottom: 20px; color: ${typeInfo.color}; }
                .title { font-size: 24px; margin: 20px 0; color: #333; }
                .description { font-size: 16px; margin: 15px 0; color: #666; }
                .date { font-size: 14px; margin-top: 30px; color: #888; }
                .decoration { font-size: 48px; margin: 20px 0; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="certificate">
                <div class="decoration">${typeInfo.icon}</div>
                <div class="header">${typeInfo.label}</div>
                <div class="title">${certificate.title}</div>
                <div class="description">${certificate.description || ''}</div>
                <div class="date">Issued on ${formatDate(certificate.issuedAt)}</div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Certificate Preview */}
      <div
        ref={certificateRef}
        className="bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 rounded-lg p-8 border-2 shadow-lg transition-transform hover:scale-105"
        style={{ borderColor: typeInfo.color }}
      >
        {/* Certificate Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{typeInfo.icon}</div>
          <h3 
            className="text-xl font-bold mb-1"
            style={{ color: typeInfo.color }}
          >
            {typeInfo.label}
          </h3>
          <div className="h-0.5 w-20 mx-auto" style={{ backgroundColor: typeInfo.color }} />
        </div>

        {/* Certificate Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 leading-tight">
            {certificate.title}
          </h2>
        </div>

        {/* Certificate Description */}
        {certificate.description && (
          <div className="text-center mb-6">
            <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">
              {certificate.description}
            </p>
          </div>
        )}

        {/* Decorative Elements */}
        <div className="flex justify-center items-center mb-6">
          <div className="flex space-x-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: typeInfo.color + '60' }}
              />
            ))}
          </div>
        </div>

        {/* Certificate Date */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Issued on {formatDate(certificate.issuedAt)}
          </p>
        </div>

        {/* Ode Islands Branding */}
        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 font-medium">
            THE ODE ISLANDS
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex space-x-1">
          <button
            onClick={handleDownloadPNG}
            className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
            title="Download as PNG"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
            title="Download as PDF"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
          {onShare && (
            <button
              onClick={() => onShare(certificate)}
              className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              title="Share certificate"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CertificateDisplay({ 
  certificates = [], 
  showEmpty = true, 
  className = '',
  variant = 'grid',
  showControls = true
}: CertificateDisplayProps) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCertificates, setUserCertificates] = useState<Certificate[]>(certificates);

  useEffect(() => {
    if (certificates.length === 0) {
      fetchCertificates();
    } else {
      setUserCertificates(certificates);
    }
  }, [certificates]);

  const fetchCertificates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/certificates');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch certificates');
      }

      const data = await response.json();
      if (data.success) {
        setUserCertificates(data.certificates || []);
      } else {
        throw new Error(data.message || 'Failed to load certificates');
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (certificate: Certificate) => {
    console.log('Downloading certificate:', certificate.id);
  };

  const handleShare = async (certificate: Certificate) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: certificate.title,
          text: `Check out my ${certificate.certificateType} certificate from The Ode Islands!`,
          url: window.location.origin + `/certificates/${certificate.id}`
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying link
      const shareUrl = `${window.location.origin}/certificates/${certificate.id}`;
      navigator.clipboard.writeText(shareUrl);
      // You could show a toast notification here
    }
  };

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
            onClick={fetchCertificates}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (userCertificates.length === 0 && showEmpty) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Certificates Yet</h3>
          <p className="text-white/60 mb-6">
            Complete chapters and participate in events to earn certificates recognizing your achievements.
          </p>
          <div className="space-y-2 text-sm text-white/40">
            <p>🎯 Complete chapters to earn completion certificates</p>
            <p>⭐ Participate in live events for participation certificates</p>
            <p>💎 Achieve milestones for special achievement certificates</p>
          </div>
        </div>
      </div>
    );
  }

  const containerClass = variant === 'grid' 
    ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
    : 'space-y-6';

  return (
    <div className={className}>
      {showControls && userCertificates.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Your Certificates ({userCertificates.length})
          </h2>
          <button
            onClick={fetchCertificates}
            className="text-white/60 hover:text-white transition-colors"
            title="Refresh certificates"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      <div className={containerClass}>
        {userCertificates.map((certificate) => (
          <CertificateCard
            key={certificate.id}
            certificate={certificate}
            onDownload={handleDownload}
            onShare={handleShare}
          />
        ))}
      </div>
    </div>
  );
}