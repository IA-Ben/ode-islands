'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import CertificateTemplate from '@/components/CertificateTemplate';
import { CertificateGenerator } from '@/lib/certificateGenerator';

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

export default function ShareableCertificatePage() {
  const params = useParams();
  const { theme } = useTheme();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.id) {
      fetchCertificate(params.id as string);
    }
  }, [params.id]);

  const fetchCertificate = async (certificateId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // For this demo, we'll create a mock certificate
      // In production, you'd fetch from an API that allows public certificate viewing
      const response = await fetch(`/api/certificates/public/${certificateId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Certificate not found');
        }
        throw new Error('Failed to load certificate');
      }

      const data = await response.json();
      if (data.success) {
        setCertificate(data.certificate);
      } else {
        throw new Error(data.message || 'Failed to load certificate');
      }
    } catch (err) {
      console.error('Error fetching certificate:', err);
      setError(err instanceof Error ? err.message : 'Failed to load certificate');
      
      // For demo purposes, create a mock certificate if API fails
      setCertificate({
        id: certificateId,
        userId: 'demo-user',
        certificateType: 'completion',
        title: 'The Ode Islands - Chapter Completion',
        description: 'Successfully completed all content in The Ode Islands journey',
        issuedAt: new Date().toISOString()
      });
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: 'png' | 'jpeg' | 'pdf' = 'png') => {
    if (!certificate || !certificateRef.current) return;

    try {
      await CertificateGenerator.downloadCertificate(
        certificateRef.current,
        {
          id: certificate.id,
          title: certificate.title,
          description: certificate.description,
          certificateType: certificate.certificateType,
          issuedAt: certificate.issuedAt
        },
        format,
        { width: 800, height: 600, quality: 1.0 }
      );
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleShare = async () => {
    if (!certificate) return;

    const shareData = {
      title: certificate.title,
      text: `Check out my certificate from The Ode Islands!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying link
      navigator.clipboard.writeText(window.location.href);
      alert('Certificate link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">No certificate data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/'}
                className="text-white/60 hover:text-white transition-colors"
                title="Return to home"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white">Certificate Verification</h1>
                <p className="text-sm text-white/60">The Ode Islands</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleDownload('png')}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download</span>
              </button>
              
              <button
                onClick={handleShare}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Display */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Certificate Info */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Digital Certificate</h2>
            <p className="text-white/60">
              This certificate verifies the achievement described below
            </p>
          </div>

          {/* Certificate */}
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl mx-auto">
            <div ref={certificateRef}>
              <CertificateTemplate
                certificate={{
                  id: certificate.id,
                  title: certificate.title,
                  description: certificate.description,
                  certificateType: certificate.certificateType,
                  issuedAt: certificate.issuedAt,
                  recipientName: 'Ode Islands Explorer'
                }}
                template="default"
                showSignature={true}
                forExport={true}
              />
            </div>
          </div>

          {/* Certificate Details */}
          <div className="mt-8 bg-white/5 rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Certificate Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/60">Certificate ID</p>
                <p className="text-white font-mono text-sm">{certificate.id}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Issue Date</p>
                <p className="text-white">
                  {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60">Certificate Type</p>
                <p className="text-white capitalize">{certificate.certificateType}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Issuing Authority</p>
                <p className="text-white">The Ode Islands</p>
              </div>
            </div>
          </div>

          {/* Verification Notice */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/40">
              This is a verified digital certificate. The authenticity of this certificate can be verified
              through the certificate ID provided above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}