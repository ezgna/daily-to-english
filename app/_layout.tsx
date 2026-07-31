import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SettingsProvider } from '@/features/settings/settings-store';
import { ReviewOutboxSync } from '@/features/review/review-outbox-sync';
import { queryClient } from '@/shared/api/query-client';
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
            title: '実験室',
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
