"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';

type LoginPageClientProps = {
  logoUrl: string;
  darkLogoUrl?: string;
  logoAlt: string;
  loginBgUrl?: string | null;
  portalTitle?: string;
  welcomeText?: string | null;
};

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export function LoginPageClient({ logoUrl, darkLogoUrl, logoAlt, loginBgUrl, portalTitle, welcomeText }: LoginPageClientProps) {
  // dark bg version (for mobile primary-color bg) falls back to regular logo
  const mobileLogo = darkLogoUrl || logoUrl;
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
    <div className="min-h-screen w-full">

      {/* ═══════ MOBILE (< md) ═══════ */}
      <div className="md:hidden min-h-screen bg-primary relative overflow-hidden flex flex-col items-center justify-center px-6">
        <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/5" />

        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
            className="bg-white/20 hover:bg-white/30 text-white font-bold py-1.5 px-3.5 rounded-full text-xs transition-colors border border-white/10"
          >
            {t(lang, 'langBtn')}
          </button>
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <div className="relative h-36 w-[280px]">
              <Image src={mobileLogo} alt={logoAlt} fill sizes="280px" className="object-contain object-center" priority />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">{t(lang, 'welcome')}</h1>
            <p className="text-white/75 text-sm">{t(lang, 'loginDesc')}</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3 text-center">
              <p className="text-white text-sm">{t(lang, 'loginError')}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white text-slate-700 font-bold py-3.5 px-4 rounded-full hover:bg-slate-50 transition-all shadow-xl flex items-center justify-center gap-3 border border-transparent hover:border-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <GoogleIcon />}
            <span>{isLoading ? (lang === 'en' ? 'Signing in…' : 'Masuk…') : t(lang, 'loginGoogle')}</span>
          </button>

          <p className="mt-8 text-center text-white/40 text-xs">© {currentYear} {portalTitle}</p>
        </div>
      </div>

      {/* ═══════ DESKTOP / TABLET (md+) ═══════ */}
      <div className="hidden md:flex min-h-screen">

        {/* Left panel — login card */}
        <div className="w-[42%] lg:w-[38%] xl:w-[35%] shrink-0 flex flex-col bg-primary relative">
          {/* Lang toggle */}
          <div className="absolute top-5 right-5 z-10">
            <button
              onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold py-1.5 px-3.5 rounded-full text-xs transition-colors border border-white/20"
            >
              {t(lang, 'langBtn')}
            </button>
          </div>

          {/* Centered card */}
          <div className="flex-1 flex items-center justify-center px-8 py-12">
            <div className="w-full max-w-[320px] bg-white rounded-3xl shadow-sm border border-slate-100 px-8 py-10">
              {/* Logo */}
              <div className="mb-7 flex justify-center">
                <div className="relative h-28 w-[220px]">
                  <Image
                    src={logoUrl}
                    alt={logoAlt}
                    fill
                    sizes="220px"
                    className="object-contain object-center"
                    priority
                  />
                </div>
              </div>

              {/* Welcome */}
              <div className="text-center mb-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60 mb-1">
                  {lang === 'en' ? 'Welcome Back' : 'Selamat Datang'}
                </p>
                <h1 className="text-lg font-bold text-slate-800">{t(lang, 'welcome')}</h1>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
                  <p className="text-red-600 text-sm">{t(lang, 'loginError')}</p>
                </div>
              )}

              {/* Google sign-in */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white text-slate-700 font-semibold py-3 px-4 rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-3 border border-slate-200 hover:border-slate-300 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin text-primary" /> : <GoogleIcon />}
                <span>{isLoading ? (lang === 'en' ? 'Signing in…' : 'Masuk…') : t(lang, 'loginGoogle')}</span>
              </button>

              {/* Note */}
              <p className="mt-4 text-[11px] text-slate-400 text-center leading-relaxed">
                {t(lang, 'loginDesc')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-8 pb-5 text-[11px] text-white/50">
            <span>© {currentYear} {portalTitle}</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} />
              <span>{lang === 'en' ? 'Secure Platform' : 'Platform Aman'}</span>
            </div>
          </div>
        </div>

        {/* Right panel — background image via CSS (reliable, no Next/Image fill complexity) */}
        <div
          className="flex-1 relative overflow-hidden"
          style={
            loginBgUrl
              ? { backgroundImage: `url(${loginBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          {/* Fallback color when no image */}
          {!loginBgUrl && <div className="absolute inset-0 bg-primary" />}

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

          {/* Text content */}
          <div className="absolute inset-0 flex flex-col justify-end p-10 lg:p-14">
            <div className="max-w-lg">
              <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-3 drop-shadow">
                {welcomeText ?? (lang === 'en'
                  ? 'Empowering Students, Connecting Families.'
                  : 'Memberdayakan Siswa, Menghubungkan Keluarga.')}
              </h2>
              <p className="text-white/75 text-sm lg:text-base leading-relaxed">
                {lang === 'en'
                  ? "Monitor your child's progress, manage payments, and stay connected with their school journey — all in one place."
                  : 'Pantau perkembangan anak, kelola pembayaran, dan tetap terhubung dengan perjalanan sekolah mereka — semua dalam satu tempat.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
