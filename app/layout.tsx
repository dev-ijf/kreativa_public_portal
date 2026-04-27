import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import { getPortalThemeForRequest, portalThemeToHtmlStyle } from '@/lib/data/server/portal-theme';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getPortalThemeForRequest();

  return {
    title: theme.portal_title,
    description: 'Parent Portal and Student Adaptive Learning',
    // Same-origin: Chromium sering memakai /favicon.ico; middleware rewrite ke route ini lalu redirect ke Blob.
    icons: {
      icon: [{ url: '/api/portal/favicon', type: 'image/png' }],
      apple: [{ url: '/api/portal/favicon' }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getPortalThemeForRequest();
  const tenantVars = portalThemeToHtmlStyle(theme);

  return (
    <html lang="en" style={tenantVars} className={`${sourceSans.variable}`}>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
