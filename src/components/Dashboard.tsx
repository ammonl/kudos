import { KudosFeed } from './KudosFeed'
import { Header } from './Header'

export function Dashboard() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header/>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <KudosFeed/>
            </main>
        </div>
    )
}