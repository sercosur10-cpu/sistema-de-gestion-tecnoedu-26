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
  Printer,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Filter,
} from 'lucide-react';
import type {
  Cliente,
  Cobro,
  MetodoPago,
  SucursalId,
} from '@/lib/supabase/database.types';
import { listarClientes } from '@/modules/clientes/services';
import {
  agruparCobrosPorDia,
  calcularExtractoCliente,
  calcularResumenCaja,
  eliminarCobro,
  formatearPeriodoMes,
  listarCobros,
  normalizarPeriodoMes,
  obtenerPeriodoActualIso,
  registrarCobro,
  sumarMesesPeriodo,
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

type ModoArqueo = 'DIA' | 'MES' | 'TODOS';
type SubVistaMes = 'DESGLOSE_DIARIO' | 'RECIBOS';

function moverDia(fechaIso: string, deltaDias: number): string {
  const partes = fechaIso.split('-');
  if (partes.length !== 3) return fechaIso;
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  const d = new Date(anio, mes, dia + deltaDias);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatearFechaCompleta(fechaIso: string): string {
  const partes = fechaIso.split('-');
  if (partes.length !== 3) return fechaIso;
  const anio = parseInt(partes[0], 10);
  const mesIndex = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  const d = new Date(anio, mesIndex, dia);
  const dias = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const diaSemana = dias[d.getDay()] ?? '';
  const nombreMes = meses[mesIndex] ?? partes[1];
  return `${diaSemana}, ${dia} de ${nombreMes} de ${anio}`;
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

  // Control de Arqueo de Ingresos (Día, Mes, Todos)
  const [modoArqueo, setModoArqueo] = useState<ModoArqueo>('DIA');
  const [fechaConsultaDia, setFechaConsultaDia] = useState<string>(
    obtenerFechaHoyIso()
  );
  const [mesConsulta, setMesConsulta] = useState<string>(
    obtenerPeriodoActualIso()
  );
  const [subVistaMes, setSubVistaMes] =
    useState<SubVistaMes>('DESGLOSE_DIARIO');

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

  // Cobros filtrados por sucursal
  const cobrosDeSucursal = useMemo(() => {
    return cobros.filter((cobro) => {
      if (sucursalFiltro === 'TODAS') return true;
      const cli = mapaClientes.get(cobro.codigo_cliente.toUpperCase());
      return cli
        ? cli.sucursal_id === sucursalFiltro
        : cobro.codigo_cliente.toUpperCase().startsWith(sucursalFiltro);
    });
  }, [cobros, sucursalFiltro, mapaClientes]);

  // Cobros según el periodo seleccionado (Día, Mes o Todos)
  const cobrosDelPeriodo = useMemo(() => {
    if (modoArqueo === 'DIA') {
      return cobrosDeSucursal.filter(
        (c) => (c.fecha_pago || '').slice(0, 10) === fechaConsultaDia
      );
    }
    if (modoArqueo === 'MES') {
      return cobrosDeSucursal.filter(
        (c) => (c.fecha_pago || '').slice(0, 7) === mesConsulta
      );
    }
    return cobrosDeSucursal;
  }, [cobrosDeSucursal, modoArqueo, fechaConsultaDia, mesConsulta]);

  // Resumen de Caja Física vs Lógica para el periodo seleccionado
  const resumenCajaPeriodo = useMemo(() => {
    return calcularResumenCaja(cobrosDelPeriodo);
  }, [cobrosDelPeriodo]);

  // Desglose diario para la vista mensual
  const desgloseDiarioMes = useMemo(() => {
    if (modoArqueo !== 'MES') return [];
    return agruparCobrosPorDia(cobrosDelPeriodo);
  }, [cobrosDelPeriodo, modoArqueo]);

  // Cobros finales filtrados por búsqueda de texto
  const cobrosFiltrados = useMemo(() => {
    if (!busquedaRecibos.trim()) return cobrosDelPeriodo;
    const q = busquedaRecibos.toLowerCase();
    return cobrosDelPeriodo.filter((cobro) => {
      const cli = mapaClientes.get(cobro.codigo_cliente.toUpperCase());
      const nombreCompleto = cli
        ? `${cli.nombres} ${cli.apellidos}`.toLowerCase()
        : '';
      return (
        cobro.codigo_cliente.toLowerCase().includes(q) ||
        nombreCompleto.includes(q) ||
        (cobro.numero_recibo ?? '').toLowerCase().includes(q) ||
        cobro.periodo_mes.includes(q) ||
        cobro.metodo_pago.toLowerCase().includes(q)
      );
    });
  }, [cobrosDelPeriodo, busquedaRecibos, mapaClientes]);

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
      `Cobro registrado para ${data.codigo_cliente} correspondiente a ${formatearPeriodoMes(data.periodo_mes)} (${data.periodo_mes}) por Bs ${Number(data.monto).toFixed(2)} con fecha ${formatearFechaDMY(data.fecha_pago)}. La caja se actualizó automáticamente.`
    );
  };

  const handleAnularCobro = async (id: string) => {
    if (!window.confirm('¿Estás seguro de anular y revertir este cobro?')) {
      return;
    }
    await eliminarCobro(id);
    setMensajeExito('Cobro anulado correctamente.');
    await cargarTodo(codigoCliente);
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          PANEL PRINCIPAL DE CONTROL DE CAJA E INGRESOS (FÍSICA VS LÓGICA)
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Banknote className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Arqueo de Ingresos y Control de Caja (Física vs Lógica)
                </h2>
                <p className="text-xs text-slate-400">
                  {modoArqueo === 'DIA'
                    ? `Arqueo Diario: ${formatearFechaCompleta(fechaConsultaDia)}`
                    : modoArqueo === 'MES'
                      ? `Consolidado Mensual: ${formatearPeriodoMes(mesConsulta, 'largo')}`
                      : 'Histórico Completo de Recaudación'}
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Modalidad: Por Día | Por Mes | Todos */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setModoArqueo('DIA')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                modoArqueo === 'DIA'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Arqueo Diario (Por Día)</span>
            </button>

            <button
              type="button"
              onClick={() => setModoArqueo('MES')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                modoArqueo === 'MES'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Acumulado Mensual (Por Mes)</span>
            </button>

            <button
              type="button"
              onClick={() => setModoArqueo('TODOS')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                modoArqueo === 'TODOS'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Todos los Cobros</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros de Fecha / Mes y Sucursal */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3.5">
          {modoArqueo === 'DIA' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Seleccionar Fecha:
              </span>
              <button
                type="button"
                onClick={() =>
                  setFechaConsultaDia(moverDia(fechaConsultaDia, -1))
                }
                title="Día anterior"
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <input
                type="date"
                value={fechaConsultaDia}
                onChange={(e) => setFechaConsultaDia(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setFechaConsultaDia(moverDia(fechaConsultaDia, 1))
                }
                title="Día siguiente"
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFechaConsultaDia(obtenerFechaHoyIso())}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() =>
                  setFechaConsultaDia(moverDia(obtenerFechaHoyIso(), -1))
                }
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Ayer
              </button>
            </div>
          )}

          {modoArqueo === 'MES' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Seleccionar Mes:
              </span>
              <input
                type="month"
                value={mesConsulta}
                onChange={(e) => setMesConsulta(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setMesConsulta(obtenerPeriodoActualIso())}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
              >
                Mes Actual
              </button>
              <button
                type="button"
                onClick={() =>
                  setMesConsulta(
                    sumarMesesPeriodo(obtenerPeriodoActualIso(), -1)
                  )
                }
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Mes Anterior
              </button>

              {/* Selector de subvista del mes */}
              <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setSubVistaMes('DESGLOSE_DIARIO')}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                    subVistaMes === 'DESGLOSE_DIARIO'
                      ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📊 Desglose Día por Día
                </button>
                <button
                  type="button"
                  onClick={() => setSubVistaMes('RECIBOS')}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                    subVistaMes === 'RECIBOS'
                      ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🧾 Lista de Recibos ({cobrosDelPeriodo.length})
                </button>
              </div>
            </div>
          )}

          {/* Filtro de Sucursal */}
          {!lockSucursal && (
            <div className="ml-auto">
              <BranchSelector
                selectedSucursal={sucursalFiltro}
                onChange={setSucursalFiltro}
              />
            </div>
          )}
        </div>

        {/* Tarjetas de Arqueo: 💵 Caja Física vs 📱 Caja Lógica vs 💰 Total */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {/* 1. CAJA FÍSICA (EFECTIVO) */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Caja Física (Efectivo)
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Billetes en Mano
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              Bs {resumenCajaPeriodo.efectivo.toFixed(2)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-emerald-200/80">
              <span>
                {resumenCajaPeriodo.cantidadEfectivo} cobro(s) en efectivo
              </span>
              <span className="font-semibold">
                {resumenCajaPeriodo.total > 0
                  ? `${((resumenCajaPeriodo.efectivo / resumenCajaPeriodo.total) * 100).toFixed(0)}%`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* 2. CAJA LÓGICA (QR Y TRANSFERENCIAS) */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Caja Lógica (QR / Banco)
                </span>
              </div>
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                Cuenta Bancaria
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              Bs {resumenCajaPeriodo.totalLogica.toFixed(2)}
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs text-cyan-200/80">
              <span>
                QR: Bs {resumenCajaPeriodo.qr.toFixed(2)} (
                {resumenCajaPeriodo.cantidadQr})
              </span>
              <span>
                Transf: Bs {resumenCajaPeriodo.transferencia.toFixed(2)} (
                {resumenCajaPeriodo.cantidadTransferencia})
              </span>
            </div>
          </div>

          {/* 3. TOTAL GENERAL CONSOLIDADO */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Total Ingresos (
                  {modoArqueo === 'DIA'
                    ? 'Día'
                    : modoArqueo === 'MES'
                      ? 'Mes'
                      : 'Histórico'}
                  )
                </span>
              </div>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                Conciliado
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              Bs {resumenCajaPeriodo.total.toFixed(2)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-indigo-200/80">
              <span>{resumenCajaPeriodo.cantidadTotal} recibo(s) en total</span>
              <span>
                Ticket Prom: Bs{' '}
                {(resumenCajaPeriodo.cantidadTotal > 0
                  ? resumenCajaPeriodo.total / resumenCajaPeriodo.cantidadTotal
                  : 0
                ).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VISTA 1: TABLA DE ARQUEO DÍA POR DÍA DEL MES (Modo Mes + Desglose)
         ========================================================================= */}
      {modoArqueo === 'MES' && subVistaMes === 'DESGLOSE_DIARIO' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-bold text-white">
                Desglose Diario de Ingresos —{' '}
                {formatearPeriodoMes(mesConsulta, 'largo')}
              </h3>
              <p className="text-xs text-slate-400">
                Audita cada día del mes comparando lo recaudado en Caja Física
                (Efectivo) versus Caja Lógica (QR y Transferencias).
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir Arqueo Mensual
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Día</th>
                  <th className="px-4 py-3 text-right text-emerald-400">
                    💵 Caja Física (Efectivo)
                  </th>
                  <th className="px-4 py-3 text-right text-cyan-400">
                    📱 Caja Lógica (QR / Transf.)
                  </th>
                  <th className="px-4 py-3 text-right text-white">
                    💰 Total del Día
                  </th>
                  <th className="px-4 py-3 text-center">N° Cobros</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {desgloseDiarioMes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No se registran cobros para el mes de{' '}
                      {formatearPeriodoMes(mesConsulta, 'largo')}.
                    </td>
                  </tr>
                ) : (
                  desgloseDiarioMes.map((d) => (
                    <tr key={d.fecha} className="hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-cyan-300">
                        {d.fechaFormateada} ({d.fecha})
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-300">
                        {d.diaSemana}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-bold text-emerald-300">
                        Bs {d.resumen.efectivo.toFixed(2)}{' '}
                        <span className="font-normal text-[10px] text-emerald-400/70">
                          ({d.resumen.cantidadEfectivo})
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-bold text-cyan-300">
                        Bs {d.resumen.totalLogica.toFixed(2)}{' '}
                        <span className="font-normal text-[10px] text-cyan-400/70">
                          ({d.resumen.cantidadQr +
                            d.resumen.cantidadTransferencia}
                          )
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-black text-white">
                        Bs {d.resumen.total.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-xs text-slate-300">
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                          {d.resumen.cantidadTotal}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setFechaConsultaDia(d.fecha);
                            setModoArqueo('DIA');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20"
                        >
                          <span>Ver arqueo del día</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {desgloseDiarioMes.length > 0 && (
                <tfoot className="border-t-2 border-slate-700 bg-slate-950 text-xs font-bold">
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-3 uppercase tracking-wider text-white"
                    >
                      TOTAL MES {formatearPeriodoMes(mesConsulta, 'corto')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-emerald-300">
                      Bs {resumenCajaPeriodo.efectivo.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-cyan-300">
                      Bs {resumenCajaPeriodo.totalLogica.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-base text-white">
                      Bs {resumenCajaPeriodo.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {resumenCajaPeriodo.cantidadTotal} cobros
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : null}

      {/* =========================================================================
          VISTA 2: FORMULARIO DE COBRO (IZQUIERDA) + HISTORIAL DE RECIBOS (DERECHA)
         ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Formulario de Registro de Cobro con Extracto del Cliente */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-5">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <PlusCircle className="h-5 w-5 text-cyan-400" />
            <span>Cobrar Mensualidad (Consecutivo)</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Busca al abonado para revisar su extracto y registrar el mes que le
            corresponde pagar.
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

            {/* Ficha Resumen del Cliente */}
            {clienteSeleccionado && extractoSeleccionado && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white">
                    {clienteSeleccionado.nombres}{' '}
                    {clienteSeleccionado.apellidos}
                  </div>
                  <div className="font-mono text-cyan-400">
                    Tarifa: Bs{' '}
                    {Number(clienteSeleccionado.precio_mensual).toFixed(2)}
                  </div>
                </div>
                <div className="mt-1 text-slate-400">
                  {clienteSeleccionado.zona_comunidad} ·{' '}
                  {clienteSeleccionado.direccion}
                </div>

                {/* Extracto de meses */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {extractoSeleccionado.detalleMensual.map((m) => (
                    <button
                      key={m.periodo}
                      type="button"
                      onClick={() => setPeriodoMes(m.periodo)}
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition ${
                        m.periodo === periodoMes
                          ? 'border-cyan-400 bg-cyan-500/25 text-white ring-1 ring-cyan-400'
                          : m.estadoMes === 'PAGADO'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : m.estadoMes === 'PARCIAL'
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      {m.etiquetaCorta}: {m.estadoMes}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <FechaManualInput
              label="2. Fecha de Cancelación / Cobro"
              value={fechaPago}
              onChange={setFechaPago}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  3. Mes a Cancelar (Consecutivo)
                </label>
                <input
                  type="month"
                  required
                  value={periodoMes}
                  onChange={(e) => setPeriodoMes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  4. Monto a Cobrar (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                5. Método de Pago (Físico vs Lógico)
              </label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(['EFECTIVO', 'QR', 'TRANSFERENCIA'] as MetodoPago[]).map(
                  (metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setMetodoPago(metodo)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold transition ${
                        metodoPago === metodo
                          ? metodo === 'EFECTIVO'
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400'
                            : 'border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {metodo === 'EFECTIVO' && (
                        <Banknote className="h-4 w-4" />
                      )}
                      {metodo === 'QR' && <QrCode className="h-4 w-4" />}
                      {metodo === 'TRANSFERENCIA' && (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                      <span>{metodo}</span>
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
                Registrar Pago Consecutivo (
                {formatearPeriodoMes(periodoMes, 'corto')})
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Historial de Recibos y Movimientos */}
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-800 px-5 py-3.5 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {modoArqueo === 'DIA'
                    ? `Cobros del Día (${cobrosFiltrados.length})`
                    : modoArqueo === 'MES'
                      ? `Recibos de ${formatearPeriodoMes(mesConsulta, 'corto')} (${cobrosFiltrados.length})`
                      : `Todos los Movimientos (${cobrosFiltrados.length})`}
                </h3>
                <div className="text-[11px] text-slate-400">
                  Física: Bs {resumenCajaPeriodo.efectivo.toFixed(2)} · Lógica:
                  Bs {resumenCajaPeriodo.totalLogica.toFixed(2)}
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={busquedaRecibos}
                  onChange={(e) => setBusquedaRecibos(e.target.value)}
                  placeholder="Filtrar recibos por cliente o método..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Fecha Cobro</th>
                    <th className="px-4 py-3">Código / Cliente</th>
                    <th className="px-4 py-3">Mes Cancelado</th>
                    <th className="px-4 py-3">Caja / Método</th>
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
                        No se registran cobros para este filtro.
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
                            {cobro.metodo_pago === 'EFECTIVO' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-300">
                                <Banknote className="h-3 w-3" /> FÍSICA (EFECTIVO)
                              </span>
                            ) : cobro.metodo_pago === 'QR' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 font-bold text-cyan-300">
                                <QrCode className="h-3 w-3" /> LÓGICA (QR)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-2 py-0.5 font-bold text-violet-300">
                                <ArrowRightLeft className="h-3 w-3" /> LÓGICA (TRANSF)
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
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-emerald-300">
                            Bs {Number(cobro.monto).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleAnularCobro(cobro.id)}
                              title="Anular cobro"
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
