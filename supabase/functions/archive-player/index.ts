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
      return jsonResponse({ error: "Only coach or head admin can archive players" }, 403)
    }

    const { player_id: playerId } = await req.json()

    if (!playerId) {
      return jsonResponse({ error: "player_id missing" }, 400)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, role, team_id, is_archived")
      .eq("id", playerId)
      .single()

    if (targetError || !targetProfile) {
      return jsonResponse({ error: "Spelaren hittades inte" }, 404)
    }

    if (targetProfile.role !== "player") {
      return jsonResponse({ error: "Endast spelare kan arkiveras" }, 400)
    }

    if (
      requesterProfile.role === "coach" &&
      (!requesterProfile.team_id || requesterProfile.team_id !== targetProfile.team_id)
    ) {
      return jsonResponse({ error: "Du kan bara arkivera spelare i ditt eget lag" }, 403)
    }

    if (targetProfile.is_archived) {
      return jsonResponse({ success: true, already_archived: true, player_id: playerId }, 200)
    }

    const { error: archiveError } = await adminClient
      .from("profiles")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: requesterProfile.id,
      })
      .eq("id", playerId)

    if (archiveError) {
      return jsonResponse({ error: archiveError.message }, 400)
    }

    return jsonResponse({ success: true, player_id: playerId }, 200)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500)
  }
})

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
