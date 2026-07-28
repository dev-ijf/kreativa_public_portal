import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Source_Sans_3 } from 'next/font/google';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { getPortalThemeForRequest, getBrowserTitle, portalThemeToHtmlStyle } from '@/lib/data/server/portal-theme';
import { getGaMeasurementId } from '@/lib/portal/tenant';
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
    // Disable Chrome/Google Translate — app already has its own i18n
    other: {
      google: 'notranslate',
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
  const h = await headers();
  const tenant = h.get('x-tenant-id') === 'talenta' ? 'talenta' : 'kreativa';
  const gaId = getGaMeasurementId(tenant);

  return (
    <html
      lang="en"
      translate="no"
      style={tenantVars}
      className={`notranslate ${sourceSans.variable}`}
    >
      <body className="notranslate antialiased min-h-screen bg-slate-50 text-slate-800">
        <GoogleAnalytics measurementId={gaId} />
        {children}
      </body>
    </html>
  );
}
