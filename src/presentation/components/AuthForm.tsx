import React, { useMemo, useState } from 'react';
import { Button, Text, TextInput, View, StyleSheet } from 'react-native';
import { signIn, signUp } from '../../application/auth';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.length > 3 && password.length >= 6, [email, password]);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed');
    }
  };

  const handleSignUp = async () => {
    try {
      setError(null);
      await signUp(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'Sign up failed');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>ログイン / 新規登録</Text>
      <TextInput
        placeholder="メールアドレス"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="パスワード（6文字以上）"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.row}>
        <Button title="ログイン" onPress={handleSignIn} disabled={!canSubmit} />
        <View style={{ width: 12 }} />
        <Button title="新規登録" onPress={handleSignUp} disabled={!canSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  errorText: { color: '#b00020', marginTop: 8 },
});

