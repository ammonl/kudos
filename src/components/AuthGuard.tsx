import { PropsWithChildren } from 'react'
import { useAuth } from '../hooks/use-auth'
import { LoginPage } from './LoginPage'
import { HelpPage } from './HelpPage'
import { useLocation } from 'react-router-dom'

export function AuthGuard({ children }: PropsWithChildren) {
    const { isLoading, isAuthenticated, user } = useAuth()
    const location = useLocation()

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"/>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <LoginPage/>
    }

    // If user is authenticated but has no database record,
    // only allow access to help page
    if (!user && location.pathname !== '/help') {
        return <HelpPage/>
    }

    return <>{children}</>
}