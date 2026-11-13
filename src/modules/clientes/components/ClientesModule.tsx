'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Radio,
  Wifi,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit3,
  Power,
  CreditCard,
  Eye,
  Trash2,
  ExternalLink,
  Sparkles,
  Receipt,
  AlertCircle,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import type {
  Cliente,
  Cobro,
  EstadoCliente,
  MetodoPago,
  SucursalId,
  TipoTecnologia,
} from '@/lib/supabase/database.types';
import { BranchSelector } from '@/modules/sucursales/components/BranchSelector';
import { SUCURSALES_META } from '@/modules/sucursales/constants';
import {
  actualizarCliente,
  cambiarEstadoCliente,
  crearCliente,
  eliminarCliente,
  listarClientes,
  sembrarDatosDemoEnSupabase,
} from '@/modules/clientes/services';
import {
  calcularExtractoCliente,
  eliminarCobro,
  formatearPeriodoMes,
  listarCobros,
  obtenerPeriodoActualIso,
  registrarCobro,
  sumarMesesPeriodo,
} from '@/modules/cobros/services';
import {
  FechaManualInput,
  formatearFechaDMY,
  obtenerFechaHoyIso,
} from '@/components/ui/FechaManualInput';

interface ClientesModuleProps {
  initialSucursal?: SucursalId | 'TODAS';
  lockSucursal?: boolean;
  onDataChange?: () => void;
}

export function ClientesModule({
  initialSucursal = 'TODAS',
  lockSucursal = false,
  onDataChange,
}: ClientesModuleProps) {
  const [sucursalFiltro, setSucursalFiltro] = useState<SucursalId | 'TODAS'>(
    initialSucursal
  );
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | EstadoCliente>(
    'TODOS'
  );
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Modal Alta / Edición de Cliente
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Campos del formulario de Cliente
  const [formSucursal, setFormSucursal] = useState<SucursalId>(
    initialSucursal !== 'TODAS' ? initialSucursal : 'BER'
  );
  const [codigoCliente, setCodigoCliente] = useState('BER-003');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [celular, setCelular] = useState('5917');
  const [direccion, setDireccion] = useState('');
  const [zonaComunidad, setZonaComunidad] = useState('');
  const [tipoTecnologia, setTipoTecnologia] = useState<TipoTecnologia>('FIBRA');
  const [precioMensual, setPrecioMensual] = useState('180');
  const [fechaInicio, setFechaInicio] = useState(obtenerFechaHoyIso());
  const [estado, setEstado] = useState<EstadoCliente>('ACTIVO');

  // Saneamiento histórico: permitir ingresar el último mes de pago al dar de alta o editar un cliente antiguo
  const [incluirUltimoPagoBase, setIncluirUltimoPagoBase] = useState(false);
  const [fechaUltimoPagoBase, setFechaUltimoPagoBase] = useState('2026-09-01');
  const [periodoUltimoPagoBase, setPeriodoUltimoPagoBase] = useState('2026-09');

  // Modal Agregar Pago Rápido desde Cliente
  const [clienteCobroRapido, setClienteCobroRapido] = useState<Cliente | null>(
    null
  );
  const [fechaPago, setFechaPago] = useState(obtenerFechaHoyIso());
  const [montoPago, setMontoPago] = useState('180');
  const [periodoMesPago, setPeriodoMesPago] = useState(
    obtenerPeriodoActualIso()
  );
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('QR');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [observacionPago, setObservacionPago] = useState('');
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [exitoPagoModal, setExitoPagoModal] = useState<string | null>(null);

  // Modal Ficha de Consulta / Extracto de Cuenta del Cliente
  const [clienteFicha, setClienteFicha] = useState<Cliente | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    const [dataCli, dataCob] = await Promise.all([
      listarClientes('TODAS'),
      listarCobros(),
    ]);
    setClientes(dataCli);
    setCobros(dataCob);
    setLoading(false);
    onDataChange?.();
    return { dataCli, dataCob };
  };

  useEffect(() => {
    void cargarDatos();
  }, []);

  const sugerirSiguienteCodigo = (suc: SucursalId, lista: Cliente[]) => {
    const deSucursal = lista.filter((c) => c.sucursal_id === suc);
    const maxNum = deSucursal.reduce((max, c) => {
      const partes = c.codigo_cliente.split('-');
      const num = parseInt(partes[1] ?? '0', 10);
      return Number.isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return `${suc}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const abrirModalAlta = () => {
    const sucDefault: SucursalId =
      sucursalFiltro !== 'TODAS' ? sucursalFiltro : 'BER';
    setClienteEditando(null);
    setErrorForm(null);
    setFormSucursal(sucDefault);
    setCodigoCliente(sugerirSiguienteCodigo(sucDefault, clientes));
    setNombres('');
    setApellidos('');
    setCelular('5917');
    setDireccion('');
    setZonaComunidad('');
    setTipoTecnologia('FIBRA');
    setPrecioMensual('180');
    setFechaInicio(obtenerFechaHoyIso());
    setEstado('ACTIVO');
    setIncluirUltimoPagoBase(false);
    setFechaUltimoPagoBase('2026-09-01');
    setPeriodoUltimoPagoBase('2026-09');
    setModalClienteAbierto(true);
  };

  const abrirModalEdicion = (cli: Cliente) => {
    setClienteEditando(cli);
    setErrorForm(null);
    setFormSucursal(cli.sucursal_id);
    setCodigoCliente(cli.codigo_cliente);
    setNombres(cli.nombres);
    setApellidos(cli.apellidos);
    setCelular(cli.celular);
    setDireccion(cli.direccion ?? '');
    setZonaComunidad(cli.zona_comunidad ?? '');
    setTipoTecnologia(cli.tipo_tecnologia);
    setPrecioMensual(String(cli.precio_mensual));
    setFechaInicio(cli.fecha_inicio);
    setEstado(cli.estado);
    setIncluirUltimoPagoBase(false);
    setFechaUltimoPagoBase('2026-09-01');
    setPeriodoUltimoPagoBase('2026-09');
    setModalClienteAbierto(true);
  };

  const abrirModalCobro = (
    cli: Cliente,
    periodoForzado?: string,
    cobrosActualizados?: Cobro[]
  ) => {
    const listaCob = cobrosActualizados ?? cobros;
    const extracto = calcularExtractoCliente(cli, listaCob);
    const mesSugerido = periodoForzado ?? extracto.proximoMesAPagar;

    setClienteCobroRapido(cli);
    setErrorPago(null);
    setExitoPagoModal(null);
    setFechaPago(obtenerFechaHoyIso());
    setMontoPago(String(cli.precio_mensual));
    setPeriodoMesPago(mesSugerido);
    setMetodoPago('QR');
    setNumeroRecibo(
      `REC-${cli.codigo_cliente}-${Date.now().toString().slice(-4)}`
    );
    setObservacionPago('');
  };

  const conteosPorSucursal = useMemo(() => {
    const counts: Partial<Record<SucursalId | 'TODAS', number>> = {
      TODAS: clientes.length,
      BER: 0,
      TAR: 0,
      SCZ: 0,
      ROB: 0,
    };
    for (const c of clientes) {
      counts[c.sucursal_id] = (counts[c.sucursal_id] ?? 0) + 1;
    }
    return counts;
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const coincideSucursal =
        sucursalFiltro === 'TODAS' || c.sucursal_id === sucursalFiltro;
      if (!coincideSucursal) return false;

      const coincideEstado =
        estadoFiltro === 'TODOS' || c.estado === estadoFiltro;
      if (!coincideEstado) return false;

      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        c.codigo_cliente.toLowerCase().includes(q) ||
        c.nombres.toLowerCase().includes(q) ||
        c.apellidos.toLowerCase().includes(q) ||
        (c.zona_comunidad ?? '').toLowerCase().includes(q) ||
        c.celular.includes(q)
      );
    });
  }, [clientes, sucursalFiltro, estadoFiltro, busqueda]);

  const extractoCobroRapido = useMemo(() => {
    if (!clienteCobroRapido) return null;
    return calcularExtractoCliente(clienteCobroRapido, cobros);
  }, [clienteCobroRapido, cobros]);

  const extractoClienteFicha = useMemo(() => {
    if (!clienteFicha) return null;
    return calcularExtractoCliente(clienteFicha, cobros);
  }, [clienteFicha, cobros]);

  const periodoSeleccionadoYaPagado = useMemo(() => {
    if (!extractoCobroRapido) return false;
    return extractoCobroRapido.mesesPagados.some(
      (m) => m.periodo === periodoMesPago
    );
  }, [extractoCobroRapido, periodoMesPago]);

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (clienteEditando) {
      const { error } = await actualizarCliente(clienteEditando.id, {
        codigo_cliente: codigoCliente,
        sucursal_id: formSucursal,
        nombres,
        apellidos,
        celular,
        direccion,
        zona_comunidad: zonaComunidad,
        tipo_tecnologia: tipoTecnologia,
        precio_mensual: Number(precioMensual),
        fecha_inicio: fechaInicio,
        estado,
      });

      if (error) {
        setErrorForm(error);
        return;
      }

      if (incluirUltimoPagoBase) {
        await registrarCobro({
          codigo_cliente: codigoCliente,
          fecha_pago: fechaUltimoPagoBase,
          monto: Number(precioMensual),
          periodo_mes: periodoUltimoPagoBase,
          metodo_pago: 'EFECTIVO',
          numero_recibo: `BASE-${codigoCliente.trim().toUpperCase()}-${periodoUltimoPagoBase}`,
          observacion: `Último mes pagado registrado como base histórica (deuda corre desde ${sumarMesesPeriodo(periodoUltimoPagoBase, 1)})`,
        });
      }

      setFeedbackBanner(
        incluirUltimoPagoBase
          ? `Cliente ${codigoCliente} actualizado (Inicio: ${formatearFechaDMY(fechaInicio)}) con último pago base en ${periodoUltimoPagoBase}. La deuda se calcula desde ${sumarMesesPeriodo(periodoUltimoPagoBase, 1)} en adelante.`
          : `Cliente ${codigoCliente} actualizado correctamente (Inicio: ${formatearFechaDMY(fechaInicio)}).`
      );
    } else {
      const { error } = await crearCliente({
        codigo_cliente: codigoCliente,
        sucursal_id: formSucursal,
        nombres,
        apellidos,
        celular,
        direccion,
        zona_comunidad: zonaComunidad,
        tipo_tecnologia: tipoTecnologia,
        precio_mensual: Number(precioMensual),
        fecha_inicio: fechaInicio,
        estado,
      });

      if (error) {
        setErrorForm(error);
        return;
      }

      if (incluirUltimoPagoBase) {
        await registrarCobro({
          codigo_cliente: codigoCliente,
          fecha_pago: fechaUltimoPagoBase,
          monto: Number(precioMensual),
          periodo_mes: periodoUltimoPagoBase,
          metodo_pago: 'EFECTIVO',
          numero_recibo: `BASE-${codigoCliente.trim().toUpperCase()}-${periodoUltimoPagoBase}`,
          observacion: `Último mes pagado registrado como base histórica (deuda corre desde ${sumarMesesPeriodo(periodoUltimoPagoBase, 1)})`,
        });
      }

      setFeedbackBanner(
        incluirUltimoPagoBase
          ? `Alta exitosa: Cliente ${codigoCliente} registrado con fecha de inicio ${formatearFechaDMY(fechaInicio)} y último mes pagado ${periodoUltimoPagoBase} (${formatearFechaDMY(fechaUltimoPagoBase)}). El sistema calcula lo que debe a partir de ${sumarMesesPeriodo(periodoUltimoPagoBase, 1)}.`
          : `Alta exitosa: Cliente ${codigoCliente} (${nombres} ${apellidos}) registrado con fecha de inicio ${formatearFechaDMY(fechaInicio)}.`
      );
    }

    setModalClienteAbierto(false);
    await cargarDatos();
  };

  const handleAlternarBajaAlta = async (cli: Cliente) => {
    const nuevoEstado: EstadoCliente =
      cli.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const { error } = await cambiarEstadoCliente(cli.id, nuevoEstado);
    if (!error) {
      setFeedbackBanner(
        nuevoEstado === 'INACTIVO'
          ? `Baja aplicada al servicio ${cli.codigo_cliente} (${cli.nombres} ${cli.apellidos}).`
          : `Servicio ${cli.codigo_cliente} reactivado como ACTIVO.`
      );
      await cargarDatos();
    }
  };

  const handleEliminarCliente = async (cli: Cliente) => {
    const { ok, error } = await eliminarCliente(cli.id);
    if (!ok) {
      setFeedbackBanner(
        `No se pudo eliminar ${cli.codigo_cliente}: ${error ?? 'Tiene cobros asociados.'}`
      );
      return;
    }
    setFeedbackBanner(`Registro ${cli.codigo_cliente} eliminado.`);
    if (clienteFicha?.id === cli.id) {
      setClienteFicha(null);
    }
    await cargarDatos();
  };

  const registrarPagoCliente = async (mantenerAbiertoConsecutivo: boolean) => {
    if (!clienteCobroRapido) return;
    setErrorPago(null);
    setExitoPagoModal(null);

    const { data, error } = await registrarCobro({
      codigo_cliente: clienteCobroRapido.codigo_cliente,
      fecha_pago: fechaPago,
      monto: Number(montoPago),
      periodo_mes: periodoMesPago,
      metodo_pago: metodoPago,
      numero_recibo:
        numeroRecibo.trim() ||
        `REC-${clienteCobroRapido.codigo_cliente}-${Date.now().toString().slice(-4)}`,
      observacion: observacionPago.trim() || null,
    });

    if (error || !data) {
      setErrorPago(error ?? 'Error al registrar el cobro.');
      return;
    }

    const { dataCob } = await cargarDatos();
    const nuevoExtracto = calcularExtractoCliente(clienteCobroRapido, dataCob);

    const msg = `Pago de Bs ${Number(data.monto).toFixed(2)} correspondiente a ${formatearPeriodoMes(data.periodo_mes)} (${data.periodo_mes}) con fecha ${formatearFechaDMY(data.fecha_pago)} registrado para ${data.codigo_cliente}. Próximo mes consecutivo: ${formatearPeriodoMes(nuevoExtracto.proximoMesAPagar)} (${nuevoExtracto.proximoMesAPagar}).`;

    setFeedbackBanner(msg);

    if (mantenerAbiertoConsecutivo) {
      setExitoPagoModal(
        `✓ Mes ${formatearPeriodoMes(data.periodo_mes)} (${data.periodo_mes}) cancelado. Listo para cobrar el siguiente mes consecutivo: ${formatearPeriodoMes(nuevoExtracto.proximoMesAPagar)} (${nuevoExtracto.proximoMesAPagar}).`
      );
      setPeriodoMesPago(nuevoExtracto.proximoMesAPagar);
      setMontoPago(String(clienteCobroRapido.precio_mensual));
      setNumeroRecibo(
        `REC-${clienteCobroRapido.codigo_cliente}-${Date.now().toString().slice(-4)}`
      );
      setObservacionPago('');
    } else {
      setClienteCobroRapido(null);
    }
  };

  const handleGuardarCobroRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    await registrarPagoCliente(false);
  };

  const handleSembrarPrueba = async () => {
    const suc = sucursalFiltro !== 'TODAS' ? sucursalFiltro : undefined;
    const res = await sembrarDatosDemoEnSupabase(suc);
    setFeedbackBanner(res.mensaje);
    await cargarDatos();
  };

  return (
    <div className="space-y-5">
      {/* Encabezado y Acciones Principales */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-white">
            Padrón de Clientes, Extracto de Pagos y Cobro Consecutivo
          </h2>
          <p className="text-sm text-slate-400">
            Busca cualquier cliente para visualizar sus pagos anteriores, saber qué meses debe y registrar su siguiente pago consecutivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSembrarPrueba}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Cargar Registros de Prueba
          </button>

          <button
            type="button"
            onClick={abrirModalAlta}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Alta de Nuevo Cliente
          </button>
        </div>
      </div>

      {feedbackBanner && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
          <span>{feedbackBanner}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
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
          counts={conteosPorSucursal}
        />
      )}

      {/* Barra de búsqueda y filtro de Estado */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente por código (ej. BER-001, BER-003), nombre, celular o zona para ver qué mes debe..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          {(['TODOS', 'ACTIVO', 'INACTIVO'] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setEstadoFiltro(est)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                estadoFiltro === est
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {est === 'TODOS'
                ? 'Todos'
                : est === 'ACTIVO'
                  ? 'Solo Activos'
                  : 'De Baja (Inactivos)'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de clientes con Extracto y Próximo Mes Consecutivo */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Código</th>
                <th className="px-4 py-3.5">Abonado / Inicio</th>
                <th className="px-4 py-3.5">Zona / Dirección</th>
                <th className="px-4 py-3.5">Tarifa / Plan</th>
                <th className="px-4 py-3.5">
                  Extracto (Últ. Pago · Meses que Debe · Próximo Mes)
                </th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">
                  Operaciones (Cobro Consecutivo, Extracto, Editar)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Cargando padrón y extractos de clientes...
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No hay clientes para este filtro. Usa el botón{' '}
                    <strong className="text-cyan-300">
                      &ldquo;Cargar Registros de Prueba&rdquo;
                    </strong>{' '}
                    o{' '}
                    <strong className="text-cyan-300">
                      &ldquo;Alta de Nuevo Cliente&rdquo;
                    </strong>
                    .
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => {
                  const sucMeta = SUCURSALES_META[c.sucursal_id];
                  const extracto = calcularExtractoCliente(c, cobros);

                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-cyan-300">
                          {c.codigo_cliente}
                        </div>
                        <span
                          className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${sucMeta?.colorBadge}`}
                        >
                          {c.sucursal_id} · {sucMeta?.nombre}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-100">
                          {c.nombres} {c.apellidos}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <Phone className="h-3 w-3" />+{c.celular}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-cyan-400/90">
                          <Calendar className="h-3 w-3" />
                          Inicio: {formatearFechaDMY(c.fecha_inicio)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-200">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {c.zona_comunidad || 'Sin zona'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {c.direccion || '—'}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="font-bold text-white">
                          Bs {Number(c.precio_mensual).toFixed(2)}/mes
                        </div>
                        <div className="mt-0.5">
                          {c.tipo_tecnologia === 'FIBRA' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-300">
                              <Wifi className="h-3 w-3" /> FIBRA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                              <Radio className="h-3 w-3" /> ANTENA
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Columna de Extracto y Mes Consecutivo */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 text-xs">
                          <div className="text-slate-300">
                            <span className="text-slate-500">Últ. pago: </span>
                            {extracto.ultimoPeriodoPagado ? (
                              <span className="font-semibold text-emerald-300">
                                {formatearPeriodoMes(
                                  extracto.ultimoPeriodoPagado,
                                  'corto'
                                )}{' '}
                                ({extracto.ultimoPeriodoPagado})
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                Sin pagos registrados
                              </span>
                            )}
                          </div>

                          {c.estado === 'INACTIVO' ? (
                            <div className="text-[11px] text-slate-500">
                              Servicio de baja (sin cobro activo)
                            </div>
                          ) : extracto.mesesQueDebe.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                                <AlertCircle className="h-3 w-3" />
                                Debe {extracto.mesesQueDebe.length} mes(es):{' '}
                                {extracto.mesesQueDebe
                                  .map((m) => m.etiquetaCorta)
                                  .join(', ')}{' '}
                                (Bs {extracto.saldoPendiente.toFixed(2)})
                              </span>
                              {extracto.enListaDeCorte && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-500/20 px-2 py-0.5 text-[10px] font-extrabold text-rose-300">
                                  EN CORTE (≥{extracto.umbralMesesCorte}M)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" /> Al día
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
                            <ArrowRight className="h-3 w-3" />
                            <span>
                              Le corresponde pagar:{' '}
                              <strong className="font-mono underline">
                                {formatearPeriodoMes(
                                  extracto.proximoMesAPagar,
                                  'corto'
                                )}{' '}
                                ({extracto.proximoMesAPagar})
                              </strong>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {c.estado === 'ACTIVO' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> ACTIVO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
                            <XCircle className="h-3.5 w-3.5" /> DE BAJA
                          </span>
                        )}
                        <div className="mt-1 text-[11px] text-slate-500">
                          {extracto.cobrosCliente.length} recibo(s)
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Botón Agregar Pago Consecutivo */}
                          <button
                            type="button"
                            onClick={() => abrirModalCobro(c)}
                            title={`Registrar pago consecutivo (${extracto.proximoMesAPagar})`}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Cobrar ({extracto.proximoMesAPagar})
                          </button>

                          {/* Botón Consultar Extracto / Historial */}
                          <button
                            type="button"
                            onClick={() => setClienteFicha(c)}
                            title="Ver Extracto de Pagos Anteriores y Meses que Debe"
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Extracto
                          </button>

                          {/* Botón Editar */}
                          <button
                            type="button"
                            onClick={() => abrirModalEdicion(c)}
                            title="Editar datos del cliente"
                            className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 transition hover:border-slate-600 hover:text-white"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Botón Dar de Baja / Reactivar */}
                          <button
                            type="button"
                            onClick={() => handleAlternarBajaAlta(c)}
                            title={
                              c.estado === 'ACTIVO'
                                ? 'Dar de Baja (Pasar a INACTIVO)'
                                : 'Reactivar Servicio (Pasar a ACTIVO)'
                            }
                            className={`rounded-lg border p-1.5 transition ${
                              c.estado === 'ACTIVO'
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>

                          {/* Botón Eliminar Registro */}
                          <button
                            type="button"
                            onClick={() => handleEliminarCliente(c)}
                            title="Eliminar registro de prueba"
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 transition hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* ================================================================= */}
      {/* MODAL 1: ALTA / EDICIÓN DE CLIENTE                                */}
      {/* ================================================================= */}
      {modalClienteAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {clienteEditando
                ? `Editar Cliente ${clienteEditando.codigo_cliente}`
                : 'Alta de Nuevo Cliente ISP'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {clienteEditando
                ? 'Modifica los datos técnicos, tarifa, fecha de inicio o estado del abonado.'
                : 'Registra un nuevo abonado especificando manualmente su fecha de inicio (día, mes y año).'}
            </p>

            {errorForm && (
              <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                {errorForm}
              </div>
            )}

            <form onSubmit={handleGuardarCliente} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Sucursal
                  </label>
                  <select
                    value={formSucursal}
                    disabled={lockSucursal}
                    onChange={(e) => {
                      const suc = e.target.value as SucursalId;
                      setFormSucursal(suc);
                      if (!clienteEditando) {
                        setCodigoCliente(sugerirSiguienteCodigo(suc, clientes));
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <option value="BER">BER - Bermejo</option>
                    <option value="TAR">TAR - Tarija</option>
                    <option value="SCZ">SCZ - Santa Cruz</option>
                    <option value="ROB">ROB - Roboré</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Código Cliente (Único)
                  </label>
                  <input
                    type="text"
                    required
                    value={codigoCliente}
                    onChange={(e) =>
                      setCodigoCliente(e.target.value.toUpperCase())
                    }
                    placeholder="Ej. BER-003"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Nombres
                  </label>
                  <input
                    type="text"
                    required
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    placeholder="Ej. Juan Carlos"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    required
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Ej. Mamani Ortega"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Celular WhatsApp (E.164)
                  </label>
                  <input
                    type="text"
                    required
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    placeholder="5917XXXXXXX"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Zona / Comunidad
                  </label>
                  <input
                    type="text"
                    value={zonaComunidad}
                    onChange={(e) => setZonaComunidad(e.target.value)}
                    placeholder="Ej. Barrio Moto Méndez"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle / Avenida / N° de casa"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Tecnología
                  </label>
                  <select
                    value={tipoTecnologia}
                    onChange={(e) =>
                      setTipoTecnologia(e.target.value as TipoTecnologia)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="FIBRA">FIBRA</option>
                    <option value="ANTENA">ANTENA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Precio Mensual (Bs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precioMensual}
                    onChange={(e) => setPrecioMensual(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Estado Servicio
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoCliente)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO (Baja)</option>
                  </select>
                </div>
              </div>

              <FechaManualInput
                label="Fecha de Inicio del Servicio (Día, Mes y Año)"
                value={fechaInicio}
                onChange={setFechaInicio}
                helperText="Puedes ingresar su fecha histórica real de contrato (ej. 01/03/2020)."
              />

              {/* Bloque de Saneamiento Histórico: Último Mes Pagado */}
              <div className="rounded-xl border border-cyan-500/30 bg-slate-950/90 p-3.5">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={incluirUltimoPagoBase}
                    onChange={(e) => setIncluirUltimoPagoBase(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-cyan-300">
                      Registrar Último Mes de Pago (Saneamiento de Historial)
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      Ejemplo: si el cliente inició el{' '}
                      <strong className="text-slate-200">01/03/2020</strong> y
                      su último mes pagado fue{' '}
                      <strong className="text-slate-200">
                        01/09/2026 (2026-09)
                      </strong>
                      , el sistema tomará ese último pago como base y calculará
                      lo que debe únicamente de ahí en adelante (
                      {sumarMesesPeriodo(periodoUltimoPagoBase, 1)} hacia
                      adelante).
                    </span>
                  </div>
                </label>

                {incluirUltimoPagoBase && (
                  <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Último Mes Pagado (Periodo AAAA-MM)
                      </label>
                      <input
                        type="month"
                        required={incluirUltimoPagoBase}
                        value={periodoUltimoPagoBase}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPeriodoUltimoPagoBase(val);
                          if (val) setFechaUltimoPagoBase(`${val}-01`);
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </div>

                    <FechaManualInput
                      label="Fecha del Último Pago Realizado (ej. 01/09/2026)"
                      value={fechaUltimoPagoBase}
                      onChange={(val) => {
                        setFechaUltimoPagoBase(val);
                        if (val && val.length >= 7) {
                          setPeriodoUltimoPagoBase(val.slice(0, 7));
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalClienteAbierto(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  {clienteEditando ? 'Guardar Cambios' : 'Registrar Alta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: AGREGAR PAGO CON EXTRACTO Y CONTROL CONSECUTIVO          */}
      {/* ================================================================= */}
      {clienteCobroRapido && extractoCobroRapido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                  {clienteCobroRapido.codigo_cliente}
                </span>
                <span className="text-xs text-slate-400">
                  Inicio: {formatearFechaDMY(clienteCobroRapido.fecha_inicio)}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-300">
                Tarifa Mensual: Bs{' '}
                {Number(clienteCobroRapido.precio_mensual).toFixed(2)}
              </span>
            </div>

            <h3 className="mt-2 text-lg font-bold text-white">
              Agregar Pago — {clienteCobroRapido.nombres}{' '}
              {clienteCobroRapido.apellidos}
            </h3>

            {/* Panel de Extracto Rápido: Pagos Anteriores y Mes que Debe */}
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/90 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Extracto de Pagos Anteriores y Meses Pendientes
                </span>
                <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
                  Le toca pagar:{' '}
                  {formatearPeriodoMes(
                    extractoCobroRapido.proximoMesAPagar,
                    'corto'
                  )}{' '}
                  ({extractoCobroRapido.proximoMesAPagar})
                </span>
              </div>

              {/* Cronograma de meses del cliente */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {extractoCobroRapido.detalleMensual.map((item) => {
                  const esSeleccionado = item.periodo === periodoMesPago;
                  if (item.estadoMes === 'PAGADO') {
                    return (
                      <button
                        key={item.periodo}
                        type="button"
                        onClick={() => setPeriodoMesPago(item.periodo)}
                        title={`Pagado el ${formatearFechaDMY(item.ultimoReciboMes?.fecha_pago)} (${item.ultimoReciboMes?.numero_recibo ?? 'S/N'})`}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                          esSeleccionado
                            ? 'border-emerald-300 bg-emerald-500/30 text-white'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          {item.etiquetaCorta} ({item.periodo}): PAGADO Bs{' '}
                          {item.montoPagado.toFixed(0)}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.periodo}
                      type="button"
                      onClick={() => setPeriodoMesPago(item.periodo)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                        esSeleccionado
                          ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      }`}
                    >
                      <AlertCircle className="h-3 w-3" />
                      <span>
                        {item.etiquetaCorta} ({item.periodo}): DEBE Bs{' '}
                        {item.montoDebe.toFixed(0)}
                      </span>
                    </button>
                  );
                })}

                {/* Botón para seleccionar el próximo mes consecutivo si es futuro */}
                {!extractoCobroRapido.detalleMensual.some(
                  (m) => m.periodo === extractoCobroRapido.proximoMesAPagar
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      setPeriodoMesPago(extractoCobroRapido.proximoMesAPagar)
                    }
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      periodoMesPago === extractoCobroRapido.proximoMesAPagar
                        ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400'
                        : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    }`}
                  >
                    <ArrowRight className="h-3 w-3" />
                    <span>
                      Siguiente consecutivo:{' '}
                      {formatearPeriodoMes(
                        extractoCobroRapido.proximoMesAPagar,
                        'corto'
                      )}{' '}
                      ({extractoCobroRapido.proximoMesAPagar})
                    </span>
                  </button>
                )}
              </div>

              {/* Resumen de últimos recibos pagados */}
              {extractoCobroRapido.cobrosCliente.length > 0 && (
                <div className="mt-2.5 border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                  Último pago registrado:{' '}
                  <strong className="text-emerald-300">
                    {formatearPeriodoMes(
                      extractoCobroRapido.cobrosCliente[0].periodo_mes,
                      'largo'
                    )}{' '}
                    ({extractoCobroRapido.cobrosCliente[0].periodo_mes})
                  </strong>{' '}
                  · Cancelado el{' '}
                  <span className="font-mono text-slate-200">
                    {formatearFechaDMY(
                      extractoCobroRapido.cobrosCliente[0].fecha_pago
                    )}
                  </span>{' '}
                  · Bs{' '}
                  {Number(extractoCobroRapido.cobrosCliente[0].monto).toFixed(2)}{' '}
                  ({extractoCobroRapido.cobrosCliente[0].numero_recibo || 'S/N'})
                </div>
              )}
            </div>

            {exitoPagoModal && (
              <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs font-medium text-emerald-200">
                {exitoPagoModal}
              </div>
            )}

            {errorPago && (
              <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                {errorPago}
              </div>
            )}

            {periodoSeleccionadoYaPagado && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/15 p-2.5 text-xs text-amber-200">
                <span>
                  Atención: El mes{' '}
                  <strong>
                    {formatearPeriodoMes(periodoMesPago)} ({periodoMesPago})
                  </strong>{' '}
                  ya figura como PAGADO en el extracto.
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPeriodoMesPago(extractoCobroRapido.proximoMesAPagar)
                  }
                  className="ml-2 shrink-0 rounded bg-amber-400 px-2 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-300"
                >
                  Ir a {extractoCobroRapido.proximoMesAPagar}
                </button>
              </div>
            )}

            <form
              onSubmit={handleGuardarCobroRapido}
              className="mt-4 space-y-3.5"
            >
              <FechaManualInput
                label="Fecha de Cancelación / Pago (Día, Mes y Año)"
                value={fechaPago}
                onChange={setFechaPago}
                helperText="Registra manualmente el día, mes y año en que el cliente realizó la cancelación."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Periodo Mes a Cancelar (Consecutivo)
                  </label>
                  <input
                    type="month"
                    required
                    value={periodoMesPago}
                    onChange={(e) => setPeriodoMesPago(e.target.value)}
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
                    N° Recibo / Factura
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
                    value={observacionPago}
                    onChange={(e) => setObservacionPago(e.target.value)}
                    placeholder="Ej. Pago en oficina"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setClienteCobroRapido(null)}
                  className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => void registrarPagoCliente(true)}
                  className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25"
                >
                  Guardar y Cobrar Siguiente Mes ({sumarMesesPeriodo(periodoMesPago, 1)})
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Confirmar Cobro ({periodoMesPago})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: EXTRACTO INTEGRAL DE PAGOS ANTERIORES Y MESES QUE DEBE   */}
      {/* ================================================================= */}
      {clienteFicha && extractoClienteFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-cyan-400">
                    {clienteFicha.codigo_cliente}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                    Sucursal {clienteFicha.sucursal_id}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      clienteFicha.estado === 'ACTIVO'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {clienteFicha.estado}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">
                  {clienteFicha.nombres} {clienteFicha.apellidos}
                </h3>
                <p className="text-xs text-slate-400">
                  {clienteFicha.zona_comunidad} · {clienteFicha.direccion} ·
                  Tel: +{clienteFicha.celular} · Inicio:{' '}
                  <span className="font-mono text-cyan-300">
                    {formatearFechaDMY(clienteFicha.fecha_inicio)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cli = clienteFicha;
                    const sigMes = extractoClienteFicha.proximoMesAPagar;
                    setClienteFicha(null);
                    abrirModalCobro(cli, sigMes);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Cobrar {extractoClienteFicha.proximoMesAPagar}
                </button>
                <Link
                  href={`/consulta?codigo=${encodeURIComponent(clienteFicha.codigo_cliente)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
                >
                  <span>Mini-App</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Resumen de Extracto en 3 tarjetas */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-[11px] text-slate-400">
                  Último Mes Cancelado
                </div>
                <div className="mt-1 text-sm font-bold text-emerald-300">
                  {extractoClienteFicha.ultimoPeriodoPagado
                    ? `${formatearPeriodoMes(extractoClienteFicha.ultimoPeriodoPagado)} (${extractoClienteFicha.ultimoPeriodoPagado})`
                    : 'Sin pagos aún'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-[11px] text-slate-400">
                  Meses que Debe a la Fecha
                </div>
                <div
                  className={`mt-1 text-sm font-bold ${
                    extractoClienteFicha.mesesQueDebe.length > 0
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {extractoClienteFicha.mesesQueDebe.length > 0
                    ? `${extractoClienteFicha.mesesQueDebe.length} mes(es) · Bs ${extractoClienteFicha.saldoPendiente.toFixed(2)}`
                    : '0 meses (Al día)'}
                </div>
              </div>

              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                <div className="text-[11px] text-cyan-300">
                  Le Corresponde Pagar (Consecutivo)
                </div>
                <div className="mt-1 text-sm font-bold text-white">
                  {formatearPeriodoMes(extractoClienteFicha.proximoMesAPagar)} (
                  {extractoClienteFicha.proximoMesAPagar})
                </div>
              </div>
            </div>

            {/* Extracto Mes a Mes (Pagos Anteriores y Meses Pendientes) */}
            <div className="mt-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                Extracto Mensual Consecutivo (Pagos Anteriores y Meses que Debe)
              </h4>

              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                {extractoClienteFicha.detalleMensual.map((item) => (
                  <div
                    key={item.periodo}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                      item.estadoMes === 'PAGADO'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-amber-500/30 bg-amber-500/10'
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
                            CANCELADO
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            DEBE MES
                          </span>
                        )}
                      </div>
                      {item.estadoMes === 'PAGADO' && item.ultimoReciboMes ? (
                        <div className="mt-0.5 text-slate-400">
                          Fecha de cancelación:{' '}
                          <span className="font-mono text-slate-200">
                            {formatearFechaDMY(item.ultimoReciboMes.fecha_pago)}
                          </span>{' '}
                          · Método: {item.ultimoReciboMes.metodo_pago} · Recibo:{' '}
                          <span className="font-mono text-slate-200">
                            {item.ultimoReciboMes.numero_recibo || 'S/N'}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-0.5 text-amber-200/80">
                          Mensualidad pendiente de pago (Tarifa: Bs{' '}
                          {item.montoDebe.toFixed(2)})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.estadoMes === 'PAGADO' ? (
                        <>
                          <span className="font-bold text-emerald-300">
                            Bs {item.montoPagado.toFixed(2)}
                          </span>
                          {item.ultimoReciboMes && (
                            <button
                              type="button"
                              onClick={async () => {
                                await eliminarCobro(item.ultimoReciboMes!.id);
                                await cargarDatos();
                              }}
                              title="Anular este cobro"
                              className="rounded p-1 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const cli = clienteFicha;
                            setClienteFicha(null);
                            abrirModalCobro(cli, item.periodo);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Cobrar {item.periodo}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setClienteFicha(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Cerrar Extracto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
