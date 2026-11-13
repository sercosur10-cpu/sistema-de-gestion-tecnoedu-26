'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Building2,
  Save,
  CheckCircle2,
  Lock,
  Wrench,
  Plus,
  Copy,
} from 'lucide-react';
import type { SucursalId } from '@/lib/supabase/database.types';
import { LISTA_SUCURSALES } from '@/modules/sucursales/constants';
import { useAuth, type CuentaAcceso } from '@/modules/auth/AuthContext';

export default function GestionAccesosPage() {
  const {
    usuarioActivo,
    cuentas,
    correoCorporativoMaestro,
    actualizarCuentaAcceso,
    crearCuentaTecnico,
    actualizarCorreoCorporativoMaestro,
  } = useAuth();

  const [correoCorp, setCorreoCorp] = useState(correoCorporativoMaestro);
  const [cuentaEditando, setCuentaEditando] = useState<CuentaAcceso | null>(
    null
  );
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modal para crear un nuevo Técnico de Sucursal
  const [modalNuevoTecnico, setModalNuevoTecnico] = useState(false);
  const [tecNombre, setTecNombre] = useState('');
  const [tecEmail, setTecEmail] = useState('');
  const [tecPassword, setTecPassword] = useState('');
  const [tecSucursal, setTecSucursal] = useState<SucursalId>('TAR');

  if (usuarioActivo && usuarioActivo.rol !== 'ADMIN_GENERAL') {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
        Acceso restringido: Solo la Administración Central / Gerencia puede
        modificar las cuentas y correos de las sucursales y técnicos.
      </div>
    );
  }

  const abrirEdicion = (c: CuentaAcceso) => {
    setCuentaEditando(c);
    setNuevoNombre(c.nombre);
    setNuevoEmail(c.email);
    setNuevaPassword(c.passwordHash);
  };

  const copiarCredenciales = (c: CuentaAcceso) => {
    const texto = `TECNODEDU ISP - CREDENCIALES DE ACCESO\nSucursal / Usuario: ${c.nombre}\nNivel: ${c.cargo}\nCorreo de Ingreso: ${c.email}\nContraseña: ${c.passwordHash}\nAcceso: https://gestion.tecnoedu.com.bo/login`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(texto);
    }
    setFeedback(
      `Credenciales copiadas al portapapeles para ${c.nombre} (${c.email}). ¡Ya puedes enviárselas por WhatsApp o correo corporativo!`
    );
  };

  const handleGuardarCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaEditando) return;
    setGuardando(true);
    const res = await actualizarCuentaAcceso(cuentaEditando.id, {
      nombre: nuevoNombre,
      email: nuevoEmail,
      passwordHash: nuevaPassword,
    });
    setGuardando(false);
    setFeedback(res.mensaje);
    setCuentaEditando(null);
  };

  const handleCrearTecnico = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const res = await crearCuentaTecnico({
      nombre: tecNombre,
      email: tecEmail,
      passwordHash: tecPassword,
      sucursalId: tecSucursal,
    });
    setGuardando(false);
    setFeedback(res.mensaje);
    if (res.ok) {
      setTecNombre('');
      setTecEmail('');
      setTecPassword('');
      setModalNuevoTecnico(false);
    }
  };

  const handleGuardarCorreoCorp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    await actualizarCorreoCorporativoMaestro(correoCorp);
    setGuardando(false);
    setFeedback(
      `Correo corporativo de recuperación actualizado a: ${correoCorp}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Niveles de Ingreso: Gerencia, 4 Sucursales y Técnicos de Campo
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Administra los correos y contraseñas de las 4 sucursales (Bermejo,
            Tarija, Santa Cruz y Roboré), los Técnicos con acceso limitado a
            equipos y el correo corporativo de respaldo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevoTecnico(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Crear Acceso para Técnico
        </button>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {feedback}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-300 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Configuración del Correo Corporativo Maestro */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-5">
        <div className="flex items-center gap-2 text-base font-bold text-white">
          <Mail className="h-5 w-5 text-cyan-400" />
          <span>
            Correo Corporativo para Recuperación / Cambio de Contraseñas
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Si cualquier operador de sucursal o técnico olvida su contraseña,
          podrá restablecerla validando este correo corporativo o solicitando el
          cambio aquí en Gerencia Central.
        </p>

        <form
          onSubmit={handleGuardarCorreoCorp}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            type="email"
            required
            value={correoCorp}
            onChange={(e) => setCorreoCorp(e.target.value)}
            placeholder="kcatari@tecnoedu.com.bo"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
          >
            <Save className="h-4 w-4" />
            Guardar Correo Corporativo
          </button>
        </form>
      </div>

      {/* Tabla de Cuentas del Sistema (Gerencia + 4 Sucursales + Técnicos) */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-sm font-bold text-white">
            Cuentas de Ingreso Configuradas ({cuentas.length} cuentas activas)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Nivel / Alcance</th>
                <th className="px-4 py-3.5">Responsable / Cargo</th>
                <th className="px-4 py-3.5">Correo de Ingreso</th>
                <th className="px-4 py-3.5">Contraseña Actual</th>
                <th className="px-4 py-3.5">Permisos de Menú y Consultas</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {cuentas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {c.rol === 'ADMIN_GENERAL' ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 font-mono text-xs font-bold text-cyan-300">
                        <ShieldCheck className="h-3.5 w-3.5" /> GERENCIA CENTRAL
                      </span>
                    ) : c.rol === 'TECNICO_SUCURSAL' ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-300">
                        <Wrench className="h-3.5 w-3.5" /> TÉCNICO{' '}
                        {c.sucursalId}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                        <Building2 className="h-3.5 w-3.5" /> SUCURSAL{' '}
                        {c.sucursalId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">{c.nombre}</div>
                    <div className="text-xs text-slate-400">{c.cargo}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-cyan-300">
                    {c.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-amber-300">
                    {c.passwordHash}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-300">
                    {c.rol === 'ADMIN_GENERAL'
                      ? 'Acceso Total: 4 Sucursales, Cobros, Egresos, Inventario Equipos y Accesos'
                      : c.rol === 'TECNICO_SUCURSAL'
                        ? `Acceso Limitado Equipos (${c.sucursalId}): Solo recibe equipos, registra reemplazos y envía dañados a observación en casa`
                        : `Aislado Cobranza: Menú lateral y consultas bloqueadas exclusivamente a ${c.sucursalId}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => copiarCredenciales(c)}
                        title="Copiar credenciales para enviar a la sucursal"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5 text-cyan-400" />
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicion(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Cambiar Clave
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para editar Correo o Contraseña */}
      {cuentaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              Modificar Credenciales — {cuentaEditando.nombre}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Puedes cambiar tanto el correo electrónico asignado como su
              contraseña de ingreso.
            </p>

            <form onSubmit={handleGuardarCuenta} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Nombre del Perfil / Responsable
                </label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Correo Electrónico de Ingreso
                </label>
                <input
                  type="email"
                  required
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Nueva Contraseña
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 font-mono text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCuentaEditando(null)}
                  disabled={guardando}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {guardando ? 'Guardando en Supabase...' : 'Guardar Credenciales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para crear Nuevo Técnico con Acceso Limitado */}
      {modalNuevoTecnico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              Crear Acceso Limitado para Técnico de Campo
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              El técnico tendrá acceso únicamente a sus equipos entregados,
              registro de reemplazos y devolución de equipos dañados a
              observación en casa.
            </p>

            <form onSubmit={handleCrearTecnico} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Nombre del Técnico
                </label>
                <input
                  type="text"
                  required
                  value={tecNombre}
                  onChange={(e) => setTecNombre(e.target.value)}
                  placeholder="Ej. Técnico 2: Juan Pérez"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Sucursal Asignada
                </label>
                <select
                  value={tecSucursal}
                  onChange={(e) => setTecSucursal(e.target.value as SucursalId)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {LISTA_SUCURSALES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Correo de Ingreso del Técnico
                </label>
                <input
                  type="email"
                  required
                  value={tecEmail}
                  onChange={(e) => setTecEmail(e.target.value)}
                  placeholder="juan.tarija@tecnoedu.com.bo"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Contraseña Inicial
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={tecPassword}
                  onChange={(e) => setTecPassword(e.target.value)}
                  placeholder="Ej. Tecnico2026*"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoTecnico(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  Crear Cuenta de Técnico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
