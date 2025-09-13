import * as htmlToImage from 'html-to-image';

export interface CertificateData {
  id: string;
  title: string;
  description?: string;
  certificateType: string;
  issuedAt: string;
  recipientName?: string;
  eventName?: string;
  chapterName?: string;
}

export interface GenerationOptions {
  format: 'png' | 'jpeg' | 'svg' | 'pdf';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  pixelRatio?: number;
}

export class CertificateGenerator {
  private static defaultOptions: GenerationOptions = {
    format: 'png',
    quality: 1.0,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    pixelRatio: 2
  };

  static async generatePNG(element: HTMLElement, options?: Partial<GenerationOptions>): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const dataUrl = await htmlToImage.toPng(element, {
        quality: opts.quality,
        width: opts.width,
        height: opts.height,
        backgroundColor: opts.backgroundColor,
        pixelRatio: opts.pixelRatio,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      return dataUrl;
    } catch (error) {
      console.error('Error generating PNG:', error);
      throw new Error('Failed to generate PNG certificate');
    }
  }

  static async generateJPEG(element: HTMLElement, options?: Partial<GenerationOptions>): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const dataUrl = await htmlToImage.toJpeg(element, {
        quality: opts.quality,
        width: opts.width,
        height: opts.height,
        backgroundColor: opts.backgroundColor,
        pixelRatio: opts.pixelRatio
      });
      
      return dataUrl;
    } catch (error) {
      console.error('Error generating JPEG:', error);
      throw new Error('Failed to generate JPEG certificate');
    }
  }

  static async generateSVG(element: HTMLElement, options?: Partial<GenerationOptions>): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const dataUrl = await htmlToImage.toSvg(element, {
        width: opts.width,
        height: opts.height,
        backgroundColor: opts.backgroundColor
      });
      
      return dataUrl;
    } catch (error) {
      console.error('Error generating SVG:', error);
      throw new Error('Failed to generate SVG certificate');
    }
  }

  static downloadImage(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static async downloadCertificate(
    element: HTMLElement, 
    certificate: CertificateData, 
    format: 'png' | 'jpeg' | 'svg' | 'pdf' = 'png',
    options?: Partial<GenerationOptions>
  ) {
    try {
      // Handle PDF format separately using print functionality
      if (format === 'pdf') {
        this.printCertificate(certificate);
        return 'pdf-print-initiated';
      }

      // Handle image formats
      let dataUrl: string;
      let extension: string;
      
      switch (format) {
        case 'jpeg':
          dataUrl = await this.generateJPEG(element, options);
          extension = 'jpg';
          break;
        case 'svg':
          dataUrl = await this.generateSVG(element, options);
          extension = 'svg';
          break;
        case 'png':
        default:
          dataUrl = await this.generatePNG(element, options);
          extension = 'png';
          break;
      }
      
      const filename = `${certificate.title.replace(/\s+/g, '_')}_certificate.${extension}`;
      this.downloadImage(dataUrl, filename);
      
      return dataUrl;
    } catch (error) {
      console.error('Error downloading certificate:', error);
      throw error;
    }
  }

  static generatePrintableHTML(certificate: CertificateData): string {
    const config = this.getCertificateConfig(certificate.certificateType);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${certificate.title} - Certificate</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              background: white;
              padding: 20px;
            }
            .certificate {
              width: 800px;
              height: 600px;
              margin: 0 auto;
              background: white;
              border: 4px solid ${config.primaryColor};
              position: relative;
              padding: 40px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              text-align: center;
            }
            .certificate::before {
              content: '';
              position: absolute;
              inset: 8px;
              border: 2px solid ${config.secondaryColor};
              border-radius: 4px;
            }
            .header { margin-bottom: 30px; }
            .icon { font-size: 48px; margin-bottom: 16px; }
            .title { 
              font-size: 36px; 
              font-weight: bold; 
              color: ${config.primaryColor}; 
              margin-bottom: 12px;
            }
            .divider {
              height: 4px;
              width: 120px;
              background: ${config.secondaryColor};
              margin: 0 auto 16px;
            }
            .subtitle { 
              font-size: 18px; 
              color: #666; 
              font-style: italic;
            }
            .recipient {
              font-size: 48px;
              font-weight: bold;
              color: #333;
              margin-bottom: 24px;
            }
            .achievement-text {
              font-size: 18px;
              color: #666;
              margin-bottom: 8px;
            }
            .achievement-title {
              font-size: 24px;
              font-weight: 600;
              color: #333;
              margin-bottom: 16px;
            }
            .description {
              font-size: 16px;
              color: #666;
              max-width: 500px;
              margin: 0 auto 30px;
              line-height: 1.5;
            }
            .decoration {
              margin: 24px 0;
              display: flex;
              justify-content: center;
              gap: 8px;
            }
            .star { color: ${config.primaryColor}; font-size: 20px; }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: auto;
              padding-top: 30px;
            }
            .date-section p:first-child {
              font-size: 12px;
              color: #888;
              margin-bottom: 4px;
            }
            .date-section p:last-child {
              font-size: 16px;
              font-weight: 500;
              color: #333;
            }
            .signature-section {
              text-align: right;
            }
            .signature-line {
              width: 120px;
              border-bottom: 1px solid #666;
              margin-bottom: 8px;
            }
            .signature-title {
              font-size: 14px;
              color: #666;
            }
            .signature-subtitle {
              font-size: 12px;
              color: #888;
            }
            .certificate-id {
              text-align: center;
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #999;
            }
            .watermark {
              position: absolute;
              bottom: 16px;
              right: 16px;
              opacity: 0.2;
              transform: rotate(45deg);
              font-size: 10px;
              font-weight: bold;
              color: ${config.primaryColor};
            }
            @media print {
              body { margin: 0; padding: 0; }
              .certificate { margin: 0; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <div class="icon">${config.icon}</div>
              <div class="title">${config.title}</div>
              <div class="divider"></div>
              <div class="subtitle">${config.subtitle}</div>
            </div>
            
            <div class="recipient">${certificate.recipientName || 'Ode Islands Explorer'}</div>
            
            <div class="achievement-text">for successfully completing</div>
            <div class="achievement-title">${certificate.title}</div>
            ${certificate.description ? `<div class="description">${certificate.description}</div>` : ''}
            
            <div class="decoration">
              <span class="star">⭐</span>
              <span class="star">⭐</span>
              <span class="star">⭐</span>
              <span class="star">⭐</span>
              <span class="star">⭐</span>
            </div>
            
            <div class="footer">
              <div class="date-section">
                <p>Date Issued</p>
                <p>${new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric'
                })}</p>
              </div>
              
              <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-title">The Ode Islands</div>
                <div class="signature-subtitle">Certificate Authority</div>
              </div>
            </div>
            
            <div class="certificate-id">
              Certificate ID: ${certificate.id}
            </div>
            
            <div class="watermark">THE ODE ISLANDS</div>
          </div>
        </body>
      </html>
    `;
  }

  static printCertificate(certificate: CertificateData) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(this.generatePrintableHTML(certificate));
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  private static getCertificateConfig(type: string) {
    const configs = {
      completion: {
        icon: '🏆',
        primaryColor: '#10B981',
        secondaryColor: '#059669',
        title: 'Certificate of Completion',
        subtitle: 'This certifies that'
      },
      participation: {
        icon: '🎯', 
        primaryColor: '#3B82F6',
        secondaryColor: '#2563EB',
        title: 'Certificate of Participation',
        subtitle: 'Proudly presented to'
      },
      achievement: {
        icon: '⭐',
        primaryColor: '#F59E0B',
        secondaryColor: '#D97706', 
        title: 'Certificate of Achievement',
        subtitle: 'Awarded to'
      },
      excellence: {
        icon: '💎',
        primaryColor: '#8B5CF6',
        secondaryColor: '#7C3AED',
        title: 'Certificate of Excellence', 
        subtitle: 'In recognition of'
      }
    };
    return configs[type as keyof typeof configs] || configs.participation;
  }
}