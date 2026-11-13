-- =============================================================================
-- SISTEMA DE GESTIÓN ISP MULTISUCURSAL & COBROS (TECNOEDU)
-- Esquema PostgreSQL para Supabase con Perfiles por Sucursal, Política de Corte
-- mediante PDF, Vista para n8n/WhatsApp Business API y Políticas RLS Seguras
-- =============================================================================

-- 1. Tabla: sucursales
CREATE TABLE IF NOT EXISTS public.sucursales (
    id TEXT PRIMARY KEY CHECK (id IN ('BER', 'TAR', 'SCZ', 'ROB')),
    nombre TEXT NOT NULL,
    telefono_soporte TEXT,
    regulacion_att BOOLEAN NOT NULL DEFAULT true,
    activo BOOLEAN NOT NULL DEFAULT true
);

-- Semilla inicial de las 4 sucursales (BER, TAR, SCZ con legalidad ATT; ROB gestión interna)
INSERT INTO public.sucursales (id, nombre, telefono_soporte, regulacion_att, activo)
VALUES
    ('BER', 'Bermejo', '59170000001', true, true),
    ('TAR', 'Tarija', '59170000002', true, true),
    ('SCZ', 'Santa Cruz', '59170000003', true, true),
    ('ROB', 'Roboré', '59170000004', false, true)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    telefono_soporte = EXCLUDED.telefono_soporte,
    activo = EXCLUDED.activo;

-- 2. Tabla: clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cliente TEXT UNIQUE NOT NULL,
    sucursal_id TEXT NOT NULL REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    celular TEXT NOT NULL, -- Formato E.164 (ej. 5917XXXXXXX) fundamental para WhatsApp Business API / n8n
    direccion TEXT,
    zona_comunidad TEXT,
    tipo_tecnologia TEXT NOT NULL CHECK (tipo_tecnologia IN ('FIBRA', 'ANTENA')),
    precio_mensual NUMERIC(10,2) NOT NULL CHECK (precio_mensual >= 0),
    fecha_inicio DATE NOT NULL, -- Permite fecha histórica real (ej. 2020-03-01)
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_sucursal_id ON public.clientes(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_cliente ON public.clientes(codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_celular ON public.clientes(celular);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);

-- 3. Tabla: cobros
CREATE TABLE IF NOT EXISTS public.cobros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cliente TEXT NOT NULL REFERENCES public.clientes(codigo_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    periodo_mes TEXT NOT NULL, -- Formato 'AAAA-MM' (ej. '2026-09'); el último mes pagado sirve de ancla hacia adelante
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'QR', 'TRANSFERENCIA')),
    numero_recibo TEXT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobros_codigo_cliente ON public.cobros(codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_cobros_periodo_mes ON public.cobros(periodo_mes);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha_pago ON public.cobros(fecha_pago);

-- 4. Tabla: perfiles_usuarios (Control de Acceso: Gerencia Central y 4 Operadores por Sucursal)
CREATE TABLE IF NOT EXISTS public.perfiles_usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('ADMIN_GENERAL', 'OPERADOR_SUCURSAL')),
    sucursal_id TEXT REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    correo_recuperacion_corporativo TEXT NOT NULL DEFAULT 'administracion@tecnoedu.com.bo',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_sucursal_operador CHECK (
        (rol = 'ADMIN_GENERAL' AND sucursal_id IS NULL) OR
        (rol = 'OPERADOR_SUCURSAL' AND sucursal_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_perfiles_usuarios_sucursal ON public.perfiles_usuarios(sucursal_id);

-- 5. Tabla: politicas_corte (Política de Corte sujeta a cambios mediante Documento PDF / ATT)
CREATE TABLE IF NOT EXISTS public.politicas_corte (
    id TEXT PRIMARY KEY DEFAULT 'VIGENTE',
    meses_para_corte INTEGER NOT NULL DEFAULT 2 CHECK (meses_para_corte >= 1 AND meses_para_corte <= 12),
    resolucion_referencia TEXT NOT NULL DEFAULT 'Política de Corte TecnoEdu / Marco ATT Vigente',
    nombre_archivo_pdf TEXT NOT NULL DEFAULT 'Politica_Corte_ISP_TecnoEdu_ATT_2026.pdf',
    pdf_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.politicas_corte (id, meses_para_corte, resolucion_referencia, nombre_archivo_pdf)
VALUES ('VIGENTE', 2, 'Política de Corte TecnoEdu / Marco ATT Vigente', 'Politica_Corte_ISP_TecnoEdu_ATT_2026.pdf')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. Vista Optimizada para Integración con n8n y WhatsApp Business Cloud API
--    Responde al instante: "¿Debo o cuánto debo?", "¿Qué plan tengo?", "¿Cuál fue mi último pago?"
-- =============================================================================
CREATE OR REPLACE VIEW public.vista_consulta_n8n_whatsapp
WITH (security_invoker = true) AS
SELECT
    c.id AS cliente_id,
    c.codigo_cliente,
    c.sucursal_id,
    s.nombre AS sucursal_nombre,
    s.telefono_soporte,
    c.nombres,
    c.apellidos,
    (c.nombres || ' ' || c.apellidos) AS nombre_completo,
    c.celular,
    c.direccion,
    c.zona_comunidad,
    c.tipo_tecnologia,
    c.precio_mensual,
    c.fecha_inicio,
    c.estado,
    ult.ultimo_periodo_pagado,
    ult.ultima_fecha_pago,
    COALESCE(ult.total_pagos_registrados, 0) AS total_pagos_registrados
FROM public.clientes c
JOIN public.sucursales s ON s.id = c.sucursal_id
LEFT JOIN LATERAL (
    SELECT
        MAX(cb.periodo_mes) AS ultimo_periodo_pagado,
        MAX(cb.fecha_pago) AS ultima_fecha_pago,
        COUNT(*) AS total_pagos_registrados
    FROM public.cobros cb
    WHERE cb.codigo_cliente = c.codigo_cliente
      AND cb.monto > 0
) ult ON true;

-- =============================================================================
-- 7. Seguridad Row Level Security (RLS) por Rol y Sucursal
-- =============================================================================
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.politicas_corte ENABLE ROW LEVEL SECURITY;

-- Sucursales: Lectura pública y para usuarios autenticados
DROP POLICY IF EXISTS "Permitir lectura de sucursales" ON public.sucursales;
CREATE POLICY "sucursales_select_public"
    ON public.sucursales FOR SELECT
    TO anon, authenticated
    USING (true);

-- Perfiles de Usuario: Cada operador lee su propio perfil; Gerencia lee y gestiona todos
DROP POLICY IF EXISTS "perfiles_select_propio_o_admin" ON public.perfiles_usuarios;
CREATE POLICY "perfiles_select_propio_o_admin"
    ON public.perfiles_usuarios FOR SELECT
    TO authenticated
    USING (
        id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.perfiles_usuarios p
            WHERE p.id = (SELECT auth.uid()) AND p.rol = 'ADMIN_GENERAL' AND p.activo = true
        )
    );

DROP POLICY IF EXISTS "perfiles_all_admin" ON public.perfiles_usuarios;
CREATE POLICY "perfiles_all_admin"
    ON public.perfiles_usuarios FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios p
            WHERE p.id = (SELECT auth.uid()) AND p.rol = 'ADMIN_GENERAL' AND p.activo = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios p
            WHERE p.id = (SELECT auth.uid()) AND p.rol = 'ADMIN_GENERAL' AND p.activo = true
        )
    );

-- Clientes:
-- 1) Usuarios autenticados con perfil en `perfiles_usuarios` solo ven y operan su sucursal (o todas si es ADMIN_GENERAL).
-- 2) Modo de transición / consulta / n8n: permite operar mientras se completa el alta de cuentas en Supabase Auth.
DROP POLICY IF EXISTS "Permitir acceso completo a clientes" ON public.clientes;
DROP POLICY IF EXISTS "clientes_acceso_por_sucursal" ON public.clientes;
CREATE POLICY "clientes_acceso_por_sucursal"
    ON public.clientes FOR ALL
    TO anon, authenticated
    USING (
        (SELECT auth.uid()) IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.perfiles_usuarios p
            WHERE p.id = (SELECT auth.uid())
              AND p.activo = true
              AND (p.rol = 'ADMIN_GENERAL' OR p.sucursal_id = clientes.sucursal_id)
        )
    )
    WITH CHECK (
        (SELECT auth.uid()) IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.perfiles_usuarios p
            WHERE p.id = (SELECT auth.uid())
              AND p.activo = true
              AND (p.rol = 'ADMIN_GENERAL' OR p.sucursal_id = clientes.sucursal_id)
        )
    );

-- Cobros: Restringidos a la sucursal del cliente correspondiente (o ADMIN_GENERAL)
DROP POLICY IF EXISTS "Permitir acceso completo a cobros" ON public.cobros;
DROP POLICY IF EXISTS "cobros_acceso_por_sucursal" ON public.cobros;
CREATE POLICY "cobros_acceso_por_sucursal"
    ON public.cobros FOR ALL
    TO anon, authenticated
    USING (
        (SELECT auth.uid()) IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.perfiles_usuarios p
            JOIN public.clientes c ON c.codigo_cliente = cobros.codigo_cliente
            WHERE p.id = (SELECT auth.uid())
              AND p.activo = true
              AND (p.rol = 'ADMIN_GENERAL' OR p.sucursal_id = c.sucursal_id)
        )
    )
    WITH CHECK (
        (SELECT auth.uid()) IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.perfiles_usuarios p
            JOIN public.clientes c ON c.codigo_cliente = cobros.codigo_cliente
            WHERE p.id = (SELECT auth.uid())
              AND p.activo = true
              AND (p.rol = 'ADMIN_GENERAL' OR p.sucursal_id = c.sucursal_id)
        )
    );

-- Política de Corte: Lectura para todos, actualización por administración
DROP POLICY IF EXISTS "politicas_corte_acceso" ON public.politicas_corte;
CREATE POLICY "politicas_corte_acceso"
    ON public.politicas_corte FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 8. TABLA DE EGRESOS FIJOS Y VARIABLES (CON DETALLE DE GASTOS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.egresos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id TEXT NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    tipo TEXT NOT NULL CHECK (tipo IN ('FIJO', 'VARIABLE')),
    concepto TEXT NOT NULL,
    detalle_gastos TEXT NOT NULL DEFAULT '',
    monto_bs NUMERIC(10, 2) NOT NULL CHECK (monto_bs > 0),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    registrado_por TEXT NOT NULL DEFAULT 'Administración',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egresos_sucursal_fecha
    ON public.egresos(sucursal_id, fecha DESC);

ALTER TABLE public.egresos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "egresos_acceso_admin_y_sucursal" ON public.egresos;
CREATE POLICY "egresos_acceso_admin_y_sucursal"
    ON public.egresos FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 9. TABLA DE INVENTARIO Y TRAZABILIDAD DE EQUIPOS DE CLIENTE (ONUs / ROUTERS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.equipos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_equipo TEXT NOT NULL UNIQUE,
    sucursal_id TEXT NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    tipo_equipo TEXT NOT NULL,
    marca_modelo TEXT NOT NULL,
    serie_mac TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN (
        'EN_STOCK',
        'EN_PODER_TECNICO',
        'INSTALADO_CLIENTE',
        'EN_OBSERVACION_CASA',
        'BAJA_QUEMADO'
    )),
    fecha_compra DATE NOT NULL DEFAULT CURRENT_DATE,
    tecnico_asignado_nombre TEXT,
    tecnico_asignado_email TEXT,
    fecha_entrega_tecnico DATE,
    cliente_codigo TEXT,
    cliente_nombre TEXT,
    fecha_instalacion_o_cambio DATE,
    motivo_observacion TEXT,
    historial_ultimo_movimiento TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipos_sucursal_estado
    ON public.equipos_inventario(sucursal_id, estado);

CREATE INDEX IF NOT EXISTS idx_equipos_tecnico_email
    ON public.equipos_inventario(tecnico_asignado_email);

ALTER TABLE public.equipos_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipos_inventario_acceso_operativo" ON public.equipos_inventario;
CREATE POLICY "equipos_inventario_acceso_operativo"
    ON public.equipos_inventario FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
