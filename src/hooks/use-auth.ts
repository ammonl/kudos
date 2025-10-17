import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { signInWithGoogle, signOut } from '../lib/auth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useAuth() {
    const queryClient = useQueryClient()

    const { data: authUser, isLoading: authLoading } = useQuery({
        queryKey: ['authUser'],
        queryFn: async () => {
            // First check if we have an existing session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            if (sessionError) throw sessionError

            // If we have a session, get the user
            if (session) {
                const { data: { user }, error } = await supabase.auth.getUser()
                if (error) throw error
                return user
            }

            return null
        },
        staleTime: 1000 * 60 * 5, // Keep fresh for 5 minutes
        cacheTime: 1000 * 60 * 30, // Cache for 30 minutes
    })

    const { data: dbUser, isLoading: dbLoading } = useQuery({
        queryKey: ['dbUser', authUser?.email],
        queryFn: async () => {
            if (!authUser?.email) return null

            // First try to find an existing user with this email
            const { data: existingUser, error: existingError } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .maybeSingle()

            if (existingError && existingError.code !== 'PGRST116') throw existingError

            // If user exists and is a placeholder, update it with Google ID
            if (existingUser?.is_placeholder) {
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({
                        google_id: authUser.id,
                        is_placeholder: false
                    })
                    .eq('id', existingUser.id)
                    .select()
                    .single()

                if (updateError) throw updateError
                return updatedUser
            }

            // If user exists and is not a placeholder, return it
            if (existingUser && !existingUser.is_placeholder) {
                return existingUser
            }

            return null
        },
        enabled: !!authUser?.email,
        staleTime: 1000 * 60 * 5, // Keep fresh for 5 minutes
        cacheTime: 1000 * 60 * 30, // Cache for 30 minutes
    })

    const login = useMutation({
        mutationFn: signInWithGoogle,
        onError: (error) => {
            toast.error('Failed to sign in with Google')
            console.error(error)
        },
    })

    const logout = useMutation({
        mutationFn: signOut,
        onSuccess: () => {
            queryClient.setQueryData(['authUser'], null)
            queryClient.setQueryData(['dbUser'], null)
            toast.success('Signed out successfully')
        },
        onError: (error) => {
            toast.error('Failed to sign out')
            console.error(error)
        },
    })

    const deleteAccount = useMutation({
        mutationFn: async () => {
            if (!dbUser) throw new Error('No user to delete')

            // First delete the database user
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', dbUser.id)

            if (deleteError) throw deleteError

            // Then sign out the user
            await signOut()

            return { success: true }
        },
        onSuccess: () => {
            // Clear all user data from cache
            queryClient.setQueryData(['authUser'], null)
            queryClient.setQueryData(['dbUser'], null)
            queryClient.clear()

            toast.success('Your account has been deleted')
        },
        onError: (error) => {
            toast.error('Failed to delete account: ' + error.message)
        }
    })

    return {
        user: dbUser,
        authUser,
        isLoading: authLoading || dbLoading,
        login: login.mutate,
        logout: logout.mutate,
        deleteAccount: deleteAccount.mutate,
        isAuthenticated: !!authUser,
    }
}