import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  Cliente,
  Cobro,
  Database,
  SucursalId,
} from '@/lib/supabase/database.types';
import { INITIAL_COBROS } from '@/lib/supabase/mock-data';
import { listarClientes } from '@/modules/clientes/services';
import { obtenerPoliticaCorte } from '@/modules/corte/services';

const LOCAL_STORAGE_COBROS_KEY = 'tecnoedu_isp_cobros_v1';

export const NOMBRES_MESES_CORTOS: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
};

export const NOMBRES_MESES_LARGOS: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

export function obtenerPeriodoActualIso(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${anio}-${mes}`;
}

export function formatearPeriodoMes(
  periodoMes?: string | null,
  formato: 'corto' | 'largo' = 'largo'
): string {
  if (!periodoMes) return '—';
  const partes = periodoMes.slice(0, 7).split('-');
  if (partes.length !== 2) return periodoMes;
  const [anio, mes] = partes;
  const diccionario =
    formato === 'corto' ? NOMBRES_MESES_CORTOS : NOMBRES_MESES_LARGOS;
  const nombreMes = diccionario[mes] ?? mes;
  return `${nombreMes} ${anio}`;
}

export function sumarMesesPeriodo(periodoMes: string, delta: number): string {
  const partes = periodoMes.slice(0, 7).split('-');
  if (partes.length !== 2) return obtenerPeriodoActualIso();
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  if (Number.isNaN(anio) || Number.isNaN(mes)) return obtenerPeriodoActualIso();

  const fecha = new Date(anio, mes - 1 + delta, 1);
  const nuevoAnio = fecha.getFullYear();
  const nuevoMes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${nuevoAnio}-${nuevoMes}`;
}

export function listarPeriodosRango(
  inicioMes: string,
  finMes: string
): string[] {
  const inicio = inicioMes.slice(0, 7);
  const fin = finMes.slice(0, 7);
  if (inicio > fin) return [inicio];

  const resultado: string[] = [];
  let cursor = inicio;
  let seguridad = 0;
  while (cursor <= fin && seguridad < 60) {
    resultado.push(cursor);
    cursor = sumarMesesPeriodo(cursor, 1);
    seguridad++;
  }
  return resultado;
}

function getLocalCobros(): Cobro[] {
  if (typeof window === 'undefined') return INITIAL_COBROS;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_COBROS_KEY);
    if (!raw) {
      window.localStorage.setItem(
        LOCAL_STORAGE_COBROS_KEY,
        JSON.stringify(INITIAL_COBROS)
      );
      return INITIAL_COBROS;
    }
    return JSON.parse(raw) as Cobro[];
  } catch {
    return INITIAL_COBROS;
  }
}

function saveLocalCobros(cobros: Cobro[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_COBROS_KEY, JSON.stringify(cobros));
}

export async function listarCobros(codigoCliente?: string): Promise<Cobro[]> {
  if (!isSupabaseConfigured) {
    const cobros = getLocalCobros();
    const filtrados = codigoCliente
      ? cobros.filter(
          (c) =>
            c.codigo_cliente.toUpperCase() ===
            codigoCliente.trim().toUpperCase()
        )
      : cobros;
    return [...filtrados].sort((a, b) => {
      if (b.periodo_mes !== a.periodo_mes) {
        return b.periodo_mes.localeCompare(a.periodo_mes);
      }
      return b.fecha_pago.localeCompare(a.fecha_pago);
    });
  }

  let query = supabase
    .from('cobros')
    .select('*')
    .order('periodo_mes', { ascending: false })
    .order('fecha_pago', { ascending: false });

  if (codigoCliente) {
    query = query.ilike('codigo_cliente', codigoCliente.trim().toUpperCase());
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error al consultar cobros en Supabase:', error.message);
    return [];
  }
  return data ?? [];
}

export type NuevoCobroInput = Database['public']['Tables']['cobros']['Insert'];

export async function registrarCobro(input: NuevoCobroInput): Promise<{
  data: Cobro | null;
  error: string | null;
}> {
  const fechaNormalizada =
    input.fecha_pago && input.fecha_pago.trim().length > 0
      ? input.fecha_pago.trim()
      : new Date().toISOString().slice(0, 10);

  const payload: NuevoCobroInput = {
    ...input,
    codigo_cliente: input.codigo_cliente.trim().toUpperCase(),
    fecha_pago: fechaNormalizada,
    monto: Number(input.monto),
  };

  if (!isSupabaseConfigured) {
    const actuales = getLocalCobros();
    const nuevo: Cobro = {
      id: crypto.randomUUID(),
      codigo_cliente: payload.codigo_cliente,
      fecha_pago: fechaNormalizada,
      monto: Number(payload.monto),
      periodo_mes: payload.periodo_mes,
      metodo_pago: payload.metodo_pago,
      numero_recibo: payload.numero_recibo ?? null,
      observacion: payload.observacion ?? null,
      created_at: new Date().toISOString(),
    };
    saveLocalCobros([nuevo, ...actuales]);
    return { data: nuevo, error: null };
  }

  const { data, error } = await supabase
    .from('cobros')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function eliminarCobro(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    const actuales = getLocalCobros();
    saveLocalCobros(actuales.filter((c) => c.id !== id));
    return { ok: true, error: null };
  }

  const { error } = await supabase.from('cobros').delete().eq('id', id);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export interface DetalleMesExtracto {
  periodo: string; // 'AAAA-MM'
  etiquetaLarga: string; // 'Septiembre 2026'
  etiquetaCorta: string; // 'Sep 2026'
  estadoMes: 'PAGADO' | 'DEBE' | 'INACTIVO' | 'FUTURO';
  montoPagado: number;
  montoDebe: number;
  cobrosDelMes: Cobro[];
  ultimoReciboMes: Cobro | null;
}

export interface EstadoCuentaCliente {
  cliente: Cliente;
  cobrosCliente: Cobro[];
  detalleMensual: DetalleMesExtracto[];
  mesesPagados: DetalleMesExtracto[];
  mesesQueDebe: DetalleMesExtracto[];
  ultimoPeriodoPagado: string | null;
  proximoMesAPagar: string; // Siguiente mes consecutivo que le corresponde pagar
  totalPagadoPeriodo: number;
  totalPagadoHistorico: number;
  pagadoPeriodoActual: boolean; // true si no debe ningún mes hasta el periodo de corte
  saldoPendiente: number; // Suma total de los meses que debe hasta el periodo de corte
  ultimoPago: Cobro | null;
  enListaDeCorte: boolean; // true si cumple o supera los meses de la Política de Corte (por defecto >= 2 meses)
  umbralMesesCorte: number; // Meses configurados según Política de Corte / PDF vigente
}

/**
 * Calcula el extracto completo de un cliente:
 * - Si el cliente registra un último mes pagado (ej. '2026-09' aunque su fecha_inicio sea '2020-03-01'),
 *   el sistema toma como base ese último mes pagado hacia adelante para calcular qué meses debe,
 *   evitando arrastrar errores de bases de datos antiguas.
 * - Si no registra ningún pago aún, calcula desde el mes de su fecha_inicio hacia adelante.
 * - Evalúa si el cliente entra en "Lista para Corte" según la Política de Corte vigente (por defecto 2 meses).
 */
export function calcularExtractoCliente(
  cliente: Cliente,
  todosCobros: Cobro[],
  periodoCorteInput?: string,
  umbralMesesCorteOverride?: number
): EstadoCuentaCliente {
  const periodoCorte = (
    periodoCorteInput || obtenerPeriodoActualIso()
  ).slice(0, 7);

  const umbralMesesCorte =
    umbralMesesCorteOverride ?? obtenerPoliticaCorte().mesesParaCorte ?? 2;

  const cobrosCliente = todosCobros
    .filter(
      (c) =>
        c.codigo_cliente.toUpperCase() === cliente.codigo_cliente.toUpperCase()
    )
    .sort((a, b) => {
      if (b.periodo_mes !== a.periodo_mes) {
        return b.periodo_mes.localeCompare(a.periodo_mes);
      }
      return b.fecha_pago.localeCompare(a.fecha_pago);
    });

  const periodosConPago = Array.from(
    new Set(
      cobrosCliente
        .filter((c) => Number(c.monto) > 0)
        .map((c) => c.periodo_mes.slice(0, 7))
    )
  ).sort();

  const ultimoPeriodoPagado =
    periodosConPago[periodosConPago.length - 1] ?? null;

  const mesFechaInicio = (cliente.fecha_inicio || periodoCorte).slice(0, 7);

  // REGLA CLAVE DE SANEAMIENTO HISTÓRICO:
  // Si el cliente tiene un último mes pagado registrado (ej. 2026-09),
  // todos los meses anteriores o iguales a ese último pago se consideran cerrados/saneados,
  // y la deuda se contabiliza estrictamente desde (ultimoPeriodoPagado + 1 mes) hasta periodoCorte.
  // Si no tiene pagos registrados, se contabiliza desde mesFechaInicio hasta periodoCorte.
  let listaPeriodos: string[] = [];

  if (ultimoPeriodoPagado) {
    const siguienteAlUltimoPago = sumarMesesPeriodo(ultimoPeriodoPagado, 1);
    const mesesPosteriores =
      siguienteAlUltimoPago <= periodoCorte
        ? listarPeriodosRango(siguienteAlUltimoPago, periodoCorte)
        : [];
    listaPeriodos = Array.from(
      new Set([...periodosConPago, ...mesesPosteriores])
    ).sort();
  } else {
    const fin = mesFechaInicio > periodoCorte ? mesFechaInicio : periodoCorte;
    listaPeriodos = listarPeriodosRango(mesFechaInicio, fin);
  }

  const detalleMensual: DetalleMesExtracto[] = listaPeriodos.map((periodo) => {
    const cobrosDelMes = cobrosCliente.filter(
      (c) => c.periodo_mes.slice(0, 7) === periodo
    );
    const montoPagado = cobrosDelMes.reduce(
      (acc, item) => acc + Number(item.monto),
      0
    );
    const tienePago = cobrosDelMes.length > 0 && montoPagado > 0;
    const esFuturo = periodo > periodoCorte;

    let estadoMes: DetalleMesExtracto['estadoMes'];
    if (tienePago) {
      estadoMes = 'PAGADO';
    } else if (cliente.estado === 'INACTIVO') {
      estadoMes = 'INACTIVO';
    } else if (esFuturo) {
      estadoMes = 'FUTURO';
    } else {
      estadoMes = 'DEBE';
    }

    const montoDebe =
      estadoMes === 'DEBE' ? Number(cliente.precio_mensual) : 0;

    return {
      periodo,
      etiquetaLarga: formatearPeriodoMes(periodo, 'largo'),
      etiquetaCorta: formatearPeriodoMes(periodo, 'corto'),
      estadoMes,
      montoPagado,
      montoDebe,
      cobrosDelMes,
      ultimoReciboMes: cobrosDelMes[0] ?? null,
    };
  });

  const mesesPagados = detalleMensual.filter((m) => m.estadoMes === 'PAGADO');
  const mesesQueDebe = detalleMensual.filter((m) => m.estadoMes === 'DEBE');

  // Determinar el siguiente mes consecutivo que le corresponde pagar:
  // 1. Si tiene un último mes pagado, el siguiente mes que le toca pagar es siempre (ultimoPeriodoPagado + 1 mes),
  //    que coincide con mesesQueDebe[0] cuando tiene deuda acumulada.
  // 2. Si no tiene pagos registrados, empieza en mesFechaInicio.
  let proximoMesAPagar: string;
  if (ultimoPeriodoPagado) {
    proximoMesAPagar = sumarMesesPeriodo(ultimoPeriodoPagado, 1);
  } else if (mesesQueDebe.length > 0) {
    proximoMesAPagar = mesesQueDebe[0].periodo;
  } else {
    proximoMesAPagar = mesFechaInicio;
  }

  const totalPagadoPeriodo = cobrosCliente
    .filter((c) => c.periodo_mes.slice(0, 7) === periodoCorte)
    .reduce((acc, item) => acc + Number(item.monto), 0);

  const totalPagadoHistorico = cobrosCliente.reduce(
    (acc, item) => acc + Number(item.monto),
    0
  );

  const saldoPendiente =
    cliente.estado === 'INACTIVO'
      ? 0
      : mesesQueDebe.reduce((acc, m) => acc + m.montoDebe, 0);

  const pagadoPeriodoActual =
    cliente.estado === 'INACTIVO' ? true : mesesQueDebe.length === 0;

  const enListaDeCorte =
    cliente.estado === 'ACTIVO' && mesesQueDebe.length >= umbralMesesCorte;

  return {
    cliente,
    cobrosCliente,
    detalleMensual,
    mesesPagados,
    mesesQueDebe,
    ultimoPeriodoPagado,
    proximoMesAPagar,
    totalPagadoPeriodo,
    totalPagadoHistorico,
    pagadoPeriodoActual,
    saldoPendiente,
    ultimoPago: cobrosCliente[0] ?? null,
    enListaDeCorte,
    umbralMesesCorte,
  };
}

/**
 * Calcula el estado de cuenta y extracto consecutivo de todos los clientes
 * hasta el periodo de corte indicado (por defecto el mes actual).
 */
export async function obtenerEstadosCuenta(
  periodoMes?: string,
  sucursalFiltro: SucursalId | 'TODAS' = 'TODAS'
): Promise<EstadoCuentaCliente[]> {
  const corte = periodoMes || obtenerPeriodoActualIso();
  const [clientes, cobros] = await Promise.all([
    listarClientes(sucursalFiltro),
    listarCobros(),
  ]);

  return clientes.map((cliente) =>
    calcularExtractoCliente(cliente, cobros, corte)
  );
}
