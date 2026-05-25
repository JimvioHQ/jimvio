'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActivityLog, Collection } from '@/types'

// Log activity
export async function logActivity(itemId: string, action: string, details?: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('platform_settings')
            .upsert({
                key: `activity_log_${itemId}`,
                value: {
                    itemId,
                    action,
                    timestamp: new Date().toISOString(),
                    details,
                } as unknown as any,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' })

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('[v0] Activity log error:', error)
        return { success: false, error: String(error) }
    }
}

// Get activity logs
export async function getActivityLogs(itemId?: string): Promise<ActivityLog[]> {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('value')
            .like('key', 'activity_log_%')

        if (error) throw error

        const logs: ActivityLog[] = []
        data?.forEach(row => {
            if (row.value && typeof row.value === 'object') {
                const log = row.value as any
                if (!itemId || log.itemId === itemId) {
                    logs.push(log)
                }
            }
        })

        return logs.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
    } catch (error) {
        console.error('[v0] Get activity logs error:', error)
        return []
    }
}

// Toggle favorite
export async function toggleFavorite(itemId: string, isFavorite: boolean) {
    const supabase = await createClient()

    try {
        await logActivity(itemId, isFavorite ? 'favorite' : 'unfavorite')

        const { error } = await supabase
            .from('platform_settings')
            .upsert({
                key: `favorite_${itemId}`,
                value: { itemId, isFavorite, updatedAt: new Date().toISOString() } as unknown as any,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' })

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('[v0] Toggle favorite error:', error)
        return { success: false, error: String(error) }
    }
}

// Get favorites
export async function getFavorites(): Promise<string[]> {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('key, value')
            .like('key', 'favorite_%')

        if (error) throw error

        const favorites: string[] = []
        data?.forEach(row => {
            if (row.value && typeof row.value === 'object') {
                const fav = row.value as any
                if (fav.isFavorite) {
                    favorites.push(fav.itemId)
                }
            }
        })

        return favorites
    } catch (error) {
        console.error('[v0] Get favorites error:', error)
        return []
    }
}

// Create collection
export async function createCollection(name: string, color: string, description?: string): Promise<Collection | null> {
    const supabase = await createClient()

    try {
        const id = `collection_${Date.now()}`
        const { error } = await supabase
            .from('platform_settings')
            .upsert({
                key: id,
                value: {
                    id,
                    name,
                    description,
                    color,
                    itemCount: 0,
                    createdAt: new Date().toISOString(),
                } as unknown as any,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' })

        if (error) throw error

        return { id, name, description, color, itemCount: 0, createdAt: new Date().toISOString() }
    } catch (error) {
        console.error('[v0] Create collection error:', error)
        return null
    }
}

// Get collections
export async function getCollections(): Promise<Collection[]> {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('value')
            .like('key', 'collection_%')

        if (error) throw error

        const collections: Collection[] = []
        data?.forEach(row => {
            if (row.value && typeof row.value === 'object') {
                const col = row.value as any
                if (col.id && col.name) {
                    collections.push(col)
                }
            }
        })

        return collections.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    } catch (error) {
        console.error('[v0] Get collections error:', error)
        return []
    }
}

// Add item to collection
export async function addItemToCollection(itemId: string, collectionId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('platform_settings')
            .upsert({
                key: `item_collection_${itemId}`,
                value: { itemId, collectionId, addedAt: new Date().toISOString() } as unknown as any,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' })

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('[v0] Add to collection error:', error)
        return { success: false, error: String(error) }
    }
}

// Remove item from collection
export async function removeItemFromCollection(itemId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('platform_settings')
            .delete()
            .eq('key', `item_collection_${itemId}`)

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('[v0] Remove from collection error:', error)
        return { success: false, error: String(error) }
    }
}
