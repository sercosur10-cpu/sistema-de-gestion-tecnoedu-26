'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Building2,
  ArrowUpRight,
  Wifi,
  Radio,
} from 'lucide-react';
import type { Cliente, Cobro } from '@/lib/supabase/database.types';
import {
  listarClientes,
  sembrarDatosDemoEnSupabase,
} from '@/modules/clientes/services';
import { listarCobros } from '@/modules/cobros/services';
import { LISTA_SUCURSALES } from '@/modules/sucursales/constants';

export default function AdminDashboardPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [sembrando, setSembrando] = useState(false);
  const [mensajeSemilla, setMensajeSemilla] = useState<string | null>(null);

  const cargar = async () => {
    const [cli, cob] = await Promise.all([
      listarClientes('TODAS'),
      listarCobros(),
    ]);
    setClientes(cli);
    setCobros(cob);
  };

  useEffect(() => {
    void cargar();
  }, []);

  const handleCargarDatosEjemplo = async () => {
    setSembrando(true);
    const res = await sembrarDatosDemoEnSupabase();
    setMensajeSemilla(res.mensaje);
    await cargar();
    setSembrando(false);
  };

  const totalClientesActivos = clientes.filter(
    (c) => c.estado === 'ACTIVO'
  ).length;
  const totalFacturacionEsperada = clientes
    .filter((c) => c.estado === 'ACTIVO')
    .reduce((acc, c) => acc + Number(c.precio_mensual), 0);
  const totalRecaudado = cobros.reduce((acc, c) => acc + Number(c.monto), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Dashboard Multisucursal TecnoEdu ISP
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Consolidado operativo de las 4 sucursales: Bermejo (BER), Tarija (TAR),
            Santa Cruz (SCZ) y Roboré (ROB).
          </p>
        </div>

        {clientes.length === 0 && (
          <button
            type="button"
            disabled={sembrando}
            onClick={handleCargarDatosEjemplo}
            className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {sembrando
              ? 'Insertando en Supabase...'
              : 'Cargar 6 Clientes de Ejemplo en Supabase'}
          </button>
        )}
      </div>

      {mensajeSemilla && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 text-xs text-cyan-200">
          {mensajeSemilla}
        </div>
      )}

      {/* KPIs Globales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Clientes Activos Totales</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {totalClientesActivos}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            De {clientes.length} clientes registrados en base de datos
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Facturación Mensual Estimada</span>
            <Building2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            Bs {totalFacturacionEsperada.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Suma de tarifas activas en 4 sucursales
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total Cobros Registrados</span>
            <CreditCard className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-300">
            Bs {totalRecaudado.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {cobros.length} transacciones registradas
          </div>
        </div>
      </div>

      {/* Tarjetas por Sucursal */}
      <div>
        <h2 className="text-base font-bold text-white">
          Estado Operativo por Sucursal
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LISTA_SUCURSALES.map((suc) => {
            const cliSuc = clientes.filter((c) => c.sucursal_id === suc.id);
            const fibraCount = cliSuc.filter(
              (c) => c.tipo_tecnologia === 'FIBRA'
            ).length;
            const antenaCount = cliSuc.filter(
              (c) => c.tipo_tecnologia === 'ANTENA'
            ).length;
            const mensualidadSuc = cliSuc
              .filter((c) => c.estado === 'ACTIVO')
              .reduce((acc, c) => acc + Number(c.precio_mensual), 0);

            return (
              <Link
                key={suc.id}
                href={`/admin/sucursal/${suc.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-cyan-500/50 hover:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${suc.colorBadge}`}
                    >
                      {suc.id}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:text-cyan-400" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-white">
                    {suc.nombre}
                  </h3>
                  <p className="text-xs text-slate-400">{suc.departamento}</p>

                  <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Abonados registrados:</span>
                      <span className="font-bold text-white">
                        {cliSuc.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="flex items-center gap-1">
                        <Wifi className="h-3 w-3 text-indigo-400" /> Fibra /{' '}
                        <Radio className="h-3 w-3 text-amber-400" /> Antena:
                      </span>
                      <span className="font-semibold">
                        {fibraCount} / {antenaCount}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Proyección mensual:</span>
                      <span className="font-bold text-emerald-300">
                        Bs {mensualidadSuc.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs font-semibold text-cyan-400">
                  Abrir panel de {suc.nombre} →
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
