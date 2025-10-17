import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useUserSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('settings')
                .select(`
          *,
          users!inner (
            name,
            manager_id
          )
        `)
                .eq('user_id', user.id)
                .single()

            if (error) throw error
            return {
                ...data,
                name: data.users.name,
                managerId: data.users.manager_id
            }
        }
    })
}

export function useUpdateSettings() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: {
            name?: string
            managerId?: string | null
            settings?: {
                notifyByEmail?: boolean
                notifyBySlack?: boolean
                reminderOptIn?: boolean
            }
        }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get the internal user ID first
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('google_id', user.id)
                .single()

            if (userError) throw userError

            const { data, error } = await supabase.rpc('update_user_settings', {
                p_user_id: userData.id,
                p_name: input.name,
                p_manager_id: input.managerId,
                p_notify_by_email: input.settings?.notifyByEmail,
                p_notify_by_slack: input.settings?.notifyBySlack,
                p_reminder_opt_in: input.settings?.reminderOptIn
            })

            if (error) throw error
            return data
        },
        onSuccess: () => {
            // Invalidate all related queries to ensure UI updates
            queryClient.invalidateQueries({ queryKey: ['settings'] })
            queryClient.invalidateQueries({ queryKey: ['dbUser'] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('Settings updated successfully!')
        },
        onError: (error) => {
            toast.error('Failed to update settings: ' + error.message)
        }
    })
}