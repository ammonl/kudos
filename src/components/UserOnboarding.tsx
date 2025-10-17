import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Bell, Mail, Monitor, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '../hooks/use-theme'

interface UserFormData {
    name: string
    email: string
    managerId: string | null
    settings: {
        notifyByEmail: boolean
        reminderOptIn: boolean
    }
}

export function UserOnboarding({
                                   initialData,
                                   onComplete,
                                   userId
                               }: {
    initialData: { name: string; email: string; managerId: string | null }
    onComplete: () => void
    userId: string
}) {
    const queryClient = useQueryClient()
    const { theme, setTheme } = useTheme()
    const [formData, setFormData] = useState<UserFormData>({
        name: initialData.name,
        email: initialData.email,
        managerId: initialData.managerId,
        settings: {
            notifyByEmail: true,
            reminderOptIn: false
        }
    })

    // Fetch all users for manager selection
    const { data: users = [] } = useQuery({
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

    // Filter out the current user from the manager options
    const availableManagers = users.filter(u => u.id !== userId)

    // Update user mutation
    const updateUser = useMutation({
        mutationFn: async (data: UserFormData) => {
            // Get the current auth user to get their Google ID
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) throw new Error('Not authenticated')

            // Update the placeholder user record
            const { error: userError } = await supabase
                .from('users')
                .update({
                    name: data.name,
                    manager_id: data.managerId,
                    is_placeholder: false,
                    google_id: authUser.id // Use the actual Google ID from auth
                })
                .eq('id', userId)

            if (userError) throw userError

            // Update settings
            const { error: settingsError } = await supabase
                .from('settings')
                .update({
                    notify_by_email: data.settings.notifyByEmail,
                    reminder_opt_in: data.settings.reminderOptIn
                })
                .eq('user_id', userId)

            if (settingsError) throw settingsError

            return { status: 'success' }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('Profile created successfully!')
            onComplete()
        },
        onError: (error) => {
            toast.error('Failed to create profile: ' + error.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateUser.mutate(formData)
    }

    return (
        <div
            className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Complete Your Profile
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Let's get to know you better
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="name"
                                   className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Full Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="email"
                                   className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                disabled
                                value={formData.email}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="manager"
                                   className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select Your Manager
                            </label>
                            <select
                                id="manager"
                                value={formData.managerId || ''}
                                onChange={(e) => setFormData({ ...formData, managerId: e.target.value || null })}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">No Manager</option>
                                {availableManagers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                You can select "No Manager" if your manager isn't listed or if you don't want to select
                                one
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Theme
                                </label>
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setTheme('light')}
                                        className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                                            theme === 'light'
                                                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <Sun className="h-4 w-4"/>
                                        <span>Light</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTheme('dark')}
                                        className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                                            theme === 'dark'
                                                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <Moon className="h-4 w-4"/>
                                        <span>Dark</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTheme('system')}
                                        className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                                            theme === 'system'
                                                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <Monitor className="h-4 w-4"/>
                                        <span>System</span>
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {theme === 'system'
                                    ? 'Using your system preference for light or dark mode'
                                    : `Using ${theme} mode`}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notification Preferences</h3>
                        <div className="space-y-3">
                            <label className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={formData.settings.notifyByEmail}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        settings: {
                                            ...formData.settings,
                                            notifyByEmail: e.target.checked
                                        }
                                    })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <Mail className="h-5 w-5 text-gray-400"/>
                                <span
                                    className="text-sm text-gray-700 dark:text-gray-200">Receive email notifications</span>
                            </label>

                            <label className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={formData.settings.reminderOptIn}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        settings: {
                                            ...formData.settings,
                                            reminderOptIn: e.target.checked
                                        }
                                    })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <Bell className="h-5 w-5 text-gray-400"/>
                                <span className="text-sm text-gray-700 dark:text-gray-200">Receive periodic reminders to give kudos</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={updateUser.isPending}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {updateUser.isPending ? 'Creating Profile...' : 'Complete Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}