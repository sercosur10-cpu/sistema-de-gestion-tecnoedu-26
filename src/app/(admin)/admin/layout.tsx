'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileSpreadsheet,
  Building2,
  ExternalLink,
  Wifi,
  Database,
  KeyRound,
  LogOut,
  ShieldCheck,
  Lock,
  Package,
  Wrench,
  Globe,
  Mail,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { LISTA_SUCURSALES } from '@/modules/sucursales/constants';
import { useAuth } from '@/modules/auth/AuthContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { usuarioActivo, cargandoSesion, cerrarSesion } = useAuth();

  useEffect(() => {
    if (cargandoSesion) return;

    if (!usuarioActivo) {
      router.replace('/login');
      return;
    }

    // 1. Si es Técnico de Sucursal, bloquear estrictamente a su panel de equipos (/admin/tecnico)
    if (usuarioActivo.rol === 'TECNICO_SUCURSAL') {
      if (pathname !== '/admin/tecnico') {
        router.replace('/admin/tecnico');
      }
      return;
    }

    // 2. Si es Operador de Sucursal, bloquear cualquier ruta fuera de su propia sucursal
    if (
      usuarioActivo.rol === 'OPERADOR_SUCURSAL' &&
      usuarioActivo.sucursalId
    ) {
      const rutaPermitida = `/admin/sucursal/${usuarioActivo.sucursalId}`;
      if (pathname !== rutaPermitida) {
        router.replace(rutaPermitida);
      }
    }
  }, [cargandoSesion, usuarioActivo, pathname, router]);

  if (cargandoSesion || !usuarioActivo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Verificando credenciales y permisos de sucursal...
      </div>
    );
  }

  const esAdminGeneral = usuarioActivo.rol === 'ADMIN_GENERAL';
  const esTecnico = usuarioActivo.rol === 'TECNICO_SUCURSAL';

  const sucursalesVisibles = esAdminGeneral
    ? LISTA_SUCURSALES
    : LISTA_SUCURSALES.filter((s) => s.id === usuarioActivo.sucursalId);

  const hrefInicioRol = esAdminGeneral
    ? '/admin'
    : esTecnico
      ? '/admin/tecnico'
      : `/admin/sucursal/${usuarioActivo.sucursalId}`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 lg:flex-row">
      {/* Sidebar de Navegación Modular con Aislamiento por Nivel de Ingreso */}
      <aside className="w-full shrink-0 border-b border-slate-800 bg-slate-900/70 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="space-y-6">
            {/* Brand */}
            <Link
              href={hrefInicioRol}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 text-slate-950">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">TecnoEdu ISP</div>
                <div className="text-[11px] text-slate-400">
                  {esAdminGeneral
                    ? 'Administración Central'
                    : esTecnico
                      ? `Técnico ${usuarioActivo.sucursalId} (Solo Equipos)`
                      : `Sucursal ${usuarioActivo.sucursalId} (Aislada)`}
                </div>
              </div>
            </Link>

            {/* Tarjeta de Sesión Activa */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  {esAdminGeneral ? (
                    <>
                      <ShieldCheck className="h-3 w-3" /> Gerencia Central
                    </>
                  ) : esTecnico ? (
                    <>
                      <Wrench className="h-3 w-3 text-amber-400" /> Técnico{' '}
                      {usuarioActivo.sucursalId}
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 text-emerald-400" /> Solo{' '}
                      {usuarioActivo.sucursalId}
                    </>
                  )}
                </span>
              </div>
              <div className="mt-1 truncate text-xs font-bold text-white">
                {usuarioActivo.nombre}
              </div>
              <div className="truncate font-mono text-[11px] text-slate-400">
                {usuarioActivo.email}
              </div>
            </div>

            {/* Módulos Principales: SOLO VISIBLES PARA ADMINISTRACIÓN CENTRAL / GERENCIA */}
            {esAdminGeneral && (
              <div>
                <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Gestión General (Central)
                </div>
                <nav className="mt-2 space-y-1">
                  <Link
                    href="/admin"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      pathname === '/admin'
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-cyan-300'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4 text-cyan-400" />
                    <span>Resumen Multisucursal</span>
                  </Link>
                  <Link
                    href="/admin/clientes"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      pathname === '/admin/clientes'
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-cyan-300'
                    }`}
                  >
                    <Users className="h-4 w-4 text-cyan-400" />
                    <span>Clientes ISP (Global)</span>
                  </Link>
                  <Link
                    href="/admin/cobros"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      pathname === '/admin/cobros'
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-cyan-300'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 text-cyan-400" />
                    <span>Cobros Diarios (Global)</span>
                  </Link>
                  <Link
                    href="/admin/estados-cuenta"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      pathname === '/admin/estados-cuenta'
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-cyan-300'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                    <span>Estados de Cuenta y Corte</span>
                  </Link>
                  <Link
                    href="/admin/egresos-equipos"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      pathname === '/admin/egresos-equipos'
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-emerald-300'
                    }`}
                  >
                    <Package className="h-4 w-4 text-emerald-400" />
                    <span>Egresos e Inventario Equipos</span>
                  </Link>
                  <Link
                    href="/admin/tecnico"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      pathname === '/admin/tecnico'
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-amber-300'
                    }`}
                  >
                    <Wrench className="h-4 w-4 text-amber-400" />
                    <span>Vista Técnico (Reemplazos)</span>
                  </Link>
                  <Link
                    href="/admin/accesos"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      pathname === '/admin/accesos'
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-cyan-300'
                    }`}
                  >
                    <KeyRound className="h-4 w-4 text-amber-400" />
                    <span>Accesos (Sucursales y Técnicos)</span>
                  </Link>
                </nav>
              </div>
            )}

            {/* Menú exclusivo para Técnico de Campo (Acceso Limitado a sus equipos) */}
            {esTecnico && (
              <div>
                <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Espacio Exclusivo Técnico
                </div>
                <nav className="mt-2 space-y-1">
                  <Link
                    href="/admin/tecnico"
                    className="flex items-center justify-between rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-white"
                  >
                    <span className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Mis Equipos y Reemplazos</span>
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                      {usuarioActivo.sucursalId}
                    </span>
                  </Link>
                </nav>
              </div>
            )}

            {/* Vistas por Sucursal: Si es Operador o Admin General */}
            {!esTecnico && (
              <div>
                <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {esAdminGeneral
                    ? 'Vistas por Sucursal (4 Plazas)'
                    : `Gestión Independiente Agencia ${usuarioActivo.sucursalId}`}
                </div>
                <nav className="mt-2 space-y-1">
                  {sucursalesVisibles.map((suc) => {
                    const activa = pathname === `/admin/sucursal/${suc.id}`;
                    return (
                      <div key={suc.id} className="space-y-1">
                        <Link
                          href={`/admin/sucursal/${suc.id}?tab=CLIENTES`}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                            activa
                              ? 'border border-cyan-500/40 bg-cyan-500/15 text-white'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
                            <span>
                              {esAdminGeneral
                                ? `Sucursal ${suc.nombre}`
                                : `Clientes y Cobros (${suc.nombre})`}
                            </span>
                          </span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                            {suc.id}
                          </span>
                        </Link>

                        {/* Opciones directas en el menú lateral para el Administrativo de cada Agencia */}
                        {!esAdminGeneral && (
                          <>
                            <Link
                              href={`/admin/sucursal/${suc.id}?tab=EQUIPOS_Y_EGRESOS`}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/15"
                            >
                              <Package className="h-4 w-4 text-emerald-400" />
                              <span>
                                Egresos e Inventario Equipos ({suc.id})
                              </span>
                            </Link>
                            <Link
                              href={`/admin/sucursal/${suc.id}?tab=VISTA_TECNICOS`}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/15"
                            >
                              <Wrench className="h-4 w-4 text-amber-400" />
                              <span>Vista Técnicos (Reemplazos {suc.id})</span>
                            </Link>
                            <Link
                              href={`/admin/sucursal/${suc.id}?tab=ACCESOS_SUCURSAL`}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/15"
                            >
                              <KeyRound className="h-4 w-4 text-cyan-400" />
                              <span>Accesos (Admin y Técnicos {suc.id})</span>
                            </Link>
                          </>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* Footer / Enlace a Mini-App y Cierre de Sesión */}
          <div className="mt-6 space-y-2 border-t border-slate-800 pt-4">
            {/* Información Corporativa Oficial */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-slate-300">Empresa</span>
                <span className="font-mono text-cyan-400">TecnoEdu ISP</span>
              </div>
              <a
                href="https://tecnoedu.com.bo"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center justify-between font-medium text-cyan-300 hover:underline"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3 w-3 text-cyan-400" />
                  tecnoedu.com.bo
                </span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <div className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-slate-400">
                <Mail className="h-3 w-3 shrink-0 text-emerald-400" />
                <span className="truncate">kcatari@tecnoedu.com.bo</span>
              </div>
            </div>

            {!esTecnico && (
              <Link
                href={
                  usuarioActivo.sucursalId
                    ? `/consulta?sucursal=${usuarioActivo.sucursalId}`
                    : '/consulta'
                }
                className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
              >
                <span>
                  {usuarioActivo.sucursalId
                    ? `Consulta Clientes (${usuarioActivo.sucursalId})`
                    : 'Mini-App Consulta'}
                </span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}

            <button
              type="button"
              onClick={async () => {
                await cerrarSesion();
                router.push('/login');
              }}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <span>Cambiar Usuario / Salir</span>
              <LogOut className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
              <Database className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <span className="truncate">
                {isSupabaseConfigured
                  ? 'Supabase Conectado'
                  : 'Modo Local (Sin .env)'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 p-5 sm:p-8">{children}</div>
    </div>
  );
}
