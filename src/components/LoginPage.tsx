import { ArrowRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import toast from 'react-hot-toast'

export function LoginPage() {
    const { login } = useAuth()
    const [searchParams] = useSearchParams()

    // Check for errors
    if (searchParams.get('error') === 'auth') {
        toast.error('Authentication failed. Please try again.')
    } else if (searchParams.get('error') === 'access') {
        toast.error('Access denied. Please contact an administrator to request access.')
    }

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat bg-gray-50 dark:bg-gray-900"
            style={{
                backgroundImage: 'url("images/landingpage.jpg")',
            }}
        >
            <div
                className="w-full max-w-md space-y-8 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 p-8 rounded-xl shadow-2xl">
                <div>
                    <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Welcome to Kudos
                    </h1>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Kudos helps employees recognize and celebrate each other by sending appreciation
                        messages.
                    </p>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Sign in with your Google account to start giving and receiving kudos.
                    </p>
                </div>
                <div className="mt-8 space-y-6">
                    <button
                        onClick={() => login()}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                    >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <ArrowRight className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400"/>
            </span>
                        Sign in with Google
                    </button>
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        By signing in, you agree to our{' '}
                        <Link to="/terms"
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy"
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                            Privacy Policy
                        </Link>
                    </p>
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Have questions? Need access?{' '}
                        <Link to="/help"
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                            Visit our Help Center
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}