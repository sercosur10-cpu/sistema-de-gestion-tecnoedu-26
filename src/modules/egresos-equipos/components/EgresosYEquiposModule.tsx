'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package,
  Wrench,
  Wallet,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Flame,
  RotateCcw,
  UserCheck,
  Trash2,
  FileText,
} from 'lucide-react';
import type { SucursalId } from '@/lib/supabase/database.types';
import {
  LISTA_SUCURSALES,
  SUCURSALES_META,
} from '@/modules/sucursales/constants';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  listarEgresos,
  crearEgreso,
  eliminarEgreso,
  listarEquiposInventario,
  ingresarLoteEquipos,
  entregarEquiposATecnico,
  resolverEquipoEnObservacion,
  type EgresoRegistro,
  type EquipoClienteItem,
  type EstadoEquipoCliente,
  type TipoEgreso,
  type TipoEquipoCliente,
  type CategoriaEgreso,
} from '../services';

const ETIQUETAS_ESTADO_EQUIPO: Record<EstadoEquipoCliente, { label: string }> =
  {
    EN_STOCK: { label: 'En Stock (Almacén)' },
    EN_PODER_TECNICO: { label: 'En Poder del Técnico' },
    INSTALADO_CLIENTE: { label: 'Instalado en Cliente' },
    EN_OBSERVACION_CASA: { label: 'En Observación (Casa)' },
    BAJA_QUEMADO: { label: 'Baja (Quemado)' },
  };

interface EgresosYEquiposModuleProps {
  sucursalFija?: SucursalId;
}

export function EgresosYEquiposModule({
  sucursalFija,
}: EgresosYEquiposModuleProps) {
  const { usuarioActivo, cuentas } = useAuth();
  const [tabActiva, setTabActiva] = useState<
    'EQUIPOS' | 'VARIABLES' | 'FIJOS'
  >('EQUIPOS');

  const [filtroSucursal, setFiltroSucursal] = useState<SucursalId | 'TODAS'>(
    sucursalFija ?? 'TAR'
  );
  const [filtroEstadoEquipo, setFiltroEstadoEquipo] = useState<
    EstadoEquipoCliente | 'TODOS'
  >('TODOS');

  const [egresos, setEgresos] = useState<EgresoRegistro[]>([]);
  const [equipos, setEquipos] = useState<EquipoClienteItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Modal: Comprar / Ingresar Lote de Equipos (ej. 20 equipos para Tarija)
  const [modalLoteAbierto, setModalLoteAbierto] = useState(false);
  const [loteSucursal, setLoteSucursal] = useState<SucursalId>(
    sucursalFija ?? 'TAR'
  );
  const [loteCantidad, setLoteCantidad] = useState('20');
  const [loteTipoEquipo, setLoteTipoEquipo] =
    useState<TipoEquipoCliente>('ONU_FIBRA');
  const [loteMarcaModelo, setLoteMarcaModelo] = useState(
    'ONU Dual Band GPON/EPON'
  );
  const [loteFechaCompra, setLoteFechaCompra] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loteCostoTotal, setLoteCostoTotal] = useState('3600');
  const [loteRegistrarEgreso, setLoteRegistrarEgreso] = useState(true);

  // Modal: Entregar Equipos a Técnico (ej. Técnico 1 Pedro recibe 2 equipos)
  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false);
  const [entregaSucursal, setEntregaSucursal] = useState<SucursalId>(
    sucursalFija ?? 'TAR'
  );
  const [entregaCantidad, setEntregaCantidad] = useState('2');
  const [entregaTecnicoNombre, setEntregaTecnicoNombre] = useState(
    'Pedro (Técnico 1 - Tarija)'
  );

  // Modal: Resolver Equipo en Observación en Casa (Alta tras reseteo vs Baja por quema)
  const [equipoAResolver, setEquipoAResolver] =
    useState<EquipoClienteItem | null>(null);
  const [notaResolucionCasa, setNotaResolucionCasa] = useState(
    'Se realizó chequeo de fuente óptica y reseteo de fábrica en casa/laboratorio.'
  );

  // Formulario: Nuevo Egreso (Fijo o Variable con Detalle)
  const [egresoSucursal, setEgresoSucursal] = useState<SucursalId>(
    sucursalFija ?? 'TAR'
  );
  const [egresoCategoria, setEgresoCategoria] = useState<CategoriaEgreso>(
    'MATERIAL_CONSUMIBLE'
  );
  const [egresoConcepto, setEgresoConcepto] = useState('');
  const [egresoDetalleGastos, setEgresoDetalleGastos] = useState('');
  const [egresoMontoBs, setEgresoMontoBs] = useState('');
  const [egresoFecha, setEgresoFecha] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    const sucQuery = sucursalFija ?? filtroSucursal;
    const [listaEg, listaEq] = await Promise.all([
      listarEgresos(sucQuery),
      listarEquiposInventario(sucQuery),
    ]);
    setEgresos(listaEg);
    setEquipos(listaEq);
    setCargando(false);
  }, [sucursalFija, filtroSucursal]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (sucursalFija) {
      setFiltroSucursal(sucursalFija);
      setLoteSucursal(sucursalFija);
      setEntregaSucursal(sucursalFija);
      setEgresoSucursal(sucursalFija);
    }
  }, [sucursalFija]);

  const tecnicosDisponibles = useMemo(
    () =>
      cuentas.filter(
        (c) =>
          c.rol === 'TECNICO_SUCURSAL' &&
          c.activo &&
          c.sucursalId === entregaSucursal
      ),
    [cuentas, entregaSucursal]
  );

  useEffect(() => {
    if (tecnicosDisponibles.length > 0) {
      setEntregaTecnicoNombre(tecnicosDisponibles[0].nombre);
    }
  }, [tecnicosDisponibles]);

  // Contadores de Inventario de Equipos
  const resumenEquipos = useMemo(() => {
    const enStock = equipos.filter((e) => e.estado === 'EN_STOCK').length;
    const enPoderTecnico = equipos.filter(
      (e) => e.estado === 'EN_PODER_TECNICO'
    ).length;
    const instalados = equipos.filter(
      (e) => e.estado === 'INSTALADO_CLIENTE'
    ).length;
    const enObservacion = equipos.filter(
      (e) => e.estado === 'EN_OBSERVACION_CASA'
    ).length;
    const quemadosBaja = equipos.filter(
      (e) => e.estado === 'BAJA_QUEMADO'
    ).length;

    return {
      total: equipos.length,
      enStock,
      enPoderTecnico,
      instalados,
      enObservacion,
      quemadosBaja,
    };
  }, [equipos]);

  const equiposEnObservacion = useMemo(
    () => equipos.filter((e) => e.estado === 'EN_OBSERVACION_CASA'),
    [equipos]
  );

  const equiposFiltrados = useMemo(() => {
    if (filtroEstadoEquipo === 'TODOS') return equipos;
    return equipos.filter((e) => e.estado === filtroEstadoEquipo);
  }, [equipos, filtroEstadoEquipo]);

  const equiposStockSucursalEntrega = useMemo(
    () =>
      equipos.filter(
        (e) => e.sucursal_id === entregaSucursal && e.estado === 'EN_STOCK'
      ),
    [equipos, entregaSucursal]
  );

  const egresosFijos = useMemo(
    () => egresos.filter((e) => e.tipo_egreso === 'FIJO'),
    [egresos]
  );
  const egresosVariables = useMemo(
    () => egresos.filter((e) => e.tipo_egreso === 'VARIABLE'),
    [egresos]
  );

  const totalFijosBs = useMemo(
    () => egresosFijos.reduce((acc, e) => acc + Number(e.monto || 0), 0),
    [egresosFijos]
  );
  const totalVariablesBs = useMemo(
    () => egresosVariables.reduce((acc, e) => acc + Number(e.monto || 0), 0),
    [egresosVariables]
  );

  const handleIngresarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    const res = await ingresarLoteEquipos({
      sucursal_id: loteSucursal,
      cantidad: Number(loteCantidad),
      tipo_equipo: loteTipoEquipo,
      marca_modelo: loteMarcaModelo,
      fecha_ingreso: loteFechaCompra,
    });

    if (loteRegistrarEgreso && Number(loteCostoTotal) > 0) {
      await crearEgreso({
        fecha_egreso: loteFechaCompra,
        periodo_mes: loteFechaCompra.slice(0, 7),
        sucursal_id: loteSucursal,
        tipo_egreso: 'VARIABLE',
        categoria: 'COMPRA_EQUIPOS_CLIENTES',
        concepto: `Compra de Lote de ${res.creados} Equipos (${loteMarcaModelo}) para ${loteSucursal}`,
        detalle_gastos: `Ingreso a inventario de ${res.creados} equipos (${res.primerCodigo} al ${res.ultimoCodigo}) para sucursal ${loteSucursal}.`,
        beneficiario_proveedor: 'Proveedor Mayorista Equipos ISP',
        monto: Number(loteCostoTotal),
        metodo_pago: 'TRANSFERENCIA',
        numero_comprobante: `LOTE-${loteSucursal}`,
        registrado_por: usuarioActivo?.nombre ?? 'Administración Central',
      });
    }

    setMensajeExito(
      `Se ingresaron ${res.creados} equipos nuevos (${res.primerCodigo} al ${res.ultimoCodigo}) al stock de ${SUCURSALES_META[loteSucursal].nombre} (${loteSucursal}).`
    );
    setModalLoteAbierto(false);
    await cargarDatos();
  };

  const handleEntregarATecnico = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    const res = await entregarEquiposATecnico({
      sucursal_id: entregaSucursal,
      cantidad: Number(entregaCantidad),
      nombre_tecnico: entregaTecnicoNombre,
      fecha_entrega: new Date().toISOString().slice(0, 10),
    });

    if (!res.ok) {
      setMensajeError(res.mensaje);
      return;
    }

    setMensajeExito(res.mensaje);
    setModalEntregaAbierto(false);
    await cargarDatos();
  };

  const handleResolverObservacion = async (
    decision: 'ALTA_A_STOCK' | 'BAJA_DEFINITIVA'
  ) => {
    if (!equipoAResolver) return;
    setMensajeError(null);
    setMensajeExito(null);

    const res = await resolverEquipoEnObservacion({
      equipo_id: equipoAResolver.id,
      decision,
      nota_revision: notaResolucionCasa,
      fecha_resolucion: new Date().toISOString().slice(0, 10),
    });

    if (!res.ok) {
      setMensajeError(res.mensaje);
      return;
    }

    setMensajeExito(res.mensaje);
    setEquipoAResolver(null);
    await cargarDatos();
  };

  const handleCrearEgreso = async (e: React.FormEvent, tipo: TipoEgreso) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    await crearEgreso({
      fecha_egreso: egresoFecha,
      periodo_mes: egresoFecha.slice(0, 7),
      sucursal_id: sucursalFija ?? egresoSucursal,
      tipo_egreso: tipo,
      categoria:
        tipo === 'FIJO' ? 'SUELDOS' : egresoCategoria || 'MATERIAL_CONSUMIBLE',
      concepto: egresoConcepto,
      detalle_gastos:
        tipo === 'VARIABLE'
          ? egresoDetalleGastos
          : egresoDetalleGastos || 'Gasto fijo mensual programado.',
      beneficiario_proveedor:
        tipo === 'FIJO' ? 'Planilla / Proveedor Fijo' : 'Proveedor / Operación',
      monto: Number(egresoMontoBs),
      metodo_pago: 'EFECTIVO',
      numero_comprobante: null,
      registrado_por: usuarioActivo?.nombre ?? 'Administración Central',
    });

    setMensajeExito(
      `Egreso ${tipo === 'FIJO' ? 'Fijo' : 'Variable'} registrado correctamente (${egresoConcepto} — Bs ${Number(egresoMontoBs).toLocaleString('es-BO')}).`
    );
    setEgresoConcepto('');
    setEgresoDetalleGastos('');
    setEgresoMontoBs('');
    await cargarDatos();
  };

  const handleEliminarEgreso = async (id: string) => {
    await eliminarEgreso(id);
    await cargarDatos();
  };

  const renderBadgeEstadoEquipo = (estado: EstadoEquipoCliente) => {
    const info = ETIQUETAS_ESTADO_EQUIPO[estado];
    const styles: Record<EstadoEquipoCliente, string> = {
      EN_STOCK: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
      EN_PODER_TECNICO: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200',
      INSTALADO_CLIENTE: 'border-blue-500/40 bg-blue-500/15 text-blue-200',
      EN_OBSERVACION_CASA: 'border-amber-500/50 bg-amber-500/20 text-amber-200',
      BAJA_QUEMADO: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    };
    return (
      <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${styles[estado]}`}
      >
        {info.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            <Package className="h-3.5 w-3.5" />
            Control Operativo en 3 Componentes
          </span>
          <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            Egresos Fijos, Variables y Trazabilidad de Equipos Cliente
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            1) Egresos Fijos (sueldos y más) · 2) Egresos Variables con campo de
            detalle (alambre, conectores, fibra de 1 pelo, gasolina) · 3)
            Control de Equipos de Cliente entregados a Técnicos, reemplazos y
            observación en casa.
          </p>
        </div>

        {/* Selector de Sucursal */}
        {!sucursalFija && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1.5">
            <button
              type="button"
              onClick={() => setFiltroSucursal('TODAS')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                filtroSucursal === 'TODAS'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas (4)
            </button>
            {LISTA_SUCURSALES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFiltroSucursal(s.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  filtroSucursal === s.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.nombre} ({s.id})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alertas */}
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

      {/* Pestañas de los 3 Componentes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setTabActiva('EQUIPOS')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
            tabActiva === 'EQUIPOS'
              ? 'border-cyan-500 bg-cyan-500/15 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Componente 3 (Principal)
            </div>
            <div className="mt-0.5 text-sm font-bold">
              Equipos Cliente y Técnicos
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Stock: {resumenEquipos.enStock} · En Técnico:{' '}
              {resumenEquipos.enPoderTecnico} · En Casa:{' '}
              {resumenEquipos.enObservacion}
            </div>
          </div>
          <Package className="h-6 w-6 text-cyan-400" />
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('VARIABLES')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
            tabActiva === 'VARIABLES'
              ? 'border-amber-500 bg-amber-500/15 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Componente 2
            </div>
            <div className="mt-0.5 text-sm font-bold">
              Egresos Variables (con Detalle)
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Alambre, conectores, fibra 1 pelo, gasolina · Bs{' '}
              {totalVariablesBs.toLocaleString('es-BO')}
            </div>
          </div>
          <Wrench className="h-6 w-6 text-amber-400" />
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('FIJOS')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
            tabActiva === 'FIJOS'
              ? 'border-emerald-500 bg-emerald-500/15 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Componente 1
            </div>
            <div className="mt-0.5 text-sm font-bold">
              Egresos Fijos (Sueldos y más)
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Planillas, alquileres, fibra mayorista · Bs{' '}
              {totalFijosBs.toLocaleString('es-BO')}
            </div>
          </div>
          <Wallet className="h-6 w-6 text-emerald-400" />
        </button>
      </div>

      {/* =====================================================================
          TAB 1: INVENTARIO DE EQUIPOS CLIENTE + ASIGNACIÓN A TÉCNICOS + CASA
      ====================================================================== */}
      {tabActiva === 'EQUIPOS' && (
        <div className="space-y-6">
          {/* Tarjetas de Estado del Inventario */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <button
              type="button"
              onClick={() =>
                setFiltroEstadoEquipo(
                  filtroEstadoEquipo === 'EN_STOCK' ? 'TODOS' : 'EN_STOCK'
                )
              }
              className={`rounded-xl border p-3.5 text-left transition ${
                filtroEstadoEquipo === 'EN_STOCK'
                  ? 'border-emerald-400 bg-emerald-950/40'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold text-emerald-400">
                1. En Stock (Almacén)
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {resumenEquipos.enStock}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Equipos nuevos o reseteados listos
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFiltroEstadoEquipo(
                  filtroEstadoEquipo === 'EN_PODER_TECNICO'
                    ? 'TODOS'
                    : 'EN_PODER_TECNICO'
                )
              }
              className={`rounded-xl border p-3.5 text-left transition ${
                filtroEstadoEquipo === 'EN_PODER_TECNICO'
                  ? 'border-cyan-400 bg-cyan-950/40'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold text-cyan-400">
                2. En Poder del Técnico
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {resumenEquipos.enPoderTecnico}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Entregados (el técnico responde)
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFiltroEstadoEquipo(
                  filtroEstadoEquipo === 'INSTALADO_CLIENTE'
                    ? 'TODOS'
                    : 'INSTALADO_CLIENTE'
                )
              }
              className={`rounded-xl border p-3.5 text-left transition ${
                filtroEstadoEquipo === 'INSTALADO_CLIENTE'
                  ? 'border-blue-400 bg-blue-950/40'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold text-blue-400">
                3. Instalados en Cliente
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {resumenEquipos.instalados}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Activos por alta o reemplazo
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFiltroEstadoEquipo(
                  filtroEstadoEquipo === 'EN_OBSERVACION_CASA'
                    ? 'TODOS'
                    : 'EN_OBSERVACION_CASA'
                )
              }
              className={`rounded-xl border p-3.5 text-left transition ${
                filtroEstadoEquipo === 'EN_OBSERVACION_CASA'
                  ? 'border-amber-400 bg-amber-950/40'
                  : 'border-amber-500/30 bg-amber-950/15 hover:border-amber-500/50'
              }`}
            >
              <div className="text-[11px] font-semibold text-amber-300">
                4. En Observación (Casa)
              </div>
              <div className="mt-1 text-2xl font-bold text-amber-200">
                {resumenEquipos.enObservacion}
              </div>
              <div className="mt-0.5 text-[11px] text-amber-300/80">
                Retirados para chequeo / reseteo
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFiltroEstadoEquipo(
                  filtroEstadoEquipo === 'BAJA_QUEMADO'
                    ? 'TODOS'
                    : 'BAJA_QUEMADO'
                )
              }
              className={`rounded-xl border p-3.5 text-left transition ${
                filtroEstadoEquipo === 'BAJA_QUEMADO'
                  ? 'border-rose-400 bg-rose-950/40'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold text-rose-400">
                5. Baja (Quemados)
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {resumenEquipos.quemadosBaja}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Descartados tras revisión
              </div>
            </button>
          </div>

          {/* Botonera de Acciones de Inventario */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">
                Flujo de Control:
              </span>{' '}
              Compra lote (ej. 20 equipos Tarija) → Entrega a Técnico (ej. Pedro
              recibe 2) → Técnico reemplaza 1 nuevo y devuelve 1 dañado a{' '}
              <span className="font-semibold text-amber-300">
                Observación en Casa
              </span>{' '}
              → Chequeo/Reseteo en Casa da{' '}
              <span className="font-semibold text-emerald-300">Alta</span> o{' '}
              <span className="font-semibold text-rose-300">Baja</span>.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setModalLoteAbierto(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" />
                Comprar / Ingresar Lote de Equipos
              </button>
              <button
                type="button"
                onClick={() => setModalEntregaAbierto(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                <UserCheck className="h-4 w-4" />
                Entregar Equipos a Técnico
              </button>
            </div>
          </div>

          {/* BANDEJA PRIORITARIA: EQUIPOS RETIRADOS EN OBSERVACIÓN (CHEQUEO / RESETEO EN CASA) */}
          {equiposEnObservacion.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-amber-200">
                    <RotateCcw className="h-4 w-4 text-amber-400" />
                    Bandeja de Chequeo y Reseteo en Casa (
                    {equiposEnObservacion.length} equipo
                    {equiposEnObservacion.length > 1 ? 's' : ''} en observación)
                  </h2>
                  <p className="mt-0.5 text-xs text-amber-100/80">
                    Equipos retirados por los técnicos en reemplazos a clientes.
                    Realiza las pruebas/reseteo en casa y define si vuelven al
                    Stock (Alta) o se descartan por quema (Baja).
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {equiposEnObservacion.map((eq) => (
                  <div
                    key={eq.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-amber-500/30 bg-slate-950/90 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {eq.codigo_equipo} · Serie/MAC:{' '}
                          {eq.serie_mac ?? 'S/N'}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                          Sucursal {eq.sucursal_id}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-white">
                        {eq.tipo_equipo} — {eq.marca_modelo}
                      </div>
                      <div className="mt-1.5 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 text-[11px] text-slate-300">
                        <div>
                          <span className="font-semibold text-slate-400">
                            Retirado por:
                          </span>{' '}
                          {eq.tecnico_responsable ?? 'Técnico de campo'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-400">
                            Cliente origen:
                          </span>{' '}
                          {eq.codigo_cliente_instalado ?? 'S/C'}
                        </div>
                        <div className="mt-1 text-amber-200">
                          <span className="font-semibold">
                            Motivo reportado:
                          </span>{' '}
                          {eq.motivo_observacion_baja}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEquipoAResolver(eq);
                          setNotaResolucionCasa(
                            'Se realizó chequeo de fuente y reseteo de fábrica en casa. Equipo operativo.'
                          );
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reseteo OK → Dar de ALTA a Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEquipoAResolver(eq);
                          setNotaResolucionCasa(
                            'Se verificó en casa: placa/puerto PON quemado sin posibilidad de recuperación.'
                          );
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30"
                      >
                        <Flame className="h-3.5 w-3.5" />
                        Quemado → Dar de BAJA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla General de Equipos por Unidad */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Padrón Individual de Equipos de Cliente (
                  {equiposFiltrados.length} registros)
                </h2>
                <p className="text-xs text-slate-400">
                  Cada equipo tiene trazabilidad desde que entra al inventario
                  de la sucursal hasta que se entrega al técnico o se instala en
                  el cliente.
                </p>
              </div>
              {filtroEstadoEquipo !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => setFiltroEstadoEquipo('TODOS')}
                  className="text-xs font-semibold text-cyan-400 hover:underline"
                >
                  Ver todos los estados ({equipos.length})
                </button>
              )}
            </div>

            {cargando ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Cargando inventario de equipos...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pr-3">Código / MAC</th>
                      <th className="px-3 py-2.5">Suc.</th>
                      <th className="px-3 py-2.5">Equipo / Modelo</th>
                      <th className="px-3 py-2.5">Estado Actual</th>
                      <th className="px-3 py-2.5">
                        Custodia Técnico / Cliente
                      </th>
                      <th className="py-2.5 pl-3">Detalle / Historial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {equiposFiltrados.map((eq) => (
                      <tr key={eq.id} className="hover:bg-slate-800/40">
                        <td className="py-3 pr-3">
                          <div className="font-mono font-bold text-white">
                            {eq.codigo_equipo}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {eq.serie_mac}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                            {eq.sucursal_id}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-200">
                            {eq.tipo_equipo}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {eq.marca_modelo}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {renderBadgeEstadoEquipo(eq.estado)}
                        </td>
                        <td className="px-3 py-3">
                          {eq.tecnico_responsable && (
                            <div className="text-cyan-300">
                              <span className="text-[10px] uppercase text-slate-400">
                                Técnico:{' '}
                              </span>
                              <span className="font-semibold">
                                {eq.tecnico_responsable}
                              </span>
                            </div>
                          )}
                          {eq.codigo_cliente_instalado && (
                            <div className="text-emerald-300">
                              <span className="text-[10px] uppercase text-slate-400">
                                Cliente:{' '}
                              </span>
                              <span className="font-semibold">
                                {eq.codigo_cliente_instalado}
                              </span>
                            </div>
                          )}
                          {!eq.tecnico_responsable &&
                            !eq.codigo_cliente_instalado && (
                              <span className="text-slate-500">
                                Almacén Sucursal {eq.sucursal_id}
                              </span>
                            )}
                        </td>
                        <td className="py-3 pl-3 text-[11px] text-slate-300">
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
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: COMPONENTE 2 — EGRESOS VARIABLES (CON CAMPO DE DETALLE DE GASTOS)
      ====================================================================== */}
      {tabActiva === 'VARIABLES' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Formulario de Egreso Variable con Detalle */}
          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-5 lg:col-span-5">
            <div className="flex items-center gap-2 text-amber-400">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Registrar Egreso Variable
              </span>
            </div>
            <h2 className="mt-1 text-base font-bold text-white">
              Gastos Variables con Campo de Detalle
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Ideal para materiales difíciles de controlar por unidad
              (conectores, cable de fibra de 1 pelo, alambre de amarre,
              gasolina, ferretería, compra de lotes).
            </p>

            <form
              onSubmit={(e) => handleCrearEgreso(e, 'VARIABLE')}
              className="mt-4 space-y-3.5"
            >
              {!sucursalFija && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Sucursal
                  </label>
                  <select
                    value={egresoSucursal}
                    onChange={(e) =>
                      setEgresoSucursal(e.target.value as SucursalId)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    {LISTA_SUCURSALES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Categoría del Gasto Variable
                </label>
                <select
                  value={egresoCategoria}
                  onChange={(e) =>
                    setEgresoCategoria(e.target.value as CategoriaEgreso)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="MATERIAL_CONSUMIBLE">
                    Material Consumible (Alambre, Conectores, Fibra 1 pelo)
                  </option>
                  <option value="GASOLINA_TRANSPORTE">
                    Gasolina, Combustible y Transporte
                  </option>
                  <option value="COMPRA_EQUIPOS_CLIENTES">
                    Compra de Equipos Cliente (ONUs / Routers)
                  </option>
                  <option value="MANTENIMIENTO_HERRAMIENTAS">
                    Mantenimiento y Herramientas
                  </option>
                  <option value="OTROS_GASTOS">Otros Gastos Variables</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Concepto Principal del Gasto Variable
                </label>
                <input
                  type="text"
                  required
                  value={egresoConcepto}
                  onChange={(e) => setEgresoConcepto(e.target.value)}
                  placeholder="Ej. Material menudo de instalación y gasolina"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-300">
                  Detalle de Gastos (Alambre, Conectores, Fibra 1 pelo,
                  Gasolina, etc.) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={egresoDetalleGastos}
                  onChange={(e) => setEgresoDetalleGastos(e.target.value)}
                  placeholder="Ej. 2 rollos de alambre de amarre (Bs 90), 50 conectores rápidos SC/APC (Bs 175), 300m cable fibra drop 1 pelo (Bs 210), gasolina camioneta cuadrilla (Bs 120)..."
                  className="mt-1 w-full rounded-xl border border-amber-500/40 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Monto Total (Bs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={egresoMontoBs}
                    onChange={(e) => setEgresoMontoBs(e.target.value)}
                    placeholder="595"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Fecha del Gasto
                  </label>
                  <input
                    type="date"
                    required
                    value={egresoFecha}
                    onChange={(e) => setEgresoFecha(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
              >
                Guardar Egreso Variable con Detalle
              </button>
            </form>
          </div>

          {/* Listado de Egresos Variables */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Historial de Egresos Variables ({egresosVariables.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Total acumulado en vista:{' '}
                  <span className="font-bold text-amber-300">
                    Bs {totalVariablesBs.toLocaleString('es-BO')}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {egresosVariables.map((eg) => (
                <div
                  key={eg.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                          {eg.sucursal_id}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {eg.concepto}
                        </span>
                      </div>
                      <div className="mt-1.5 rounded-lg border border-slate-800/90 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                        <span className="font-semibold text-amber-300">
                          Detalle de gastos:{' '}
                        </span>
                        {eg.detalle_gastos}
                      </div>
                      <div className="mt-1.5 text-[11px] text-slate-500">
                        Fecha: {eg.fecha_egreso} · Registrado por:{' '}
                        {eg.registrado_por}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-mono text-sm font-bold text-amber-300">
                        Bs {Number(eg.monto).toLocaleString('es-BO')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEliminarEgreso(eg.id)}
                        className="text-slate-500 hover:text-rose-400"
                        title="Eliminar registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: COMPONENTE 1 — EGRESOS FIJOS (SUELDOS Y MÁS)
      ====================================================================== */}
      {tabActiva === 'FIJOS' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-5 lg:col-span-5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Registrar Egreso Fijo
              </span>
            </div>
            <h2 className="mt-1 text-base font-bold text-white">
              Sueldos, Alquileres, Enlace Mayorista y Servicios
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Registra los compromisos fijos mensuales de cada sucursal.
            </p>

            <form
              onSubmit={(e) => handleCrearEgreso(e, 'FIJO')}
              className="mt-4 space-y-3.5"
            >
              {!sucursalFija && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Sucursal
                  </label>
                  <select
                    value={egresoSucursal}
                    onChange={(e) =>
                      setEgresoSucursal(e.target.value as SucursalId)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    {LISTA_SUCURSALES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Concepto del Egreso Fijo (Sueldos y más)
                </label>
                <input
                  type="text"
                  required
                  value={egresoConcepto}
                  onChange={(e) => setEgresoConcepto(e.target.value)}
                  placeholder="Ej. Sueldo Mensual Técnico / Pago Enlace Dedicado"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Observación / Detalle (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={egresoDetalleGastos}
                  onChange={(e) => setEgresoDetalleGastos(e.target.value)}
                  placeholder="Ej. Planilla mensual personal técnico y operador de cobranza, alquiler de nodo..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Monto (Bs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={egresoMontoBs}
                    onChange={(e) => setEgresoMontoBs(e.target.value)}
                    placeholder="3200"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    required
                    value={egresoFecha}
                    onChange={(e) => setEgresoFecha(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                Registrar Egreso Fijo
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-7">
            <h2 className="text-sm font-bold text-white">
              Historial de Egresos Fijos ({egresosFijos.length})
            </h2>
            <p className="text-xs text-slate-400">
              Total Egresos Fijos en vista:{' '}
              <span className="font-bold text-emerald-300">
                Bs {totalFijosBs.toLocaleString('es-BO')}
              </span>
            </p>

            <div className="mt-4 space-y-3">
              {egresosFijos.map((eg) => (
                <div
                  key={eg.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                          {eg.sucursal_id}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {eg.concepto}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">
                        {eg.detalle_gastos}
                      </p>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Fecha: {eg.fecha_egreso} · Registrado por:{' '}
                        {eg.registrado_por}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-300">
                        Bs {Number(eg.monto).toLocaleString('es-BO')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEliminarEgreso(eg.id)}
                        className="text-slate-500 hover:text-rose-400"
                        title="Eliminar registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: COMPRAR / INGRESAR LOTE DE EQUIPOS (EJ. 20 EQUIPOS TARIJA)
      ====================================================================== */}
      {modalLoteAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Comprar / Ingresar Lote de Equipos de Cliente al Inventario
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Ejemplo: Se compraron 20 equipos para Tarija (TAR). Se crearán 20
              unidades numeradas en estado <strong>EN_STOCK</strong> listas para
              entregar a los técnicos.
            </p>

            <form onSubmit={handleIngresarLote} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Sucursal Destino
                  </label>
                  <select
                    value={sucursalFija ?? loteSucursal}
                    disabled={Boolean(sucursalFija)}
                    onChange={(e) =>
                      setLoteSucursal(e.target.value as SucursalId)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white disabled:opacity-75"
                  >
                    {(sucursalFija
                      ? LISTA_SUCURSALES.filter((s) => s.id === sucursalFija)
                      : LISTA_SUCURSALES
                    ).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Cantidad de Equipos
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    required
                    value={loteCantidad}
                    onChange={(e) => setLoteCantidad(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Tipo de Equipo Cliente
                </label>
                <select
                  value={loteTipoEquipo}
                  onChange={(e) =>
                    setLoteTipoEquipo(e.target.value as TipoEquipoCliente)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="ONU_FIBRA">ONU Fibra Óptica</option>
                  <option value="ROUTER_WIFI">Router WiFi</option>
                  <option value="ANTENA_CPE">Antena / CPE Inalámbrico</option>
                  <option value="OTRO_EQUIPO">Otro Equipo Cliente</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Marca / Modelo
                  </label>
                  <input
                    type="text"
                    required
                    value={loteMarcaModelo}
                    onChange={(e) => setLoteMarcaModelo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Costo Total Lote (Bs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={loteCostoTotal}
                    onChange={(e) => setLoteCostoTotal(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={loteRegistrarEgreso}
                  onChange={(e) => setLoteRegistrarEgreso(e.target.checked)}
                />
                Registrar también automáticamente la compra en Egresos Variables
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalLoteAbierto(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950"
                >
                  Ingresar {loteCantidad} Equipos a Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ENTREGAR EQUIPOS A UN TÉCNICO (EJ. PEDRO RECIBE 2 EQUIPOS)
      ====================================================================== */}
      {modalEntregaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Entregar Equipos de Stock a Custodia de Técnico
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Selecciona el técnico (ej.{' '}
              <strong>Pedro (Técnico 1 - Tarija)</strong>) y cuántos equipos de
              Stock llevará a campo. El técnico deberá responder por cada uno en
              su panel.
            </p>

            <form onSubmit={handleEntregarATecnico} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Sucursal de Stock
                  </label>
                  <select
                    value={sucursalFija ?? entregaSucursal}
                    disabled={Boolean(sucursalFija)}
                    onChange={(e) =>
                      setEntregaSucursal(e.target.value as SucursalId)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white disabled:opacity-75"
                  >
                    {(sucursalFija
                      ? LISTA_SUCURSALES.filter((s) => s.id === sucursalFija)
                      : LISTA_SUCURSALES
                    ).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.id}) — Disponibles:{' '}
                        {
                          equipos.filter(
                            (eq) =>
                              eq.sucursal_id === s.id &&
                              eq.estado === 'EN_STOCK'
                          ).length
                        }
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Cantidad a Entregar
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, equiposStockSucursalEntrega.length)}
                    required
                    value={entregaCantidad}
                    onChange={(e) => setEntregaCantidad(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Técnico que Recibe los Equipos
                </label>
                <input
                  type="text"
                  required
                  value={entregaTecnicoNombre}
                  onChange={(e) => setEntregaTecnicoNombre(e.target.value)}
                  placeholder="Pedro (Técnico 1 - Tarija)"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
                {tecnicosDisponibles.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {tecnicosDisponibles.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setEntregaTecnicoNombre(
                            t.email === 'pedro.tarija@tecnoedu.com.bo'
                              ? 'Pedro (Técnico 1 - Tarija)'
                              : t.nombre
                          )
                        }
                        className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-300 hover:bg-cyan-500/20"
                      >
                        Elegir: {t.nombre} ({t.sucursalId})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEntregaAbierto(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={equiposStockSucursalEntrega.length === 0}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40"
                >
                  Entregar {entregaCantidad} Equipo(s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: RESOLVER EQUIPO EN OBSERVACIÓN EN CASA (ALTA O BAJA)
      ====================================================================== */}
      {equipoAResolver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Dictamen de Revisión / Reseteo en Casa:{' '}
              <span className="font-mono text-amber-300">
                {equipoAResolver.codigo_equipo}
              </span>
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              Equipo retirado del cliente{' '}
              <strong>{equipoAResolver.codigo_cliente_instalado}</strong> por{' '}
              <strong>{equipoAResolver.tecnico_responsable}</strong>.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300">
                Informe del Chequeo o Reseteo en Casa
              </label>
              <textarea
                rows={3}
                value={notaResolucionCasa}
                onChange={(e) => setNotaResolucionCasa(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEquipoAResolver(null)}
                className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleResolverObservacion('BAJA_DEFINITIVA')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-rose-400"
              >
                <Flame className="h-4 w-4" />
                Confirmar BAJA (Quemado)
              </button>
              <button
                type="button"
                onClick={() => handleResolverObservacion('ALTA_A_STOCK')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                <RotateCcw className="h-4 w-4" />
                Confirmar ALTA (Vuelve a Stock)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
