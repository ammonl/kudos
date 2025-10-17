export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            categories: {
                Row: {
                    id: string
                    name: string
                }
                Insert: {
                    id?: string
                    name: string
                }
                Update: {
                    id?: string
                    name?: string
                }
            }
            kudos: {
                Row: {
                    id: string
                    giver_id: string
                    recipient_id: string
                    category_id: string
                    message: string | null
                    gif_url: string | null
                    notify_manager: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    giver_id: string
                    recipient_id: string
                    category_id: string
                    message?: string | null
                    gif_url?: string | null
                    notify_manager?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    giver_id?: string
                    recipient_id?: string
                    category_id?: string
                    message?: string | null
                    gif_url?: string | null
                    notify_manager?: boolean
                    created_at?: string
                }
            }
            kudos_recipients: {
                Row: {
                    kudos_id: string
                    recipient_id: string
                }
                Insert: {
                    kudos_id: string
                    recipient_id: string
                }
                Update: {
                    kudos_id?: string
                    recipient_id?: string
                }
            }
            kudos_notifications: {
                Row: {
                    kudos_id: string
                    user_id: string
                }
                Insert: {
                    kudos_id: string
                    user_id: string
                }
                Update: {
                    kudos_id?: string
                    user_id?: string
                }
            }
            leaderboard: {
                Row: {
                    user_id: string
                    points: number
                    last_updated: string
                }
                Insert: {
                    user_id: string
                    points?: number
                    last_updated?: string
                }
                Update: {
                    user_id?: string
                    points?: number
                    last_updated?: string
                }
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    type: 'KudosReceived' | 'Reminder'
                    channel: 'Slack' | 'Email'
                    sent_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    type: 'KudosReceived' | 'Reminder'
                    channel: 'Slack' | 'Email'
                    sent_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    type?: 'KudosReceived' | 'Reminder'
                    channel?: 'Slack' | 'Email'
                    sent_at?: string
                }
            }
            settings: {
                Row: {
                    user_id: string
                    notify_by_email: boolean
                    notify_by_slack: boolean
                    reminder_opt_in: boolean
                }
                Insert: {
                    user_id: string
                    notify_by_email?: boolean
                    notify_by_slack?: boolean
                    reminder_opt_in?: boolean
                }
                Update: {
                    user_id?: string
                    notify_by_email?: boolean
                    notify_by_slack?: boolean
                    reminder_opt_in?: boolean
                }
            }
            users: {
                Row: {
                    id: string
                    google_id: string
                    name: string
                    email: string
                    manager_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    google_id: string
                    name: string
                    email: string
                    manager_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    google_id?: string
                    name?: string
                    email?: string
                    manager_id?: string | null
                    created_at?: string
                }
            }
        }
    }
}