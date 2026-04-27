"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { BookOpen, Globe, GraduationCap, Loader2, Microscope, Palette } from 'lucide-react';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';

type LoginPageClientProps = {
  logoUrl: string;
  logoAlt: string;
};

export function LoginPageClient({ logoUrl, logoAlt }: LoginPageClientProps) {
  const { lang, setLang } = usePortalState();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const error = searchParams.get('error');

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen w-full bg-primary relative overflow-hidden flex flex-col items-center justify-center px-6">
      <div className="absolute top-10 -left-10 text-white opacity-5 -rotate-12">
        <BookOpen size={120} />
      </div>
      <div className="absolute top-40 -right-10 text-white opacity-5 rotate-12">
        <GraduationCap size={150} />
      </div>
      <div className="absolute bottom-40 left-0 text-white opacity-5 rotate-45">
        <Microscope size={100} />
      </div>
      <div className="absolute top-1/4 left-1/2 text-white opacity-5 -rotate-12">
        <Globe size={100} />
      </div>
      <div className="absolute -bottom-10 right-10 text-white opacity-5 -rotate-45">
        <Palette size={120} />
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
          className="bg-white/20 hover:bg-white/30 text-white font-bold py-1.5 px-3.5 rounded-full text-xs transition-colors shadow-sm border border-white/10"
        >
          {t(lang, 'langBtn')}
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div className="h-20 w-[220px] relative mb-10 drop-shadow-xl">
          <Image src={logoUrl} alt={logoAlt} fill sizes="220px" className="object-contain" priority />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold text-white mb-3 leading-tight">{t(lang, 'welcome')}</h1>
          <p className="text-white/80 text-sm leading-relaxed">{t(lang, 'loginDesc')}</p>
        </div>

        {error && (
          <div className="w-full mb-6 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3 text-center">
            <p className="text-white text-sm">{t(lang, 'loginError')}</p>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white text-slate-700 font-bold py-3.5 px-4 rounded-full hover:bg-slate-50 transition-all shadow-xl shadow-black/15 flex items-center justify-center group border border-transparent hover:border-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={20} className="mr-3 animate-spin" />
          ) : (
            <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {isLoading ? (lang === 'en' ? 'Signing in...' : 'Masuk...') : t(lang, 'loginGoogle')}
        </button>
      </div>
    </div>
  );
}

