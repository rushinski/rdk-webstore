// app/account/page.tsx

import { requireUser } from '@/services/session-service';
import { AccountProfile } from '@/components/account/AccountProfile';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AccountPage() {
  let session;
  
  try {
    session = await requireUser();
  } catch {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Sign in to view your account</h1>
        <p className="text-gray-400 mb-8">
          Access your profile, shipping info, and order history
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded transition"
          >
            Log In
          </Link>
          <Link
            href="/auth/register"
            className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-8 py-3 rounded transition"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return <AccountProfile userEmail={session.user.email} />;
}