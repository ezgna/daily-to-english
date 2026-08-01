import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef } from 'react';

import { appendMeteringSample, createWaveformPeaksFromMetering } from '@just-speak-it/core';

import { i18n } from '@/shared/i18n';

const RecordingStatusIntervalMs = 100;
const RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
} as const;

export function useRecorder() {
  const recorder = useAudioRecorder(RecordingOptions);
  const state = useAudioRecorderState(recorder, RecordingStatusIntervalMs);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    const metering = (state as { metering?: number }).metering;

    if (state.isRecording && typeof metering === 'number') {
      samplesRef.current = appendMeteringSample(samplesRef.current, metering);
    }
  }, [state]);

  async function start() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();

    if (!permission.granted) {
      throw new Error(i18n.t('capture.errors.microphonePermission'));
    }

    samplesRef.current = [];
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    await recorder.prepareToRecordAsync(RecordingOptions);
    recorder.record();
  }

  async function stop() {
    const durationMillis = state.durationMillis;
    const waveformPeaks = createWaveformPeaksFromMetering(samplesRef.current);
    await recorder.stop();
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    const uri = recorder.uri ?? state.url;

    if (!uri) {
      throw new Error(i18n.t('capture.errors.recordingUnavailable'));
    }

    return {
      durationMillis,
      uri,
      waveformPeaks,
    };
  }

  return {
    durationMillis: state.durationMillis,
    isRecording: state.isRecording,
    start,
    stop,
  };
}
