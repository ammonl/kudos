import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { AuthCallback } from './components/AuthCallback'
import { SlackCallback } from './components/SlackCallback'
import { Dashboard } from './components/Dashboard'
import { SettingsPage } from './components/SettingsPage'
import { PrivacyPolicy } from './components/PrivacyPolicy'
import { TermsOfService } from './components/TermsOfService'
import { Leaderboard } from './components/Leaderboard'
import { MyKudos } from './components/MyKudos'
import { GiveKudosPage } from './components/GiveKudosPage'
import { KudosPage } from './components/KudosPage'
import { AdminPage } from './components/AdminPage'
import { HelpPage } from './components/HelpPage'
import { useTheme } from './hooks/use-theme'

function App() {
    // Initialize theme
    useTheme()

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth/callback" element={<AuthCallback/>}/>
                <Route path="/slack/callback" element={<SlackCallback/>}/>
                <Route path="/privacy" element={<PrivacyPolicy/>}/>
                <Route path="/terms" element={<TermsOfService/>}/>
                <Route path="/help" element={<HelpPage/>}/>
                <Route
                    path="/settings"
                    element={
                        <AuthGuard>
                            <SettingsPage/>
                        </AuthGuard>
                    }
                />
                <Route
                    path="/leaderboard"
                    element={
                        <AuthGuard>
                            <Leaderboard/>
                        </AuthGuard>
                    }
                />
                <Route
                    path="/my-kudos"
                    element={
                        <AuthGuard>
                            <MyKudos/>
                        </AuthGuard>
                    }
                />
                <Route
                    path="/give-kudos"
                    element={
                        <AuthGuard>
                            <GiveKudosPage/>
                        </AuthGuard>
                    }
                />
                <Route
                    path="/kudos/:id"
                    element={
                        <AuthGuard>
                            <KudosPage/>
                        </AuthGuard>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <AuthGuard>
                            <AdminPage/>
                        </AuthGuard>
                    }
                />
                <Route
                    path="/"
                    element={
                        <AuthGuard>
                            <Dashboard/>
                        </AuthGuard>
                    }
                />
            </Routes>
        </BrowserRouter>
    )
}

export default App