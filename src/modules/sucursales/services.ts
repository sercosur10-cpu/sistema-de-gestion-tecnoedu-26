import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Sucursal, SucursalId } from '@/lib/supabase/database.types';
import { INITIAL_SUCURSALES } from '@/lib/supabase/mock-data';

export async function obtenerSucursales(): Promise<Sucursal[]> {
  if (!isSupabaseConfigured) {
    return INITIAL_SUCURSALES;
  }

  const { data, error } = await supabase
    .from('sucursales')
    .select('*')
    .order('id', { ascending: true });

  if (error || !data || data.length === 0) {
    return INITIAL_SUCURSALES;
  }

  return data;
}

export async function obtenerSucursalPorId(id: SucursalId): Promise<Sucursal | null> {
  const sucursales = await obtenerSucursales();
  return sucursales.find((s) => s.id === id) ?? null;
}
