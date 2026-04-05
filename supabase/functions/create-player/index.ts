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
    console.log("create-player invoked")
    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")

    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing service role configuration" }), {
        status: 500,
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
      .select("role, team_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!["coach", "head_admin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Only coach or head admin can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    console.log("creator verified", { userId: user.id, role: profile.role })

    const { full_name, password, role: requestedRole, team_id: requestedTeamId } = await req.json()
    const targetRole = profile.role === "head_admin" && requestedRole === "coach" ? "coach" : "player"
    const targetTeamId = profile.role === "head_admin" ? requestedTeamId || profile.team_id : profile.team_id
    console.log("payload received", {
      full_name,
      requestedRole,
      targetRole,
      targetTeamId,
      passwordLength: typeof password === "string" ? password.length : 0,
    })

    if (!full_name || !password || !targetTeamId) {
      return new Response(JSON.stringify({ error: "full_name, password or team_id missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const normalizedName = full_name
      .toLowerCase()
      .trim()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")

    const names = normalizedName.split(/\s+/).filter(Boolean)
    const first = (names[0] || "").replace(/[^a-z0-9]/g, "").slice(0, 3)
    const last = (names[names.length - 1] || "").replace(/[^a-z0-9]/g, "").slice(0, 3)

    if (!first || !last) {
      return new Response(JSON.stringify({ error: "Name must include first and last name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const baseUsername = `${first}.${last}`
    let username = `${baseUsername}1`
    let counter = 1

    while (true) {
      const { data, error } = await adminClient
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (!data) break

      counter++
      username = `${baseUsername}${counter}`
    }

    const email = `${username}-${crypto.randomUUID().slice(0, 8)}@example.com`
    console.log("generated credentials", { username, email })

    const { data: userData, error: userCreateError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (userCreateError || !userData?.user) {
      console.error("createUser failed", {
        message: userCreateError?.message,
        status: userCreateError?.status,
        email,
        username,
      })

      return new Response(
        JSON.stringify({
          error: userCreateError?.message || "User creation failed",
          step: "createUser",
          email,
          username,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { error: insertError } = await adminClient.from("profiles").upsert(
      {
        id: userData.user.id,
        username,
        full_name,
        role: targetRole,
        team_id: targetTeamId,
      },
      { onConflict: "id" }
    )

    if (insertError) {
      console.error("profile insert failed", {
        message: insertError.message,
        userId: userData.user.id,
        username,
      })

      await adminClient.auth.admin.deleteUser(userData.user.id)

      return new Response(
        JSON.stringify({
          error: insertError.message,
          step: "profileInsert",
          username,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log("user created successfully", {
      username,
      email,
      role: targetRole,
      teamId: targetTeamId,
      createdUserId: userData.user.id,
    })
    return new Response(JSON.stringify({ username, email, role: targetRole, team_id: targetTeamId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
