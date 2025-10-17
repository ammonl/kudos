import { format } from 'date-fns'
import { AlertTriangle, Award, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface KudosCardProps {
    kudos: {
        id: string
        message: string | null
        gif_url: string | null
        created_at: string
        giver_id: string
        categories: {
            name: string
        }
        giver: {
            name: string
            id: string
        }
        kudos_recipients: Array<{
            users: {
                name: string
                id: string
            }
        }>
    }
    isAdmin?: boolean
}

export function KudosCard({ kudos, isAdmin }: KudosCardProps) {
    const { user } = useAuth()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const queryClient = useQueryClient()

    const recipients = kudos.kudos_recipients
        .map(r => r.users.id === user?.id ? 'You' : r.users.name)
        .join(', ')

    const deleteKudos = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('kudos')
                .delete()
                .eq('id', kudos.id)

            if (error) throw error
        },
        onSuccess: () => {
            // Invalidate all relevant kudos queries
            queryClient.invalidateQueries({ queryKey: ['kudos'] })
            queryClient.invalidateQueries({ queryKey: ['kudos-given'] })
            queryClient.invalidateQueries({ queryKey: ['kudos-received'] })
            queryClient.invalidateQueries({ queryKey: ['kudos-stats-monthly'] })
            toast.success('Kudos deleted successfully')
            setShowDeleteConfirm(false)
        },
        onError: (error) => {
            toast.error('Failed to delete kudos: ' + error.message)
        }
    })

    const isCurrentUserGiver = user?.id === kudos.giver_id

    return (
        <>
            <Link
                to={`/kudos/${kudos.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
                <div className="p-6">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <div
                                className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                                <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400"/>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        To: <span className="text-indigo-600 dark:text-indigo-400">{recipients}</span>
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        From: {isCurrentUserGiver ? 'You' : kudos.giver.name}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(kudos.created_at), 'MMM d, yyyy')}
                  </span>
                                    {(isCurrentUserGiver || isAdmin) && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                setShowDeleteConfirm(true)
                                            }}
                                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-full"
                                        >
                                            <Trash2 className="h-4 w-4"/>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="mt-1">
                <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                  {kudos.categories.name}
                </span>
                            </p>
                            {kudos.message && (
                                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                    {kudos.message}
                                </p>
                            )}
                            {kudos.gif_url && (
                                <div className="mt-3">
                                    <img
                                        src={kudos.gif_url}
                                        alt="Kudos GIF"
                                        className="rounded-md max-h-64 mx-auto"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Link>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <div
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400"/>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                            Delete Kudos
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                            Are you sure you want to delete this kudos? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteKudos.mutate()}
                                disabled={deleteKudos.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {deleteKudos.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}