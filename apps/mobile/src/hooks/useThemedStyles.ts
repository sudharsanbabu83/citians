import { useMemo } from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';

export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme]);
}
