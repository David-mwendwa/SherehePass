import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/AuthForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Create an account' };

export default async function SignUpPage({
  searchParams,
}: PageProps<'/signup'>) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;

  if (await getCurrentUser()) redirect(next ?? '/');

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-heading text-title">Create an account</h1>
        <p className="mt-2 text-sm text-dark-400">
          Takes a moment. You need one to hold a ticket.
        </p>
      </div>

      <AuthForm mode="signup" next={next} />

      <p className="mt-6 text-center text-sm text-dark-400">
        Already have an account?{' '}
        <Link
          href={next ? `/signin?next=${encodeURIComponent(next)}` : '/signin'}
          className="font-medium text-primary-300 transition-colors hover:text-primary-200"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
