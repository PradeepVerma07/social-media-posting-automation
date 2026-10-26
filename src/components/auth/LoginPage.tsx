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
  Sparkles
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
      {/* Background Decorative Gradients & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#08070E] to-[#05040A] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Brand, Title & Gateway Pill */}
      <header className="w-full max-w-5xl flex flex-col items-center text-center pt-2 sm:pt-4 z-10 animate-in fade-in duration-300">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="/assets/webtrionix-logo.webp"
            alt="Webtrionix Technology"
            className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-[0_2px_12px_rgba(168,85,247,0.3)]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Webtrionix Technology Hub
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mb-4">
          Social Media Automation, Multi-Channel Publishing &amp; n8n Orchestrator
        </p>

        {/* Security Gateway Pill */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between px-4 py-2 rounded-xl bg-[#10131F]/90 border border-slate-800 text-slate-300 text-xs shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
          {/* Left Column: Automation Workflow Timeline (Matching Uploaded Design) */}
          <div className="lg:col-span-7 space-y-6 animate-in fade-in slide-in-from-left duration-300 relative">
            {/* Main Headline */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.18]">
                Know how your <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-[#F06A6A] via-[#E85D75] to-[#B368E8] bg-clip-text text-transparent">
                  automation workflow works
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2.5 max-w-lg leading-relaxed">
                Seamlessly create, schedule, publish, and track your content across multiple platforms automatically.
              </p>
            </div>

            {/* Vertical Workflow Steps (1 to 5) with Connected Line */}
            <div className="relative pl-1 space-y-5">
              {/* Connected Vertical Line */}
              <div className="absolute left-[18px] top-3 bottom-3 w-[2px] bg-white/10" />

              {/* Step 1: Connect your accounts */}
              <div className="relative flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Connect your accounts</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Link your social media pages to get started.</p>
                  <div className="flex items-center gap-2.5 mt-2 text-slate-300">
                    <span className="p-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">
                      <Instagram className="w-3.5 h-3.5" />
                    </span>
                    <span className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Facebook className="w-3.5 h-3.5" />
                    </span>
                    <span className="p-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                      <Youtube className="w-3.5 h-3.5" />
                    </span>
                    <span className="p-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
                      <Linkedin className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Automate & Schedule */}
              <div className="relative flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Automate &amp; Schedule</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Plan and schedule your posts ahead of time with automation.</p>
                </div>
              </div>

              {/* Step 3: Multi-Channel Publishing */}
              <div className="relative flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Multi-Channel Publishing</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Your content goes live across all connected platforms simultaneously.</p>
                </div>
              </div>

              {/* Step 4: Performance Reports */}
              <div className="relative flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md">
                  4
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Performance Reports</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Track and analyze how your posts are performing in real-time.</p>
                </div>
              </div>

              {/* Step 5: Optimized Content Creation */}
              <div className="relative flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E85D75] to-[#B368E8] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md">
                  5
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Optimized Content Creation</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Create better content like images based on performance insights.</p>
                </div>
              </div>
            </div>

            {/* Subtle decorative sparkle star */}
            <div className="absolute right-4 bottom-2 text-white/20 pointer-events-none">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          {/* Right Column: Clean Login Card with Offset Cyan Accent Border */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {authMode === 'signin' ? 'Sign in' : 'Create an account'}
            </h2>

            {/* Double-Box Card Container with Offset Cyan Border */}
            <div className="relative">
              {/* Cyan Accent Offset Layer */}
              <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl border-2 border-sky-400/50 pointer-events-none" />

              {/* Dark Foreground Card */}
              <div className="relative bg-[#120F1D] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-4">
                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {authMode === 'signin' ? (
                  /* SIGN IN FORM */
                  <form onSubmit={handleSignIn} className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Email</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full h-11 px-3.5 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs sm:text-sm focus:outline-none focus:border-purple-500/80 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full h-11 px-3.5 pr-10 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs sm:text-sm focus:outline-none focus:border-purple-500/80 transition-colors font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            alert(
                              'Please contact your Webtrionix system administrator for password resets.'
                            )
                          }
                          className="text-xs text-[#E85D75] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    {/* Gradient Pill Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 mt-2 rounded-full bg-gradient-to-r from-[#F06A6A] via-[#E85D75] to-[#B368E8] hover:opacity-95 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <span>Sign in</span>
                      )}
                    </button>
                  </form>
                ) : (
                  /* SIGN UP FORM */
                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full h-10 px-3 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-purple-500/80"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">Brand / Company Name</label>
                      <input
                        type="text"
                        required
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. Acme Media Corp"
                        className="w-full h-10 px-3 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-purple-500/80"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">Work Email</label>
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="john@company.com"
                        className="w-full h-10 px-3 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-purple-500/80"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">Password</label>
                      <div className="relative">
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          required
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Create strong password"
                          className="w-full h-10 px-3 pr-9 rounded-lg bg-[#0A0813] border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-purple-500/80 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Gradient Pill Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-10 mt-2 rounded-full bg-gradient-to-r from-[#F06A6A] via-[#E85D75] to-[#B368E8] hover:opacity-95 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <span>Create Account</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Bottom Toggle Link */}
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
                    className="text-[#E85D75] hover:underline font-semibold cursor-pointer"
                  >
                    Create one
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
                    className="text-[#E85D75] hover:underline font-semibold cursor-pointer"
                  >
                    Sign in
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
