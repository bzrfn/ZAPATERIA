# Gestor de Inventarios — Zapatería (LocalStorage) ✅

Sistema web (React + Vite + TypeScript) pensado para inventario de fabricación y registro de pedidos (WhatsApp), con persistencia en LocalStorage.

## Roles
- **ADMIN**: opera inventarios, pedidos, personal, catálogos, exportación/importación.
- **SUPERADMIN**: todo lo anterior + módulo **Usuarios** (alta/edición/baja).

Usuarios demo:
- `superadmin` / `superadmin123`
- `admin` / `admin123`

> Nota: Es un sistema **local** (LocalStorage). Para producción real conviene autenticar con backend.

## Módulos
- **Insumos de fabricación** (CRUD + agregar/restar stock)
- **Pedidos** (texto plano -> tabla; asignar insumos a pedidos y descontar stock)
- **Personal** (chequeo entrada/salida con fecha y hora)
- **Catálogos** (modelos ≈ 40 pre-cargados; vista general)
- **Exportar / Importar** (PDF y Excel; importar desde Excel con misma estructura)

## Ejecutar local
```bash
npm install
npm run dev
```

## Build / Preview
```bash
npm run build
npm run preview
```

## Despliegue en Vercel
- Proyecto listo para Vercel (SPA). Incluye `vercel.json` con rewrites.
- En Vercel:
  - Framework: **Vite**
  - Build command: `npm run build`
  - Output directory: `dist`

## Estructura de Excel (import/export)
Hojas:
- `Insumos`
- `Modelos`
- `Pedidos`
- `Personal`

El import reemplaza estos módulos, pero **conserva usuarios y sesión**.


## Mejoras UX (v2)
- Catálogo de modelos con **imagen** (se guarda en LocalStorage)
- Pedidos: **importar Excel desde el módulo Pedidos** (crea pedidos automáticamente)
- Insumos: ajuste de stock con modal y botones rápidos (+1, +5, +10…)
