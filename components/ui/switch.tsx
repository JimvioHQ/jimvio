'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

function Switch({
    className,
    ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            className={cn(
                'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'data-[state=checked]:bg-[var(--color-accent)]',
                'data-[state=unchecked]:bg-[var(--color-border-strong)]',
                className,
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                className={cn(
                    'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.28)] ring-0 transition-transform duration-200',
                    'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5',
                )}
            />
        </SwitchPrimitive.Root>
    )
}

export { Switch }
