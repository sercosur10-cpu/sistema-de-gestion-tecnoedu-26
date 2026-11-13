import { NextRequest, NextResponse } from 'next/server';
import {
  buscarClientePorCodigo,
  listarClientes,
} from '@/modules/clientes/services';
import {
  calcularExtractoCliente,
  formatearPeriodoMes,
  listarCobros,
  obtenerEstadosCuenta,
} from '@/modules/cobros/services';
import { SUCURSALES_META } from '@/modules/sucursales/constants';

/**
 * Endpoint oficial de integración para n8n y WhatsApp Business Cloud API:
 *
 * 1) Consulta individual por celular (WhatsApp entrante) o código de cliente:
 *    GET /api/n8n/consulta-cliente?celular=59172910451
 *    GET /api/n8n/consulta-cliente?codigo=BER-001
 *    Responde: ¿Debo o cuánto debo?, ¿Qué meses debo?, ¿Qué plan tengo?, ¿Estoy en corte?
 *
 * 2) Listado masivo para envío de plantillas WhatsApp de recordatorio de pago o corte:
 *    GET /api/n8n/consulta-cliente?modo=recordatorios
 *    GET /api/n8n/consulta-cliente?modo=lista_corte
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo')?.trim();
  const celular = searchParams.get('celular')?.replace(/\D/g, '');
  const modo = searchParams.get('modo')?.trim().toLowerCase();
  const periodoCorte = searchParams.get('periodo') ?? undefined;

  // Modo masivo para campañas de recordatorio en n8n + WhatsApp Business API
  if (modo === 'recordatorios' || modo === 'lista_corte') {
    const estados = await obtenerEstadosCuenta(periodoCorte, 'TODAS');
    const filtrados = estados.filter((e) => {
      if (e.cliente.estado !== 'ACTIVO') return false;
      if (modo === 'lista_corte') return e.enListaDeCorte;
      return e.mesesQueDebe.length > 0;
    });

    return NextResponse.json({
      ok: true,
      modo,
      total: filtrados.length,
      clientes: filtrados.map((item) => {
        const suc = SUCURSALES_META[item.cliente.sucursal_id];
        const listaMeses = item.mesesQueDebe
          .map((m) => `${m.etiquetaCorta} (${m.periodo})`)
          .join(', ');
        return {
          codigo_cliente: item.cliente.codigo_cliente,
          sucursal_id: item.cliente.sucursal_id,
          sucursal_nombre: suc.nombre,
          nombre_completo: `${item.cliente.nombres} ${item.cliente.apellidos}`,
          celular_whatsapp_e164: item.cliente.celular,
          plan_tecnologia: item.cliente.tipo_tecnologia,
          tarifa_mensual_bs: Number(item.cliente.precio_mensual),
          fecha_inicio_contrato: item.cliente.fecha_inicio,
          ultimo_mes_pagado: item.ultimoPeriodoPagado,
          debe: item.mesesQueDebe.length > 0,
          cantidad_meses_debe: item.mesesQueDebe.length,
          meses_que_debe: listaMeses,
          cuanto_debe_bs: item.saldoPendiente,
          proximo_mes_a_pagar: item.proximoMesAPagar,
          en_lista_de_corte: item.enListaDeCorte,
          parametros_plantilla_whatsapp: {
            variable_1_nombre: item.cliente.nombres,
            variable_2_codigo: item.cliente.codigo_cliente,
            variable_3_meses: listaMeses,
            variable_4_monto_bs: item.saldoPendiente.toFixed(2),
            variable_5_proximo_mes: formatearPeriodoMes(item.proximoMesAPagar),
          },
        };
      }),
    });
  }

  // Modo consulta individual: "¿Debo o cuánto debo?" / "¿Qué plan tengo?"
  if (!codigo && !celular) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Envía ?codigo=BER-001, ?celular=5917XXXXXXX o ?modo=recordatorios|lista_corte',
      },
      { status: 400 }
    );
  }

  let cliente = codigo ? await buscarClientePorCodigo(codigo) : null;

  if (!cliente && celular) {
    const todos = await listarClientes('TODAS');
    cliente =
      todos.find(
        (c) =>
          c.celular.replace(/\D/g, '') === celular ||
          c.celular.replace(/\D/g, '').endsWith(celular.slice(-8))
      ) ?? null;
  }

  if (!cliente) {
    return NextResponse.json(
      {
        ok: false,
        encontrado: false,
        mensaje:
          'No se encontró un abonado registrado con ese código o número de celular.',
      },
      { status: 404 }
    );
  }

  const cobros = await listarCobros(cliente.codigo_cliente);
  const extracto = calcularExtractoCliente(cliente, cobros, periodoCorte);
  const suc = SUCURSALES_META[cliente.sucursal_id];
  const listaMeses = extracto.mesesQueDebe
    .map((m) => `${m.etiquetaCorta} (${m.periodo})`)
    .join(', ');

  const respuestaTextoWhatsApp =
    extracto.mesesQueDebe.length === 0
      ? `Hola ${cliente.nombres}, tu servicio ${cliente.codigo_cliente} (${cliente.tipo_tecnologia} - Bs ${Number(cliente.precio_mensual).toFixed(2)}/mes en ${suc.nombre}) se encuentra AL DÍA. Tu último mes pagado es ${formatearPeriodoMes(extracto.ultimoPeriodoPagado)} y tu siguiente mes consecutivo es ${formatearPeriodoMes(extracto.proximoMesAPagar)}.`
      : `Hola ${cliente.nombres}, tu servicio ${cliente.codigo_cliente} (${cliente.tipo_tecnologia} - Bs ${Number(cliente.precio_mensual).toFixed(2)}/mes en ${suc.nombre}) registra ${extracto.mesesQueDebe.length} mes(es) pendiente(s): ${listaMeses}, con un saldo total de Bs ${extracto.saldoPendiente.toFixed(2)}. El mes consecutivo que corresponde cancelar es ${formatearPeriodoMes(extracto.proximoMesAPagar)} (${extracto.proximoMesAPagar}).`;

  return NextResponse.json({
    ok: true,
    encontrado: true,
    cliente: {
      codigo_cliente: cliente.codigo_cliente,
      sucursal_id: cliente.sucursal_id,
      sucursal_nombre: suc.nombre,
      telefono_soporte_sucursal: suc.telefonoSoporteDefault,
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      celular_whatsapp_e164: cliente.celular,
      zona_comunidad: cliente.zona_comunidad,
      direccion: cliente.direccion,
      fecha_inicio_contrato: cliente.fecha_inicio,
      estado_servicio: cliente.estado,
    },
    plan: {
      tipo_tecnologia: cliente.tipo_tecnologia,
      precio_mensual_bs: Number(cliente.precio_mensual),
      descripcion_plan: `Enlace ${cliente.tipo_tecnologia} — Tarifa Bs ${Number(cliente.precio_mensual).toFixed(2)}/mes`,
    },
    estado_deuda: {
      debe: extracto.mesesQueDebe.length > 0,
      cuanto_debe_bs: extracto.saldoPendiente,
      cantidad_meses_debe: extracto.mesesQueDebe.length,
      meses_que_debe: extracto.mesesQueDebe.map((m) => ({
        periodo: m.periodo,
        etiqueta: m.etiquetaLarga,
        monto_bs: m.montoDebe,
      })),
      ultimo_mes_pagado: extracto.ultimoPeriodoPagado,
      proximo_mes_consecutivo_a_pagar: extracto.proximoMesAPagar,
      en_lista_de_corte: extracto.enListaDeCorte,
      umbral_meses_corte_vigente: extracto.umbralMesesCorte,
    },
    mensaje_sugerido_whatsapp: respuestaTextoWhatsApp,
  });
}
