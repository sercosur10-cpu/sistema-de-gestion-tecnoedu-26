'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  SucursalId,
  CuentaAccesoDB,
  Database,
} from '@/lib/supabase/database.types';

export type RolSistema =
  | 'ADMIN_GENERAL'
  | 'OPERADOR_SUCURSAL'
  | 'TECNICO_SUCURSAL';

export interface CuentaAcceso {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  passwordHash: string; // Clave de acceso (gestionada centralmente por Gerencia General)
  rol: RolSistema;
  sucursalId: SucursalId | null; // null = Acceso Total (Gerencia Central)
  correoRecuperacionCorporativo: string;
  activo: boolean;
  ultimoAcceso?: string | null;
}

export function dbToCuenta(row: CuentaAccesoDB): CuentaAcceso {
  return {
    id: row.id,
    nombre: row.nombre,
    cargo: row.cargo,
    email: row.email,
    passwordHash: row.password_hash,
    rol: row.rol,
    sucursalId: (row.sucursal_id as SucursalId | null) ?? null,
    correoRecuperacionCorporativo:
      row.correo_recuperacion || CORREO_CORPORATIVO_DEFAULT,
    activo: row.activo,
    ultimoAcceso: row.ultimo_acceso,
  };
}

const STORAGE_CUENTAS_KEY = 'tecnoedu_isp_cuentas_acceso_v4';
const STORAGE_SESION_KEY = 'tecnoedu_isp_sesion_activa_v1';
const STORAGE_CORREO_CORPORATIVO_KEY = 'tecnoedu_isp_correo_corporativo_v3';

export const CORREO_CORPORATIVO_DEFAULT = 'kcatari@tecnoedu.com.bo';

/**
 * Estructura real e independiente por Agencia / Sucursal:
 * - Gerencia Central: 1 cuenta global
 * - Bermejo (BER): 1 Administrativo + 3 Técnicos
 * - Tarija (TAR): 1 Administrativo + 2 Técnicos (incluye Técnico 1 Pedro)
 * - Santa Cruz (SCZ): 1 Administrativo + 4 Técnicos
 * - Roboré (ROB): 1 Administrativo + 2 Técnicos
 */
export const CUENTAS_INICIALES: CuentaAcceso[] = [
  // ================= GERENCIA CENTRAL =================
  {
    id: 'usr-admin-central',
    nombre: 'Kevin — Gerencia General TecnoEdu',
    cargo: 'Administración Central (Acceso Global a las 4 Sucursales)',
    email: 'kcatari@tecnoedu.com.bo',
    passwordHash: 'TecnoAdmin2026*',
    rol: 'ADMIN_GENERAL',
    sucursalId: null,
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },

  // ================= AGENCIA BERMEJO (BER): 1 ADMINISTRATIVO + 3 TÉCNICOS =================
  {
    id: 'usr-suc-ber',
    nombre: 'Administrativo Agencia Bermejo',
    cargo: 'Administrador de Sucursal (Cobros, Egresos, Inventario y 3 Técnicos) — Bermejo (BER)',
    email: 'bermejo@tecnoedu.com.bo',
    passwordHash: 'Bermejo2026*',
    rol: 'OPERADOR_SUCURSAL',
    sucursalId: 'BER',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-ber-1',
    nombre: 'Técnico 1 Bermejo: Carlos',
    cargo: 'Técnico de Campo e Instalaciones (1/3) — Bermejo (BER)',
    email: 'tecnico1.bermejo@tecnoedu.com.bo',
    passwordHash: 'BerTec1*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'BER',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-ber-2',
    nombre: 'Técnico 2 Bermejo: Miguel',
    cargo: 'Técnico de Campo e Instalaciones (2/3) — Bermejo (BER)',
    email: 'tecnico2.bermejo@tecnoedu.com.bo',
    passwordHash: 'BerTec2*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'BER',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-ber-3',
    nombre: 'Técnico 3 Bermejo: Fernando',
    cargo: 'Técnico de Campo e Instalaciones (3/3) — Bermejo (BER)',
    email: 'tecnico3.bermejo@tecnoedu.com.bo',
    passwordHash: 'BerTec3*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'BER',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },

  // ================= AGENCIA TARIJA (TAR): 1 ADMINISTRATIVO + 2 TÉCNICOS =================
  {
    id: 'usr-suc-tar',
    nombre: 'Administrativo Agencia Tarija',
    cargo: 'Administrador de Sucursal (Cobros, Egresos, Inventario y 2 Técnicos) — Tarija (TAR)',
    email: 'tarija@tecnoedu.com.bo',
    passwordHash: 'Tarija2026*',
    rol: 'OPERADOR_SUCURSAL',
    sucursalId: 'TAR',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-tar-pedro',
    nombre: 'Técnico 1 Tarija: Pedro',
    cargo: 'Técnico de Campo e Instalaciones (1/2) — Tarija (TAR)',
    email: 'pedro.tarija@tecnoedu.com.bo',
    passwordHash: 'Pedro2026*',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'TAR',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-tar-2',
    nombre: 'Técnico 2 Tarija: Rodrigo',
    cargo: 'Técnico de Campo e Instalaciones (2/2) — Tarija (TAR)',
    email: 'tecnico2.tarija@tecnoedu.com.bo',
    passwordHash: 'TarTec2*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'TAR',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },

  // ================= AGENCIA SANTA CRUZ (SCZ): 1 ADMINISTRATIVO + 4 TÉCNICOS =================
  {
    id: 'usr-suc-scz',
    nombre: 'Administrativo Agencia Santa Cruz',
    cargo: 'Administrador de Sucursal (Cobros, Egresos, Inventario y 4 Técnicos) — Santa Cruz (SCZ)',
    email: 'santacruz@tecnoedu.com.bo',
    passwordHash: 'SantaCruz2026*',
    rol: 'OPERADOR_SUCURSAL',
    sucursalId: 'SCZ',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-scz-1',
    nombre: 'Técnico 1 Santa Cruz: Diego',
    cargo: 'Técnico de Campo e Instalaciones (1/4) — Santa Cruz (SCZ)',
    email: 'tecnico1.santacruz@tecnoedu.com.bo',
    passwordHash: 'SczTec1*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'SCZ',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-scz-2',
    nombre: 'Técnico 2 Santa Cruz: Javier',
    cargo: 'Técnico de Campo e Instalaciones (2/4) — Santa Cruz (SCZ)',
    email: 'tecnico2.santacruz@tecnoedu.com.bo',
    passwordHash: 'SczTec2*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'SCZ',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-scz-3',
    nombre: 'Técnico 3 Santa Cruz: Marco',
    cargo: 'Técnico de Campo e Instalaciones (3/4) — Santa Cruz (SCZ)',
    email: 'tecnico3.santacruz@tecnoedu.com.bo',
    passwordHash: 'SczTec3*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'SCZ',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-scz-4',
    nombre: 'Técnico 4 Santa Cruz: Luis',
    cargo: 'Técnico de Campo e Instalaciones (4/4) — Santa Cruz (SCZ)',
    email: 'tecnico4.santacruz@tecnoedu.com.bo',
    passwordHash: 'SczTec4*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'SCZ',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },

  // ================= AGENCIA ROBORÉ (ROB): 1 ADMINISTRATIVO + 2 TÉCNICOS =================
  {
    id: 'usr-suc-rob',
    nombre: 'Administrativo Agencia Roboré',
    cargo: 'Administrador de Sucursal (Cobros, Egresos, Inventario y 2 Técnicos) — Roboré (ROB)',
    email: 'robore@tecnoedu.com.bo',
    passwordHash: 'Robore2026*',
    rol: 'OPERADOR_SUCURSAL',
    sucursalId: 'ROB',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-rob-1',
    nombre: 'Técnico 1 Roboré: Richard',
    cargo: 'Técnico de Campo e Instalaciones (1/2) — Roboré (ROB)',
    email: 'tecnico1.robore@tecnoedu.com.bo',
    passwordHash: 'RobTec1*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'ROB',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
  {
    id: 'usr-tec-rob-2',
    nombre: 'Técnico 2 Roboré: Rubén',
    cargo: 'Técnico de Campo e Instalaciones (2/2) — Roboré (ROB)',
    email: 'tecnico2.robore@tecnoedu.com.bo',
    passwordHash: 'RobTec2*2026',
    rol: 'TECNICO_SUCURSAL',
    sucursalId: 'ROB',
    correoRecuperacionCorporativo: CORREO_CORPORATIVO_DEFAULT,
    activo: true,
  },
];

function leerCuentasStorage(): CuentaAcceso[] {
  if (typeof window === 'undefined') return CUENTAS_INICIALES;
  try {
    const raw = window.localStorage.getItem(STORAGE_CUENTAS_KEY);
    if (!raw) {
      window.localStorage.setItem(
        STORAGE_CUENTAS_KEY,
        JSON.stringify(CUENTAS_INICIALES)
      );
      return CUENTAS_INICIALES;
    }
    const parsed = JSON.parse(raw) as CuentaAcceso[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return CUENTAS_INICIALES;
    }
    const idsExistentes = new Set(parsed.map((c) => c.id));
    const faltantes = CUENTAS_INICIALES.filter(
      (c) => !idsExistentes.has(c.id)
    );
    if (faltantes.length > 0) {
      const fusionadas = [...parsed, ...faltantes];
      window.localStorage.setItem(
        STORAGE_CUENTAS_KEY,
        JSON.stringify(fusionadas)
      );
      return fusionadas;
    }
    return parsed;
  } catch {
    return CUENTAS_INICIALES;
  }
}

function guardarCuentasStorage(cuentas: CuentaAcceso[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_CUENTAS_KEY, JSON.stringify(cuentas));
}

function resolverRutaDestino(cuenta: CuentaAcceso): string {
  if (cuenta.rol === 'TECNICO_SUCURSAL') {
    return '/admin/tecnico';
  }
  if (cuenta.rol === 'ADMIN_GENERAL' || !cuenta.sucursalId) {
    return '/admin';
  }
  return `/admin/sucursal/${cuenta.sucursalId}`;
}

interface AuthContextValue {
  usuarioActivo: CuentaAcceso | null;
  cargandoSesion: boolean;
  cuentas: CuentaAcceso[];
  correoCorporativoMaestro: string;
  iniciarSesion: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error: string | null; destino: string }>;
  cerrarSesion: () => Promise<void>;
  solicitarRecuperacionPassword: (
    emailCuenta: string,
    correoCorporativoVerificacion: string,
    nuevaPassword?: string
  ) => Promise<{ ok: boolean; mensaje: string }>;
  actualizarCuentaAcceso: (
    id: string,
    cambios: Partial<
      Pick<
        CuentaAcceso,
        | 'email'
        | 'passwordHash'
        | 'nombre'
        | 'correoRecuperacionCorporativo'
        | 'activo'
      >
    >
  ) => Promise<{ ok: boolean; mensaje: string }>;
  crearCuentaTecnico: (input: {
    nombre: string;
    email: string;
    passwordHash: string;
    sucursalId: SucursalId;
  }) => Promise<{ ok: boolean; mensaje: string }>;
  actualizarCorreoCorporativoMaestro: (nuevoCorreo: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [cuentas, setCuentas] = useState<CuentaAcceso[]>(CUENTAS_INICIALES);
  const [usuarioActivo, setUsuarioActivo] = useState<CuentaAcceso | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [correoCorporativoMaestro, setCorreoCorporativoMaestro] = useState(
    CORREO_CORPORATIVO_DEFAULT
  );

  useEffect(() => {
    const lista = leerCuentasStorage();
    setCuentas(lista);

    if (typeof window !== 'undefined') {
      const corp = window.localStorage.getItem(STORAGE_CORREO_CORPORATIVO_KEY);
      if (corp) setCorreoCorporativoMaestro(corp);

      const sesionGuardada = window.localStorage.getItem(STORAGE_SESION_KEY);
      if (sesionGuardada) {
        try {
          const parsed = JSON.parse(sesionGuardada) as CuentaAcceso;
          const actualizada =
            lista.find((c) => c.id === parsed.id) ?? parsed;
          setUsuarioActivo(actualizada);
        } catch {
          setUsuarioActivo(null);
        }
      }
    }

    // Sincronizar catálogo centralizado de cuentas desde Supabase
    const syncCuentas = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('cuentas_acceso')
            .select('*')
            .order('id');

          if (!error && data && data.length > 0) {
            const mapped = data.map((r) => dbToCuenta(r as CuentaAccesoDB));
            setCuentas(mapped);
            guardarCuentasStorage(mapped);

            setUsuarioActivo((prev) => {
              if (!prev) return null;
              const refreshed = mapped.find((c) => c.id === prev.id);
              if (refreshed) {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(
                    STORAGE_SESION_KEY,
                    JSON.stringify(refreshed)
                  );
                }
                return refreshed;
              }
              return prev;
            });
          }
        } catch (e) {
          console.warn('Error sincronizando cuentas Supabase:', e);
        }
      }
      setCargandoSesion(false);
    };

    syncCuentas();
  }, []);

  const iniciarSesion = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ ok: boolean; error: string | null; destino: string }> => {
      const emailLimpio = email.trim().toLowerCase();
      const passLimpia = password.trim();

      if (!emailLimpio || !passLimpia) {
        return {
          ok: false,
          error: 'Por favor ingresa tu correo y contraseña asignada.',
          destino: '/login',
        };
      }

      // 1. Validar en tiempo real con Supabase (Base de datos centralizada de Producción)
      if (isSupabaseConfigured) {
        try {
          const { data: dbUser, error } = await supabase
            .from('cuentas_acceso')
            .select('*')
            .ilike('email', emailLimpio)
            .eq('activo', true)
            .maybeSingle();

          if (!error && dbUser) {
            if (dbUser.password_hash === passLimpia) {
              const nowIso = new Date().toISOString();
              // Actualizar fecha de último acceso en segundo plano
              supabase
                .from('cuentas_acceso')
                .update({ ultimo_acceso: nowIso })
                .eq('id', dbUser.id)
                .then();

              const cuenta = dbToCuenta({
                ...(dbUser as CuentaAccesoDB),
                ultimo_acceso: nowIso,
              });

              setUsuarioActivo(cuenta);
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(
                  STORAGE_SESION_KEY,
                  JSON.stringify(cuenta)
                );
              }

              setCuentas((prev) => {
                const updated = prev.map((c) =>
                  c.id === cuenta.id ? cuenta : c
                );
                guardarCuentasStorage(updated);
                return updated;
              });

              const destino = resolverRutaDestino(cuenta);
              return { ok: true, error: null, destino };
            } else {
              return {
                ok: false,
                error:
                  'Contraseña incorrecta. Solo Gerencia General (kcatari@tecnoedu.com.bo) define y entrega las contraseñas para esta sucursal.',
                destino: '/login',
              };
            }
          }
        } catch (e) {
          console.warn('Fallo consulta remota cuentas_acceso, usando fallback local:', e);
        }
      }

      // 2. Fallback de verificación local (offline / demo)
      const listaActual = leerCuentasStorage();
      const encontrada = listaActual.find(
        (c) => c.email.toLowerCase() === emailLimpio && c.activo
      );

      if (encontrada) {
        if (encontrada.passwordHash === passLimpia) {
          const conFecha: CuentaAcceso = {
            ...encontrada,
            ultimoAcceso: new Date().toISOString(),
          };
          const nuevasCuentas = listaActual.map((c) =>
            c.id === encontrada.id ? conFecha : c
          );
          guardarCuentasStorage(nuevasCuentas);
          setCuentas(nuevasCuentas);
          setUsuarioActivo(conFecha);

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(
              STORAGE_SESION_KEY,
              JSON.stringify(conFecha)
            );
          }

          const destino = resolverRutaDestino(conFecha);
          return { ok: true, error: null, destino };
        } else {
          return {
            ok: false,
            error:
              'Contraseña incorrecta. Solo Gerencia General (kcatari@tecnoedu.com.bo) puede entregar o cambiar la contraseña.',
            destino: '/login',
          };
        }
      }

      return {
        ok: false,
        error:
          'No se encontró una cuenta activa asociada a este correo electrónico.',
        destino: '/login',
      };
    },
    []
  );

  const cerrarSesion = useCallback(async () => {
    setUsuarioActivo(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_SESION_KEY);
    }
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignorar si no había sesión remota
      }
    }
  }, []);

  const solicitarRecuperacionPassword = useCallback(
    async (
      emailCuenta: string,
      correoCorporativoVerificacion: string,
      nuevaPassword?: string
    ): Promise<{ ok: boolean; mensaje: string }> => {
      const emailLimpio = emailCuenta.trim().toLowerCase();
      const corpLimpio = correoCorporativoVerificacion.trim().toLowerCase();
      const lista = leerCuentasStorage();
      const cuenta = lista.find((c) => c.email.toLowerCase() === emailLimpio);

      if (!cuenta) {
        return {
          ok: false,
          mensaje: `No se encontró ninguna cuenta asociada al correo ${emailCuenta}.`,
        };
      }

      const corpAutorizado =
        corpLimpio === cuenta.correoRecuperacionCorporativo.toLowerCase() ||
        corpLimpio === correoCorporativoMaestro.toLowerCase();

      if (!corpAutorizado) {
        return {
          ok: false,
          mensaje: `El correo corporativo de respaldo no coincide. El cambio de contraseñas debe ser autorizado exclusivamente por Gerencia General (${correoCorporativoMaestro}).`,
        };
      }

      if (nuevaPassword && nuevaPassword.trim().length >= 6) {
        const passFinal = nuevaPassword.trim();

        if (isSupabaseConfigured) {
          try {
            await supabase
              .from('cuentas_acceso')
              .update({
                password_hash: passFinal,
                updated_at: new Date().toISOString(),
              })
              .eq('email', emailLimpio);
          } catch (e) {
            console.error('Error al persistir nueva contraseña en Supabase:', e);
          }
        }

        const nuevas = lista.map((c) =>
          c.id === cuenta.id
            ? { ...c, passwordHash: passFinal }
            : c
        );
        guardarCuentasStorage(nuevas);
        setCuentas(nuevas);
        return {
          ok: true,
          mensaje: `Contraseña restablecida exitosamente para ${cuenta.email} autorizada con el correo corporativo (${corpLimpio}). La nueva clave está activa en el sistema.`,
        };
      }

      return {
        ok: true,
        mensaje: `Se verificó la autorización con el correo corporativo ${correoCorporativoMaestro}.`,
      };
    },
    [correoCorporativoMaestro]
  );

  const actualizarCuentaAcceso = useCallback(
    async (
      id: string,
      cambios: Partial<
        Pick<
          CuentaAcceso,
          | 'email'
          | 'passwordHash'
          | 'nombre'
          | 'correoRecuperacionCorporativo'
          | 'activo'
        >
      >
    ): Promise<{ ok: boolean; mensaje: string }> => {
      const emailNormalizado = cambios.email
        ? cambios.email.trim().toLowerCase()
        : undefined;
      const passNormalizada = cambios.passwordHash
        ? cambios.passwordHash.trim()
        : undefined;

      // Persistir inmediatamente en Supabase PostgreSQL
      if (isSupabaseConfigured) {
        try {
          const updatePayload: Database['public']['Tables']['cuentas_acceso']['Update'] =
            {
              updated_at: new Date().toISOString(),
            };
          if (cambios.nombre) updatePayload.nombre = cambios.nombre.trim();
          if (emailNormalizado) updatePayload.email = emailNormalizado;
          if (passNormalizada) updatePayload.password_hash = passNormalizada;
          if (cambios.correoRecuperacionCorporativo) {
            updatePayload.correo_recuperacion =
              cambios.correoRecuperacionCorporativo.trim().toLowerCase();
          }
          if (cambios.activo !== undefined) updatePayload.activo = cambios.activo;

          const { error } = await supabase
            .from('cuentas_acceso')
            .update(updatePayload)
            .eq('id', id);

          if (error) {
            console.error('Error actualizando cuenta en Supabase:', error);
          }
        } catch (e) {
          console.error('Excepción actualizando cuenta en Supabase:', e);
        }
      }

      // Actualizar caché local
      const lista = leerCuentasStorage();
      const idx = lista.findIndex((c) => c.id === id);
      if (idx === -1) {
        return { ok: false, mensaje: 'Cuenta no encontrada.' };
      }

      const actualizada: CuentaAcceso = {
        ...lista[idx],
        ...cambios,
        email: emailNormalizado ?? lista[idx].email,
        passwordHash: passNormalizada ?? lista[idx].passwordHash,
      };
      lista[idx] = actualizada;
      guardarCuentasStorage(lista);
      setCuentas([...lista]);

      if (usuarioActivo?.id === id) {
        setUsuarioActivo(actualizada);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            STORAGE_SESION_KEY,
            JSON.stringify(actualizada)
          );
        }
      }

      return {
        ok: true,
        mensaje: `Credenciales actualizadas exitosamente para ${actualizada.nombre} (${actualizada.email}).`,
      };
    },
    [usuarioActivo]
  );

  const crearCuentaTecnico = useCallback(
    async (input: {
      nombre: string;
      email: string;
      passwordHash: string;
      sucursalId: SucursalId;
    }): Promise<{ ok: boolean; mensaje: string }> => {
      const emailLimpio = input.email.trim().toLowerCase();
      const passLimpia = input.passwordHash.trim();
      const nombreLimpio = input.nombre.trim();

      if (!nombreLimpio || !emailLimpio || !passLimpia) {
        return {
          ok: false,
          mensaje: 'Nombre, correo y contraseña del técnico son obligatorios.',
        };
      }

      const idTec = `usr-tec-${input.sucursalId.toLowerCase()}-${Date.now()}`;
      const cargo = `Técnico de Campo e Instalaciones — Sucursal ${input.sucursalId}`;

      // Persistir en Supabase
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('cuentas_acceso').insert({
            id: idTec,
            nombre: nombreLimpio,
            cargo,
            email: emailLimpio,
            password_hash: passLimpia,
            rol: 'TECNICO_SUCURSAL',
            sucursal_id: input.sucursalId,
            correo_recuperacion: correoCorporativoMaestro,
            activo: true,
          });

          if (error) {
            console.error('Error insertando técnico en Supabase:', error);
          }
        } catch (e) {
          console.error('Excepción insertando técnico en Supabase:', e);
        }
      }

      const lista = leerCuentasStorage();
      const nuevaCuenta: CuentaAcceso = {
        id: idTec,
        nombre: nombreLimpio,
        cargo,
        email: emailLimpio,
        passwordHash: passLimpia,
        rol: 'TECNICO_SUCURSAL',
        sucursalId: input.sucursalId,
        correoRecuperacionCorporativo: correoCorporativoMaestro,
        activo: true,
      };

      const nuevas = [...lista, nuevaCuenta];
      guardarCuentasStorage(nuevas);
      setCuentas(nuevas);

      return {
        ok: true,
        mensaje: `Técnico creado exitosamente: ${nuevaCuenta.nombre} (${nuevaCuenta.email}) para ${input.sucursalId}.`,
      };
    },
    [correoCorporativoMaestro]
  );

  const actualizarCorreoCorporativoMaestro = useCallback(
    async (nuevoCorreo: string) => {
      const limpio = nuevoCorreo.trim().toLowerCase();
      if (!limpio) return;
      setCorreoCorporativoMaestro(limpio);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_CORREO_CORPORATIVO_KEY, limpio);
      }

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('cuentas_acceso')
            .update({ correo_recuperacion: limpio, updated_at: new Date().toISOString() })
            .neq('id', '');
        } catch (e) {
          console.error('Error actualizando correo en Supabase:', e);
        }
      }

      const lista = leerCuentasStorage().map((c) => ({
        ...c,
        correoRecuperacionCorporativo: limpio,
      }));
      guardarCuentasStorage(lista);
      setCuentas(lista);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        usuarioActivo,
        cargandoSesion,
        cuentas,
        correoCorporativoMaestro,
        iniciarSesion,
        cerrarSesion,
        solicitarRecuperacionPassword,
        actualizarCuentaAcceso,
        crearCuentaTecnico,
        actualizarCorreoCorporativoMaestro,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
