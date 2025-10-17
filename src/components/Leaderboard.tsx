import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Award, Crown, Heart, Medal, Rocket, Star, TrendingUp, Trophy } from 'lucide-react'
import { Header } from './Header'

type TimeRange = 'weekly' | 'monthly'

type KudosStats = {
    user_id: string
    name: string
    kudos_given: number
    kudos_received: number
    total_points: number
    period: string
}

type TopRecipient = {
    user_id: string
    name: string
    top_category: string
    category_count: number
}

type SpecialRecognition = {
    title: string
    description: string
    icon: typeof Trophy | typeof Heart | typeof Rocket | typeof Medal | typeof Star | typeof Award
    color: string
    darkColor: string
}

export function Leaderboard() {
    const [timeRange, setTimeRange] = useState<TimeRange>('monthly')

    const { data: weeklyStats = [], isLoading: weeklyLoading } = useQuery({
        queryKey: ['kudos-stats', 'weekly'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('kudos_stats_weekly')
                .select('*')

            if (error) throw error
            return data as KudosStats[]
        }
    })

    const { data: monthlyStats = [], isLoading: monthlyLoading } = useQuery({
        queryKey: ['kudos-stats', 'monthly'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('kudos_stats_monthly')
                .select('*')

            if (error) throw error
            return data as KudosStats[]
        }
    })

    const { data: topRecipients = [], isLoading: recipientsLoading } = useQuery({
        queryKey: ['top-recipients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('top_kudos_recipients')
                .select('*')
                .limit(3)

            if (error) throw error
            return data as TopRecipient[]
        }
    })

    const isLoading = weeklyLoading || monthlyLoading || recipientsLoading

    // Calculate all special recognitions
    const specialRecognitions = (() => {
        const recognitions: SpecialRecognition[] = []

        // Add top category recipients
        topRecipients.forEach((recipient, index) => {
            recognitions.push({
                title: recipient.name,
                description: `Top performer in ${recipient.top_category} with ${recipient.category_count} kudos`,
                icon: index === 0 ? Trophy : index === 1 ? Medal : Award,
                color: index === 0 ? 'yellow-500' : index === 1 ? 'gray-400' : 'amber-600',
                darkColor: index === 0 ? 'yellow-400' : index === 1 ? 'gray-300' : 'amber-500'
            })
        })

        // Add weekly recognitions
        if (weeklyStats.length > 0) {
            const topWeeklyGiver = weeklyStats.reduce((max, curr) =>
                curr.kudos_given > max.kudos_given ? curr : max
            )

            const topWeeklyReceiver = weeklyStats.reduce((max, curr) =>
                curr.kudos_received > max.kudos_received ? curr : max
            )

            // If same person is top giver and receiver for the week
            if (topWeeklyGiver.user_id === topWeeklyReceiver.user_id &&
                topWeeklyGiver.kudos_given > 0 && topWeeklyReceiver.kudos_received > 0) {
                recognitions.push({
                    title: `${topWeeklyGiver.name}`,
                    description: `Most Active This Week: Gave ${topWeeklyGiver.kudos_given} kudos and received ${topWeeklyReceiver.kudos_received} kudos`,
                    icon: Crown,
                    color: 'yellow-500',
                    darkColor: 'yellow-400'
                })
            } else {
                if (topWeeklyGiver.kudos_given > 0) {
                    recognitions.push({
                        title: `${topWeeklyGiver.name}`,
                        description: `Most Generous This Week: Gave ${topWeeklyGiver.kudos_given} kudos`,
                        icon: Heart,
                        color: 'red-500',
                        darkColor: 'red-400'
                    })
                }

                if (topWeeklyReceiver.kudos_received > 0) {
                    recognitions.push({
                        title: `${topWeeklyReceiver.name}`,
                        description: `Most Appreciated This Week: Received ${topWeeklyReceiver.kudos_received} kudos`,
                        icon: Star,
                        color: 'amber-500',
                        darkColor: 'amber-400'
                    })
                }
            }
        }

        // Add monthly recognitions (only if different from weekly)
        if (monthlyStats.length > 0) {
            const topMonthlyGiver = monthlyStats.reduce((max, curr) =>
                curr.kudos_given > max.kudos_given ? curr : max
            )

            const topMonthlyReceiver = monthlyStats.reduce((max, curr) =>
                curr.kudos_received > max.kudos_received ? curr : max
            )

            const weeklyRecognizedIds = recognitions
                .filter(r => r.icon === Heart || r.icon === Star || r.icon === Crown)
                .map(r => r.title)

            if (topMonthlyGiver.kudos_given > 0 &&
                !weeklyRecognizedIds.includes(topMonthlyGiver.name)) {
                recognitions.push({
                    title: `${topMonthlyGiver.name}`,
                    description: `Most Generous This Month: Gave ${topMonthlyGiver.kudos_given} kudos`,
                    icon: Rocket,
                    color: 'indigo-500',
                    darkColor: 'indigo-400'
                })
            }

            if (topMonthlyReceiver.kudos_received > 0 &&
                !weeklyRecognizedIds.includes(topMonthlyReceiver.name) &&
                topMonthlyReceiver.user_id !== topMonthlyGiver.user_id) {
                recognitions.push({
                    title: `${topMonthlyReceiver.name}`,
                    description: `Most Appreciated This Month: Received ${topMonthlyReceiver.kudos_received} kudos`,
                    icon: Medal,
                    color: 'emerald-500',
                    darkColor: 'emerald-400'
                })
            }
        }

        return recognitions
    })()

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header/>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Special Recognition */}
                <div className="mt-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Crown className="h-5 w-5 text-yellow-500 mr-2"/>
                        Special Recognition
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm animate-pulse"
                                >
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                </div>
                            ))
                        ) : specialRecognitions.length > 0 ? (
                            specialRecognitions.map((recognition, index) => {
                                const Icon = recognition.icon
                                return (
                                    <div
                                        key={index}
                                        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-transform duration-200"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                                    {recognition.title}
                                                </h3>
                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                    {recognition.description}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <Icon
                                                    className={`h-6 w-6 text-${recognition.color} dark:text-${recognition.darkColor}`}/>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="col-span-3 text-center py-8 text-gray-500 dark:text-gray-400">
                                No special recognition data available yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Toggle */}
                <div className="mt-12 sm:flex sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                        <TrendingUp className="h-5 w-5 text-indigo-500 dark:text-indigo-400 mr-2"/>
                        Kudos Statistics
                    </h2>
                    <div className="mt-3 sm:mt-0">
                        <div className="inline-flex rounded-md shadow-sm">
                            <button
                                onClick={() => setTimeRange('weekly')}
                                className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:z-10 ${
                                    timeRange === 'weekly'
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setTimeRange('monthly')}
                                className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:z-10 ${
                                    timeRange === 'monthly'
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Table */}
                <div className="mt-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Rank
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Kudos Given
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Kudos Received
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Total Points
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="animate-pulse flex space-x-4">
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (timeRange === 'weekly' ? weeklyStats : monthlyStats).length > 0 ? (
                                (timeRange === 'weekly' ? weeklyStats : monthlyStats).map((stat, index) => (
                                    <tr
                                        key={stat.user_id}
                                        className={index < 3 ? 'bg-gray-50 dark:bg-gray-700/50' : undefined}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            <div className="flex items-center">
                                                {index < 3 && (
                                                    <Star className="h-4 w-4 mr-1 text-yellow-500"/>
                                                )}
                                                #{index + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {stat.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {stat.kudos_given}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {stat.kudos_received}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                            {stat.total_points}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 text-center"
                                    >
                                        No statistics available for this time period
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Points System Explanation */}
                <div
                    className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Points System
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <div
                                    className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                    <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400"/>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Giving Kudos
                                </p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    1 point for each kudos given
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <div
                                    className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                    <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400"/>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Receiving Kudos
                                </p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    3 points for each kudos received
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}