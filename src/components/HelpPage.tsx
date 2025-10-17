import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, FileText, Mail, Send, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { z } from 'zod'

interface FaqItem {
    question: string
    answer: string
}

const faqs: FaqItem[] = [
    {
        question: "What is Kudos?",
        answer: "Kudos is a platform that allows team members to recognize and appreciate each other's contributions through digital kudos. You can send kudos to colleagues, attach GIFs, and notify their managers about their great work."
    },
    {
        question: "How do I give kudos to someone?",
        answer: "Click the 'Give Kudos' button in the navigation bar. Select one or more recipients, choose a category, write a message (or use our AI-powered suggestions), and optionally add a GIF. You can also choose to notify the recipient's manager."
    },
    {
        question: "Can I send kudos to multiple people?",
        answer: "Yes! When giving kudos, you can select multiple recipients. All selected recipients will receive the kudos notification, and their managers can be notified as well if you choose that option."
    },
    {
        question: "How do points work?",
        answer: "You earn 1 point for each kudos you give and 3 points for each kudos you receive. Points are tracked weekly and monthly, and you can see the leaderboard to compare your standing with others."
    },
    {
        question: "How do notifications work?",
        answer: "You can receive notifications via email and/or Slack when you receive kudos. You can customize your notification preferences in your settings. Managers can also be notified when their team members receive kudos."
    },
    {
        question: "Can I edit or delete kudos?",
        answer: "Users can delete kudos they have sent, but they cannot edit them. Administrators may also delete kudos if necessary to maintain the integrity of the recognition system."
    },
    {
        question: "What are the different kudos categories?",
        answer: "Categories include Innovation, Teamwork, Leadership, Customer Focus, Excellence, and Making Others Great. These categories help highlight different types of contributions and achievements."
    },
    {
        question: "How do I connect Slack for notifications?",
        answer: "Go to your Settings page and look for the Slack Connection section. Click 'Connect Slack' and follow the prompts to authorize the integration. Once connected, you can receive kudos notifications directly in Slack."
    }
]

const requestAccessSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    name: z.string().min(1, 'Please enter your name'),
    message: z.string().min(1, 'Please enter a message')
})

type RequestAccessInput = z.infer<typeof requestAccessSchema>

export function HelpPage() {
    const [openFaqs, setOpenFaqs] = useState<number[]>([])
    const [feedbackMessage, setFeedbackMessage] = useState('')
    const [requestAccess, setRequestAccess] = useState<RequestAccessInput>({
        email: '',
        name: '',
        message: ''
    })

    // Get admin users for notifications
    const { data: adminUsers = [] } = useQuery({
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

    // Submit access request mutation
    const submitAccessRequest = useMutation({
        mutationFn: async (data: RequestAccessInput) => {
            const message = `Access Request:\nName: ${data.name}\nEmail: ${data.email}\nMessage: ${data.message}`

            const { error } = await supabase
                .rpc('create_help_notification', {
                    p_message: message
                })

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Access request submitted successfully')
            setRequestAccess({
                email: '',
                name: '',
                message: ''
            })
        },
        onError: (error) => {
            toast.error('Failed to submit access request: ' + error.message)
        }
    })

    const toggleFaq = (index: number) => {
        setOpenFaqs(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        )
    }

    const handleAccessRequest = (e: React.FormEvent) => {
        e.preventDefault()
        try {
            requestAccessSchema.parse(requestAccess)
            submitAccessRequest.mutate(requestAccess)
        } catch (error) {
            if (error instanceof z.ZodError) {
                toast.error(error.errors[0].message)
            }
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center space-x-8">
                        <Link to="/"
                              className="text-3xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            Kudos
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Help Center
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Welcome to Kudos! This platform helps you recognize and appreciate your colleagues'
                        contributions.
                        Below you'll find answers to common questions and ways to get help.
                    </p>

                    <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Shield className="h-5 w-5 mr-2 text-indigo-500"/>
                            Legal Information
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/terms"
                                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <FileText className="h-4 w-4 mr-2 text-gray-400"/>
                                Terms of Service
                            </Link>
                            <Link
                                to="/privacy"
                                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <FileText className="h-4 w-4 mr-2 text-gray-400"/>
                                Privacy Policy
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Frequently Asked Questions
                        </h2>
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg"
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 rounded-lg"
                                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {faq.question}
                  </span>
                                    {openFaqs.includes(index) ? (
                                        <ChevronUp className="h-5 w-5 text-gray-500"/>
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-500"/>
                                    )}
                                </button>
                                {openFaqs.includes(index) && (
                                    <div className="px-4 pb-3">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {faq.answer}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div id="request-access" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                    <div className="flex items-center space-x-2 mb-4">
                        <Mail className="h-5 w-5 text-indigo-500"/>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Request Access
                        </h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Want to join Kudos? Fill out the form below to request access. Our team will review your
                        request and get back to you soon.
                    </p>
                    <form onSubmit={handleAccessRequest} className="space-y-4">
                        <div>
                            <label htmlFor="name"
                                   className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={requestAccess.name}
                                onChange={(e) => setRequestAccess(prev => ({ ...prev, name: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Your full name"
                            />
                        </div>
                        <div>
                            <label htmlFor="email"
                                   className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={requestAccess.email}
                                onChange={(e) => setRequestAccess(prev => ({ ...prev, email: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="your.email@company.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="message"
                                   className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Message
                            </label>
                            <textarea
                                id="message"
                                value={requestAccess.message}
                                onChange={(e) => setRequestAccess(prev => ({ ...prev, message: e.target.value }))}
                                rows={4}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Tell us why you'd like to join Kudos..."
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitAccessRequest.isPending}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="h-4 w-4 mr-1.5"/>
                                {submitAccessRequest.isPending ? 'Sending...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}