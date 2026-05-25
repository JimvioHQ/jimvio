import { BookOpen, Upload, Search, Sparkles } from 'lucide-react'

interface LibraryEmptyStateProps {
    searchQuery?: string
    filterActive?: boolean
}

export function LibraryEmptyState({ searchQuery, filterActive }: LibraryEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-6">
                {searchQuery ? (
                    <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                ) : filterActive ? (
                    <BookOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                ) : (
                    <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                )}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'No results found' : filterActive ? 'No items match filters' : 'Your library is empty'}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
                {searchQuery
                    ? `We couldn't find any items matching "${searchQuery}". Try adjusting your search terms.`
                    : filterActive
                        ? 'No items match your current filter selection. Try clearing some filters.'
                        : 'Start building your library by uploading files, courses, or resources.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Files</span>
                </button>

                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Explore Hub</span>
                </button>

                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <BookOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Learn More</span>
                </button>
            </div>

            {!searchQuery && !filterActive && (
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 w-full max-w-2xl">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Getting started</p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li className="flex items-start gap-3">
                            <span className="text-teal-500 dark:text-teal-400 font-bold">1</span>
                            <span>Upload or import your files to get started</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-teal-500 dark:text-teal-400 font-bold">2</span>
                            <span>Organize items into collections for easy access</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-teal-500 dark:text-teal-400 font-bold">3</span>
                            <span>Star favorites to keep them at your fingertips</span>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    )
}
