"use client";

/** Re-export Radix dialog primitives with Jimvio DS naming — uses existing battle-tested implementation. */
export {
  Dialog as DsDialog,
  DialogTrigger as DsDialogTrigger,
  DialogContent as DsDialogContent,
  DialogHeader as DsDialogHeader,
  DialogFooter as DsDialogFooter,
  DialogTitle as DsDialogTitle,
  DialogDescription as DsDialogDescription,
  DialogClose as DsDialogClose,
} from "@/components/ui/dialog";

export {
  DropdownMenu as DsDropdownMenu,
  DropdownMenuTrigger as DsDropdownMenuTrigger,
  DropdownMenuContent as DsDropdownMenuContent,
  DropdownMenuItem as DsDropdownMenuItem,
  DropdownMenuSeparator as DsDropdownMenuSeparator,
  DropdownMenuLabel as DsDropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
