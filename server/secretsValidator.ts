/**
 * Secrets Validation Utility
 *
 * Validates all required environment variables and secrets on application startup.
 * Ensures proper security configuration before the server starts.
 */

interface SecretValidation {
  name: string;
  required: boolean;
  minLength?: number;
  validation?: (value: string) => boolean;
  errorMessage?: string;
}

const REQUIRED_SECRETS: SecretValidation[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    validation: (value) => value.startsWith('postgres'),
    errorMessage: 'DATABASE_URL must be a valid PostgreSQL connection string'
  },
  {
    name: 'SESSION_SECRET',
    required: true,
    minLength: 32,
    errorMessage: 'SESSION_SECRET must be at least 32 characters for security'
  },
  {
    name: 'CSRF_SECRET',
    required: true,
    minLength: 32,
    errorMessage: 'CSRF_SECRET must be at least 32 characters for security'
  },
  {
    name: 'NEXT_PUBLIC_STACK_PROJECT_ID',
    required: true,
    errorMessage: 'Stack Auth Project ID is required for authentication'
  },
  {
    name: 'STACK_SECRET_SERVER_KEY',
    required: true,
    errorMessage: 'Stack Auth Server Key is required for authentication'
  }
];

const OPTIONAL_SECRETS: SecretValidation[] = [
  {
    name: 'BYPASS_AUTH',
    required: false,
    validation: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'BYPASS_AUTH must be either "true" or "false"'
  }
];

export class SecretsValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validate all required secrets
   */
  public validate(): void {
    console.log('🔐 Validating environment secrets...');

    // Check required secrets
    for (const secret of REQUIRED_SECRETS) {
      this.validateSecret(secret);
    }

    // Check optional secrets
    for (const secret of OPTIONAL_SECRETS) {
      if (process.env[secret.name]) {
        this.validateSecret(secret);
      }
    }

    // Security checks
    this.checkProductionSecurity();
    this.checkBypassAuthSetting();

    // Report results
    this.reportResults();
  }

  private validateSecret(secret: SecretValidation): void {
    const value = process.env[secret.name];

    // Check if required secret exists
    if (secret.required && !value) {
      this.errors.push(`❌ Missing required secret: ${secret.name}`);
      if (secret.errorMessage) {
        this.errors.push(`   ${secret.errorMessage}`);
      }
      return;
    }

    if (!value) return; // Optional secret not set

    // Check minimum length
    if (secret.minLength && value.length < secret.minLength) {
      this.errors.push(
        `❌ ${secret.name} is too short (${value.length} chars, minimum ${secret.minLength} required)`
      );
      if (secret.errorMessage) {
        this.errors.push(`   ${secret.errorMessage}`);
      }
    }

    // Custom validation
    if (secret.validation && !secret.validation(value)) {
      this.errors.push(`❌ ${secret.name} failed validation`);
      if (secret.errorMessage) {
        this.errors.push(`   ${secret.errorMessage}`);
      }
    }
  }

  private checkProductionSecurity(): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Check for weak secrets in production
      const sessionSecret = process.env.SESSION_SECRET || '';
      const csrfSecret = process.env.CSRF_SECRET || '';

      if (sessionSecret.includes('change-this') || sessionSecret.includes('your-')) {
        this.errors.push('❌ SESSION_SECRET contains default/weak value in production');
      }

      if (csrfSecret.includes('change-this') || csrfSecret.includes('your-')) {
        this.errors.push('❌ CSRF_SECRET contains default/weak value in production');
      }

      // Check if secrets are properly generated (base64 pattern)
      const base64Pattern = /^[A-Za-z0-9+/=]+$/;
      if (sessionSecret && !base64Pattern.test(sessionSecret)) {
        this.warnings.push('⚠️  SESSION_SECRET should be a base64-encoded random value');
      }

      if (csrfSecret && !base64Pattern.test(csrfSecret)) {
        this.warnings.push('⚠️  CSRF_SECRET should be a base64-encoded random value');
      }
    }
  }

  private checkBypassAuthSetting(): void {
    const bypassAuth = process.env.BYPASS_AUTH?.toLowerCase() === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isProduction && bypassAuth) {
      this.errors.push('❌ CRITICAL: BYPASS_AUTH is enabled in production!');
      this.errors.push('   This creates a critical security vulnerability.');
      this.errors.push('   Set BYPASS_AUTH=false immediately.');
    }

    if (isDevelopment && bypassAuth) {
      this.warnings.push('⚠️  Authentication bypass is ENABLED for development');
      this.warnings.push('   All routes are publicly accessible without authentication');
      this.warnings.push('   This must be disabled before production deployment');
    }

    if (!isDevelopment && !isProduction) {
      this.warnings.push('⚠️  NODE_ENV is not set to "development" or "production"');
      this.warnings.push(`   Current value: ${process.env.NODE_ENV || 'undefined'}`);
    }
  }

  private reportResults(): void {
    // Print warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(warning));
    }

    // Print errors
    if (this.errors.length > 0) {
      console.log('\n❌ Secrets validation failed:');
      this.errors.forEach(error => console.log(error));
      console.log('\n💡 To generate secure secrets, run:');
      console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
      console.log('');
      throw new Error('Secrets validation failed. Fix the errors above before starting the server.');
    }

    // Success
    if (this.warnings.length === 0) {
      console.log('✅ All secrets validated successfully');
    } else {
      console.log('✅ All required secrets validated (with warnings)');
    }
  }

  /**
   * Quick validation helper
   */
  public static validateAll(): void {
    const validator = new SecretsValidator();
    validator.validate();
  }
}

/**
 * Validate secrets on module import (runs at startup)
 */
export function validateSecrets(): void {
  SecretsValidator.validateAll();
}
