import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { KudosCard } from './KudosCard'
import { Filter, Search } from 'lucide-react'

export function KudosFeed() {
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [selectedRecipient, setSelectedRecipient] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')

    const { data: kudos = [], isLoading } = useQuery({
        queryKey: ['kudos', 'feed'],
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
        }
    })

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .order('name')

            if (error) throw error
            return data
        }
    })

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, manager_id')
                .order('name')

            if (error) throw error
            return data
        }
    })

    const filteredKudos = kudos.filter(kudos => {
        const matchesCategory = !selectedCategory || kudos.categories.name === selectedCategory
        const matchesRecipient = !selectedRecipient ||
            kudos.kudos_recipients.some(r => r.users.name === selectedRecipient)
        const matchesSearch = !searchQuery ||
            kudos.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            kudos.kudos_recipients.some(r => r.users.name.toLowerCase().includes(searchQuery.toLowerCase()))

        return matchesCategory && matchesRecipient && matchesSearch
    })

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"/>
                            <input
                                type="text"
                                placeholder="Search kudos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative min-w-[200px]">
                            <Filter
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"/>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="block w-full pl-10 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.name}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <select
                            value={selectedRecipient}
                            onChange={(e) => setSelectedRecipient(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">All Recipients</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.name}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 animate-pulse">
                                <div className="flex space-x-4">
                                    <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10"></div>
                                    <div className="flex-1 space-y-4 py-1">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredKudos.length > 0 ? (
                    filteredKudos.map((kudos) => (
                        <KudosCard key={kudos.id} kudos={kudos}/>
                    ))
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                        <p className="text-gray-500 dark:text-gray-400">No kudos found</p>
                    </div>
                )}
            </div>
        </div>
    )
}