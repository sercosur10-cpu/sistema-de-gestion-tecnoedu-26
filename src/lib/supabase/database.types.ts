export type SucursalId = 'BER' | 'TAR' | 'SCZ' | 'ROB';
export type TipoTecnologia = 'FIBRA' | 'ANTENA';
export type EstadoCliente = 'ACTIVO' | 'INACTIVO';
export type MetodoPago = 'EFECTIVO' | 'QR' | 'TRANSFERENCIA';

export type Sucursal = {
  id: SucursalId;
  nombre: string;
  telefono_soporte: string | null;
  activo: boolean;
};

export type Cliente = {
  id: string;
  codigo_cliente: string;
  sucursal_id: SucursalId;
  nombres: string;
  apellidos: string;
  celular: string;
  direccion: string | null;
  zona_comunidad: string | null;
  tipo_tecnologia: TipoTecnologia;
  precio_mensual: number;
  fecha_inicio: string;
  estado: EstadoCliente;
  created_at: string;
};

export type Cobro = {
  id: string;
  codigo_cliente: string;
  fecha_pago: string;
  monto: number;
  periodo_mes: string;
  metodo_pago: MetodoPago;
  numero_recibo: string | null;
  observacion: string | null;
  created_at: string;
};

export type CuentaAccesoDB = {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  password_hash: string;
  rol: 'ADMIN_GENERAL' | 'OPERADOR_SUCURSAL' | 'TECNICO_SUCURSAL';
  sucursal_id: SucursalId | null;
  correo_recuperacion: string;
  activo: boolean;
  ultimo_acceso: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      cuentas_acceso: {
        Row: CuentaAccesoDB;
        Insert: {
          id: string;
          nombre: string;
          cargo: string;
          email: string;
          password_hash: string;
          rol: 'ADMIN_GENERAL' | 'OPERADOR_SUCURSAL' | 'TECNICO_SUCURSAL';
          sucursal_id?: SucursalId | null;
          correo_recuperacion?: string;
          activo?: boolean;
          ultimo_acceso?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          cargo?: string;
          email?: string;
          password_hash?: string;
          rol?: 'ADMIN_GENERAL' | 'OPERADOR_SUCURSAL' | 'TECNICO_SUCURSAL';
          sucursal_id?: SucursalId | null;
          correo_recuperacion?: string;
          activo?: boolean;
          ultimo_acceso?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sucursales: {
        Row: Sucursal;
        Insert: {
          id: SucursalId;
          nombre: string;
          telefono_soporte?: string | null;
          activo?: boolean;
        };
        Update: {
          id?: SucursalId;
          nombre?: string;
          telefono_soporte?: string | null;
          activo?: boolean;
        };
        Relationships: [];
      };
      clientes: {
        Row: Cliente;
        Insert: {
          id?: string;
          codigo_cliente: string;
          sucursal_id: SucursalId;
          nombres: string;
          apellidos: string;
          celular: string;
          direccion?: string | null;
          zona_comunidad?: string | null;
          tipo_tecnologia: TipoTecnologia;
          precio_mensual: number;
          fecha_inicio: string;
          estado?: EstadoCliente;
          created_at?: string;
        };
        Update: {
          codigo_cliente?: string;
          sucursal_id?: SucursalId;
          nombres?: string;
          apellidos?: string;
          celular?: string;
          direccion?: string | null;
          zona_comunidad?: string | null;
          tipo_tecnologia?: TipoTecnologia;
          precio_mensual?: number;
          fecha_inicio?: string;
          estado?: EstadoCliente;
        };
        Relationships: [];
      };
      cobros: {
        Row: Cobro;
        Insert: {
          id?: string;
          codigo_cliente: string;
          fecha_pago?: string;
          monto: number;
          periodo_mes: string;
          metodo_pago: MetodoPago;
          numero_recibo?: string | null;
          observacion?: string | null;
          created_at?: string;
        };
        Update: {
          codigo_cliente?: string;
          fecha_pago?: string;
          monto?: number;
          periodo_mes?: string;
          metodo_pago?: MetodoPago;
          numero_recibo?: string | null;
          observacion?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
