// Google reCAPTCHA v3 utility functions

export interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Load Google reCAPTCHA script dynamically
 */
export const loadRecaptchaScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('reCAPTCHA can only be loaded in browser environment'));
      return;
    }

    // Check if script is already loaded
    if (window.grecaptcha) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="recaptcha"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA script')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Wait for grecaptcha to be ready
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(() => {
          resolve();
        });
      } else {
        reject(new Error('reCAPTCHA failed to initialize'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });
};

/**
 * Execute reCAPTCHA and get token
 */
export const executeRecaptcha = async (action: string): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('reCAPTCHA can only be executed in browser environment');
  }

  if (!window.grecaptcha) {
    throw new Error('reCAPTCHA not loaded');
  }

  const siteKey = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    throw new Error('reCAPTCHA site key not configured');
  }

  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(siteKey, { action })
        .then((token: string) => {
          resolve(token);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  });
};

/**
 * Verify reCAPTCHA token on server side
 */
export const verifyRecaptchaToken = async (token: string, expectedAction?: string): Promise<RecaptchaResponse> => {
  const secretKey = process.env.GOOGLE_RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    throw new Error('reCAPTCHA secret key not configured');
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to verify reCAPTCHA token');
  }

  const result: RecaptchaResponse = await response.json();

  // Check if verification was successful
  if (!result.success) {
    throw new Error(`reCAPTCHA verification failed: ${result['error-codes']?.join(', ') || 'Unknown error'}`);
  }

  // Check action if provided
  if (expectedAction && result.action !== expectedAction) {
    throw new Error(`reCAPTCHA action mismatch. Expected: ${expectedAction}, Got: ${result.action}`);
  }

  // Check score (reCAPTCHA v3 returns a score between 0.0 and 1.0)
  // 1.0 is very likely a good interaction, 0.0 is very likely a bot
  if (result.score !== undefined && result.score < 0.5) {
    throw new Error(`reCAPTCHA score too low: ${result.score}`);
  }

  return result;
};

/**
 * Custom hook for using reCAPTCHA in React components
 */
export const useRecaptcha = () => {
  const executeRecaptchaAction = async (action: string): Promise<string> => {
    try {
      await loadRecaptchaScript();
      return await executeRecaptcha(action);
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error);
      throw error;
    }
  };

  return { executeRecaptchaAction };
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}