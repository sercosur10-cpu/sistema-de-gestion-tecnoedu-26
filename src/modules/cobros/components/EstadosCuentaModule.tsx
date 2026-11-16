'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  MessageSquareShare,
  Calendar,
  ExternalLink,
  Search,
  CreditCard,
  ArrowRight,
  FileText,
  Scissors,
  Upload,
} from 'lucide-react';
import type { MetodoPago, SucursalId } from '@/lib/supabase/database.types';
import {
  formatearPeriodoMes,
  obtenerEstadosCuenta,
  obtenerPeriodoActualIso,
  registrarCobro,
  type EstadoCuentaCliente,
} from '@/modules/cobros/services';
import {
  DEFAULT_POLITICA_CORTE,
  guardarPoliticaCorte,
  obtenerPoliticaCorte,
  procesarPdfPoliticaCorte,
  type PoliticaCorteConfig,
} from '@/modules/corte/services';
import { BranchSelector } from '@/modules/sucursales/components/BranchSelector';
import { SUCURSALES_META } from '@/modules/sucursales/constants';
import {
  FechaManualInput,
  formatearFechaDMY,
  obtenerFechaHoyIso,
} from '@/components/ui/FechaManualInput';

interface EstadosCuentaModuleProps {
  initialSucursal?: SucursalId | 'TODAS';
  lockSucursal?: boolean;
}

export function EstadosCuentaModule({
  initialSucursal = 'TODAS',
  lockSucursal = false,
}: EstadosCuentaModuleProps) {
  const [sucursalFiltro, setSucursalFiltro] = useState<SucursalId | 'TODAS'>(
    initialSucursal
  );
  const [periodoMes, setPeriodoMes] = useState(obtenerPeriodoActualIso());
  const [estados, setEstados] = useState<EstadoCuentaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroSituacion, setFiltroSituacion] = useState<
    'TODOS' | 'CON_DEUDA' | 'EN_CORTE' | 'AL_DIA'
  >('TODOS');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Política de Corte sujeta a Documento PDF (ATT / Interna)
  const [politicaCorte, setPoliticaCorte] = useState<PoliticaCorteConfig>(
    DEFAULT_POLITICA_CORTE
  );
  const [modalPoliticaAbierto, setModalPoliticaAbierto] = useState(false);
  const [mesesInputPolitica, setMesesInputPolitica] = useState('2');
  const [resolucionInputPolitica, setResolucionInputPolitica] = useState(
    DEFAULT_POLITICA_CORTE.resolucionReferencia
  );
  const [archivoPdfSeleccionado, setArchivoPdfSeleccionado] =
    useState<File | null>(null);

  // Modal de cobro consecutivo directo desde Estados de Cuenta
  const [itemCobroActivo, setItemCobroActivo] =
    useState<EstadoCuentaCliente | null>(null);
  const [fechaPago, setFechaPago] = useState(obtenerFechaHoyIso());
  const [periodoAPagar, setPeriodoAPagar] = useState(obtenerPeriodoActualIso());
  const [montoPago, setMontoPago] = useState('180');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('QR');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [observacion, setObservacion] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    const pol = obtenerPoliticaCorte();
    setPoliticaCorte(pol);
    setMesesInputPolitica(String(pol.mesesParaCorte));
    setResolucionInputPolitica(pol.resolucionReferencia);

    const data = await obtenerEstadosCuenta(periodoMes, sucursalFiltro);
    setEstados(data);
    setLoading(false);
  }, [periodoMes, sucursalFiltro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resumen = useMemo(() => {
    const activos = estados.filter((e) => e.cliente.estado === 'ACTIVO');
    const alDia = activos.filter((e) => e.pagadoPeriodoActual).length;
    const conSaldo = activos.length - alDia;
    const enCorte = activos.filter((e) => e.enListaDeCorte).length;
    const totalPorCobrar = activos.reduce(
      (acc, e) => acc + e.saldoPendiente,
      0
    );
    return { alDia, conSaldo, enCorte, totalPorCobrar };
  }, [estados]);

  const estadosFiltrados = useMemo(() => {
    return estados.filter((item) => {
      if (
        filtroSituacion === 'CON_DEUDA' &&
        (item.pagadoPeriodoActual || item.cliente.estado === 'INACTIVO')
      ) {
        return false;
      }
      if (filtroSituacion === 'EN_CORTE' && !item.enListaDeCorte) {
        return false;
      }
      if (
        filtroSituacion === 'AL_DIA' &&
        (!item.pagadoPeriodoActual || item.cliente.estado === 'INACTIVO')
      ) {
        return false;
      }

      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        item.cliente.codigo_cliente.toLowerCase().includes(q) ||
        item.cliente.nombres.toLowerCase().includes(q) ||
        item.cliente.apellidos.toLowerCase().includes(q) ||
        (item.cliente.zona_comunidad ?? '').toLowerCase().includes(q)
      );
    });
  }, [estados, filtroSituacion, busqueda]);

  const handleGuardarPoliticaPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    const mesesNum = Math.max(1, parseInt(mesesInputPolitica, 10) || 2);

    if (archivoPdfSeleccionado) {
      const { politica, mesesDetectadosEnPdf } = await procesarPdfPoliticaCorte(
        archivoPdfSeleccionado,
        mesesNum,
        resolucionInputPolitica
      );
      setPoliticaCorte(politica);
      setFeedback(
        `Política de Corte actualizada mediante PDF "${politica.nombreArchivoPdf}" (${mesesDetectadosEnPdf ? `detectado ${mesesDetectadosEnPdf} mes(es) en PDF` : `configurado a ${politica.mesesParaCorte} mes(es)`}). Lista de corte recalculada.`
      );
    } else {
      const politica = guardarPoliticaCorte({
        mesesParaCorte: mesesNum,
        resolucionReferencia: resolucionInputPolitica,
      });
      setPoliticaCorte(politica);
      setFeedback(
        `Política de Corte ajustada a ${politica.mesesParaCorte} mes(es) cumplidos (${politica.resolucionReferencia}).`
      );
    }

    setArchivoPdfSeleccionado(null);
    setModalPoliticaAbierto(false);
    await cargar();
  };

  const abrirCobroConsecutivo = (item: EstadoCuentaCliente) => {
    setItemCobroActivo(item);
    setFechaPago(obtenerFechaHoyIso());
    setPeriodoAPagar(item.proximoMesAPagar);
    setMontoPago(String(item.cliente.precio_mensual));
    setMetodoPago('QR');
    setNumeroRecibo(
      `REC-${item.cliente.codigo_cliente}-${Date.now().toString().slice(-4)}`
    );
    setObservacion('');
  };

  const handleConfirmarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCobroActivo) return;

    const { data, error } = await registrarCobro({
      codigo_cliente: itemCobroActivo.cliente.codigo_cliente,
      fecha_pago: fechaPago,
      monto: Number(montoPago),
      periodo_mes: periodoAPagar,
      metodo_pago: metodoPago,
      numero_recibo:
        numeroRecibo.trim() ||
        `REC-${itemCobroActivo.cliente.codigo_cliente}-${Date.now().toString().slice(-4)}`,
      observacion: observacion.trim() || null,
    });

    if (!error && data) {
      setFeedback(
        `Pago consecutivo registrado: ${data.codigo_cliente} — ${formatearPeriodoMes(data.periodo_mes)} (${data.periodo_mes}) por Bs ${Number(data.monto).toFixed(2)} con fecha ${formatearFechaDMY(data.fecha_pago)}.`
      );
      setItemCobroActivo(null);
      await cargar();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-white">
            Estados de Cuenta, Extracto de Deuda y Pago Consecutivo
          </h2>
          <p className="text-sm text-slate-400">
            Visualiza pagos anteriores, meses adeudados, el mes que le corresponde pagar a cada cliente y registra su cobro consecutivo.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-medium text-slate-300">
            Corte hasta:
          </span>
          <input
            type="month"
            value={periodoMes}
            onChange={(e) => setPeriodoMes(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white"
          />
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-4 text-emerald-400 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {!lockSucursal && (
        <BranchSelector
          selectedSucursal={sucursalFiltro}
          onChange={setSucursalFiltro}
        />
      )}

      {/* Panel de Política de Corte Sujeta a Cambios mediante Documento PDF (ATT / Interna) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-slate-900/90 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/20 px-2.5 py-0.5 text-xs font-extrabold text-rose-300">
              <Scissors className="h-3.5 w-3.5" />
              POLÍTICA DE CORTE VIGENTE: {politicaCorte.mesesParaCorte} MES(ES)
              CUMPLIDOS
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
              <FileText className="h-3 w-3" />
              {politicaCorte.nombreArchivoPdf}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {politicaCorte.resolucionReferencia} · Legalidad ATT:{' '}
            <strong className="text-slate-200">
              Bermejo (BER), Tarija (TAR) y Santa Cruz (SCZ)
            </strong>{' '}
            · Gestión homologada:{' '}
            <strong className="text-slate-200">Roboré (ROB)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setFiltroSituacion(
                filtroSituacion === 'EN_CORTE' ? 'TODOS' : 'EN_CORTE'
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
              filtroSituacion === 'EN_CORTE'
                ? 'border-rose-400 bg-rose-500 text-slate-950'
                : 'border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
            }`}
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>
              {filtroSituacion === 'EN_CORTE'
                ? 'Viendo Lista para Corte (Quitar filtro)'
                : `Ver Lista para Corte (${resumen.enCorte})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModalPoliticaAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/25"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Cambiar Política mediante PDF</span>
          </button>
        </div>
      </div>

      {/* Resumen KPIs de Estado de Cuenta y Lista de Corte */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="text-xs font-medium text-emerald-300">
            Clientes Activos al Día (hasta {periodoMes})
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-200">
            {resumen.alDia} abonados
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="text-xs font-medium text-amber-300">
            Clientes con Meses Pendientes
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-200">
            {resumen.conSaldo} abonados
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/50 bg-rose-500/15 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span>
              Lista para Corte (≥ {politicaCorte.mesesParaCorte} meses)
            </span>
            <Scissors className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-rose-200">
            {resumen.enCorte} abonados
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-xs font-medium text-slate-300">
            Deuda Acumulada por Cobrar
          </div>
          <div className="mt-1 text-2xl font-bold text-white">
            Bs {resumen.totalPorCobrar.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Buscador y Filtros de Morosidad y Corte */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente por código (ej. BER-001, BER-003), nombre o zona para ver extracto y qué mes debe..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          {(
            [
              { id: 'TODOS', label: 'Todos' },
              { id: 'CON_DEUDA', label: 'Con Meses Pendientes' },
              {
                id: 'EN_CORTE',
                label: `Lista para Corte (≥${politicaCorte.mesesParaCorte}m)`,
              },
              { id: 'AL_DIA', label: 'Al Día' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroSituacion(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filtroSituacion === f.id
                  ? f.id === 'EN_CORTE'
                    ? 'bg-rose-500/30 text-rose-200 ring-1 ring-rose-500/50'
                    : 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Estados de Cuenta con Extracto */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Código / Sucursal</th>
                <th className="px-4 py-3.5">Cliente / Inicio</th>
                <th className="px-4 py-3.5">Tarifa</th>
                <th className="px-4 py-3.5">Extracto Pagos Anteriores</th>
                <th className="px-4 py-3.5">Mes(es) que Debe</th>
                <th className="px-4 py-3.5">Mes a Pagar (Consecutivo)</th>
                <th className="px-4 py-3.5">Deuda Total</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Calculando extractos y estados de cuenta...
                  </td>
                </tr>
              ) : estadosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No se encontraron clientes para este criterio.
                  </td>
                </tr>
              ) : (
                estadosFiltrados.map((item) => {
                  const {
                    cliente,
                    mesesPagados,
                    mesesQueDebe,
                    proximoMesAPagar,
                    pagadoPeriodoActual,
                    saldoPendiente,
                  } = item;
                  const suc = SUCURSALES_META[cliente.sucursal_id];
                  const listaMesesTexto = mesesQueDebe
                    .map((m) => `${m.etiquetaCorta} (${m.periodo})`)
                    .join(', ');
                  const textoWhatsApp = encodeURIComponent(
                    `Hola ${cliente.nombres}, te saludamos de TecnoEdu ISP (${suc?.nombre}). Te informamos que el servicio [${cliente.codigo_cliente}] registra pendiente el/los mes(es): ${listaMesesTexto || periodoMes}, con un saldo total de Bs ${saldoPendiente.toFixed(2)}. El mes consecutivo que corresponde cancelar es ${formatearPeriodoMes(proximoMesAPagar)} (${proximoMesAPagar}).`
                  );

                  return (
                    <tr key={cliente.id} className="hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-cyan-300">
                          {cliente.codigo_cliente}
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${suc?.colorBadge}`}
                        >
                          {cliente.sucursal_id}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white">
                          {cliente.nombres} {cliente.apellidos}
                        </div>
                        <div className="text-xs text-slate-400">
                          {cliente.tipo_tecnologia} · {cliente.zona_comunidad}
                        </div>
                        <div className="text-[11px] text-cyan-400/90">
                          Inicio: {formatearFechaDMY(cliente.fecha_inicio)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-300">
                        Bs {Number(cliente.precio_mensual).toFixed(2)}
                      </td>

                      {/* Extracto Pagos Anteriores */}
                      <td className="px-4 py-3.5">
                        {mesesPagados.length === 0 ? (
                          <span className="text-xs text-slate-500">
                            Sin pagos anteriores
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {mesesPagados.map((m) => (
                              <span
                                key={m.periodo}
                                title={`Cancelado el ${formatearFechaDMY(m.ultimoReciboMes?.fecha_pago)} · Recibo ${m.ultimoReciboMes?.numero_recibo ?? 'S/N'}`}
                                className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {m.etiquetaCorta} ({m.periodo})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Meses que Debe */}
                      <td className="px-4 py-3.5">
                        {cliente.estado === 'INACTIVO' ? (
                          <span className="inline-flex rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                            DE BAJA
                          </span>
                        ) : pagadoPeriodoActual ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" /> AL DÍA
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {mesesQueDebe.map((m) => (
                                <span
                                  key={m.periodo}
                                  className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  {m.etiquetaCorta} ({m.periodo})
                                </span>
                              ))}
                            </div>
                            {item.enListaDeCorte && (
                              <div>
                                <span className="inline-flex items-center gap-1 rounded border border-rose-500/50 bg-rose-500/20 px-2 py-0.5 text-[10px] font-extrabold text-rose-300">
                                  <Scissors className="h-3 w-3" />
                                  EN LISTA DE CORTE ({mesesQueDebe.length} MESES)
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Próximo Mes Consecutivo a Pagar */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-bold text-cyan-300">
                          <ArrowRight className="h-3 w-3" />
                          {formatearPeriodoMes(proximoMesAPagar, 'corto')} (
                          {proximoMesAPagar})
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-white">
                        Bs {saldoPendiente.toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirCobroConsecutivo(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Cobrar {proximoMesAPagar}
                          </button>

                          <Link
                            href={`/consulta?codigo=${encodeURIComponent(cliente.codigo_cliente)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-500/40"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Extracto
                          </Link>

                          {!pagadoPeriodoActual &&
                            cliente.estado === 'ACTIVO' && (
                              <a
                                href={`https://wa.me/${cliente.celular}?text=${textoWhatsApp}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                              >
                                <MessageSquareShare className="h-3.5 w-3.5" />
                                WhatsApp
                              </a>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cobro Consecutivo desde Estado de Cuenta */}
      {itemCobroActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                {itemCobroActivo.cliente.codigo_cliente}
              </span>
              <span className="text-xs text-slate-400">
                Tarifa: Bs{' '}
                {Number(itemCobroActivo.cliente.precio_mensual).toFixed(2)}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-white">
              Registrar Pago Consecutivo — {itemCobroActivo.cliente.nombres}{' '}
              {itemCobroActivo.cliente.apellidos}
            </h3>

            {/* Extracto rápido en el modal */}
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
              <div className="font-semibold text-slate-300">
                Extracto de meses del cliente:
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {itemCobroActivo.detalleMensual.map((m) => (
                  <button
                    key={m.periodo}
                    type="button"
                    onClick={() => setPeriodoAPagar(m.periodo)}
                    className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                      m.periodo === periodoAPagar
                        ? 'border-cyan-400 bg-cyan-500/25 text-white ring-1 ring-cyan-400'
                        : m.estadoMes === 'PAGADO'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : m.estadoMes === 'PARCIAL'
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {m.etiquetaCorta} ({m.periodo}): {m.estadoMes}
                    {m.estadoMes === 'PARCIAL' && ` (Resta Bs ${m.montoDebe.toFixed(0)})`}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleConfirmarCobro}
              className="mt-4 space-y-3.5"
            >
              <FechaManualInput
                label="Fecha de Cancelación / Pago (Día, Mes y Año)"
                value={fechaPago}
                onChange={setFechaPago}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Periodo Mes a Pagar (Consecutivo)
                  </label>
                  <input
                    type="month"
                    required
                    value={periodoAPagar}
                    onChange={(e) => setPeriodoAPagar(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Monto Pagado (Bs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
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
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodoPago(m)}
                        className={`rounded-lg border py-2 text-xs font-semibold ${
                          metodoPago === m
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                            : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        {m}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    N° Recibo
                  </label>
                  <input
                    type="text"
                    value={numeroRecibo}
                    onChange={(e) => setNumeroRecibo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
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

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setItemCobroActivo(null)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Confirmar Cobro ({periodoAPagar})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Política de Corte Sujeta a Cambios mediante Documento PDF (Regulación ATT) */}
      {modalPoliticaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <FileText className="h-5 w-5 text-cyan-400" />
              <span>Política de Corte mediante Documento PDF (ATT)</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Normalmente se esperan{' '}
              <strong className="text-slate-200">2 meses cumplidos</strong> para
              desplegar la lista de corte. Si la normativa de la ATT cambia,
              puedes subir aquí el documento PDF de respaldo y ajustar el umbral
              de meses.
            </p>

            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
              <div>
                <strong>Alcance Legal ATT:</strong> Bermejo (BER), Tarija (TAR)
                y Santa Cruz (SCZ).
              </div>
              <div className="mt-1 text-slate-400">
                <strong>Gestión Interna:</strong> Roboré (ROB) aplica el mismo
                filtro operativo sin exposición externa.
              </div>
              {politicaCorte.pdfDataUrl && (
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <a
                    href={politicaCorte.pdfDataUrl}
                    download={politicaCorte.nombreArchivoPdf}
                    className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-semibold"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Descargar PDF vigente ({politicaCorte.nombreArchivoPdf})
                  </a>
                </div>
              )}
            </div>

            <form
              onSubmit={handleGuardarPoliticaPdf}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  1. Subir Documento PDF de Política de Corte / Resolución ATT
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setArchivoPdfSeleccionado(file);
                    if (file) {
                      const match = file.name.match(/(\d+)\s*(?:mes|meses)/i);
                      if (match?.[1]) {
                        setMesesInputPolitica(match[1]);
                      }
                      setResolucionInputPolitica(
                        `Política actualizada según PDF: ${file.name}`
                      );
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-cyan-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  2. Meses Cumplidos de Espera para Lista de Corte (Normal: 2
                  meses)
                </label>
                <select
                  value={mesesInputPolitica}
                  onChange={(e) => setMesesInputPolitica(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="1">1 mes cumplido de mora</option>
                  <option value="2">
                    2 meses cumplidos de mora (Estándar Normal)
                  </option>
                  <option value="3">
                    3 meses cumplidos de mora (Excepción / Disposición ATT)
                  </option>
                  <option value="4">4 meses cumplidos de mora</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  3. Referencia / Nota de la Resolución o Documento PDF
                </label>
                <input
                  type="text"
                  required
                  value={resolucionInputPolitica}
                  onChange={(e) => setResolucionInputPolitica(e.target.value)}
                  placeholder="Ej. Instructivo ATT / Política Interna TecnoEdu"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalPoliticaAbierto(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Aplicar Política de Corte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
