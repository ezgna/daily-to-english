import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { createDisplayWaveformPeaks } from '@just-speak-it/core';

import { Fonts, Spacing } from '@/shared/legacy/theme';
import { ThemedText } from '@/shared/legacy/themed-text';

const Colors = {
  accent: '#2FDD6C',
  accentDark: '#168A73',
  accentSoft: '#DDF3E8',
  accentMuted: '#A6D8C6',
  disabled: '#E7ECEF',
  ink: '#111111',
  progress: '#2FDD6C',
  surface: '#FFF6E7',
} as const;

export function DiaryWaveform({
  onScrubbingChange,
  peaks,
  recordingUri,
}: {
  onScrubbingChange: (isScrubbing: boolean) => void;
  peaks: number[];
  recordingUri: string | null;
}) {
  const { t } = useTranslation();
  const visiblePeaks = createDisplayWaveformPeaks(peaks, 30);
  const waveformRef = useRef<View>(null);
  const scrubPreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const [scrubPreviewSec, setScrubPreviewSec] = useState<number | null>(null);
  const source = useMemo(() => (recordingUri ? { uri: recordingUri } : null), [recordingUri]);
  const player = useAudioPlayer(source, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const isPlayable = Boolean(source);
  const isPlaying = isPlayable && status.playing;
  const durationSec = Number.isFinite(status.duration) ? status.duration : 0;
  const statusCurrentTimeSec = Number.isFinite(status.currentTime) ? status.currentTime : 0;
  const currentTimeSec = scrubPreviewSec ?? statusCurrentTimeSec;
  const playbackProgress =
    isPlayable && durationSec > 0
      ? Math.min(1, Math.max(0, currentTimeSec / durationSec))
      : 0;
  const hasPlaybackProgress =
    isPlayable && (isPlaying || playbackProgress > 0 || scrubPreviewSec !== null);
  const timeLabel = isPlayable ? formatWaveformTime(currentTimeSec) : null;

  useEffect(() => {
    pauseSafely(player);

    return () => {
      onScrubbingChange(false);
      if (scrubPreviewTimeoutRef.current) {
        clearTimeout(scrubPreviewTimeoutRef.current);
      }
      pauseSafely(player);
    };
  }, [onScrubbingChange, player, recordingUri]);

  const scheduleScrubPreviewClear = useCallback(() => {
    if (scrubPreviewTimeoutRef.current) {
      clearTimeout(scrubPreviewTimeoutRef.current);
    }

    scrubPreviewTimeoutRef.current = setTimeout(() => {
      scrubPreviewTimeoutRef.current = null;
      setScrubPreviewSec(null);
    }, 260);
  }, []);

  const handlePlayButtonPress = useCallback(async () => {
    if (!source) {
      return;
    }

    if (isPlaying) {
      setScrubPreviewSec(null);
      pauseSafely(player);
      return;
    }

    try {
      const currentTime = Number.isFinite(status.currentTime) ? status.currentTime : 0;
      const shouldRestart = durationSec > 0 && currentTime >= durationSec - 0.08;

      if (shouldRestart) {
        await player.seekTo(0);
      }

      setScrubPreviewSec(null);
      player.play();
    } catch {
      pauseSafely(player);
    }
  }, [durationSec, isPlaying, player, source, status.currentTime]);

  const handleWaveformLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWaveformWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
  }, []);

  const seekToWaveformPosition = useCallback(
    async (relativeX: number, width: number) => {
      if (!source || durationSec <= 0) {
        return;
      }

      const resolvedWidth = width > 0 ? width : waveformWidth;
      if (resolvedWidth <= 0) {
        return;
      }

      const progress = Math.min(1, Math.max(0, relativeX / resolvedWidth));
      const nextTimeSec = durationSec * progress;
      setScrubPreviewSec(nextTimeSec);
      scheduleScrubPreviewClear();

      try {
        await player.seekTo(nextTimeSec);
      } catch {
        pauseSafely(player);
      }
    },
    [durationSec, player, scheduleScrubPreviewClear, source, waveformWidth]
  );

  const handleWaveformPress = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, pageX } = event.nativeEvent;

      if (!waveformRef.current) {
        void seekToWaveformPosition(locationX, waveformWidth);
        return;
      }

      waveformRef.current.measureInWindow((x, _y, width) => {
        const measuredWidth = width > 0 ? width : waveformWidth;
        const relativeX = Number.isFinite(pageX) && width > 0 ? pageX - x : locationX;
        void seekToWaveformPosition(relativeX, measuredWidth);
      });
    },
    [seekToWaveformPosition, waveformWidth]
  );

  if (visiblePeaks.length === 0) {
    return null;
  }

  const waveformBarsContent = (
    <>
      {visiblePeaks.map((peak, index) => (
        <View
          key={`${index}-${peak}`}
          style={[
            styles.bar,
            {
              height: 8 + peak * 42,
              opacity: 0.62 + peak * 0.38,
              backgroundColor:
                hasPlaybackProgress &&
                index / Math.max(1, visiblePeaks.length - 1) <= playbackProgress
                  ? Colors.progress
                  : Colors.accentMuted,
            },
          ]}
        />
      ))}
    </>
  );
  const waveformBars = isPlayable ? (
    <Pressable
      ref={waveformRef}
      accessibilityRole="button"
      accessibilityLabel={t('notes.accessibility.seekRecording')}
      delayLongPress={260}
      hitSlop={8}
      onLayout={handleWaveformLayout}
      onLongPress={handleWaveformPress}
      onPress={handleWaveformPress}
      onPressIn={() => onScrubbingChange(true)}
      onPressMove={handleWaveformPress}
      onPressOut={() => onScrubbingChange(false)}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onStartShouldSetResponder={() => true}
      style={styles.bars}
    >
      {waveformBarsContent}
    </Pressable>
  ) : (
    <View style={styles.bars}>{waveformBarsContent}</View>
  );

  return (
    <View
      accessibilityLabel={isPlayable ? undefined : t('notes.accessibility.recordingWaveform')}
      accessible={!isPlayable}
      style={styles.waveform}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isPlaying
            ? t('notes.accessibility.pauseRecording')
            : t('notes.accessibility.playRecording')
        }
        accessibilityState={{ disabled: !isPlayable, selected: isPlaying }}
        disabled={!isPlayable}
        hitSlop={8}
        onPress={handlePlayButtonPress}
        style={[styles.playButton, !isPlayable && styles.playButtonDisabled]}
      >
        <SymbolView
          name={{
            ios: isPlaying ? 'pause.fill' : 'play.fill',
            android: isPlaying ? 'pause' : 'play_arrow',
            web: isPlaying ? 'pause' : 'play_arrow',
          }}
          size={17}
          tintColor={isPlayable ? Colors.ink : '#7A8790'}
          fallback={
            <ThemedText style={[styles.playIcon, !isPlayable && styles.playIconDisabled]}>
              {isPlaying ? 'Ⅱ' : '▶'}
            </ThemedText>
          }
        />
      </Pressable>
      {waveformBars}
      {timeLabel ? (
        <ThemedText maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.time}>
          {timeLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

function pauseSafely(player: { pause: () => void }) {
  try {
    player.pause();
  } catch {
    return;
  }
}

function formatWaveformTime(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: Colors.ink,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  playButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Colors.ink,
    backgroundColor: Colors.accent,
  },
  playButtonDisabled: {
    backgroundColor: Colors.disabled,
    borderColor: 'rgba(17, 17, 17, 0.4)',
  },
  playIcon: {
    color: Colors.ink,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 900,
  },
  playIconDisabled: {
    color: '#7A8790',
  },
  bars: {
    minHeight: 42,
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    overflow: 'hidden',
  },
  bar: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 5,
    minWidth: 3,
    maxWidth: 7,
    borderRadius: 999,
    backgroundColor: Colors.accentMuted,
  },
  time: {
    minWidth: 50,
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: Colors.accentSoft,
    color: Colors.accentDark,
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 900,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: Spacing.one,
    textAlign: 'center',
  },
});
