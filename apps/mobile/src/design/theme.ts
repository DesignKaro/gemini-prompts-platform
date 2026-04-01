import { tokens } from './tokens';

export const theme = {
  light: {
    background: tokens.colors.bg,
    card: tokens.colors.card,
    text: tokens.colors.text,
    border: tokens.colors.border,
    muted: tokens.colors.muted,
    primary: tokens.colors.primary,
  },
} as const;
