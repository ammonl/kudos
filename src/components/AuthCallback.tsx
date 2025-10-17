import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { UserOnboarding } from './UserOnboarding'
import toast from 'react-hot-toast'

export function AuthCallback() {
    const navigate = useNavigate()

    const { data: authUser, isLoading: authLoading } = useQuery({
        queryKey: ['authUser'],
        queryFn: async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error) throw error
            return user
        }
    })

    const { data: dbUser, isLoading: dbLoading } = useQuery({
        queryKey: ['dbUser', authUser?.email],
        queryFn: async () => {
            if (!authUser?.email) return null
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .maybeSingle()

            if (error && error.code !== 'PGRST116') throw error
            return data
        },
        enabled: !!authUser?.email,
        retry: false
    })

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get the URL hash and convert it to a URLSearchParams object
                const hashParams = new URLSearchParams(
                    window.location.hash.substring(1) // Remove the # character
                )

                // Extract the tokens
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')
                const providerToken = hashParams.get('provider_token')
                const expiresIn = hashParams.get('expires_in')

                if (!accessToken) {
                    console.error('No access token found in URL hash:', window.location.hash)
                    throw new Error('No access token found')
                }

                // Set the session
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken!,
                    provider_token: providerToken!,
                    expires_in: parseInt(expiresIn!)
                })

                if (sessionError) {
                    console.error('Session error:', sessionError)
                    throw sessionError
                }
            } catch (error) {
                console.error('Authentication error:', {
                    error,
                    location: window.location.href,
                    timestamp: new Date().toISOString()
                })
                toast.error('Authentication failed. Please try again.')
                navigate('/?error=auth')
            }
        }

        handleCallback()
    }, [navigate])

    if (authLoading || dbLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"/>
            </div>
        )
    }

    // If no account exists, redirect to help page
    if (authUser && !dbUser) {
        toast.error('Access denied. Please contact an administrator to request access.')
        navigate('/help')
        return null
    }

    // If user exists but is a placeholder, show onboarding
    if (dbUser?.is_placeholder) {
        return (
            <UserOnboarding
                initialData={{
                    name: authUser?.user_metadata.name || '',
                    email: authUser?.user_metadata.email || authUser?.email || '',
                    managerId: dbUser?.manager_id || null
                }}
                onComplete={() => navigate('/')}
                userId={dbUser.id}
            />
        )
    }

    // If user exists and is not a placeholder, redirect to dashboard
    if (dbUser && !dbUser.is_placeholder) {
        navigate('/')
        return null
    }

    return null
}