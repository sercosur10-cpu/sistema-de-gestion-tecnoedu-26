'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

interface FechaManualInputProps {
  label: string;
  value: string; // Formato AAAA-MM-DD
  onChange: (fechaIso: string) => void;
  helperText?: string;
}

export function formatearFechaDMY(fechaIso?: string | null): string {
  if (!fechaIso) return '—';
  const limpia = fechaIso.slice(0, 10);
  const partes = limpia.split('-');
  if (partes.length !== 3) return fechaIso;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

export function obtenerFechaHoyIso(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function FechaManualInput({
  label,
  value,
  onChange,
  helperText,
}: FechaManualInputProps) {
  const parsePartes = (iso: string) => {
    const limpia = (iso || '').slice(0, 10);
    const partes = limpia.split('-');
    if (partes.length === 3) {
      return {
        anio: partes[0] ?? '',
        mes: partes[1] ?? '',
        dia: partes[2] ?? '',
      };
    }
    const hoy = obtenerFechaHoyIso().split('-');
    return { anio: hoy[0], mes: hoy[1], dia: hoy[2] };
  };

  const inicial = parsePartes(value);
  const [dia, setDia] = useState(inicial.dia);
  const [mes, setMes] = useState(inicial.mes);
  const [anio, setAnio] = useState(inicial.anio);
  const lastEmittedRef = useRef<string>(value);

  useEffect(() => {
    if (value && value !== lastEmittedRef.current) {
      const p = parsePartes(value);
      setDia(p.dia);
      setMes(p.mes);
      setAnio(p.anio);
      lastEmittedRef.current = value;
    }
  }, [value]);

  const emitirSiValida = (dStr: string, mStr: string, yStr: string) => {
    const dNum = parseInt(dStr, 10);
    const mNum = parseInt(mStr, 10);
    const yNum = parseInt(yStr, 10);

    if (
      !Number.isNaN(dNum) &&
      !Number.isNaN(mNum) &&
      !Number.isNaN(yNum) &&
      dNum >= 1 &&
      dNum <= 31 &&
      mNum >= 1 &&
      mNum <= 12 &&
      yStr.length === 4 &&
      yNum >= 1990 &&
      yNum <= 2100
    ) {
      const maxDiasMes = new Date(yNum, mNum, 0).getDate();
      const diaAjustado = Math.min(dNum, maxDiasMes);
      const nuevaIso = `${yNum}-${String(mNum).padStart(2, '0')}-${String(
        diaAjustado
      ).padStart(2, '0')}`;
      lastEmittedRef.current = nuevaIso;
      onChange(nuevaIso);
    }
  };

  const handleDiaChange = (raw: string) => {
    const soloDigitos = raw.replace(/\D/g, '').slice(0, 2);
    setDia(soloDigitos);
    emitirSiValida(soloDigitos, mes, anio);
  };

  const handleMesChange = (raw: string) => {
    const soloDigitos = raw.replace(/\D/g, '').slice(0, 2);
    setMes(soloDigitos);
    emitirSiValida(dia, soloDigitos, anio);
  };

  const handleAnioChange = (raw: string) => {
    const soloDigitos = raw.replace(/\D/g, '').slice(0, 4);
    setAnio(soloDigitos);
    emitirSiValida(dia, mes, soloDigitos);
  };

  const handleBlurDia = () => {
    const dNum = parseInt(dia, 10);
    if (!Number.isNaN(dNum) && dNum >= 1 && dNum <= 31) {
      const padded = String(dNum).padStart(2, '0');
      setDia(padded);
      emitirSiValida(padded, mes, anio);
    }
  };

  const handleBlurMes = () => {
    const mNum = parseInt(mes, 10);
    if (!Number.isNaN(mNum) && mNum >= 1 && mNum <= 12) {
      const padded = String(mNum).padStart(2, '0');
      setMes(padded);
      emitirSiValida(dia, padded, anio);
    }
  };

  const handleDatePickerChange = (nuevaIso: string) => {
    if (!nuevaIso) return;
    const p = parsePartes(nuevaIso);
    setDia(p.dia);
    setMes(p.mes);
    setAnio(p.anio);
    lastEmittedRef.current = nuevaIso;
    onChange(nuevaIso);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
          <Calendar className="h-3.5 w-3.5 text-cyan-400" />
          {label}
        </label>
        <span className="font-mono text-[11px] font-semibold text-slate-400">
          {formatearFechaDMY(value)}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Día (DD)
          </span>
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="DD"
            value={dia}
            onChange={(e) => handleDiaChange(e.target.value)}
            onBlur={handleBlurDia}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-center font-mono text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Mes (MM)
          </span>
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="MM"
            value={mes}
            onChange={(e) => handleMesChange(e.target.value)}
            onBlur={handleBlurMes}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-center font-mono text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Año (AAAA)
          </span>
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="AAAA"
            value={anio}
            onChange={(e) => handleAnioChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-center font-mono text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="col-span-3 sm:col-span-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Calendario
          </span>
          <input
            type="date"
            value={value}
            onChange={(e) => handleDatePickerChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      {helperText && (
        <p className="mt-1.5 text-[11px] text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

