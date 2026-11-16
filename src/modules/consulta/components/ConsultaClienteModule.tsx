'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Wifi,
  Radio,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Receipt,
  MapPin,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import type { Cliente, Cobro, SucursalId } from '@/lib/supabase/database.types';
import {
  buscarClientePorCodigo,
  listarClientes,
} from '@/modules/clientes/services';
import {
  calcularExtractoCliente,
  formatearPeriodoMes,
  listarCobros,
  obtenerPeriodoActualIso,
} from '@/modules/cobros/services';
import {
  isValidSucursalId,
  SUCURSALES_META,
} from '@/modules/sucursales/constants';
import { formatearFechaDMY } from '@/components/ui/FechaManualInput';
import { useAuth } from '@/modules/auth/AuthContext';

const CODIGOS_DEMO_POR_SUCURSAL: Record<SucursalId, string[]> = {
  BER: ['BER-001', 'BER-002', 'BER-003'],
  TAR: ['TAR-001', 'TAR-002'],
  SCZ: ['SCZ-001', 'SCZ-010'],
  ROB: ['ROB-001', 'ROB-006', 'AGC-001', 'AGC-004'],
};

export function ConsultaClienteModule() {
  const searchParams = useSearchParams();
  const { usuarioActivo } = useAuth();
  const codigoUrl = searchParams.get('codigo');
  const sucursalParam = searchParams.get('sucursal')?.toUpperCase() ?? '';

  // Si hay un operador de sucursal con sesión activa, la consulta queda bloqueada a su sucursal
  const sucursalBloqueada: SucursalId | null =
    usuarioActivo?.rol === 'OPERADOR_SUCURSAL' && usuarioActivo.sucursalId
      ? usuarioActivo.sucursalId
      : isValidSucursalId(sucursalParam)
        ? sucursalParam
        : null;

  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<
    SucursalId | 'TODAS'
  >(sucursalBloqueada ?? 'TODAS');

  const sucursalEfectiva: SucursalId | 'TODAS' =
    sucursalBloqueada ?? sucursalSeleccionada;

  const defaultCodigo =
    codigoUrl ||
    (sucursalBloqueada
      ? `${sucursalBloqueada}-001`
      : 'ROB-001');

  const [codigoInput, setCodigoInput] = useState(defaultCodigo);
  const [periodoMes, setPeriodoMes] = useState(obtenerPeriodoActualIso());
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [buscado, setBuscado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorSucursalRestringida, setErrorSucursalRestringida] = useState<
    string | null
  >(null);

  const consultarCodigo = async (
    termino: string,
    sucFiltro: SucursalId | 'TODAS' = sucursalEfectiva
  ) => {
    const limpio = termino.trim();
    if (!limpio) return;
    setCargando(true);
    setBuscado(true);
    setErrorSucursalRestringida(null);

    let cli = await buscarClientePorCodigo(limpio);
    if (!cli) {
      // Permitir búsqueda también por nombre o apellido dentro de la sucursal que corresponda
      const todos = await listarClientes(sucFiltro);
      const q = limpio.toLowerCase();
      cli =
        todos.find(
          (c) =>
            c.codigo_cliente.toLowerCase().includes(q) ||
            `${c.nombres} ${c.apellidos}`.toLowerCase().includes(q) ||
            c.celular.includes(q)
        ) ?? null;
    }

    // Verificar si el cliente pertenece a una sucursal restringida para el operador activo
    if (cli && sucFiltro !== 'TODAS' && cli.sucursal_id !== sucFiltro) {
      setCliente(null);
      setCobros([]);
      setErrorSucursalRestringida(
        `El abonado ${cli.codigo_cliente} pertenece a otra sucursal (${cli.sucursal_id}). Esta consulta está restringida únicamente a la Sucursal ${SUCURSALES_META[sucFiltro].nombre} (${sucFiltro}).`
      );
      setCargando(false);
      return;
    }

    setCliente(cli);
    if (cli) {
      if (!sucursalBloqueada && sucursalSeleccionada !== cli.sucursal_id) {
        setSucursalSeleccionada(cli.sucursal_id);
      }
      const historial = await listarCobros(cli.codigo_cliente);
      setCobros(historial);
    } else {
      setCobros([]);
    }
    setCargando(false);
  };

  useEffect(() => {
    if (sucursalBloqueada) {
      setSucursalSeleccionada(sucursalBloqueada);
    }
    const inicial = codigoUrl
      ? codigoUrl.toUpperCase()
      : sucursalBloqueada
        ? `${sucursalBloqueada}-001`
        : 'ROB-001';
    setCodigoInput(inicial);
    void consultarCodigo(inicial, sucursalBloqueada ?? 'TODAS');
  }, [codigoUrl, sucursalBloqueada]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await consultarCodigo(codigoInput, sucursalEfectiva);
  };

  const codigosDemoVisibles =
    sucursalEfectiva !== 'TODAS'
      ? CODIGOS_DEMO_POR_SUCURSAL[sucursalEfectiva]
      : ['ROB-001', 'ROB-006', 'AGC-001', 'AGC-004', 'BER-001'];

  const extracto = useMemo(() => {
    if (!cliente) return null;
    return calcularExtractoCliente(cliente, cobros, periodoMes);
  }, [cliente, cobros, periodoMes]);

  const sucursalMeta = cliente ? SUCURSALES_META[cliente.sucursal_id] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Buscador de código o nombre de abonado */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white">
            Consulta de Extracto de Pagos y Mes a Pagar
          </h2>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400">Corte:</span>
            <input
              type="month"
              value={periodoMes}
              onChange={(e) => setPeriodoMes(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {sucursalBloqueada ? (
            <>
              Consulta restringida exclusivamente a la{' '}
              <strong className="text-cyan-300">
                Sucursal {SUCURSALES_META[sucursalBloqueada].nombre} (
                {sucursalBloqueada})
              </strong>
              .
            </>
          ) : (
            <>
              Selecciona tu sucursal y busca por código o nombre para visualizar
              pagos anteriores, qué meses debe y qué mes corresponde pagar.
            </>
          )}
        </p>

        {/* Selector de Sucursal Correspondiente */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">
            Sucursal de Consulta:
          </span>
          {(['BER', 'TAR', 'SCZ', 'ROB'] as SucursalId[]).map((sucId) => {
            const bloqueado =
              Boolean(sucursalBloqueada) && sucursalBloqueada !== sucId;
            if (bloqueado) return null;
            const activo = sucursalEfectiva === sucId;
            return (
              <button
                key={sucId}
                type="button"
                disabled={Boolean(sucursalBloqueada)}
                onClick={() => {
                  setSucursalSeleccionada(sucId);
                  const ej = `${sucId}-001`;
                  setCodigoInput(ej);
                  void consultarCodigo(ej, sucId);
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                  activo
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {sucId} · {SUCURSALES_META[sucId].nombre}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              required
              value={codigoInput}
              onChange={(e) => setCodigoInput(e.target.value)}
              placeholder={`Ej. ${sucursalEfectiva !== 'TODAS' ? `${sucursalEfectiva}-001` : 'BER-001'} o nombre del cliente...`}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {cargando ? 'Buscando...' : 'Consultar'}
          </button>
        </form>

        {/* Chips de prueba rápida de la sucursal */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500">
            Consulta rápida ({sucursalEfectiva}):
          </span>
          {codigosDemoVisibles.map((cod) => (
            <button
              key={cod}
              type="button"
              onClick={() => {
                setCodigoInput(cod);
                void consultarCodigo(cod, sucursalEfectiva);
              }}
              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-cyan-300 hover:border-cyan-500/40"
            >
              {cod}
            </button>
          ))}
        </div>
      </div>

      {/* Resultado de la consulta */}
      {errorSucursalRestringida && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center text-sm text-amber-200">
          {errorSucursalRestringida}
        </div>
      )}

      {buscado && !cargando && !cliente && !errorSucursalRestringida && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-center text-sm text-rose-200">
          No encontramos ningún abonado en la sucursal{' '}
          <span className="font-mono font-bold">{sucursalEfectiva}</span> que
          coincida con <span className="font-mono font-bold">{codigoInput}</span>
          .
        </div>
      )}

      {cliente && extracto && (
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-cyan-400">
                  {cliente.codigo_cliente}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium ${sucursalMeta?.colorBadge}`}
                >
                  Sucursal {sucursalMeta?.nombre}
                </span>
                <span className="text-xs text-slate-400">
                  · Inicio: {formatearFechaDMY(cliente.fecha_inicio)}
                </span>
              </div>
              <h3 className="mt-1 text-lg font-bold text-white">
                {cliente.nombres} {cliente.apellidos}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                {cliente.zona_comunidad} — {cliente.direccion}
              </p>
            </div>

            <div>
              {cliente.estado === 'INACTIVO' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300">
                  SERVICIO DE BAJA (INACTIVO)
                </span>
              ) : extracto.pagadoPeriodoActual ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> SERVICIO AL DÍA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                  <AlertCircle className="h-4 w-4" /> DEBE{' '}
                  {extracto.mesesQueDebe.length} MES(ES)
                </span>
              )}
            </div>
          </div>

          {/* Tarjetas de Resumen del Extracto */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5">
              <div className="text-xs font-medium text-cyan-300">
                Mes que Corresponde Pagar
              </div>
              <div className="mt-1 flex items-center gap-1 text-base font-extrabold text-white">
                <ArrowRight className="h-4 w-4 text-cyan-400" />
                <span>
                  {formatearPeriodoMes(extracto.proximoMesAPagar, 'corto')} (
                  {extracto.proximoMesAPagar})
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-cyan-200/80">
                Siguiente pago consecutivo
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="text-xs text-slate-400">
                Deuda Acumulada Pendiente
              </div>
              <div
                className={`mt-1 text-xl font-bold ${
                  extracto.saldoPendiente > 0
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                Bs {extracto.saldoPendiente.toFixed(2)}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {extracto.mesesQueDebe.length > 0
                  ? `Debe: ${extracto.mesesQueDebe.map((m) => m.etiquetaCorta).join(', ')}`
                  : 'Sin meses adeudados'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="text-xs text-slate-400">
                Tarifa Mensual / Enlace
              </div>
              <div className="mt-1 text-xl font-bold text-white">
                Bs {Number(cliente.precio_mensual).toFixed(2)}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
                {cliente.tipo_tecnologia === 'FIBRA' ? (
                  <>
                    <Wifi className="h-3.5 w-3.5" /> Fibra Óptica
                  </>
                ) : (
                  <>
                    <Radio className="h-3.5 w-3.5" /> Antena Inalámbrica
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Extracto Mensual Consecutivo (Pagos Anteriores y Meses que Debe) */}
          <div className="pt-1">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Receipt className="h-3.5 w-3.5 text-cyan-400" />
              Extracto de Pagos Anteriores y Meses Pendientes
            </h4>

            <div className="mt-2.5 space-y-2">
              {extracto.detalleMensual.map((item) => (
                <div
                  key={item.periodo}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs transition ${
                    item.estadoMes === 'PAGADO'
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : item.estadoMes === 'PARCIAL'
                        ? 'border-amber-500/40 bg-amber-500/15'
                        : item.estadoMes === 'INACTIVO'
                          ? 'border-slate-800 bg-slate-900/40 text-slate-400'
                          : 'border-rose-500/30 bg-rose-500/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="font-mono text-cyan-300">
                        {item.periodo}
                      </span>
                      <span>— {item.etiquetaLarga}</span>
                      {item.estadoMes === 'PAGADO' ? (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          PAGADO
                        </span>
                      ) : item.estadoMes === 'PARCIAL' ? (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          PAGO PARCIAL
                        </span>
                      ) : item.estadoMes === 'INACTIVO' ? (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          INACTIVO
                        </span>
                      ) : item.estadoMes === 'FUTURO' ? (
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                          MES PRÓXIMO
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                          DEBE MES
                        </span>
                      )}
                    </div>
                    {item.estadoMes === 'PAGADO' && item.ultimoReciboMes ? (
                      <div className="mt-0.5 text-slate-300">
                        Fecha cancelación:{' '}
                        <span className="font-mono font-semibold text-white">
                          {formatearFechaDMY(item.ultimoReciboMes.fecha_pago)}
                        </span>{' '}
                        · {item.ultimoReciboMes.metodo_pago} · Recibo:{' '}
                        <span className="font-mono">
                          {item.ultimoReciboMes.numero_recibo || 'S/N'}
                        </span>
                      </div>
                    ) : item.estadoMes === 'PARCIAL' ? (
                      <div className="mt-0.5 text-amber-200">
                        Abonado: <span className="font-mono font-semibold text-white">Bs {item.montoPagado.toFixed(2)}</span> · Saldo pendiente: <span className="font-mono font-semibold text-amber-300">Bs {item.montoDebe.toFixed(2)}</span>
                      </div>
                    ) : item.estadoMes === 'INACTIVO' ? (
                      <div className="mt-0.5 text-slate-500">
                        Servicio en estado inactivo durante este periodo
                      </div>
                    ) : (
                      <div className="mt-0.5 text-slate-400">
                        Mensualidad pendiente de cancelación
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    {item.estadoMes === 'PAGADO' ? (
                      <span className="text-sm font-bold text-emerald-300">
                        Pagado: Bs {item.montoPagado.toFixed(2)}
                      </span>
                    ) : item.estadoMes === 'PARCIAL' ? (
                      <div>
                        <div className="text-sm font-bold text-amber-300">
                          Resta: Bs {item.montoDebe.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Abonado: Bs {item.montoPagado.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-rose-300">
                        Debe: Bs {item.montoDebe.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Soporte Técnico Sucursal */}
          {sucursalMeta && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3.5 text-xs">
              <div>
                <div className="font-semibold text-cyan-200">
                  Soporte Técnico {sucursalMeta.nombre} ({sucursalMeta.id})
                </div>
                <div className="text-cyan-300/80">
                  ¿Deseas enviar tu comprobante del mes{' '}
                  <strong>{extracto.proximoMesAPagar}</strong> o reportar
                  soporte?
                </div>
              </div>
              <a
                href={`https://wa.me/${sucursalMeta.telefonoSoporteDefault}?text=${encodeURIComponent(
                  `Hola Soporte TecnoEdu (${sucursalMeta.nombre}), mi código de cliente es ${cliente.codigo_cliente} y deseo consultar/enviar comprobante del periodo ${extracto.proximoMesAPagar}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 font-bold text-slate-950 hover:bg-cyan-400"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                WhatsApp Soporte
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
