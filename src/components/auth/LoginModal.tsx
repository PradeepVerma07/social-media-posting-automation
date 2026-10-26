import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { User, RoleName } from '../../../server/src/types';
import { api } from '../../api/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User, token: string) => void;
  onNavigateToRegister?: () => void;
  users?: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onNavigateToRegister,
  users = [],
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login({ email: email.trim(), password: password.trim() });
      if (res && res.user) {
        if (rememberMe) {
          try {
            localStorage.setItem('ci360_auth_user', JSON.stringify(res.user));
            localStorage.setItem('ci360_auth_token', res.accessToken || '');
          } catch {}
        }
        onLoginSuccess(res.user, res.accessToken);
        if (onClose) onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Background */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-br from-[#1336E8] to-[#0A1FA8] text-white">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-sm">
              <img
                src="/assets/webtrionix-logo.webp"
                alt="Webtrionix Technology"
                className="h-8 w-auto object-contain brightness-110"
              />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Webtrionix Technology</h3>
              <p className="text-xs text-white/80">Secure Multi-Platform Publisher &amp; RBAC</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@ci360.agency"
                  required
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <span className="text-[11px] text-slate-400 font-mono">Demo: Admin@123</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full h-10 pl-9 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1336E8] focus:ring-[#1336E8]"
                />
                <span>Remember me on this browser</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isLoading ? 'Verifying Password...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onNavigateToRegister && (
              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  New brand or agency client?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (onClose) onClose();
                      onNavigateToRegister();
                    }}
                    className="font-bold text-[#1336E8] hover:underline cursor-pointer"
                  >
                    Register Brand Account
                  </button>
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hardware AES-256-GCM Vault &amp; Session Guard Protected</span>
        </div>
      </div>
    </div>
  );
};
