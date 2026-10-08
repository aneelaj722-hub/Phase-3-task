import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return respond(405, { error: 'Method not allowed.' })
  }

  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: 'The staff-management function is not configured.' })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return respond(401, { error: 'A valid staff session is required.' })
  }

  const { data: actor, error: actorError } = await adminClient
    .from('staff_profiles')
    .select('role, is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (actorError) {
    return respond(500, { error: 'Unable to verify staff permissions.' })
  }
  if (!actor || actor.role !== 'administrator' || actor.is_active !== true) {
    return respond(403, { error: 'Only an active administrator can manage staff profiles.' })
  }

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return respond(400, { error: 'A valid request body is required.' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return respond(400, { error: 'The request body must be valid JSON.' })
  }

  const action = body.action
  const role = body.role
  const userId = body.userId
  if (role !== undefined && role !== 'administrator' && role !== 'teacher' && role !== 'finance') {
    return respond(400, { error: 'Select a valid staff role.' })
  }

  if (action === 'invite') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName || !role) {
      return respond(400, { error: 'A valid email, full name, and role are required.' })
    }

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: fullName } },
    )
    if (inviteError || !invited.user) {
      return respond(400, { error: inviteError?.message ?? 'Unable to invite this staff member.' })
    }

    const { error: profileError } = await adminClient.rpc('manage_staff_profile', {
      p_actor_user_id: userData.user.id,
      p_action: 'invite',
      p_user_id: invited.user.id,
      p_email: email,
      p_full_name: fullName,
      p_role: role,
      p_is_active: true,
    })
    if (profileError) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(invited.user.id)
      if (cleanupError) {
        return respond(500, {
          error: 'The invitation was created, but profile setup failed and account cleanup also failed. Remove the unlinked Auth user in Supabase Dashboard.',
        })
      }
      return respond(400, { error: `Unable to create the staff profile: ${profileError.message}` })
    }
    return respond(200, { userId: invited.user.id })
  }

  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return respond(400, { error: 'A valid staff user ID is required.' })
  }

  if (action === 'update') {
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!fullName || !email || !role) {
      return respond(400, { error: 'A full name, email, and role are required.' })
    }
    const { data: target, error: targetError } = await adminClient
      .from('staff_profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle()
    if (targetError) return respond(500, { error: 'Unable to load the staff profile.' })
    if (!target) return respond(404, { error: 'The staff profile could not be found.' })
    if (email !== target.email.toLowerCase()) {
      return respond(400, { error: 'Staff email changes must be handled through a verified Auth email-change flow.' })
    }

    const { error } = await adminClient.rpc('manage_staff_profile', {
      p_actor_user_id: userData.user.id,
      p_action: 'update',
      p_user_id: userId,
      p_full_name: fullName,
      p_role: role,
    })
    if (error) return respond(400, { error: error.message })
    return respond(200, { userId })
  }

  if (action === 'set-status') {
    if (body.status !== 'active' && body.status !== 'inactive') {
      return respond(400, { error: 'Select a valid staff status.' })
    }
    const { error } = await adminClient.rpc('manage_staff_profile', {
      p_actor_user_id: userData.user.id,
      p_action: 'set-status',
      p_user_id: userId,
      p_is_active: body.status === 'active',
    })
    if (error) return respond(400, { error: error.message })
    return respond(200, { userId })
  }

  return respond(400, { error: 'Unsupported staff-management operation.' })
})
