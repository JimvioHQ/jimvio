import { HardDrive } from 'lucide-react'
import { formatFileSize } from '@/types'

interface LibraryStoragePanelProps {
    used: number
    total: number
}

export function LibraryStoragePanel({ used, total }: LibraryStoragePanelProps) {
    const percentage = Math.round((used / total) * 100)
    const remaining = total - used

    const getStorageColor = () => {
        if (percentage > 90) return 'bg-red-500 dark:bg-red-400'
        if (percentage > 70) return 'bg-yellow-500 dark:bg-yellow-400'
        return 'bg-teal-500 dark:bg-teal-400'
    }

    const getStatusText = () => {
        if (percentage > 90) return 'text-red-600 dark:text-red-400'
        if (percentage > 70) return 'text-yellow-600 dark:text-yellow-400'
        return 'text-teal-600 dark:text-teal-400'
    }

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Storage</h3>
                </div>
                <span className={`text-sm font-medium ${getStatusText()}`}>{percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full ${getStorageColor()} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Storage details */}
            <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Used</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatFileSize(used)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Available</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatFileSize(remaining)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Total</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatFileSize(total)}</span>
                </div>
            </div>

            {/* Warning */}
            {percentage > 90 && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                    Your storage is almost full. Consider upgrading or deleting unused items.
                </div>
            )}

            {percentage > 70 && percentage <= 90 && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-700 dark:text-yellow-400">
                    You&apos;re using over 70% of your storage. Consider upgrading soon.
                </div>
            )}
        </div>
    )
}
