"use client";

import AuthCard from '@/components/Auth/AuthCard';

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <AuthCard defaultMode="signup" />
    </div>
  );
}
