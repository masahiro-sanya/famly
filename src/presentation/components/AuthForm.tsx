import React, { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { signIn, signUp, resetPassword } from '../../application/auth';
import { authErrorMessage, SIGN_IN_ERRORS, SIGN_UP_ERRORS } from '../../application/authError';
import type { FamlyTheme } from '../theme';

export function AuthForm() {
  const { colors } = useTheme<FamlyTheme>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const canSubmit = useMemo(() => email.length > 3 && password.length >= 6, [email, password]);
  const canReset = useMemo(() => email.length > 3, [email]);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signIn(email.trim(), password);
    } catch (e) {
      setError(authErrorMessage(e, 'ログインに失敗しました', SIGN_IN_ERRORS));
    }
  };

  const handleSignUp = async () => {
    try {
      setError(null);
      await signUp(email.trim(), password);
    } catch (e) {
      setError(authErrorMessage(e, '新規登録に失敗しました', SIGN_UP_ERRORS));
    }
  };

  const handleResetPassword = async () => {
    try {
      setError(null);
      setIsResetting(true);
      await resetPassword(email.trim());
      Alert.alert(
        'メール送信完了',
        'パスワードリセット用のメールを送信しました。メールをご確認ください。',
        [{ text: 'OK' }]
      );
    } catch (e) {
      setError(authErrorMessage(e, 'パスワードリセットに失敗しました'));
    } finally {
      setIsResetting(false);
    }
  };

  const styles = useMemo(() => ({
    card: { alignSelf: 'stretch' as const, borderRadius: 16 },
    title: { marginBottom: 16, fontWeight: '600' as const },
    input: { marginBottom: 12, backgroundColor: colors.inputBackground },
    row: { flexDirection: 'row' as const, gap: 12, marginTop: 8 },
    btn: { flex: 1 },
    errorText: { color: colors.dangerText, marginTop: 4, marginBottom: 4, fontSize: 13 },
    resetBtn: { marginTop: 12 },
  }), [colors]);

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>ログイン / 新規登録</Text>
        <TextInput
          label="メールアドレス"
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          dense
        />
        <TextInput
          label="パスワード（6文字以上）"
          mode="outlined"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          dense
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.row}>
          <Button mode="contained" onPress={handleSignIn} disabled={!canSubmit} style={styles.btn}>
            ログイン
          </Button>
          <Button mode="outlined" onPress={handleSignUp} disabled={!canSubmit} style={styles.btn}>
            新規登録
          </Button>
        </View>
        <Button
          mode="text"
          onPress={handleResetPassword}
          disabled={!canReset || isResetting}
          style={styles.resetBtn}
          compact
        >
          {isResetting ? '送信中...' : 'パスワードを忘れた方はこちら'}
        </Button>
      </Card.Content>
    </Card>
  );
}
