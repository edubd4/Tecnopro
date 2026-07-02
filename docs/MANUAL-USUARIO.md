# TECNOPRO — Manual de uso

Guía para el día a día del sistema. Escrita para Guillermo y su equipo. Sin jerga técnica.

**URL de producción**: [tecnopro-flax.vercel.app](https://tecnopro-flax.vercel.app)

---

## Índice

1. [Antes de empezar](#1-antes-de-empezar)
2. [Roles: admin y técnico](#2-roles-admin-y-técnico)
3. [Flujos típicos del día](#3-flujos-típicos-del-día)
4. [Los 14 módulos, de un vistazo](#4-los-14-módulos-de-un-vistazo)
5. [Cerrar el día](#5-cerrar-el-día)
6. [Cosas para saber](#6-cosas-para-saber)
7. [Preguntas frecuentes](#7-preguntas-frecuentes)

---

## 1. Antes de empezar

### Login

1. Andá a **[tecnopro-flax.vercel.app](https://tecnopro-flax.vercel.app)**.
2. Ingresá tu email y contraseña.
3. Vas a caer en el **Panel** principal.

Si es la primera vez o te olvidaste la contraseña: **avisale a Eduardo** hasta que esté implementado el "olvidé mi contraseña".

### Cerrar sesión

Arriba a la derecha: **Cerrar sesión**.

---

## 2. Roles: admin y técnico

El sistema tiene dos roles. Cambian qué se ve y qué se puede hacer.

### Admin (vos, Guillermo)

Ves **todos los módulos**. Podés:

- Ver y editar toda la información del negocio.
- Manejar la plata (Caja, Gastos, Tesorería, Contabilidad).
- Ver estadísticas y alertas.
- Crear y desactivar usuarios técnicos.
- Editar la configuración del negocio.

### Técnico

Ve solo lo operativo. Puede:

- Ver **sus** órdenes asignadas (no las de los otros).
- Ver **sus** turnos del día.
- Actualizar el estado de sus órdenes.
- Imputar servicios y repuestos a sus órdenes.
- Ver los clientes.

**No ve**: Caja, Gastos, Tesorería, Contabilidad, Analytics, Alertas, Usuarios ni Configuración.

---

## 3. Flujos típicos del día

### Flujo 1 · Cliente nuevo trae un equipo

**Objetivo**: crear el cliente, abrir la orden, cobrar al final.

1. **Cargar el cliente** (si no existe):
   - Menú → **Clientes** → **Nuevo cliente**.
   - Elegí `PARTICULAR` o `EMPRESA`.
   - Nombre / apellido (o razón social si es empresa) + teléfono + email.
   - Guardá. Se le asigna un ID tipo `CLI-0042`.

2. **Abrir la orden de trabajo**:
   - Menú → **Órdenes** → **Nueva orden**.
   - Elegí el cliente del dropdown.
   - Cargá:
     - **Equipo** (marca / modelo / serie).
     - **Falla declarada** (lo que dice el cliente).
     - **Prioridad** (NORMAL, ALTA, URGENTE, BAJA).
     - **Fecha de entrega estimada** (opcional).
   - Guardá. La orden nace con estado `RECIBIDA` y un ID tipo `OT-0057`.

3. **Asignar técnico** (si sos admin):
   - Desde la ficha de la orden → **Asignar técnico**.
   - Elegí el técnico → guardá.

4. **Diagnóstico**:
   - El técnico cambia el estado a `DIAGNOSTICO` (dropdown en la lista de órdenes o desde la ficha).
   - Escribe el diagnóstico en la ficha.

5. **Presupuesto** (opcional pero recomendado):
   - Desde **Presupuestos** → **Nuevo presupuesto**.
   - Elegí el cliente y **vinculalo a la orden** (dropdown "Orden vinculada").
   - Agregá servicios y repuestos con precio.
   - El sistema sugiere precio de repuestos con **margen** configurable (por defecto 30%).
   - Cambiá el estado a `ENVIADO`.
   - **Generar mensaje** → copia un texto listo para pegar en WhatsApp o mail al cliente.

6. **Aprobación del cliente**:
   - Cuando el cliente responde, cambiás el estado del presupuesto a `APROBADO` o `RECHAZADO`.
   - Si es aprobado, actualizá la orden a `EN_REPARACION`.

7. **Imputar el trabajo** en la orden:
   - Desde la ficha de la orden → sección **Items imputados**.
   - Agregá servicios y repuestos del catálogo.
   - **Los repuestos descuentan stock automáticamente** al agregarlos. Si no hay stock, el sistema te avisa y no permite imputar.

8. **Listo para entregar**:
   - El técnico cambia el estado a `LISTA`.
   - Le avisás al cliente que puede pasar a buscarlo.

9. **Cobro y entrega**:
   - Cuando llega el cliente, desde la ficha de la orden → sección **Cobros**.
   - Registrá el cobro (efectivo, transferencia, tarjeta, etc.).
   - El sistema crea automáticamente el ingreso en Caja.
   - Cambiá el estado a `ENTREGADA`.

**Todo el flujo está trazado**. Cada cambio queda en el historial.

---

### Flujo 2 · Ya conocés al cliente — solo abrir orden y cobrar

1. **Órdenes** → **Nueva** → cliente existente → resto igual al Flujo 1 desde el paso 2.

---

### Flujo 3 · Registrar un gasto

Ejemplos: pagaste al proveedor de cables, pagaste la luz, cargaste combustible.

1. Menú → **Gastos** → **Nuevo gasto**.
2. Elegí **categoría** (Proveedores, Servicios, Impuestos, Sueldos, Alquiler, Insumos, Mantenimiento, Otros).
3. Cargá:
   - Monto.
   - Método de pago.
   - Descripción (ej. "Cables UTP proveedor XYZ").
   - Fecha (default hoy).
   - Notas internas (opcional).
4. Guardá.

**El sistema automáticamente registra un egreso en Caja** con el mismo monto. No hay que hacer nada más.

---

### Flujo 4 · Movimiento manual de caja

Cuándo lo usás:
- **Apertura** de caja al empezar el día ("cargué $5000 de fondo").
- **Cierre** de caja al fin del día (opcional).
- **Ajuste** (encontré $200 más o menos en el conteo).
- **Ingreso ad-hoc** que no viene de una orden.
- **Egreso** chico que no amerita categorizar como gasto.

1. Menú → **Caja** → **Nuevo movimiento**.
2. Tipo: `INGRESO` o `EGRESO`.
3. Origen: `APERTURA`, `CIERRE`, `AJUSTE`, `OTRO`, o `GASTO` (para egresos genéricos).
4. Monto + método + descripción.
5. Guardá.

**Regla dura**: los movimientos de caja son **inmutables**. Si te equivocaste, no los borrás — hacés un nuevo movimiento de tipo `AJUSTE` que compense.

---

### Flujo 5 · Sacar turno con un cliente

1. Menú → **Turnos** → **Nuevo turno**.
2. Elegí cliente y (opcional) orden vinculada.
3. Título ("Reparación notebook Lenovo").
4. Fecha y hora de inicio + fin.
5. Asigná técnico.
6. Guardá.

El sistema **detecta superposiciones**: si le pusiste dos turnos al mismo técnico al mismo tiempo, te avisa antes de guardar.

Vista **Semana** (`/turnos`) muestra la grilla horaria. **Anterior / Siguiente / Hoy** para navegar. Vista **Lista** para ver próximos 60 días en tabla.

---

### Flujo 6 · Cliente pregunta por WhatsApp "¿cómo va mi equipo?"

1. Menú → **Órdenes**.
2. Buscá por número (`OT-0057`) o parte del nombre del cliente.
3. Click en la fila → ficha completa.

O directamente desde el buscador (arriba de la lista).

---

## 4. Los 14 módulos, de un vistazo

### Operación

| Módulo | Para qué |
|---|---|
| **Panel** | Landing. KPIs del día, alertas, últimas órdenes y movimientos. |
| **Órdenes** | El corazón operativo. Todas las reparaciones que pasan por el taller. |
| **Turnos** | Agenda semanal con detección de superposiciones. |
| **Clientes** | Fichero de particulares y empresas. |

### Comercial

| Módulo | Para qué |
|---|---|
| **Presupuestos** | Cotizaciones con margen automático y mensaje generado para el cliente. |
| **Catálogo** | Servicios que ofrece el taller con precio base y categoría. |
| **Stock** | Inventario de repuestos con alerta de stock bajo. |

### Plata (solo admin)

| Módulo | Para qué |
|---|---|
| **Caja** | Ingresos y egresos con saldo en vivo. |
| **Gastos** | Egresos categorizados. Cada uno crea un movimiento en Caja. |
| **Tesorería** | Órdenes con saldo pendiente + resumen mensual. |
| **Contabilidad** | Libro de movimientos con filtros y **exportación CSV**. |

### Análisis (solo admin)

| Módulo | Para qué |
|---|---|
| **Analytics** | Gráficos: órdenes por estado, órdenes por técnico, flujo del semestre, top categorías de gasto. |
| **Alertas** | Entregas vencidas, saldos con demora, stock bajo, presupuestos por vencer. |

### Sistema (solo admin)

| Módulo | Para qué |
|---|---|
| **Usuarios** | Alta/baja de cuentas de técnicos y admins. |
| **Configuración** | Nombre del negocio, teléfono, dirección, margen default, validez de presupuestos, ventana de alertas. |

---

## 5. Cerrar el día

Rutina sugerida al fin de la jornada:

1. **Alertas** — ¿hay entregas vencidas o presupuestos por vencer? Contactá al cliente antes de irte.
2. **Panel** — mirá los KPIs. Saldo caja, órdenes activas, cobros pendientes.
3. **Caja** — registrá un movimiento `CIERRE` con el saldo real que contaste en la caja física (si diferís del saldo del sistema, hacé un `AJUSTE`).
4. Todos los cobros del día ya deberían estar registrados desde las órdenes.

---

## 6. Cosas para saber

### Cambios que no se pueden deshacer

Estas cosas son **inmutables** (no se pueden editar ni borrar). Si te equivocás, la corrección va como movimiento nuevo:

- **Movimientos de caja** (ingresos y egresos).
- **Gastos** — para corregir, registrá un `AJUSTE` en caja.
- **Historial de stock** — cada entrada/salida queda. Para corregir, registrá el movimiento opuesto.
- **Historial de eventos** — la auditoría es append-only.

**Por qué**: para tener trazabilidad contable real y evitar que la información cambie sin dejar rastro.

### Deletes reales vs deletes suaves

- **Clientes**: **soft delete** (se marcan como inactivos). Se puede reactivar.
- **Servicios / Repuestos**: soft delete (campo `activo`).
- **Órdenes**: no se borran, se cancelan (estado `CANCELADA`).
- **Presupuestos**: no se borran, se rechazan (estado `RECHAZADO`).
- **Turnos**: se cancelan (estado `CANCELADO`).
- **Usuarios**: hard delete (para las cuentas de baja definitiva).

### IDs legibles

Cada entidad tiene un ID amigable que se usa en WhatsApp y en el trato con el cliente:

| Prefijo | Qué es |
|---|---|
| `CLI-XXXX` | Cliente |
| `OT-XXXX` | Orden de trabajo |
| `PRES-XXXX` | Presupuesto |
| `SRV-XXXX` | Servicio del catálogo |
| `REP-XXXX` | Repuesto de stock |
| `TRN-XXXX` | Turno |
| `MOV-XXXX` | Movimiento de caja |
| `GST-XXXX` | Gasto |

### Auto-guardado y refresh

Cambios que hacés desde la lista (cambiar estado de una orden, marcar un presupuesto como aprobado) **se guardan inmediatamente**. Si abrís el sistema en otra pestaña, refrescá para ver la información al día.

### Alertas configurables

Los umbrales de alertas son:

- **Entregas vencidas**: cualquier orden con `fecha_entrega_estimada` en el pasado y estado no `ENTREGADA/CANCELADA`.
- **Saldos con demora**: órdenes con saldo pendiente y recibidas hace **más de 30 días**.
- **Stock bajo**: repuestos con `stock_actual` menor o igual al `stock_minimo` (definido por vos al cargar el repuesto).
- **Presupuestos por vencer**: los enviados con validez en los **próximos 7 días**.

Los umbrales de 30 y 7 días están fijos en el código por ahora. Si querés cambiarlos, avisá a Eduardo.

---

## 7. Preguntas frecuentes

**¿Cómo cambio la contraseña de un técnico?**
Menú → **Usuarios** → click en el técnico → cambiar contraseña.

**¿Cómo desactivo un técnico que se fue?**
Menú → **Usuarios** → click → marcar como inactivo. No pierde el historial pero no puede loguearse. **No podés desactivarte a vos mismo.**

**¿Un técnico ve los datos de otro técnico?**
No. Cada técnico solo ve sus órdenes asignadas y sus turnos. Los admins ven todo.

**¿Cómo agrego una categoría de gasto nueva?**
Por ahora, avisá a Eduardo para que la agregue en la base de datos. Está pendiente un CRUD de categorías desde la UI.

**¿Cómo exporto la contabilidad para el contador?**
Menú → **Contabilidad** → elegí el período (mes, año o rango custom) → **Exportar CSV**. El archivo se abre en Excel con las tildes y signos correctos.

**¿Se pueden adjuntar fotos o comprobantes a los gastos?**
Todavía no. Está previsto para Fase 3 (integración con almacenamiento de archivos).

**¿La IA que se menciona en el sistema ya está?**
Todavía no. Fase 3 va a agregar generación de mensajes con **Claude Haiku** (mensajes de presupuesto y avisos a clientes). Por ahora los mensajes se arman con templates.

**¿Cómo veo lo que hizo cada técnico?**
- **Analytics** → tarjeta "Órdenes por técnico" te muestra la carga acumulada.
- El historial detallado por técnico está pendiente (backlog).

**¿Los datos se pierden si Vercel se cae?**
No. Los datos viven en **Supabase** (Postgres), separado de Vercel. Vercel solo sirve la aplicación web. Si Vercel cae, los datos siguen intactos y solo hay que restaurar el frontend.

**¿Y si Supabase se cae?**
Supabase corre en AWS São Paulo y tiene backups diarios automáticos. Si pasa algo grave, Eduardo puede restaurar desde backup.

**¿Puedo usarlo desde el celular?**
Sí. La UI es responsive. Con la operación diaria (ver órdenes, cambiar estado, registrar cobros) funciona bien desde el celu. Cargas grandes (cargar 10 repuestos nuevos) son más cómodas desde compu.

**¿Dónde reporto un bug o pido una mejora?**
Avisale a Eduardo. Guardá siempre:
- Qué estabas haciendo.
- Qué esperabas que pasara.
- Qué pasó en su lugar.
- Captura de pantalla si hay algo raro visualmente.

---

## Contacto

- **Soporte técnico**: Eduardo Barreiro — eduardo.barreiro93@gmail.com
- **Repositorio del código**: [github.com/edubd4/Tecnopro](https://github.com/edubd4/Tecnopro)

---

**Fin del manual.** Última actualización: cierre del MVP (Fase 2 completa · Olas A + B + C + D).
