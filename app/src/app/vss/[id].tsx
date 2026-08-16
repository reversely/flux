import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { mapTranscript, suggestedOptions } from '@/api/speech';
import { useHoldToTalk, useNarration } from '@/api/voice';
import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { findingFor, sourceById, vssById } from '@/data/vss';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

/** On-device speech that resolves when the line has been said, so the
 * capture prompt can finish before the unmuted clip starts recording. */
const speakThrough = (line: string) =>
  new Promise<void>((resolve) => {
    Speech.speak(line, { onDone: () => resolve(), onError: () => resolve() });
  });

type Phase = 'intro' | 'filming' | 'interview' | 'result';

/**
 * A VSS session (PRD 1.6). The clip records first because motion carries the
 * evidence, the interview runs while the box reads it, and every question is
 * tappable so the session never depends on voice. The result leads with what
 * it means, then the quoted source, then a deep link.
 */
export default function VssScreen() {
  // `answers=k=v,k=v` replays a session deterministically, the same way the
  // walkthrough link does, so a result can be reopened or shown in a shot.
  const { id, answers: replay } = useLocalSearchParams<{ id: string; answers?: string }>();
  const session = id === undefined ? undefined : vssById(id);
  const [permission, requestPermission] = useCameraPermissions();
  const replayed = Object.fromEntries(
    (replay ?? '')
      .split(',')
      .map((pair) => pair.split('='))
      .filter((parts): parts is [string, string] => parts.length === 2 && parts[0] !== ''),
  );
  const [phase, setPhase] = useState<Phase>(replay === undefined ? 'intro' : 'result');
  const [answers, setAnswers] = useState<Record<string, string>>(replayed);
  const [step, setStep] = useState(0);
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // What the user said while filming; suggests options, never answers them.
  const [clipHeard, setClipHeard] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const camera = useRef<CameraView | null>(null);
  const client = useSession((s) => s.client);
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const question = session?.questions[step];

  // Every question is spoken as it appears (Kokoro through the server,
  // on-device fallback); the options stay tappable, so silence never
  // blocks the session.
  const narration = useNarration();
  useEffect(() => {
    if (phase === 'interview' && question !== undefined) {
      setHeard(null);
      void narration.speak(`${question.ask} Options: ${question.options.join(', ')}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question]);

  // Hold-to-talk answers pass the same exact gate as the walk; a spoken
  // option is a confirmation, anything else asks again.
  const talk = useHoldToTalk({
    onPartial: setHeard,
    onFinal: (text) => {
      if (question === undefined) {
        return;
      }
      const mapped = mapTranscript(text, question.options);
      if (mapped.action === 'answer') {
        setHeard(null);
        answer(mapped.state);
      } else if (mapped.action === 'repeat') {
        setHeard(null);
        void narration.speak(`${question.ask} Options: ${question.options.join(', ')}.`);
      } else if (mapped.action === 'undo') {
        setHeard(null);
        setStep(Math.max(0, step - 1));
      } else {
        setHeard(`"${text}" — say a listed option`);
      }
    },
    onProblem: (kind) =>
      setHeard(kind === 'denied' ? 'Mic off. Allow the microphone.' : 'Voice needs the server'),
  });

  if (session === undefined) {
    return (
      <View style={styles.screen}>
        <TopBar title="Session" back />
        <Text style={styles.pad}>No session by that name</Text>
      </View>
    );
  }

  const finding = findingFor(session, answers);
  const findingSource = sourceById(session, finding.source);

  // The clip goes to the box while the interview runs, and its audio track
  // goes to Parakeet: what the user said while filming becomes suggestions
  // on the interview options. The capture prompt finishes speaking before
  // recording starts, so the app's own voice never lands in the clip. When
  // no server is reachable the interview still happens; the session says
  // so rather than pretending it looked.
  const record = async () => {
    setPhase('filming');
    setNote(null);
    setClipHeard(null);
    if (micPermission !== null && !micPermission.granted && micPermission.canAskAgain) {
      await requestMicPermission();
    }
    await speakThrough(session.capture);
    try {
      const video = await camera.current?.recordAsync({
        codec: 'avc1',
        maxDuration: session.clipSeconds,
      });
      setPhase('interview');
      if (video !== undefined) {
        setReading(true);
        void (async () => {
          try {
            const sessionId = await client().createSession();
            await client().uploadFrame(sessionId, video.uri, new Date().toISOString(), 'video/quicktime');
          } catch {
            setNote('No server, so nothing watched the clip. The answer below is from your answers alone.');
          } finally {
            setReading(false);
          }
        })();
        void (async () => {
          try {
            const clip = await client().transcribeClip(video.uri);
            if (clip.text.trim() !== '') {
              setClipHeard(clip.text);
            }
          } catch {
            // No speech backend; the clip still went to VSS above.
          }
        })();
      }
    } catch {
      setPhase('interview');
      setNote('Camera did not record. The interview still works.');
    }
  };

  const answer = (value: string) => {
    if (question === undefined) {
      return;
    }
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    setHeard(null);
    if (step + 1 < session.questions.length) {
      setStep(step + 1);
    } else {
      narration.stop();
      setPhase('result');
    }
  };

  const suggested = question !== undefined && clipHeard !== null
    ? suggestedOptions(clipHeard, question.options)
    : [];

  return (
    <View style={styles.screen}>
      <TopBar title={session.title} back />

      {phase === 'filming' && Device.isDevice && permission?.granted === true && (
        <CameraView
          ref={camera}
          style={styles.preview}
          mode="video"
          facing="back"
          mute={micPermission?.granted !== true}
          videoQuality="4:3"
        />
      )}

      <ScrollView contentContainerStyle={styles.body}>
        {phase === 'intro' && (
          <View style={styles.card}>
            <Text style={typography.surfaceTitle}>{session.capture}</Text>
            <Text style={typography.annotation}>
              {session.clipSeconds} seconds. Questions while it reads.
            </Text>
            {Device.isDevice && permission !== null && !permission.granted ? (
              <Pressable style={styles.primary} onPress={() => void requestPermission()}>
                <Text style={typography.button}>Allow camera</Text>
              </Pressable>
            ) : (
              <View style={styles.row}>
                <Pressable style={styles.primary} onPress={() => void record()}>
                  <Text style={typography.button}>Record</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => setPhase('interview')}>
                  <Text style={styles.secondaryText}>Skip the clip</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {phase === 'filming' && (
          <View style={styles.card}>
            <Tag label="Recording" tone="red" />
            <Text style={typography.annotation}>{session.capture}</Text>
          </View>
        )}

        {phase === 'interview' && question !== undefined && (
          <View style={styles.card}>
            {reading && (
              <View style={styles.readingRow}>
                <Feather name="eye" size={14} color={colors.signature} />
                <Text style={styles.readingText}>Reading the clip</Text>
              </View>
            )}
            <Text style={typography.surfaceTitle}>{question.ask}</Text>
            <Text style={typography.annotation}>{question.because}</Text>
            <View style={styles.row}>
              {question.options.map((option) => {
                const hinted = suggested.includes(option);
                return (
                  <Pressable
                    key={option}
                    style={[styles.chip, hinted && styles.chipSuggested]}
                    onPress={() => answer(option)}
                  >
                    <Text style={styles.chipText}>
                      {option}
                      {hinted ? ' · heard' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.voiceRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={talk.listening ? 'Release to answer' : 'Hold to answer by voice'}
                onPressIn={() => {
                  narration.stop();
                  setHeard('Listening');
                  void talk.start();
                }}
                onPressOut={talk.stop}
                style={[styles.micButton, talk.listening && styles.micButtonLive]}
              >
                <Feather name="mic" size={18} color={talk.listening ? colors.card : colors.ink} />
              </Pressable>
              <Text style={[typography.annotation, styles.heardText]} numberOfLines={2}>
                {heard ?? 'Hold. Say an option.'}
              </Text>
            </View>
            {clipHeard !== null && (
              <Text style={typography.annotation} numberOfLines={2}>
                In the clip: {clipHeard}
              </Text>
            )}
            <Text style={typography.annotation}>
              {step + 1} of {session.questions.length}
            </Text>
          </View>
        )}

        {phase === 'result' && (
          <View style={styles.card}>
            {finding.image !== undefined && <Image source={finding.image} style={styles.figure} />}
            <Text style={typography.surfaceTitle}>{finding.means}</Text>
            <View style={styles.quote}>
              <Text style={styles.quoteText}>{finding.quote}</Text>
              {findingSource !== undefined && (
                <Pressable onPress={() => void Linking.openURL(findingSource.url)}>
                  <Text style={styles.sourceLine}>{findingSource.title}</Text>
                </Pressable>
              )}
            </View>
            <Pressable
              style={styles.secondary}
              onPress={() => {
                setAnswers({});
                setStep(0);
                setPhase('intro');
              }}
            >
              <Text style={styles.secondaryText}>Again</Text>
            </Pressable>
          </View>
        )}

        {note !== null && <Text style={typography.annotation}>{note}</Text>}

        <View style={styles.sources}>
          <Text style={styles.sourcesHead}>Sources</Text>
          {session.sources.map((s, i) => (
            <Pressable key={s.id} onPress={() => void Linking.openURL(s.url)}>
              <Text style={styles.sourceLine}>
                [{i + 1}] {s.title}
              </Text>
              <Text style={typography.annotation}>{s.licence}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { ...typography.body, padding: spacing.l },
  preview: { height: 220 },
  body: { padding: spacing.l, gap: spacing.m },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.l,
    gap: spacing.m,
  },
  figure: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    borderRadius: radius.control,
    backgroundColor: colors.gray.softBg,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  readingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  readingText: { ...typography.annotation, color: colors.signature },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.steel[1],
    paddingLeft: spacing.m,
    gap: spacing.xs,
  },
  quoteText: { ...typography.body, fontSize: 14, lineHeight: 21 },
  primary: {
    height: sizes.control,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
  },
  secondary: {
    height: sizes.control,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.steel[2],
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryText: { ...typography.listBody, color: colors.ink },
  chip: {
    height: sizes.chip,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.steel[1],
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
  },
  chipText: { ...typography.listBody, color: colors.ink },
  chipSuggested: { borderColor: colors.signature, backgroundColor: colors.signatureSoft },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  micButton: {
    width: sizes.control,
    height: sizes.control,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.steel[2],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  micButtonLive: { backgroundColor: colors.signature, borderColor: colors.signature },
  heardText: { flex: 1 },
  sources: { gap: spacing.xs, marginTop: spacing.l },
  sourcesHead: { ...typography.annotation, textTransform: 'uppercase', letterSpacing: 0.4 },
  sourceLine: { ...typography.listBody, color: colors.signature },
});
