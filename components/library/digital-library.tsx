'use client'

import React, {
    useEffect, useRef, useState, useMemo, useCallback,
} from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
    Download, Search, ExternalLink, FileText, Zap, Loader2,
    BookOpen, Package, LayoutTemplate, Music, ImageIcon,
    Copy, CheckCircle2, Clock, AlertTriangle, Sparkles,
    Grid3X3, RefreshCw, ChevronUp, ChevronDown,
    Table2, XCircle, Camera, Star, MoreVertical,
    HardDrive, Store, Tag, RotateCcw, TrendingUp, Bell,
    LayoutGrid, AlignJustify, ChevronsUpDown, CheckSquare, Square,
    Heart, Folder, Settings, Filter, Download as DownloadIcon,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
    formatFileSize, formatRelativeTime, isItemExpired, getDaysUntilExpiry,
    getExpiryStatus, getExpiryStatusColor, getFileTypeInfo, exportItemsToCSV, searchItems,
} from '@/types'
import {
    logActivity, getFavorites, toggleFavorite, getCollections, createCollection,
} from '@/lib/actions/library'
import { LibraryEmptyState } from './Empty-state'
import { LibrarySkeleton, LibraryTableSkeleton } from './skeleton'
import { LibraryError } from '@/components/library/error'
import { LibraryContextMenu, getContextMenuItems } from '@/components/library/context-menu'
import { LibraryStoragePanel } from '@/components/library/storage-panel'

// Types
interface DigitalAccessRow {
    id: string
    file_ready?: boolean | null
    subtype: string | null
    granted_at: string
    expires_at: string | null
    last_accessed_at?: string | null
    order_id?: string | null
    order_item_id?: string | null
    revoke_reason?: string | null
    products: {
        id: string
        name: string
        images: string[] | null
        button_text: string | null
        pricing_type: string | null
        billing_period: string | null
        digital_file_size?: number | null
        tags?: string[] | null
        description?: string | null
        vendor_id?: string | null
        vendors?: {
            business_name?: string | null
            business_logo?: string | null
        } | null
    } | null
    order_items?: {
        download_count?: number | null
    } | null
    user_review?: {
        rating: number
        id: string
    } | null
}

type Density = 'compact' | 'comfortable'
type FilterId = typeof FILTER_TABS[number]['id']
type SortKey = 'name' | 'subtype' | 'granted_at' | 'expires_at' | 'status' | 'last_accessed_at'
type SortDir = 'asc' | 'desc'
type View = 'grid' | 'table'

const PAGE_SIZE = 24

// Color and icon config
function getSubtypeConfig(subtype: string | null) {
    switch (subtype) {
        case 'course':
            return { label: 'Course', icon: BookOpen, colorVar: '--color-ocean', action: 'continue' as const, actionLabel: 'Continue', ActionIcon: BookOpen }
        case 'software':
            return { label: 'Software', icon: Zap, colorVar: '--color-teal', action: 'open' as const, actionLabel: 'Launch', ActionIcon: ExternalLink }
        case 'ai-tools':
            return { label: 'AI Tool', icon: Sparkles, colorVar: '--color-chart-pink', action: 'open' as const, actionLabel: 'Open', ActionIcon: ExternalLink }
        case 'templates':
            return { label: 'Template', icon: LayoutTemplate, colorVar: '--color-apricot', action: 'download' as const, actionLabel: 'Download', ActionIcon: Download }
        case 'ebooks':
            return { label: 'Ebook', icon: FileText, colorVar: '--color-chart-green', action: 'download' as const, actionLabel: 'Download', ActionIcon: Download }
        case 'music-audio':
            return { label: 'Audio', icon: Music, colorVar: '--color-danger', action: 'download' as const, actionLabel: 'Download', ActionIcon: Download }
        case 'graphics-design':
            return { label: 'Graphics', icon: ImageIcon, colorVar: '--color-chart-orange', action: 'download' as const, actionLabel: 'Download', ActionIcon: Download }
        case 'photography':
            return { label: 'Photo', icon: Camera, colorVar: '--color-chart-purple', action: 'download' as const, actionLabel: 'Download', ActionIcon: Download }
        default:
            return { label: 'Asset', icon: Package, colorVar: '--color-text-muted', action: 'open' as const, actionLabel: 'Access', ActionIcon: ExternalLink }
    }
}

const FILTER_TABS = [
    { id: 'all' as const, label: 'All Items', icon: LayoutGrid },
    { id: 'active' as const, label: 'Active', icon: CheckCircle2 },
    { id: 'expiring' as const, label: 'Expiring Soon', icon: Clock },
    { id: 'expired' as const, label: 'Expired', icon: AlertTriangle },
    { id: 'favorites' as const, label: 'Favorites', icon: Heart },
]

// Main Component
export function DigitalLibrary() {
    // State management
    const router = useRouter()
    const searchParams = useSearchParams()
    const [items, setItems] = useState<DigitalAccessRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterTab, setFilterTab] = useState<FilterId>('all')
    const [sortKey, setSortKey] = useState<SortKey>('granted_at')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [density, setDensity] = useState<Density>('comfortable')
    const [view, setView] = useState<View>('grid')
    const [pageNum, setPageNum] = useState(1)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [favorites, setFavorites] = useState<Set<string>>(new Set())
    const [collections, setCollections] = useState<any[]>([])
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

// Load data
     useEffect(() => {
         const loadData = async () => {
             try {
                 setLoading(true)
                 const supabase = createClient()

                 // Get authenticated user
                 const { data: { user }, error: authError } = await supabase.auth.getUser()
                 if (authError || !user) {
                     throw new Error('Authentication required')
                 }

                 const { data, error: fetchError } = await supabase
                     .from('digital_access')
                     .select(`
             *,
             products!inner(name, images, button_text, pricing_type, billing_period, digital_file_size, tags, description,
               vendors!inner(business_name, business_logo)
             ),
             order_items(download_count)
           `)
                     .eq('user_id', user.id)
                     .order('granted_at', { ascending: false })

                 if (fetchError) {
                     console.error('[v0] Fetch error details:', fetchError)
                     throw fetchError
                 }

                setItems(data || [])

                // Load favorites
                const favs = await getFavorites()
                setFavorites(new Set(favs))

                // Load collections
                const cols = await getCollections()
                setCollections(cols)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err)
                console.error('[v0] Error loading library:', { message: errorMessage, error: err })
                setError('Failed to load your library. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    // Filter and sort logic
    const filteredItems = useMemo(() => {
        let result = items

        // Search filter
        if (searchQuery) {
            result = result.filter(item =>
                item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Status filter
        if (filterTab === 'active') {
            result = result.filter(item => !isItemExpired(item.expires_at ?? "") && item.file_ready)
        } else if (filterTab === 'expiring') {
            result = result.filter(item => {
                const days = getDaysUntilExpiry(item.expires_at ?? "")
                return days !== null && days > 0 && days <= 7
            })
        } else if (filterTab === 'expired') {
            result = result.filter(item => isItemExpired(item.expires_at ?? ""))
        } else if (filterTab === 'favorites') {
            result = result.filter(item => favorites.has(item.id))
        }

        // Sort
        result.sort((a, b) => {
            let aVal: any, bVal: any

            switch (sortKey) {
                case 'name':
                    aVal = a.products?.name || ''
                    bVal = b.products?.name || ''
                    break
                case 'subtype':
                    aVal = a.subtype || ''
                    bVal = b.subtype || ''
                    break
                case 'granted_at':
                    aVal = new Date(a.granted_at)
                    bVal = new Date(b.granted_at)
                    break
                case 'expires_at':
                    aVal = a.expires_at ? new Date(a.expires_at) : new Date('2099-12-31')
                    bVal = b.expires_at ? new Date(b.expires_at) : new Date('2099-12-31')
                    break
                case 'last_accessed_at':
                    aVal = a.last_accessed_at ? new Date(a.last_accessed_at) : new Date(0)
                    bVal = b.last_accessed_at ? new Date(b.last_accessed_at) : new Date(0)
                    break
                case 'status':
                    aVal = getExpiryStatus(a.expires_at ?? "")
                    bVal = getExpiryStatus(b.expires_at ?? "")
                    break
                default:
                    return 0
            }

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
            return 0
        })

        return result
    }, [items, searchQuery, filterTab, sortKey, sortDir, favorites])

    // Pagination
    const paginatedItems = useMemo(() => {
        const start = (pageNum - 1) * PAGE_SIZE
        return filteredItems.slice(start, start + PAGE_SIZE)
    }, [filteredItems, pageNum])

    const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE)

    // Event handlers
    const handleFavoriteClick = useCallback(async (itemId: string) => {
        const isFav = favorites.has(itemId)
        const newFavs = new Set(favorites)

        if (isFav) {
            newFavs.delete(itemId)
        } else {
            newFavs.add(itemId)
        }

        setFavorites(newFavs)
        await toggleFavorite(itemId, !isFav)
        await logActivity(itemId, isFav ? 'unfavorite' : 'favorite')
        toast.success(isFav ? 'Removed from favorites' : 'Added to favorites')
    }, [favorites])

    const handleAccessItem = useCallback(async (itemId: string) => {
        await logActivity(itemId, 'view')
    }, [])

    const handleDownload = useCallback(async (itemId: string, itemName: string) => {
        await logActivity(itemId, 'download')
        toast.success(`${itemName} download started`)
    }, [])

    const handleBatchDownload = useCallback(async () => {
        if (selectedIds.size === 0) {
            toast.error('No items selected')
            return
        }

        const itemsToExport = items.filter(item => selectedIds.has(item.id))
        try {
            exportItemsToCSV(
                itemsToExport.map(item => ({
                    id: item.id,
                    name: item.products?.name || 'Unknown',
                    subtype: item.subtype || 'unknown',
                    size: item.products?.digital_file_size,
                    downloads: item.order_items?.download_count,
                    rating: item.user_review?.rating,
                    createdAt: item.granted_at,
                    expiresAt: item.expires_at,
                })),
                `library-export-${new Date().toISOString().split('T')[0]}.csv`
            )
            toast.success('Items exported successfully')
        } catch (err) {
            toast.error('Failed to export items')
        }
    }, [selectedIds, items])

    const handleContextMenu = useCallback((e: React.MouseEvent, itemId: string) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY, itemId })
    }, [])

    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(paginatedItems.map(item => item.id)))
        } else {
            setSelectedIds(new Set())
        }
    }, [paginatedItems])

    const handleSelectItem = useCallback((itemId: string, checked: boolean) => {
        const newSelected = new Set(selectedIds)
        if (checked) {
            newSelected.add(itemId)
        } else {
            newSelected.delete(itemId)
        }
        setSelectedIds(newSelected)
    }, [selectedIds])

    // Render
    if (loading) {
        return (
            <div className="p-6">
                {view === 'grid' ? <LibrarySkeleton /> : <LibraryTableSkeleton />}
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <LibraryError message={error} onRetry={() => window.location.reload()} />
            </div>
        )
    }

    if (filteredItems.length === 0) {
        return (
            <div className="p-6">
                <LibraryEmptyState searchQuery={searchQuery} filterActive={filterTab !== 'all'} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col gap-4">
                        {/* Title and toolbar */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Library</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {filteredItems.length} items
                                </p>
                            </div>

                            {/* View and action buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setView('grid')}
                                    className={cn(
                                        'p-2 rounded-lg transition-colors',
                                        view === 'grid'
                                            ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    )}
                                >
                                    <LayoutGrid className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setView('table')}
                                    className={cn(
                                        'p-2 rounded-lg transition-colors',
                                        view === 'table'
                                            ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    )}
                                >
                                    <AlignJustify className="w-5 h-5" />
                                </button>

                                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Filter className="w-5 h-5" />
                                </button>

                                {selectedIds.size > 0 && (
                                    <button
                                        onClick={handleBatchDownload}
                                        className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        <DownloadIcon className="w-4 h-4" />
                                        Export ({selectedIds.size})
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search your library..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setPageNum(1)
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                            />
                        </div>

                        {/* Filter tabs */}
                        <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-4">
                            {FILTER_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setFilterTab(tab.id)
                                        setPageNum(1)
                                    }}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors',
                                        filterTab === tab.id
                                            ? 'bg-teal-600 dark:bg-teal-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    )}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main content */}
                    <div className="lg:col-span-3">
                        {view === 'grid' ? (
                            // Grid view
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paginatedItems.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        isFavorite={favorites.has(item.id)}
                                        isSelected={selectedIds.has(item.id)}
                                        onFavorite={handleFavoriteClick}
                                        onAccess={handleAccessItem}
                                        onDownload={handleDownload}
                                        onContextMenu={handleContextMenu}
                                        onSelect={handleSelectItem}
                                    />
                                ))}
                            </div>
                        ) : (
                            // Table view
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-4 py-3 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    className="w-4 h-4 rounded accent-teal-600 dark:accent-teal-400"
                                                />
                                            </th>
                                            {[
                                                { key: 'name', label: 'Name' },
                                                { key: 'subtype', label: 'Type' },
                                                { key: 'expires_at', label: 'Expiry' },
                                                { key: 'last_accessed_at', label: 'Accessed' },
                                            ].map(col => (
                                                <th
                                                    key={col.key}
                                                    onClick={() => {
                                                        if (sortKey === col.key as SortKey) {
                                                            setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                                                        } else {
                                                            setSortKey(col.key as SortKey)
                                                            setSortDir('asc')
                                                        }
                                                    }}
                                                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {col.label}
                                                        {sortKey === col.key && (
                                                            sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map(item => (
                                            <ItemTableRow
                                                key={item.id}
                                                item={item}
                                                isFavorite={favorites.has(item.id)}
                                                isSelected={selectedIds.has(item.id)}
                                                onFavorite={handleFavoriteClick}
                                                onAccess={handleAccessItem}
                                                onDownload={handleDownload}
                                                onContextMenu={handleContextMenu}
                                                onSelect={handleSelectItem}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setPageNum(Math.max(1, pageNum - 1))}
                                    disabled={pageNum === 1}
                                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setPageNum(page)}
                                        className={cn(
                                            'w-9 h-9 rounded-lg font-medium transition-colors',
                                            pageNum === page
                                                ? 'bg-teal-600 dark:bg-teal-500 text-white'
                                                : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setPageNum(Math.min(totalPages, pageNum + 1))}
                                    disabled={pageNum === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Storage panel */}
                        <LibraryStoragePanel
                            used={items.reduce((sum, item) => sum + (item.products?.digital_file_size || 0), 0)}
                            total={100 * 1024 * 1024 * 1024} // 100GB
                        />

                        {/* Collections panel */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Collections</h3>
                            <div className="space-y-2">
                                {collections.length === 0 ? (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">No collections yet</p>
                                ) : (
                                    collections.map(col => (
                                        <button
                                            key={col.id}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <Folder className="w-4 h-4" style={{ color: `var(${col.color})` }} />
                                            {col.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total Items</span>
                                <span className="font-bold text-gray-900 dark:text-white">{items.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Favorites</span>
                                <span className="font-bold text-gray-900 dark:text-white">{favorites.size}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {items.filter(i => {
                                        const days = getDaysUntilExpiry(i.expires_at || '')
                                        return days !== null && days > 0 && days <= 7
                                    }).length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Context menu */}
            {contextMenu && (
                <LibraryContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems(
                        () => {
                            const item = items.find(i => i.id === contextMenu.itemId)
                            if (item) handleFavoriteClick(contextMenu.itemId)
                        },
                        undefined,
                        () => {
                            const item = items.find(i => i.id === contextMenu.itemId)
                            if (item) handleDownload(contextMenu.itemId, item.products?.name || 'File')
                        }
                    )}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    )
}

// Item Card Component
function ItemCard({
    item,
    isFavorite,
    isSelected,
    onFavorite,
    onAccess,
    onDownload,
    onContextMenu,
    onSelect,
}: {
    item: DigitalAccessRow
    isFavorite: boolean
    isSelected: boolean
    onFavorite: (id: string) => void
    onAccess: (id: string) => void
    onDownload: (id: string, name: string) => void
    onContextMenu: (e: React.MouseEvent, id: string) => void
    onSelect: (id: string, checked: boolean) => void
}) {
    const config = getSubtypeConfig(item.subtype)
    const expiryStatus = getExpiryStatus(item.expires_at)
    const daysLeft = getDaysUntilExpiry(item.expires_at)

    return (
        <div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
            onContextMenu={(e) => onContextMenu(e, item.id)}
        >
            {/* Image */}
            <div className="relative bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600 h-40 overflow-hidden flex items-center justify-center">
                {item.products?.images?.[0] ? (
                    <img src={item.products.images[0]} alt={item.products.name} className="w-full h-full object-cover" />
                ) : (
                    <config.icon className="w-16 h-16 text-gray-300 dark:text-gray-500" style={{ color: `var(${config.colorVar})` }} />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                {/* Badge */}
                <div className="absolute top-3 right-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onFavorite(item.id)
                        }}
                        className={cn(
                            'p-2 rounded-full transition-colors',
                            isFavorite
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'bg-white/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400'
                        )}
                    >
                        <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* Type badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-800/90 rounded text-xs font-medium text-gray-900 dark:text-white">
                    <config.icon className="w-3 h-3" style={{ color: `var(${config.colorVar})` }} />
                    {config.label}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-2">
                    {item.products?.name}
                </h3>

                {/* Expiry status */}
                {item.expires_at && (
                    <div className={cn('text-xs font-medium mb-3 inline-block px-2 py-1 rounded',
                        expiryStatus === 'expired' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                            expiryStatus === 'expiring' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                                'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    )}>
                        {expiryStatus === 'expired' ? 'Expired' :
                            expiryStatus === 'expiring' ? `${daysLeft} days left` :
                                'Active'}
                    </div>
                )}

                {/* Meta */}
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-4">
                    {item.products?.digital_file_size && (
                        <p>Size: {formatFileSize(item.products.digital_file_size)}</p>
                    )}
{item.order_items?.download_count !== undefined && item.order_items?.download_count !== null && (
                         <p>Downloads: {item.order_items.download_count}</p>
                     )}
                    {item.last_accessed_at && (
                        <p>Accessed: {formatRelativeTime(item.last_accessed_at)}</p>
                    )}
                </div>

                {/* Button */}
                <button
                    onClick={() => {
                        onAccess(item.id)
                        onDownload(item.id, item.products?.name || 'File')
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                    <config.ActionIcon className="w-4 h-4" />
                    {config.actionLabel}
                </button>
            </div>
        </div>
    )
}

// Table Row Component
function ItemTableRow({
    item,
    isFavorite,
    isSelected,
    onFavorite,
    onAccess,
    onDownload,
    onContextMenu,
    onSelect,
}: {
    item: DigitalAccessRow
    isFavorite: boolean
    isSelected: boolean
    onFavorite: (id: string) => void
    onAccess: (id: string) => void
    onDownload: (id: string, name: string) => void
    onContextMenu: (e: React.MouseEvent, id: string) => void
    onSelect: (id: string, checked: boolean) => void
}) {
    const config = getSubtypeConfig(item.subtype)
    const expiryStatus = getExpiryStatus(item.expires_at)

    return (
        <tr
            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onContextMenu={(e) => onContextMenu(e, item.id)}
        >
            <td className="px-4 py-3">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(item.id, e.target.checked)}
                    className="w-4 h-4 rounded accent-teal-600 dark:accent-teal-400"
                />
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                        {item.products?.images?.[0] ? (
                            <img src={item.products.images[0]} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                            <config.icon className="w-5 h-5" style={{ color: `var(${config.colorVar})` }} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                            {item.products?.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{config.label}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {getSubtypeConfig(item.subtype).label}
            </td>
            <td className="px-4 py-3 text-sm">
                {item.expires_at ? (
                    <span className={cn('inline-block px-2 py-1 rounded text-xs font-medium',
                        expiryStatus === 'expired' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                            expiryStatus === 'expiring' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                                'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    )}>
                        {formatRelativeTime(item.expires_at)}
                    </span>
                ) : (
                    <span className="text-gray-500 dark:text-gray-400">Never</span>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {item.last_accessed_at ? formatRelativeTime(item.last_accessed_at) : 'Never'}
            </td>
            <td className="px-4 py-3 text-right">
                <button
                    onClick={() => onFavorite(item.id)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                    <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} color={isFavorite ? '#ef4444' : 'currentColor'} />
                </button>
            </td>
        </tr>
    )
}
