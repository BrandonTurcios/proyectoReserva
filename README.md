# proyectoReserva — Sistema de Reservas de Laboratorio

Sistema web para la gestión de reservas de laboratorios en la Facultad de Ingeniería y Arquitectura. Permite a estudiantes, docentes, administrativos y prospectos solicitar reservas de laboratorios con horarios y fechas específicas. Incluye panel administrativo para aprobar, rechazar y crear reservas grupales para clases.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 6 (SWC) |
| Estilos | Tailwind CSS 3, Ant Design 6 |
| Backend | Supabase (PostgreSQL + API REST) |
| Enrutamiento | React Router v7 (lazy-loaded + Suspense) |
| Calendarios | react-calendar, react-big-calendar + date-fns |
| Animaciones | framer-motion |
| íconos | react-icons (Feather Icons) |
| Exportación | xlsx (Excel) |
| Gráficas | recharts |

---

## Requisitos previos

- **Node.js** >= 18
- **npm** >= 9

### Solo para desarrollo local
- **Docker Desktop** (para la base de datos local con Supabase CLI)
- **Supabase CLI** >= 2.x (`npm install -g supabase`)

---

## Configuración inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd proyectoReserva
npm install
```

### 2. Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Supabase (producción)
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...

# Service role (operaciones administrativas)
VITE_SERVICE_ROLE=eyJhbGciOiJI...

# Correos de administradores (acceso a /admin)
VITE_ADMIN_1=admin1@unitec.edu.hn
VITE_ADMIN_2=admin2@unitec.edu.hn
VITE_ADMIN_3=admin1@unitec.edu.hn
VITE_ADMIN_4=admin2@unitec.edu.hn
VITE_ADMIN_PASSWORD=contraseña_admin

# Correos institucionales para notificaciones
VITE_CORREO_AC=coordinacion@unitec.edu.hn
VITE_CORREO_AC2=administracion@unitec.edu.hn

# PowerAutomate (envío de correos)
VITE_POWERAPPS_URL=https://.../powerautomate/.../invoke?api-version=1...
VITE_POWERAPPS_INCIDENTE=https://.../powerautomate/.../invoke?api-version=1...
```

---

## Ejecución

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción |
| `npm run preview` | Vista previa del build |
| `npm run lint` | Ejecutar ESLint |

---

## Entorno de desarrollo local (Supabase CLI)

Para probar cambios sin afectar la base de datos de producción:

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Iniciar los servicios locales (PostgreSQL, API, Studio)
supabase start
```

Esto levanta:
- **API REST**: `http://127.0.0.1:54321`
- **Studio** (interfaz web de Supabase): `http://127.0.0.1:54323`
- **Base de datos**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### Archivo `.env.development`

Vite carga automáticamente `.env.development` al ejecutar `npm run dev`. Este archivo apunta al entorno local:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_SERVICE_ROLE=sb_secret_...
# Las demás variables se heredan de .env (o se pueden sobrescribir)
```

Las credenciales locales se muestran al ejecutar `supabase start`.

### Comandos útiles

```bash
supabase start      # Encender servicios locales
supabase stop       # Apagar servicios locales
supabase db reset   # Reiniciar base de datos (re-ejecuta migraciones)
supabase status     # Ver estado de los servicios
```

Las migraciones del esquema están en `supabase/migrations/`. Al hacer `supabase start` o `supabase db reset` se aplican automáticamente.

---

## Estructura del proyecto

```
proyectoReserva/
├── src/
│   ├── main.jsx                          # Punto de entrada
│   ├── App.jsx                           # Router y lazy loading
│   ├── index.css                         # Estilos globales + Tailwind
│   ├── shared/
│   │   ├── auth/
│   │   │   ├── Inicio.jsx                # Pantalla de login
│   │   │   └── ProtectedRoute.jsx        # Guard para ruta /admin
│   │   ├── components/
│   │   │   └── Layout.jsx                # Shell con navbar y footer
│   │   └── services/
│   │       └── supabaseClient.js         # Cliente Supabase
│   ├── usuarios/
│   │   └── pages/
│   │       ├── Home.jsx                  # Página de inicio
│   │       ├── CrearReserva.jsx          # Formulario de reserva individual
│   │       ├── MisReservas.jsx           # Lista de reservas del usuario
│   │       ├── Calendario.jsx            # Calendario semanal de reservas
│   │       └── Incidente.jsx             # Reporte de incidentes
│   ├── admin/
│   │   ├── pages/
│   │   │   └── DashboardReservas.jsx     # Panel administrativo
│   │   └── components/
│   │       ├── GraficaReservas.jsx       # Gráfica de reservas aprobadas
│   │       ├── PorcentajeUso.jsx         # Porcentajes de uso
│   │       └── IncidentesTabla.jsx       # Tabla de incidentes
│   └── assets/                           # Imágenes (webp, png)
├── supabase/
│   ├── config.toml                       # Configuración de Supabase local
│   └── migrations/
│       └── *_initial.sql                 # Esquema y datos semilla
├── .env                                  # Variables de producción
├── .env.development                      # Variables de desarrollo local
├── AGENTS.md                             # Guía para agentes de código
├── package.json
└── vite.config.js
```

---

## Rutas de la aplicación

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/inicio` | `Inicio` | Público (login) |
| `/` | `Home` | Usuarios autenticados |
| `/crear-reserva` | `CrearReserva` | Usuarios autenticados |
| `/mis-reservas` | `MisReservas` | Usuarios autenticados |
| `/calendario` | `Calendario` | Usuarios autenticados |
| `/incidente` | `Incidente` | Usuarios autenticados |
| `/uso` | `PorcentajeUso` | Usuarios autenticados |
| `/admin` | `DashboardReservas` | Solo administradores |

---

## Flujo de autenticación

1. El usuario ingresa su correo institucional (`@unitec.edu` o `@unitec.edu.hn`) en `/inicio`.
2. Si el correo coincide con `VITE_ADMIN_1` o `VITE_ADMIN_2`, se solicita contraseña adicional y se redirige a `/admin`.
3. Para usuarios regulares, el correo se guarda en `localStorage` y se redirige al layout principal.
4. No se usa Supabase Auth; la autenticación se basa en el correo almacenado en el navegador.

---

## Roles y permisos

| Tipo de usuario | Crear reserva | Ver calendario | Cancelar reserva | Acceso /admin |
|-----------------|:---:|:---:|:---:|:---:|
| Estudiante | 2 horarios máx. | Sí | Sí | No |
| Docente | Ilimitados | Sí | Sí | No |
| Administrativo | Ilimitados | Sí | Sí | No |
| Prospección | Ilimitados | Sí | Sí | No |
| Educación Continua | Ilimitados | Sí | Sí | No |
| Admin (email en .env) | Crear reservas grupales | Sí | Sí | Sí |

---

## Funcionalidades principales

### Usuarios

- **Crear reserva individual**: selección de laboratorio, perfil, datos personales, motivo, fechas, horarios y aceptación de reglamento.
- **Reservas recurrentes** (docentes/administrativos): repetir días de la semana en un rango de fechas.
- **Mis reservas**: listado paginado con filtros por estado, búsqueda y cancelación.
- **Calendario**: vista semanal/mensual/diaria de reservas aprobadas con detalles.
- **Reportar incidente**: formulario con foto y descripción del problema.

### Administrador (`/admin`)

- **Dashboard de gestión**: tabla con todas las reservas agrupadas por `grupo_id`, con filtros por estado, tipo de usuario y laboratorio.
- **Aprobar / Rechazar**: acciones rápidas desde la tabla con notificaciones toast. El rechazo requiere descripción.
- **Reservas grupales por bloques**: formulario para crear reservas de clases completas:
  - Selección de laboratorio, responsable y motivo.
  - Múltiples bloques de horario con selección de fechas por calendario.
  - Multi-select de horarios (permite clases que abarcan varios períodos, ej. 8:10 a 11:15).
  - Detección de conflictos con reservas aprobadas.
  - Popup animado de confirmación al crear.
- **Calendario**: vista de fechas seleccionadas al expandir una fila.
- **Vista previa de fechas seleccionadas**: etiquetas removibles junto al calendario en cada bloque.
- **Gráfica de reservas aprobadas**, **Porcentajes de uso** y **Tabla de incidentes** (colapsables).
- **Exportación a Excel** de todas las reservas.

### Correos automáticos

- Al aprobar una reserva se envía correo al solicitante y a los correos institucionales (`VITE_CORREO_AC`, `VITE_CORREO_AC2`) vía PowerAutomate.
- Al rechazar se envía correo al solicitante con la razón del rechazo.

---

## Esquema de base de datos (Supabase)

```
public.fechas_Q
  id (text PK), inicio (date), final (date)

public.horarios
  id (serial PK), horario (text UNIQUE)
  Ej: "9:55 AM - 11:15 AM"

public.laboratorios
  id (serial PK), nombre (text UNIQUE)

public.usuarios
  id (serial PK), nombre, numero_cuenta, correo, tipo_usuario
  CHECK: tipo_usuario IN ('Estudiante','Docente','Administrativo','Prospección','Educación Continua')

public.reservaciones
  id (serial PK), motivo_uso, cantidad_usuarios (>0), fecha (date),
  dias_repeticion, laboratorio_id (FK), grupo_id (UUID),
  estado DEFAULT 'EN_ESPERA', descripcion

public.reservaciones_horarios
  id (serial PK), reservacion_id (FK), horario_id (FK)

public.reservaciones_usuarios
  id (serial PK), reservacion_id (FK), usuario_id (FK)

public.incidentes
  id (bigint PK identity), laboratorio_id, laboratorio_nombre,
  descripcion, usuario_email, reporte_link, fecha_hora
```

### Relaciones

- `reservaciones.laboratorio_id` → `laboratorios.id`
- `reservaciones_horarios.reservacion_id` → `reservaciones.id`
- `reservaciones_horarios.horario_id` → `horarios.id`
- `reservaciones_usuarios.reservacion_id` → `reservaciones.id`
- `reservaciones_usuarios.usuario_id` → `usuarios.id`

### Agrupación de reservas

- Las reservas con el mismo `grupo_id` (UUID) se consideran parte del mismo grupo (reserva recurrente o grupal).
- Cada fila en `reservaciones` representa una fecha individual del grupo.
- `reservaciones_horarios` asocia los horarios específicos a cada fecha.
- El calendario (`Calendario.jsx`) conserva la asociación `fecha → horarios` para mostrar correctamente reservas con distintos horarios por día.

---

## Seguridad

> **Deuda técnica pendiente**: El proyecto ya está en producción, pero tiene problemas de seguridad críticos heredados que deben resolverse a futuro:
> - 7 de 8 tablas tienen Row Level Security (RLS) deshabilitado. Solo `reservaciones` tiene RLS activo (con políticas públicas de inserción y lectura).
> - `VITE_SERVICE_ROLE` se expone en el frontend para operaciones administrativas como aprobar/rechazar reservas.
>
> Estos problemas no bloquean el funcionamiento actual, pero son prioritarios para el plan de endurecimiento de seguridad.

---

## Notas adicionales

- Paleta de colores: `#06065c` (fondo azul oscuro), `#0f49b6` (acentos y botones principales).
- Polyfills de Node (`buffer`, `@esbuild-plugins/node-globals-polyfill`) incluidos para compatibilidad de Supabase.
- Express, cors, nodemailer y jsonwebtoken están en `dependencies` pero no se usan actualmente (planeados para futuro backend).
- `tailwind-scrollbar-hide` está registrado en la configuración de Tailwind.
- Los comentarios en el código deben escribirse en español.
