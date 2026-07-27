'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!res.ok) {
          throw new Error(`Server error (${res.status}): Please check that the backend is running`);
        }
      }

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Successful login
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleFillCredentials = (role: 'admin' | 'member') => {
    if (role === 'admin') {
      setEmail('admin@leadplatform.com');
      setPassword('admin123');
    } else {
      setEmail('member@leadplatform.com');
      setPassword('member123');
    }
  };

  return (
    <div className="flex flex-col min-h-screen justify-between bg-gradient-to-b from-[#0e1628] via-[#090d16] to-[#05080f]">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20 text-white">
            H
          </span>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            HeroCRM
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-[#111928]/50 border border-white/10 p-8 rounded-2xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h1>
            <p className="text-sm text-slate-400">Sign in to your sales team account to manage leads.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-slate-300">Email Address</label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@company.com"
                className="w-full bg-[#1e293b]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-slate-300">Password</label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1e293b]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Login Box */}
          <div className="border-t border-white/5 pt-6 space-y-3">
            <div className="text-xs text-center font-medium text-slate-500">QUICK LOGIN PRESETS FOR TESTING</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleFillCredentials('admin')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 transition-all text-left"
              >
                <div className="font-bold text-white mb-0.5">Admin Account</div>
                <div>Ravikant Prajapati</div>
                <div className="text-[10px] text-slate-400 mt-1">admin@leadplatform.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleFillCredentials('member')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 transition-all text-left"
              >
                <div className="font-bold text-white mb-0.5">Member Account</div>
                <div>Surya Prajapati</div>
                <div className="text-[10px] text-slate-400 mt-1">member@leadplatform.com</div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-600 bg-[#05080f] w-full">
        Built for Digital Heroes Training Task
      </footer>
    </div>
  );
}
