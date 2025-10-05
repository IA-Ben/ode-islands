'use client';

import { ButtonElement } from '@/../../shared/cardTypes';

interface ButtonElementRendererProps {
  element: ButtonElement;
  onClick?: () => void;
}

export function ButtonElementRenderer({ element, onClick }: ButtonElementRendererProps) {
  const { text, variant, size, fullWidth } = element.properties;
  
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  };
  
  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };
  
  const className = `
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    rounded font-medium transition-colors cursor-pointer
  `.trim();
  
  return (
    <button className={className} onClick={onClick}>
      {text}
    </button>
  );
}
