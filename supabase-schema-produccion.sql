-- =========================================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS PARA PRODUCCIÓN: TECNOEDU ISP
-- Compatible con Supabase Pro ($25/mes) PostgreSQL
-- Ejecutar en: Supabase Studio -> SQL Editor -> New Query
-- =========================================================================

-- 1. TABLA: SUCURSALES (Sedes fijas del ISP)
CREATE TABLE IF NOT EXISTS public.sucursales (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono_soporte TEXT,
    activo BOOLEAN DEFAULT true NOT NULL
);

-- Inserción de las 4 Sucursales Base
INSERT INTO public.sucursales (id, nombre, telefono_soporte, activo)
VALUES 
    ('BER', 'Bermejo', '59171110001', true),
    ('TAR', 'Tarija', '59171110002', true),
    ('SCZ', 'Santa Cruz', '59171110003', true),
    ('ROB', 'Roboré', '59171110004', true)
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    telefono_soporte = EXCLUDED.telefono_soporte,
    activo = EXCLUDED.activo;

-- 2. TABLA: CLIENTES (Padrón Centralizado de Abonados)
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cliente TEXT UNIQUE NOT NULL,
    sucursal_id TEXT NOT NULL REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    celular TEXT NOT NULL, -- Formato E.164 para WhatsApp Cloud API (ej: 5917XXXXXXX)
    direccion TEXT,
    zona_comunidad TEXT,
    tipo_tecnologia TEXT NOT NULL CHECK (tipo_tecnologia IN ('FIBRA', 'ANTENA')),
    precio_mensual NUMERIC(10,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices optimizados para búsquedas rápidas (por celular para WhatsApp y código para MiniApp)
CREATE INDEX IF NOT EXISTS idx_clientes_celular ON public.clientes (celular);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON public.clientes (codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_sucursal ON public.clientes (sucursal_id);

-- 3. TABLA: COBROS (Libro Diario y Registro Consecutivo de Pagos)
CREATE TABLE IF NOT EXISTS public.cobros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cliente TEXT NOT NULL REFERENCES public.clientes(codigo_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_pago DATE NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    periodo_mes TEXT NOT NULL, -- Formato AAAA-MM (ej: '2026-11')
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'QR', 'TRANSFERENCIA')),
    numero_recibo TEXT,
    observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cobros_codigo ON public.cobros (codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_cobros_periodo ON public.cobros (periodo_mes);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha ON public.cobros (fecha_pago);

-- =========================================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para la aplicación web y MiniApp (Anon Key)
CREATE POLICY "Permitir lectura de sucursales a todos" ON public.sucursales
    FOR SELECT USING (true);

CREATE POLICY "Permitir lectura y gestión de clientes" ON public.clientes
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y registro de cobros" ON public.cobros
    FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA: CUENTAS DE ACCESO (Catálogo centralizado de credenciales multisucursal)
CREATE TABLE IF NOT EXISTS public.cuentas_acceso (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    cargo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('ADMIN_GENERAL', 'OPERADOR_SUCURSAL', 'TECNICO_SUCURSAL')),
    sucursal_id TEXT REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE SET NULL,
    correo_recuperacion TEXT NOT NULL DEFAULT 'kcatari@tecnoedu.com.bo',
    activo BOOLEAN NOT NULL DEFAULT true,
    ultimo_acceso TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cuentas_acceso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura y gestion de cuentas de acceso" ON public.cuentas_acceso
    FOR ALL USING (true) WITH CHECK (true);


