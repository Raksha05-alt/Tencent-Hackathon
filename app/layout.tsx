import type { Metadata } from 'next';
import { Bricolage_Grotesque, Public_Sans, Spline_Sans_Mono } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '../lib/store';
import Nav from '../components/Nav';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' });
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' });
const splineMono = Spline_Sans_Mono({ subsets: ['latin'], variable: '--font-spline-mono' });

export const metadata: Metadata = {
  title: 'SilverOps — Toa Payoh AAC',
  description: 'The agent that makes sure no senior falls through the cracks.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${publicSans.variable} ${splineMono.variable}`}>
      <body>
        <StoreProvider>
          <Nav />
          <main className="mx-auto max-w-[1220px] px-6 pb-16">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
