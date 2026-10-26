import React, { useState } from 'react';
import {
  Building2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Globe,
  Mail,
  Lock,
  User,
  Phone,
  Palette,
  Share2,
  ShieldCheck,
  ExternalLink,
  Upload,
  AlertCircle,
  Clock,
  MapPin,
  Check,
  Eye,
  EyeOff,
  Briefcase,
  Layers,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  MessageSquare
} from 'lucide-react';
import { Brand, RoleName, User as UserModel } from '../../../server/src/types';
import { api } from '../../api/client';

interface BrandRegistrationPageProps {
  onRegistrationSuccess?: (newUser: UserModel, newBrand: Brand, token: string) => void;
  onGoHome: () => void;
  onGoToLogin?: () => void;
}

const INDUSTRY_OPTIONS = [
  'E-Commerce & Retail',
  'SaaS & Software',
  'Marketing & Agency',
  'Fashion & Apparel',
  'Health & Wellness',
  'Food & Beverage',
  'Real Estate & Finance',
  'Media & Entertainment',
  'Education & EdTech',
  'Other / Enterprise',
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST · UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT · UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT · UTC-08:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST · UTC+01:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST · UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT · UTC+08:00)' },
];

const PRESET_COLORS = [
  { name: 'Electric Blue', hex: '#1336E8' },
  { name: 'Cyan Neon', hex: '#08C5E1' },
  { name: 'Deep Purple', hex: '#7C3AED' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Charcoal', hex: '#1E293B' },
];

const PLATFORM_OPTIONS = [
  { id: 'facebook', label: 'Facebook Page', icon: Facebook, color: 'text-[#1877F2]' },
  { id: 'instagram', label: 'Instagram Business', icon: Instagram, color: 'text-[#E4405F]' },
  { id: 'linkedin', label: 'LinkedIn Company', icon: Linkedin, color: 'text-[#0A66C2]' },
  { id: 'x', label: 'X (Twitter)', icon: Twitter, color: 'text-slate-900' },
  { id: 'youtube', label: 'YouTube Channel', icon: Youtube, color: 'text-[#FF0000]' },
  { id: 'whatsapp', label: 'WhatsApp Cloud', icon: MessageSquare, color: 'text-[#25D366]' },
];

export const BrandRegistrationPage: React.FC<BrandRegistrationPageProps> = ({
  onRegistrationSuccess,
  onGoHome,
  onGoToLogin,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [brandName, setBrandName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [industry, setIndustry] = useState(INDUSTRY_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('IN');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Visual Identity State
  const [primaryColor, setPrimaryColor] = useState('#1336E8');
  const [secondaryColor, setSecondaryColor] = useState('#08C5E1');
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'facebook',
    'instagram',
    'linkedin',
    'x',
  ]);

  // Admin Account State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Client' | 'Admin'>('Client');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredData, setRegisteredData] = useState<{
    user: UserModel;
    brand: Brand;
    token: string;
  } | null>(null);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleNextStep = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!brandName.trim()) {
        setErrorMessage('Please enter your Brand Name before proceeding.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedPlatforms.length === 0) {
        setErrorMessage('Please select at least one social media channel to enable.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Logo image should be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!brandName.trim()) {
      setErrorMessage('Brand name is required.');
      setCurrentStep(1);
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      setErrorMessage('Administrator name and email are required.');
      setCurrentStep(3);
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must contain at least 6 characters.');
      setCurrentStep(3);
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service to register your brand.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.registerBrand({
        brandName: brandName.trim(),
        companyName: (companyName.trim() || brandName.trim()),
        websiteUrl: websiteUrl.trim(),
        industry,
        description: description.trim(),
        country,
        timezone,
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl || undefined,
        platforms: selectedPlatforms,
        fullName: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim() || undefined,
        role,
      });

      if (res && res.success) {
        setRegisteredData({
          user: res.user,
          brand: res.brand,
          token: res.accessToken,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check details and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Celebratory Success State
  if (registeredData) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-10 space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
              Registration Complete
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome, {registeredData.brand.name}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Your brand workspace, tenant organization, and administrative user account have been provisioned successfully.
            </p>
          </div>

          {/* Provisioning Summary Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Brand ID:</span>
              <span className="font-bold text-[#1336E8]">{(registeredData.brand as any).brandId || `BR-${registeredData.brand.id}`}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Admin User:</span>
              <span className="font-semibold text-slate-800">{registeredData.user.email}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Role Assigned:</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {registeredData.user.role}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-sans">Active Channels:</span>
              <span className="font-semibold text-emerald-600">
                {registeredData.brand.connectedAccountsCount || selectedPlatforms.length} Channels Initialized
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                if (onRegistrationSuccess) {
                  onRegistrationSuccess(registeredData.user, registeredData.brand, registeredData.token);
                } else {
                  onGoHome();
                }
              }}
              className="w-full h-12 rounded-2xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#1336E8]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Enter {registeredData.brand.name} Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onGoHome}
              className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Overview Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="h-16 px-4 sm:px-8 bg-white border-b border-[#EAECF0] flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
          <div className="w-9 h-9 rounded-xl bg-[#1336E8] flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-md shadow-[#1336E8]/20">
            CI
          </div>
          <div>
            <span className="text-sm font-bold text-[#101828] block tracking-tight">
              CI360 HUB
            </span>
            <span className="text-[10px] font-mono text-[#08C5E1] font-semibold block uppercase">
              Brand Onboarding Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onGoToLogin && (
            <button
              onClick={onGoToLogin}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Sign In Instead
            </button>
          )}
          <button
            onClick={onGoHome}
            className="px-3.5 py-1.5 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Steps (7 Columns) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
            {/* Step Wizard Header */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-[#1336E8] uppercase tracking-wider">
                  Step {currentStep} of 3
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {currentStep === 1 ? 'Brand Profile' : currentStep === 2 ? 'Visuals & Channels' : 'Admin Account'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-6 flex">
                <div
                  className="h-full bg-[#1336E8] transition-all duration-300"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {currentStep === 1 && 'Register Your Brand Profile'}
                {currentStep === 2 && 'Visual Branding & Channels'}
                {currentStep === 3 && 'Primary Administrator Account'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentStep === 1 && 'Define your brand name, legal entity, operating vertical, and default timezone.'}
                {currentStep === 2 && 'Select your brand accent colors and the social channels you will orchestrate.'}
                {currentStep === 3 && 'Create your administrator credentials to securely log in and manage your campaigns.'}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* STEP 1: BRAND PROFILE */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Brand Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={brandName}
                        onChange={e => setBrandName(e.target.value)}
                        placeholder="e.g. Apex Sports, Solaria Skin, CloudMatrix"
                        required
                        className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Company / Entity Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="Defaults to Brand Name"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Brand Website / Domain
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="url"
                          value={websiteUrl}
                          onChange={e => setWebsiteUrl(e.target.value)}
                          placeholder="https://yourbrand.com"
                          className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Industry / Vertical
                    </label>
                    <select
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors cursor-pointer"
                    >
                      {INDUSTRY_OPTIONS.map(ind => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Default Timezone
                      </label>
                      <select
                        value={timezone}
                        onChange={e => setTimezone(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors cursor-pointer font-mono"
                      >
                        {TIMEZONE_OPTIONS.map(tz => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Country
                      </label>
                      <select
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors cursor-pointer"
                      >
                        <option value="IN">India (IN)</option>
                        <option value="US">United States (US)</option>
                        <option value="GB">United Kingdom (GB)</option>
                        <option value="AE">United Arab Emirates (AE)</option>
                        <option value="SG">Singapore (SG)</option>
                        <option value="CA">Canada (CA)</option>
                        <option value="AU">Australia (AU)</option>
                        <option value="DE">Germany (DE)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Brand Description / Bio
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Brief summary of your brand, voice, target audience, and content philosophy..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors resize-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: VISUAL BRANDING & CHANNELS */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Brand Color Selection */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Primary &amp; Secondary Brand Colors
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Primary Color */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">Primary Color</span>
                          <span className="text-xs font-mono font-bold">{primaryColor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={e => setPrimaryColor(e.target.value)}
                            className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                          />
                          <div className="flex-1 flex gap-1.5 flex-wrap">
                            {PRESET_COLORS.slice(0, 5).map(c => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => setPrimaryColor(c.hex)}
                                className="w-6 h-6 rounded-lg transition-transform hover:scale-110 shadow-xs"
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Secondary Color */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">Secondary Color</span>
                          <span className="text-xs font-mono font-bold">{secondaryColor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={secondaryColor}
                            onChange={e => setSecondaryColor(e.target.value)}
                            className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                          />
                          <div className="flex-1 flex gap-1.5 flex-wrap">
                            {PRESET_COLORS.slice(2).map(c => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => setSecondaryColor(c.hex)}
                                className="w-6 h-6 rounded-lg transition-transform hover:scale-110 shadow-xs"
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Brand Logo Upload or URL */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Brand Logo or Avatar
                    </label>
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Brand Logo"
                          className="w-14 h-14 rounded-2xl object-cover border-2 shadow-sm"
                          style={{ borderColor: primaryColor }}
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {(brandName || 'B').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                            <Upload className="w-3.5 h-3.5 text-[#1336E8]" />
                            <span>Upload Logo Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={() => setLogoUrl('')}
                              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          placeholder="Or paste external image URL (https://...)"
                          className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-none focus:border-[#1336E8] focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Connected Social Platforms */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Target Social Platforms to Enable <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-mono text-[#1336E8]">
                        {selectedPlatforms.length} Selected
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PLATFORM_OPTIONS.map(plat => {
                        const Icon = plat.icon;
                        const isSelected = selectedPlatforms.includes(plat.id);
                        return (
                          <button
                            key={plat.id}
                            type="button"
                            onClick={() => togglePlatform(plat.id)}
                            className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFF8FF] border-[#1336E8] shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-white shadow-xs' : 'bg-white/80'
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${plat.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`text-xs font-bold block truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                                {plat.label}
                              </span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                isSelected ? 'bg-[#1336E8] text-white' : 'border border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: ADMINISTRATOR ACCOUNT */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Primary Administrator Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="e.g. Sarah Connor"
                        required
                        className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Work Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="admin@yourbrand.com"
                        required
                        className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Account Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          className="w-full h-10 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Phone / WhatsApp (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role Type Selection */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700">
                      User Portal Scope
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setRole('Client')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          role === 'Client'
                            ? 'bg-[#EFF8FF] border-[#1336E8] shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">Client / Brand Owner</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            role === 'Client' ? 'bg-[#1336E8] border-[#1336E8]' : 'border-slate-300'
                          }`}>
                            {role === 'Client' && <Check className="w-2 h-2 text-white" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Tailored workspace focused on reviewing, approving content drafts, and viewing brand engagement.
                        </p>
                      </div>

                      <div
                        onClick={() => setRole('Admin')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          role === 'Admin'
                            ? 'bg-[#EFF8FF] border-[#1336E8] shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">Brand Administrator</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            role === 'Admin' ? 'bg-[#1336E8] border-[#1336E8]' : 'border-slate-300'
                          }`}>
                            {role === 'Admin' && <Check className="w-2 h-2 text-white" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Full operational controls over post creation, scheduling, social accounts, and team collaboration.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={e => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#1336E8] focus:ring-[#1336E8]"
                    />
                    <span className="text-xs text-slate-600 leading-snug">
                      I authorize CI360 to provision this brand organization and agree to the platform Terms of Service and Privacy Policy.
                    </span>
                  </label>
                </div>
              )}

              {/* Step Navigation Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="h-11 px-5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGoHome}
                    className="h-11 px-5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="h-11 px-6 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 px-7 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-bold transition-all shadow-md shadow-[#1336E8]/25 flex items-center gap-2 cursor-pointer ml-auto disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span>Provisioning Brand...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Complete Registration</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Column: Live Interactive Brand Preview Card (5 Columns) */}
          <div className="lg:col-span-5 space-y-5 sticky top-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Brand Mockup &amp; Card
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Real-time Preview
              </span>
            </div>

            {/* Brand Card Mockup */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Dynamic Gradient Top Banner */}
              <div
                className="h-28 p-4 flex items-end justify-between transition-colors duration-300"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                }}
              >
                <span className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                  {country} · {timezone.split('/')[1] || timezone}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold">
                  {industry}
                </span>
              </div>

              {/* Brand Card Content */}
              <div className="p-6 space-y-4 -mt-10">
                {/* Logo & Heading */}
                <div className="flex items-end justify-between">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Brand Avatar"
                      className="w-18 h-18 rounded-2xl object-cover bg-white p-1 border-2 shadow-md"
                      style={{ borderColor: primaryColor }}
                    />
                  ) : (
                    <div
                      className="w-18 h-18 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md border-2 border-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {(brandName || 'Brand').substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">Workspace Tenant:</span>
                    <span className="text-xs font-bold text-slate-800">
                      {(brandName || 'Your Brand').toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {brandName || 'Your Brand Name'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {description || 'Your content orchestrator and multi-brand distribution engine.'}
                  </p>
                </div>

                {/* Enabled Platforms Badges */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Connected Social Channels ({selectedPlatforms.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlatforms.map(p => {
                      const plat = PLATFORM_OPTIONS.find(opt => opt.id === p);
                      if (!plat) return null;
                      const Icon = plat.icon;
                      return (
                        <div
                          key={p}
                          className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 shadow-2xs"
                        >
                          <Icon className={`w-3.5 h-3.5 ${plat.color}`} />
                          <span className="capitalize">{p}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Administrator Profile Pill */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {(fullName || 'Admin').substring(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">{fullName || 'Administrator Name'}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">{email || 'admin@yourbrand.com'}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    {role}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 text-slate-500 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Enterprise Isolation &amp; Security</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Brand workspaces are strictly tenant-isolated. Sensitive OAuth credentials, access tokens, and webhooks are encrypted with hardware-grade AES-256-GCM.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#EAECF0] bg-white flex items-center justify-between px-4 sm:px-8 text-[11px] text-slate-400">
        <span>CI360 Multi-Platform Social Studio · n8n Orchestrator</span>
        <div className="flex items-center gap-4">
          <span>Version 2.4.0</span>
          <span>SQLite WAL</span>
        </div>
      </footer>
    </div>
  );
};
