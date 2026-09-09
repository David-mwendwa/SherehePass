import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/AuthForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function SignInPage({
  searchParams,
}: PageProps<'/signin'>) {
  const params = await searchParams;

  // Somebody already signed in has no use for this page.
  const next = typeof params.next === 'string' ? params.next : undefined;

  if (await getCurrentUser()) redirect(next ?? '/');

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-heading text-title">Welcome back</h1>
        <p className="mt-2 text-sm text-dark-400">
          Your tickets are waiting where you left them.
        </p>
      </div>

      <AuthForm mode="signin" next={next} />

      <p className="mt-6 text-center text-sm text-dark-400">
        No account yet?{' '}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
          className="font-medium text-primary-300 transition-colors hover:text-primary-200"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
