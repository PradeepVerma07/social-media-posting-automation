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
  Globe,
  KeyRound,
  ArrowRight,
  Loader2,
  Terminal,
  Server,
  User,
  Building2,
  Sparkles,
  Check,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  MessageSquare
} from 'lucide-react';
import { User as UserModel, RoleName } from '../../../server/src/types';
import { api } from '../../api/client';

interface LoginPageProps {
  onLoginSuccess: (user: UserModel, token: string) => void;
  onNavigateToRegister?: () => void;
}

const PLATFORM_CHOICES = [
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-sky-500' },
  { id: 'x', label: 'X (Twitter)', icon: Twitter, color: 'text-slate-300' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-rose-500' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-500' },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up State
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [brandName, setBrandName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupRole, setSignupRole] = useState<'Client' | 'Admin'>('Client');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'facebook',
    'instagram',
    'linkedin',
    'x',
  ]);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status & Environment State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [clientIp, setClientIp] = useState<string>('127.0.0.1');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname || '127.0.0.1';
      const port = window.location.port ? `:${window.location.port}` : '';
      setClientIp(`${hostname}${port}`);
    }
  }, []);

  // Password strength score
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 4);
  };

  const strengthScore = getPasswordStrength(signupPassword);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Handle Sign In Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Please enter both your Email / Username and password.');
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
        if (rememberMe) {
          try {
            localStorage.setItem('ci360_auth_user', JSON.stringify(res.user));
            localStorage.setItem('ci360_auth_token', res.accessToken || 'token');
            localStorage.removeItem('ci360_is_signed_out');
          } catch {}
        }
        onLoginSuccess(res.user, res.accessToken || 'token');
      } else {
        setErrorMsg('Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Invalid ID/IP or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMsg('A valid email address is required.');
      return;
    }
    if (!brandName.trim()) {
      setErrorMsg('Brand / Organization name is required.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password confirmation.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Please agree to the Terms of Service to create an account.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.signUp({
        fullName: fullName.trim(),
        email: signupEmail.trim(),
        password: signupPassword.trim(),
        brandName: brandName.trim(),
        companyName: brandName.trim(),
        role: signupRole,
        platforms: selectedPlatforms,
      });

      if (res && res.success && res.user) {
        setSuccessMsg('Account created successfully! Entering workspace...');
        try {
          localStorage.setItem('ci360_auth_user', JSON.stringify(res.user));
          localStorage.setItem('ci360_auth_token', res.accessToken || 'token');
          localStorage.removeItem('ci360_is_signed_out');
        } catch {}

        setTimeout(() => {
          onLoginSuccess(res.user, res.accessToken || 'token');
        }, 600);
      } else {
        setErrorMsg(res.message || 'Failed to register account.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#070B14] text-white p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Tech Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#070B14] to-[#04060A] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Container */}
      <div className="w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-200 my-6">
        {/* Brand Logo & Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl mb-1 hover:scale-105 transition-transform">
            <img
              src="/assets/webtrionix-logo.webp"
              alt="Webtrionix Technology"
              className="h-9 sm:h-11 w-auto object-contain brightness-110"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Webtrionix Technology Hub
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Social Media Automation, Multi-Channel Publishing &amp; n8n Orchestrator
          </p>
        </div>

        {/* Security Gateway Status Bar */}
        <div className="mb-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-[11px] shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-slate-300">Gateway: {clientIp}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>AES-256 Vault Active</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Dual Mode Switcher Tabs */}
          <div className="p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60 grid grid-cols-2 gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'signin'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'signup'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 1: SIGN IN FORM                                          */}
          {/* ============================================================== */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Email / Account Identifier
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="name@company.com or admin"
                    required
                    className="w-full h-10 pl-9 pr-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full h-10 pl-9 pr-10 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo Credentials Quick-Fill Card */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Admin Account</span>
                  <span className="text-slate-200 font-mono text-[11px] block">pradeepofficial8795@gmail.com</span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    Pass: <code className="text-blue-300">Admin@123</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('pradeepofficial8795@gmail.com');
                    setPassword('Admin@123');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-semibold text-[11px] transition-colors cursor-pointer border border-blue-500/30"
                >
                  Auto-fill
                </button>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">Keep me signed in</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Protected</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Switch to Signup */}
              <div className="pt-2 text-center border-t border-slate-800">
                <p className="text-xs text-slate-400">
                  New brand or partner?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Create your account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* MODE 2: SIGN UP / REGISTRATION FORM                           */}
          {/* ============================================================== */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full h-9 pl-8 pr-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Work Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="john@company.com"
                      required
                      className="w-full h-9 pl-8 pr-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Brand / Organization Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder="e.g. Acme Media, Aura Digital"
                    required
                    className="w-full h-9 pl-8 pr-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password (Min 6 chars) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full h-9 pl-8 pr-8 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className={`w-full h-9 pl-8 pr-3 bg-slate-800/60 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                        confirmPassword && confirmPassword !== signupPassword
                          ? 'border-rose-500 focus:border-rose-500'
                          : 'border-slate-700 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Password Strength Meter */}
              {signupPassword && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Password Strength:</span>
                    <span className="font-semibold text-slate-300">{strengthLabels[strengthScore - 1] || 'Weak'}</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-full flex-1 rounded-full transition-all ${
                          strengthScore >= level ? strengthColors[strengthScore - 1] : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Workspace Access Role
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSignupRole('Client')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      signupRole === 'Client'
                        ? 'border-blue-500 bg-blue-500/15 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-[11px] text-white">Client / Brand Owner</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">Approve posts &amp; view analytics</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupRole('Admin')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      signupRole === 'Admin'
                        ? 'border-blue-500 bg-blue-500/15 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-[11px] text-white">Brand Administrator</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">Manage posts, workflows &amp; accounts</div>
                  </button>
                </div>
              </div>

              {/* Social Channels to Enable */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Channels to Activate</span>
                  <span className="text-[10px] font-mono text-blue-400">{selectedPlatforms.length} selected</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PLATFORM_CHOICES.map(plat => {
                    const Icon = plat.icon;
                    const isSelected = selectedPlatforms.includes(plat.id);
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => togglePlatform(plat.id)}
                        className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/60 text-white'
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${plat.color}`} />
                        <span className="text-[11px] font-semibold truncate">{plat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Terms Agreement */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 leading-snug">
                  I agree to the Terms of Service &amp; Privacy Policy for this brand account.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning Brand Account...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Brand Account &amp; Enter</span>
                  </>
                )}
              </button>

              {/* Switch to Sign In */}
              <div className="pt-2 text-center border-t border-slate-800">
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-5 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Encrypted with AES-256-GCM &bull; Hardware Vault Protected</span>
          </div>
          <p className="text-[10px] text-slate-600">
            &copy; {new Date().getFullYear()} Webtrionix Technology. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
