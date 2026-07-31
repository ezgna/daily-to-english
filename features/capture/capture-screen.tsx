import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useReducer, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GenerationBundle } from '@just-speak-it/contract';

import { DraftCardList } from '@/features/capture/draft-card-list';
import { captureReducer, readMode } from '@/features/capture/capture-state';
import { useRecorder } from '@/features/capture/use-recorder';
import { finishLocalRecording, saveLocalRecordingFromUri } from '@/features/recordings/recording-store';
import { ReviewDeck } from '@/features/review/review-deck';
import { useSettings } from '@/features/settings/settings-store';
import { createGeneration, discardGeneration, formatApiError, transcribeAudio, translateGeneration } from '@/shared/api/client';
import { qk } from '@/shared/api/query-keys';
import { useLatestPendingGeneration, useReviewQueue } from '@/shared/api/read-models';
import { MaxContentWidth, Spacing } from '@/shared/legacy/theme';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { GlideButton } from '@/shared/legacy/ui/glide-button';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { GlideTextInput } from '@/shared/ui/glide-text-input';
import { Surface } from '@/shared/ui/surface';

export function CaptureScreen() {
  const colors = useDailyPalette();
  const safeAreaInsets = useSafeAreaInsets();
  const settings = useSettings();
  const recorder = useRecorder();
  const queryClient = useQueryClient();
  const reviewQueue = useReviewQueue();
  const latestPending = useLatestPendingGeneration();
  const [state, dispatch] = useReducer(captureReducer, { phase: 'idle', mode: 'voice' });
  const [text, setText] = useState('');
  const mode = readMode(state);
  const busy = state.phase === 'recording' || state.phase === 'transcribing' || state.phase === 'generating';
  const createMutation = useMutation({
    mutationFn: async () => {
      const cleanText = text.trim();

      if (!cleanText) {
        throw new Error('日記本文を入力してください。');
      }

      dispatch({ type: 'SUBMIT_TEXT' });
      return await createGeneration({
        idempotencyKey: `text-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        mode: 'split',
        source: 'text',
        rawText: cleanText,
        cleanText,
        isEdited: false,
        splitPolicy: settings.splitPolicy,
        translationStyle: settings.translationStyle,
        transcript: [],
        waveform: [],
      });
    },
    onSuccess: (draft) => {
      dispatch({ type: 'SPLIT_DONE', draft });
      void invalidatePracticeQueries(queryClient);
    },
    onError: (error) => dispatch({ type: 'ERROR', mode: 'write', message: formatApiError(error) }),
  });
  const translateMutation = useMutation({
    mutationFn: (draft: GenerationBundle) => {
      dispatch({ type: 'TRANSLATE_START' });
      return translateGeneration(draft.generation.id, settings.translationStyle);
    },
    onSuccess: (result) => {
      dispatch({ type: 'COMPLETED', result });
      setText('');
      void invalidatePracticeQueries(queryClient);
    },
    onError: (error) => dispatch({ type: 'ERROR', mode, message: formatApiError(error) }),
  });
  const discardMutation = useMutation({
    mutationFn: (draft: GenerationBundle) => discardGeneration(draft.generation.id),
    onSuccess: () => {
      dispatch({ type: 'RESET' });
      void invalidatePracticeQueries(queryClient);
    },
    onError: (error) => dispatch({ type: 'ERROR', mode, message: formatApiError(error) }),
  });

  async function startRecording() {
    try {
      dispatch({ type: 'START_RECORDING' });
      await recorder.start();
    } catch (error) {
      dispatch({ type: 'ERROR', mode: 'voice', message: formatApiError(error) });
    }
  }

  async function stopRecording() {
    let savedRecordingId: string | null = null;

    try {
      dispatch({ type: 'STOP_RECORDING' });
      const stopped = await recorder.stop();
      const savedRecording = settings.saveRecordings
        ? await saveLocalRecordingFromUri({
            durationMillis: stopped.durationMillis,
            recordingUri: stopped.uri,
            retention: 'persistent',
            waveformPeaks: stopped.waveformPeaks,
          })
        : null;
      savedRecordingId = savedRecording?.id ?? null;
      const transcript = await transcribeAudio(stopped.uri);
      dispatch({ type: 'TRANSCRIBE_DONE' });
      const result = await createGeneration({
        idempotencyKey: `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        mode: 'auto',
        source: 'voice',
        rawText: transcript.rawText,
        cleanText: transcript.cleanText,
        isEdited: false,
        splitPolicy: settings.splitPolicy,
        translationStyle: settings.translationStyle,
        transcript: transcript.words,
        waveform: stopped.waveformPeaks,
      });

      if (savedRecordingId) {
        await finishLocalRecording({ id: savedRecordingId, entryId: result.entry.id });
      }

      dispatch({ type: 'COMPLETED', result });
      void invalidatePracticeQueries(queryClient);
    } catch (error) {
      if (savedRecordingId) {
        await finishLocalRecording({ id: savedRecordingId, entryId: null });
      }

      dispatch({ type: 'ERROR', mode: 'voice', message: formatApiError(error) });
    }
  }

  const pendingDraft =
    latestPending.data && latestPending.data.generation.status === 'split' ? latestPending.data : null;
  const showModeSwitch = state.phase === 'idle';
  const shouldShowBottomPrimaryAction = state.phase !== 'draftReady' && state.phase !== 'completed';
  const isReviewDeckVisible =
    state.phase !== 'draftReady' &&
    state.phase !== 'completed' &&
    mode !== 'write' &&
    Boolean(reviewQueue.data?.length);

  function handlePrimaryActionPress() {
    if (mode === 'write') {
      createMutation.mutate();
      return;
    }

    if (state.phase === 'recording') {
      void stopRecording();
      return;
    }

    if (state.phase === 'idle' || state.phase === 'error') {
      void startRecording();
    }
  }

  const modeSwitchButton = showModeSwitch ? (
    <GlideButton
      label={mode === 'write' ? '話す' : '書く'}
      accessibilityLabel={mode === 'write' ? '話すモードに戻る' : '書くモードに切り替える'}
      tone={mode === 'write' ? 'mint' : 'cream'}
      size="compact"
      fullWidth={false}
      onPress={() => dispatch({ type: 'SWITCH_MODE', mode: mode === 'write' ? 'voice' : 'write' })}
    />
  ) : null;

  const content = (
    <View style={styles.contentArea}>
      <View style={styles.draftStack}>
        {state.phase === 'error' ? (
          <AppText style={[styles.errorText, { color: colors.coral }]}>{state.message}</AppText>
        ) : null}

        {state.phase === 'draftReady' ? (
          <>
            <DraftCardList cards={state.draft.cards} />
            <View style={styles.actions}>
              <Button
                style={styles.actionButton}
                kind="secondary"
                loading={discardMutation.isPending}
                onPress={() => discardMutation.mutate(state.draft)}
              >
                やり直す
              </Button>
              <Button
                style={styles.actionButton}
                loading={translateMutation.isPending}
                onPress={() => translateMutation.mutate(state.draft)}
              >
                Make cards
              </Button>
            </View>
          </>
        ) : state.phase === 'completed' ? (
          <DraftCardList cards={state.result.cards} />
        ) : mode === 'write' ? (
          <Pressable
            accessible={false}
            style={styles.inputDismissArea}
            onPress={Keyboard.dismiss}
          >
            <GlideTextInput
              value={text}
              tone="cream"
              accentTone="mint"
              variant="canvas"
              canvasCornerColor={colors.border}
              accessibilityLabel="今日の日本語を書く"
              editable={!busy}
              placeholder="今ふと考えていることをなんでも自由に日本語で話す・書く。"
              placeholderTextColor={colors.muted}
              autoFocus
              frameStyle={styles.draftInputFrame}
              inputStyle={[
                styles.draftInput,
                {
                  color: colors.text,
                  opacity: busy ? 0.78 : 1,
                },
              ]}
              onChangeText={setText}
            />
          </Pressable>
        ) : reviewQueue.data?.length ? (
          <ReviewDeck cards={reviewQueue.data} headerAccessory={modeSwitchButton} />
        ) : (
          <StarterCard
            isLoading={reviewQueue.isLoading}
            isRecording={state.phase === 'recording'}
            isWorking={busy}
          />
        )}

        {pendingDraft && state.phase === 'idle' && mode === 'write' ? (
          <Surface>
            <AppText variant="subtitle">未完了の下書き</AppText>
            <AppText muted>{pendingDraft.entry.cleanText}</AppText>
            <Button onPress={() => translateMutation.mutate(pendingDraft)}>Make cards</Button>
          </Surface>
        ) : null}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom + Spacing.three,
          paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
          paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
        },
      ]}
    >
      {showModeSwitch && !isReviewDeckVisible ? (
        <View style={styles.modeActionRow}>
          {modeSwitchButton}
        </View>
      ) : null}

      {content}

      {state.phase === 'completed' ? (
        <View style={styles.buttonDock}>
          <Button kind="secondary" onPress={() => dispatch({ type: 'RESET' })}>
            閉じる
          </Button>
        </View>
      ) : shouldShowBottomPrimaryAction ? (
        <View style={styles.buttonDock}>
          <GlideButton
            label={
              state.phase === 'recording'
                ? formatDuration(recorder.durationMillis)
                : state.phase === 'transcribing'
                  ? 'Transcribing'
                  : state.phase === 'generating'
                    ? 'Making cards'
                    : mode === 'write'
                      ? 'Split it'
                      : 'Speak it'
            }
            accessibilityLabel={state.phase === 'recording' ? `録音を停止 ${formatDuration(recorder.durationMillis)}` : undefined}
            icon={
              state.phase === 'recording'
                ? { ios: 'stop.circle.fill', android: 'stop_circle', web: 'stop_circle' }
                : state.phase === 'transcribing' || state.phase === 'generating'
                  ? { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }
                  : mode === 'write'
                    ? { ios: 'rectangle.split.2x1.fill', android: 'splitscreen', web: 'splitscreen' }
                    : { ios: 'mic.fill', android: 'mic', web: 'mic' }
            }
            busy={state.phase === 'transcribing' || state.phase === 'generating' || createMutation.isPending}
            tone={
              state.phase === 'recording'
                ? 'orange'
                : state.phase === 'transcribing' || state.phase === 'generating'
                  ? 'aqua'
                  : mode === 'write'
                    ? 'orange'
                    : 'mint'
            }
            disabled={busy && state.phase !== 'recording'}
            pressed={state.phase === 'recording'}
            holdPressOut={state.phase === 'recording'}
            containerStyle={styles.recordButtonContainer}
            onPress={handlePrimaryActionPress}
          />
        </View>
      ) : null}
    </View>
  );
}

async function invalidatePracticeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.reviewQueue }),
    queryClient.invalidateQueries({ queryKey: qk.cardGroups }),
    queryClient.invalidateQueries({ queryKey: qk.diaryEntries }),
    queryClient.invalidateQueries({ queryKey: qk.latestPending }),
  ]);
}

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function StarterCard({
  isLoading,
  isRecording,
  isWorking,
}: {
  isLoading: boolean;
  isRecording: boolean;
  isWorking: boolean;
}) {
  const colors = useDailyPalette();
  const title = isLoading
    ? '今日のカードを確認中'
    : isRecording
      ? 'そのまま話してみましょう'
      : isWorking
        ? 'カードの準備中'
        : '最初のカードを作ろう';
  const body = isLoading
    ? '保存済みの英語カードを読み込んでいます。'
    : isRecording
      ? '話し終えたら下のボタンで止めてください。話した内容から英語カードを作れます。'
      : isWorking
        ? '話した内容を整理しています。少しだけ待ってください。'
        : '下の Speak it を押して、今日考えていることをなんでも話してみましょう。短くても大丈夫です。';

  return (
    <View style={styles.starterCardArea}>
      <View
        style={[
          styles.starterCard,
          {
            borderColor: colors.text,
            backgroundColor: colors.card,
          },
        ]}
      >
        <AppText style={[styles.starterTitle, { color: colors.text }]} selectable>
          {title}
        </AppText>
        <AppText style={[styles.starterBody, { color: colors.muted }]} selectable>
          {body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.three,
  },
  contentArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  draftStack: {
    flex: 1,
    width: '100%',
    gap: Spacing.three,
  },
  inputDismissArea: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  starterCardArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  starterCard: {
    width: '100%',
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 4,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  starterTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 900,
  },
  starterBody: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: 700,
  },
  modeActionRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  draftInputFrame: {
    minHeight: 128,
    maxHeight: 500,
  },
  draftInput: {
    minHeight: 72,
    maxHeight: 444,
    padding: 0,
    fontSize: 21,
    lineHeight: 32,
    fontWeight: 800,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 600,
  },
  buttonDock: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  recordButtonContainer: {
    opacity: 1,
  },
});
