"use client";

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { t, type Lang } from '@/lib/i18n/translations';

type LoginPageClientProps = {
  logoUrl: string;
  darkLogoUrl?: string;
  logoAlt: string;
  loginBgUrl?: string | null;
  portalTitle?: string;
  welcomeText?: string | null;
  secondaryColor?: string | null;
  whatsappNumber?: string | null;
  onePortalUrl?: string;
  whatsappUrl?: string | null;
};

const FALLBACK_COLOR = '#4f46e5';
const COPYRIGHT_TEXT = '© 2026 Copyright Kreativa Education Network. All rights reserved.';
const PARENT_HIGHLIGHT = 'text-[#FACC15]';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function WelcomeHeading({
  lang,
  welcomeText,
  className,
  parentClassName,
  as: Tag = 'h1',
}: {
  lang: Lang;
  welcomeText?: string | null;
  className: string;
  parentClassName: string;
  as?: 'h1' | 'h2';
}): ReactNode {
  const text = welcomeText?.trim() || t(lang, 'welcome');
  const parentWord = t(lang, 'welcomeParent');
  const idx = text.indexOf(parentWord);

  if (idx === -1) {
    return (
      <Tag className={className}>
        {t(lang, 'welcomeBeforeParent')}
        <span className={parentClassName}>{t(lang, 'welcomeParent')}</span>
        {t(lang, 'welcomeAfterParent')}
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      {text.slice(0, idx)}
      <span className={parentClassName}>{parentWord}</span>
      {text.slice(idx + parentWord.length)}
    </Tag>
  );
}

export function LoginPageClient({
  logoUrl,
  darkLogoUrl,
  logoAlt,
  loginBgUrl,
  welcomeText,
  secondaryColor,
  onePortalUrl = 'https://one.kreativaglobal.sch.id',
  whatsappUrl,
}: LoginPageClientProps) {
  const mobileLogo = darkLogoUrl || logoUrl;
  const cardColor = secondaryColor || FALLBACK_COLOR;

  const { lang, setLang } = usePortalState();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const error = searchParams.get('error');

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

        {/* ONE Portal back link */}
        <a
          href={onePortalUrl}
          className="absolute top-6 left-6 z-20 flex items-center gap-0.5 text-white/90 hover:text-white font-bold text-xs transition-colors"
        >
          <ChevronLeft size={16} className="shrink-0" aria-hidden />
          <span>{t(lang, 'onePortal')}</span>
        </a>

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
              className="h-36 w-auto object-contain mb-8"
            />
          )}

          <WelcomeHeading
            lang={lang}
            welcomeText={welcomeText}
            className="text-2xl font-bold text-white text-center mb-3"
            parentClassName={PARENT_HIGHLIGHT}
          />
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

        <p className="text-white/60 text-xs text-center mt-8 relative z-10 px-2">
          {COPYRIGHT_TEXT}
        </p>

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe57] transition-colors"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon />
          </a>
        ) : null}
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
              <WelcomeHeading
                lang={lang}
                welcomeText={welcomeText}
                className="text-xl font-bold text-[#0F172A]"
                parentClassName="text-[#EAB308]"
                as="h2"
              />
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
          <p className="relative z-10 text-[#94A3B8] text-xs text-center mt-6 px-2">
            {COPYRIGHT_TEXT}
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
