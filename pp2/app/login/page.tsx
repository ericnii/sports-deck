'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface FormErrors {
  submit?: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Clear previous submit errors
      setErrors((prev) => ({ ...prev, submit: undefined }));

      setIsLoading(true);

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        const data: LoginResponse = await response.json();

        if (!response.ok) {
          // Handle backend errors - they can return 'error' or 'message' field
          const errorMessage = (data as any).error || (data as any).message || 'An error occurred. Please try again.';
          setErrors((prev) => ({
            ...prev,
            submit: errorMessage,
          }));
          return;
        }

        // Success - store token if provided
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }

        // Store user info if provided
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        // Redirect to dashboard (hard refresh to sync Server Components & Context)
        window.location.href = '/';
      } catch (error) {
        console.error('Login error:', error);
        setErrors((prev) => ({
          ...prev,
          submit: 'An error occurred. Please try again later.',
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, router]
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 border border-zinc-200 dark:border-zinc-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 mb-2 drop-shadow-lg">Welcome Back</h1>
            <p className="text-zinc-700 dark:text-zinc-300">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Submit Error Alert */}
            {errors.submit && (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{errors.submit}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:text-zinc-500 transition-colors"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:text-zinc-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-lg font-medium shadow transition hover:bg-blue-700 ${
                isLoading
                  ? 'bg-zinc-400 dark:bg-zinc-700 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="mt-8 mb-6 relative flex items-center justify-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-700"></div>
            <div className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest bg-white dark:bg-zinc-900 absolute rounded-full">
              Or continue with
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="mt-6 mb-2 flex gap-3">
            <a
              href="/api/auth/oauth/github"
              className="flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition font-bold"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
              </svg>
              GitHub
            </a>
            <a
              href="/api/auth/oauth/google"
              className="flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition font-bold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </a>
          </div>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Don't have an account?{' '}
              <a href="/signup" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}