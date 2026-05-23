
"use client";

import { cn } from "@/lib/utils";
import React, {
    useState,
    useRef,
    useEffect,
    forwardRef,
    ForwardedRef,
    useImperativeHandle,
    JSX,
    useCallback
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    IoMdArrowDropdown as ChevronsUpDown,
    IoMdArrowDropup as IconUp,
    IoMdClose as IconClose,
} from "react-icons/io";
import { ImSpinner8 as IconSpinner } from "react-icons/im";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";

export interface CustomSelectRef {
    focus: () => void;
    blur: () => void;
    open: () => void;
    close: () => void;
}

export type SelectOption<T extends string> = {
    label: string;
    value: T;
    disabled?: boolean;
};

type CustomSelectProps<T extends string> = {
    options: SelectOption<T>[];
    placeholder?: string;
    onChange: (value: T) => void;
    value?: T | null;
    className?: string;
    disabled?: boolean;
    searchable?: boolean;
    isClearable?: boolean;
    isLoading?: boolean;
    error?: boolean;
    textSize?: "xs" | "sm" | "base" | "lg" | "xl";
    menuPortalTarget?: HTMLElement | null;
};

function CustomSelectInner<T extends string>(
    {
        options,
        placeholder = "Select an option",
        onChange,
        value,
        className = "",
        disabled = false,
        searchable = false,
        isClearable = false,
        isLoading = false,
        error = false,
        textSize = "sm",
        menuPortalTarget = null,
    }: CustomSelectProps<T>,
    ref: ForwardedRef<CustomSelectRef>
) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState<number>(-1);
    const [openAbove, setOpenAbove] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

    useImperativeHandle(ref, () => ({
        focus: () => buttonRef.current?.focus(),
        blur: () => { buttonRef.current?.blur(); setIsOpen(false); },
        open: () => { if (!disabled && !isLoading) setIsOpen(true); },
        close: () => setIsOpen(false),
    }));

    const filteredOptions = searchable
        ? options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                opt.value.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : options;

    const selectedOption = options.find((opt) => opt.value === value);

    // ── Effects ───────────────────────────────────────────────────────────────

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            const isInsideContainer = containerRef.current?.contains(target);
            const isInsideList = listRef.current?.contains(target);
            if (!isInsideContainer && !isInsideList) setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleOutsideClick);
            document.addEventListener("touchstart", handleOutsideClick);
        }
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("touchstart", handleOutsideClick);
        };
    }, [isOpen]);

    const updatePosition = useCallback(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            const shouldFlip = spaceBelow < 220 && spaceAbove > spaceBelow;
            setOpenAbove(shouldFlip);
            if (menuPortalTarget) {
                setMenuStyle({
                    position: "absolute",
                    top: shouldFlip ? "auto" : `${rect.bottom + window.scrollY + 4}px`,
                    bottom: shouldFlip ? `${viewportHeight - rect.top - window.scrollY + 4}px` : "auto",
                    left: `${rect.left + window.scrollX}px`,
                    width: `${rect.width}px`,
                    zIndex: 9999,
                });
            }
        }
    }, [isOpen, menuPortalTarget]);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener("scroll", updatePosition, true);
            window.addEventListener("resize", updatePosition);
        }
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (isOpen && highlightIndex >= 0 && optionRefs.current[highlightIndex]) {
            optionRefs.current[highlightIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [isOpen, highlightIndex]);

    useEffect(() => {
        setHighlightIndex(filteredOptions.length > 0 ? 0 : -1);
    }, [searchTerm, isOpen]);

    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        } else if (!isOpen) {
            setSearchTerm("");
        }
    }, [isOpen, searchable]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const toggleDropdown = (e: React.MouseEvent) => {
        e.preventDefault();
        if (disabled || isLoading) return;
        setIsOpen((prev) => !prev);
    };

    const handleSelect = (optionValue: T) => {
        if (onChange) onChange(optionValue);
        setIsOpen(false);
        setSearchTerm("");
        buttonRef.current?.focus();
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onChange) onChange("" as T);
        setSearchTerm("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled || isLoading) return;
        if (e.key === "Tab") { setIsOpen(false); return; }
        if (!isOpen) {
            if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightIndex((prev) => prev + 1 < filteredOptions.length ? prev + 1 : 0);
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightIndex((prev) => prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1);
                break;
            case "Home":
                e.preventDefault();
                setHighlightIndex(0);
                break;
            case "End":
                e.preventDefault();
                setHighlightIndex(filteredOptions.length - 1);
                break;
            case "Enter":
                e.preventDefault();
                if (highlightIndex >= 0 && filteredOptions[highlightIndex]) {
                    handleSelect(filteredOptions[highlightIndex].value);
                }
                break;
            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                buttonRef.current?.focus();
                break;
        }
    };

    // ── Dropdown panel ────────────────────────────────────────────────────────

    const DropdownContent = (
        <motion.div
            initial={{ opacity: 0, scale: 0.97, y: openAbove ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: openAbove ? 6 : -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
                "overflow-hidden flex flex-col rounded-sm border",
                "bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-xl)]",
                !menuPortalTarget && "absolute left-0 right-0 z-[99]",
                !menuPortalTarget && (openAbove ? "bottom-full mb-2" : "top-full mt-2")
            )}
            style={menuPortalTarget ? menuStyle : { maxHeight: "16rem" }}
        >
            {/* Search bar */}
            {searchable && (
                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                    <div className="relative">
                        <Input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search..."
                            className={cn(
                                "h-9 w-full pl-7 pr-2 text-xs font-medium rounded-sm",
                                "bg-[var(--color-surface)] border border-[var(--color-border)]",
                                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                                "focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-150"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <Search
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                            size={14}
                        />
                    </div>
                </div>
            )}

            {/* Options list */}
            <ul
                ref={listRef}
                role="listbox"
                className="overflow-y-auto py-1 max-h-60"
                style={{ scrollbarWidth: "thin" }}
            >
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((option, index) => {
                        const isSelected = option.value === value;
                        const isHighlighted = highlightIndex === index;

                        return (
                            <li
                                key={option.value}
                                id={`option-${index}`}
                                role="option"
                                aria-selected={isSelected}
                                aria-disabled={option.disabled}
                                ref={(el) => { optionRefs.current[index] = el; }}
                                onClick={() => !option.disabled && handleSelect(option.value)}
                                onMouseEnter={() => !option.disabled && setHighlightIndex(index)}
                                onMouseLeave={() => setHighlightIndex(-1)}
                                className={cn(
                                    "relative cursor-pointer px-3 py-2.5 transition-colors select-none",
                                    `text-${textSize}`,
                                    option.disabled && "opacity-40 cursor-not-allowed",
                                )}
                                style={{
                                    backgroundColor: isHighlighted && !option.disabled
                                        ? "var(--color-accent-light)"
                                        : isSelected
                                            ? "var(--color-accent-subtle)"
                                            : "transparent",
                                    color: isHighlighted || isSelected
                                        ? "var(--color-accent)"
                                        : "var(--color-text-secondary)",
                                    fontWeight: isSelected ? 500 : 400,
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate">{option.label}</span>
                                    {isSelected && (
                                        <span className="ml-2 flex-shrink-0 text-[var(--color-accent)]">
                                            <Check size={14} />
                                        </span>
                                    )}
                                </div>
                            </li>
                        );
                    })
                ) : (
                    <li className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">
                        {searchTerm ? "No results" : "No options"}
                    </li>
                )}
            </ul>
        </motion.div>
    );

    // ── Trigger button ────────────────────────────────────────────────────────

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggleDropdown}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-disabled={disabled}
                aria-controls={isOpen ? "options-list" : undefined}
                disabled={disabled || isLoading}
                className={cn(
                    // Base — mirrors FieldInput exactly
                    "relative w-full h-11 px-3 rounded-sm text-left",
                    "flex items-center justify-between",
                    `text-${textSize} font-medium`,
                    "bg-[var(--color-surface)] border border-[var(--color-border)]",
                    "text-[var(--color-text-primary)]",
                    "outline-none transition-all duration-150",
                    // Hover — orange accent, only when idle
                    !disabled && !error && "hover:border-[var(--color-border-strong)]",
                    // Open — acts like focus
                    isOpen && !error && !disabled && "ring-2 ring-orange-500/20 border-orange-500",
                    // Focus ring (keyboard nav)
                    !error && "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
                    // Error state
                    error && "border-red-500/60 focus:ring-2 focus:ring-red-500/40 focus:border-red-500/60",
                    error && isOpen && "ring-2 ring-red-500/40 border-red-500/60",
                    // Disabled state
                    disabled && "cursor-not-allowed opacity-50 bg-[var(--color-surface-secondary)] hover:border-[var(--color-border)]",
                    className,
                )}
            >
                {/* Label / placeholder */}
                <span className={cn(
                    "truncate block mr-6",
                    selectedOption ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                )}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                {/* Right-side icons */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isLoading ? (
                        <IconSpinner
                            className="animate-spin text-[var(--color-accent)]"
                            size={16}
                        />
                    ) : (
                        <>
                            {isClearable && value && !disabled && (
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={handleClear}
                                    className={cn(
                                        "rounded-full p-0.5 mr-1 transition-colors focus:outline-none",
                                        "text-[var(--color-text-muted)] hover:text-red-500"
                                    )}
                                >
                                    <IconClose size={16} />
                                </div>
                            )}
                            <span className="text-[var(--color-text-muted)]">
                                {isOpen ? <IconUp size={18} /> : <ChevronsUpDown size={18} />}
                            </span>
                        </>
                    )}
                </div>
            </button>

            {/* Dropdown — portal or inline */}
            <AnimatePresence>
                {isOpen && (
                    menuPortalTarget
                        ? createPortal(DropdownContent, menuPortalTarget)
                        : DropdownContent
                )}
            </AnimatePresence>
        </div>
    );
}

const CustomSelect = forwardRef(CustomSelectInner) as <T extends string>(
    props: CustomSelectProps<T> & { ref?: ForwardedRef<CustomSelectRef> }
) => JSX.Element;

export default CustomSelect;