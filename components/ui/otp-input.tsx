"use client"

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

type OtpInputProps = {
  length?: number
  value?: string
  defaultValue?: string
  onChange: (otp: string) => void
  onComplete?: (otp: string) => void
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  ariaLabel?: string
}

export type OtpInputHandle = {
  focus: () => void
  clear: () => void
}

const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  {
    length = 6,
    value: controlledValue,
    defaultValue = "",
    onChange,
    onComplete,
    disabled,
    invalid,
    autoFocus,
    ariaLabel = "One-time code",
  },
  ref,
) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [internalValue, setInternalValue] = useState(defaultValue)
  const lastCompletedRef = useRef("")

  const isControlled = controlledValue !== undefined
  const value = (isControlled ? controlledValue : internalValue).slice(0, length)

  const update = useCallback(
    (next: string) => {
      const trimmed = next.slice(0, length)
      if (!isControlled) setInternalValue(trimmed)
      onChange(trimmed)

      if (trimmed.length === length && lastCompletedRef.current !== trimmed) {
        lastCompletedRef.current = trimmed
        onComplete?.(trimmed)
      }
      if (trimmed.length < length) {
        lastCompletedRef.current = ""
      }
    },
    [isControlled, length, onChange, onComplete],
  )

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputs.current[0]?.focus(),
      clear: () => {
        update("")
        inputs.current[0]?.focus()
      },
    }),
    [update],
  )

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1)
    const arr = value.split("")

    if (digit) {
      arr[index] = digit
      const next = arr.join("").slice(0, length)
      update(next)
      if (index < length - 1) inputs.current[index + 1]?.focus()
    } else {
      arr[index] = ""
      update(arr.join(""))
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        const arr = value.split("")
        arr[index] = ""
        update(arr.join(""))
      } else if (index > 0) {
        const arr = value.split("")
        arr[index - 1] = ""
        update(arr.join(""))
        inputs.current[index - 1]?.focus()
      }
      e.preventDefault()
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      inputs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault()
      inputs.current[index + 1]?.focus()
    } else if (e.key === "Home") {
      e.preventDefault()
      inputs.current[0]?.focus()
    } else if (e.key === "End") {
      e.preventDefault()
      inputs.current[length - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (!pasted) return
    update(pasted)
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select()
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 sm:gap-2"
    >
      {Array.from({ length }).map((_, i) => {
        const filled = !!value[i]
        return (
          <input
            key={i}
            ref={el => { inputs.current[i] = el }}
            type="tel"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={value[i] ?? ""}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            placeholder="—"
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={invalid || undefined}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            className="font-mono text-center tabular-nums transition-[border-color,box-shadow,background-color] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              width: "100%",
              maxWidth: 48,
              height: 52,
              fontSize: 20,
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${
                invalid
                  ? "var(--color-danger)"
                  : filled
                    ? "var(--color-text-primary)"
                    : "var(--color-border)"
              }`,
              background: filled
                ? "var(--color-surface)"
                : "var(--color-surface-secondary)",
              color: "var(--color-text-primary)",
              caretColor: "var(--color-accent)",
              boxShadow: invalid
                ? "0 0 0 3px color-mix(in srgb, var(--color-danger) 12%, transparent)"
                : undefined,
            }}
            onFocusCapture={e => {
              // Subtle accent ring on focus, using inline style so we don't
              // depend on Tailwind ring utilities being configured.
              if (!invalid) {
                e.currentTarget.style.borderColor = "var(--color-accent)"
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px color-mix(in srgb, var(--color-accent) 14%, transparent)"
              }
            }}
            onBlurCapture={e => {
              if (invalid) return
              e.currentTarget.style.borderColor = value[i]
                ? "var(--color-text-primary)"
                : "var(--color-border)"
              e.currentTarget.style.boxShadow = ""
            }}
          />
        )
      })}
    </div>
  )
})

export  {OtpInput}