import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/AuthForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;

  // Somebody already signed in has no use for this page.
  if (await getCurrentUser()) redirect(params.next ?? '/');

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-dark-400">
          Your tickets are waiting where you left them.
        </p>
      </div>

      <AuthForm mode="signin" next={params.next} />

      <p className="mt-6 text-center text-sm text-dark-400">
        No account yet?{' '}
        <Link
          href={
            params.next
              ? `/signup?next=${encodeURIComponent(params.next)}`
              : '/signup'
          }
          className="font-medium text-primary-300 transition-colors hover:text-primary-200"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
