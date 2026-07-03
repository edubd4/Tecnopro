import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { hayIADisponible, llamarAnthropicMulti } from "@/lib/anthropic"
import { armarContextoDeNegocio } from "@/lib/chat-context"

const SYSTEM_PROMPT_BASE = `Sos el asistente de negocio de TECNOPRO — un sistema de gestión para un service técnico.

El usuario que te habla es el dueño o un admin del taller. Está en Argentina.

Reglas duras:
- Escribí en español rioplatense (voseo). Tono cordial, directo, útil.
- USÁ el snapshot del negocio que viene abajo para responder preguntas sobre estado actual, KPIs, alertas y movimientos recientes.
- Si te preguntan algo que NO está en el snapshot (ej: "¿cuánto le facturé al cliente Juan López?", "¿qué órdenes tiene el técnico Pedro?"), decí que no tenés ese dato específico y sugerí qué módulo de TECNOPRO tiene la info: /clientes, /ordenes, /presupuestos, /caja, /contabilidad, /alertas, /analytics.
- NO inventes datos que no estén en el snapshot. Ante la duda, decí "no tengo el dato".
- NO puedes hacer cambios en el sistema — solo consultás.
- Mantené respuestas cortas (máximo 8-10 líneas), con formato limpio (bullets si ayuda).
- Los montos siempre en pesos argentinos con formato "$1.234.567".
- Los IDs (OT-XXXX, PRES-XXXX, CLI-XXXX, MOV-XXXX, GST-XXXX, REP-XXXX, TRN-XXXX) mencionálos tal cual aparecen.

Estás pensado para consultas frecuentes tipo:
- "¿cómo va el mes?" → resumen de flujo del mes.
- "¿cuánto tengo por cobrar?" → total por cobrar + top órdenes con saldo.
- "¿qué órdenes están vencidas?" → lista de entregas vencidas.
- "¿qué hay urgente hoy?" → priorizar alertas: vencidas > stock bajo > presupuestos por vencer.
- "¿qué facturé este mes?" → ingresos del mes + comparación básica si aplica.`

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ChatBody = {
  conversacion_id?: string
  message: string
}

export async function POST(req: Request) {
  const supabase = await createServerClient()

  // ─── Auth: admin activo ────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single()
  if (!profile?.activo || profile.rol !== "admin") {
    return NextResponse.json({ ok: false, error: "Solo administradores" }, { status: 403 })
  }

  // ─── Body ──────────────────────────────────────────────────────────────
  let body: ChatBody
  try {
    body = (await req.json()) as ChatBody
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 })
  }
  const userMessage = body.message?.trim() ?? ""
  if (!userMessage) {
    return NextResponse.json({ ok: false, error: "Mensaje vacío" }, { status: 400 })
  }
  if (userMessage.length > 2000) {
    return NextResponse.json({ ok: false, error: "Mensaje demasiado largo (máx 2000 caracteres)" }, { status: 400 })
  }

  if (!hayIADisponible()) {
    return NextResponse.json(
      {
        ok: false,
        error: "El chat con IA no está configurado. Falta ANTHROPIC_API_KEY.",
      },
      { status: 503 },
    )
  }

  // ─── Conversación (crear si no viene) ──────────────────────────────────
  let conversacionId = body.conversacion_id ?? null

  if (!conversacionId) {
    const { data: newConv, error: convErr } = await supabase
      .from("chat_conversaciones")
      .insert({ user_id: user.id, titulo: userMessage.substring(0, 60) })
      .select("id")
      .single()
    if (convErr || !newConv) {
      return NextResponse.json({ ok: false, error: convErr?.message ?? "No se pudo crear la conversación" }, { status: 500 })
    }
    conversacionId = newConv.id
  } else {
    // Verificar que la conversación es del user (RLS también filtra)
    const { data: conv } = await supabase
      .from("chat_conversaciones")
      .select("id, user_id")
      .eq("id", conversacionId)
      .maybeSingle()
    if (!conv || conv.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Conversación no encontrada" }, { status: 404 })
    }
  }

  // ─── Guardar mensaje del user ──────────────────────────────────────────
  const { error: userMsgErr } = await supabase.from("chat_mensajes").insert({
    conversacion_id: conversacionId,
    rol: "user",
    contenido: userMessage,
  })
  if (userMsgErr) {
    return NextResponse.json({ ok: false, error: userMsgErr.message }, { status: 500 })
  }

  // ─── Traer historial de la conversación para pasar como contexto ──────
  const { data: mensajesPrev } = await supabase
    .from("chat_mensajes")
    .select("rol, contenido")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true })
    .limit(40)

  const mensajesHistorial = (mensajesPrev ?? []).map((m) => ({
    role: (m.rol === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: m.contenido as string,
  }))

  // ─── Snapshot de negocio ──────────────────────────────────────────────
  const contexto = await armarContextoDeNegocio(supabase)
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${contexto}`

  // ─── Llamada a Anthropic con el historial completo (multi-turn) ───────
  let assistantText: string
  let tokensInput = 0
  let tokensOutput = 0
  let modelUsado = ""

  try {
    const response = await llamarAnthropicMulti({
      systemPrompt,
      messages: mensajesHistorial,
      maxTokens: 800,
      temperature: 0.4,
    })
    tokensInput = response.tokensInput
    tokensOutput = response.tokensOutput
    modelUsado = response.model
    assistantText = response.text
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error("[/api/ia/chat] IA falló:", errMsg)
    return NextResponse.json(
      { ok: false, error: `Falló la llamada al modelo: ${errMsg}` },
      { status: 502 },
    )
  }

  // ─── Guardar respuesta del assistant ──────────────────────────────────
  const { error: assistantErr } = await supabase.from("chat_mensajes").insert({
    conversacion_id: conversacionId,
    rol: "assistant",
    contenido: assistantText,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    model: modelUsado,
  })
  if (assistantErr) {
    // El mensaje se generó pero no se pudo guardar. Devolvemos igual.
    console.error("[/api/ia/chat] no se pudo guardar assistantMsg:", assistantErr.message)
  }

  // Actualiza updated_at de la conversación (para que suba en la lista)
  await supabase
    .from("chat_conversaciones")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversacionId)

  return NextResponse.json({
    ok: true,
    data: {
      conversacion_id: conversacionId,
      mensaje: assistantText,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
    },
  })
}
