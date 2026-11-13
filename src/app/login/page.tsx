'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  Wifi,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/modules/auth/AuthContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sucursalPreseleccionada = searchParams.get('sucursal')?.toUpperCase();

  const {
    cuentas,
    correoCorporativoMaestro,
    iniciarSesion,
    solicitarRecuperacionPassword,
  } = useAuth();

  const cuentaInicial =
    cuentas.find((c) => c.sucursalId === sucursalPreseleccionada) ?? cuentas[0];

  const [email, setEmail] = useState(
    cuentaInicial?.email ?? 'kcatari@tecnoedu.com.bo'
  );
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Modo Recuperación de Contraseña vía Correo Corporativo
  const [modoRecuperacion, setModoRecuperacion] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState(
    cuentaInicial?.email ?? 'bermejo@tecnoedu.com.bo'
  );
  const [correoCorpInput, setCorreoCorpInput] = useState(
    correoCorporativoMaestro
  );
  const [nuevaPasswordRecuperar, setNuevaPasswordRecuperar] = useState('');
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState<{
    ok: boolean;
    texto: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLogin(null);
    setCargando(true);
    const res = await iniciarSesion(email, password);
    setCargando(false);
    if (!res.ok) {
      setErrorLogin(res.error);
      return;
    }
    router.push(res.destino);
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeRecuperacion(null);
    const res = await solicitarRecuperacionPassword(
      emailRecuperar,
      correoCorpInput,
      nuevaPasswordRecuperar
    );
    setMensajeRecuperacion({ ok: res.ok, texto: res.mensaje });
    if (res.ok && nuevaPasswordRecuperar) {
      setEmail(emailRecuperar);
      setPassword(nuevaPasswordRecuperar);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 sm:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-slate-950">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              TecnoEdu ISP · Control de Acceso Multisucursal
            </h1>
            <p className="text-xs text-slate-400">
              Ingreso diferenciado: Gerencia Central y 4 Sucursales (BER, TAR,
              SCZ, ROB)
            </p>
          </div>
        </Link>

        <Link
          href="/"
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700"
        >
          ← Volver al Portal
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna Izquierda: Formulario de Ingreso o Recuperación */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl lg:col-span-7">
          {!modoRecuperacion ? (
            <>
              <div className="flex items-center gap-2 text-lg font-bold text-white">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <span>Iniciar Sesión en el Sistema</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Ingresa con tu correo asignado y contraseña. Los operadores de
                sucursal ingresan únicamente a su propia plaza (Bermejo, Tarija,
                Santa Cruz o Roboré).
              </p>

              {errorLogin && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorLogin}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Correo Electrónico de Acceso
                  </label>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ej. bermejo@tecnoedu.com.bo"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Contraseña
                  </label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailRecuperar(email);
                      setModoRecuperacion(true);
                      setMensajeRecuperacion(null);
                    }}
                    className="text-xs font-medium text-cyan-400 hover:underline"
                  >
                    ¿Olvidaste tu contraseña? Recuperar con Correo Corporativo
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  <span>
                    {cargando ? 'Verificando acceso...' : 'Ingresar al Sistema'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-lg font-bold text-white">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <span>Recuperación / Cambio de Contraseña Corporativa</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Si un operador de sucursal olvida su contraseña, puede
                restablecerla validando el{' '}
                <strong className="text-cyan-300">
                  Correo Corporativo Autorizado ({correoCorporativoMaestro})
                </strong>{' '}
                o solicitar el cambio desde Gerencia Central.
              </p>

              {mensajeRecuperacion && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs ${
                    mensajeRecuperacion.ok
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {mensajeRecuperacion.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <span>{mensajeRecuperacion.texto}</span>
                </div>
              )}

              <form onSubmit={handleRecuperar} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    1. Correo de la Sucursal o Cuenta a Recuperar
                  </label>
                  <select
                    value={emailRecuperar}
                    onChange={(e) => setEmailRecuperar(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                  >
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.email}>
                        {c.email} — {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    2. Correo Corporativo de Verificación / Respaldo
                  </label>
                  <input
                    type="email"
                    required
                    value={correoCorpInput}
                    onChange={(e) => setCorreoCorpInput(e.target.value)}
                    placeholder={correoCorporativoMaestro}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Correo corporativo configurado actualmente:{' '}
                    <code className="text-cyan-300">
                      {correoCorporativoMaestro}
                    </code>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    3. Nueva Contraseña (mínimo 6 caracteres)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={nuevaPasswordRecuperar}
                    onChange={(e) => setNuevaPasswordRecuperar(e.target.value)}
                    placeholder="Ingresa la nueva contraseña para esta cuenta"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModoRecuperacion(false)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Volver al Login
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restablecer Contraseña
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Columna Derecha: Selector de Perfil y Sucursal (Contraseñas Protegidas) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Building2 className="h-4 w-4 text-cyan-400" />
            <span>Niveles de Ingreso y Sucursales</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Haz clic en tu sucursal o perfil para autocompletar tu correo. La contraseña es privada y es asignada exclusivamente por Gerencia General:
          </p>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-[11px] text-cyan-200">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <span>
              <strong>Acceso Seguro:</strong> Solo el Administrador (
              <span className="font-mono text-cyan-300">kcatari@tecnoedu.com.bo</span>
              ) genera y entrega las contraseñas para Bermejo, Tarija, Santa Cruz y Roboré.
            </span>
          </div>

          <div className="mt-4 max-h-[460px] space-y-2.5 overflow-y-auto pr-1">
            {cuentas.map((c) => {
              const seleccionado = email.toLowerCase() === c.email.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setModoRecuperacion(false);
                    setEmail(c.email);
                    setPassword('');
                    setErrorLogin(null);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    seleccionado
                      ? 'border-cyan-400 bg-cyan-500/15'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {c.nombre}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                        c.rol === 'ADMIN_GENERAL'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : c.rol === 'TECNICO_SUCURSAL'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {c.rol === 'ADMIN_GENERAL'
                        ? 'GERENCIA (TOTAL)'
                        : c.rol === 'TECNICO_SUCURSAL'
                          ? `TÉCNICO ${c.sucursalId} (EQUIPOS)`
                          : `SUCURSAL ${c.sucursalId}`}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-cyan-300">
                    Usuario: {c.email}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Lock className="h-3 w-3 text-slate-500" />
                    <span>Contraseña protegida · Asignada por Gerencia</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
          Cargando módulo de acceso...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
