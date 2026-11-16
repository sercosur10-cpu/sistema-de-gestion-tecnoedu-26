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

export function normalizarPeriodoMes(periodo?: string | null): string | null {
  if (!periodo) return null;
  const match = String(periodo).trim().match(/^(\d{4})[-/.](\d{1,2})/);
  if (!match) return null;
  const anio = match[1];
  const mes = match[2].padStart(2, '0');
  return `${anio}-${mes}`;
}

export function formatearPeriodoMes(
  periodoMes?: string | null,
  formato: 'corto' | 'largo' = 'largo'
): string {
  if (!periodoMes) return '—';
  const normalizado = normalizarPeriodoMes(periodoMes) ?? periodoMes.slice(0, 7);
  const partes = normalizado.split('-');
  if (partes.length !== 2) return periodoMes;
  const [anio, mes] = partes;
  const diccionario =
    formato === 'corto' ? NOMBRES_MESES_CORTOS : NOMBRES_MESES_LARGOS;
  const nombreMes = diccionario[mes] ?? mes;
  return `${nombreMes} ${anio}`;
}

export function sumarMesesPeriodo(periodoMes: string, delta: number): string {
  const normalizado = normalizarPeriodoMes(periodoMes) ?? periodoMes.slice(0, 7);
  const partes = normalizado.split('-');
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

export type EstadoMesExtracto =
  | 'PAGADO'
  | 'PARCIAL'
  | 'DEBE'
  | 'INACTIVO'
  | 'FUTURO';

export interface DetalleMesExtracto {
  periodo: string; // 'AAAA-MM'
  etiquetaLarga: string; // 'Septiembre 2026'
  etiquetaCorta: string; // 'Sep 2026'
  estadoMes: EstadoMesExtracto;
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
 * Calcula el extracto completo de un cliente cruzando dinámicamente con public.cobros:
 * - Agrupa los cobros por periodo_mes normalizado ('YYYY-MM') sumando todos los abonos.
 * - Compara la suma de pagos contra cliente.precio_mensual:
 *     * suma >= precio_mensual => 'PAGADO' (montoDebe = 0)
 *     * suma > 0 && suma < precio_mensual => 'PARCIAL' (montoDebe = precio_mensual - suma)
 *     * suma === 0 => 'DEBE' (montoDebe = precio_mensual)
 * - Refleja fielmente los pagos históricos migrados desde CSV sin requerir columnas extras en cobros.
 * - Respeta la regla de saneamiento histórico: si registra meses pagados importados,
 *   la deuda se calcula a partir del estado de esos meses hacia adelante hasta el mes de corte.
 */
export function calcularExtractoCliente(
  cliente: Cliente,
  todosCobros: Cobro[],
  periodoCorteInput?: string,
  umbralMesesCorteOverride?: number
): EstadoCuentaCliente {
  const periodoCorte = (
    normalizarPeriodoMes(periodoCorteInput) ||
    (periodoCorteInput || obtenerPeriodoActualIso()).slice(0, 7)
  );

  const umbralMesesCorte =
    umbralMesesCorteOverride ?? obtenerPoliticaCorte().mesesParaCorte ?? 2;

  const precioMensual = Math.max(0, Number(cliente.precio_mensual) || 0);

  // Filtrar cobros del cliente ordenados por periodo y fecha
  const cobrosCliente = todosCobros
    .filter(
      (c) =>
        c.codigo_cliente.trim().toUpperCase() ===
        cliente.codigo_cliente.trim().toUpperCase()
    )
    .sort((a, b) => {
      const pa = normalizarPeriodoMes(a.periodo_mes) ?? a.periodo_mes;
      const pb = normalizarPeriodoMes(b.periodo_mes) ?? b.periodo_mes;
      if (pb !== pa) return pb.localeCompare(pa);
      return b.fecha_pago.localeCompare(a.fecha_pago);
    });

  // Agrupar cobros por periodo normalizado 'YYYY-MM'
  const sumaPorPeriodo = new Map<string, number>();
  const cobrosPorPeriodo = new Map<string, Cobro[]>();

  for (const c of cobrosCliente) {
    const pNorm = normalizarPeriodoMes(c.periodo_mes);
    if (!pNorm) continue;
    const monto = Number(c.monto) || 0;
    sumaPorPeriodo.set(pNorm, (sumaPorPeriodo.get(pNorm) ?? 0) + monto);
    const list = cobrosPorPeriodo.get(pNorm) ?? [];
    list.push(c);
    cobrosPorPeriodo.set(pNorm, list);
  }

  // Identificar periodos con abono registrado
  const periodosConAbono = Array.from(sumaPorPeriodo.keys())
    .filter((p) => (sumaPorPeriodo.get(p) ?? 0) > 0)
    .sort();

  // Periodos totalmente pagados (suma >= precio_mensual)
  const periodosCompletados = periodosConAbono.filter((p) => {
    const pagado = sumaPorPeriodo.get(p) ?? 0;
    return precioMensual === 0 ? pagado > 0 : pagado >= precioMensual;
  });

  const ultimoPeriodoPagado =
    periodosCompletados[periodosCompletados.length - 1] ??
    periodosConAbono[periodosConAbono.length - 1] ??
    null;

  const mesFechaInicio =
    normalizarPeriodoMes(cliente.fecha_inicio) ||
    (cliente.fecha_inicio || periodoCorte).slice(0, 7);

  // Determinar la lista de periodos a desplegar en el extracto consecutivo
  let listaPeriodos: string[] = [];

  if (periodosConAbono.length > 0) {
    // Si tiene pagos importados/registrados, mostramos todos los meses con abono
    // y los meses posteriores que adeude hasta periodoCorte
    const ultimoAbono = periodosConAbono[periodosConAbono.length - 1];
    const siguienteAlUltimo = sumarMesesPeriodo(ultimoAbono, 1);
    const mesesPosteriores =
      siguienteAlUltimo <= periodoCorte
        ? listarPeriodosRango(siguienteAlUltimo, periodoCorte)
        : [];

    listaPeriodos = Array.from(
      new Set([...periodosConAbono, ...mesesPosteriores])
    ).sort();
  } else {
    // Sin pagos: desde su fecha_inicio hasta el periodo de corte
    const fin = mesFechaInicio > periodoCorte ? mesFechaInicio : periodoCorte;
    listaPeriodos = listarPeriodosRango(mesFechaInicio, fin);
  }

  // Evaluar cada periodo individualmente de acuerdo a la suma de cobros y precio mensual
  const detalleMensual: DetalleMesExtracto[] = listaPeriodos.map((periodo) => {
    const cobrosDelMes = cobrosPorPeriodo.get(periodo) ?? [];
    const montoPagado = sumaPorPeriodo.get(periodo) ?? 0;
    const esFuturo = periodo > periodoCorte;

    let estadoMes: EstadoMesExtracto;
    let montoDebe = 0;

    if (precioMensual === 0) {
      estadoMes = montoPagado > 0 ? 'PAGADO' : 'DEBE';
      montoDebe = 0;
    } else if (montoPagado >= precioMensual) {
      estadoMes = 'PAGADO';
      montoDebe = 0;
    } else if (montoPagado > 0) {
      estadoMes = 'PARCIAL';
      montoDebe =
        cliente.estado === 'INACTIVO'
          ? 0
          : Math.max(0, precioMensual - montoPagado);
    } else if (cliente.estado === 'INACTIVO') {
      estadoMes = 'INACTIVO';
      montoDebe = 0;
    } else if (esFuturo) {
      estadoMes = 'FUTURO';
      montoDebe = 0;
    } else {
      estadoMes = 'DEBE';
      montoDebe = precioMensual;
    }

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

  // Meses que adeuda hasta el periodo de corte (incluye parciales y no pagados)
  const mesesQueDebe = detalleMensual.filter(
    (m) =>
      (m.estadoMes === 'DEBE' || m.estadoMes === 'PARCIAL') &&
      m.periodo <= periodoCorte
  );

  // Determinar el próximo mes consecutivo que le corresponde pagar:
  // 1. Si adeuda meses (o tiene un saldo parcial pendiente), el primero de ellos.
  // 2. Si no adeuda nada hasta el corte, el mes inmediatamente siguiente al último corte/pago.
  let proximoMesAPagar: string;
  if (mesesQueDebe.length > 0) {
    proximoMesAPagar = mesesQueDebe[0].periodo;
  } else if (ultimoPeriodoPagado) {
    proximoMesAPagar = sumarMesesPeriodo(ultimoPeriodoPagado, 1);
  } else {
    proximoMesAPagar = sumarMesesPeriodo(periodoCorte, 1);
  }

  const totalPagadoPeriodo = cobrosCliente
    .filter((c) => normalizarPeriodoMes(c.periodo_mes) === periodoCorte)
    .reduce((acc, item) => acc + (Number(item.monto) || 0), 0);

  const totalPagadoHistorico = cobrosCliente.reduce(
    (acc, item) => acc + (Number(item.monto) || 0),
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
