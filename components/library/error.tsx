import { AlertCircle, RefreshCw } from 'lucide-react'

interface LibraryErrorProps {
    message?: string
    onRetry?: () => void
}

export function LibraryError({ message = 'Failed to load library', onRetry }: LibraryErrorProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-red-50 dark:bg-red-900/20 p-6 mb-6">
                <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Something went wrong
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
                {message}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try again
                    </button>
                )}

                <button
                    onClick={() => window.location.href = '/'}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                >
                    Go home
                </button>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 w-full max-w-2xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">
                    Need help?
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Check your internet connection</li>
                    <li>• Try clearing your browser cache</li>
                    <li>• Contact support if the issue persists</li>
                </ul>
            </div>
        </div>
    )
}
