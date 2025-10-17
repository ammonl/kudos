import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { AlertTriangle, Check, Pencil, Search, Shield, Trash2, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { z } from 'zod'

const createUserSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    name: z.string().min(1, 'Please enter a name'),
    manager_id: z.string().uuid().nullable(),
    is_admin: z.boolean()
})

type CreateUserInput = z.infer<typeof createUserSchema>

interface EditingUser {
    id: string
    name: string
    manager_id: string | null
}

export function UserManagement() {
    const [searchQuery, setSearchQuery] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingUser, setEditingUser] = useState<EditingUser | null>(null)
    const [newUser, setNewUser] = useState<CreateUserInput>({
        email: '',
        name: '',
        manager_id: null,
        is_admin: false
    })
    const queryClient = useQueryClient()

    // Fetch all users
    const { data: users = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, manager_id, is_placeholder, google_id')
                .order('name')

            if (error) throw error
            return data
        }
    })

    // Fetch admin users for notifications
    const { data: adminUsers = [], isLoading: loadingAdmins } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: async () => {
            const { data: settingData, error: settingError } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'admin_users')
                .single()

            if (settingError) throw settingError

            const adminIds = JSON.parse(settingData.value)

            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', adminIds)

            if (usersError) throw usersError
            return users
        }
    })

    // Create user mutation
    const createUser = useMutation({
        mutationFn: async (data: CreateUserInput) => {
            // First create the user
            const { data: user, error: userError } = await supabase
                .from('users')
                .insert({
                    email: data.email,
                    name: data.name,
                    manager_id: data.manager_id,
                    is_placeholder: true
                })
                .select()
                .single()

            if (userError) throw userError

            // If user should be admin, add them to admin users
            if (data.is_admin) {
                const newAdmins = [...adminUsers.map(admin => admin.id), user.id]
                const { error: adminError } = await supabase
                    .from('app_settings')
                    .update({ value: JSON.stringify(newAdmins) })
                    .eq('key', 'admin_users')

                if (adminError) throw adminError
            }

            return user
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
            toast.success('User created successfully')
            setShowCreateModal(false)
            setNewUser({
                email: '',
                name: '',
                manager_id: null,
                is_admin: false
            })
        },
        onError: (error) => {
            toast.error('Failed to create user: ' + error.message)
        }
    })

    // Update user mutation
    const updateUser = useMutation({
        mutationFn: async (data: EditingUser) => {
            const { error } = await supabase
                .from('users')
                .update({
                    name: data.name,
                    manager_id: data.manager_id
                })
                .eq('id', data.id)

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('User updated successfully')
            setEditingUser(null)
        },
        onError: (error) => {
            toast.error('Failed to update user: ' + error.message)
        }
    })

    // Delete user mutation
    const deleteUser = useMutation({
        mutationFn: async (userId: string) => {
            // Check if user is an admin
            const isAdmin = adminUsers.some(admin => admin.id === userId)
            if (isAdmin) {
                throw new Error('Cannot delete an admin user. Remove admin privileges first.')
            }

            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('User deleted successfully')
            setShowDeleteConfirm(null)
        },
        onError: (error) => {
            toast.error(error.message)
            setShowDeleteConfirm(null)
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

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault()
        try {
            createUserSchema.parse(newUser)
            createUser.mutate(newUser)
        } catch (error) {
            if (error instanceof z.ZodError) {
                toast.error(error.errors[0].message)
            }
        }
    }

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingUser) {
            updateUser.mutate(editingUser)
        }
    }

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
                    Manage Users
                </h2>
                <div className="flex items-center space-x-4">
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
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <UserPlus className="h-4 w-4 mr-2"/>
                        Add User
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => {
                        const isAdmin = adminUsers.some(admin => admin.id === user.id)
                        const isEditing = editingUser?.id === user.id

                        return (
                            <li
                                key={user.id}
                                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                                {isEditing ? (
                                    <form onSubmit={handleUpdateUser} className="flex-1 flex items-center space-x-4">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={editingUser.name}
                                                onChange={(e) => setEditingUser({
                                                    ...editingUser,
                                                    name: e.target.value
                                                })}
                                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="Name"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <select
                                                value={editingUser.manager_id || ''}
                                                onChange={(e) => setEditingUser({
                                                    ...editingUser,
                                                    manager_id: e.target.value || null
                                                })}
                                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="">No Manager</option>
                                                {users.filter(u => u.id !== user.id).map((u) => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                type="submit"
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                <Check className="h-4 w-4 mr-2"/>
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingUser(null)}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                            >
                                                <X className="h-4 w-4 mr-2"/>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {user.name}
                                                {user.is_placeholder && (
                                                    <span
                                                        className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                            Placeholder
                          </span>
                                                )}
                                                {isAdmin && (
                                                    <span
                                                        className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                            <Shield className="h-3 w-3 mr-1"/>
                            Admin
                          </span>
                                                )}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {user.email}
                                            </p>
                                            {user.manager_id && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Manager: {users.find(u => u.id === user.manager_id)?.name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setEditingUser({
                                                    id: user.id,
                                                    name: user.name,
                                                    manager_id: user.manager_id
                                                })}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                <Pencil className="h-4 w-4 mr-2"/>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(user.id)}
                                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                                                    isAdmin
                                                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                                                        : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                                                }`}
                                                disabled={isAdmin}
                                                title={isAdmin ? 'Cannot delete admin users' : 'Delete user'}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2"/>
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Add New User
                        </h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Manager
                                </label>
                                <select
                                    value={newUser.manager_id || ''}
                                    onChange={(e) => setNewUser(prev => ({
                                        ...prev,
                                        manager_id: e.target.value || null
                                    }))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">No Manager</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_admin"
                                    checked={newUser.is_admin}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, is_admin: e.target.checked }))}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900 dark:text-white">
                                    Make this user an admin
                                </label>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createUser.isPending}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {createUser.isPending ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <div
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400"/>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                            Delete User
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                            Are you sure you want to delete this user? This action will permanently delete all their
                            data.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteUser.mutate(showDeleteConfirm)}
                                disabled={deleteUser.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}