import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
});

// Define tenant configuration statically
const TENANT_CONFIG = {
  kreativa: {
    '--tenant-primary': '#3A2EAE',
    '--tenant-primary-hover': '#2A2180',
    '--tenant-primary-light': '#EEEDFB',
    title: 'Kreativa Global - Parent Portal',
  },
  talenta: {
    '--tenant-primary': '#059669', // primary green for talenta
    '--tenant-primary-hover': '#047857',
    '--tenant-primary-light': '#D1FAE5',
    title: 'Talenta Juara - Parent Portal',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  // Multi-tenant temporarily frozen to "kreativa" for UI-first phase.
  // Keep reading the header so re-enabling later is trivial.
  const tenantId = (headersList.get('x-tenant-id') || 'kreativa') as keyof typeof TENANT_CONFIG;
  
  return {
    title: TENANT_CONFIG[tenantId]?.title || 'Parent Portal',
    description: 'Parent Portal and Student Adaptive Learning',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  // Multi-tenant temporarily frozen to "kreativa" for UI-first phase.
  const tenantId = (headersList.get('x-tenant-id') || 'kreativa') as keyof typeof TENANT_CONFIG;
  
  const tenantVars = TENANT_CONFIG[tenantId] || TENANT_CONFIG.kreativa;

  return (
    <html lang="en" style={tenantVars as React.CSSProperties} className={`${sourceSans.variable}`}>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
