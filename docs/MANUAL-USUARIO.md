# TECNOPRO — Manual de uso

Guía para el día a día del sistema. Escrita para Guillermo y su equipo. Sin jerga técnica.

**URL de producción**: [tecnopro-flax.vercel.app](https://tecnopro-flax.vercel.app)

---

## Índice

1. [Antes de empezar](#1-antes-de-empezar)
2. [Roles: admin y técnico](#2-roles-admin-y-técnico)
3. [Flujos típicos del día](#3-flujos-típicos-del-día)
4. [Los 12 módulos, de un vistazo](#4-los-12-módulos-de-un-vistazo)
5. [El asistente de IA](#5-el-asistente-de-ia)
6. [Trucos rápidos](#6-trucos-rápidos)
7. [Cerrar el día](#7-cerrar-el-día)
8. [Cosas para saber](#8-cosas-para-saber)
9. [Preguntas frecuentes](#9-preguntas-frecuentes)

---

## 1. Antes de empezar

### Login

1. Andá a **[tecnopro-flax.vercel.app](https://tecnopro-flax.vercel.app)**.
2. Ingresá tu email y contraseña.
3. Vas a caer en el **Panel** principal.

### ¿Te olvidaste la contraseña?

En la pantalla de login, click en **"¿Olvidaste tu contraseña?"**. Ingresás tu email, te llega un mensaje con un link, click en el link y elegís una contraseña nueva.

### Cerrar sesión

Arriba a la derecha: **Cerrar sesión**.

---

## 2. Roles: admin y técnico

El sistema tiene dos roles. Cambian qué se ve y qué se puede hacer.

### Admin (vos, Guillermo)

Ves **todos los módulos**. Podés:

- Ver y editar toda la información del negocio.
- Manejar la plata (Caja, Contabilidad).
- Ver estadísticas, alertas y auditoría completa (Historial).
- Crear y desactivar usuarios técnicos.
- Editar la configuración del negocio.
- **Usar el asistente de IA** (drawer flotante con el ícono ✨ abajo a la derecha).

### Técnico

Ve solo lo operativo. Puede:

- Ver **sus** órdenes asignadas (no las de los otros).
- Ver **sus** turnos del día.
- Actualizar el estado de sus órdenes.
- Imputar servicios y repuestos a sus órdenes.
- Ver los clientes.

**No ve**: Caja, Contabilidad, Analytics, Alertas, Historial, Usuarios, Configuración, ni el asistente de IA.

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
   - Cargá: equipo, falla declarada, prioridad, fecha de entrega estimada (opcional).
   - Guardá. La orden nace con estado `RECIBIDA` y un ID tipo `OT-0057`.
   - **El sistema genera automáticamente un aviso para el cliente** avisándole que recibiste el equipo. Lo copiás y lo enviás por donde quieras (WhatsApp, mail, etc.).

3. **Asignar técnico** (si sos admin):
   - Desde la ficha de la orden → **Asignar técnico**.
   - Elegí el técnico → guardá.

4. **Diagnóstico**:
   - El técnico cambia el estado a `DIAGNOSTICO`.
   - **Nuevo aviso automático** se genera para el cliente.
   - Escribe el diagnóstico en la ficha.

5. **Presupuesto** (opcional pero recomendado):
   - Desde **Presupuestos** → **Nuevo presupuesto**.
   - Elegí el cliente y **vinculalo a la orden** (dropdown "Orden vinculada").
   - Agregá servicios y repuestos con precio.
   - El sistema sugiere precio de repuestos con **margen** configurable (por defecto 30%).
   - Cambiá el estado del presupuesto a `ENVIADO`.
   - **Generar mensaje** → **el asistente de IA (Claude)** te arma un mensaje profesional listo para copiar y mandarle al cliente.
   - Si volvés a apretar Generar, se regenera con una variante distinta.

6. **Aprobación del cliente**:
   - Cuando el cliente responde, cambiás el estado del presupuesto a `APROBADO` o `RECHAZADO`.
   - Si es aprobado, actualizá la orden a `EN_REPARACION` (nuevo aviso automático).

7. **Imputar el trabajo** en la orden:
   - Desde la ficha de la orden → sección **Items imputados**.
   - Agregá servicios y repuestos del catálogo.
   - **Los repuestos descuentan stock automáticamente** al agregarlos. Si no hay stock, el sistema te avisa y no permite imputar.

8. **Listo para entregar**:
   - El técnico cambia el estado a `LISTA`.
   - **Aviso automático** al cliente: "tu equipo ya está listo, te esperamos por acá".
   - Le avisás al cliente que puede pasar a buscarlo.

9. **Cobro y entrega**:
   - Cuando llega el cliente, desde la ficha de la orden → sección **Cobros**.
   - Registrás el cobro (efectivo, transferencia, tarjeta, etc.).
   - El sistema crea automáticamente el ingreso en Caja.
   - Cambiás el estado a `ENTREGADA`.

**Todo el flujo queda trazado**. Cada cambio queda en el historial.

---

### Flujo 2 · Ya conocés al cliente — solo abrir orden y cobrar

1. **Órdenes** → **Nueva** → cliente existente → resto igual al Flujo 1 desde el paso 2.

---

### Flujo 3 · Registrar un gasto

Ejemplos: pagaste al proveedor de cables, pagaste la luz, cargaste combustible.

**IMPORTANTE**: en TECNOPRO, los gastos se registran desde el módulo **Caja** — no hay un módulo "Gastos" separado. Todo el movimiento de plata pasa por Caja.

1. Menú → **Caja** → **Nuevo movimiento**.
2. Paso 1: elegís **"Sale plata"** (botón rojo).
3. Paso 2: elegís motivo **"Gasto (con categoría)"**.
4. Aparecen los campos de gasto:
   - **Categoría**: Proveedores, Servicios, Impuestos, Sueldos, Alquiler, Insumos, Mantenimiento, Otros (podés agregar más desde Configuración → Categorías de gasto).
   - **Fecha del gasto** (default hoy).
5. Paso 3: cargás monto, método de pago, descripción, notas internas (opcional).
6. Guardá.

El sistema registra el gasto Y el egreso en caja **en un solo paso**. En la lista de Caja lo ves con la categoría.

---

### Flujo 4 · Otros movimientos de caja

Ejemplos: apertura del día, cierre, ajuste de conteo, ingreso ad-hoc que no viene de una orden.

1. Menú → **Caja** → **Nuevo movimiento**.
2. Paso 1: **"Entra plata"** o **"Sale plata"** según corresponda.
3. Paso 2: elegí motivo (Apertura de caja, Cierre de caja, Ajuste, Ingreso puntual, Egreso puntual).
4. Paso 3: monto, método, descripción.
5. Guardá.

**Regla dura**: los movimientos de caja son **inmutables**. Si te equivocaste, no los borrás — hacés un nuevo movimiento tipo **Ajuste** que compense.

---

### Flujo 5 · Sacar turno con un cliente

1. Menú → **Turnos** → **Nuevo turno**.
2. Elegí cliente y (opcional) orden vinculada.
3. Título ("Reparación notebook Lenovo").
4. **Fecha y hora de inicio**. Al setear el inicio, el fin se auto-completa a +1h (podés editarlo).
5. Asigná técnico.
6. Guardá.

El sistema **detecta superposiciones**: si le pusiste dos turnos al mismo técnico al mismo tiempo, te avisa antes de guardar.

Vista **Semana** (`/turnos`) muestra la grilla horaria. **Anterior / Siguiente / Hoy** para navegar. Vista **Lista** para ver próximos 60 días en tabla.

---

### Flujo 6 · Cliente pregunta "¿cómo va mi equipo?"

**Opción 1** (rápida): Apretá **Ctrl+K** (o Cmd+K en Mac) desde cualquier pantalla → buscador global. Escribí `OT-0057` o parte del nombre → Enter para abrir la ficha.

**Opción 2**: Menú → **Órdenes** → buscador de la lista.

---

### Flujo 7 · Preguntarle a la IA (solo admin)

Ejemplos de preguntas útiles:
- "¿Cómo va el mes?" → resumen de ingresos, egresos, órdenes activas.
- "¿Cuánto tengo por cobrar?" → total pendiente + top órdenes.
- "¿Qué hay urgente hoy?" → prioriza alertas.
- "¿Qué facturé en presupuestos este mes?".

1. Click en el botón redondo ✨ **abajo a la derecha** (siempre visible cuando sos admin).
2. Se abre el drawer del chat.
3. Escribí tu pregunta y Enter.
4. El asistente responde en base al estado actual del negocio.

**Reglas del asistente**:
- **Solo lee datos**. No hace cambios, no crea nada, no manda mensajes.
- Si le preguntás algo muy específico ("¿cuánto le facturé a Juan López?"), te sugiere en qué módulo buscar.
- Las conversaciones se guardan — podés retomar hilos desde el sidebar del drawer.

---

## 4. Los 12 módulos, de un vistazo

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
| **Presupuestos** | Cotizaciones con margen automático y mensaje generado por IA. |
| **Catálogo** | Servicios que ofrece el taller con precio base y tiempo estimado. |
| **Stock** | Inventario de repuestos con alerta de stock bajo. |

### Plata (solo admin)

| Módulo | Para qué |
|---|---|
| **Caja** | Todos los movimientos de plata. Ingresos, egresos y gastos categorizados desde acá. |
| **Contabilidad** | Libro contable + pestaña **Por cobrar** + **exportación CSV** para el contador. |

### Análisis (solo admin)

| Módulo | Para qué |
|---|---|
| **Analytics** | Gráficos: órdenes por estado, por técnico, flujo del semestre, top categorías de gasto. |
| **Alertas** | Entregas vencidas, saldos con demora, stock bajo, presupuestos por vencer. Los umbrales se configuran desde Configuración. |

### Sistema (solo admin)

| Módulo | Para qué |
|---|---|
| **Usuarios** | Alta/baja de cuentas de técnicos y admins. |
| **Historial** | Auditoría completa: quién hizo qué, cuándo, sobre qué. Filtros por tipo y entidad. |
| **Configuración** | Nombre del negocio, teléfono, márgenes, validez de presupuestos, umbrales de alertas, categorías de gasto. |

---

## 5. El asistente de IA

TECNOPRO tiene integración con **Claude Haiku** (Anthropic) en 3 lugares:

### 5.1 · Mensaje de presupuesto
En cualquier presupuesto, botón **"Generar mensaje"**. El asistente arma un texto profesional en español rioplatense con los datos reales del presupuesto (ID, servicios, repuestos, total, validez). Lo copiás y lo enviás por el canal que uses con el cliente.

### 5.2 · Avisos automáticos por cambio de estado
Cada vez que una orden cambia a un estado que amerita avisar al cliente (recibida, en diagnóstico, presupuestada, en reparación, lista), el sistema genera automáticamente un mensaje corto para el cliente. Aparece en la ficha de la orden con botón **Copiar** y botón **Regenerar** (si querés otra variante).

Los estados **Entregada** y **Cancelada** no generan aviso (el cliente ya sabe).

### 5.3 · Chat con el asistente (solo admin)
Botón ✨ abajo a la derecha. Consultas en lenguaje natural sobre el estado del negocio. Ver [Flujo 7](#flujo-7--preguntarle-a-la-ia-solo-admin).

### Cuando no está la API key
Si la conexión con Anthropic falla o no está configurada, el sistema **cae solo** a mensajes tipo template estático. **No se rompe nada** — solo obtenés un texto un poco menos rico. Los avisos automáticos y el mensaje de presupuesto siguen funcionando.

---

## 6. Trucos rápidos

### Buscador global (Cmd+K / Ctrl+K)
Apretalo desde **cualquier pantalla del sistema**. Se abre un buscador que busca en:
- **Órdenes** (por ID, equipo, falla)
- **Presupuestos** (por ID, título)
- **Clientes** (por ID, nombre, teléfono, documento)

Navegás con ↑↓ + Enter para abrir. Esc para cerrar.

### Filas clickeables
En **todas las listas** (Órdenes, Presupuestos, Clientes, Catálogo, Stock, Usuarios, Turnos), la fila entera es clickeable — te lleva a la ficha. Los controles internos (dropdowns de estado) no navegan.

### Toasts
Cada acción exitosa muestra un mensaje verde abajo a la derecha ("Cliente creado", "OT-0042: Entregada", etc.). Errores en rojo. No hay más ventanitas feas del navegador.

---

## 7. Cerrar el día

Rutina sugerida al fin de la jornada:

1. **Alertas** — ¿hay entregas vencidas o presupuestos por vencer? Contactá al cliente antes de irte.
2. **Panel** — mirá los KPIs. Saldo caja, órdenes activas, cobros pendientes.
3. **Caja** — registrá un movimiento **"Cierre de caja"** con el saldo real que contaste en la caja física. Si diferís del saldo del sistema, hacé un **Ajuste**.
4. Todos los cobros del día ya deberían estar registrados desde las órdenes.

**Alternativa rápida**: apretá ✨ y preguntá al asistente "¿Cómo cerró el día?". Te da el resumen.

---

## 8. Cosas para saber

### Cambios que no se pueden deshacer

Estas cosas son **inmutables** (no se pueden editar ni borrar). Si te equivocás, la corrección va como movimiento nuevo:

- **Movimientos de caja** (ingresos, egresos, gastos).
- **Historial de stock** — cada entrada/salida queda. Para corregir, registrá el movimiento opuesto.
- **Historial de eventos** — la auditoría es append-only.
- **Mensajes del chat con IA** — queda registro de todas las consultas hechas al asistente.

**Por qué**: para tener trazabilidad contable real y evitar que la información cambie sin dejar rastro.

### Deletes reales vs deletes suaves

- **Clientes**: **soft delete** (se marcan como inactivos). Se puede reactivar.
- **Servicios / Repuestos**: soft delete (campo `activo`).
- **Órdenes**: no se borran, se cancelan (estado `CANCELADA`).
- **Presupuestos**: no se borran, se rechazan (estado `RECHAZADO`).
- **Turnos**: se cancelan (estado `CANCELADO`).
- **Usuarios**: hard delete (para las cuentas de baja definitiva).
- **Categorías de gasto**: soft delete (activo/inactivo). No se borran si tienen gastos históricos.

### IDs legibles

Cada entidad tiene un ID amigable que se usa en la comunicación con el cliente:

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

### Historial y auditoría

Como admin, tenés acceso a **Historial** en el nav del grupo Sistema. Ahí ves todo lo que pasó en el sistema:
- Cambios de estado de órdenes y presupuestos
- Cobros y gastos
- Movimientos de stock
- Nuevos clientes
- Mensajes generados con IA
- Cambios administrativos

Podés filtrar por tipo (solo cobros, solo movimientos de stock, etc.) o por entidad (todo lo relacionado con órdenes, presupuestos, etc.).

### Alertas configurables

Los umbrales de alertas se configuran desde **Configuración**:

- **Alerta de saldos con demora**: cuántos días desde la recepción de una orden con saldo pendiente cuentan como "atrasado" (default 30 días).
- **Alerta de presupuestos por vencer**: cuántos días antes del vencimiento aparece la alerta (default 7 días).
- **Antelación general**: campo reservado para futuras alertas.

**Alertas fijas** (no configurables, dependen del dato):
- **Entregas vencidas**: cualquier orden con `fecha_entrega_estimada` en el pasado y estado no `ENTREGADA/CANCELADA`.
- **Stock bajo**: repuestos con `stock_actual` menor o igual al `stock_minimo` (definido por vos al cargar el repuesto).

---

## 9. Preguntas frecuentes

**¿Cómo cambio la contraseña de un técnico?**
Menú → **Usuarios** → click en el técnico → cambiar contraseña.

**¿Y si un técnico se olvida la contraseña?**
Le decís que use el link "¿Olvidaste tu contraseña?" en la pantalla de login. Le llega un email con el link para elegir una nueva. No dependés más de vos para resetear.

**¿Cómo desactivo un técnico que se fue?**
Menú → **Usuarios** → click → marcar como inactivo. No pierde el historial pero no puede loguearse. **No podés desactivarte a vos mismo.**

**¿Un técnico ve los datos de otro técnico?**
No. Cada técnico solo ve sus órdenes asignadas y sus turnos. Los admins ven todo.

**¿Cómo agrego una categoría de gasto nueva?**
Menú → **Configuración** → sección "Otras configuraciones" → **Categorías de gasto**. Botón "Agregar". Podés renombrar y activar/desactivar. Los gastos históricos con esa categoría se preservan.

**¿Cómo exporto la contabilidad para el contador?**
Menú → **Contabilidad** → pestaña **Libro** → elegí el período (mes, año o rango custom) → **Exportar CSV**. El archivo se abre en Excel con las tildes y signos correctos.

**¿Cómo veo qué tengo por cobrar?**
Menú → **Contabilidad** → pestaña **Por cobrar**. Lista de todas las órdenes con saldo pendiente + resumen del mes. Click en la orden abre la ficha.

**¿Se pueden adjuntar fotos o comprobantes a los gastos?**
Todavía no. Está previsto para una fase futura (integración con almacenamiento de archivos).

**¿La IA que se menciona en el sistema ya está?**
Sí, en 3 lugares: mensaje de presupuesto, avisos automáticos de estado y chat NL. Requiere que la API key de Anthropic esté configurada en Vercel. Sin la key, el sistema usa templates estáticos (no rompe nada).

**¿Cuánto sale usar la IA?**
Muy poco. Claude Haiku es el modelo más barato de Anthropic. Un uso típico (200 presupuestos + 600 avisos + 100 consultas al chat por mes) sale **menos de USD 1 por mes**. La cuenta de Anthropic la maneja Guillo con su tarjeta.

**¿Cómo veo lo que hizo cada técnico?**
- **Analytics** → tarjeta "Órdenes por técnico" te muestra la carga acumulada.
- **Historial** → filtrar por entidad "orden" te muestra todos los cambios de estado con quién los hizo.

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

**Fin del manual.** Última actualización: cierre de Wave 3 del audit UX + Fase 3 IA completa.
