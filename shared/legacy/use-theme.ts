import { useColorScheme } from 'react-native';

import { Colors } from '@/shared/legacy/theme';

export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
