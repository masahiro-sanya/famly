import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View, Keyboard, TouchableWithoutFeedback } from 'react-native';
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
  onCreateHousehold: (name: string) => void;
  onJoinByCode: (code: string) => void;
  onRegenerateInvite: () => void;
  onUpdateHouseholdName: (name: string) => void;
  onLeave: () => void;
  onSignOut: () => void;
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
      {!!inviteCode && <Button title="招待コードを再発行" onPress={onRegenerateInvite} />}

      <View style={{ height: 16 }} />
      <Text style={styles.label}>家族名を編集</Text>
      <TextInput value={editName} onChangeText={setEditName} style={styles.input} />
      <View style={{ height: 8 }} />
      <Button title="家族名を保存" onPress={() => onUpdateHouseholdName(editName)} />

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
      <Button title="参加" onPress={() => onJoinByCode(code)} />

      <View style={{ height: 16 }} />
      <Text style={styles.label}>新しい家族を作成（名前）</Text>
      <TextInput value={newName} onChangeText={setNewName} style={styles.input} />
      <View style={{ height: 8 }} />
      <Button title="家族を作成" onPress={() => { onCreateHousehold(newName); setNewName(''); }} />

      <View style={{ height: 16 }} />
      <Button title="家族から退出" color="#b00020" onPress={onLeave} />

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
