import React, { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, Keyboard, TouchableWithoutFeedback, Platform, ToastAndroid } from 'react-native';
import * as Clipboard from 'expo-clipboard';

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
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [editName, setEditName] = useState(householdName ?? '');
  useEffect(() => setEditName(householdName ?? ''), [householdName]);
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.card}>
      <Text style={styles.sectionTitle}>家族設定</Text>

      <Text style={styles.label}>現在のHousehold ID</Text>
      <Text style={styles.muted}>{householdId}</Text>
      {inviteCode ? (
        <View style={styles.inviteRow}>
          <Text style={styles.muted}>招待コード: {inviteCode}</Text>
          <View style={{ width: 8 }} />
          <Button
            title={copied ? 'コピー済' : 'コピー'}
            onPress={async () => {
              if (!inviteCode) return;
              await Clipboard.setStringAsync(inviteCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          />
        </View>
      ) : null}
      {inviteCode ? (
        <View style={{ height: 8 }} />
      ) : null}
      {!!inviteCode && (
        <Button title="招待コードを再発行" onPress={async () => {
          try {
            await onRegenerateInvite();
            Platform.OS === 'android' ? ToastAndroid.show('招待コードを再発行しました', ToastAndroid.SHORT) : Alert.alert('完了', '招待コードを再発行しました');
          } catch (e: any) {
            Alert.alert('エラー', e?.message ?? '再発行に失敗しました');
          }
        }} />
      )}

      <View style={{ height: 16 }} />
      <Text style={styles.label}>家族名を編集</Text>
      <TextInput value={editName} onChangeText={setEditName} style={styles.input} />
      <View style={{ height: 8 }} />
      <Button title="家族名を保存" onPress={async () => {
        const v = editName.trim();
        if (!v) { Alert.alert('エラー', '家族名を入力してください'); return; }
        try {
          await onUpdateHouseholdName(v);
          Platform.OS === 'android' ? ToastAndroid.show('保存しました', ToastAndroid.SHORT) : Alert.alert('完了', '保存しました');
        } catch (e: any) {
          Alert.alert('エラー', e?.message ?? '保存に失敗しました');
        }
      }} />

      <View style={{ height: 16 }} />
      <Text style={styles.label}>メンバー</Text>
      <View style={{ marginBottom: 8 }}>
        {(members && members.length > 0) ? (
          members.map((m) => (
            <Text key={m.id} style={styles.memberLine}>{m.name || '(名前未設定)'} <Text style={styles.hint}>{m.email || ''}</Text></Text>
          ))
        ) : (
          <Text style={styles.muted}>（メンバーなし）</Text>
        )}
      </View>

      <View style={{ height: 16 }} />
      <Text style={styles.label}>招待コードで参加</Text>
      <TextInput value={code} onChangeText={setCode} style={styles.input} autoCapitalize="characters" />
      <View style={{ height: 8 }} />
      <Button title="参加" onPress={async () => {
        if (!code.trim()) { Alert.alert('エラー', '招待コードを入力してください'); return; }
        try {
          await onJoinByCode(code.trim());
          setCode('');
          Platform.OS === 'android' ? ToastAndroid.show('参加しました', ToastAndroid.SHORT) : Alert.alert('完了', '参加しました');
        } catch (e: any) {
          Alert.alert('エラー', e?.message ?? '参加に失敗しました（無効なコードの可能性）');
        }
      }} />

      <View style={{ height: 16 }} />
      <Text style={styles.label}>新しい家族を作成（名前）</Text>
      <TextInput value={newName} onChangeText={setNewName} style={styles.input} />
      <View style={{ height: 8 }} />
      <Button title="家族を作成" onPress={async () => {
        const v = newName.trim();
        if (!v) { Alert.alert('エラー', '家族名を入力してください'); return; }
        try {
          await onCreateHousehold(v);
          setNewName('');
          Platform.OS === 'android' ? ToastAndroid.show('作成しました', ToastAndroid.SHORT) : Alert.alert('完了', '作成しました');
        } catch (e: any) {
          Alert.alert('エラー', e?.message ?? '作成に失敗しました');
        }
      }} />

      <View style={{ height: 16 }} />
      <Button title="家族から退出" color="#b00020" onPress={() => {
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
      }} />

      <View style={{ height: 16 }} />
      <Button title="ログアウト" color="#b00020" onPress={onSignOut} />
    </View>
    </TouchableWithoutFeedback>
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
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { fontSize: 12, color: '#666' },
  muted: { color: '#666', marginBottom: 4 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  memberLine: { color: '#444', marginBottom: 2 },
  hint: { color: '#aaa' },
});
