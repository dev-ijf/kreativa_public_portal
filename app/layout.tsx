import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import { getPortalThemeForRequest, getBrowserTitle, portalThemeToHtmlStyle } from '@/lib/data/server/portal-theme';
import './globals.css';
import 'katex/dist/katex.min.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getPortalThemeForRequest();
  const title = getBrowserTitle(theme);

  return {
    title,
    description: theme.welcome_text ?? theme.portal_title,
    icons: {
      icon: [{ url: '/api/portal/favicon', type: 'image/png' }],
      apple: [{ url: '/api/portal/favicon' }],
    },
    openGraph: {
      title,
      description: theme.welcome_text ?? theme.portal_title,
      images: theme.logo_url ? [{ url: theme.logo_url }] : [],
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
