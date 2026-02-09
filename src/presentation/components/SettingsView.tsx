import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View, Keyboard, TouchableWithoutFeedback, Platform, ToastAndroid, Linking } from 'react-native';
import { Button, Card, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { deleteMyAccount as deleteMyAccountAction } from '../../application/account';
import Constants from 'expo-constants';
import type { FamlyTheme } from '../theme';

// Household管理を含む設定画面
export function SettingsView({
  householdId,
  inviteCode,
  householdName,
  members,
  onCreateHousehold,
  onJoinByCode,
  onRegenerateInvite,
  onUpdateHouseholdName,
  onLeave,
  onSignOut,
}: {
  householdId: string;
  inviteCode?: string;
  householdName?: string;
  members?: Array<{ id: string; name?: string; email?: string }>;
  onCreateHousehold: (name: string) => Promise<void> | void;
  onJoinByCode: (code: string) => Promise<void> | void;
  onRegenerateInvite: () => Promise<void> | void;
  onUpdateHouseholdName: (name: string) => Promise<void> | void;
  onLeave: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
}) {
  const { colors } = useTheme<FamlyTheme>();
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [editName, setEditName] = useState(householdName ?? '');
  useEffect(() => setEditName(householdName ?? ''), [householdName]);
  const privacyUrl = useMemo(() => {
    const fromEnv = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL as string | undefined;
    const fromExtra = (Constants?.expoConfig?.extra as any)?.privacyPolicyUrl as string | undefined;
    return (fromEnv && fromEnv.length > 0) ? fromEnv : (fromExtra && fromExtra.length > 0 ? fromExtra : undefined);
  }, []);
  const isInFamily = !!inviteCode;

  const styles = useMemo(() => ({
    container: { alignSelf: 'stretch' as const, gap: 16 },
    card: { borderRadius: 16 },
    sectionTitle: { fontWeight: '600' as const, marginBottom: 12 },
    input: { backgroundColor: colors.inputBackground },
    label: { color: colors.textSecondary, marginBottom: 2 },
    muted: { color: colors.textSecondary, marginBottom: 4 },
    inviteRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 8 },
    memberLine: { color: colors.textDark, marginBottom: 4 },
    hint: { color: colors.textHint },
    actionBtn: { marginTop: 8 },
    dangerBtn: { borderColor: colors.dangerBorder },
  }), [colors]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {/* 家族情報セクション */}
        <Card style={styles.card} mode="outlined" elevation={0 as any}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>家族設定</Text>

            <Text variant="labelSmall" style={styles.label}>Household ID</Text>
            <Text variant="bodySmall" style={styles.muted}>{householdId}</Text>

            {inviteCode ? (
              <View style={styles.inviteRow}>
                <Text variant="bodyMedium" style={{ flex: 1 }}>招待コード: {inviteCode}</Text>
                <IconButton
                  icon={copied ? 'check' : 'content-copy'}
                  size={20}
                  onPress={async () => {
                    if (!inviteCode) return;
                    await Clipboard.setStringAsync(inviteCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                />
              </View>
            ) : null}

            {isInFamily && (
              <Button
                mode="outlined"
                compact
                style={styles.actionBtn}
                onPress={async () => {
                  try {
                    await onRegenerateInvite();
                    Platform.OS === 'android' ? ToastAndroid.show('招待コードを再発行しました', ToastAndroid.SHORT) : Alert.alert('完了', '招待コードを再発行しました');
                  } catch (e: any) {
                    Alert.alert('エラー', e?.message ?? '再発行に失敗しました');
                  }
                }}
              >
                招待コードを再発行
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* 家族名編集セクション（家族参加中のみ） */}
        {isInFamily && (
          <Card style={styles.card} mode="outlined" elevation={0 as any}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.sectionTitle}>家族名を編集</Text>
              <TextInput
                mode="outlined"
                value={editName}
                onChangeText={setEditName}
                style={styles.input}
                dense
              />
              <View style={{ height: 8 }} />
              <Button
                mode="contained"
                onPress={async () => {
                  const v = editName.trim();
                  if (!v) { Alert.alert('エラー', '家族名を入力してください'); return; }
                  try {
                    await onUpdateHouseholdName(v);
                    Platform.OS === 'android' ? ToastAndroid.show('保存しました', ToastAndroid.SHORT) : Alert.alert('完了', '保存しました');
                  } catch (e: any) {
                    Alert.alert('エラー', e?.message ?? '保存に失敗しました');
                  }
                }}
              >
                保存
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* メンバー一覧 */}
        <Card style={styles.card} mode="outlined" elevation={0 as any}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>メンバー</Text>
            {(members && members.length > 0) ? (
              members.map((m) => (
                <Text key={m.id} variant="bodyMedium" style={styles.memberLine}>
                  {m.name || '(名前未設定)'}{' '}
                  <Text variant="bodySmall" style={styles.hint}>{m.email || ''}</Text>
                </Text>
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.muted}>（メンバーなし）</Text>
            )}
          </Card.Content>
        </Card>

        {/* 招待コードで参加（未参加時のみ） */}
        {!isInFamily && (
          <Card style={styles.card} mode="outlined" elevation={0 as any}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.sectionTitle}>招待コードで参加</Text>
              <TextInput
                mode="outlined"
                value={code}
                onChangeText={setCode}
                style={styles.input}
                dense
                autoCapitalize="characters"
              />
              <View style={{ height: 8 }} />
              <Button
                mode="contained"
                onPress={async () => {
                  if (!code.trim()) { Alert.alert('エラー', '招待コードを入力してください'); return; }
                  try {
                    await onJoinByCode(code.trim());
                    setCode('');
                    Platform.OS === 'android' ? ToastAndroid.show('参加しました', ToastAndroid.SHORT) : Alert.alert('完了', '参加しました');
                  } catch (e: any) {
                    Alert.alert('エラー', e?.message ?? '参加に失敗しました（無効なコードの可能性）');
                  }
                }}
              >
                参加
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* 家族を新規作成（未参加時のみ） */}
        {!isInFamily && (
          <Card style={styles.card} mode="outlined" elevation={0 as any}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.sectionTitle}>新しい家族を作成</Text>
              <TextInput
                label="家族名"
                mode="outlined"
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
                dense
              />
              <View style={{ height: 8 }} />
              <Button
                mode="contained"
                onPress={async () => {
                  const v = newName.trim();
                  if (!v) { Alert.alert('エラー', '家族名を入力してください'); return; }
                  try {
                    await onCreateHousehold(v);
                    setNewName('');
                    Platform.OS === 'android' ? ToastAndroid.show('作成しました', ToastAndroid.SHORT) : Alert.alert('完了', '作成しました');
                  } catch (e: any) {
                    Alert.alert('エラー', e?.message ?? '作成に失敗しました');
                  }
                }}
              >
                家族を作成
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* 危険操作セクション */}
        <Card style={styles.card} mode="outlined" elevation={0 as any}>
          <Card.Content>
            {isInFamily && (
              <>
                <Button
                  mode="outlined"
                  textColor={colors.dangerText}
                  style={styles.dangerBtn}
                  onPress={() => {
                    Alert.alert('確認', '家族から退出しますか？（タスク共有が解除されます）', [
                      { text: 'キャンセル', style: 'cancel' },
                      { text: '退出', style: 'destructive', onPress: async () => {
                        try {
                          await onLeave();
                          Platform.OS === 'android' ? ToastAndroid.show('退出しました', ToastAndroid.SHORT) : Alert.alert('完了', '退出しました');
                        } catch (e: any) {
                          Alert.alert('エラー', e?.message ?? '退出に失敗しました');
                        }
                      }}
                    ]);
                  }}
                >
                  家族から退出
                </Button>
                <View style={{ height: 12 }} />
              </>
            )}

            <Button
              mode="outlined"
              textColor={colors.dangerText}
              style={styles.dangerBtn}
              onPress={onSignOut}
            >
              ログアウト
            </Button>

            <View style={{ height: 12 }} />

            {privacyUrl ? (
              <>
                <Button
                  mode="text"
                  onPress={async () => { try { await Linking.openURL(privacyUrl); } catch (e) { Alert.alert('エラー', 'リンクを開けませんでした'); } }}
                >
                  プライバシーポリシー
                </Button>
                <View style={{ height: 12 }} />
              </>
            ) : null}

            <Button
              mode="contained"
              buttonColor={colors.dangerBackground}
              textColor={colors.onError}
              onPress={() => {
                Alert.alert(
                  '確認',
                  'アカウントと個人データを削除します。元に戻せません。よろしいですか？',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: '削除',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteMyAccountAction();
                          Platform.OS === 'android'
                            ? ToastAndroid.show('アカウントを削除しました', ToastAndroid.SHORT)
                            : Alert.alert('完了', 'アカウントを削除しました');
                          await onSignOut();
                        } catch (e: any) {
                          Alert.alert('エラー', e?.message ?? '削除に失敗しました');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              アカウント削除
            </Button>
          </Card.Content>
        </Card>
      </View>
    </TouchableWithoutFeedback>
  );
}
