import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/use-theme'

export function ThemeToggle() {
    const { theme, toggleTheme, currentDisplayTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
            title={`Current theme: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`}
        >
            {theme === 'system' ? (
                <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400"/>
            ) : currentDisplayTheme === 'dark' ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400"/>
            ) : (
                <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400"/>
            )}
        </button>
    )
}