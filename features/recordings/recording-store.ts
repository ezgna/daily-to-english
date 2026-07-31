import { Directory, File, Paths } from 'expo-file-system';

import { normalizeWaveformPeaks } from '@just-speak-it/core';

import { getLocalString, removeLocalValue, setLocalString } from '@/shared/storage/local-storage';

export type LocalRecordingRetention = 'persistent' | 'retry';
export type LocalRecordingStatus = 'pending' | 'failed' | 'linked';

export type LocalRecording = {
  id: string;
  relativePath: string;
  entryId: string | null;
  durationMillis: number;
  sizeBytes: number;
  mimeType: string;
  waveformPeaks: number[];
  status: LocalRecordingStatus;
  retention: LocalRecordingRetention;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
};

export type LocalRecordingStats = {
  count: number;
  sizeBytes: number;
};

const StorageKey = 'just-speak-it:local-recordings:v2';
const DirectoryName = 'recordings';
const listeners = new Set<() => void>();

export function listLocalRecordings() {
  return Object.values(readIndex()).sort((first, second) => {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
}

export function getLocalRecordingStats(): LocalRecordingStats {
  return listLocalRecordings().reduce<LocalRecordingStats>(
    (stats, recording) => ({
      count: stats.count + 1,
      sizeBytes: stats.sizeBytes + recording.sizeBytes,
    }),
    { count: 0, sizeBytes: 0 }
  );
}

export function subscribeToLocalRecordings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLocalRecordingUri(id: string) {
  const recording = readIndex()[id];

  if (!recording) {
    return null;
  }

  const file = createRecordingFile(recording.relativePath);
  return file.exists ? file.uri : null;
}

export function getLocalRecordingForEntry(entryId: string) {
  return (
    listLocalRecordings().find((recording) => {
      return recording.entryId === entryId && recording.retention === 'persistent';
    }) ?? null
  );
}

export function getLocalRecordingUriForEntry(entryId: string) {
  const recording = getLocalRecordingForEntry(entryId);
  return recording ? getLocalRecordingUri(recording.id) : null;
}

export async function saveLocalRecordingFromUri({
  durationMillis,
  recordingUri,
  retention,
  waveformPeaks,
}: {
  durationMillis: number;
  recordingUri: string;
  retention: LocalRecordingRetention;
  waveformPeaks: number[];
}) {
  const sourceFile = new File(recordingUri);

  if (!sourceFile.exists || sourceFile.size === 0) {
    throw new Error('録音ファイルを保存できませんでした。');
  }

  const recordingsDirectory = new Directory(Paths.document, DirectoryName);
  recordingsDirectory.create({ idempotent: true, intermediates: true });

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const extension = sourceFile.extension || '.m4a';
  const fileName = `${id}${extension}`;
  const relativePath = `${DirectoryName}/${fileName}`;
  const destinationFile = new File(recordingsDirectory, fileName);
  await sourceFile.copy(destinationFile, { overwrite: true });

  const now = new Date().toISOString();
  const recording: LocalRecording = {
    id,
    relativePath,
    entryId: null,
    durationMillis: Math.max(0, Math.round(durationMillis)),
    sizeBytes: Math.max(0, destinationFile.size || sourceFile.size || 0),
    mimeType: extension === '.wav' ? 'audio/wav' : 'audio/mp4',
    waveformPeaks: normalizeWaveformPeaks(waveformPeaks),
    status: 'pending',
    retention,
    createdAt: now,
    updatedAt: now,
    lastError: null,
  };

  const index = readIndex();
  index[id] = recording;
  writeIndex(index);
  return recording;
}

export async function finishLocalRecording({
  entryId,
  id,
}: {
  entryId: string | null;
  id: string;
}) {
  const index = readIndex();
  const recording = index[id];

  if (!recording) {
    return;
  }

  if (recording.retention === 'retry') {
    await deleteLocalRecording(id);
    return;
  }

  index[id] = {
    ...recording,
    entryId,
    status: entryId ? 'linked' : 'pending',
    lastError: null,
    updatedAt: new Date().toISOString(),
  };
  writeIndex(index);
}

export async function deleteLocalRecording(id: string) {
  const index = readIndex();
  const recording = index[id];

  if (!recording) {
    return;
  }

  delete index[id];
  writeIndex(index);

  const file = createRecordingFile(recording.relativePath);
  if (file.exists) {
    file.delete();
  }
}

export async function deleteAllLocalRecordings() {
  const recordings = listLocalRecordings();
  const failedRecordings: Record<string, LocalRecording> = {};

  for (const recording of recordings) {
    try {
      const file = createRecordingFile(recording.relativePath);
      if (file.exists) {
        file.delete();
      }
    } catch {
      failedRecordings[recording.id] = recording;
    }
  }

  if (Object.keys(failedRecordings).length === 0) {
    removeLocalValue(StorageKey);
    notifyListeners();
    return;
  }

  writeIndex(failedRecordings);
  throw new Error('一部の録音ファイルを削除できませんでした。');
}

function createRecordingFile(relativePath: string) {
  return new File(Paths.document, ...relativePath.split('/').filter(Boolean));
}

function readIndex(): Record<string, LocalRecording> {
  const storedValue = getLocalString(StorageKey);

  if (!storedValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(storedValue) as Record<string, LocalRecording>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeIndex(index: Record<string, LocalRecording>) {
  setLocalString(StorageKey, JSON.stringify(index));
  notifyListeners();
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      continue;
    }
  }
}
