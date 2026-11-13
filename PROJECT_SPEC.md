# Sistema de Gestión ISP Multisucursal & Cobros

## 1. Stack Tecnológico
- Frontend / Framework: Next.js 15 (App Router), TypeScript, Tailwind CSS
- Backend / Base de Datos: Supabase (PostgreSQL)
- Automatizaciones / Integraciones: n8n, WhatsApp Cloud API

## 2. Alcance del Proyecto
Gestión unificada para 4 sucursales (Bermejo 'BER', Tarija 'TAR', Santa Cruz 'SCZ', Roboré 'ROB').
- Panel Web de Administración: Gestión de clientes, registro de cobros diarios, estados de cuenta y filtros por sucursal.
- Mini-App de Consulta: Vista ligera para que el cliente consulte saldo pendiente, mensualidad y datos del servicio.

## 3. Modelo de Datos (Supabase PostgreSQL)

### Tabla: sucursales
- id (TEXT, PK): 'BER', 'TAR', 'SCZ', 'ROB'
- nombre (TEXT): Nombre de la ciudad
- telefono_soporte (TEXT)
- activo (BOOLEAN, default true)

### Tabla: clientes
- id (UUID, PK, default gen_random_uuid())
- codigo_cliente (TEXT, UNIQUE): Ej. 'BER-001', 'SCZ-010'
- sucursal_id (TEXT, FK -> sucursales.id)
- nombres (TEXT)
- apellidos (TEXT)
- celular (TEXT): Formato E.164 (ej. 5917XXXXXXX)
- direccion (TEXT)
- zona_comunidad (TEXT)
- tipo_tecnologia (TEXT): 'FIBRA' o 'ANTENA'
- precio_mensual (NUMERIC(10,2))
- fecha_inicio (DATE)
- estado (TEXT): 'ACTIVO' o 'INACTIVO'
- created_at (TIMESTAMPTZ, default now())

### Tabla: cobros
- id (UUID, PK, default gen_random_uuid())
- codigo_cliente (TEXT, FK -> clientes.codigo_cliente)
- fecha_pago (DATE)
- monto (NUMERIC(10,2))
- periodo_mes (TEXT): Formato 'AAAA-MM' (ej. '2026-10')
- metodo_pago (TEXT): 'EFECTIVO', 'QR', 'TRANSFERENCIA'
- numero_recibo (TEXT)
- observacion (TEXT)
- created_at (TIMESTAMPTZ, default now())
