import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { MetodoPago, SucursalId } from '@/lib/supabase/database.types';

export type TipoEgreso = 'FIJO' | 'VARIABLE';

export type CategoriaEgreso =
  | 'SUELDOS'
  | 'ALQUILER_SERVICIOS'
  | 'INTERNET_MAYORISTA'
  | 'GASOLINA_TRANSPORTE'
  | 'MATERIAL_CONSUMIBLE' // Alambre, conectores, cable fibra 1 pelo, grampas, cinta
  | 'COMPRA_EQUIPOS_CLIENTES' // Compra de lote de ONUs, Routers, Antenas
  | 'MANTENIMIENTO_HERRAMIENTAS'
  | 'OTROS_GASTOS';

export interface EgresoRegistro {
  id: string;
  fecha_egreso: string; // YYYY-MM-DD
  periodo_mes: string; // YYYY-MM
  sucursal_id: SucursalId | 'GENERAL';
  tipo_egreso: TipoEgreso; // 'FIJO' | 'VARIABLE'
  categoria: CategoriaEgreso;
  concepto: string;
  detalle_gastos: string; // Detalle amplio: ej. "2 rollos de alambre, 100 conectores APC, 1 bobina fibra 1 pelo, gasolina..."
  beneficiario_proveedor: string;
  monto: number;
  metodo_pago: MetodoPago;
  numero_comprobante: string | null;
  registrado_por: string;
  created_at: string;
}

export type EstadoEquipoCliente =
  | 'EN_STOCK' // En almacén/inventario de la sucursal listo para entregar a técnico
  | 'EN_PODER_TECNICO' // Entregado a un técnico (ej. Pedro), quien debe responder por este equipo
  | 'INSTALADO_CLIENTE' // Instalado en casa de un abonado (alta o reemplazo)
  | 'EN_OBSERVACION_CASA' // Retirado dañado/quemado de un cliente para chequeo o reseteo en casa
  | 'BAJA_QUEMADO'; // Dado de baja definitiva tras comprobarse que no sirve

export type TipoEquipoCliente =
  | 'ONU_FIBRA'
  | 'ROUTER_WIFI'
  | 'ANTENA_CPE'
  | 'OTRO_EQUIPO';

export interface EquipoClienteItem {
  id: string;
  codigo_equipo: string; // Ej. 'TAR-EQ-001', 'TAR-OBS-001'
  sucursal_id: SucursalId;
  tipo_equipo: TipoEquipoCliente;
  marca_modelo: string; // Ej. 'ONU Huawei Dual Band HG8145V5'
  serie_mac: string | null;
  estado: EstadoEquipoCliente;
  tecnico_responsable: string | null; // Ej. 'Pedro (Técnico 1 - Tarija)'
  codigo_cliente_instalado: string | null; // Ej. 'TAR-001'
  motivo_observacion_baja: string | null; // Ej. 'Reemplazo por quema / descarga eléctrica — pendiente chequeo o reseteo en casa'
  fecha_ingreso: string; // YYYY-MM-DD
  fecha_ultimo_movimiento: string; // YYYY-MM-DD
  historial_ultimo_cambio: string;
  created_at: string;
}

export const CATEGORIAS_EGRESO_LABELS: Record<CategoriaEgreso, string> = {
  SUELDOS: 'Sueldos y Salarios (Fijo)',
  ALQUILER_SERVICIOS: 'Alquiler Oficina / Nodos / Luz (Fijo)',
  INTERNET_MAYORISTA: 'Pago Proveedor Mayorista Internet (Fijo)',
  GASOLINA_TRANSPORTE: 'Gasolina, Combustible y Transporte (Variable)',
  MATERIAL_CONSUMIBLE:
    'Material Consumible: Alambre, Conectores, Fibra 1 Pelo (Variable)',
  COMPRA_EQUIPOS_CLIENTES:
    'Compra de Equipos Cliente: ONUs, Routers, Antenas (Variable)',
  MANTENIMIENTO_HERRAMIENTAS: 'Mantenimiento y Herramientas (Variable)',
  OTROS_GASTOS: 'Otros Gastos Variables',
};

const STORAGE_EGRESOS_KEY = 'tecnoedu_isp_egresos_v3';
const STORAGE_EQUIPOS_KEY = 'tecnoedu_isp_equipos_inventario_v2';

export const INITIAL_EGRESOS: EgresoRegistro[] = [
  {
    id: 'egr-fijo-001',
    fecha_egreso: '2026-11-01',
    periodo_mes: '2026-11',
    sucursal_id: 'TAR',
    tipo_egreso: 'FIJO',
    categoria: 'SUELDOS',
    concepto: 'Planilla Sueldos Agencia Tarija (1 Administrativo + 2 Técnicos)',
    detalle_gastos:
      'Sueldo fijo mensual Administrativo Tarija + Técnico 1 Pedro y Técnico 2 Rodrigo.',
    beneficiario_proveedor: 'Personal Agencia Tarija (TAR)',
    monto: 6400,
    metodo_pago: 'TRANSFERENCIA',
    numero_comprobante: 'SUELDO-TAR-11',
    registrado_por: 'Administrativo Agencia Tarija',
    created_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 'egr-fijo-002',
    fecha_egreso: '2026-11-02',
    periodo_mes: '2026-11',
    sucursal_id: 'BER',
    tipo_egreso: 'FIJO',
    categoria: 'SUELDOS',
    concepto: 'Planilla Sueldos Agencia Bermejo (1 Administrativo + 3 Técnicos)',
    detalle_gastos:
      'Pago mensual de sueldos operativos Bermejo (1 Administrativo y 3 Técnicos de campo: Carlos, Miguel y Fernando) + nodo.',
    beneficiario_proveedor: 'Personal Agencia Bermejo (BER)',
    monto: 8200,
    metodo_pago: 'TRANSFERENCIA',
    numero_comprobante: 'SUELDO-BER-11',
    registrado_por: 'Administrativo Agencia Bermejo',
    created_at: '2026-11-02T10:00:00Z',
  },
  {
    id: 'egr-fijo-003',
    fecha_egreso: '2026-11-02',
    periodo_mes: '2026-11',
    sucursal_id: 'SCZ',
    tipo_egreso: 'FIJO',
    categoria: 'SUELDOS',
    concepto:
      'Planilla Sueldos Agencia Santa Cruz (1 Administrativo + 4 Técnicos)',
    detalle_gastos:
      'Pago mensual personal Santa Cruz (1 Administrativo + 4 Técnicos: Diego, Javier, Marco y Luis).',
    beneficiario_proveedor: 'Personal Agencia Santa Cruz (SCZ)',
    monto: 10500,
    metodo_pago: 'TRANSFERENCIA',
    numero_comprobante: 'SUELDO-SCZ-11',
    registrado_por: 'Administrativo Agencia Santa Cruz',
    created_at: '2026-11-02T11:00:00Z',
  },
  {
    id: 'egr-fijo-004',
    fecha_egreso: '2026-11-02',
    periodo_mes: '2026-11',
    sucursal_id: 'ROB',
    tipo_egreso: 'FIJO',
    categoria: 'SUELDOS',
    concepto: 'Planilla Sueldos Agencia Roboré (1 Administrativo + 2 Técnicos)',
    detalle_gastos:
      'Pago mensual personal Roboré (1 Administrativo + 2 Técnicos: Richard y Rubén).',
    beneficiario_proveedor: 'Personal Agencia Roboré (ROB)',
    monto: 6200,
    metodo_pago: 'TRANSFERENCIA',
    numero_comprobante: 'SUELDO-ROB-11',
    registrado_por: 'Administrativo Agencia Roboré',
    created_at: '2026-11-02T11:30:00Z',
  },
  {
    id: 'egr-var-001',
    fecha_egreso: '2026-11-05',
    periodo_mes: '2026-11',
    sucursal_id: 'TAR',
    tipo_egreso: 'VARIABLE',
    categoria: 'MATERIAL_CONSUMIBLE',
    concepto: 'Compra de alambre, conectores, fibra de 1 pelo y gasolina Tarija',
    detalle_gastos:
      '2 rollos de alambre de amarre galvanizado, 1 bolsa de 100 conectores rápidos SC/APC, 1 bobina de cable de fibra óptica de 1 pelo (drop 1km), cinta aislante y Bs 120 de gasolina para movilidad técnica.',
    beneficiario_proveedor: 'Ferretería & Importadora Telecom TAR',
    monto: 980,
    metodo_pago: 'EFECTIVO',
    numero_comprobante: 'REC-VAR-TAR-045',
    registrado_por: 'Administrativo Agencia Tarija',
    created_at: '2026-11-05T14:30:00Z',
  },
  {
    id: 'egr-var-002',
    fecha_egreso: '2026-11-04',
    periodo_mes: '2026-11',
    sucursal_id: 'BER',
    tipo_egreso: 'VARIABLE',
    categoria: 'MATERIAL_CONSUMIBLE',
    concepto: 'Compra de alambre, conectores y gasolina cuadrilla Bermejo',
    detalle_gastos:
      '3 rollos de alambre de amarre, 100 conectores SC/UPC, tensores drop y Bs 150 gasolina para los 3 técnicos de Bermejo.',
    beneficiario_proveedor: 'Ferretería Central Bermejo',
    monto: 890,
    metodo_pago: 'EFECTIVO',
    numero_comprobante: 'REC-VAR-BER-012',
    registrado_por: 'Administrativo Agencia Bermejo',
    created_at: '2026-11-04T15:00:00Z',
  },
];

/**
 * Semilla inicial de los 80 equipos comprados y repartidos de forma independiente
 * (20 equipos para cada Agencia: BER=20, TAR=20, SCZ=20, ROB=20):
 * - Cada agencia administra su propio lote de 20 equipos y los entrega únicamente a los técnicos de su propia sucursal.
 */
function buildInitialEquipos4Agencias(): EquipoClienteItem[] {
  const items: EquipoClienteItem[] = [
    // ================= TARIJA (TAR: 20 equipos + 1 retirado en observación) =================
    {
      id: 'eq-tar-001',
      codigo_equipo: 'TAR-EQ-001',
      sucursal_id: 'TAR',
      tipo_equipo: 'ONU_FIBRA',
      marca_modelo: 'ONU Dual Band GPON/EPON',
      serie_mac: 'SN-TAR-8801',
      estado: 'INSTALADO_CLIENTE',
      tecnico_responsable: 'Técnico 1 Tarija: Pedro',
      codigo_cliente_instalado: 'TAR-001',
      motivo_observacion_baja: null,
      fecha_ingreso: '2026-11-03',
      fecha_ultimo_movimiento: '2026-11-08',
      historial_ultimo_cambio:
        'Entregado a Técnico 1 Tarija: Pedro -> Instalado en cliente TAR-001 como reemplazo por quema de equipo anterior.',
      created_at: '2026-11-03T10:00:00Z',
    },
    {
      id: 'eq-tar-002',
      codigo_equipo: 'TAR-EQ-002',
      sucursal_id: 'TAR',
      tipo_equipo: 'ONU_FIBRA',
      marca_modelo: 'ONU Dual Band GPON/EPON',
      serie_mac: 'SN-TAR-8802',
      estado: 'EN_PODER_TECNICO',
      tecnico_responsable: 'Técnico 1 Tarija: Pedro',
      codigo_cliente_instalado: null,
      motivo_observacion_baja: null,
      fecha_ingreso: '2026-11-03',
      fecha_ultimo_movimiento: '2026-11-07',
      historial_ultimo_cambio:
        'Entregado a Técnico 1 Tarija: Pedro (Recibió 2 equipos; instaló 1 y tiene este 1 pendiente por responder).',
      created_at: '2026-11-03T10:00:00Z',
    },
    {
      id: 'eq-tar-obs-001',
      codigo_equipo: 'TAR-RET-001',
      sucursal_id: 'TAR',
      tipo_equipo: 'ONU_FIBRA',
      marca_modelo: 'ONU Cliente Retirada (TAR-001)',
      serie_mac: 'SN-OLD-4419',
      estado: 'EN_OBSERVACION_CASA',
      tecnico_responsable: 'Técnico 1 Tarija: Pedro',
      codigo_cliente_instalado: 'TAR-001',
      motivo_observacion_baja:
        'Retirado en reemplazo por Técnico Pedro en cliente TAR-001 (posible quema o desconfiguración). En casa para chequeo o reseteo y definir Alta o Baja.',
      fecha_ingreso: '2026-11-08',
      fecha_ultimo_movimiento: '2026-11-08',
      historial_ultimo_cambio:
        'Ingresó por reemplazo realizado por Técnico 1 Tarija: Pedro en TAR-001. Pendiente prueba/reseteo en casa.',
      created_at: '2026-11-08T11:00:00Z',
    },
  ];

  // Resto de los 20 equipos de Tarija (TAR-EQ-003 al TAR-EQ-020)
  for (let i = 3; i <= 20; i++) {
    const num = String(i).padStart(3, '0');
    items.push({
      id: `eq-tar-${num}`,
      codigo_equipo: `TAR-EQ-${num}`,
      sucursal_id: 'TAR',
      tipo_equipo: 'ONU_FIBRA',
      marca_modelo: 'ONU Dual Band GPON/EPON',
      serie_mac: `SN-TAR-88${String(i).padStart(2, '0')}`,
      estado: 'EN_STOCK',
      tecnico_responsable: null,
      codigo_cliente_instalado: null,
      motivo_observacion_baja: null,
      fecha_ingreso: '2026-11-03',
      fecha_ultimo_movimiento: '2026-11-03',
      historial_ultimo_cambio:
        'Lote de 20 equipos asignados a Agencia Tarija (TAR) — En Stock disponible.',
      created_at: '2026-11-03T10:00:00Z',
    });
  }

  // ================= BERMEJO (BER: 20 equipos independientes) =================
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(3, '0');
    const enPoderTecnico1 = i === 1 || i === 2;
    items.push({
      id: `eq-ber-${num}`,
      codigo_equipo: `BER-EQ-${num}`,
      sucursal_id: 'BER',
      tipo_equipo: 'ONU_FIBRA',
      marca_modelo: 'ONU Dual Band GPON/EPON',
      serie_mac: `SN-BER-77${String(i).padStart(2, '0')}`,
      estado: enPoderTecnico1 ? 'EN_PODER_TECNICO' : 'EN_STOCK',
      tecnico_responsable: enPoderTecnico1
        ? 'Técnico 1 Bermejo: Carlos'
        : null,
      codigo_cliente_instalado: null,
      motivo_observacion_baja: null,
      fecha_ingreso: '2026-11-03',
      fecha_ultimo_movimiento: '2026-11-05',
      historial_ultimo_cambio: enPoderTecnico1
        ? 'Entregado por Administrativo Bermejo a Técnico 1 Bermejo: Carlos (En custodia para campo).'
        : 'Lote de 20 equipos ingresados por Administrativo Agencia Bermejo (BER) — En Stock.',
      created_at: '2026-11-03T10:00:00Z',
    });
  }

  // ================= SANTA CRUZ (SCZ: 20 equipos independientes) =================
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(3, '0');
    const enPoderTecnico1 = i === 1 || i === 2;
    items.push({
      id: `eq-scz-${num}`,
      codigo_equipo: `SCZ-EQ-${num}`,
      sucursal_id: 'SCZ',
      tipo_equipo: 'ONU_FIBRA',
      marca_modelo: 'ONU Dual Band GPON/EPON',
      serie_mac: `SN-SCZ-66${String(i).padStart(2, '0')}`,
      estado: enPoderTecnico1 ? 'EN_PODER_TECNICO' : 'EN_STOCK',
      tecnico_responsable: enPoderTecnico1
        ? 'Técnico 1 Santa Cruz: Diego'
        : null,
      codigo_cliente_instalado: null,
      motivo_observacion_baja: null,
      fecha_ingreso: '2026-11-03',
      fecha_ultimo_movimiento: '2026-11-05',
      historial_ultimo_cambio: enPoderTecnico1
        ? 'Entregado por Administrativo Santa Cruz a Técnico 1 Santa Cruz: Diego (En custodia).'
        : 'Lote de 20 equipos ingresados por Administrativo Agencia Santa Cruz (SCZ) — En Stock.',
      created_at: '2026-11-03T10:00:00Z',
    });
  }

  // ================= ROBORÉ (ROB: 20 equipos independientes) =================
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(3, '0');
    const enPoderTecnico1 = i === 1 || i === 2;
    items.push({
      id: `eq-rob-${num}`,
      codigo_equipo: `ROB-EQ-${num}`,
      sucursal_id: 'ROB',
      tipo_equipo: 'ONU_FIBRA',
      marca_modelo: 'ONU Dual Band GPON/EPON',
      serie_mac: `SN-ROB-55${String(i).padStart(2, '0')}`,
      estado: enPoderTecnico1 ? 'EN_PODER_TECNICO' : 'EN_STOCK',
      tecnico_responsable: enPoderTecnico1
        ? 'Técnico 1 Roboré: Richard'
        : null,
      codigo_cliente_instalado: null,
      motivo_observacion_baja: null,
      fecha_ingreso: '2026-11-03',
      fecha_ultimo_movimiento: '2026-11-05',
      historial_ultimo_cambio: enPoderTecnico1
        ? 'Entregado por Administrativo Roboré a Técnico 1 Roboré: Richard (En custodia).'
        : 'Lote de 20 equipos ingresados por Administrativo Agencia Roboré (ROB) — En Stock.',
      created_at: '2026-11-03T10:00:00Z',
    });
  }

  return items;
}

export const INITIAL_EQUIPOS: EquipoClienteItem[] =
  buildInitialEquipos4Agencias();

function getLocalEgresos(): EgresoRegistro[] {
  if (typeof window === 'undefined') return INITIAL_EGRESOS;
  try {
    const raw = window.localStorage.getItem(STORAGE_EGRESOS_KEY);
    if (!raw) {
      window.localStorage.setItem(
        STORAGE_EGRESOS_KEY,
        JSON.stringify(INITIAL_EGRESOS)
      );
      return INITIAL_EGRESOS;
    }
    return JSON.parse(raw) as EgresoRegistro[];
  } catch {
    return INITIAL_EGRESOS;
  }
}

function saveLocalEgresos(lista: EgresoRegistro[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_EGRESOS_KEY, JSON.stringify(lista));
}

function getLocalEquipos(): EquipoClienteItem[] {
  if (typeof window === 'undefined') return INITIAL_EQUIPOS;
  try {
    const raw = window.localStorage.getItem(STORAGE_EQUIPOS_KEY);
    if (!raw) {
      window.localStorage.setItem(
        STORAGE_EQUIPOS_KEY,
        JSON.stringify(INITIAL_EQUIPOS)
      );
      return INITIAL_EQUIPOS;
    }
    return JSON.parse(raw) as EquipoClienteItem[];
  } catch {
    return INITIAL_EQUIPOS;
  }
}

function saveLocalEquipos(lista: EquipoClienteItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_EQUIPOS_KEY, JSON.stringify(lista));
}

// ============================================================================
// SERVICIOS DE EGRESOS FIJOS Y VARIABLES
// ============================================================================
export async function listarEgresos(
  sucursalFiltro?: SucursalId | 'TODAS' | 'GENERAL'
): Promise<EgresoRegistro[]> {
  let lista = getLocalEgresos();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('egresos' as never)
        .select('*')
        .order('fecha_egreso', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        lista = data as EgresoRegistro[];
      }
    } catch {
      // Fallback a almacenamiento local sincronizado
    }
  }

  const ordenados = [...lista].sort((a, b) =>
    b.fecha_egreso.localeCompare(a.fecha_egreso)
  );

  if (sucursalFiltro && sucursalFiltro !== 'TODAS') {
    return ordenados.filter((e) => e.sucursal_id === sucursalFiltro);
  }
  return ordenados;
}

export async function crearEgreso(
  input: Omit<EgresoRegistro, 'id' | 'created_at'>
): Promise<EgresoRegistro> {
  const nuevo: EgresoRegistro = {
    ...input,
    id: crypto.randomUUID(),
    monto: Number(input.monto),
    created_at: new Date().toISOString(),
  };

  const actuales = getLocalEgresos();
  saveLocalEgresos([nuevo, ...actuales]);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('egresos' as never).insert(nuevo as never);
    } catch {
      // Guardado en local
    }
  }
  return nuevo;
}

export async function eliminarEgreso(id: string): Promise<void> {
  const actuales = getLocalEgresos().filter((e) => e.id !== id);
  saveLocalEgresos(actuales);
  if (isSupabaseConfigured) {
    try {
      await supabase.from('egresos' as never).delete().eq('id', id);
    } catch {
      // Ignorar
    }
  }
}

// ============================================================================
// SERVICIOS DE INVENTARIO Y TRAZABILIDAD DE EQUIPOS DE CLIENTE
// ============================================================================
export async function listarEquiposInventario(
  sucursalFiltro?: SucursalId | 'TODAS'
): Promise<EquipoClienteItem[]> {
  let lista = getLocalEquipos();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('equipos_inventario' as never)
        .select('*')
        .order('codigo_equipo', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        lista = data as EquipoClienteItem[];
      }
    } catch {
      // Fallback a lista local
    }
  }

  if (sucursalFiltro && sucursalFiltro !== 'TODAS') {
    return lista.filter((eq) => eq.sucursal_id === sucursalFiltro);
  }
  return lista;
}

/**
 * 1) Compra / Ingreso de Lote de Equipos para una sucursal (ej. 20 equipos para Tarija)
 */
export async function ingresarLoteEquipos(params: {
  sucursal_id: SucursalId;
  cantidad: number;
  tipo_equipo: TipoEquipoCliente;
  marca_modelo: string;
  fecha_ingreso: string;
}): Promise<{ creados: number; primerCodigo: string; ultimoCodigo: string }> {
  const actuales = getLocalEquipos();
  const deSucursal = actuales.filter(
    (e) =>
      e.sucursal_id === params.sucursal_id &&
      e.codigo_equipo.startsWith(`${params.sucursal_id}-EQ-`)
  );
  const maxCorrelativo = deSucursal.reduce((max, item) => {
    const partes = item.codigo_equipo.split('-');
    const num = parseInt(partes[2] ?? '0', 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);

  const nuevos: EquipoClienteItem[] = [];
  for (let i = 1; i <= params.cantidad; i++) {
    const corr = String(maxCorrelativo + i).padStart(3, '0');
    const codigo = `${params.sucursal_id}-EQ-${corr}`;
    nuevos.push({
      id: crypto.randomUUID(),
      codigo_equipo: codigo,
      sucursal_id: params.sucursal_id,
      tipo_equipo: params.tipo_equipo,
      marca_modelo: params.marca_modelo.trim(),
      serie_mac: `SN-${params.sucursal_id}-${corr}`,
      estado: 'EN_STOCK',
      tecnico_responsable: null,
      codigo_cliente_instalado: null,
      motivo_observacion_baja: null,
      fecha_ingreso: params.fecha_ingreso,
      fecha_ultimo_movimiento: params.fecha_ingreso,
      historial_ultimo_cambio: `Ingreso a Stock en lote (${params.cantidad} unidades) para ${params.sucursal_id}.`,
      created_at: new Date().toISOString(),
    });
  }

  saveLocalEquipos([...nuevos, ...actuales]);
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('equipos_inventario' as never)
        .insert(nuevos as never);
    } catch {
      // Guardado en localStorage
    }
  }

  return {
    creados: nuevos.length,
    primerCodigo: nuevos[0]?.codigo_equipo ?? '',
    ultimoCodigo: nuevos[nuevos.length - 1]?.codigo_equipo ?? '',
  };
}

/**
 * 2) Entregar N equipos de Stock a un Técnico (ej. Entregar 2 equipos al Técnico 1 Pedro)
 */
export async function entregarEquiposATecnico(params: {
  sucursal_id: SucursalId;
  cantidad: number;
  nombre_tecnico: string;
  fecha_entrega: string;
}): Promise<{ ok: boolean; mensaje: string; codigosEntregados: string[] }> {
  const actuales = getLocalEquipos();
  const disponibles = actuales.filter(
    (e) => e.sucursal_id === params.sucursal_id && e.estado === 'EN_STOCK'
  );

  if (disponibles.length < params.cantidad) {
    return {
      ok: false,
      mensaje: `Stock insuficiente en ${params.sucursal_id}: solo hay ${disponibles.length} equipo(s) en stock.`,
      codigosEntregados: [],
    };
  }

  const seleccionadosIds = new Set(
    disponibles.slice(0, params.cantidad).map((e) => e.id)
  );
  const codigosEntregados: string[] = [];

  const actualizados = actuales.map((eq) => {
    if (!seleccionadosIds.has(eq.id)) return eq;
    codigosEntregados.push(eq.codigo_equipo);
    return {
      ...eq,
      estado: 'EN_PODER_TECNICO' as EstadoEquipoCliente,
      tecnico_responsable: params.nombre_tecnico.trim(),
      fecha_ultimo_movimiento: params.fecha_entrega,
      historial_ultimo_cambio: `Entregado a ${params.nombre_tecnico.trim()} el ${params.fecha_entrega} (Debe responder por el equipo).`,
    };
  });

  saveLocalEquipos(actualizados);
  return {
    ok: true,
    mensaje: `Se entregaron ${codigosEntregados.length} equipo(s) (${codigosEntregados.join(', ')}) a ${params.nombre_tecnico}.`,
    codigosEntregados,
  };
}

/**
 * 3) Operación del Técnico: Instalar en Cliente Nuevo O Reemplazar Equipo Quemado/Dañado
 *    - Si es REEMPLAZO:
 *      a) El equipo nuevo que tenía el técnico pasa a 'INSTALADO_CLIENTE'.
 *      b) Ingresa automáticamente 1 equipo retirado/dañado con estado 'EN_OBSERVACION_CASA'
 *         para que en casa se le haga el chequeo o reseteo y se le dé de Alta o de Baja.
 */
export async function registrarOperacionTecnico(params: {
  equipo_id: string;
  tipo_operacion: 'REEMPLAZO_POR_FALLA' | 'INSTALACION_NUEVA';
  codigo_cliente: string;
  motivo_reemplazo: string;
  marca_equipo_retirado?: string;
  serie_equipo_retirado?: string;
  fecha_operacion: string;
  nombre_tecnico: string;
}): Promise<{ ok: boolean; mensaje: string }> {
  const actuales = getLocalEquipos();
  const idx = actuales.findIndex((e) => e.id === params.equipo_id);
  if (idx === -1) {
    return { ok: false, mensaje: 'No se encontró el equipo seleccionado.' };
  }

  const equipoNuevo = actuales[idx];
  const clienteNorm = params.codigo_cliente.trim().toUpperCase();

  // a) Actualizar el equipo nuevo que salió de manos del técnico hacia el cliente
  const equipoInstalado: EquipoClienteItem = {
    ...equipoNuevo,
    estado: 'INSTALADO_CLIENTE',
    codigo_cliente_instalado: clienteNorm,
    fecha_ultimo_movimiento: params.fecha_operacion,
    historial_ultimo_cambio:
      params.tipo_operacion === 'REEMPLAZO_POR_FALLA'
        ? `Reemplazo en cliente ${clienteNorm} por ${params.nombre_tecnico} (${params.motivo_reemplazo}).`
        : `Instalación nueva en cliente ${clienteNorm} por ${params.nombre_tecnico}.`,
  };

  actuales[idx] = equipoInstalado;

  // b) Si fue REEMPLAZO, ingresar automáticamente 1 equipo retirado en estado 'EN_OBSERVACION_CASA'
  if (params.tipo_operacion === 'REEMPLAZO_POR_FALLA') {
    const numRet =
      actuales.filter((e) =>
        e.codigo_equipo.startsWith(`${equipoNuevo.sucursal_id}-RET-`)
      ).length + 1;
    const codigoRetirado = `${equipoNuevo.sucursal_id}-RET-${String(numRet).padStart(3, '0')}`;

    const equipoRetiradoDañado: EquipoClienteItem = {
      id: crypto.randomUUID(),
      codigo_equipo: codigoRetirado,
      sucursal_id: equipoNuevo.sucursal_id,
      tipo_equipo: equipoNuevo.tipo_equipo,
      marca_modelo:
        params.marca_equipo_retirado?.trim() ||
        `Equipo retirado de ${clienteNorm} (${equipoNuevo.marca_modelo})`,
      serie_mac: params.serie_equipo_retirado?.trim() || 'S/N-RETIRADO',
      estado: 'EN_OBSERVACION_CASA',
      tecnico_responsable: params.nombre_tecnico,
      codigo_cliente_instalado: clienteNorm,
      motivo_observacion_baja:
        params.motivo_reemplazo.trim() ||
        'Reemplazo por quema o falla — En observación en casa para chequeo o reseteo.',
      fecha_ingreso: params.fecha_operacion,
      fecha_ultimo_movimiento: params.fecha_operacion,
      historial_ultimo_cambio: `Ingresó dañado/en observación desde cliente ${clienteNorm} (reemplazado con equipo nuevo ${equipoNuevo.codigo_equipo} por ${params.nombre_tecnico}). Pendiente chequeo o reseteo en casa.`,
      created_at: new Date().toISOString(),
    };

    actuales.unshift(equipoRetiradoDañado);
    saveLocalEquipos(actuales);

    return {
      ok: true,
      mensaje: `Reemplazo completado en ${clienteNorm}: Salió 1 equipo nuevo (${equipoNuevo.codigo_equipo}) y entró 1 equipo en observación (${codigoRetirado}) para chequeo/reseteo en casa.`,
    };
  }

  saveLocalEquipos(actuales);
  return {
    ok: true,
    mensaje: `Instalación registrada: El equipo ${equipoNuevo.codigo_equipo} quedó instalado en el cliente ${clienteNorm}.`,
  };
}

/**
 * 4) Dictamen en Casa / Laboratorio sobre un equipo en 'EN_OBSERVACION_CASA':
 *    - 'ALTA_A_STOCK': El equipo funcionó tras el reseteo/chequeo y vuelve a 'EN_STOCK' disponible.
 *    - 'BAJA_DEFINITIVA': El equipo está quemado sin arreglo y pasa a 'BAJA_QUEMADO'.
 */
export async function resolverEquipoEnObservacion(params: {
  equipo_id: string;
  decision: 'ALTA_A_STOCK' | 'BAJA_DEFINITIVA';
  nota_revision: string;
  fecha_resolucion: string;
}): Promise<{ ok: boolean; mensaje: string }> {
  const actuales = getLocalEquipos();
  const idx = actuales.findIndex((e) => e.id === params.equipo_id);
  if (idx === -1) {
    return { ok: false, mensaje: 'Equipo no encontrado.' };
  }

  const eq = actuales[idx];
  if (params.decision === 'ALTA_A_STOCK') {
    actuales[idx] = {
      ...eq,
      estado: 'EN_STOCK',
      tecnico_responsable: null,
      codigo_cliente_instalado: null,
      motivo_observacion_baja: `Recuperado tras reseteo/chequeo en casa: ${params.nota_revision}`,
      fecha_ultimo_movimiento: params.fecha_resolucion,
      historial_ultimo_cambio: `ALTA A STOCK (${params.fecha_resolucion}): Funcionó tras chequeo/reseteo en casa (${params.nota_revision}). Disponible nuevamente.`,
    };
    saveLocalEquipos(actuales);
    return {
      ok: true,
      mensaje: `Equipo ${eq.codigo_equipo} recuperado tras chequeo/reseteo: Se dio de ALTA y volvió al Stock disponible de ${eq.sucursal_id}.`,
    };
  }

  actuales[idx] = {
    ...eq,
    estado: 'BAJA_QUEMADO',
    motivo_observacion_baja: `BAJA DEFINITIVA (Quemado/Irreparable): ${params.nota_revision}`,
    fecha_ultimo_movimiento: params.fecha_resolucion,
    historial_ultimo_cambio: `BAJA DEFINITIVA (${params.fecha_resolucion}): Confirmado quemado tras revisión en casa (${params.nota_revision}).`,
  };
  saveLocalEquipos(actuales);
  return {
    ok: true,
    mensaje: `Equipo ${eq.codigo_equipo} dado de BAJA definitiva por quema/daño irreparable.`,
  };
}
