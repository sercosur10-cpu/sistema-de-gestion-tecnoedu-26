import type { SucursalId } from '@/lib/supabase/database.types';

export interface SucursalMeta {
  id: SucursalId;
  nombre: string;
  departamento: string;
  colorBadge: string;
  telefonoSoporteDefault: string;
}

export const SUCURSALES_META: Record<SucursalId, SucursalMeta> = {
  BER: {
    id: 'BER',
    nombre: 'Bermejo',
    departamento: 'Tarija (Frontera Sur)',
    colorBadge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    telefonoSoporteDefault: '59172906807',
  },
  TAR: {
    id: 'TAR',
    nombre: 'Tarija',
    departamento: 'Tarija (Cercado)',
    colorBadge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    telefonoSoporteDefault: '59167390991',
  },
  SCZ: {
    id: 'SCZ',
    nombre: 'Santa Cruz',
    departamento: 'Santa Cruz de la Sierra',
    colorBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    telefonoSoporteDefault: '59171110003',
  },
  ROB: {
    id: 'ROB',
    nombre: 'Roboré',
    departamento: 'Chiquitanía - Santa Cruz',
    colorBadge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    telefonoSoporteDefault: '59167671661',
  },
};

export const LISTA_SUCURSALES: SucursalMeta[] = [
  SUCURSALES_META.BER,
  SUCURSALES_META.TAR,
  SUCURSALES_META.SCZ,
  SUCURSALES_META.ROB,
];

export function isValidSucursalId(value: string): value is SucursalId {
  return value === 'BER' || value === 'TAR' || value === 'SCZ' || value === 'ROB';
}
