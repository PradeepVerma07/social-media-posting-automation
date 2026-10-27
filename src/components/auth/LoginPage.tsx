import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { User as UserModel } from '../../../server/src/types';
import { api } from '../../api/client';

interface LoginPageProps {
  onLoginSuccess: (user: UserModel, token: string) => void;
  onNavigateToRegister?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up State
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [brandName, setBrandName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Status & Environment State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [gatewayHost, setGatewayHost] = useState<string>('360.webtrionix.com');
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host || '360.webtrionix.com';
      setGatewayHost(host);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login({
        identifier: cleanId,
        email: cleanId,
        password: cleanPass,
      });

      if (res && res.user) {
        try {
          localStorage.setItem('ci360_auth_user', JSON.stringify(res.user));
          localStorage.setItem('ci360_auth_token', res.accessToken || 'token');
          localStorage.removeItem('ci360_is_signed_out');
        } catch {}
        onLoginSuccess(res.user, res.accessToken || 'token');
      } else {
        setErrorMsg('Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !signupEmail.trim() || !brandName.trim() || !signupPassword.trim()) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.signUp({
        fullName: fullName.trim(),
        email: signupEmail.trim(),
        brandName: brandName.trim(),
        password: signupPassword,
        role: 'Client',
        platforms: ['facebook', 'instagram', 'youtube', 'linkedin'],
      });

      if (res && res.user) {
        try {
          localStorage.setItem('ci360_auth_user', JSON.stringify(res.user));
          localStorage.setItem('ci360_auth_token', res.token || 'token');
          localStorage.removeItem('ci360_is_signed_out');
        } catch {}
        setSuccessMsg('Account created successfully! Entering dashboard...');
        setTimeout(() => {
          onLoginSuccess(res.user, res.token || 'token');
        }, 600);
      } else {
        setErrorMsg(res.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-between bg-[#08070E] text-white p-4 sm:p-6 lg:p-10 relative overflow-x-hidden font-sans select-none">
      {/* Background Decorative Gradients & Tech Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#08070E] to-[#05040A] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse duration-1000" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-700" />

      {/* Top Header: Brand, Title & Gateway Pill with Hover Glow */}
      <header className="w-full max-w-5xl flex flex-col items-center text-center pt-2 sm:pt-4 z-10 animate-in fade-in duration-300">
        <div className="flex items-center justify-center gap-3 mb-2 group cursor-pointer transition-transform duration-300 hover:scale-[1.02]">
          <img
            src="/assets/webtrionix-logo.webp"
            alt="Webtrionix Technology"
            className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-[0_2px_12px_rgba(168,85,247,0.3)] transition-transform duration-300 group-hover:rotate-2 group-hover:drop-shadow-[0_4px_16px_rgba(232,93,117,0.5)]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white transition-colors duration-200 group-hover:text-pink-100">
            Webtrionix Technology Hub
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mb-4">
          Social Media Automation, Multi-Channel Publishing &amp; n8n Orchestrator
        </p>

        {/* Security Gateway Pill with hover effect */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between px-4 py-2 rounded-xl bg-[#10131F]/90 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs shadow-md hover:shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-[#131726]">
          <div className="flex items-center gap-2 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>Gateway: {gatewayHost}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>AES-256 Vault Active</span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Showcase & Login Section */}
      <main className="w-full max-w-5xl my-auto py-8 sm:py-12 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Brand Schedule Workflow Timeline (Updated per Image) */}
          <div className="lg:col-span-7 space-y-6 animate-in fade-in slide-in-from-left duration-300 relative">
            {/* Main Headline */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.18]">
                Know how your{' '}
                <span className="bg-gradient-to-r from-[#F06A6A] via-[#E85D75] to-[#B368E8] bg-clip-text text-transparent">
                  brand&apos;s schedule workflow works
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2.5 max-w-lg leading-relaxed">
                Plan, automate, publish, and track your scheduled posts across all your brand social media platforms.
              </p>
            </div>

            {/* Vertical Workflow Steps (1 to 5) with Animated Connecting Line & Hover Highlights */}
            <div className="relative pl-1 space-y-3 sm:space-y-4">
              {/* Connected Vertical Line with Subtle Animated Beam */}
              <div className="absolute left-[20px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-rose-500/40 via-purple-500/30 to-white/10" />

              {/* Step 1: Connect brand accounts */}
              <div
                onMouseEnter={() => setHoveredStep(1)}
                onMouseLeave={() => setHoveredStep(null)}
                className="group/step relative flex items-start gap-3.5 p-2.5 -ml-2.5 rounded-2xl transition-all duration-300 hover:bg-white/[0.04] hover:translate-x-1 cursor-default"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md transition-all duration-300 group-hover/step:scale-110 group-hover/step:shadow-[0_0_18px_rgba(232,93,117,0.7)] group-hover/step:ring-2 group-hover/step:ring-pink-400/50">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white transition-colors duration-200 group-hover/step:text-pink-200">
                    Connect brand accounts
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 transition-colors duration-200 group-hover/step:text-slate-300">
                    Link all your brand&apos;s social pages to the scheduling dashboard.
                  </p>
                  {/* Social Channel Icons with rich hover animation */}
                  <div className="flex items-center gap-2.5 mt-2.5 text-slate-300">
                    <span
                      title="Instagram"
                      className="p-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 transition-all duration-200 hover:scale-125 hover:-translate-y-0.5 hover:bg-pink-500/25 hover:shadow-[0_0_12px_rgba(244,63,94,0.4)] cursor-pointer"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                    </span>
                    <span
                      title="Facebook"
                      className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 transition-all duration-200 hover:scale-125 hover:-translate-y-0.5 hover:bg-blue-500/25 hover:shadow-[0_0_12px_rgba(59,130,246,0.4)] cursor-pointer"
                    >
                      <Facebook className="w-3.5 h-3.5" />
                    </span>
                    <span
                      title="YouTube"
                      className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 transition-all duration-200 hover:scale-125 hover:-translate-y-0.5 hover:bg-rose-500/25 hover:shadow-[0_0_12px_rgba(244,63,94,0.4)] cursor-pointer"
                    >
                      <Youtube className="w-3.5 h-3.5" />
                    </span>
                    <span
                      title="LinkedIn"
                      className="p-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 transition-all duration-200 hover:scale-125 hover:-translate-y-0.5 hover:bg-sky-500/25 hover:shadow-[0_0_12px_rgba(14,165,233,0.4)] cursor-pointer"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Schedule posts in advance */}
              <div
                onMouseEnter={() => setHoveredStep(2)}
                onMouseLeave={() => setHoveredStep(null)}
                className="group/step relative flex items-start gap-3.5 p-2.5 -ml-2.5 rounded-2xl transition-all duration-300 hover:bg-white/[0.04] hover:translate-x-1 cursor-default"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md transition-all duration-300 group-hover/step:scale-110 group-hover/step:shadow-[0_0_18px_rgba(232,93,117,0.7)] group-hover/step:ring-2 group-hover/step:ring-pink-400/50">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white transition-colors duration-200 group-hover/step:text-pink-200">
                    Schedule posts in advance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 transition-colors duration-200 group-hover/step:text-slate-300">
                    Select dates, set times, and queue your posts on the content calendar.
                  </p>
                </div>
              </div>

              {/* Step 3: Automated Publishing */}
              <div
                onMouseEnter={() => setHoveredStep(3)}
                onMouseLeave={() => setHoveredStep(null)}
                className="group/step relative flex items-start gap-3.5 p-2.5 -ml-2.5 rounded-2xl transition-all duration-300 hover:bg-white/[0.04] hover:translate-x-1 cursor-default"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md transition-all duration-300 group-hover/step:scale-110 group-hover/step:shadow-[0_0_18px_rgba(232,93,117,0.7)] group-hover/step:ring-2 group-hover/step:ring-pink-400/50">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white transition-colors duration-200 group-hover/step:text-pink-200">
                    Automated Publishing
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 transition-colors duration-200 group-hover/step:text-slate-300">
                    Your scheduled posts go live automatically across connected platforms.
                  </p>
                </div>
              </div>

              {/* Step 4: Tracking & Performance Reports */}
              <div
                onMouseEnter={() => setHoveredStep(4)}
                onMouseLeave={() => setHoveredStep(null)}
                className="group/step relative flex items-start gap-3.5 p-2.5 -ml-2.5 rounded-2xl transition-all duration-300 hover:bg-white/[0.04] hover:translate-x-1 cursor-default"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md transition-all duration-300 group-hover/step:scale-110 group-hover/step:shadow-[0_0_18px_rgba(232,93,117,0.7)] group-hover/step:ring-2 group-hover/step:ring-pink-400/50">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white transition-colors duration-200 group-hover/step:text-pink-200">
                    Tracking &amp; Performance Reports
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 transition-colors duration-200 group-hover/step:text-slate-300">
                    Review automated reports to see how your scheduled posts are performing.
                  </p>
                </div>
              </div>

              {/* Step 5: Optimized Content & Insights */}
              <div
                onMouseEnter={() => setHoveredStep(5)}
                onMouseLeave={() => setHoveredStep(null)}
                className="group/step relative flex items-start gap-3.5 p-2.5 -ml-2.5 rounded-2xl transition-all duration-300 hover:bg-white/[0.04] hover:translate-x-1 cursor-default"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md transition-all duration-300 group-hover/step:scale-110 group-hover/step:shadow-[0_0_18px_rgba(232,93,117,0.7)] group-hover/step:ring-2 group-hover/step:ring-pink-400/50">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white transition-colors duration-200 group-hover/step:text-pink-200">
                    Optimized Content &amp; Insights
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 transition-colors duration-200 group-hover/step:text-slate-300">
                    Use insights to create higher quality images and content for future posts.
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle decorative sparkle star with gentle floating animation */}
            <div className="absolute right-4 bottom-1 text-white/25 pointer-events-none transition-transform duration-500 hover:rotate-12 hover:scale-125">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          {/* Right Column: Interactive Login Card with Reactive Offset Neon Frame */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-between">
              <span>{authMode === 'signin' ? 'Sign in' : 'Create an account'}</span>
              <span className="text-[11px] font-normal text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                {authMode === 'signin' ? 'Vault Protected' : 'Brand Registration'}
              </span>
            </h2>

            {/* Double-Box Card Container with Reactive Cyan Glow on Hover */}
            <div className="relative group/card transition-all duration-300 hover:-translate-y-1">
              {/* Cyan Accent Offset Layer - Receptive to Card Hover */}
              <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl border-2 border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.25)] group-hover/card:translate-x-3.5 group-hover/card:translate-y-3.5 group-hover/card:border-sky-300 group-hover/card:shadow-[0_0_30px_rgba(56,189,248,0.5)] transition-all duration-300 pointer-events-none" />

              {/* Dark Foreground Card */}
              <div className="relative bg-[#120F1D] border border-white/10 hover:border-white/20 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-4 transition-all duration-300 backdrop-blur-xl">
                {/* Error Banner with Slide-in animation */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {authMode === 'signin' ? (
                  /* SIGN IN FORM with Enhanced Hover & Focus States */
                  <form onSubmit={handleSignIn} className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-1.5 group/field">
                      <label className="block text-xs font-medium text-slate-300 transition-colors duration-200 group-focus-within/field:text-pink-300">
                        Email
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full h-11 px-3.5 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs sm:text-sm transition-all duration-200 hover:border-white/25 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25 focus:bg-[#0E0B1A] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5 group/field">
                      <label className="block text-xs font-medium text-slate-300 transition-colors duration-200 group-focus-within/field:text-pink-300">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full h-11 px-3.5 pr-10 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs sm:text-sm font-mono transition-all duration-200 hover:border-white/25 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25 focus:bg-[#0E0B1A] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 hover:scale-110 transition-all cursor-pointer"
                          tabIndex={-1}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            alert(
                              'Please contact your Webtrionix system administrator or check Hostinger Environment Variables for credentials.'
                            )
                          }
                          className="text-xs text-[#E85D75] hover:text-[#F06A6A] hover:underline transition-colors cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    {/* Gradient Pill Submit Button with Shimmer Sweep & Hover Lift */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group/btn relative overflow-hidden w-full h-11 mt-2 rounded-full bg-gradient-to-r from-[#F06A6A] via-[#E85D75] to-[#B368E8] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-pink-500/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_25px_rgba(232,93,117,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {/* Animated Shimmer Light Sweep on Hover */}
                      <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform ease-out pointer-events-none" />

                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>Sign in</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                        </div>
                      )}
                    </button>
                  </form>
                ) : (
                  /* SIGN UP FORM with Enhanced Inputs & Shimmer Button */
                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div className="space-y-1 group/field">
                      <label className="block text-xs font-medium text-slate-300 transition-colors group-focus-within/field:text-pink-300">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full h-10 px-3 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs transition-all duration-200 hover:border-white/25 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25 focus:bg-[#0E0B1A] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 group/field">
                      <label className="block text-xs font-medium text-slate-300 transition-colors group-focus-within/field:text-pink-300">
                        Brand / Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. Acme Media Corp"
                        className="w-full h-10 px-3 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs transition-all duration-200 hover:border-white/25 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25 focus:bg-[#0E0B1A] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 group/field">
                      <label className="block text-xs font-medium text-slate-300 transition-colors group-focus-within/field:text-pink-300">
                        Work Email
                      </label>
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="john@company.com"
                        className="w-full h-10 px-3 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs transition-all duration-200 hover:border-white/25 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25 focus:bg-[#0E0B1A] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 group/field">
                      <label className="block text-xs font-medium text-slate-300 transition-colors group-focus-within/field:text-pink-300">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          required
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Create strong password"
                          className="w-full h-10 px-3 pr-9 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs font-mono transition-all duration-200 hover:border-white/25 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25 focus:bg-[#0E0B1A] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 hover:scale-110 transition-all cursor-pointer"
                          tabIndex={-1}
                          title={showSignupPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Gradient Pill Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group/btn relative overflow-hidden w-full h-10 mt-2 rounded-full bg-gradient-to-r from-[#F06A6A] via-[#E85D75] to-[#B368E8] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-pink-500/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_25px_rgba(232,93,117,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform ease-out pointer-events-none" />

                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                        </div>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Bottom Toggle Link with hover slide & color highlight */}
            <div className="text-xs text-center text-slate-400 pt-1">
              {authMode === 'signin' ? (
                <span>
                  No account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthMode('signup');
                    }}
                    className="text-[#E85D75] hover:text-[#F06A6A] hover:underline font-semibold transition-all duration-200 cursor-pointer inline-flex items-center gap-1 hover:translate-x-0.5"
                  >
                    <span>Create one</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthMode('signin');
                    }}
                    className="text-[#E85D75] hover:text-[#F06A6A] hover:underline font-semibold transition-all duration-200 cursor-pointer inline-flex items-center gap-1 hover:translate-x-0.5"
                  >
                    <span>Sign in</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info: Encryption & Copyright */}
      <footer className="w-full max-w-5xl text-center pb-2 sm:pb-4 space-y-1 text-slate-500 text-xs z-10 animate-in fade-in duration-300">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>Encrypted with AES-256-GCM &bull; Hardware Vault Protected</span>
        </div>
        <p className="text-[11px] text-slate-500">
          &copy; {new Date().getFullYear()} CI360 Studio. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
