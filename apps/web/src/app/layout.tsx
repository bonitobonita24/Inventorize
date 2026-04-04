// Root layout — tRPC provider, Tailwind globals, metadata

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc-provider';
import { ImpersonationBanner } from '@/components/impersonation-banner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Inventorize',
  description: 'Multi-tenant inventory management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>
          <ImpersonationBanner />
          {children}
        </TRPCProvider>
      </body>
    </html>
  );
}
