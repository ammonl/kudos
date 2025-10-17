import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { AlertTriangle, ArrowLeft, Bell, Mail, Monitor, Moon, Slack, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/use-auth'
import { useTheme } from '../hooks/use-theme'
import { Header } from './Header'
import { SlackConnect } from './SlackConnect'

export function SettingsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const queryClient = useQueryClient()
    const { user, logout, deleteAccount } = useAuth()
    const { theme, setTheme } = useTheme()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isFormDirty, setIsFormDirty] = useState(false)
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState<number | string | null>(null)

    // Fetch current user's data and settings
    const { data: userData, isLoading: userLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            if (!user) throw new Error('Not authenticated')

            // First get the user data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

            if (userError) throw userError

            // Then get the settings data
            const { data: settingsData, error: settingsError } = await supabase
                .from('settings')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (settingsError && settingsError.code !== 'PGRST116') {
                throw settingsError
            }

            return {
                ...userData,
                settings: settingsData || {
                    notify_by_email: true,
                    notify_by_slack: false,
                    reminder_opt_in: true
                }
            }
        },
        enabled: !!user
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
    const availableManagers = users.filter(u => u.id !== user?.id)

    const [formData, setFormData] = useState({
        name: '',
        managerId: null as string | null,
        settings: {
            notifyByEmail: true,
            notifyBySlack: false,
            reminderOptIn: true
        }
    })

    // Update form data when user data is loaded
    useEffect(() => {
        if (userData) {
            setFormData({
                name: userData.name,
                managerId: userData.manager_id,
                settings: {
                    notifyByEmail: userData.settings.notify_by_email,
                    notifyBySlack: userData.settings.notify_by_slack,
                    reminderOptIn: userData.settings.reminder_opt_in
                }
            })
            setIsFormDirty(false)
        }
    }, [userData])

    // Check if form has been modified
    useEffect(() => {
        if (!userData) return;

        const isDirty =
            formData.name !== userData.name ||
            formData.managerId !== userData.manager_id ||
            formData.settings.notifyByEmail !== userData.settings.notify_by_email ||
            formData.settings.notifyBySlack !== userData.settings.notify_by_slack ||
            formData.settings.reminderOptIn !== userData.settings.reminder_opt_in;

        setIsFormDirty(isDirty);
    }, [formData, userData]);

    // Handle navigation within the app
    const handleNavigation = (to: number | string) => {
        if (isFormDirty) {
            setPendingNavigation(to);
            setShowLeaveConfirmation(true);
        } else {
            if (typeof to === 'number') {
                navigate(to);
            } else {
                navigate(to);
            }
        }
    };

    // Intercept navigation links
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');

            if (link &&
                link.getAttribute('href')?.startsWith('/') &&
                !link.getAttribute('href')?.includes('settings') &&
                !link.hasAttribute('data-no-intercept')) {
                e.preventDefault();
                handleNavigation(link.getAttribute('href') || '/');
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [isFormDirty]);

    // Handle browser's back button
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isFormDirty) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isFormDirty]);

    // Update settings mutation
    const updateSettings = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (!user) throw new Error('Not authenticated')

            // First update user record
            const { data: updatedUser, error: userError } = await supabase
                .from('users')
                .update({
                    name: data.name,
                    manager_id: data.managerId
                })
                .eq('id', user.id)
                .select()

            if (userError) throw userError

            // Then upsert settings record
            const { data: updatedSettings, error: settingsError } = await supabase
                .from('settings')
                .upsert({
                    user_id: user.id,
                    notify_by_email: data.settings.notifyByEmail,
                    notify_by_slack: data.settings.notifyBySlack,
                    reminder_opt_in: data.settings.reminderOptIn
                })
                .select()

            if (settingsError) throw settingsError

            // Fetch the updated data from the database
            const { data: verifyUserData, error: verifyUserError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

            if (verifyUserError) throw verifyUserError

            const { data: verifySettingsData, error: verifySettingsError } = await supabase
                .from('settings')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (verifySettingsError) throw verifySettingsError

            return {
                ...verifyUserData,
                settings: verifySettingsData
            }
        },
        onSuccess: (updatedData) => {
            // Update the queries with the new data
            queryClient.setQueryData(['currentUser'], updatedData)

            queryClient.setQueryData(['dbUser', user?.id], {
                ...updatedData,
                settings: undefined
            })

            // Update the form data with the values from the database
            setFormData({
                name: updatedData.name,
                managerId: updatedData.manager_id,
                settings: {
                    notifyByEmail: updatedData.settings.notify_by_email,
                    notifyBySlack: updatedData.settings.notify_by_slack,
                    reminderOptIn: updatedData.settings.reminder_opt_in
                }
            })
            setIsFormDirty(false)

            toast.success('Settings updated successfully!')

            // Navigate back to the previous page
            navigate(-1)
        },
        onError: (error) => {
            toast.error('Failed to update settings: ' + error.message)
        }
    })

    const handleDeleteAccount = async () => {
        try {
            await deleteAccount()
            navigate('/')
        } catch (error) {
            console.error('Error deleting account:', error)
            setShowDeleteConfirm(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateSettings.mutate(formData)
    }

    if (userLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"/>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header/>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <button
                    onClick={() => handleNavigation(-1)}
                    className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-8 group"
                >
                    <ArrowLeft className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1"/>
                    Back
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings & Preferences</h1>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>

                            <div>
                                <label htmlFor="name"
                                       className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Display Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label htmlFor="manager"
                                       className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Manager
                                </label>
                                <select
                                    id="manager"
                                    value={formData.managerId || ''}
                                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value || null })}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">No Manager</option>
                                    <optgroup label="Available Managers">
                                        {availableManagers.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    You can select "No Manager" if your manager isn't listed or if you don't want to
                                    select one
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>

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
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification
                                Preferences</h2>

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
                                    <span className="text-sm text-gray-700 dark:text-gray-200">Receive email notifications</span>
                                </label>

                                <label
                                    className={`flex items-center space-x-3 ${!userData?.settings?.slack_user_id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={userData?.settings?.slack_user_id ? formData.settings.notifyBySlack : false}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: {
                                                ...formData.settings,
                                                notifyBySlack: e.target.checked
                                            }
                                        })}
                                        disabled={!userData?.settings?.slack_user_id}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                                    />
                                    <Slack className="h-5 w-5 text-gray-400"/>
                                    <span className="text-sm text-gray-700 dark:text-gray-200">
                    Receive Slack notifications
                                        {!userData?.settings?.slack_user_id && (
                                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        (Connect Slack to enable)
                      </span>
                                        )}
                  </span>
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

                                <div className="mt-6">
                                    <SlackConnect
                                        userId={user?.id || ''}
                                        slackUserId={userData?.settings?.slack_user_id}
                                        onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['currentUser'] })
                                            // When Slack is disconnected, ensure notifyBySlack is set to false
                                            if (!userData?.settings?.slack_user_id) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    settings: {
                                                        ...prev.settings,
                                                        notifyBySlack: false
                                                    }
                                                }))
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Delete Account
                            </button>

                            <button
                                type="submit"
                                disabled={updateSettings.isPending}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {updateSettings.isPending ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>

                    {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                                <div
                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
                                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400"/>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                                    Delete Account
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                                    Are you sure you want to delete your account? This action cannot be undone and will
                                    permanently delete all your data.
                                </p>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteAccount}
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                                    >
                                        Yes, Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showLeaveConfirmation && (
                        <div
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                                <div
                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 mx-auto mb-4">
                                    <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400"/>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                                    Unsaved Changes
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                                    You have unsaved changes. Are you sure you want to leave this page? Your changes
                                    will be lost.
                                </p>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowLeaveConfirmation(false)}
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLeaveConfirmation(false)
                                            if (pendingNavigation !== null) {
                                                if (typeof pendingNavigation === 'number') {
                                                    navigate(pendingNavigation)
                                                } else {
                                                    navigate(pendingNavigation)
                                                }
                                                setPendingNavigation(null)
                                            }
                                        }}
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                    >
                                        Leave Page
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}