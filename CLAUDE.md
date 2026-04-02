# \# GARIBA GYM — Guía Maestra para Claude Code

# > Leer este archivo COMPLETO antes de tocar cualquier archivo del proyecto.

# > Actualizar este archivo cuando se agreguen tablas, rutas o features nuevas.

# 

# \---

# 

# \## 🔌 Conexión a Supabase (MCP)

# 

# Claude Code tiene acceso directo a Supabase vía MCP.

# 

# ```

# Project ID : lmgidxucuohvvlprwznd

# URL        : https://lmgidxucuohvvlprwznd.supabase.co

# Proyecto   : Gariba Gym

# ```

# 

# \### Agregar el MCP de Supabase a Claude Code

# Edita el archivo `%APPDATA%\\Claude\\claude\_desktop\_config.json` (Windows) y agrega:

# 

# ```json

# {

# &#x20; "mcpServers": {

# &#x20;   "supabase": {

# &#x20;     "command": "npx",

# &#x20;     "args": \[

# &#x20;       "-y",

# &#x20;       "@supabase/mcp-server-supabase@latest",

# &#x20;       "--supabase-url",

# &#x20;       "https://lmgidxucuohvvlprwznd.supabase.co",

# &#x20;       "--supabase-anon-key",

# &#x20;       "TU\_ANON\_KEY\_AQUI"

# &#x20;     ]

# &#x20;   }

# &#x20; }

# }

# ```

# 

# > La anon key la encuentras en: Supabase Dashboard → Settings → API → Project API keys → anon public

# 

# Con esto Claude Code puede: ver logs, ejecutar SQL, aplicar migraciones y deployar Edge Functions sin salir del proyecto.

# 

# \### Variables de entorno (.env)

# ```

# VITE\_SUPABASE\_URL=https://lmgidxucuohvvlprwznd.supabase.co

# VITE\_SUPABASE\_ANON\_KEY=<tu anon key>

# VITE\_SITE\_URL=http://localhost:5173

# ```

# 

# \---

# 

# \## 🏗️ Stack Tecnológico

# 

# | Capa | Tecnología |

# |------|-----------|

# | Framework | React 19 + Vite 6 |

# | Lenguaje | TypeScript |

# | Estilos | TailwindCSS 4 + Vanilla CSS |

# | Backend | Supabase (PostgreSQL + Auth + Edge Functions) |

# | Íconos | Lucide React |

# | Animaciones | Framer Motion (Motion v12) |

# | Notificaciones | Sonner |

# | Gráficas | Recharts |

# | Fechas | date-fns |

# | QR | html5-qrcode + qrcode.react |

# 

# \---

# 

# \## 🗄️ Base de Datos — Reglas Críticas

# 

# \### SIEMPRE snake\_case en queries de Supabase

# 

# ```

# ✅ sucursal\_id      ❌ sucursalId

# ✅ fecha\_creacion   ❌ fechaCreacion / created\_at

# ✅ organizacion\_id  ❌ organizacionId

# ✅ nombre           ❌ name

# ✅ video\_url        ❌ videoUrl

# ```

# 

# \### Columnas válidas para .order() por tabla

# 

# | Tabla | Válido | INVÁLIDO |

# |-------|--------|----------|

# | `sucursales` | `fecha\_creacion`, `nombre` | `fechaCreacion`, `created\_at` |

# | `inventario` | `fecha\_creacion`, `nombre` | `created\_at` |

# | `plantillas\_rutinas` | `nombre` | `name` |

# | `socios` | `nombre`, `fecha\_inicio`, `estado` | `createdAt` |

# | `ventas` | `fecha`, `total` | `created\_at` |

# | `ejercicios` | `nombre`, `musculo` | `name` |

# | `rutinas\_asignadas` | `fecha\_creacion`, `nombre` | — |

# 

# \### Tablas que NO existen (nunca hacer queries)

# ```

# ❌ notifications  → No existe. Reemplazar con estado local.

# ```

# 

# \### Esquema resumido

# 

# ```

# organizaciones     → id, nombre, fecha\_creacion

# sucursales         → id, organizacion\_id\*, nombre, direccion, telefono, fecha\_creacion

# user\_profiles      → id\*, organizacion\_id\*, sucursal\_id\*, role, nombre\_completo, email, fecha\_registro

# socios             → id, sucursal\_id\*, user\_id\*, nombre, email, telefono, fecha\_inicio, fecha\_vencimiento, estado

# asistencias        → id, sucursal\_id\*, socio\_id\*, fecha

# ventas             → id, sucursal\_id\*, socio\_id\*, total, metodo\_pago, fecha

# venta\_items        → id, venta\_id\*, producto\_id\*, cantidad, precio\_unitario

# inventario         → id, sucursal\_id\*, nombre, precio, tipo, stock, fecha\_creacion

# ejercicios         → id, nombre, musculo, descripcion, video\_url, equipamiento, categoria

# plantillas\_rutinas → id, sucursal\_id\*, nombre, descripcion, icon

# plantilla\_dias     → id, plantilla\_id\*, nombre, orden

# plantilla\_ejercicios → id, dia\_id\*, ejercicio\_id\*, series, repeticiones, descanso, observaciones, orden

# rutinas\_asignadas  → id, sucursal\_id\*, socio\_id\*, nombre, fecha\_creacion

# rutina\_dias        → id, rutina\_id\*, nombre, orden

# rutina\_ejercicios  → id, dia\_id\*, ejercicio\_id\*, series, repeticiones, descanso, observaciones, orden

# cierres\_gym        → id, sucursal\_id\*, fecha, motivo

# solicitudes\_rutina → id, sucursal\_id\*, socio\_id\*, fecha\_solicitud, estado, mensaje

# 

# \* = Foreign Key

# ```

# 

# \---

# 

# \## 🔐 Roles y Seguridad

# 

# ```

# owner        → acceso completo a su organizacion\_id (todas las sucursales)

# receptionist → solo lee/escribe en su sucursal\_id

# trainer      → solo lee/escribe en su sucursal\_id

# ```

# 

# \### Obtener perfil del usuario autenticado

# ```ts

# const { data: profile } = await supabase

# &#x20; .from('user\_profiles')

# &#x20; .select('role, sucursal\_id, organizacion\_id, nombre\_completo')

# &#x20; .eq('id', session.user.id)

# &#x20; .single()

# ```

# 

# \---

# 

# \## 📁 Archivos Clave

# 

# ```

# src/

# ├── lib/supabaseClient.ts          ← cliente Supabase

# ├── hooks/

# │   ├── useAuth.ts                 ← user, profile, loading, signOut

# │   └── useFirstLoginGuard.ts     ← redirige si must\_change\_password=true

# ├── components/

# │   └── ProtectedRoute.tsx         ← protege rutas por sesión y rol

# └── pages/

# &#x20;   ├── CambiarContrasena.tsx      ← cambio obligatorio primer login

# &#x20;   └── Staff/StaffPanel.tsx       ← gestión de colaboradores (owner only)

# ```

# 

# \---

# 

# \## ⚡ Edge Functions

# 

# | Función | Qué hace |

# |---------|----------|

# | `create-staff-user` | Crea colaboradores desde el panel del owner con contraseña temporal `Gym1234` |

# 

# \---

# 

# \## 🤖 Modo Autónomo — Instrucciones

# 

# Cuando Claude Code trabaje solo en este proyecto, debe seguir este flujo:

# 

# \### Paso 1 — Diagnóstico inicial

# ```bash

# \# Ver errores activos en el código

# grep -rn "TODO\\|FIXME\\|console\\.error" src/

# 

# \# Detectar camelCase incorrecto en queries

# grep -rn "\\.order\\|\\.eq\\|\\.filter" src/ | grep -E "\[a-z]\[A-Z]"

# 

# \# Detectar queries a tablas inexistentes

# grep -rn "notifications\\|password\_plain" src/

# ```

# 

# \### Paso 2 — Revisar logs de Supabase (via MCP)

# Pedir al MCP de Supabase los logs del servicio `api` para ver errores 400/404 activos.

# 

# \### Paso 3 — Priorizar y arreglar

# Orden de prioridad:

# 1\. Errores que rompen la app (pantalla blanca, crash)

# 2\. Errores 400/404 en queries a Supabase

# 3\. Funcionalidades incompletas del backlog

# 4\. Mejoras de UX y manejo de errores

# 

# \### Paso 4 — Verificar cada fix

# Después de cada corrección:

# \- Confirmar que TypeScript no tiene errores: `npx tsc --noEmit`

# \- Verificar en logs de Supabase que no hay nuevos 400/404

# \- Asegurarse de que el fix no rompió otra cosa

# 

# \### Paso 5 — Checklist final antes de terminar

# \- \[ ] Cero errores 400/404 en logs de Supabase

# \- \[ ] Cero errores en consola del browser

# \- \[ ] Todos los queries usan snake\_case

# \- \[ ] Rutas privadas protegidas con ProtectedRoute

# \- \[ ] Owner puede crear staff desde el panel

# \- \[ ] Primer login fuerza cambio de contraseña

# \- \[ ] Sin datos hardcodeados (UUIDs, emails, passwords)

# \- \[ ] `npx tsc --noEmit` sin errores

# 

# \---

# 

# \## 🚧 Backlog — Tareas Pendientes

# 

# \### Alta prioridad

# \- \[ ] Crear tabla `notifications` en Supabase o reemplazar con estado local

# \- \[ ] Verificar ProtectedRoute en TODAS las rutas del dashboard

# \- \[ ] Probar flujo completo: registro → onboarding → login → dashboard

# 

# \### Media prioridad

# \- \[ ] Integrar `StaffPanel.tsx` en el router bajo `/dashboard/staff`

# \- \[ ] Integrar `CambiarContrasena.tsx` en el router bajo `/cambiar-contrasena`

# \- \[ ] Activar `useFirstLoginGuard` en el DashboardLayout

# \- \[ ] Integrar `useAuth` hook en todos los módulos que aún usan auth directo

# 

# \### Baja prioridad

# \- \[ ] Deduplicar queries repetidas (React Query o SWR)

# \- \[ ] Loading skeletons en todas las secciones

# \- \[ ] ErrorBoundary global

# 

# \---

# 

# \## ✅ Bugs Resueltos (no revertir)

# 

# | Bug | Archivo | Fix |

# |-----|---------|-----|

# | `order('fechaCreacion')` | ConfiguracionModule.tsx | → `fecha\_creacion` |

# | `order('created\_at')` | InventarioModule.tsx | → `fecha\_creacion` |

# | `order('name')` | CatalogoRutinasModule.tsx | → `nombre` |

# | `.from('notifications')` | RetentionView.tsx | comentado |

# | `videoUrl` en insert | CatalogoRutinasModule.tsx | → `video\_url` |

# | `password\_plain` | BD + tipos | eliminado |

# | Firebase código muerto | SocioApp.tsx | migrado a Supabase |

# | Demo login | SocioApp.tsx | eliminado |

# | UUID placeholder `00000000` | registro socios | → sucursal\_id real |

# | RLS conflictivas | Supabase BD | limpiadas |

# | Tablas sin RLS | Supabase BD | RLS aplicado |

