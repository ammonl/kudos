import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/use-auth'
import { supabase } from '../lib/supabase'
import { KudosCard } from './KudosCard'
import { Award, Gift, Star, TrendingUp } from 'lucide-react'
import { Header } from './Header'

export function MyKudos() {
    const { user } = useAuth()

    const { data: monthlyStats, isLoading: statsLoading } = useQuery({
        queryKey: ['kudos-stats-monthly', user?.id],
        queryFn: async () => {
            if (!user) return null
            const { data, error } = await supabase
                .from('kudos_stats_monthly')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!user
    })

    const { data: topRecipient } = useQuery({
        queryKey: ['top-kudos-recipient', user?.id],
        queryFn: async () => {
            if (!user) return null
            const { data, error } = await supabase
                .from('top_kudos_recipients')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error
            return data
        },
        enabled: !!user
    })

    const { data: receivedKudos = [], isLoading: receivedLoading } = useQuery({
        queryKey: ['kudos-received', user?.id],
        queryFn: async () => {
            if (!user) return []

            // Get kudos where user is a recipient
            const { data: kudosData = [], error } = await supabase
                .from('kudos_recipients')
                .select(`
          kudos:kudos (
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
          )
        `)
                .eq('recipient_id', user.id)
                .order('kudos(created_at)', { ascending: false })
                .limit(5)

            if (error) throw error

            return kudosData.map(k => k.kudos).filter(Boolean)
        },
        enabled: !!user
    })

    const { data: givenKudos = [], isLoading: givenLoading } = useQuery({
        queryKey: ['kudos-given', user?.id],
        queryFn: async () => {
            if (!user) return []
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
                .eq('giver_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) throw error
            return data
        },
        enabled: !!user
    })

    const isLoading = statsLoading || receivedLoading || givenLoading

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"/>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header/>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Award className="h-6 w-6 text-indigo-600 dark:text-indigo-400"/>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Kudos Received
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {monthlyStats?.kudos_received || 0}
                                            </div>
                                            <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                                this month
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Gift className="h-6 w-6 text-indigo-600 dark:text-indigo-400"/>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Kudos Given
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {monthlyStats?.kudos_given || 0}
                                            </div>
                                            <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                                this month
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400"/>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Total Points
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {monthlyStats?.total_points || 0}
                                            </div>
                                            <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                                this month
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Special Recognition */}
                {topRecipient && (
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg mb-8">
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <Star className="h-6 w-6 text-yellow-500"/>
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Special Recognition
                                </h2>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                You've received the most kudos in the <span
                                className="font-medium text-indigo-600 dark:text-indigo-400">{topRecipient.top_category}</span> category
                                with {topRecipient.category_count} kudos this month!
                            </p>
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Received Kudos */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Recent Kudos Received
                        </h2>
                        {receivedKudos.length > 0 ? (
                            receivedKudos.map((kudos) => (
                                <KudosCard key={kudos.id} kudos={kudos}/>
                            ))
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                                <p className="text-gray-500 dark:text-gray-400">No kudos received yet</p>
                            </div>
                        )}
                    </div>

                    {/* Given Kudos */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Recent Kudos Given
                        </h2>
                        {givenKudos.length > 0 ? (
                            givenKudos.map((kudos) => (
                                <KudosCard key={kudos.id} kudos={kudos}/>
                            ))
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                                <p className="text-gray-500 dark:text-gray-400">No kudos given yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}