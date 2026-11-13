import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  Building2,
  Database,
  ArrowRight,
  Wifi,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { LISTA_SUCURSALES } from '@/modules/sucursales/constants';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-4 py-10 sm:px-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              TecnoEdu ISP · Gestión Multisucursal
            </h1>
            <p className="text-xs text-slate-400">
              Bermejo (BER) · Tarija (TAR) · Santa Cruz (SCZ) · Roboré (ROB)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs">
          <Database className="h-3.5 w-3.5 text-cyan-400" />
          <span>Supabase:</span>
          {isSupabaseConfigured ? (
            <span className="font-semibold text-emerald-400">
              Conectado (Producción)
            </span>
          ) : (
            <span className="font-semibold text-amber-300">
              Modo Local Demo (Configura .env.local)
            </span>
          )}
        </div>
      </header>

      {/* Hero y Selección de Módulo */}
      <section className="my-auto py-12">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            Next.js 15 App Router · TypeScript · Supabase PostgreSQL
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Plataforma Unificada de Administración ISP y Cobranza
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Administra abonados de Fibra Óptica y Antena, registra cobros diarios
            (Efectivo, QR, Transferencia), monitorea estados de cuenta por
            sucursal y ofrece consulta inmediata a tus clientes.
          </p>
        </div>

        {/* Dos portales principales según PROJECT_SPEC.md */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/admin"
            className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-cyan-500/60 hover:bg-slate-900"
          >
            <div>
              <div className="inline-flex rounded-xl bg-cyan-500/15 p-3 text-cyan-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">
                Panel Web de Administración
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Gestión de clientes, alta de servicios, registro de cobros
                diarios, estados de cuenta y vistas dedicadas para cada sucursal.
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Ingresar al Panel Administrativo</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/consulta"
            className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-emerald-500/60 hover:bg-slate-900"
          >
            <div>
              <div className="inline-flex rounded-xl bg-emerald-500/15 p-3 text-emerald-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">
                Mini-App de Consulta (Clientes)
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Vista ligera de autogestión para que el abonado consulte su saldo
                pendiente, tarifa mensual, datos técnicos y contacto de soporte.
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Mini-App de Consulta</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>

        {/* Accesos diferenciados por Nivel: Gerencia Central y las 4 Sucursales */}
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Building2 className="h-4 w-4 text-cyan-400" />
              <span>Ingreso por Sucursal (Acceso Aislado por Plaza)</span>
            </div>
            <Link
              href="/login"
              className="text-xs font-semibold text-cyan-400 hover:underline"
            >
              Ir a Login / Recuperar Contraseña →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LISTA_SUCURSALES.map((suc) => (
              <Link
                key={suc.id}
                href={`/login?sucursal=${suc.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 transition hover:border-cyan-500/40 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {suc.id}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-1 font-semibold text-white">{suc.nombre}</div>
                <div className="text-[11px] text-slate-400">
                  {suc.departamento}
                </div>
                <div className="mt-2 text-[10px] font-semibold text-cyan-400">
                  Ingresar a {suc.id} →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900 pt-6 text-xs text-slate-500">
        Sistema de Gestión ISP Multisucursal & Cobros · TecnoEdu 2026
      </footer>
    </main>
  );
}
