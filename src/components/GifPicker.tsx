import { useEffect, useState } from 'react'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'
import { X } from 'lucide-react'
import { generateGifSearchTerm } from '../lib/openai'

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY)

interface GifPickerProps {
    onSelect: (gifUrl: string) => void
    onClose: () => void
    category?: { name: string }
    message?: string
}

export function GifPicker({ onSelect, onClose, category, message }: GifPickerProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [key, setKey] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [width, setWidth] = useState(0)
    const [isInitializing, setIsInitializing] = useState(true)
    const [isAIGenerated, setIsAIGenerated] = useState(false)
    const [hasResults, setHasResults] = useState(true)
    const containerRef = useState<HTMLDivElement | null>(null)

    // Initialize search with AI-generated term
    useEffect(() => {
        if (category && isInitializing) {
            setIsInitializing(false)
            generateGifSearchTerm({ category, message })
                .then(term => {
                    if (term) {
                        setSearchQuery(term)
                        setKey(prev => prev + 1)
                        setIsAIGenerated(true)
                    }
                })
                .catch(error => {
                    console.error('Error generating search term:', error)
                    // Fall back to category name if AI generation fails
                    if (category) {
                        setSearchQuery(category.name)
                        setKey(prev => prev + 1)
                        setIsAIGenerated(true)
                    }
                    setIsInitializing(false)
                })
        }
    }, [category, message, isInitializing])

    // Update width when container size changes
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                // Subtract padding (2 * 16px) from the width
                setWidth(containerRef.current.offsetWidth - 32)
            }
        }

        updateWidth()
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

    // Create a debounced search function
    useEffect(() => {
        setIsLoading(true)
        const timeoutId = setTimeout(() => {
            setKey(prev => prev + 1)
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchQuery])

    const fetchGifs = async (offset: number) => {
        setIsLoading(true)
        try {
            const result = searchQuery
                ? await gf.search(searchQuery, {
                    offset,
                    limit: 15,
                    rating: 'g',
                    type: 'gifs'
                })
                : await gf.trending({
                    offset,
                    limit: 15,
                    rating: 'g',
                    type: 'gifs'
                })

            // Only try fallback if using AI-generated term
            if (result.data.length === 0 && isAIGenerated && category && searchQuery !== category.name) {
                setSearchQuery(category.name)
                setKey(prev => prev + 1)
            }

            setHasResults(result.data.length > 0)
            setIsLoading(false)
            return result
        } catch (error) {
            console.error('Error fetching GIFs:', error)
            setIsLoading(false)
            throw error
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        setIsAIGenerated(false) // User is now typing their own search
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div
                className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Select a GIF
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
                        >
                            <X className="h-6 w-6"/>
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="Search GIFs..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div
                    ref={containerRef}
                    className="p-4 overflow-y-auto h-[500px] bg-gray-50 dark:bg-gray-900"
                >
                    {width > 0 && (
                        <Grid
                            key={key}
                            onGifClick={(gif) => {
                                onSelect(gif.images.fixed_height.url)
                                onClose()
                            }}
                            fetchGifs={fetchGifs}
                            width={width}
                            columns={3}
                            gutter={8}
                            noLink
                            hideAttribution
                            onGifsFetchSuccess={() => setIsLoading(false)}
                        />
                    )}

                    {isLoading && (
                        <div className="grid grid-cols-3 gap-2">
                            {[...Array(9)].map((_, i) => (
                                <div
                                    key={i}
                                    className="aspect-video bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"
                                />
                            ))}
                        </div>
                    )}

                    {!isLoading && searchQuery && key > 0 && !hasResults && (
                        <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
                            No GIFs found
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}