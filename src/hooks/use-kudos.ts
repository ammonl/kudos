import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateKudosInput } from '../lib/api/kudos'
import { createKudos, deleteKudos, getKudosFeed, getLeaderboard, updateKudos } from '../lib/api/kudos'
import toast from 'react-hot-toast'

export function useCreateKudos() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: CreateKudosInput) => createKudos(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kudos'] })
            // Toast notification is now only shown here, not in the component
            toast.success('Kudos sent successfully!')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}

export function useKudosFeed(page = 1) {
    return useQuery({
        queryKey: ['kudos', 'feed', page],
        queryFn: () => getKudosFeed(page)
    })
}

export function useLeaderboard() {
    return useQuery({
        queryKey: ['kudos', 'leaderboard'],
        queryFn: getLeaderboard
    })
}

export function useDeleteKudos() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (kudosId: string) => deleteKudos(kudosId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kudos'] })
            toast.success('Kudos deleted successfully!')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}

export function useUpdateKudos() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ kudosId, data }: { kudosId: string; data: { message: string; categoryId: string } }) =>
            updateKudos(kudosId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kudos'] })
            toast.success('Kudos updated successfully!')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}