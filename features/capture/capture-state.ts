import type { GenerationBundle } from '@just-speak-it/contract';

export type CaptureMode = 'voice' | 'write';

export type CaptureState =
  | { phase: 'idle'; mode: CaptureMode }
  | { phase: 'recording' }
  | { phase: 'transcribing' }
  | { phase: 'generating'; step: 'split' | 'translate' }
  | { phase: 'draftReady'; draft: GenerationBundle }
  | { phase: 'completed'; result: GenerationBundle }
  | { phase: 'error'; mode: CaptureMode; message: string };

export type CaptureEvent =
  | { type: 'SWITCH_MODE'; mode: CaptureMode }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'TRANSCRIBE_DONE' }
  | { type: 'SUBMIT_TEXT' }
  | { type: 'SPLIT_DONE'; draft: GenerationBundle }
  | { type: 'TRANSLATE_START' }
  | { type: 'COMPLETED'; result: GenerationBundle }
  | { type: 'ERROR'; mode?: CaptureMode; message: string }
  | { type: 'RESET' };

export function captureReducer(state: CaptureState, event: CaptureEvent): CaptureState {
  switch (event.type) {
    case 'SWITCH_MODE':
      return state.phase === 'idle' ? { phase: 'idle', mode: event.mode } : state;
    case 'START_RECORDING':
      return state.phase === 'idle' ? { phase: 'recording' } : state;
    case 'STOP_RECORDING':
      return state.phase === 'recording' ? { phase: 'transcribing' } : state;
    case 'TRANSCRIBE_DONE':
      return state.phase === 'transcribing' ? { phase: 'generating', step: 'split' } : state;
    case 'SUBMIT_TEXT':
      return state.phase === 'idle' ? { phase: 'generating', step: 'split' } : state;
    case 'SPLIT_DONE':
      return { phase: 'draftReady', draft: event.draft };
    case 'TRANSLATE_START':
      return { phase: 'generating', step: 'translate' };
    case 'COMPLETED':
      return { phase: 'completed', result: event.result };
    case 'ERROR':
      return { phase: 'error', mode: event.mode ?? readMode(state), message: event.message };
    case 'RESET':
      return { phase: 'idle', mode: readMode(state) };
    default:
      return state;
  }
}

export function readMode(state: CaptureState): CaptureMode {
  return state.phase === 'idle' || state.phase === 'error' ? state.mode : 'voice';
}

export function isBusyCapturePhase(state: CaptureState) {
  return state.phase === 'recording' || state.phase === 'transcribing' || state.phase === 'generating';
}
