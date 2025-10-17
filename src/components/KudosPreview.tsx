import { format } from 'date-fns'
import { Award } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface KudosPreviewProps {
    recipients: { name: string; id: string }[]
    category?: { name: string }
    message: string
    gifUrl?: string
    giverName: string
}

export function KudosPreview({
                                 recipients,
                                 category,
                                 message,
                                 gifUrl,
                                 giverName
                             }: KudosPreviewProps) {
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        async function fetchUser() {
            const { data: { user } } = await supabase.auth.getUser()
            setUserId(user?.id ?? null)
        }

        fetchUser()
    }, [])

    const recipientNames = recipients
        .map(r => r.name)
        .join(', ')

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4">
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
                                    To: <span className="text-indigo-600 dark:text-indigo-400">{recipientNames}</span>
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    From: {giverName}
                                </p>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(), 'MMM d, yyyy')}
              </span>
                        </div>
                        {category && (
                            <p className="mt-1">
                <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                  {category.name}
                </span>
                            </p>
                        )}
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{message}</p>
                        {gifUrl && (
                            <div className="mt-3">
                                <img src={gifUrl} alt="Kudos GIF" className="rounded-md max-h-64 mx-auto"/>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}