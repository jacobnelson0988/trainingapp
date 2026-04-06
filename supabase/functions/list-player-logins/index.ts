import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")

    if (!serviceRoleKey) {
      return jsonResponse({ error: "Missing service role configuration" }, 500)
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
      return jsonResponse({ error: "Not authenticated" }, 401)
    }

    const { data: requesterProfile, error: requesterError } = await userClient
      .from("profiles")
      .select("id, role, team_id")
      .eq("id", user.id)
      .single()

    if (requesterError || !requesterProfile) {
      return jsonResponse({ error: "Profile not found" }, 403)
    }

    if (!["coach", "head_admin"].includes(requesterProfile.role)) {
      return jsonResponse({ error: "Only coach or head admin can view player login data" }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const requestedIds = Array.isArray(body?.player_ids)
      ? body.player_ids.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : []

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    let playerQuery = adminClient
      .from("profiles")
      .select("id, team_id, role")
      .eq("role", "player")

    if (requesterProfile.role === "coach") {
      if (!requesterProfile.team_id) {
        return jsonResponse({ players: [] }, 200)
      }

      playerQuery = playerQuery.eq("team_id", requesterProfile.team_id)
    }

    if (requestedIds.length > 0) {
      playerQuery = playerQuery.in("id", requestedIds)
    }

    const { data: allowedPlayers, error: playersError } = await playerQuery

    if (playersError) {
      return jsonResponse({ error: playersError.message }, 400)
    }

    const allowedIds = new Set((allowedPlayers || []).map((entry) => entry.id))

    if (allowedIds.size === 0) {
      return jsonResponse({ players: [] }, 200)
    }

    const loginMap = new Map<string, string | null>()
    let page = 1
    const perPage = 1000

    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      })

      if (error) {
        return jsonResponse({ error: error.message }, 400)
      }

      const users = data?.users || []

      users.forEach((entry) => {
        if (allowedIds.has(entry.id)) {
          loginMap.set(entry.id, entry.last_sign_in_at || null)
        }
      })

      if (users.length < perPage || loginMap.size >= allowedIds.size) {
        break
      }

      page += 1
    }

    return jsonResponse(
      {
        players: Array.from(allowedIds).map((playerId) => ({
          player_id: playerId,
          last_sign_in_at: loginMap.get(playerId) || null,
        })),
      },
      200
    )
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500)
  }
})

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
