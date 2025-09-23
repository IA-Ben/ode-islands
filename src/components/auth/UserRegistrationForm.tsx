'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/csrfUtils';
import { logger, getUserFriendlyError, isRequired, isValidEmail, isValidPassword } from '@/lib/utils';

interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function UserRegistrationForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<UserRegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<UserRegistrationData & { submit: string }>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear specific error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UserRegistrationData & { submit: string }> = {};

    // Use consolidated validation utilities
    const firstNameCheck = isRequired(formData.firstName, 'First name');
    if (!firstNameCheck.valid) newErrors.firstName = firstNameCheck.message;

    const lastNameCheck = isRequired(formData.lastName, 'Last name');
    if (!lastNameCheck.valid) newErrors.lastName = lastNameCheck.message;

    const emailRequiredCheck = isRequired(formData.email, 'Email');
    if (!emailRequiredCheck.valid) {
      newErrors.email = emailRequiredCheck.message;
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    const passwordCheck = isValidPassword(formData.password);
    if (!passwordCheck.valid) newErrors.password = passwordCheck.message;

    const confirmPasswordCheck = isRequired(formData.confirmPassword, 'Password confirmation');
    if (!confirmPasswordCheck.valid) {
      newErrors.confirmPassword = confirmPasswordCheck.message;
    } else if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await apiPost('/api/auth/register', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (result) {
        // Registration successful
        alert('Registration successful! You can now log in.');
        router.push('/auth/login');
      } else {
        setErrors({ submit: 'Registration failed. Please try again.' });
      }
    } catch (error) {
      logger.error('Registration error', error, 'UserRegistrationForm');
      setErrors({ submit: getUserFriendlyError(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Join The Ode Islands</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Enter your first name"
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Enter your last name"
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="Enter your email address"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="Create a password (min 8 characters)"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'}`}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}