import Link from 'next/link';
import { SignInForm } from '@/components/auth/signin-form';

export default function SignInPage() {
  return (
    <div>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Welcome back to NexStudio
        </p>
      </div>
      <div className="mt-8">
        <SignInForm />
      </div>
    </div>
  );
}