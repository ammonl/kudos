import { supabase } from '../supabase'
import { z } from 'zod'

export const updateSettingsSchema = z.object({
    notifications: z.object({
        slack: z.boolean(),
        email: z.boolean()
    }),
    reminderOptIn: z.boolean()
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>

export async function getUserSettings() {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.user.id)
        .single()

    if (error) throw error
    return {
        notifications: {
            slack: data.notify_by_slack,
            email: data.notify_by_email
        },
        reminderOptIn: data.reminder_opt_in
    }
}

export async function updateUserSettings(input: UpdateSettingsInput) {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('settings')
        .upsert({
            user_id: user.user.id,
            notify_by_slack: input.notifications.slack,
            notify_by_email: input.notifications.email,
            reminder_opt_in: input.reminderOptIn
        })

    if (error) throw error
    return { status: 'success' }
}