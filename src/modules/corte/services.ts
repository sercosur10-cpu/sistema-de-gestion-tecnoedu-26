import type { SucursalId } from '@/lib/supabase/database.types';

export interface PoliticaCorteConfig {
  mesesParaCorte: number; // Por defecto 2 meses cumplidos
  diasGraciaAdicionales: number;
  resolucionReferencia: string;
  fechaActualizacion: string;
  nombreArchivoPdf: string;
  pdfDataUrl: string | null; // Base64 o URL del PDF vigente cargado
  sucursalesReguladasATT: SucursalId[]; // Legalidad ATT: BER, TAR, SCZ
  sucursalesGestionInterna: SucursalId[]; // ROB
  observacionNormativa: string;
}

const STORAGE_POLITICA_CORTE_KEY = 'tecnoedu_isp_politica_corte_v1';

export const DEFAULT_POLITICA_CORTE: PoliticaCorteConfig = {
  mesesParaCorte: 2,
  diasGraciaAdicionales: 0,
  resolucionReferencia: 'Política de Corte TecnoEdu / Marco ATT Vigente',
  fechaActualizacion: '2026-11-08',
  nombreArchivoPdf: 'Politica_Corte_ISP_TecnoEdu_ATT_2026.pdf',
  pdfDataUrl: null,
  sucursalesReguladasATT: ['BER', 'TAR', 'SCZ'],
  sucursalesGestionInterna: ['ROB'],
  observacionNormativa:
    'Política estándar: se espera 2 meses cumplidos desde el último mes pagado (o fecha de inicio si no registra pagos) para ingresar a Lista de Corte. Sujeto a modificación mediante carga de Documento PDF por disposiciones de la ATT (aplicable legalmente en Bermejo, Tarija y Santa Cruz; gestión homologada en Roboré).',
};

export function obtenerPoliticaCorte(): PoliticaCorteConfig {
  if (typeof window === 'undefined') return DEFAULT_POLITICA_CORTE;
  try {
    const raw = window.localStorage.getItem(STORAGE_POLITICA_CORTE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        STORAGE_POLITICA_CORTE_KEY,
        JSON.stringify(DEFAULT_POLITICA_CORTE)
      );
      return DEFAULT_POLITICA_CORTE;
    }
    const parsed = JSON.parse(raw) as Partial<PoliticaCorteConfig>;
    return {
      ...DEFAULT_POLITICA_CORTE,
      ...parsed,
      mesesParaCorte:
        typeof parsed.mesesParaCorte === 'number' && parsed.mesesParaCorte >= 1
          ? parsed.mesesParaCorte
          : DEFAULT_POLITICA_CORTE.mesesParaCorte,
    };
  } catch {
    return DEFAULT_POLITICA_CORTE;
  }
}

export function guardarPoliticaCorte(
  nuevaPolitica: Partial<PoliticaCorteConfig>
): PoliticaCorteConfig {
  const actual = obtenerPoliticaCorte();
  const actualizada: PoliticaCorteConfig = {
    ...actual,
    ...nuevaPolitica,
    fechaActualizacion:
      nuevaPolitica.fechaActualizacion ?? new Date().toISOString().slice(0, 10),
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      STORAGE_POLITICA_CORTE_KEY,
      JSON.stringify(actualizada)
    );
  }
  return actualizada;
}

/**
 * Analiza un archivo PDF subido por el administrador para actualizar la Política de Corte.
 * Busca patrones como "1 mes", "2 meses", "3 meses", "4 meses" en el contenido de texto del PDF
 * o en el nombre del archivo, y guarda el PDF para consulta y respaldo.
 */
export async function procesarPdfPoliticaCorte(
  file: File,
  mesesManualOverride?: number,
  resolucionTexto?: string
): Promise<{
  politica: PoliticaCorteConfig;
  mesesDetectadosEnPdf: number | null;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF'));
    reader.readAsDataURL(file);
  });

  let mesesDetectadosEnPdf: number | null = null;
  try {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('latin1');
    const rawText = decoder.decode(buffer);
    const matchTexto = rawText.match(
      /(\d+)\s*(?:mes|meses)\s*(?:para\s*corte|de\s*espera|de\s*mora|cumplidos)/i
    );
    const matchNombre = file.name.match(/(\d+)\s*(?:mes|meses)/i);

    if (matchTexto?.[1]) {
      const n = parseInt(matchTexto[1], 10);
      if (n >= 1 && n <= 12) mesesDetectadosEnPdf = n;
    } else if (matchNombre?.[1]) {
      const n = parseInt(matchNombre[1], 10);
      if (n >= 1 && n <= 12) mesesDetectadosEnPdf = n;
    }
  } catch {
    // Si el PDF está comprimido en binario, se usa el valor confirmado por el usuario
  }

  const mesesFinal =
    mesesManualOverride ??
    mesesDetectadosEnPdf ??
    obtenerPoliticaCorte().mesesParaCorte;

  const politica = guardarPoliticaCorte({
    mesesParaCorte: mesesFinal,
    nombreArchivoPdf: file.name,
    pdfDataUrl: dataUrl,
    resolucionReferencia:
      resolucionTexto?.trim() ||
      `Actualización por Documento PDF (${file.name})`,
    fechaActualizacion: new Date().toISOString().slice(0, 10),
  });

  return { politica, mesesDetectadosEnPdf };
}
