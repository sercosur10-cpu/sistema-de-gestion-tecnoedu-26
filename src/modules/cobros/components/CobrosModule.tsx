'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  PlusCircle,
  Receipt,
  Calendar,
  Banknote,
  QrCode,
  ArrowRightLeft,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import type {
  Cliente,
  Cobro,
  MetodoPago,
  SucursalId,
} from '@/lib/supabase/database.types';
import { listarClientes } from '@/modules/clientes/services';
import {
  calcularExtractoCliente,
  eliminarCobro,
  formatearPeriodoMes,
  listarCobros,
  obtenerPeriodoActualIso,
  registrarCobro,
} from '@/modules/cobros/services';
import { BranchSelector } from '@/modules/sucursales/components/BranchSelector';
import {
  FechaManualInput,
  formatearFechaDMY,
  obtenerFechaHoyIso,
} from '@/components/ui/FechaManualInput';

interface CobrosModuleProps {
  initialSucursal?: SucursalId | 'TODAS';
  lockSucursal?: boolean;
  onDataChange?: () => void;
}

export function CobrosModule({
  initialSucursal = 'TODAS',
  lockSucursal = false,
  onDataChange,
}: CobrosModuleProps) {
  const [sucursalFiltro, setSucursalFiltro] = useState<SucursalId | 'TODAS'>(
    initialSucursal
  );
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaRecibos, setBusquedaRecibos] = useState('');

  // Formulario de cobro con sugerencia de mes consecutivo
  const [codigoCliente, setCodigoCliente] = useState('');
  const [fechaPago, setFechaPago] = useState(obtenerFechaHoyIso());
  const [monto, setMonto] = useState('180');
  const [periodoMes, setPeriodoMes] = useState(obtenerPeriodoActualIso());
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('QR');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const cargarTodo = async (codigoActual?: string) => {
    setLoading(true);
    const [listaCli, listaCob] = await Promise.all([
      listarClientes(lockSucursal ? initialSucursal : 'TODAS'),
      listarCobros(),
    ]);
    setClientes(listaCli);
    setCobros(listaCob);

    const codigoObjetivo =
      codigoActual || codigoCliente || listaCli[0]?.codigo_cliente || '';
    if (codigoObjetivo) {
      const cliObj = listaCli.find(
        (c) => c.codigo_cliente.toUpperCase() === codigoObjetivo.toUpperCase()
      );
      if (cliObj) {
        const ext = calcularExtractoCliente(cliObj, listaCob);
        setCodigoCliente(cliObj.codigo_cliente);
        setMonto(String(cliObj.precio_mensual));
        setPeriodoMes(ext.proximoMesAPagar);
      }
    }

    setLoading(false);
    onDataChange?.();
  };

  useEffect(() => {
    void cargarTodo();
  }, [initialSucursal, lockSucursal]);

  const mapaClientes = useMemo(() => {
    const map = new Map<string, Cliente>();
    for (const c of clientes) {
      map.set(c.codigo_cliente.toUpperCase(), c);
    }
    return map;
  }, [clientes]);

  const clientesDisponibles = useMemo(() => {
    const porSucursal =
      sucursalFiltro === 'TODAS'
        ? clientes
        : clientes.filter((c) => c.sucursal_id === sucursalFiltro);

    if (!busquedaCliente.trim()) return porSucursal;
    const q = busquedaCliente.toLowerCase();
    return porSucursal.filter(
      (c) =>
        c.codigo_cliente.toLowerCase().includes(q) ||
        c.nombres.toLowerCase().includes(q) ||
        c.apellidos.toLowerCase().includes(q) ||
        c.celular.includes(q)
    );
  }, [clientes, sucursalFiltro, busquedaCliente]);

  const clienteSeleccionado = useMemo(() => {
    if (!codigoCliente) return null;
    return mapaClientes.get(codigoCliente.toUpperCase()) ?? null;
  }, [codigoCliente, mapaClientes]);

  const extractoSeleccionado = useMemo(() => {
    if (!clienteSeleccionado) return null;
    return calcularExtractoCliente(clienteSeleccionado, cobros);
  }, [clienteSeleccionado, cobros]);

  const cobrosFiltrados = useMemo(() => {
    return cobros.filter((cobro) => {
      const cli = mapaClientes.get(cobro.codigo_cliente.toUpperCase());
      const coincideSucursal =
        sucursalFiltro === 'TODAS'
          ? true
          : cli
            ? cli.sucursal_id === sucursalFiltro
            : cobro.codigo_cliente.toUpperCase().startsWith(sucursalFiltro);
      if (!coincideSucursal) return false;

      if (!busquedaRecibos.trim()) return true;
      const q = busquedaRecibos.toLowerCase();
      const nombreCompleto = cli
        ? `${cli.nombres} ${cli.apellidos}`.toLowerCase()
        : '';
      return (
        cobro.codigo_cliente.toLowerCase().includes(q) ||
        nombreCompleto.includes(q) ||
        (cobro.numero_recibo ?? '').toLowerCase().includes(q) ||
        cobro.periodo_mes.includes(q)
      );
    });
  }, [cobros, sucursalFiltro, mapaClientes, busquedaRecibos]);

  const totalRecaudadoVista = useMemo(() => {
    return cobrosFiltrados.reduce((acc, c) => acc + Number(c.monto), 0);
  }, [cobrosFiltrados]);

  const handleSeleccionarCliente = (codigo: string) => {
    setCodigoCliente(codigo);
    setMensajeError(null);
    setMensajeExito(null);
    const cli = mapaClientes.get(codigo.toUpperCase());
    if (cli) {
      const ext = calcularExtractoCliente(cli, cobros);
      setMonto(String(cli.precio_mensual));
      setPeriodoMes(ext.proximoMesAPagar);
    }
  };

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    if (!codigoCliente) {
      setMensajeError('Selecciona primero un cliente válido.');
      return;
    }

    const { data, error } = await registrarCobro({
      codigo_cliente: codigoCliente,
      fecha_pago: fechaPago,
      monto: Number(monto),
      periodo_mes: periodoMes,
      metodo_pago: metodoPago,
      numero_recibo:
        numeroRecibo.trim() ||
        `REC-${codigoCliente}-${Date.now().toString().slice(-4)}`,
      observacion: observacion.trim() || null,
    });

    if (error || !data) {
      setMensajeError(error ?? 'No se pudo registrar el cobro');
      return;
    }

    setNumeroRecibo('');
    setObservacion('');
    await cargarTodo(codigoCliente);

    setMensajeExito(
      `Cobro registrado para ${data.codigo_cliente} correspondiente a ${formatearPeriodoMes(data.periodo_mes)} (${data.periodo_mes}) por Bs ${Number(data.monto).toFixed(2)} con fecha ${formatearFechaDMY(data.fecha_pago)}. El selector avanzó automáticamente al siguiente mes consecutivo.`
    );
  };

  const handleAnularCobro = async (id: string) => {
    await eliminarCobro(id);
    setMensajeExito('Cobro anulado correctamente.');
    await cargarTodo(codigoCliente);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-white">
            Registro de Cobros, Extracto de Cliente y Libro Diario
          </h2>
          <p className="text-sm text-slate-400">
            Busca un cliente para ver sus pagos anteriores, qué meses debe y registrar su próximo pago consecutivo.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-right">
          <div className="text-xs font-medium text-emerald-300">
            Total Recaudado en Vista
          </div>
          <div className="text-lg font-bold text-emerald-200">
            Bs {totalRecaudadoVista.toFixed(2)}
          </div>
        </div>
      </div>

      {!lockSucursal && (
        <BranchSelector
          selectedSucursal={sucursalFiltro}
          onChange={setSucursalFiltro}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Formulario de Registro de Cobro con Extracto del Cliente */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-5">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <PlusCircle className="h-5 w-5 text-cyan-400" />
            <span>Cobrar Mensualidad (Consecutivo)</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Busca al abonado para revisar su extracto y registrar el mes que le corresponde pagar.
          </p>

          {mensajeExito && (
            <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {mensajeExito}
            </div>
          )}
          {mensajeError && (
            <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {mensajeError}
            </div>
          )}

          <form onSubmit={handleRegistrarPago} className="mt-4 space-y-3.5">
            {/* Buscador rápido de cliente */}
            <div>
              <label className="block text-xs font-medium text-slate-300">
                1. Buscar y Seleccionar Cliente
              </label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBusquedaCliente(val);
                    const q = val.trim().toLowerCase();
                    if (q) {
                      const match = clientes.find(
                        (c) =>
                          c.codigo_cliente.toLowerCase().includes(q) ||
                          c.nombres.toLowerCase().includes(q) ||
                          c.apellidos.toLowerCase().includes(q)
                      );
                      if (match) {
                        handleSeleccionarCliente(match.codigo_cliente);
                      }
                    }
                  }}
                  placeholder="Filtrar por código (ej. BER-003) o nombre..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <select
                value={codigoCliente}
                onChange={(e) => handleSeleccionarCliente(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                {clientesDisponibles.length === 0 ? (
                  <option value="">Sin clientes para este filtro</option>
                ) : (
                  clientesDisponibles.map((c) => {
                    const ext = calcularExtractoCliente(c, cobros);
                    return (
                      <option key={c.id} value={c.codigo_cliente}>
                        {c.codigo_cliente} — {c.nombres} {c.apellidos} (Le toca:{' '}
                        {ext.proximoMesAPagar} · Bs {c.precio_mensual})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Extracto del Cliente Seleccionado */}
            {clienteSeleccionado && extractoSeleccionado && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-800 pb-2">
                  <div>
                    <span className="font-mono font-bold text-cyan-300">
                      {clienteSeleccionado.codigo_cliente}
                    </span>{' '}
                    <span className="text-slate-300">
                      · Inicio:{' '}
                      {formatearFechaDMY(clienteSeleccionado.fecha_inicio)}
                    </span>
                  </div>
                  <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
                    Próximo consecutivo: {extractoSeleccionado.proximoMesAPagar}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5">
                  <div className="text-[11px] text-slate-400">
                    Pagos anteriores y meses pendientes (clic para seleccionar):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractoSeleccionado.detalleMensual.map((m) => {
                      const activo = m.periodo === periodoMes;
                      if (m.estadoMes === 'PAGADO') {
                        return (
                          <button
                            key={m.periodo}
                            type="button"
                            onClick={() => setPeriodoMes(m.periodo)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                              activo
                                ? 'border-emerald-300 bg-emerald-500/30 text-white'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {m.etiquetaCorta} ({m.periodo}) PAGADO
                          </button>
                        );
                      }
                      return (
                        <button
                          key={m.periodo}
                          type="button"
                          onClick={() => setPeriodoMes(m.periodo)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                            activo
                              ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          <AlertCircle className="h-3 w-3" />
                          {m.etiquetaCorta} ({m.periodo}) DEBE
                        </button>
                      );
                    })}
                  </div>

                  {extractoSeleccionado.mesesQueDebe.length > 0 ? (
                    <div className="pt-1 text-[11px] text-amber-300">
                      Debe {extractoSeleccionado.mesesQueDebe.length} mes(es):{' '}
                      <strong>
                        {extractoSeleccionado.mesesQueDebe
                          .map((m) => m.periodo)
                          .join(', ')}
                      </strong>{' '}
                      (Total pendiente: Bs{' '}
                      {extractoSeleccionado.saldoPendiente.toFixed(2)})
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 pt-1 text-[11px] text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Al día hasta el mes actual. Siguiente mes consecutivo:{' '}
                      <strong>{extractoSeleccionado.proximoMesAPagar}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            <FechaManualInput
              label="Fecha de Cancelación / Pago (Día, Mes y Año)"
              value={fechaPago}
              onChange={setFechaPago}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Periodo Mes a Pagar (AAAA-MM)
                </label>
                <input
                  type="month"
                  required
                  value={periodoMes}
                  onChange={(e) => setPeriodoMes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Monto (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Método de Pago
              </label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(['QR', 'EFECTIVO', 'TRANSFERENCIA'] as MetodoPago[]).map(
                  (metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setMetodoPago(metodo)}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                        metodoPago === metodo
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {metodo}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  N° Recibo / Factura
                </label>
                <input
                  type="text"
                  value={numeroRecibo}
                  onChange={(e) => setNumeroRecibo(e.target.value)}
                  placeholder="Autogenerado si se deja vacío"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Observación
                </label>
                <input
                  type="text"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ej. Pago en oficina"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-400"
            >
              <span>
                Registrar Pago Consecutivo ({formatearPeriodoMes(periodoMes, 'corto')})
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Historial de Cobros */}
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-800 px-5 py-3.5 sm:flex-row sm:items-center">
              <h3 className="text-sm font-semibold text-white">
                Movimientos de Cobranza ({cobrosFiltrados.length})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={busquedaRecibos}
                  onChange={(e) => setBusquedaRecibos(e.target.value)}
                  placeholder="Filtrar recibos por cliente o mes..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Fecha Cancelación</th>
                    <th className="px-4 py-3">Código / Cliente</th>
                    <th className="px-4 py-3">Mes Cancelado</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Recibo</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        Cargando historial de cobros...
                      </td>
                    </tr>
                  ) : cobrosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No hay cobros registrados para esta selección.
                      </td>
                    </tr>
                  ) : (
                    cobrosFiltrados.map((cobro) => {
                      const cli = mapaClientes.get(
                        cobro.codigo_cliente.toUpperCase()
                      );
                      return (
                        <tr key={cobro.id} className="hover:bg-slate-800/40">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-300">
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Calendar className="h-3.5 w-3.5 text-slate-500" />
                              {formatearFechaDMY(cobro.fecha_pago)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleSeleccionarCliente(cobro.codigo_cliente)
                              }
                              className="text-left font-mono text-xs font-bold text-cyan-300 hover:underline"
                            >
                              {cobro.codigo_cliente}
                            </button>
                            {cli && (
                              <div className="text-xs text-slate-400">
                                {cli.nombres} {cli.apellidos}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs">
                            <div className="font-semibold text-white">
                              {formatearPeriodoMes(cobro.periodo_mes, 'corto')}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
                              {cobro.periodo_mes}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs">
                            {cobro.metodo_pago === 'QR' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 text-cyan-300">
                                <QrCode className="h-3 w-3" /> QR
                              </span>
                            )}
                            {cobro.metodo_pago === 'EFECTIVO' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                                <Banknote className="h-3 w-3" /> EFECTIVO
                              </span>
                            )}
                            {cobro.metodo_pago === 'TRANSFERENCIA' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-2 py-0.5 text-violet-300">
                                <ArrowRightLeft className="h-3 w-3" />{' '}
                                TRANSFERENCIA
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                            <div className="flex items-center gap-1 font-mono text-slate-300">
                              <Receipt className="h-3 w-3 text-slate-500" />
                              {cobro.numero_recibo || '—'}
                            </div>
                            {cobro.observacion && (
                              <div className="max-w-[160px] truncate text-[11px] text-slate-500">
                                {cobro.observacion}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-300">
                            Bs {Number(cobro.monto).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleAnularCobro(cobro.id)}
                              title="Anular / Eliminar cobro"
                              className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 transition hover:bg-rose-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
