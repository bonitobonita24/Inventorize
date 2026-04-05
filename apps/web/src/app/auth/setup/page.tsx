// First-login setup page — validates setup token and sets initial password

'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8 shadow-sm">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Inventorize</h1>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}

function SetupForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';
  const email = searchParams?.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate token on mount — surfaces expired/invalid link early
  const { data: tokenData, isError: isTokenInvalid, isLoading: isValidating } = trpc.auth.validateSetupToken.useQuery(
    { token, email },
    {
      enabled: token.length > 0 && email.length > 0,
      retry: false,
    },
  );

  const completeSetup = trpc.auth.completeSetup.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await completeSetup.mutateAsync({ token, email, password });

      // Auto sign-in after password is set
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error !== undefined && result.error !== null) {
        setError('Account created, but sign-in failed. Please go to the login page.');
        setIsSubmitting(false);
        return;
      }

      // Redirect to root — middleware will route to the tenant dashboard
      window.location.href = '/';
    } catch {
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  const isMissingParams = token.length === 0 || email.length === 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Inventorize</h1>
          <p className="text-sm text-muted-foreground">Set your password to get started</p>
        </div>

        {isMissingParams && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            This setup link is missing required information. Please use the link from your welcome email.
          </div>
        )}

        {isValidating && !isMissingParams && (
          <p className="text-center text-sm text-muted-foreground">Verifying your link...</p>
        )}

        {isTokenInvalid && !isMissingParams && !isValidating && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            This setup link is invalid or has expired. Please contact your administrator for a new invitation.
          </div>
        )}

        {tokenData !== undefined && !isMissingParams && (
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Welcome, <span className="font-medium text-foreground">{tokenData.name}</span>. Choose a password for your account.
            </p>

            {error !== null && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password <span className="text-destructive" aria-hidden="true">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium">
                Confirm password <span className="text-destructive" aria-hidden="true">*</span>
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Repeat your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? 'Setting up...' : 'Set password & sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
