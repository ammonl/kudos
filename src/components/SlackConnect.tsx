import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Slack } from 'lucide-react'
import toast from 'react-hot-toast'

interface SlackConnectProps {
    userId: string
    slackUserId?: string | null
    onUpdate: () => void
}

export function SlackConnect({ userId, slackUserId, onUpdate }: SlackConnectProps) {
    const [isConnecting, setIsConnecting] = useState(false)
    const queryClient = useQueryClient()

    const connectSlack = useMutation({
        mutationFn: async () => {
            setIsConnecting(true)

            try {
                // Call Slack's OAuth flow
                const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${import.meta.env.VITE_SLACK_CLIENT_ID}&scope=chat:write&user_scope=identity.basic`
                const popup = window.open(slackAuthUrl, 'slack-auth', 'width=600,height=600')

                // Listen for the OAuth callback
                const result = await new Promise<{ code: string }>((resolve, reject) => {
                    window.addEventListener('message', async (event) => {
                        if (event.data?.type === 'slack-oauth-callback') {
                            if (event.data.code) {
                                resolve({ code: event.data.code })
                            } else {
                                reject(new Error('Slack authentication failed'))
                            }
                            popup?.close()
                        }
                    })
                })

                // Exchange the code for Slack user info through our Edge Function
                const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-auth`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({ code: result.code }),
                    }
                )

                if (!response.ok) {
                    throw new Error('Failed to authenticate with Slack')
                }

                const data = await response.json()

                if (!data.success || !data.user) {
                    throw new Error('Failed to get Slack user info')
                }

                // Update user settings with Slack ID
                const { error: updateError } = await supabase
                    .from('settings')
                    .update({
                        slack_user_id: data.user.id,
                        notify_by_slack: true,
                        slack_workspace_id: data.team.id,
                        slack_channel_id: data.user.id // For DMs, this is the user's ID
                    })
                    .eq('user_id', userId)

                if (updateError) throw updateError

                onUpdate()
                toast.success('Successfully connected to Slack!')
            } catch (error) {
                console.error('Slack connection error:', error)
                toast.error('Failed to connect to Slack')
            } finally {
                setIsConnecting(false)
            }
        }
    })

    const disconnectSlack = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('settings')
                .update({
                    slack_user_id: null,
                    notify_by_slack: false,
                    slack_workspace_id: null,
                    slack_channel_id: null
                })
                .eq('user_id', userId)

            if (error) throw error

            onUpdate()
            toast.success('Successfully disconnected from Slack')
        },
        onError: (error) => {
            console.error('Error disconnecting Slack:', error)
            toast.error('Failed to disconnect from Slack')
        }
    })

    return (
        <div
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                    <Slack className="h-6 w-6 text-[#4A154B]"/>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Slack Connection
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {slackUserId
                            ? 'Connected to Slack'
                            : 'Connect your Slack account to receive notifications'}
                    </p>
                </div>
            </div>

            <div>
                {slackUserId ? (
                    <button
                        onClick={() => disconnectSlack.mutate()}
                        disabled={disconnectSlack.isPending}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                    >
                        {disconnectSlack.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                ) : (
                    <button
                        onClick={() => connectSlack.mutate()}
                        disabled={isConnecting}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#4A154B] hover:bg-[#611f64] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A154B] dark:focus:ring-offset-gray-800"
                    >
                        {isConnecting ? 'Connecting...' : 'Connect Slack'}
                    </button>
                )}
            </div>
        </div>
    )
}