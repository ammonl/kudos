import { useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { Link, useLocation } from 'react-router-dom'
import {
    Award,
    ChevronDown,
    HelpCircle,
    LayoutList,
    LogOut,
    Menu,
    Settings,
    Shield,
    Trophy,
    User,
    X
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function Header() {
    const { user, logout } = useAuth()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()

    // Check if user is admin using the isAdmin() function
    const { data: isAdmin } = useQuery({
        queryKey: ['isAdmin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('is_admin')

            if (error) throw error
            return data
        }
    })

    const menuItems = [
        {
            to: '/',
            icon: LayoutList,
            label: 'Feed',
            show: true
        },
        {
            to: '/my-kudos',
            icon: User,
            label: 'My Kudos',
            show: true
        },
        {
            to: '/leaderboard',
            icon: Trophy,
            label: 'Leaderboard',
            show: true
        },
        {
            to: '/give-kudos',
            icon: Award,
            label: 'Give Kudos',
            show: true,
            highlight: true
        },
        {
            to: '/admin',
            icon: Shield,
            label: 'Admin',
            show: isAdmin
        }
    ]

    return (
        <header className="bg-white dark:bg-gray-800 shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo and Desktop Navigation */}
                    <div className="flex items-center">
                        <Link to="/give-kudos"
                              className="flex items-center text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <img src="/images/logo-alpha.png" alt="Give Kudos" className="h-8 w-8 mr-2"/>
                            Kudos
                        </Link>
                        <nav className="hidden md:ml-8 md:flex md:space-x-4">
                            {menuItems.filter(item => item.show).map((item) => {
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                            location.pathname === item.to
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                : item.highlight
                                                    ? 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4 mr-1.5"/>
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6"/>
                            ) : (
                                <Menu className="h-6 w-6"/>
                            )}
                        </button>
                    </div>

                    {/* User menu */}
                    <div className="hidden md:flex md:items-center">
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 rounded-md"
                            >
                                <span className="font-medium">{user?.name}</span>
                                <ChevronDown className="h-4 w-4"/>
                            </button>

                            {isMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsMenuOpen(false)}
                                    />
                                    <div
                                        className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-20">
                                        <div className="py-1" role="menu">
                                            <Link
                                                to="/settings"
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                role="menuitem"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                <Settings className="h-4 w-4 mr-3"/>
                                                Settings & Preferences
                                            </Link>
                                            <Link
                                                to="/help"
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                role="menuitem"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                <HelpCircle className="h-4 w-4 mr-3"/>
                                                Help & Support
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setIsMenuOpen(false)
                                                    logout()
                                                }}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                role="menuitem"
                                            >
                                                <LogOut className="h-4 w-4 mr-3"/>
                                                Sign out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden">
                        <div className="space-y-1 px-2 pb-3 pt-2">
                            {menuItems.filter(item => item.show).map((item) => {
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                                            location.pathname === item.to
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                : item.highlight
                                                    ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        <Icon className="h-5 w-5 mr-2"/>
                                        {item.label}
                                    </Link>
                                )
                            })}

                            <div className="border-t border-gray-200 dark:border-gray-600 mt-4 pt-4">
                                <Link
                                    to="/settings"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md"
                                >
                                    <Settings className="h-5 w-5 mr-2"/>
                                    Settings
                                </Link>
                                <Link
                                    to="/help"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md"
                                >
                                    <HelpCircle className="h-5 w-5 mr-2"/>
                                    Help
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false)
                                        logout()
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md"
                                >
                                    <LogOut className="h-5 w-5 mr-2"/>
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}