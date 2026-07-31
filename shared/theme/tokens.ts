import { useColorScheme } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const palette = {
  light: {
    background: '#FFFFFF',
    backgroundElement: '#F0F0F3',
    surface: '#FFFFFF',
    surfaceMuted: '#FFF6E7',
    cardAlt: '#F6F2EA',
    text: '#111111',
    textMuted: '#5F6670',
    border: '#111111',
    borderMuted: '#E5E0D7',
    primary: '#276EF1',
    primaryPressed: '#1556D6',
    primaryText: '#FFFFFF',
    mint: '#2FDD6C',
    coral: '#FF7661',
    teal: '#088A81',
    tealSoft: '#E8F7F4',
    amber: '#FFE2A6',
    orange: '#FF9F45',
    violet: '#9B7CFF',
    sky: '#9FD0F8',
    accent: '#FF9F45',
    danger: '#B42318',
    success: '#287A48',
    shadow: '0 12px 28px rgba(31, 28, 20, 0.08)',
  },
  dark: {
    background: '#000000',
    backgroundElement: '#212225',
    surface: '#15171C',
    surfaceMuted: '#20242B',
    cardAlt: '#20242B',
    text: '#FFFFFF',
    textMuted: '#AEB7C2',
    border: '#FFFFFF',
    borderMuted: '#303640',
    primary: '#276EF1',
    primaryPressed: '#1556D6',
    primaryText: '#FFFFFF',
    mint: '#2FDD6C',
    coral: '#FF7661',
    teal: '#7DE1D7',
    tealSoft: '#14332F',
    amber: '#FFE2A6',
    orange: '#FF9F45',
    violet: '#9B7CFF',
    sky: '#9FD0F8',
    accent: '#FF9F45',
    danger: '#FF8B7F',
    success: '#78D39A',
    shadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
  },
} as const;

export type AppPalette = Record<keyof typeof palette.light, string>;

export function usePalette(): AppPalette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}

export const foundationColor = '#111111';
