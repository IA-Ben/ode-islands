'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface CertificateData {
  id: string;
  title: string;
  description?: string;
  certificateType: string;
  issuedAt: string;
  recipientName?: string;
  eventName?: string;
  chapterName?: string;
}

interface CertificateTemplateProps {
  certificate: CertificateData;
  template?: 'default' | 'completion' | 'achievement' | 'participation';
  showSignature?: boolean;
  forExport?: boolean;
}

export default function CertificateTemplate({ 
  certificate, 
  template = 'default',
  showSignature = true,
  forExport = false 
}: CertificateTemplateProps) {
  const { theme } = useTheme();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCertificateConfig = (type: string) => {
    const configs = {
      completion: {
        icon: '🏆',
        primaryColor: '#10B981', // green-500
        secondaryColor: '#059669', // green-600
        accentColor: '#ECFDF5', // green-50
        title: 'Certificate of Completion',
        subtitle: 'This certifies that',
        decoration: 'laurel'
      },
      participation: {
        icon: '🎯',
        primaryColor: '#3B82F6', // blue-500
        secondaryColor: '#2563EB', // blue-600
        accentColor: '#EFF6FF', // blue-50
        title: 'Certificate of Participation',
        subtitle: 'Proudly presented to',
        decoration: 'stars'
      },
      achievement: {
        icon: '⭐',
        primaryColor: '#F59E0B', // amber-500
        secondaryColor: '#D97706', // amber-600
        accentColor: '#FFFBEB', // amber-50
        title: 'Certificate of Achievement',
        subtitle: 'Awarded to',
        decoration: 'badge'
      },
      excellence: {
        icon: '💎',
        primaryColor: '#8B5CF6', // violet-500
        secondaryColor: '#7C3AED', // violet-600
        accentColor: '#F5F3FF', // violet-50
        title: 'Certificate of Excellence',
        subtitle: 'In recognition of',
        decoration: 'diamond'
      }
    };
    return configs[type as keyof typeof configs] || configs.participation;
  };

  const config = getCertificateConfig(certificate.certificateType);
  
  const containerStyle = forExport ? {
    width: '800px',
    height: '600px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#ffffff',
    margin: '0 auto'
  } : {};

  const DecorationElement = ({ type }: { type: string }) => {
    switch (type) {
      case 'laurel':
        return (
          <div className="flex justify-center space-x-4 my-6">
            <div className="text-2xl" style={{ color: config.primaryColor }}>🏛️</div>
            <div className="text-3xl" style={{ color: config.primaryColor }}>🌿</div>
            <div className="text-2xl" style={{ color: config.primaryColor }}>🏛️</div>
          </div>
        );
      case 'stars':
        return (
          <div className="flex justify-center space-x-2 my-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="text-xl" style={{ color: config.primaryColor }}>⭐</div>
            ))}
          </div>
        );
      case 'badge':
        return (
          <div className="flex justify-center my-6">
            <div className="relative">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: config.primaryColor }}
              >
                {config.icon}
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
                ✨
              </div>
            </div>
          </div>
        );
      case 'diamond':
        return (
          <div className="flex justify-center my-6">
            <div className="relative transform rotate-45">
              <div 
                className="w-12 h-12 flex items-center justify-center text-white text-lg transform -rotate-45"
                style={{ backgroundColor: config.primaryColor }}
              >
                💎
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center my-6">
            <div className="text-4xl" style={{ color: config.primaryColor }}>{config.icon}</div>
          </div>
        );
    }
  };

  return (
    <div 
      className="bg-white text-gray-900 p-8 relative overflow-hidden"
      style={containerStyle}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${config.primaryColor} 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Border */}
      <div 
        className="absolute inset-4 border-4 rounded-lg"
        style={{ borderColor: config.primaryColor }}
      >
        <div 
          className="absolute inset-2 border-2 rounded"
          style={{ borderColor: config.secondaryColor }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center text-center px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-5xl mb-4">{config.icon}</div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: config.primaryColor }}
          >
            {config.title}
          </h1>
          <div 
            className="h-1 w-32 mx-auto mb-4"
            style={{ backgroundColor: config.secondaryColor }}
          />
          <p className="text-lg text-gray-600 italic">
            {config.subtitle}
          </p>
        </div>

        {/* Recipient */}
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 mb-2">
            {certificate.recipientName || 'Ode Islands Explorer'}
          </h2>
        </div>

        {/* Achievement */}
        <div className="mb-6">
          <p className="text-lg text-gray-600 mb-2">
            for successfully completing
          </p>
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">
            {certificate.title}
          </h3>
          {certificate.description && (
            <p className="text-base text-gray-600 max-w-md mx-auto leading-relaxed">
              {certificate.description}
            </p>
          )}
        </div>

        {/* Decoration */}
        <DecorationElement type={config.decoration} />

        {/* Footer */}
        <div className="mt-auto pt-8">
          <div className="flex justify-between items-end">
            <div className="text-left">
              <p className="text-sm text-gray-500 mb-1">Date Issued</p>
              <p className="text-base font-medium text-gray-800">
                {formatDate(certificate.issuedAt)}
              </p>
            </div>
            
            {showSignature && (
              <div className="text-right">
                <div className="w-32 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">The Ode Islands</p>
                <p className="text-xs text-gray-500">Certificate Authority</p>
              </div>
            )}
          </div>
          
          {/* Certificate ID */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Certificate ID: {certificate.id}
            </p>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-4 right-4 opacity-20">
        <p 
          className="text-xs font-bold transform rotate-45"
          style={{ color: config.primaryColor }}
        >
          THE ODE ISLANDS
        </p>
      </div>
    </div>
  );
}