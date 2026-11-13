# Guía de Puesta en Producción — TecnoEdu ISP (Supabase Pro $25/mes)

Este documento contiene los pasos exactos para activar el nuevo proyecto en **Supabase Pro** este viernes y conectar el sistema en producción.

---

## 1. Crear el Segundo Proyecto en Supabase Pro
1. Inicia sesión en [supabase.com](https://supabase.com).
2. Haz clic en **New Project**.
3. Configuración recomendada:
   * **Name**: `tecnoedu-isp-produccion`
   * **Database Password**: Genera una contraseña segura y guárdala.
   * **Region**: `South America (São Paulo)` (menor latencia para Bolivia).
   * **Pricing Plan**: Selecciona la organización con el plan Pro ($25/mes).

---

## 2. Ejecutar el Script de Estructura SQL
Una vez que el proyecto esté listo (tarda unos 2 minutos en aprovisionarse):
1. Entra a **SQL Editor** en el panel izquierdo de Supabase.
2. Abre o copia el contenido del archivo [`supabase-schema-produccion.sql`](file:///h:/sistema-de-gestion-tecnoedu-26/supabase-schema-produccion.sql).
3. Pégalo en el editor y haz clic en **Run**.
4. Este script creará:
   * Tabla `sucursales` precargada con las 4 sedes: `BER`, `TAR`, `SCZ`, `ROB`.
   * Tabla `clientes` limpia (sin datos de prueba) con índices para WhatsApp y MiniApp.
   * Tabla `cobros` limpia para empezar caja desde cero.
   * Políticas de seguridad Row Level Security (RLS).

---

## 3. Conectar el Sistema al Nuevo Proyecto
En Supabase Studio ve a:
**Project Settings** (ícono de engranaje) -> **API**.

Copia:
* **Project URL**: `https://<tu-nuevo-id>.supabase.co`
* **anon public key**: `eyJhbGciOi...`

Actualiza el archivo `.env.local` en este proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-nuevo-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 4. Pruebas y Despliegue del Sistema Web
El proyecto ya fue probado y compila al 100% con `npm run build`:
* Puedes desplegarlo en:
  * **Vercel** (Recomendado para Next.js, conectando tu repositorio de GitHub).
  * **Tu propio VPS** (usando PM2 o Docker).
* Configura en tu hosting las mismas variables de entorno (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

---

## 5. Integración con n8n y WhatsApp Business API
Cuando configures tus flujos en n8n:
* **Identificación del Cliente**: El webhook de WhatsApp recibe el número de teléfono del cliente.
* **Consulta en Supabase**:
  ```sql
  SELECT * FROM clientes WHERE celular = '{{ $json.body.from }}';
  ```
* **Consulta de Deuda y Pagos**:
  ```sql
  SELECT * FROM cobros WHERE codigo_cliente = '{{ $node.clientes.json.codigo_cliente }}' ORDER BY periodo_mes DESC;
  ```
* Con esto el nodo de IA en n8n responderá de forma inmediata si está al día, qué mes debe y le enviará el QR de pago.

