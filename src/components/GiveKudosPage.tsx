import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCreateKudos } from '../hooks/use-kudos'
import { useAuth } from '../hooks/use-auth'
import { Check, Eye, EyeOff, Image, RefreshCw, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { GifPicker } from './GifPicker'
import { TokenInput } from './TokenInput'
import { generateKudosMessage } from '../lib/openai'
import { KudosPreview } from './KudosPreview'
import { Header } from './Header'
import { useLocation, useNavigate } from 'react-router-dom'

const kudosSchema = z.object({
    recipientIds: z.array(z.string().uuid()).min(1, 'Select at least one recipient'),
    categoryId: z.string().uuid('Select a category'),
    message: z.string().min(1, 'Message is required'),
    notifyManager: z.boolean(),
    additionalNotifiedUsers: z.array(z.string().uuid()).optional(),
    gifUrl: z.string().url().optional()
})

type KudosInput = z.infer<typeof kudosSchema>

const initialFormState: KudosInput = {
    recipientIds: [],
    categoryId: '',
    message: '',
    notifyManager: true,
    additionalNotifiedUsers: [],
    gifUrl: undefined
}

const aiStyles = ['professional', 'casual', 'fun'] as const
const messageStyles = [...aiStyles, 'none'] as const
type MessageStyle = typeof messageStyles[number]

function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>()
    useEffect(() => {
        ref.current = value
    })
    return ref.current
}

export function GiveKudosPage() {
    const { user: currentUser } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [formData, setFormData] = useState<KudosInput>(initialFormState)
    const [keywords, setKeywords] = useState('')
    const [isGifPickerOpen, setIsGifPickerOpen] = useState(false)
    const [userAddedManagerIds, setUserAddedManagerIds] = useState<Set<string>>(new Set())
    const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
    const [messageStyle, setMessageStyle] = useState<MessageStyle>(() => {
        const storedStyle = localStorage.getItem('kudos_message_style')
        if (storedStyle && messageStyles.includes(storedStyle as MessageStyle)) {
            return storedStyle as MessageStyle
        }
        const randomIndex = Math.floor(Math.random() * messageStyles.length)
        return messageStyles[randomIndex]
    })
    const [hasUserEditedMessage, setHasUserEditedMessage] = useState(false)
    const [isAIGenerated, setIsAIGenerated] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [provisionalMessage, setProvisionalMessage] = useState<string | null>(null)
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

    const createKudos = useCreateKudos()

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            if (!currentUser) return []

            const { data, error } = await supabase
                .from('users')
                .select('id, name, manager_id')
                .neq('id', currentUser.id)
                .order('name')

            if (error) throw error
            return data
        },
        enabled: !!currentUser,
        staleTime: 30000,
        gcTime: 5 * 60 * 1000
    })

    const allManagerIdsInOrg = useMemo(() => {
        const managerIds = new Set<string>()
        users.forEach((u) => {
            if (u.manager_id) {
                managerIds.add(u.manager_id)
            }
        })
        return managerIds
    }, [users])

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

    const isFormDirty = () => {
        return formData.recipientIds.length > 0 ||
            formData.categoryId !== '' ||
            formData.message !== '' ||
            formData.gifUrl !== undefined ||
            !formData.notifyManager ||
            (formData.additionalNotifiedUsers?.length || 0) > 0 ||
            keywords !== ''
    }

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isFormDirty()) {
                e.preventDefault()
                e.returnValue = ''
                return e.returnValue
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [formData, keywords])

    const handleNavigation = (to: string) => {
        if (isFormDirty()) {
            setPendingNavigation(to)
            setShowLeaveConfirmation(true)
        } else {
            navigate(to)
        }
    }

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const link = target.closest('a')

            if (link &&
                link.getAttribute('href')?.startsWith('/') &&
                !link.getAttribute('href')?.includes('give-kudos') &&
                !link.hasAttribute('data-no-intercept')) {
                e.preventDefault()
                handleNavigation(link.getAttribute('href') || '/')
            }
        }

        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    const generateMessage = useMutation({
        mutationFn: async () => {
            if (!formData.categoryId || formData.recipientIds.length === 0 || messageStyle === 'none') {
                return null
            }

            const selectedCategory = categories.find(c => c.id === formData.categoryId)
            const selectedRecipients = users.filter(u => formData.recipientIds.includes(u.id))

            if (!selectedCategory || selectedRecipients.length === 0) {
                return null
            }

            return generateKudosMessage({
                recipients: selectedRecipients,
                category: selectedCategory,
                keywords: keywords.trim() || undefined,
                tone: messageStyle
            })
        },
        onSuccess: (message) => {
            if (message) {
                setProvisionalMessage(message)
                setIsAIGenerated(true)
            }
        },
        onError: (error) => {
            toast.error('Failed to generate message: ' + error.message)
        },
        onSettled: () => {
            setIsGeneratingMessage(false)
        }
    })

    useEffect(() => {
        if (
            formData.recipientIds.length > 0 &&
            formData.categoryId &&
            messageStyle !== 'none'
        ) {
            const delay = setTimeout(() => {
                setIsGeneratingMessage(true)
                generateMessage.mutate()
            }, 1000)

            return () => clearTimeout(delay)
        } else if (messageStyle === 'none' && isAIGenerated) {
            setFormData(prev => ({ ...prev, message: '' }))
            setProvisionalMessage(null)
            setIsAIGenerated(false)
        }
    }, [formData.recipientIds, formData.categoryId, messageStyle, keywords])

    const allRecipientManagerIds = useMemo(() => {
        const recipientIdsSet = new Set(formData.recipientIds)
        const managerIds = users
            .filter((u) => recipientIdsSet.has(u.id) && u.manager_id)
            .map((u) => u.manager_id!)
        return [...new Set(managerIds)].filter(
            (id) => id && !recipientIdsSet.has(id) && id !== currentUser?.id
        )
    }, [formData.recipientIds, users, currentUser])

    const prevAllRecipientManagerIds = usePrevious(allRecipientManagerIds)

    useEffect(() => {
        const recipientsSet = new Set(formData.recipientIds)
        const prevAllRecipientManagerIdsSet = new Set(prevAllRecipientManagerIds || [])

        // Users to preserve from the previous list. These are users who were not
        // automatically-added managers in the previous state, OR managers who were
        // explicitly added by the user.
        const manuallyAddedUsers = (formData.additionalNotifiedUsers || []).filter(
            (id) => !prevAllRecipientManagerIdsSet.has(id) || userAddedManagerIds.has(id)
        )

        let nextNotifiedUsersSet = new Set(manuallyAddedUsers)

        if (formData.notifyManager) {
            allRecipientManagerIds.forEach((id) => nextNotifiedUsersSet.add(id))
        }

        // Ensure no recipients are in the notification list
        recipientsSet.forEach((id) => nextNotifiedUsersSet.delete(id))

        const nextNotifiedUsers = Array.from(nextNotifiedUsersSet)

        if (
            JSON.stringify(nextNotifiedUsers) !==
            JSON.stringify(formData.additionalNotifiedUsers)
        ) {
            setFormData((prev) => ({
                ...prev,
                additionalNotifiedUsers: nextNotifiedUsers,
            }))
        }

        setUserAddedManagerIds((prev) => {
            const next = new Set(prev)
            let changed = false
            for (const id of next) {
                if (recipientsSet.has(id)) {
                    next.delete(id)
                    changed = true
                }
            }
            return changed ? next : prev
        })
    }, [
        formData.recipientIds,
        formData.notifyManager,
        allRecipientManagerIds,
        prevAllRecipientManagerIds,
        userAddedManagerIds,
        currentUser?.id,
    ])

    const handleTokensChange = (tokens: { id: string; label: string }[]) => {
        const newNotifiedUserIds = tokens.map((t) => t.id)
        const oldNotifiedUserIds = new Set(formData.additionalNotifiedUsers || [])

        setUserAddedManagerIds((currentAddedManagers) => {
            const next = new Set(currentAddedManagers)
            const newNotifiedUserIdsSet = new Set(newNotifiedUserIds)

            // Add newly added managers to userAddedManagerIds
            for (const id of newNotifiedUserIds) {
                if (!oldNotifiedUserIds.has(id) && allManagerIdsInOrg.has(id)) {
                    next.add(id)
                }
            }

            // Remove managers from userAddedManagerIds if they are no longer in the list
            for (const id of oldNotifiedUserIds) {
                if (!newNotifiedUserIdsSet.has(id) && allManagerIdsInOrg.has(id)) {
                    next.delete(id)
                }
            }
            return next
        })

        setFormData((prev) => ({
            ...prev,
            additionalNotifiedUsers: newNotifiedUserIds,
        }))
    }

    const managerUsers = users.filter((user) =>
        allRecipientManagerIds.includes(user.id)
    )

    const availableNotificationUsers = users.filter(user => {
        const isRecipient = formData.recipientIds.includes(user.id)
        const isAlreadyNotified = formData.additionalNotifiedUsers?.includes(user.id)
        const isCurrentUser = user.id === currentUser?.id

        return !isRecipient && !isAlreadyNotified && !isCurrentUser
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            kudosSchema.parse(formData)

            await createKudos.mutateAsync({
                ...formData,
                imageUrl: formData.gifUrl,
                giverId: currentUser?.id
            })

            setFormData(initialFormState)
            setUserAddedManagerIds(new Set())
            setHasUserEditedMessage(false)
            setProvisionalMessage(null)
            setShowPreview(false)
            setIsAIGenerated(false)
            setKeywords('')
            navigate('/')
        } catch (error) {
            if (error instanceof z.ZodError) {
                toast.error(error.errors[0].message)
            } else {
                toast.error('Failed to create kudos')
                console.error(error)
            }
        }
    }

    const handleReset = () => {
        setFormData(initialFormState)
        setUserAddedManagerIds(new Set())
        setHasUserEditedMessage(false)
        setShowPreview(false)
        setProvisionalMessage(null)
        setIsAIGenerated(false)
        setKeywords('')
    }

    const handleAcceptAIMessage = () => {
        if (provisionalMessage) {
            setFormData(prev => ({ ...prev, message: provisionalMessage }))
            setProvisionalMessage(null)
            setIsAIGenerated(true)
            setHasUserEditedMessage(false)
        }
    }

    const handleRejectAIMessage = () => {
        setProvisionalMessage(null)
        setMessageStyle('none')
        setIsAIGenerated(false)
    }

    const handleRegenerateMessage = () => {
        setIsGeneratingMessage(true)
        generateMessage.mutate()
    }

    const handleMessageStyleChange = (newStyle: MessageStyle) => {
        setMessageStyle(newStyle)
        localStorage.setItem('kudos_message_style', newStyle)
        if (newStyle === 'none' && isAIGenerated) {
            setFormData(prev => ({ ...prev, message: '' }))
            setProvisionalMessage(null)
        }
    }

    const selectedCategory = categories.find(c => c.id === formData.categoryId)
    const canShowPreview = formData.recipientIds.length > 0 && formData.categoryId && formData.message.trim().length > 0

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header/>
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Give Kudos</h1>

                    <div className="min-h-[500px]">
                        {showPreview ? (
                            <div className="space-y-6">
                                <KudosPreview
                                    recipients={users.filter(u => formData.recipientIds.includes(u.id))}
                                    category={categories.find(c => c.id === formData.categoryId)}
                                    message={formData.message}
                                    gifUrl={formData.gifUrl}
                                    giverName={currentUser?.name}
                                />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Recipients *
                                    </label>
                                    <TokenInput
                                        tokens={users
                                            .filter(user => formData.recipientIds.includes(user.id))
                                            .map(user => ({ id: user.id, label: user.name }))
                                        }
                                        onTokensChange={tokens => setFormData(prev => ({
                                            ...prev,
                                            recipientIds: tokens.map(t => t.id)
                                        }))}
                                        suggestions={users
                                            .filter(user => user.id !== currentUser?.id)
                                            .map(user => ({
                                                id: user.id,
                                                label: user.name
                                            }))
                                        }
                                        placeholder="Type to search recipients..."
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Category *
                                    </label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            categoryId: e.target.value
                                        }))}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Keywords (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="What did they do? (e.g., helped with project, solved bug, improved process)"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Message *
                                        </label>
                                        <select
                                            value={messageStyle}
                                            onChange={(e) => handleMessageStyleChange(e.target.value as MessageStyle)}
                                            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="professional">AI Style: Professional</option>
                                            <option value="casual">AI Style: Casual</option>
                                            <option value="fun">AI Style: Fun</option>
                                            <option value="none">No AI Suggestions</option>
                                        </select>
                                    </div>

                                    {provisionalMessage ? (
                                        <div className="mt-1 relative">
                                            <div
                                                className="block w-full px-3 py-2 border border-indigo-300 dark:border-indigo-700 rounded-md shadow-sm bg-indigo-50 dark:bg-indigo-900/50 text-gray-900 dark:text-gray-100">
                                                <div
                                                    className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                                                    <Sparkles className="h-3 w-3"/>
                                                    <span className="text-xs">AI-generated message</span>
                                                </div>
                                                <p className="text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-300">{provisionalMessage}</p>
                                            </div>
                                            <div className="absolute right-2 top-2 flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={handleRegenerateMessage}
                                                    className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800"
                                                    title="Regenerate message"
                                                >
                                                    <RefreshCw className="h-3 w-3"/>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleAcceptAIMessage}
                                                    className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 rounded-full hover:bg-green-100 dark:hover:bg-green-800"
                                                    title="Accept message"
                                                >
                                                    <Check className="h-3 w-3"/>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleRejectAIMessage}
                                                    className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-800"
                                                    title="Reject message"
                                                >
                                                    <X className="h-3 w-3"/>
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                message: e.target.value
                                            }))
                                            if (e.target.value.trim() !== '') {
                                                setHasUserEditedMessage(true)
                                                setIsAIGenerated(false)
                                            }
                                        }}
                                        rows={4}
                                        className={`mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                            provisionalMessage ? 'opacity-50' : ''
                                        }`}
                                        placeholder={isGeneratingMessage ? 'Generating message...' : 'Write your kudos message here...'}
                                        disabled={!!provisionalMessage}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        GIF (optional)
                                    </label>
                                    {formData.gifUrl ? (
                                        <div className="relative mt-1">
                                            <img
                                                src={formData.gifUrl}
                                                alt="Selected GIF"
                                                className="max-h-32 rounded-md"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, gifUrl: undefined }))}
                                                className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-100 dark:bg-red-900 rounded-full p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                            >
                                                <X className="h-4 w-4"/>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setIsGifPickerOpen(true)}
                                            className="mt-1 flex items-center justify-center w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                        >
                                            <Image className="h-6 w-6 text-gray-400 mr-2"/>
                                            <span
                                                className="text-sm text-gray-600 dark:text-gray-400">Select a GIF</span>
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.notifyManager}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                notifyManager: e.target.checked
                                            }))}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                                            Notify recipient's manager
                                        </label>
                                    </div>

                                    <div>
                                        <label
                                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Additional people to notify (optional)
                                        </label>
                                        <TokenInput
                                            tokens={(formData.additionalNotifiedUsers || [])
                                                .map((id) => {
                                                    const user = users.find((u) => u.id === id)
                                                    if (!user) return null
                                                    const isManager = allRecipientManagerIds.includes(id)
                                                    return {
                                                        id: user.id,
                                                        label: isManager ? `${user.name} (Manager)` : user.name,
                                                        removable: !isManager || !formData.notifyManager,
                                                    }
                                                })
                                                .filter((token): token is {
                                                    id: string;
                                                    label: string;
                                                    removable: boolean
                                                } => !!token)
                                                .sort((a, b) => a.label.localeCompare(b.label))}
                                            onTokensChange={handleTokensChange}
                                            suggestions={availableNotificationUsers.map((user) => ({
                                                id: user.id,
                                                label: user.name,
                                            }))}
                                            placeholder="Type to search users to notify..."
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    <div
                        className="flex flex-col sm:flex-row sm:justify-between pt-6 border-t border-gray-200 dark:border-gray-700 mt-6 gap-4 sm:gap-0">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                        >
                            Reset
                        </button>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={() => setShowPreview(!showPreview)}
                                disabled={!canShowPreview}
                                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md ${
                                    canShowPreview
                                        ? showPreview
                                            ? 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            : 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800'
                                        : 'text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                                }`}
                            >
                                {showPreview ? (
                                    <>
                                        <EyeOff className="h-4 w-4"/>
                                        <span>Edit</span>
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4"/>
                                        <span>Preview</span>
                                    </>
                                )}
                            </button>
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={createKudos.isPending || !!provisionalMessage}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createKudos.isPending ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                             xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                    strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <span>Send</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {showLeaveConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
                            Unsaved Changes
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                            You have unsaved changes. Are you sure you want to leave this page?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowLeaveConfirmation(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLeaveConfirmation(false)
                                    if (pendingNavigation) {
                                        navigate(pendingNavigation)
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2  focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                            >
                                Leave Page
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isGifPickerOpen && (
                <GifPicker
                    onSelect={(gifUrl) => {
                        setFormData(prev => ({ ...prev, gifUrl }))
                        setIsGifPickerOpen(false)
                    }}
                    onClose={() => setIsGifPickerOpen(false)}
                    category={categories.find(c => c.id === formData.categoryId)}
                    message={formData.message}
                />
            )}
        </div>
    )
}