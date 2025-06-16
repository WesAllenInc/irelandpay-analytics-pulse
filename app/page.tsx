'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gruvbox-bg flex items-center justify-center p-4">
      {/* Gradient background effect - Gruvbox Dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-gruvbox-green/20 via-transparent to-transparent" />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {/* Logo and branding */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-gruvbox-yellow to-gruvbox-orange rounded-2xl flex items-center justify-center shadow-lg shadow-gruvbox-yellow/20">
              <span className="text-2xl font-bold text-gruvbox-bg">IP</span>
            </div>
            <h1 className="text-4xl font-bold text-gruvbox-fg-1">IrelandPay</h1>
          </div>
          <p className="text-xl text-gruvbox-gray">Make better investments.</p>
        </div>

        {/* Split screen cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Login Card */}
          <div className="bg-gruvbox-bg-1 border border-gruvbox-bg-3 rounded-2xl p-8 hover:border-gruvbox-yellow/30 transition-all duration-300">
            <h2 className="text-2xl font-semibold text-gruvbox-fg-1 mb-6">Welcome back</h2>
            <form className="space-y-6">
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full px-4 py-3 bg-[#141414] border border-[#242424] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-[#141414] border border-[#242424] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors"
                />
              </div>
              <Link href="/dashboard">
                <button className="w-full py-3 bg-gradient-to-r from-gruvbox-yellow to-gruvbox-orange text-gruvbox-bg font-medium rounded-xl hover:shadow-lg hover:shadow-gruvbox-yellow/25 transition-all duration-300">
                  Sign In
                </button>
              </Link>
            </form>
          </div>

          {/* Signup Card */}
          <div className="bg-gruvbox-bg-1 border border-gruvbox-bg-3 rounded-2xl p-8 hover:border-gruvbox-yellow/30 transition-all duration-300">
            <h2 className="text-2xl font-semibold text-gruvbox-fg-1 mb-6">Get started</h2>
            <p className="text-gruvbox-gray mb-6">Start enjoying the benefits, let's set up your account.</p>
            <button className="w-full py-3 bg-gruvbox-bg-1 border border-gruvbox-bg-3 text-gruvbox-fg-1 font-medium rounded-xl hover:bg-gruvbox-bg-2 transition-all duration-300 flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Signup with Google
            </button>
            <div className="text-center mt-4">
              <span className="text-gruvbox-gray text-sm">
                By signing up, you agree to our{' '}
                <a href="#" className="text-gruvbox-yellow hover:underline">Terms of Service</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
