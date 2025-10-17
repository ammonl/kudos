import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check local storage first
        const stored = localStorage.getItem('theme')
        if (stored === 'dark' || stored === 'light' || stored === 'system') return stored as Theme

        // Default to system
        return 'system'
    })

    useEffect(() => {
        const root = window.document.documentElement

        // Function to apply theme based on system preference
        const applyTheme = () => {
            if (theme === 'system') {
                // Check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                root.classList.remove('light', 'dark')
                root.classList.add(prefersDark ? 'dark' : 'light')
            } else {
                // Apply explicit theme choice
                root.classList.remove('light', 'dark')
                root.classList.add(theme)
            }
        }

        // Apply theme immediately
        applyTheme()

        // Save to localStorage
        localStorage.setItem('theme', theme)

        // Listen for system preference changes if using system theme
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = () => applyTheme()
            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
        }
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => {
            if (prev === 'light') return 'dark'
            if (prev === 'dark') return 'system'
            return 'light'
        })
    }

    // Get the actual current theme (light/dark) for UI purposes
    const currentDisplayTheme = theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : theme

    return {
        theme,
        setTheme,
        toggleTheme,
        currentDisplayTheme
    }
}