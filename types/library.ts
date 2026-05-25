import { v4 as uuidv4 } from 'uuid'
import { formatDistanceToNow, isAfter, parseISO } from 'date-fns'

export interface LibraryItem {
    id: string
    name: string
    subtype: string
    size?: number | null
    downloads?: number | null
    rating?: number | null
    isFavorite?: boolean
    collectionId?: string
    createdAt?: string
    accessedAt?: string
    expiresAt?: string | null
    file_ready?: boolean
    products?: {
        name?: string
        images?: string[]
        vendors?: {
            business_name?: string
            business_logo?: string
        }
        digital_file_size?: number
    }
    order_items?: {
        download_count?: number
    }
    vendors?: {
        business_name?: string
        business_logo?: string
    }
}

export interface ActivityLog {
    id: string
    itemId: string
    action: 'view' | 'download' | 'favorite' | 'unfavorite' | 'share'
    timestamp: string
    details?: string
}

export interface Collection {
    id: string
    name: string
    description?: string
    color: string
    itemCount: number
    createdAt: string
}

export interface StorageInfo {
    used: number
    total: number
    percentage: number
}

// Format file size
export function formatFileSize(bytes?: number | null): string {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date
        return formatDistanceToNow(dateObj, { addSuffix: true })
    } catch {
        return 'Unknown'
    }
}

// Check if item is expired
export function isItemExpired(expiresAt?: string | null): boolean {
    if (!expiresAt) return false
    try {
        const expireDate = parseISO(expiresAt)
        return !isAfter(expireDate, new Date())
    } catch {
        return false
    }
}

// Get days until expiry
export function getDaysUntilExpiry(expiresAt?: string | null): number | null {
    if (!expiresAt) return null
    try {
        const expireDate = parseISO(expiresAt)
        const now = new Date()
        const diffTime = expireDate.getTime() - now.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } catch {
        return null
    }
}

// Generate unique ID
export function generateId(): string {
    return uuidv4()
}

// Get expiry status
export function getExpiryStatus(expiresAt?: string | null): 'expired' | 'expiring' | 'active' | 'permanent' {
    if (!expiresAt) return 'permanent'
    const daysLeft = getDaysUntilExpiry(expiresAt)
    if (daysLeft === null) return 'permanent'
    if (daysLeft <= 0) return 'expired'
    if (daysLeft <= 7) return 'expiring'
    return 'active'
}

// Get expiry status color
export function getExpiryStatusColor(status: string): string {
    switch (status) {
        case 'expired':
            return 'var(--color-danger)'
        case 'expiring':
            return 'var(--color-warning)'
        case 'active':
            return 'var(--color-success)'
        default:
            return 'var(--color-text-muted)'
    }
}

// Get file type icon and color
export function getFileTypeInfo(filename?: string): { type: string; color: string } {
    if (!filename) return { type: 'file', color: 'var(--color-text-muted)' }

    const ext = filename.split('.').pop()?.toLowerCase()

    switch (ext) {
        case 'pdf':
            return { type: 'PDF', color: 'var(--color-danger)' }
        case 'doc':
        case 'docx':
            return { type: 'DOC', color: 'var(--color-ocean)' }
        case 'xls':
        case 'xlsx':
            return { type: 'SHEET', color: 'var(--color-chart-green)' }
        case 'ppt':
        case 'pptx':
            return { type: 'SLIDE', color: 'var(--color-chart-orange)' }
        case 'zip':
        case 'rar':
            return { type: 'ZIP', color: 'var(--color-teal)' }
        case 'mp3':
        case 'wav':
        case 'm4a':
            return { type: 'AUDIO', color: 'var(--color-chart-purple)' }
        case 'mp4':
        case 'mov':
        case 'avi':
            return { type: 'VIDEO', color: 'var(--color-chart-pink)' }
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
            return { type: 'IMAGE', color: 'var(--color-apricot)' }
        default:
            return { type: ext?.toUpperCase() || 'FILE', color: 'var(--color-text-muted)' }
    }
}

// Batch export to CSV
export function exportItemsToCSV(items: LibraryItem[], filename = 'library-export.csv'): void {
    const headers = ['Name', 'Type', 'Size', 'Downloads', 'Rating', 'Created', 'Expires']
    const rows = items.map(item => [
        item.name,
        item.subtype,
        formatFileSize(item.size),
        item.downloads || 0,
        item.rating || 'N/A',
        item.createdAt ? formatRelativeTime(item.createdAt) : 'N/A',
        item.expiresAt ? formatRelativeTime(item.expiresAt) : 'Never',
    ])

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// Search and filter items
export function searchItems(
    items: LibraryItem[],
    query: string,
    filters?: {
        type?: string
        status?: string
        collection?: string
    }
): LibraryItem[] {
    return items.filter(item => {
        const matchesQuery = !query || item.name.toLowerCase().includes(query.toLowerCase())
        const matchesType = !filters?.type || item.subtype === filters.type
        const matchesCollection = !filters?.collection || item.collectionId === filters.collection

        return matchesQuery && matchesType && matchesCollection
    })
}
