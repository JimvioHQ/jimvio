/** Z-index scale — single source of truth for layering. */
export const dsZIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 9000,
  modal: 9100,
  popover: 9200,
  toast: 9300,
  commandPalette: 9400,
  superApp: 9993,
  copilot: 9999,
  max: 10050,
} as const;
