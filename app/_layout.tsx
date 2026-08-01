import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import { SettingsProvider } from '@/features/settings/settings-store';
import { ReviewOutboxSync } from '@/features/review/review-outbox-sync';
import { queryClient } from '@/shared/api/query-client';
import '@/shared/i18n';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ReviewOutboxSync />
        <SettingsProvider>
          <RootNavigator />
        </SettingsProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const colors = useDailyPalette();
  const { t } = useTranslation();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="experiment-lab"
          options={{
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            title: t('lab.title'),
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
