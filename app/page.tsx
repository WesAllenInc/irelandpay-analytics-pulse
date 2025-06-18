import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard page
  redirect('/dashboard');

  // This won't be rendered due to the redirect
  return null;
}