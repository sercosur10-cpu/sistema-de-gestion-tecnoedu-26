import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  Cliente,
    Database,
    EstadoCliente,
    SucursalId,
} from '@/lib/supabase/database.types';
import {
  INITIAL_CLIENTES,
  INITIAL_SUCURSALES,
} from '@/lib/supabase/mock-data';

const LOCAL_STORAGE_CLIENTES_KEY = 'tecnoedu_isp_clientes_v1';

function getLocalClientes(): Cliente[] {
  if (typeof window === 'undefined') return INITIAL_CLIENTES;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_CLIENTES_KEY);
    if (!raw) {
      window.localStorage.setItem(
        LOCAL_STORAGE_CLIENTES_KEY,
        JSON.stringify(INITIAL_CLIENTES)
      );
      return INITIAL_CLIENTES;
    }
    return JSON.parse(raw) as Cliente[];
  } catch {
    return INITIAL_CLIENTES;
  }
}

function saveLocalClientes(clientes: Cliente[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    LOCAL_STORAGE_CLIENTES_KEY,
    JSON.stringify(clientes)
  );
}

export async function listarClientes(
  sucursalFiltro?: SucursalId | 'TODAS'
): Promise<Cliente[]> {
  if (!isSupabaseConfigured) {
    const lista = getLocalClientes();
    if (sucursalFiltro && sucursalFiltro !== 'TODAS') {
      return lista.filter((c) => c.sucursal_id === sucursalFiltro);
    }
    return lista;
  }

  // Traer todos los registros con paginación automática superando el límite de 1000 de Supabase PostgREST
  const todos: Cliente[] = [];
  const pageSize = 1000;
  let page = 0;

  while (true) {
    let query = supabase
      .from('clientes')
      .select('*')
      .order('codigo_cliente', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (sucursalFiltro && sucursalFiltro !== 'TODAS') {
      query = query.eq('sucursal_id', sucursalFiltro);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al consultar clientes en Supabase:', error.message);
      break;
    }
    if (!data || data.length === 0) {
      break;
    }
    todos.push(...data);
    if (data.length < pageSize) {
      break;
    }
    page++;
  }

  return todos;
}

export async function buscarClientePorCodigo(
  codigoCliente: string
): Promise<Cliente | null> {
  const codigoNormalizado = codigoCliente.trim().toUpperCase();
  if (!codigoNormalizado) return null;

  if (!isSupabaseConfigured) {
    const lista = getLocalClientes();
    return (
      lista.find(
        (c) => c.codigo_cliente.toUpperCase() === codigoNormalizado
      ) ?? null
    );
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .ilike('codigo_cliente', codigoNormalizado)
    .maybeSingle();

  if (error) {
    console.error('Error al buscar cliente por código:', error.message);
    return null;
  }
  return data;
}

export type NuevoClienteInput =
  Database['public']['Tables']['clientes']['Insert'];
export type ActualizarClienteInput =
  Database['public']['Tables']['clientes']['Update'];

export async function crearCliente(input: NuevoClienteInput): Promise<{
  data: Cliente | null;
  error: string | null;
}> {
  const payload: NuevoClienteInput = {
    ...input,
    codigo_cliente: input.codigo_cliente.trim().toUpperCase(),
    celular: input.celular.replace(/\D/g, ''),
  };

  if (!isSupabaseConfigured) {
    const actuales = getLocalClientes();
    if (actuales.some((c) => c.codigo_cliente === payload.codigo_cliente)) {
      return {
        data: null,
        error: `El código de cliente ${payload.codigo_cliente} ya existe.`,
      };
    }

    const nuevo: Cliente = {
      id: crypto.randomUUID(),
      codigo_cliente: payload.codigo_cliente,
      sucursal_id: payload.sucursal_id,
      nombres: payload.nombres.trim(),
      apellidos: payload.apellidos.trim(),
      celular: payload.celular,
      direccion: payload.direccion ?? null,
      zona_comunidad: payload.zona_comunidad ?? null,
      tipo_tecnologia: payload.tipo_tecnologia,
      precio_mensual: Number(payload.precio_mensual),
      fecha_inicio: payload.fecha_inicio,
      estado: payload.estado ?? 'ACTIVO',
      created_at: new Date().toISOString(),
    };

    const actualizados = [nuevo, ...actuales];
    saveLocalClientes(actualizados);
    return { data: nuevo, error: null };
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Actualiza los datos de un cliente existente (edición de plan, dirección, celular, etc.)
 */
export async function actualizarCliente(
  id: string,
  cambios: ActualizarClienteInput
): Promise<{ data: Cliente | null; error: string | null }> {
  const payload: ActualizarClienteInput = {
    ...cambios,
    ...(cambios.codigo_cliente
      ? { codigo_cliente: cambios.codigo_cliente.trim().toUpperCase() }
      : {}),
    ...(cambios.celular
      ? { celular: cambios.celular.replace(/\D/g, '') }
      : {}),
  };

  if (!isSupabaseConfigured) {
    const actuales = getLocalClientes();
    const idx = actuales.findIndex((c) => c.id === id);
    if (idx === -1) {
      return { data: null, error: 'Cliente no encontrado.' };
    }
    const actualizado: Cliente = {
      ...actuales[idx],
      ...payload,
      precio_mensual:
        payload.precio_mensual !== undefined
          ? Number(payload.precio_mensual)
          : actuales[idx].precio_mensual,
    };
    actuales[idx] = actualizado;
    saveLocalClientes(actuales);
    return { data: actualizado, error: null };
  }

  const { data, error } = await supabase
    .from('clientes')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Da de BAJA ('INACTIVO') o REACTIVA ('ACTIVO') un cliente ISP.
 */
export async function cambiarEstadoCliente(
  id: string,
  nuevoEstado: EstadoCliente
): Promise<{ data: Cliente | null; error: string | null }> {
  return actualizarCliente(id, { estado: nuevoEstado });
}

/**
 * Elimina un cliente (útil para depurar registros de prueba).
 */
export async function eliminarCliente(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    const actuales = getLocalClientes();
    saveLocalClientes(actuales.filter((c) => c.id !== id));
    return { ok: true, error: null };
  }

  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/**
 * Inserta en Supabase los clientes de ejemplo iniciales (o los de una sucursal específica)
 * junto con cobros de prueba para verificar altas, bajas, pagos y consulta.
 */
export async function sembrarDatosDemoEnSupabase(
  sucursalId?: SucursalId
): Promise<{
  ok: boolean;
  mensaje: string;
}> {
  const candidatos = sucursalId
    ? INITIAL_CLIENTES.filter((c) => c.sucursal_id === sucursalId)
    : INITIAL_CLIENTES;

  if (!isSupabaseConfigured) {
    const actuales = getLocalClientes();
    const codigosExistentes = new Set(actuales.map((c) => c.codigo_cliente));
    const nuevos = candidatos.filter(
      (c) => !codigosExistentes.has(c.codigo_cliente)
    );
    saveLocalClientes([...nuevos, ...actuales]);
    return {
      ok: true,
      mensaje: `Se aseguraron ${candidatos.length} clientes de prueba en modo local.`,
    };
  }

  // Asegurar sucursales base primero
  await supabase
    .from('sucursales')
    .upsert(INITIAL_SUCURSALES, { onConflict: 'id', ignoreDuplicates: true });

  const clientesInsert = candidatos.map(
    ({ id: _id, created_at: _createdAt, ...rest }) => rest
  );

  const { error: errCli } = await supabase
    .from('clientes')
    .upsert(clientesInsert, {
      onConflict: 'codigo_cliente',
      ignoreDuplicates: true,
    });

  if (errCli) {
    return {
      ok: false,
      mensaje: `Error al insertar clientes de prueba: ${errCli.message}`,
    };
  }

  return {
    ok: true,
    mensaje: sucursalId
      ? `Se cargaron los clientes de prueba para la sucursal ${sucursalId}.`
      : 'Se cargaron los 6 clientes de ejemplo en las 4 sucursales (BER, TAR, SCZ, ROB).',
  };
}
