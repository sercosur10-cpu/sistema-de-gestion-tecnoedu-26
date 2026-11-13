'use client';

import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import type { SucursalId } from '@/lib/supabase/database.types';
import { LISTA_SUCURSALES } from '../constants';

interface BranchSelectorProps {
  selectedSucursal: SucursalId | 'TODAS';
  onChange: (sucursal: SucursalId | 'TODAS') => void;
  counts?: Partial<Record<SucursalId | 'TODAS', number>>;
}

export function BranchSelector({
  selectedSucursal,
  onChange,
  counts,
}: BranchSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange('TODAS')}
        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all ${
          selectedSucursal === 'TODAS'
            ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-sm'
            : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
        }`}
      >
        <Building2 className="h-3.5 w-3.5" />
        <span>Todas las Sucursales</span>
        {counts?.TODAS !== undefined && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
            {counts.TODAS}
          </span>
        )}
      </button>

      {LISTA_SUCURSALES.map((suc) => {
        const isActive = selectedSucursal === suc.id;
        return (
          <button
            key={suc.id}
            type="button"
            onClick={() => onChange(suc.id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all ${
              isActive
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-sm'
                : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>
              {suc.nombre} <span className="opacity-70">({suc.id})</span>
            </span>
            {counts?.[suc.id] !== undefined && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                {counts[suc.id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
