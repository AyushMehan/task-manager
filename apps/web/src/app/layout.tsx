import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const geistSans = Geist({
 variable: '--font-geist-sans',
 subsets: ['latin'],
});

const geistMono = Geist_Mono({
 variable: '--font-geist-mono',
 subsets: ['latin'],
});

export const metadata: Metadata = {
 title: 'Task Manager',
 description: 'Personal task dashboard — what is pending, and what needs me this week.',
};

export const viewport: Viewport = {
 width: 'device-width',
 initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
 return (
 <html
 lang="en"
 className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
 >
 <body className="flex min-h-full flex-col bg-canvas text-ink">
 <Providers>{children}</Providers>
 </body>
 </html>
 );
}
