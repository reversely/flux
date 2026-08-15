import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Tag } from '@/components/Tag';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

// The simulator shares the Mac's network stack, so the stub is on localhost.
const SIMULATOR_DEFAULT_URL = Device.isDevice ? '' : 'http://localhost:8000';

export default function Connect() {
  const { serverUrl, connection, setServerUrl, connect } = useSession();
  const [inputFocused, setInputFocused] = useState(false);
  const checking = connection === 'checking';

  useEffect(() => {
    const state = useSession.getState();
    if (!state.serverUrl && SIMULATOR_DEFAULT_URL) {
      state.setServerUrl(SIMULATOR_DEFAULT_URL);
    }
    if (useSession.getState().serverUrl) {
      void useSession.getState().connect();
    }
    // Silent health check of the stored URL, once per launch.
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={typography.pageTitle}>flux</Text>
      <View style={styles.card}>
        <TextInput
          style={[styles.input, inputFocused && styles.inputFocused]}
          value={serverUrl}
          onChangeText={setServerUrl}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="http://192.168.0.10:8000"
          placeholderTextColor={colors.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.statusRow}>
          <Pressable
            style={[styles.button, (checking || !serverUrl) && styles.buttonDisabled]}
            onPress={() => void connect()}
            disabled={checking || !serverUrl}
          >
            {checking ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={typography.button}>Connect</Text>
            )}
          </Pressable>
          {connection === 'connected' && <Tag label="connected" tone="green" />}
          {connection === 'unreachable' && <Tag label="unreachable" tone="red" />}
        </View>
        {connection === 'unreachable' && (
          <Text style={styles.helper}>
            Please check that the server is running and that this device is on the same
            Wi-Fi.
          </Text>
        )}
      </View>
      {connection === 'connected' && (
        <View style={styles.actions}>
          <Pressable style={styles.startButton} onPress={() => router.push('/scan')}>
            <Text style={typography.button}>Start scan</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/review', params: { sessionId: 'sess_sample' } })
            }
          >
            <Text style={styles.link}>Review sample</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    gap: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    padding: spacing.xl,
    gap: spacing.m,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  input: {
    height: sizes.control,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: spacing.m,
    color: colors.ink,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.signature,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  button: {
    height: sizes.control,
    minWidth: 104,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helper: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  link: {
    ...typography.button,
    color: colors.signature,
    paddingHorizontal: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  startButton: {
    height: sizes.focalAction,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
