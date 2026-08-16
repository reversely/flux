import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioStream,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { openTranscriptionStream, type TranscriptionStream } from '@/api/speech';
import { useSession } from '@/store/session';

/**
 * The two halves of the voice loop, shared by the walk and the VSS
 * sessions (#155): narration prefers the box's Kokoro voice through the
 * server and falls back to on-device speech; hold-to-talk streams int16
 * PCM live to WS /v1/speech/stream. Callers stop narration before they
 * start the mic, so the app never hears its own voice.
 */

// Rough speech pacing for the speaking window: the open mic mutes itself
// while the app talks, and the player exposes no reliable finished event
// across the server and device voices, so duration is estimated.
const SPEAK_BASE_MS = 1000;
const SPEAK_MS_PER_CHAR = 70;

export function useNarration() {
  const client = useSession((s) => s.client);
  const player = useAudioPlayer();
  const speakingUntilRef = useRef(0);

  // The player's native object dies with the owning screen; a narration
  // resolving after unmount must not crash the app, so every player call
  // tolerates a released object and falls back to device speech.
  const speak = useCallback(
    async (line: string) => {
      Speech.stop();
      speakingUntilRef.current = Date.now() + SPEAK_BASE_MS + line.length * SPEAK_MS_PER_CHAR;
      try {
        player.pause();
      } catch {
        Speech.speak(line);
        return;
      }
      try {
        const narration = await client().createNarration(line);
        player.replace({ uri: client().narrationUrl(narration.audio_url) });
        player.play();
      } catch {
        // Server narration failed or the player was released mid-await;
        // the device voice carries the line either way.
        Speech.speak(line);
      }
    },
    [client, player],
  );

  const stop = useCallback(() => {
    Speech.stop();
    speakingUntilRef.current = 0;
    try {
      player.pause();
    } catch {
      // A released player has nothing to stop.
    }
  }, [player]);

  const isSpeaking = useCallback(() => Date.now() < speakingUntilRef.current, []);

  useEffect(() => () => void Speech.stop(), []);

  return { speak, stop, isSpeaking };
}

// Open-mic tuning: int16 RMS above VOICE_RMS reads as speech; an utterance
// ends after UTTERANCE_SILENCE_MS without it. The stream opens on voice
// onset, so silence costs no bandwidth and no server work.
const VOICE_RMS = 600;
const UTTERANCE_SILENCE_MS = 900;

/**
 * The always-on half of the one-mode surfaces (#208): the mic runs for the
 * whole session, an utterance starts when the user starts talking and ends
 * on silence, and the final transcript lands in onFinal exactly as a
 * hold-to-talk release would. isMuted gates the listener while the app
 * itself is speaking, so the loop never transcribes its own narration.
 */
export function useOpenMic(options: {
  enabled: boolean;
  isMuted: () => boolean;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onProblem: (kind: 'denied' | 'server') => void;
}) {
  const client = useSession((s) => s.client);
  const [listening, setListening] = useState(false);
  // Liveness the screen can show: level buckets 0-3 from the last buffer,
  // and whether audio buffers are arriving at all — a mic the audio
  // session silently starved must look different from a quiet room.
  const [level, setLevel] = useState(0);
  const [alive, setAlive] = useState(false);
  const lastBufferAtRef = useRef(0);
  const lastBucketRef = useRef(0);
  const wsRef = useRef<TranscriptionStream | null>(null);
  const lastVoiceAtRef = useRef(0);
  const enabledRef = useRef(false);
  const handlers = useRef(options);
  handlers.current = options;

  const closeUtterance = (send: boolean) => {
    const stream = wsRef.current;
    wsRef.current = null;
    setListening(false);
    if (stream !== null) {
      if (send) {
        stream.end();
      } else {
        stream.cancel();
      }
    }
  };

  const { stream: mic } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      if (!enabledRef.current) {
        return;
      }
      if (handlers.current.isMuted()) {
        // The app is talking; whatever was mid-utterance is abandoned so
        // the transcript never contains the app's own voice.
        closeUtterance(false);
        return;
      }
      const samples = new Int16Array(buffer.data);
      let sum = 0;
      let counted = 0;
      for (let i = 0; i < samples.length; i += 4) {
        sum += samples[i] * samples[i];
        counted += 1;
      }
      const rms = Math.sqrt(sum / Math.max(1, counted));
      const now = Date.now();
      lastBufferAtRef.current = now;
      const bucket = rms > VOICE_RMS * 3 ? 3 : rms > VOICE_RMS ? 2 : rms > VOICE_RMS / 3 ? 1 : 0;
      if (bucket !== lastBucketRef.current) {
        lastBucketRef.current = bucket;
        setLevel(bucket);
      }
      if (rms > VOICE_RMS) {
        lastVoiceAtRef.current = now;
      }
      if (wsRef.current === null) {
        if (rms <= VOICE_RMS) {
          return;
        }
        wsRef.current = openTranscriptionStream({
          baseUrl: client().baseUrl,
          onPartial: (text) => handlers.current.onPartial(text),
          onFinal: (final) => {
            wsRef.current = null;
            setListening(false);
            if (final.text.trim() !== '') {
              handlers.current.onFinal(final.text);
            }
          },
          onError: () => {
            wsRef.current = null;
            setListening(false);
          },
        });
        setListening(true);
      }
      wsRef.current.feed(buffer.data, buffer.sampleRate);
      if (now - lastVoiceAtRef.current > UTTERANCE_SILENCE_MS) {
        closeUtterance(true);
      }
    },
  });

  useEffect(() => {
    enabledRef.current = options.enabled;
    if (!options.enabled) {
      return;
    }
    let mounted = true;
    void (async () => {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        handlers.current.onProblem('denied');
        return;
      }
      // Explicit routing: playAndRecord must keep playback on the speaker,
      // or narration goes quiet through the earpiece.
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
      });
      if (!mounted) {
        return;
      }
      try {
        await mic.start();
      } catch {
        handlers.current.onProblem('denied');
      }
    })();
    const aliveTicker = setInterval(
      () => setAlive(Date.now() - lastBufferAtRef.current < 2000),
      1000,
    );
    return () => {
      clearInterval(aliveTicker);
      mounted = false;
      enabledRef.current = false;
      try {
        mic.stop();
      } catch {
        // Released stream; nothing left to stop.
      }
      wsRef.current?.cancel();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled]);

  return { listening, level, alive };
}

export function useHoldToTalk(options: {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  /** 'denied' is the mic permission; 'server' is a failed stream. */
  onProblem: (kind: 'denied' | 'server') => void;
}) {
  const client = useSession((s) => s.client);
  const [listening, setListening] = useState(false);
  const wsRef = useRef<TranscriptionStream | null>(null);
  const handlers = useRef(options);
  handlers.current = options;
  const { stream: mic } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => wsRef.current?.feed(buffer.data, buffer.sampleRate),
  });

  // Every mic call tolerates a released native stream: leaving the screen
  // mid-hold (or a stop after teardown) must never throw out of a Swift
  // sync function into a crash (expo-modules-core SyncFunctionDefinition).
  const micStop = () => {
    try {
      mic.stop();
    } catch {
      // Released stream; nothing left to stop.
    }
  };

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      handlers.current.onProblem('denied');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    setListening(true);
    wsRef.current = openTranscriptionStream({
      baseUrl: client().baseUrl,
      onPartial: (text) => handlers.current.onPartial(text),
      onFinal: (final) => {
        wsRef.current = null;
        handlers.current.onFinal(final.text);
      },
      onError: () => {
        wsRef.current = null;
        handlers.current.onProblem('server');
      },
    });
    try {
      await mic.start();
    } catch {
      setListening(false);
      wsRef.current?.cancel();
      wsRef.current = null;
      handlers.current.onProblem('denied');
    }
  };

  const stop = () => {
    setListening(false);
    micStop();
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
      () => undefined,
    );
    wsRef.current?.end();
  };

  useEffect(
    () => () => {
      micStop();
      wsRef.current?.cancel();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { listening, start, stop };
}
