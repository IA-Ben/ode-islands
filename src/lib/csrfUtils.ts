// CSRF token utility functions
export const getCsrfToken = (): string => {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return '';
};

export const fetchCsrfToken = async (): Promise<string> => {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
};

// Generic API call wrapper with CSRF protection
export const apiCallWithCSRF = async (url: string, options: RequestInit = {}) => {
  const csrfToken = getCsrfToken() || await fetchCsrfToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken,
    ...options.headers,
  };

  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
};