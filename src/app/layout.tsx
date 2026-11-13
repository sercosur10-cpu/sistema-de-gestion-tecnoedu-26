import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/modules/auth/AuthContext';

export const metadata: Metadata = {
  title: 'TecnoEdu ISP | Gestión Multisucursal & Cobros',
  description:
    'Sistema de Gestión ISP Multisucursal (Bermejo, Tarija, Santa Cruz, Roboré) con Next.js 15 y Supabase.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
