import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Header } from './Header'
import { KudosCard } from './KudosCard'

export function KudosPage() {
    const { id } = useParams()

    const { data: kudos, isLoading } = useQuery({
        queryKey: ['kudos', id],
        queryFn: async () => {
            const { data, error } = await supabase
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
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!id
    })

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Header/>
                <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-32 bg-white dark:bg-gray-800 rounded-lg"></div>
                    </div>
                </main>
            </div>
        )
    }

    if (!kudos) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Header/>
                <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                        <p className="text-gray-500 dark:text-gray-400">Kudos not found</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header/>
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <KudosCard kudos={kudos}/>
            </main>
        </div>
    )
}