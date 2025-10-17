const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { code } = await req.json()

        // Exchange the code for access token
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: Deno.env.get('SLACK_CLIENT_ID') || '',
                client_secret: Deno.env.get('SLACK_CLIENT_SECRET') || '',
                code,
            }),
        })

        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for token')
        }

        const tokenData = await tokenResponse.json()

        if (!tokenData.ok) {
            throw new Error(tokenData.error || 'Failed to get access token')
        }

        // Get user identity using the access token
        const identityResponse = await fetch('https://slack.com/api/users.identity', {
            headers: {
                'Authorization': `Bearer ${tokenData.authed_user.access_token}`,
            },
        })

        if (!identityResponse.ok) {
            throw new Error('Failed to get user identity')
        }

        const identityData = await identityResponse.json()

        if (!identityData.ok) {
            throw new Error(identityData.error || 'Failed to get user identity')
        }

        return new Response(
            JSON.stringify({
                success: true,
                user: identityData.user,
                team: identityData.team,
            }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        )
    }
})