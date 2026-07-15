"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';

type LoginPageClientProps = {
  logoUrl: string;
  darkLogoUrl?: string;
  logoAlt: string;
  loginBgUrl?: string | null;
  portalTitle?: string;
  welcomeText?: string | null;
  secondaryColor?: string | null;
};

const FALLBACK_COLOR = '#4f46e5';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export function LoginPageClient({
  logoUrl,
  darkLogoUrl,
  logoAlt,
  loginBgUrl,
  portalTitle,
  welcomeText,
  secondaryColor,
}: LoginPageClientProps) {
  const mobileLogo = darkLogoUrl || logoUrl;
  const cardColor = secondaryColor || FALLBACK_COLOR;

  const { lang, setLang } = usePortalState();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const error = searchParams.get('error');
  const currentYear = new Date().getFullYear();

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ═══════ MOBILE (< lg) ═══════ */}
      <div
        className="flex flex-col items-center justify-center min-h-screen lg:hidden px-6 py-12 relative"
        style={{ backgroundColor: cardColor }}
      >
        {/* Decorative circles */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-32 right-8 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="absolute top-40 right-12 w-20 h-20 rounded-full opacity-5 bg-white" />

        {/* Lang toggle */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
            className="bg-white/20 hover:bg-white/30 text-white font-bold py-1.5 px-3.5 rounded-full text-xs transition-colors border border-white/10"
          >
            {t(lang, 'langBtn')}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm relative z-10">
          {mobileLogo && (
            <img
              src={mobileLogo}
              alt={logoAlt}
              className="h-24 w-auto object-contain mb-8"
            />
          )}

          <h1 className="text-2xl font-bold text-white text-center mb-3">
            {welcomeText ?? t(lang, 'welcome')}
          </h1>
          <p className="text-white/80 text-sm text-center mb-10">
            {t(lang, 'loginDesc')}
          </p>

          {/* Error */}
          {error && (
            <div className="w-full mb-5 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3 text-center">
              <p className="text-white text-sm">{t(lang, 'loginError')}</p>
            </div>
          )}

          {/* Sign-in button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin text-slate-500" /> : <GoogleIcon />}
            <span className="text-base font-medium text-[#0F172A]">
              {isLoading ? (lang === 'en' ? 'Signing in…' : 'Masuk…') : t(lang, 'loginGoogle')}
            </span>
          </button>
        </div>

        <p className="text-white/60 text-xs text-center mt-8 relative z-10">
          © {currentYear} {portalTitle}
        </p>
      </div>

      {/* ═══════ DESKTOP (>= lg) ═══════ */}
      <div className="hidden lg:flex min-h-screen w-full">

        {/* Left panel — white, fixed 480px */}
        <div className="lg:w-[480px] lg:min-w-[480px] flex flex-col items-center justify-center px-10 py-8 relative overflow-hidden bg-white">

          {/* Decorative circles */}
          <div className="absolute top-16 left-8 w-24 h-24 rounded-full opacity-5" style={{ backgroundColor: cardColor }} />
          <div className="absolute bottom-24 right-6 w-36 h-36 rounded-full opacity-5" style={{ backgroundColor: cardColor }} />

          {/* Lang toggle */}
          <div className="absolute top-5 right-5 z-20">
            <button
              onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
              className="hover:bg-slate-100 text-slate-500 font-semibold py-1.5 px-3.5 rounded-full text-xs transition-colors border border-slate-200"
            >
              {t(lang, 'langBtn')}
            </button>
          </div>

          {/* Logo — above card, regular logo for white bg */}
          <div className="relative z-10 mb-8">
            <div className="relative h-24 w-[260px]">
              <Image
                src={logoUrl}
                alt={logoAlt}
                fill
                sizes="260px"
                className="object-contain object-center"
                priority
              />
            </div>
          </div>

          {/* White card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 w-full max-w-sm relative z-10">

            {/* Welcome text */}
            <div className="mb-6">
              <p
                className="text-xs font-semibold tracking-wider uppercase mb-1"
                style={{ color: cardColor }}
              >
                WELCOME BACK
              </p>
              <h2 className="text-xl font-bold text-[#0F172A]">
                {welcomeText ?? t(lang, 'welcome')}
              </h2>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
                <p className="text-red-600 text-sm">{t(lang, 'loginError')}</p>
              </div>
            )}

            {/* Sign-in button — border style */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#E2E8F0] rounded-full hover:bg-[#F8FAFC] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <GoogleIcon />}
              <span className="text-sm font-medium text-[#0F172A]">
                {isLoading ? (lang === 'en' ? 'Signing in…' : 'Masuk…') : t(lang, 'loginGoogle')}
              </span>
            </button>

            <p className="text-[10px] font-semibold tracking-wider uppercase text-center mt-6 text-slate-400">
              IMPORTANT
            </p>
            <p className="text-xs text-[#94A3B8] text-center mt-1">
              {t(lang, 'loginDesc')}
            </p>
          </div>

          {/* Copyright */}
          <p className="relative z-10 text-[#94A3B8] text-xs text-center mt-6">
            © {currentYear} {portalTitle}
          </p>
        </div>

        {/* Right panel — flex-1, background image */}
        <div className="flex-1 relative overflow-hidden bg-gray-100">
          {loginBgUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${loginBgUrl})` }}
            />
          )}
          {!loginBgUrl && (
            <div className="absolute inset-0" style={{ backgroundColor: cardColor }} />
          )}
          {/* White fade from left panel edge */}
          <div
            className="absolute top-0 left-0 bottom-0 w-40 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }}
          />
          {/* Cinematic dark bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

      </div>
    </div>
  );
}
