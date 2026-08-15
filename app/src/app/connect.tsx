import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

export default function Connect() {
  const { serverUrl, connection, setServerUrl, connect } = useSession();
  const [inputFocused, setInputFocused] = useState(false);
  const checking = connection === 'checking';

  return (
    <View style={styles.screen}>
      <TopBar title="Server" back />
      <View style={styles.body}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  body: {
    padding: spacing.xl,
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
});
