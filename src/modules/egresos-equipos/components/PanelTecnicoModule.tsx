'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wrench,
  Package,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type { Cliente, SucursalId } from '@/lib/supabase/database.types';
import { SUCURSALES_META } from '@/modules/sucursales/constants';
import { listarClientes } from '@/modules/clientes/services';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  listarEquiposInventario,
  registrarOperacionTecnico,
  type EquipoClienteItem,
  type EstadoEquipoCliente,
} from '../services';

const ETIQUETAS_ESTADO_EQUIPO: Record<EstadoEquipoCliente, { label: string }> =
  {
    EN_STOCK: { label: 'En Stock (Almacén)' },
    EN_PODER_TECNICO: { label: 'En Poder del Técnico' },
    INSTALADO_CLIENTE: { label: 'Instalado en Cliente' },
    EN_OBSERVACION_CASA: { label: 'En Observación (Casa)' },
    BAJA_QUEMADO: { label: 'Baja (Quemado)' },
  };

interface PanelTecnicoModuleProps {
  sucursalFija?: SucursalId;
}

export function PanelTecnicoModule({ sucursalFija }: PanelTecnicoModuleProps) {
  const { usuarioActivo, cuentas } = useAuth();

  const sucursalRestringida =
    sucursalFija ??
    (usuarioActivo?.rol === 'OPERADOR_SUCURSAL'
      ? (usuarioActivo.sucursalId ?? undefined)
      : undefined);

  // Si es Administrativo de Agencia (o viene con sucursalFija), solo ve los técnicos de SU propia Agencia;
  // Si es Gerencia Central sin sucursalFija, puede ver todos;
  // Si es un Técnico, queda bloqueado a su propia cuenta.
  const tecnicosCuentas = useMemo(
    () =>
      cuentas.filter(
        (c) =>
          c.rol === 'TECNICO_SUCURSAL' &&
          (!sucursalRestringida || c.sucursalId === sucursalRestringida)
      ),
    [cuentas, sucursalRestringida]
  );

  const esTecnicoRestringido = usuarioActivo?.rol === 'TECNICO_SUCURSAL';

  const [emailTecnicoActivo, setEmailTecnicoActivo] = useState<string>(
    esTecnicoRestringido && usuarioActivo
      ? usuarioActivo.email
      : (tecnicosCuentas[0]?.email ?? 'pedro.tarija@tecnoedu.com.bo')
  );

  useEffect(() => {
    if (esTecnicoRestringido && usuarioActivo) {
      setEmailTecnicoActivo(usuarioActivo.email);
      return;
    }
    if (
      tecnicosCuentas.length > 0 &&
      !tecnicosCuentas.some(
        (t) => t.email.toLowerCase() === emailTecnicoActivo.toLowerCase()
      )
    ) {
      setEmailTecnicoActivo(tecnicosCuentas[0].email);
    }
  }, [esTecnicoRestringido, usuarioActivo, tecnicosCuentas, emailTecnicoActivo]);

  const cuentaTecnicoSeleccionada = useMemo(() => {
    if (esTecnicoRestringido && usuarioActivo) return usuarioActivo;
    return (
      tecnicosCuentas.find(
        (t) => t.email.toLowerCase() === emailTecnicoActivo.toLowerCase()
      ) ?? {
        id: 'usr-tec-tar-pedro',
        nombre: 'Técnico 1: Pedro',
        cargo: 'Técnico de Campo e Instalaciones — Tarija (TAR)',
        email: 'pedro.tarija@tecnoedu.com.bo',
        rol: 'TECNICO_SUCURSAL' as const,
        sucursalId: 'TAR' as SucursalId,
      }
    );
  }, [esTecnicoRestringido, usuarioActivo, tecnicosCuentas, emailTecnicoActivo]);

  const sucursalTecnico: SucursalId =
    cuentaTecnicoSeleccionada.sucursalId ?? 'TAR';

  const [equiposSucursal, setEquiposSucursal] = useState<EquipoClienteItem[]>(
    []
  );
  const [clientesSucursal, setClientesSucursal] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Formulario de descargo / reemplazo del técnico
  const [equipoNuevoId, setEquipoNuevoId] = useState<string>('');
  const [tipoOperacion, setTipoOperacion] = useState<
    'REEMPLAZO_POR_FALLA' | 'INSTALACION_NUEVA'
  >('REEMPLAZO_POR_FALLA');
  const [clienteSeleccionadoCodigo, setClienteSeleccionadoCodigo] =
    useState<string>('');
  const [serieEquipoRetirado, setSerieEquipoRetirado] = useState<string>(
    'SN-RET-AVERIA-09'
  );
  const [motivoFallaRetiro, setMotivoFallaRetiro] = useState<string>(
    'Reemplazo por quema de equipo tras corte eléctrico / descarga. Se instala equipo nuevo y se retira el dañado para chequeo o reseteo en casa.'
  );

  const coincideConTecnico = useCallback(
    (responsable: string | null) => {
      if (!responsable) return false;
      const respNorm = responsable.toLowerCase();
      const nombreNorm = cuentaTecnicoSeleccionada.nombre.toLowerCase();
      if (
        cuentaTecnicoSeleccionada.email.toLowerCase().includes('pedro') &&
        respNorm.includes('pedro')
      ) {
        return true;
      }
      return (
        respNorm.includes(nombreNorm) ||
        nombreNorm.includes(respNorm)
      );
    },
    [cuentaTecnicoSeleccionada]
  );

  const cargarDatosTecnico = useCallback(async () => {
    setCargando(true);
    const [listaEquipos, listaClientes] = await Promise.all([
      listarEquiposInventario(sucursalTecnico),
      listarClientes(sucursalTecnico),
    ]);
    setEquiposSucursal(listaEquipos);
    setClientesSucursal(listaClientes);

    // Preseleccionar primer equipo en custodia del técnico y primer cliente
    const misEquiposEnMano = listaEquipos.filter(
      (eq) =>
        eq.estado === 'EN_PODER_TECNICO' &&
        coincideConTecnico(eq.tecnico_responsable)
    );
    if (misEquiposEnMano.length > 0) {
      setEquipoNuevoId(misEquiposEnMano[0].id);
    } else {
      setEquipoNuevoId('');
    }

    if (listaClientes.length > 0) {
      setClienteSeleccionadoCodigo((prev) =>
        prev && listaClientes.some((c) => c.codigo_cliente === prev)
          ? prev
          : listaClientes[0].codigo_cliente
      );
    }

    setCargando(false);
  }, [sucursalTecnico, coincideConTecnico]);

  useEffect(() => {
    cargarDatosTecnico();
  }, [cargarDatosTecnico]);

  // Equipos que actualmente están en manos de este técnico y por los que debe responder
  const misEquiposEnPoder = useMemo(
    () =>
      equiposSucursal.filter(
        (eq) =>
          eq.estado === 'EN_PODER_TECNICO' &&
          coincideConTecnico(eq.tecnico_responsable)
      ),
    [equiposSucursal, coincideConTecnico]
  );

  // Equipos donde este técnico ya intervino (instalados o retirados a observación en casa)
  const misMovimientosRecientes = useMemo(
    () =>
      equiposSucursal.filter(
        (eq) =>
          eq.estado !== 'EN_PODER_TECNICO' &&
          coincideConTecnico(eq.tecnico_responsable)
      ),
    [equiposSucursal, coincideConTecnico]
  );

  const handleRegistrarDescargo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    const nombreResponsable = cuentaTecnicoSeleccionada.email
      .toLowerCase()
      .includes('pedro')
      ? 'Pedro (Técnico 1 - Tarija)'
      : cuentaTecnicoSeleccionada.nombre;

    const res = await registrarOperacionTecnico({
      equipo_id: equipoNuevoId,
      tipo_operacion: tipoOperacion,
      codigo_cliente: clienteSeleccionadoCodigo,
      motivo_reemplazo: motivoFallaRetiro,
      serie_equipo_retirado: serieEquipoRetirado,
      fecha_operacion: new Date().toISOString().slice(0, 10),
      nombre_tecnico: nombreResponsable,
    });

    if (!res.ok) {
      setMensajeError(res.mensaje);
      return;
    }

    setMensajeExito(res.mensaje);
    await cargarDatosTecnico();
  };

  return (
    <div className="space-y-6">
      {/* Cabecera de Acceso Limitado del Técnico */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-5 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300">
            <Wrench className="h-3.5 w-3.5" />
            Acceso Limitado de Técnico — Sucursal{' '}
            {SUCURSALES_META[sucursalTecnico]?.nombre} ({sucursalTecnico})
          </span>
          <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            Panel de Equipos Asignados y Reemplazos (
            {cuentaTecnicoSeleccionada.nombre})
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Aquí respondes únicamente por los equipos entregados a tu cargo.
            Cuando reemplazas un equipo en un cliente:{' '}
            <strong>sale 1 equipo nuevo</strong> de tu custodia e{' '}
            <strong>ingresa 1 equipo dañado en observación</strong> para
            chequeo/reseteo en casa.
          </p>
        </div>

        {/* Selector visible para Administrativo de Agencia (solo sus técnicos) o Gerencia Central */}
        {!esTecnicoRestringido && (
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {sucursalRestringida
                ? `Técnicos de Agencia ${SUCURSALES_META[sucursalRestringida].nombre} (${tecnicosCuentas.length}):`
                : 'Supervisión de Técnicos — Seleccionar:'}
            </label>
            <select
              value={emailTecnicoActivo}
              onChange={(e) => setEmailTecnicoActivo(e.target.value)}
              className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
            >
              {tecnicosCuentas.map((t) => (
                <option key={t.id} value={t.email}>
                  {t.nombre} ({t.sucursalId}) — {t.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Mensajes de confirmación */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-[11px] underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{mensajeError}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeError(null)}
            className="text-[11px] underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Resumen de Responsabilidad del Técnico */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300">
              Equipos Nuevos en Tu Poder (Por Responder)
            </span>
            <Package className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {misEquiposEnPoder.length}
          </div>
          <p className="mt-1 text-[11px] text-cyan-200/80">
            Equipos que recibiste de almacén y debes justificar con instalación
            o reemplazo.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300">
              Equipos Nuevos ya Instalados por Ti
            </span>
            <UserCheck className="h-5 w-5 text-blue-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {
              misMovimientosRecientes.filter(
                (e) => e.estado === 'INSTALADO_CLIENTE'
              ).length
            }
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Equipos descargados y asignados a un cliente de {sucursalTecnico}.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">
              Equipos Dañados Entregados a Observación (Casa)
            </span>
            <RotateCcw className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-200">
            {
              misMovimientosRecientes.filter(
                (e) =>
                  e.estado === 'EN_OBSERVACION_CASA' ||
                  e.estado === 'BAJA_QUEMADO'
              ).length
            }
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Retirados del cliente para chequeo/reseteo en casa (Alta o Baja).
          </p>
        </div>
      </div>

      {/* Cuerpo Principal: Mis Equipos en Mano + Formulario de Reemplazo/Instalación */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna Izquierda: Lista de Equipos Asignados al Técnico */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-5">
          <h2 className="text-sm font-bold text-white">
            1. Equipos que Recibiste y Tienes en Mano ({misEquiposEnPoder.length}
            )
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Selecciona cuál de tus equipos asignados vas a instalar o usar como
            reemplazo hoy.
          </p>

          {cargando ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Cargando tus equipos asignados...
            </div>
          ) : misEquiposEnPoder.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-5 text-center">
              <ShieldAlert className="mx-auto h-6 w-6 text-emerald-400" />
              <div className="mt-2 text-xs font-bold text-white">
                No tienes equipos pendientes por descargar
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Todos los equipos que recibiste ya fueron justificados. Solicita
                a Administración que te entregue un nuevo lote si tienes salidas
                de campo.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {misEquiposEnPoder.map((eq) => {
                const seleccionado = equipoNuevoId === eq.id;
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setEquipoNuevoId(eq.id)}
                    className={`w-full rounded-xl border p-3.5 text-left transition ${
                      seleccionado
                        ? 'border-cyan-400 bg-cyan-500/15 text-white'
                        : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        {eq.codigo_equipo}
                      </span>
                      <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-200">
                        EN TU CUSTODIA
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-white">
                      {eq.tipo_equipo} — {eq.marca_modelo}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-400">
                      Serie/MAC: {eq.serie_mac} · Últ. mov.:{' '}
                      {eq.fecha_ultimo_movimiento}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Formulario de Reemplazo (Sale 1 Nuevo -> Entra 1 Dañado a Observación) */}
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-5 lg:col-span-7">
          <div className="flex items-center gap-2 text-cyan-400">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              2. Responder por Equipo Asignado (Actualizar Base de Datos)
            </span>
          </div>
          <h2 className="mt-1 text-base font-bold text-white">
            Registrar Reemplazo por Quema/Falla o Instalación en Cliente
          </h2>

          <form onSubmit={handleRegistrarDescargo} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTipoOperacion('REEMPLAZO_POR_FALLA')}
                className={`rounded-xl border p-3 text-left transition ${
                  tipoOperacion === 'REEMPLAZO_POR_FALLA'
                    ? 'border-amber-400 bg-amber-500/15 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-amber-300">
                  Opción A: Reemplazo en Trabajo (Quema / Falla)
                </div>
                <div className="mt-1 text-[11px] text-slate-300">
                  Sale 1 equipo nuevo de tu poder + Ingresa 1 equipo dañado a{' '}
                  <strong>Observación en Casa</strong>.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoOperacion('INSTALACION_NUEVA')}
                className={`rounded-xl border p-3 text-left transition ${
                  tipoOperacion === 'INSTALACION_NUEVA'
                    ? 'border-emerald-400 bg-emerald-500/15 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-emerald-300">
                  Opción B: Instalación en Cliente Nuevo
                </div>
                <div className="mt-1 text-[11px] text-slate-300">
                  Sale 1 equipo nuevo de tu poder y queda instalado en el
                  cliente (sin retiro de equipo previo).
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Equipo Nuevo que Sale de Tu Custodia
                </label>
                <select
                  required
                  value={equipoNuevoId}
                  onChange={(e) => setEquipoNuevoId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  {misEquiposEnPoder.length === 0 ? (
                    <option value="">Sin equipos en custodia</option>
                  ) : (
                    misEquiposEnPoder.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.codigo_equipo} — {eq.tipo_equipo} ({eq.serie_mac})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Cliente Atendido en Sucursal {sucursalTecnico}
                </label>
                <select
                  required
                  value={clienteSeleccionadoCodigo}
                  onChange={(e) => setClienteSeleccionadoCodigo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  {clientesSucursal.map((c) => (
                    <option key={c.id} value={c.codigo_cliente}>
                      {c.codigo_cliente} — {c.nombres} {c.apellidos} (
                      {c.zona_comunidad ?? c.direccion ?? 'Zona'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {tipoOperacion === 'REEMPLAZO_POR_FALLA' && (
              <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/15 p-3.5">
                <div className="text-xs font-bold text-amber-300">
                  Datos del Equipo Dañado que Retiras del Cliente (Ingresa a
                  Observación en Casa)
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Serie / MAC del Equipo Dañado Retirado (Opcional)
                  </label>
                  <input
                    type="text"
                    value={serieEquipoRetirado}
                    onChange={(e) => setSerieEquipoRetirado(e.target.value)}
                    placeholder="Ej. SN-RET-TAR-088"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Motivo del Reemplazo (Quema de equipo, luz ROJA LOS,
                    reinicio, etc.) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={motivoFallaRetiro}
                    onChange={(e) => setMotivoFallaRetiro(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!equipoNuevoId}
              className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-40"
            >
              {tipoOperacion === 'REEMPLAZO_POR_FALLA'
                ? 'Confirmar Reemplazo: Descargar 1 Equipo Nuevo e Ingresar 1 Equipo en Observación'
                : 'Confirmar Instalación de 1 Equipo Nuevo en Cliente'}
            </button>
          </form>
        </div>
      </div>

      {/* Historial de Equipos Descargados y Retirados por este Técnico */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-bold text-white">
          3. Historial de Equipos Descargados / En Observación por{' '}
          {cuentaTecnicoSeleccionada.nombre} ({misMovimientosRecientes.length})
        </h2>
        <p className="text-xs text-slate-400">
          Registro transparente de cada equipo que instalaste y de los equipos
          dañados que entregaste para chequeo o reseteo en casa.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-3">Código / Serie</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Cliente Asociado</th>
                <th className="py-2 pl-3">
                  Detalle de Operación / Chequeo Casa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {misMovimientosRecientes.map((eq) => (
                <tr key={eq.id}>
                  <td className="py-2.5 pr-3">
                    <div className="font-mono font-bold text-white">
                      {eq.codigo_equipo}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {eq.serie_mac}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                      {ETIQUETAS_ESTADO_EQUIPO[eq.estado].label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-200">
                    {eq.codigo_cliente_instalado ?? '—'}
                  </td>
                  <td className="py-2.5 pl-3 text-[11px] text-slate-300">
                    <div>{eq.historial_ultimo_cambio}</div>
                    {eq.motivo_observacion_baja && (
                      <div className="mt-0.5 text-amber-300">
                        Obs: {eq.motivo_observacion_baja}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
