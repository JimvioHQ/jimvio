'use client'

import { useState, useRef, useEffect } from 'react'
import { Star, Share2, Download, Trash2, Copy, Folder } from 'lucide-react'

interface ContextMenuItem {
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
    variant?: 'default' | 'danger'
}

interface LibraryContextMenuProps {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
}

export function LibraryContextMenu({ x, y, items, onClose }: LibraryContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect()
            if (rect.right > window.innerWidth) {
                menuRef.current.style.left = `${x - rect.width}px`
            }
            if (rect.bottom > window.innerHeight) {
                menuRef.current.style.top = `${y - rect.height}px`
            }
        }
    }, [x, y])

    return (
        <div
            ref={menuRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-48"
            style={{ left: `${x}px`, top: `${y}px` }}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        item.onClick()
                        onClose()
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${item.variant === 'danger'
                            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    )
}

// Preset context menu items
export function getContextMenuItems(
    onFavorite?: () => void,
    onShare?: () => void,
    onDownload?: () => void,
    onAddToFolder?: () => void,
    onCopy?: () => void,
    onDelete?: () => void
): ContextMenuItem[] {
    return [
        ...(onFavorite ? [{ label: 'Add to favorites', icon: Star, onClick: onFavorite }] : []),
        ...(onAddToFolder ? [{ label: 'Add to folder', icon: Folder, onClick: onAddToFolder }] : []),
        ...(onShare ? [{ label: 'Share', icon: Share2, onClick: onShare }] : []),
        ...(onDownload ? [{ label: 'Download', icon: Download, onClick: onDownload }] : []),
        ...(onCopy ? [{ label: 'Copy link', icon: Copy, onClick: onCopy }] : []),
        ...(onDelete ? [{ label: 'Delete', icon: Trash2, onClick: onDelete, variant: 'danger' as const }] : []),
    ]
}
