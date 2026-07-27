'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    value: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const text = await res.text();
        let data: any = {};
        try { data = JSON.parse(text); } catch {}
        throw new Error(data.error || `Submission failed (Server status ${res.status})`);
      }

      setStatus('success');
      setFormData({ name: '', email: '', phone: '', company: '', value: '' });
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0e1628] via-[#090d16] to-[#05080f]">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
            H
          </span>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            HeroCRM
          </span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all shadow-sm"
        >
          Sign In
        </Link>
      </header>

      {/* Main Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        {/* Left Column: Copy */}
        <div className="space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">
            ⚡ Complete Full Stack Solution
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Convert details into{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              valuable relationships
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl leading-relaxed">
            Welcome to the Demo Lead Platform. Capture new inquiries instantly, track statuses across pipelines, assign accounts to agents, and record audit trails. Designed for modern sales forces.
          </p>
          <div className="border-t border-white/5 pt-6 flex gap-8">
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-slate-500">Security Control</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">2.5s</div>
              <div className="text-xs text-slate-500">Inquiry Routing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Zero</div>
              <div className="text-xs text-slate-500">Leaked Pipelines</div>
            </div>
          </div>
        </div>

        {/* Right Column: Capture Form */}
        <div className="bg-[#111928]/50 border border-white/10 p-8 rounded-2xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">Get in Touch</h2>
            <p className="text-sm text-slate-400">Fill out this quick form and our sales representatives will contact you shortly.</p>
          </div>

          {status === 'success' ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-6 rounded-xl space-y-4 text-center">
              <div className="h-12 w-12 bg-emerald-500/20 text-emerald-300 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">Submission Successful!</h3>
                <p className="text-sm mt-1">Thank you. Your inquiry has been logged in our pipeline. One of our specialists will be assigned to review your case shortly.</p>
              </div>
              <button
                onClick={() => setStatus('idle')}
                className="mt-2 text-xs font-semibold underline text-emerald-400 hover:text-emerald-300 transition-all"
              >
                Submit another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-slate-300">Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="w-full bg-[#1e293b]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-300">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jane@company.com"
                    className="w-full bg-[#1e293b]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold text-slate-300">Phone</label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 012-3456"
                    className="w-full bg-[#1e293b]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="company" className="text-xs font-semibold text-slate-300">Company</label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Acme Corporation"
                    className="w-full bg-[#1e293b]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="value" className="text-xs font-semibold text-slate-300">Estimated Deal Value ($)</label>
                <input
                  type="number"
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  placeholder="25000"
                  className="w-full bg-[#1e293b]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              {status === 'error' && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {status === 'submitting' ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 mt-12 bg-[#05080f]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} HeroCRM Inc. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
          <div className="font-semibold text-slate-400">
            <a
              href="https://digitalheroesco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-all underline decoration-blue-500/30 hover:decoration-blue-500"
            >
              Built for Digital Heroes Training Task
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
