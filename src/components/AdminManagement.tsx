import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { AlertTriangle, Search, UserMinus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

export function AdminManagement() {
    const [searchQuery, setSearchQuery] = useState('')
    const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
    const queryClient = useQueryClient()

    // Fetch all users 
    const { data: users = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email')
                .order('name')

            if (error) throw error
            return data
        }
    })

    // Fetch admin users
    const { data: adminUsers = [], isLoading: loadingAdmins } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'admin_users')
                .single()

            if (error) throw error
            return JSON.parse(data.value) as string[]
        }
    })

    // Add admin mutation
    const addAdmin = useMutation({
        mutationFn: async (userId: string) => {
            const newAdmins = [...adminUsers, userId]
            const { error } = await supabase
                .from('app_settings')
                .update({ value: JSON.stringify(newAdmins) })
                .eq('key', 'admin_users')

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
            toast.success('Admin added successfully')
        },
        onError: (error) => {
            toast.error('Failed to add admin: ' + error.message)
        }
    })

    // Remove admin mutation
    const removeAdmin = useMutation({
        mutationFn: async (userId: string) => {
            const newAdmins = adminUsers.filter(id => id !== userId)
            const { error } = await supabase
                .from('app_settings')
                .update({ value: JSON.stringify(newAdmins) })
                .eq('key', 'admin_users')

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
            toast.success('Admin removed successfully')
            setShowRemoveConfirm(null)
        },
        onError: (error) => {
            toast.error('Failed to remove admin: ' + error.message)
        }
    })

    // Filter users based on search
    const filteredUsers = users.filter(user => {
        const searchLower = searchQuery.toLowerCase()
        return (
            user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
        )
    })

    if (loadingUsers || loadingAdmins) {
        return (
            <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Manage Administrators
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"/>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => {
                        const isAdmin = adminUsers.includes(user.id)
                        return (
                            <li
                                key={user.id}
                                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {user.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {user.email}
                                    </p>
                                </div>
                                <div>
                                    {isAdmin ? (
                                        <button
                                            onClick={() => setShowRemoveConfirm(user.id)}
                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                                        >
                                            <UserMinus className="h-4 w-4 mr-1.5"/>
                                            Remove Admin
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => addAdmin.mutate(user.id)}
                                            disabled={addAdmin.isPending}
                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                        >
                                            <UserPlus className="h-4 w-4 mr-1.5"/>
                                            Make Admin
                                        </button>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>

            {/* Remove Admin Confirmation Modal */}
            {showRemoveConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <div
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400"/>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                            Remove Administrator
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                            Are you sure you want to remove this user's admin privileges?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowRemoveConfirm(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => removeAdmin.mutate(showRemoveConfirm)}
                                disabled={removeAdmin.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {removeAdmin.isPending ? 'Removing...' : 'Remove Admin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}