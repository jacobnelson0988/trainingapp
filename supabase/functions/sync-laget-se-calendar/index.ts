import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as ical from "npm:node-ical@0.20.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
}

const SYNC_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_DURATION_MS = 90 * 60 * 1000
const IMPORT_WINDOW_PAST_DAYS = 32
const IMPORT_WINDOW_FUTURE_DAYS = 190

type ExternalCalendarSource = {
  id: string
  team_id: string
  created_by: string
  provider: "laget_se"
  feed_url: string
  is_enabled: boolean
  last_synced_at: string | null
  last_sync_status: string | null
  last_sync_error: string | null
}

type ParsedEvent = {
  external_event_uid: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  is_cancelled: boolean
}

type SyncStats = {
  created: number
  updated: number
  cancelled: number
}

type SyncResult =
  | {
      source_id: string
      skipped: "disabled" | "fresh"
      last_synced_at: string | null
      stats: SyncStats
    }
  | {
      source_id: string
      synced: true
      last_synced_at: string
      stats: SyncStats
    }

const normalizeLagetSeFeedInput = (value: string) => {
  const raw = String(value || "").trim()

  if (!raw) return ""

  if (/^webcal:\/\//i.test(raw)) {
    return raw.replace(/^webcal:\/\//i, "https://")
  }

  if (/^https?:\/\/cal\.laget\.se\/.+\.ics(?:\?.*)?$/i.test(raw)) {
    return raw
  }

  if (/^https?:\/\/(?:www\.)?laget\.se\/[^/]+/i.test(raw)) {
    try {
      const url = new URL(raw)
      const slug = url.pathname.split("/").filter(Boolean)[0]

      if (slug) {
        return `https://cal.laget.se/${slug}.ics`
      }
    } catch {
      return raw
    }
  }

  if (/^[a-z0-9_-]+$/i.test(raw)) {
    return `https://cal.laget.se/${raw}.ics`
  }

  return raw
}

const isFreshSync = (lastSyncedAt: string | null) => {
  if (!lastSyncedAt) return false

  const lastTime = new Date(lastSyncedAt).getTime()
  if (Number.isNaN(lastTime)) return false

  return Date.now() - lastTime < SYNC_INTERVAL_MS
}

const safeText = (value: unknown) => {
  const normalized = String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()

  return normalized || null
}

const getImportWindow = () => {
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - IMPORT_WINDOW_PAST_DAYS)
  windowStart.setHours(0, 0, 0, 0)

  const windowEnd = new Date(now)
  windowEnd.setDate(windowEnd.getDate() + IMPORT_WINDOW_FUTURE_DAYS)
  windowEnd.setHours(23, 59, 59, 999)

  return {
    startIso: windowStart.toISOString(),
    endIso: windowEnd.toISOString(),
    startMs: windowStart.getTime(),
    endMs: windowEnd.getTime(),
  }
}

const parseIcsEvents = (icsText: string) => {
  const parsed = ical.sync.parseICS(icsText)
  const { startMs, endMs } = getImportWindow()

  return Object.values(parsed)
    .filter((entry: any) => entry?.type === "VEVENT")
    .map((entry: any) => {
      const startDate = entry?.start instanceof Date ? new Date(entry.start) : null
      if (!startDate || Number.isNaN(startDate.getTime())) return null

      const rawEndDate = entry?.end instanceof Date ? new Date(entry.end) : null
      const endDate =
        rawEndDate && rawEndDate.getTime() > startDate.getTime()
          ? rawEndDate
          : new Date(startDate.getTime() + DEFAULT_DURATION_MS)

      if (startDate.getTime() < startMs || startDate.getTime() > endMs) {
        return null
      }

      const uidBase = String(entry?.uid || entry?.id || entry?.summary || "").trim()
      if (!uidBase) return null

      const occurrenceId =
        entry?.recurrenceid instanceof Date
          ? new Date(entry.recurrenceid).toISOString()
          : startDate.toISOString()

      return {
        external_event_uid: `${uidBase}::${occurrenceId}`,
        title: String(entry?.summary || "Handboll").trim() || "Handboll",
        description: safeText(entry?.description),
        location: safeText(entry?.location),
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        is_cancelled: String(entry?.status || "").toUpperCase() === "CANCELLED",
      } satisfies ParsedEvent
    })
    .filter(Boolean) as ParsedEvent[]
}

const updateSourceStatus = async (
  adminClient: ReturnType<typeof createClient>,
  sourceId: string,
  patch: Record<string, unknown>
) => {
  await adminClient.from("external_calendar_sources").update(patch).eq("id", sourceId)
}

const syncSingleSource = async (
  adminClient: ReturnType<typeof createClient>,
  source: ExternalCalendarSource,
  force: boolean
): Promise<SyncResult> => {
  const emptyStats = { created: 0, updated: 0, cancelled: 0 }

  if (!force && !source.is_enabled) {
    return {
      source_id: source.id,
      skipped: "disabled",
      last_synced_at: source.last_synced_at,
      stats: emptyStats,
    }
  }

  if (!force && isFreshSync(source.last_synced_at)) {
    return {
      source_id: source.id,
      skipped: "fresh",
      last_synced_at: source.last_synced_at,
      stats: emptyStats,
    }
  }

  const normalizedFeedUrl = normalizeLagetSeFeedInput(source.feed_url)

  await updateSourceStatus(adminClient, source.id, {
    feed_url: normalizedFeedUrl,
    last_sync_status: "running",
    last_sync_error: null,
  })

  const response = await fetch(normalizedFeedUrl, {
    headers: {
      "User-Agent": "Starkare-Gurra-Calendar-Sync/1.0",
    },
  })

  if (!response.ok) {
    throw new Error(`laget.se svarade med ${response.status}`)
  }

  const icsText = await response.text()
  const parsedEvents = parseIcsEvents(icsText)
  const importWindow = getImportWindow()

  const { data: players, error: playersError } = await adminClient
    .from("profiles")
    .select("id, is_archived")
    .eq("team_id", source.team_id)
    .eq("role", "player")

  if (playersError) {
    throw playersError
  }

  const activePlayerIds = (players || [])
    .filter((player: any) => player.is_archived !== true)
    .map((player: any) => player.id)

  const { data: existingSeriesRows, error: existingSeriesError } = await adminClient
    .from("calendar_series")
    .select("id, external_event_uid")
    .eq("external_source_id", source.id)
    .eq("external_provider", "laget_se")
    .gte("starts_at", importWindow.startIso)
    .lte("starts_at", importWindow.endIso)

  if (existingSeriesError) {
    throw existingSeriesError
  }

  const { data: existingEventRows, error: existingEventsError } = await adminClient
    .from("calendar_events")
    .select("id, series_id, external_event_uid")
    .eq("external_source_id", source.id)
    .eq("external_provider", "laget_se")
    .gte("starts_at", importWindow.startIso)
    .lte("starts_at", importWindow.endIso)

  if (existingEventsError) {
    throw existingEventsError
  }

  const existingSeriesByUid = new Map(
    (existingSeriesRows || []).map((row: any) => [String(row.external_event_uid), row])
  )
  const existingEventsByUid = new Map(
    (existingEventRows || []).map((row: any) => [String(row.external_event_uid), row])
  )
  const syncedUids = new Set<string>()

  let createdCount = 0
  let updatedCount = 0
  let cancelledCount = 0

  for (const event of parsedEvents) {
    syncedUids.add(event.external_event_uid)

    let seriesId = existingSeriesByUid.get(event.external_event_uid)?.id || null

    if (seriesId) {
      const { error } = await adminClient
        .from("calendar_series")
        .update({
          title: event.title,
          description: event.description,
          activity_kind: "handball",
          free_activity_type: "handball",
          workout_template_id: null,
          location: event.location,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          timezone: "Europe/Stockholm",
          is_cancelled: event.is_cancelled,
          is_recurring: false,
          recurrence_freq: null,
          recurrence_interval: null,
          recurrence_weekdays: null,
          recurrence_until: null,
          is_external: true,
          external_provider: "laget_se",
          external_source_id: source.id,
          external_event_uid: event.external_event_uid,
        })
        .eq("id", seriesId)

      if (error) throw error
      updatedCount += 1
    } else {
      const { data, error } = await adminClient
        .from("calendar_series")
        .insert({
          team_id: source.team_id,
          created_by: source.created_by,
          title: event.title,
          description: event.description,
          activity_kind: "handball",
          workout_template_id: null,
          free_activity_type: "handball",
          location: event.location,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          timezone: "Europe/Stockholm",
          is_recurring: false,
          recurrence_freq: null,
          recurrence_interval: null,
          recurrence_weekdays: null,
          recurrence_until: null,
          is_cancelled: event.is_cancelled,
          is_external: true,
          external_provider: "laget_se",
          external_source_id: source.id,
          external_event_uid: event.external_event_uid,
        })
        .select("id")
        .single()

      if (error || !data?.id) throw error || new Error("Kunde inte skapa kalenderserie")
      seriesId = data.id
      createdCount += 1
    }

    const existingEvent = existingEventsByUid.get(event.external_event_uid)

    if (existingEvent?.id) {
      const { error } = await adminClient
        .from("calendar_events")
        .update({
          series_id: seriesId,
          team_id: source.team_id,
          created_by: source.created_by,
          title: event.title,
          description: event.description,
          activity_kind: "handball",
          workout_template_id: null,
          free_activity_type: "handball",
          location: event.location,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          timezone: "Europe/Stockholm",
          source_date: event.starts_at.slice(0, 10),
          is_cancelled: event.is_cancelled,
          is_external: true,
          external_provider: "laget_se",
          external_source_id: source.id,
          external_event_uid: event.external_event_uid,
        })
        .eq("id", existingEvent.id)

      if (error) throw error
    } else {
      const { data, error } = await adminClient
        .from("calendar_events")
        .insert({
          series_id: seriesId,
          team_id: source.team_id,
          created_by: source.created_by,
          title: event.title,
          description: event.description,
          activity_kind: "handball",
          workout_template_id: null,
          free_activity_type: "handball",
          location: event.location,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          timezone: "Europe/Stockholm",
          source_date: event.starts_at.slice(0, 10),
          is_cancelled: event.is_cancelled,
          is_external: true,
          external_provider: "laget_se",
          external_source_id: source.id,
          external_event_uid: event.external_event_uid,
        })
        .select("id")
        .single()

      if (error || !data?.id) throw error || new Error("Kunde inte skapa kalenderevent")
      existingEventsByUid.set(event.external_event_uid, { id: data.id, series_id: seriesId })
    }

    const eventId = existingEventsByUid.get(event.external_event_uid)?.id
    if (!eventId) throw new Error("Importerad kalenderhändelse saknar event-id")

    const { data: existingLinks, error: existingLinksError } = await adminClient
      .from("calendar_event_players")
      .select("id, player_id")
      .eq("calendar_event_id", eventId)

    if (existingLinksError) throw existingLinksError

    const existingPlayerIds = new Set((existingLinks || []).map((link: any) => link.player_id))
    const missingPlayerRows = activePlayerIds
      .filter((playerId) => !existingPlayerIds.has(playerId))
      .map((playerId) => ({
        calendar_event_id: eventId,
        player_id: playerId,
        assignment_source: "team",
        completion_status: event.is_cancelled ? "cancelled" : "planned",
      }))

    if (missingPlayerRows.length > 0) {
      const { error } = await adminClient.from("calendar_event_players").insert(missingPlayerRows)

      if (error) throw error
    }

    const { error: resetLinkError } = await adminClient
      .from("calendar_event_players")
      .update({
        completion_status: event.is_cancelled ? "cancelled" : "planned",
        completed_at: null,
        linked_workout_session_id: null,
      })
      .eq("calendar_event_id", eventId)

    if (resetLinkError) throw resetLinkError
  }

  const missingImportedEvents = (existingEventRows || []).filter(
    (row: any) => row.external_event_uid && !syncedUids.has(String(row.external_event_uid))
  )

  for (const missingEvent of missingImportedEvents) {
    const { error: updateSeriesError } = await adminClient
      .from("calendar_series")
      .update({ is_cancelled: true })
      .eq("id", missingEvent.series_id)

    if (updateSeriesError) throw updateSeriesError

    const { error: updateEventError } = await adminClient
      .from("calendar_events")
      .update({ is_cancelled: true })
      .eq("id", missingEvent.id)

    if (updateEventError) throw updateEventError

    const { error: updatePlayersError } = await adminClient
      .from("calendar_event_players")
      .update({
        completion_status: "cancelled",
        completed_at: null,
        linked_workout_session_id: null,
      })
      .eq("calendar_event_id", missingEvent.id)

    if (updatePlayersError) throw updatePlayersError
    cancelledCount += 1
  }

  const nowIso = new Date().toISOString()
  await updateSourceStatus(adminClient, source.id, {
    last_synced_at: nowIso,
    last_sync_status: "success",
    last_sync_error: null,
    feed_url: normalizedFeedUrl,
  })

  return {
    source_id: source.id,
    synced: true,
    last_synced_at: nowIso,
    stats: {
      created: createdCount,
      updated: updatedCount,
      cancelled: cancelledCount,
    },
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const sourceIdsToMarkAsError: string[] = []

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")
    const expectedCronSecret =
      Deno.env.get("LAGET_SE_SYNC_CRON_SECRET") ?? Deno.env.get("CRON_SECRET") ?? ""

    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing service role configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const requestBody = await req.json().catch(() => ({}))
    const providedCronSecret = req.headers.get("x-cron-secret") || ""
    const isCronRequest = Boolean(expectedCronSecret) && providedCronSecret === expectedCronSecret
    const requestedSourceId = requestBody?.source_id ? String(requestBody.source_id) : null
    const requestedTeamId = requestBody?.team_id ? String(requestBody.team_id) : null
    const force = requestBody?.force === true

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    let requesterRole: string | null = null
    let requesterTeamId: string | null = null

    if (!isCronRequest) {
      const authHeader = req.headers.get("Authorization")

      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      })

      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser()

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: profile, error: profileError } = await userClient
        .from("profiles")
        .select("id, role, team_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile || !["coach", "player", "head_admin"].includes(profile.role)) {
        return new Response(JSON.stringify({ error: "Du har inte behörighet att synka kalendern" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      requesterRole = profile.role
      requesterTeamId = profile.team_id || null
    }

    let sourceQuery = adminClient
      .from("external_calendar_sources")
      .select("id, team_id, created_by, provider, feed_url, is_enabled, last_synced_at, last_sync_status, last_sync_error")
      .eq("provider", "laget_se")

    if (requestedSourceId) {
      sourceQuery = sourceQuery.eq("id", requestedSourceId)
    } else if ((isCronRequest || requesterRole === "head_admin") && requestedTeamId) {
      sourceQuery = sourceQuery.eq("team_id", requestedTeamId)
    } else if (requesterTeamId) {
      sourceQuery = sourceQuery.eq("team_id", requesterTeamId)
    } else if (!isCronRequest) {
      return new Response(JSON.stringify({ error: "Ingen lagkoppling hittades för syncen" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: sourceRows, error: sourceError } = await sourceQuery.order("created_at", { ascending: true })

    if (sourceError) {
      return new Response(JSON.stringify({ error: sourceError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const sources = (sourceRows || []) as ExternalCalendarSource[]

    if (sources.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_source" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const results: SyncResult[] = []
    const aggregateStats = { created: 0, updated: 0, cancelled: 0 }

    for (const source of sources) {
      sourceIdsToMarkAsError.push(source.id)
      const result = await syncSingleSource(adminClient, source, force)
      results.push(result)
      aggregateStats.created += result.stats.created
      aggregateStats.updated += result.stats.updated
      aggregateStats.cancelled += result.stats.cancelled
    }

    const syncedCount = results.filter((result) => "synced" in result && result.synced).length
    const skippedFreshCount = results.filter((result) => "skipped" in result && result.skipped === "fresh").length
    const skippedDisabledCount = results.filter((result) => "skipped" in result && result.skipped === "disabled").length

    if (results.length === 1 && !isCronRequest) {
      return new Response(JSON.stringify({ ok: true, ...results[0] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({
        ok: true,
        synced: syncedCount > 0,
        processed_sources: results.length,
        synced_sources: syncedCount,
        skipped_fresh_sources: skippedFreshCount,
        skipped_disabled_sources: skippedDisabledCount,
        stats: aggregateStats,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")

    if (supabaseUrl && serviceRoleKey && sourceIdsToMarkAsError.length > 0) {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        await adminClient
          .from("external_calendar_sources")
          .update({
            last_sync_status: "error",
            last_sync_error: err instanceof Error ? err.message : "Unknown sync error",
          })
          .in("id", sourceIdsToMarkAsError)
      } catch {
        // Ignore secondary error reporting failures.
      }
    }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown sync error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
