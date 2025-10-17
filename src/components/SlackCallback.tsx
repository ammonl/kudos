import { useEffect } from 'react'

export function SlackCallback() {
    useEffect(() => {
        // Get the authorization code from the URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')

        // Send the code back to the opener window
        if (window.opener && code) {
            window.opener.postMessage({
                type: 'slack-oauth-callback',
                code
            }, window.location.origin)
        }
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Connecting to Slack...
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    You can close this window once connected.
                </p>
            </div>
        </div>
    )
}