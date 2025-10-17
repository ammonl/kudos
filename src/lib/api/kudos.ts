import { supabase } from '../supabase'
import { z } from 'zod'

// Validation schemas
export const createKudosSchema = z.object({
    recipientIds: z.array(z.string().uuid()).min(1),
    categoryId: z.string().uuid(),
    message: z.string().min(1),
    imageUrl: z.string().url().optional(),
    giverId: z.string().uuid(),
    notifyManager: z.boolean().default(false),
    additionalNotifiedUsers: z.array(z.string().uuid()).optional()
})

export type CreateKudosInput = z.infer<typeof createKudosSchema>

export async function createKudos(input: CreateKudosInput) {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    // Create the kudos record without recipient_id
    const { data: kudos, error: kudosError } = await supabase
        .from('kudos')
        .insert({
            giver_id: input.giverId,
            category_id: input.categoryId,
            message: input.message,
            gif_url: input.imageUrl,
            notify_manager: input.notifyManager
        })
        .select()
        .single()

    if (kudosError) throw kudosError

    // Add all recipients to kudos_recipients table
    const { error: recipientsError } = await supabase
        .from('kudos_recipients')
        .insert(
            input.recipientIds.map(recipientId => ({
                kudos_id: kudos.id,
                recipient_id: recipientId
            }))
        )

    if (recipientsError) throw recipientsError

    // Add notifications for additional users
    if (input.additionalNotifiedUsers?.length) {
        const { error: notificationsError } = await supabase
            .from('kudos_notifications')
            .insert(
                input.additionalNotifiedUsers.map(userId => ({
                    kudos_id: kudos.id,
                    user_id: userId
                }))
            )

        if (notificationsError) throw notificationsError
    }

    return kudos
}

export async function getKudosFeed(page = 1) {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const limit = 10
    const offset = (page - 1) * limit

    const { data: kudos, error } = await supabase
        .from('kudos')
        .select(`
      id,
      message,
      gif_url,
      created_at,
      giver_id,
      categories (
        name
      ),
      giver:users!kudos_giver_id_fkey (
        name,
        id
      ),
      kudos_recipients (
        users (
          name,
          id
        )
      )
    `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) throw error
    return kudos
}

export async function getLeaderboard() {
    const { data, error } = await supabase
        .from('leaderboard')
        .select(`
      points,
      users (
        name
      )
    `)
        .order('points', { ascending: false })
        .limit(10)

    if (error) throw error
    return data
}

export async function deleteKudos(kudosId: string) {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('kudos')
        .delete()
        .eq('id', kudosId)

    if (error) throw error
    return { status: 'success' }
}

export async function updateKudos(
    kudosId: string,
    { message, categoryId }: { message: string; categoryId: string }
) {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('kudos')
        .update({ message, category_id: categoryId })
        .eq('id', kudosId)

    if (error) throw error
    return { status: 'success' }
}