# Login Page — Multi-Tenant Responsive Design Rules

## Overview

Login page menggunakan multi-tenancy theme dari tabel `core_portal_themes` dan background image dari `core_settings`. Responsive untuk Desktop dan Mobile dengan layout berbeda.

---

## Theme Data Source

```sql
-- Theme per subdomain
SELECT id, host_domain, portal_title, logo_url, primary_color,
       login_bg_url, welcome_text, favicon_url, secondary_color,
       secondary_logo_url, secondary_title
FROM core_portal_themes
WHERE host_domain = :currentDomain

-- Background image fallback
SELECT setting_value FROM core_settings
WHERE setting_key = 'login_bg_url'
```

### Theme Interface

```typescript
interface PortalTheme {
  id: number;
  hostDomain: string;
  portalTitle: string;       // Nama platform: "Kreativa Adaptive Learning"
  logoUrl: string;           // Logo regular (untuk background putih)
  primaryColor: string;
  loginBgUrl: string;        // URL background image panel kanan
  welcomeText: string;       // Teks sambutan: "Welcome to Student Portal"
  faviconUrl: string;
  secondaryColor: string;    // Warna aksen utama (card bg, mobile bg, sidebar)
  secondaryLogoUrl: string;  // Logo untuk background gelap (sidebar, mobile)
  secondaryTitle: string;    // Judul secondary: "Kreativa Student Portal"
}
```

---

## Desktop Layout (lg >= 1024px)

### Proporsi

| Elemen | Ukuran | Keterangan |
|--------|--------|------------|
| Panel Kiri (Login) | Fixed `480px` | `lg:w-[480px] lg:min-w-[480px]` |
| Panel Kanan (Gambar) | `flex-1` | Mengisi sisa layar |

### Proporsi di Berbagai Resolusi

| Resolusi Layar | Kiri (Login) | Kanan (Gambar) |
|----------------|--------------|----------------|
| 1024px (Min Desktop) | 480px (~46.8%) | 544px (~53.2%) |
| 1440px (Laptop) | 480px (~33.3%) | 960px (~66.7%) |
| 1920px (Full HD) | 480px (25%) | 1440px (75%) |

### Panel Kiri — Spesifikasi

- **Background:** Putih (`bg-white`)
- **Logo:** `theme.logoUrl` (logo regular untuk bg putih), ukuran `h-24`
- **Decorative circles:** `opacity-5` dengan `backgroundColor: theme.secondaryColor`
- **Card:**
  - Background: `theme.secondaryColor`
  - Border radius: `rounded-2xl`
  - Shadow: `shadow-xl`
  - Padding: `p-8`
  - Max width: `max-w-sm`
- **Card text:**
  - "WELCOME BACK" — `text-xs uppercase tracking-wider text-white/70`
  - Welcome text — `text-xl font-bold text-white`
  - "IMPORTANT" — `text-[10px] uppercase text-white/60`
  - Disclaimer — `text-xs text-white/50`
- **Sign-in button:** `bg-white rounded-full shadow-md` (putih di atas card berwarna)
- **Copyright:** `text-[#94A3B8] text-xs` di bawah card

### Panel Kanan — Spesifikasi

- **Background image:** `bg-cover bg-center` dari `theme.loginBgUrl`
- **Gradient kiri:** `w-40`, `linear-gradient(to right, #ffffff, transparent)` — transisi mulus dari panel putih ke gambar
- **Gradient bawah:** `bg-gradient-to-t from-black/40 via-transparent to-transparent` — efek cinematic depth

---

## Mobile Layout (< 1024px)

### Spesifikasi

- **Background:** Full-screen `theme.secondaryColor`
- **Logo:** `theme.secondaryLogoUrl` (logo untuk background gelap), ukuran `h-24`
- **Decorative circles:** `opacity-10 bg-white` (3 circles berbeda ukuran)
- **Welcome text:** `text-2xl font-bold text-white text-center`
- **Subtitle:** `text-white/80 text-sm text-center`
- **Sign-in button:** `bg-white rounded-full shadow-lg` (putih di atas background berwarna)
- **Copyright:** `text-white/60 text-xs text-center`

---

## Perbandingan Elemen Desktop vs Mobile

| Elemen | Desktop | Mobile |
|--------|---------|--------|
| Background utama | Putih (kiri), Image (kanan) | Full `secondaryColor` |
| Logo yang dipakai | `theme.logoUrl` (regular) | `theme.secondaryLogoUrl` (untuk dark bg) |
| Card background | `theme.secondaryColor` | Tidak ada card |
| Card text color | White | White (langsung di bg) |
| Gradient | White → transparent di edge kiri gambar | Tidak ada |
| Layout | Fixed 480px + flex-1 | Full-width centered |
| Button style | `bg-white rounded-full shadow-md` | `bg-white rounded-full shadow-lg` |

---

## Implementasi Code

### `page.tsx` (Server Component)

```tsx
import { getTheme } from '@/lib/theme';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const theme = await getTheme();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ===== MOBILE (< lg) ===== */}
      <div
        className="flex flex-col items-center justify-center min-h-screen lg:hidden px-6 py-12 relative"
        style={{ backgroundColor: theme.secondaryColor }}
      >
        {/* Decorative circles */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-32 right-8 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="absolute top-40 right-12 w-20 h-20 rounded-full opacity-5 bg-white" />

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm relative z-10">
          {theme.secondaryLogoUrl && (
            <img
              src={theme.secondaryLogoUrl}
              alt={theme.portalTitle}
              className="h-24 w-auto object-contain mb-8"
            />
          )}
          <h1 className="text-2xl font-bold text-white text-center mb-3 font-heading">
            {theme.welcomeText}
          </h1>
          <p className="text-white/80 text-sm text-center mb-10">
            Access your courses, assignments, and academic progress seamlessly.
          </p>
          <LoginForm variant="mobile" />
        </div>

        <p className="text-white/60 text-xs text-center mt-8 relative z-10">
          &copy; {new Date().getFullYear()} {theme.portalTitle}
        </p>
      </div>

      {/* ===== DESKTOP (>= lg) ===== */}
      <div className="hidden lg:flex min-h-screen w-full">
        {/* Panel Kiri — fixed 480px, bg putih */}
        <div className="lg:w-[480px] lg:min-w-[480px] flex flex-col items-center justify-center px-10 py-8 relative overflow-hidden bg-white">
          {/* Decorative circles */}
          <div className="absolute top-16 left-8 w-24 h-24 rounded-full opacity-5" style={{ backgroundColor: theme.secondaryColor }} />
          <div className="absolute bottom-24 right-6 w-36 h-36 rounded-full opacity-5" style={{ backgroundColor: theme.secondaryColor }} />

          {/* Logo */}
          <div className="relative z-10 mb-8">
            {theme.logoUrl && (
              <img src={theme.logoUrl} alt={theme.portalTitle} className="h-24 w-auto object-contain mx-auto" />
            )}
          </div>

          {/* Card berwarna */}
          <div className="rounded-2xl shadow-xl p-8 w-full max-w-sm relative z-10" style={{ backgroundColor: theme.secondaryColor }}>
            <div className="text-center mb-6">
              <p className="text-xs font-semibold tracking-wider uppercase mb-1 text-white/70">WELCOME BACK</p>
              <h2 className="text-xl font-bold text-white font-heading">{theme.welcomeText}</h2>
            </div>
            <LoginForm variant="desktop" />
            <p className="text-[10px] font-semibold tracking-wider uppercase text-center mt-6 text-white/60">IMPORTANT</p>
            <p className="text-xs text-white/50 text-center mt-1">This app is only accessible with a registered email.</p>
          </div>

          {/* Copyright */}
          <p className="relative z-10 text-[#94A3B8] text-xs text-center mt-6">
            &copy; {new Date().getFullYear()} {theme.portalTitle}
          </p>
        </div>

        {/* Panel Kanan — flex-1, background image */}
        <div className="flex-1 relative overflow-hidden bg-gray-900">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${theme.loginBgUrl})` }} />
          {/* Gradient putih dari kiri */}
          <div className="absolute top-0 left-0 bottom-0 w-40 pointer-events-none" style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }} />
          {/* Gradient gelap dari bawah */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
```

### `login-form.tsx` (Client Component)

```tsx
'use client';

import { signIn } from 'next-auth/react';

interface LoginFormProps {
  variant: 'desktop' | 'mobile';
}

export function LoginForm({ variant }: LoginFormProps) {
  const handleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  if (variant === 'mobile') {
    return (
      <button
        onClick={handleSignIn}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <GoogleIcon />
        <span className="text-base font-medium text-[#0F172A]">Sign in with Google</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white rounded-full border border-white/20 shadow-md hover:shadow-lg transition-all"
    >
      <GoogleIcon />
      <span className="text-sm font-medium text-[#0F172A]">Sign in with Google</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
```

---

## Dependencies

- **Next.js 14+** (App Router, Server Components)
- **NextAuth v4** (Google Provider)
- **Tailwind CSS 3.4+**
- **Database:** `core_portal_themes`, `core_settings`

## Theme Resolution Flow

```
Request → headers().get('host') → getThemeByDomain(domain) → PortalTheme
                                                           ↓
                                        fallback: core_settings.login_bg_url
                                        fallback: DEFAULT_THEME (localhost)
```

## Multi-Tenancy Subdomains

| Domain | Theme ID | School |
|--------|----------|--------|
| `learning.kreativaglobal.sch.id` | 3 | Kreativa Global |
| `learning.talentajuara.sch.id` | 4 | Talenta Juara |

Untuk local development, set `DEFAULT_TENANT_DOMAIN` di `.env.local`:
```
DEFAULT_TENANT_DOMAIN="learning.kreativaglobal.sch.id"
```
