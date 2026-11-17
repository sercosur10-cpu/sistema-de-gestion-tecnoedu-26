'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Users,
  CreditCard,
  FileSpreadsheet,
  Wifi,
  Radio,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Package,
  Wrench,
  KeyRound,
  ShieldCheck,
  Plus,
  Lock,
  Globe,
  Mail,
} from 'lucide-react';
import type {
  Cliente,
  Cobro,
  SucursalId,
} from '@/lib/supabase/database.types';
import { SUCURSALES_META } from '@/modules/sucursales/constants';
import { listarClientes } from '@/modules/clientes/services';
import { listarCobros } from '@/modules/cobros/services';
import { ClientesModule } from '@/modules/clientes/components/ClientesModule';
import { CobrosModule } from '@/modules/cobros/components/CobrosModule';
import { EstadosCuentaModule } from '@/modules/cobros/components/EstadosCuentaModule';
import { EgresosYEquiposModule } from '@/modules/egresos-equipos/components/EgresosYEquiposModule';
import { PanelTecnicoModule } from '@/modules/egresos-equipos/components/PanelTecnicoModule';
import {
  listarEquiposInventario,
  type EquipoClienteItem,
} from '@/modules/egresos-equipos/services';
import { useAuth, type CuentaAcceso } from '@/modules/auth/AuthContext';

interface SucursalWorkspaceProps {
  sucursalId: SucursalId;
}

export type TabSucursal =
  | 'CLIENTES'
  | 'COBROS'
  | 'ESTADOS_CUENTA'
  | 'EQUIPOS_Y_EGRESOS'
  | 'VISTA_TECNICOS'
  | 'ACCESOS_SUCURSAL';

export function SucursalWorkspace({ sucursalId }: SucursalWorkspaceProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabSucursal | null;

  const {
    usuarioActivo,
    cuentas,
    actualizarCuentaAcceso,
    crearCuentaTecnico,
  } = useAuth();
  const esAdminGeneral = usuarioActivo?.rol === 'ADMIN_GENERAL';
  const meta = SUCURSALES_META[sucursalId];

  const [tabActiva, setTabActiva] = useState<TabSucursal>('CLIENTES');
  const [clientesSucursal, setClientesSucursal] = useState<Cliente[]>([]);
  const [cobrosSucursal, setCobrosSucursal] = useState<Cobro[]>([]);
  const [equiposSucursal, setEquiposSucursal] = useState<EquipoClienteItem[]>(
    []
  );

  // Estado para gestión de accesos propios de la Agencia (1 Administrativo + Técnicos de esta sucursal)
  const [cuentaEditando, setCuentaEditando] = useState<CuentaAcceso | null>(
    null
  );
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [feedbackAccesos, setFeedbackAccesos] = useState<string | null>(null);

  const [modalNuevoTecnico, setModalNuevoTecnico] = useState(false);
  const [tecNombre, setTecNombre] = useState('');
  const [tecEmail, setTecEmail] = useState('');
  const [tecPassword, setTecPassword] = useState('');

  useEffect(() => {
    if (
      tabParam === 'CLIENTES' ||
      tabParam === 'COBROS' ||
      tabParam === 'ESTADOS_CUENTA' ||
      tabParam === 'EQUIPOS_Y_EGRESOS' ||
      tabParam === 'VISTA_TECNICOS' ||
      tabParam === 'ACCESOS_SUCURSAL'
    ) {
      setTabActiva(tabParam);
    }
  }, [tabParam]);

  const recargarResumen = useCallback(async () => {
    const [cli, todosCobros, eqs] = await Promise.all([
      listarClientes(sucursalId),
      listarCobros(),
      listarEquiposInventario(sucursalId),
    ]);
    setClientesSucursal(cli);
    setEquiposSucursal(eqs);
    const codigosSet = new Set(cli.map((c) => c.codigo_cliente.toUpperCase()));
    const cobrosDeSucursal = todosCobros.filter(
      (cob) =>
        codigosSet.has(cob.codigo_cliente.toUpperCase()) ||
        cob.codigo_cliente.toUpperCase().startsWith(sucursalId)
    );
    setCobrosSucursal(cobrosDeSucursal);
  }, [sucursalId]);

  useEffect(() => {
    void recargarResumen();
  }, [recargarResumen]);

  // Cuentas que pertenecen exclusivamente a esta Agencia (su Administrativo + sus Técnicos)
  const personalDeEstaSucursal = useMemo(
    () => cuentas.filter((c) => c.sucursalId === sucursalId),
    [cuentas, sucursalId]
  );

  const administrativosSucursal = useMemo(
    () =>
      personalDeEstaSucursal.filter((c) => c.rol === 'OPERADOR_SUCURSAL'),
    [personalDeEstaSucursal]
  );

  const tecnicosSucursal = useMemo(
    () =>
      personalDeEstaSucursal.filter((c) => c.rol === 'TECNICO_SUCURSAL'),
    [personalDeEstaSucursal]
  );

  const activos = clientesSucursal.filter((c) => c.estado === 'ACTIVO');
  const inactivos = clientesSucursal.filter((c) => c.estado === 'INACTIVO');
  const fibraCount = clientesSucursal.filter(
    (c) => c.tipo_tecnologia === 'FIBRA'
  ).length;
  const antenaCount = clientesSucursal.filter(
    (c) => c.tipo_tecnologia === 'ANTENA'
  ).length;
  const facturacionMensualActiva = activos.reduce(
    (acc, c) => acc + Number(c.precio_mensual),
    0
  );
  const totalRecaudadoSucursal = cobrosSucursal.reduce(
    (acc, c) => acc + Number(c.monto),
    0
  );

  const stockEquiposSucursal = equiposSucursal.filter(
    (e) => e.estado === 'EN_STOCK'
  ).length;

  const codigoEjemploMiniApp =
    clientesSucursal[0]?.codigo_cliente ?? `${sucursalId}-001`;

  const abrirEdicionCuenta = (c: CuentaAcceso) => {
    setCuentaEditando(c);
    setNuevoNombre(c.nombre);
    setNuevoEmail(c.email);
    setNuevaPassword(c.passwordHash);
  };

  const handleGuardarCuentaSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaEditando) return;
    const res = await actualizarCuentaAcceso(cuentaEditando.id, {
      nombre: nuevoNombre,
      email: nuevoEmail,
      passwordHash: nuevaPassword,
    });
    setFeedbackAccesos(res.mensaje);
    setCuentaEditando(null);
  };

  const handleCrearTecnicoSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await crearCuentaTecnico({
      nombre: tecNombre,
      email: tecEmail,
      passwordHash: tecPassword,
      sucursalId,
    });
    setFeedbackAccesos(res.mensaje);
    if (res.ok) {
      setTecNombre('');
      setTecEmail('');
      setTecPassword('');
      setModalNuevoTecnico(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera de la Sucursal */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {esAdminGeneral && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Resumen General
              </Link>
            )}
            <span
              className={`rounded-md border px-2.5 py-0.5 font-mono text-xs font-bold ${meta.colorBadge}`}
            >
              Agencia Independiente {meta.id}
            </span>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
              Equipo Propio: {administrativosSucursal.length} Administrativo ·{' '}
              {tecnicosSucursal.length} Técnicos
            </span>
            <span className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
              {sucursalId === 'ROB'
                ? 'Política de Corte Interna (Documento PDF)'
                : 'Plaza Legalizada ATT (Política PDF)'}
            </span>
          </div>
          <h1 className="pt-1 text-2xl font-bold text-white">
            Centro de Gestión Independiente — Agencia {meta.nombre} ({meta.id})
          </h1>
          <p className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" />
              {meta.departamento}
            </span>
            <a
              href={`https://wa.me/${meta.telefonoSoporteDefault}?text=${encodeURIComponent(
                `Hola Soporte TecnoEdu Agencia ${meta.nombre}, me comunico desde el sistema.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              title={`Abrir WhatsApp de Oficina ${meta.nombre}`}
            >
              <Phone className="h-3.5 w-3.5 text-emerald-400" />
              <span>WhatsApp Oficina: +{meta.telefonoSoporteDefault}</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <a
              href="https://tecnoedu.com.bo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-300 transition hover:bg-cyan-500/20"
              title="Sitio Web Oficial de la Empresa"
            >
              <Globe className="h-3 w-3 text-cyan-400" />
              <span>Sitio Web: tecnoedu.com.bo</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 text-slate-300">
              <Mail className="h-3 w-3 text-emerald-400" />
              <span>Correo Corp: kcatari@tecnoedu.com.bo</span>
            </span>
          </p>
        </div>

        <Link
          href={`/consulta?sucursal=${sucursalId}&codigo=${encodeURIComponent(codigoEjemploMiniApp)}`}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
        >
          <span>
            Consulta Sucursal {sucursalId} ({codigoEjemploMiniApp})
          </span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* KPIs Operativos de la Agencia */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">
            Padrón Agencia {meta.nombre}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-white">
            {clientesSucursal.length} clientes
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> {activos.length} Activos
            </span>
            <span className="inline-flex items-center gap-1 text-rose-400">
              <XCircle className="h-3 w-3" /> {inactivos.length} De Baja
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Distribución Tecnológica</div>
          <div className="mt-1 flex items-baseline gap-3 text-xl font-bold text-white">
            <span className="inline-flex items-center gap-1 text-indigo-300">
              <Wifi className="h-4 w-4" /> {fibraCount} Fibra
            </span>
            <span className="text-slate-600">/</span>
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Radio className="h-4 w-4" /> {antenaCount} Antena
            </span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            Enlaces instalados en {meta.nombre}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">
            Inventario Equipos ({meta.id})
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-300">
            {equiposSucursal.length} equipos
          </div>
          <div className="mt-1.5 text-xs text-slate-400">
            {stockEquiposSucursal} en Stock · {tecnicosSucursal.length} técnicos
          </div>
        </div>
      </div>

      {/* Selector de las 6 Pestañas Independientes de la Sucursal */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setTabActiva('CLIENTES')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
            tabActiva === 'CLIENTES'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>1. Clientes y Pagos ({clientesSucursal.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('COBROS')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
            tabActiva === 'COBROS'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>2. Caja de Cobros ({cobrosSucursal.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('ESTADOS_CUENTA')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
            tabActiva === 'ESTADOS_CUENTA'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>3. Estados de Cuenta y Corte</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('EQUIPOS_Y_EGRESOS')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
            tabActiva === 'EQUIPOS_Y_EGRESOS'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>
            4. Egresos (Fijos/Variables) e Inventario Equipos ({meta.id})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('VISTA_TECNICOS')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
            tabActiva === 'VISTA_TECNICOS'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>
            5. Vista Técnicos (Reemplazos — {tecnicosSucursal.length} Técnicos)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('ACCESOS_SUCURSAL')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
            tabActiva === 'ACCESOS_SUCURSAL'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>
            6. Accesos Agencia {meta.nombre} (1 Admin +{' '}
            {tecnicosSucursal.length} Técnicos)
          </span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {tabActiva === 'CLIENTES' && (
        <ClientesModule
          initialSucursal={sucursalId}
          lockSucursal={true}
          onDataChange={recargarResumen}
        />
      )}

      {tabActiva === 'COBROS' && (
        <CobrosModule
          initialSucursal={sucursalId}
          lockSucursal={true}
          onDataChange={recargarResumen}
        />
      )}

      {tabActiva === 'ESTADOS_CUENTA' && (
        <EstadosCuentaModule
          initialSucursal={sucursalId}
          lockSucursal={true}
        />
      )}

      {tabActiva === 'EQUIPOS_Y_EGRESOS' && (
        <EgresosYEquiposModule sucursalFija={sucursalId} />
      )}

      {tabActiva === 'VISTA_TECNICOS' && (
        <PanelTecnicoModule sucursalFija={sucursalId} />
      )}

      {tabActiva === 'ACCESOS_SUCURSAL' && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-white">
                Personal y Accesos Independientes — Agencia {meta.nombre} (
                {meta.id})
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Esta agencia opera de forma independiente con{' '}
                <strong>
                  {administrativosSucursal.length} Administrativo y{' '}
                  {tecnicosSucursal.length} Técnicos de campo
                </strong>
                . Las contraseñas y accesos son administrados de forma centralizada por Gerencia General (
                <span className="font-mono text-cyan-300">kcatari@tecnoedu.com.bo</span>).
              </p>
            </div>

            {esAdminGeneral && (
              <button
                type="button"
                onClick={() => setModalNuevoTecnico(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
              >
                <Plus className="h-4 w-4" />
                Agregar Técnico en {meta.nombre} ({meta.id})
              </button>
            )}
          </div>

          {!esAdminGeneral && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-xs text-cyan-200">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <div>
                <strong className="block text-sm font-semibold text-white">
                  Gestión Exclusiva de Contraseñas por Administración Central
                </strong>
                <p className="mt-0.5 text-slate-300">
                  Por seguridad, solo la Administración Central (
                  <strong className="text-cyan-300">kcatari@tecnoedu.com.bo</strong>
                  ) puede crear, cambiar o restablecer contraseñas de sucursales y técnicos. Para cualquier cambio o entrega de credenciales, comuníquese directamente con Gerencia.
                </p>
              </div>
            </div>
          )}

          {feedbackAccesos && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {feedbackAccesos}
              </span>
              <button
                type="button"
                onClick={() => setFeedbackAccesos(null)}
                className="text-emerald-300 hover:underline"
              >
                Cerrar
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="border-b border-slate-800 px-5 py-4">
              <h3 className="text-sm font-bold text-white">
                Padrón de Cuentas de Agencia {meta.nombre} (
                {personalDeEstaSucursal.length} integrantes)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">Rol en Agencia {meta.id}</th>
                    <th className="px-4 py-3.5">Nombre / Cargo</th>
                    <th className="px-4 py-3.5">Correo de Ingreso</th>
                    <th className="px-4 py-3.5">Contraseña</th>
                    <th className="px-4 py-3.5">Alcance en la App</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {personalDeEstaSucursal.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {c.rol === 'OPERADOR_SUCURSAL' ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" />{' '}
                            ADMINISTRATIVO {c.sucursalId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-300">
                            <Wrench className="h-3.5 w-3.5" /> TÉCNICO{' '}
                            {c.sucursalId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white">
                          {c.nombre}
                        </div>
                        <div className="text-xs text-slate-400">{c.cargo}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-cyan-300">
                        {c.email}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-amber-300">
                        {esAdminGeneral ? c.passwordHash : '••••••••'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        {c.rol === 'OPERADOR_SUCURSAL'
                          ? `Gestión completa de Agencia ${meta.nombre}: Clientes, Cobros, Egresos Fijos/Variables, Lotes de Equipos y sus ${tecnicosSucursal.length} Técnicos.`
                          : `Acceso Limitado Técnico (${meta.id}): Recibe equipos de ${meta.nombre}, registra reemplazos y devuelve dañados a observación en casa.`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        {esAdminGeneral ? (
                          <button
                            type="button"
                            onClick={() => abrirEdicionCuenta(c)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Editar Correo / Clave
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Lock className="h-3 w-3 text-slate-500" />
                            Control Central
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar Correo o Contraseña del personal de la sucursal */}
      {cuentaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              Modificar Credenciales — {cuentaEditando.nombre}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Agencia {meta.nombre} ({meta.id})
            </p>

            <form
              onSubmit={handleGuardarCuentaSucursal}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Nombre del Integrante
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
                  Contraseña
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
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para agregar un nuevo Técnico a esta Sucursal */}
      {modalNuevoTecnico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              Nuevo Técnico para Agencia {meta.nombre} ({meta.id})
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Este técnico pertenecerá exclusivamente a la sucursal{' '}
              <strong>{meta.nombre}</strong>.
            </p>

            <form
              onSubmit={handleCrearTecnicoSucursal}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Nombre del Técnico
                </label>
                <input
                  type="text"
                  required
                  value={tecNombre}
                  onChange={(e) => setTecNombre(e.target.value)}
                  placeholder={`Ej. Técnico ${tecnicosSucursal.length + 1} ${meta.nombre}`}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Correo de Ingreso
                </label>
                <input
                  type="email"
                  required
                  value={tecEmail}
                  onChange={(e) => setTecEmail(e.target.value)}
                  placeholder={`tecnico${tecnicosSucursal.length + 1}.${meta.nombre.toLowerCase().replace(/\s+/g, '')}@tecnoedu.com.bo`}
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
                  Crear Técnico en {meta.id}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
