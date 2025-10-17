import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Header } from './Header'
import { KudosCard } from './KudosCard'
import { Search } from 'lucide-react'
import { AdminManagement } from './AdminManagement'
import { UserManagement } from './UserManagement'

export function AdminPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<'kudos' | 'users' | 'admins'>('kudos')
    const queryClient = useQueryClient()

    // Check if user is admin
    const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
        queryKey: ['isAdmin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('is_admin')

            if (error) throw error
            return data
        }
    })

    // Fetch all kudos
    const { data: kudos = [], isLoading: loadingKudos } = useQuery({
        queryKey: ['kudos', 'admin'],
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
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: isAdmin && activeTab === 'kudos'
    })

    // Filter kudos based on search
    const filteredKudos = kudos.filter(kudos => {
        const searchLower = searchQuery.toLowerCase()
        return (
            kudos.message?.toLowerCase().includes(searchLower) ||
            kudos.giver.name.toLowerCase().includes(searchLower) ||
            kudos.kudos_recipients.some(r =>
                r.users.name.toLowerCase().includes(searchLower)
            ) ||
            kudos.categories.name.toLowerCase().includes(searchLower)
        )
    })

    if (checkingAdmin) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Header/>
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Header/>
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Access Denied
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            You do not have permission to access this page.
                        </p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header/>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Tab Navigation */}
                <div className="mb-6">
                    <nav className="flex space-x-4">
                        <button
                            onClick={() => setActiveTab('kudos')}
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                activeTab === 'kudos'
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            Manage Kudos
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                activeTab === 'users'
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            Manage Users
                        </button>
                        <button
                            onClick={() => setActiveTab('admins')}
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                activeTab === 'admins'
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            Manage Admins
                        </button>
                    </nav>
                </div>

                {/* Content Sections */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    {activeTab === 'kudos' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Manage Kudos
                                </h2>
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"/>
                                    <input
                                        type="text"
                                        placeholder="Search kudos..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {loadingKudos ? (
                                    [...Array(3)].map((_, i) => (
                                        <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-6">
                                            <div className="flex space-x-4">
                                                <div className="flex-1 space-y-4 py-1">
                                                    <div
                                                        className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                                    <div className="space-y-2">
                                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                        <div
                                                            className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : filteredKudos.length > 0 ? (
                                    filteredKudos.map((kudos) => (
                                        <KudosCard key={kudos.id} kudos={kudos} isAdmin={true}/>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400">No kudos found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && <UserManagement/>}
                    {activeTab === 'admins' && <AdminManagement/>}
                </div>
            </main>
        </div>
    )
}