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

export function useNarration() {
  const client = useSession((s) => s.client);
  const player = useAudioPlayer();

  const speak = useCallback(
    async (line: string) => {
      Speech.stop();
      player.pause();
      try {
        const narration = await client().createNarration(line);
        player.replace({ uri: client().narrationUrl(narration.audio_url) });
        player.play();
      } catch {
        Speech.speak(line);
      }
    },
    [client, player],
  );

  const stop = useCallback(() => {
    Speech.stop();
    player.pause();
  }, [player]);

  useEffect(() => () => void Speech.stop(), []);

  return { speak, stop };
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
    await mic.start();
  };

  const stop = () => {
    setListening(false);
    mic.stop();
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    wsRef.current?.end();
  };

  useEffect(
    () => () => {
      mic.stop();
      wsRef.current?.cancel();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { listening, start, stop };
}
