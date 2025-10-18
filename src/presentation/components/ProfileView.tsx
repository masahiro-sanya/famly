import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { UserProfile } from '../../domain/models';

export function ProfileView({
  profile,
  onSave,
  householdName,
  householdId,
  membersCount,
}: {
  profile: UserProfile;
  onSave: (name: string) => void;
  householdName?: string | null;
  householdId?: string | null;
  membersCount?: number | null;
}) {
  const [name, setName] = useState(profile.name);
  useEffect(() => setName(profile.name), [profile.name]);
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>プロフィール</Text>
      <Text style={styles.label}>メール</Text>
      <Text style={styles.muted}>{profile.email}</Text>
      <View style={{ height: 8 }} />
      <Text style={styles.label}>家族</Text>
      <Text style={styles.muted}>
        {householdName || '未参加'}
        {membersCount != null ? `（${membersCount}人）` : ''}
      </Text>
      {householdId ? <Text style={styles.hint}>ID: {householdId}</Text> : null}
      <Text style={[styles.label, { marginTop: 12 }]}>名前</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <View style={{ height: 8 }} />
      <Button title="保存" onPress={() => onSave(name)} />
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
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { fontSize: 12, color: '#666' },
  muted: { color: '#888' },
  hint: { color: '#aaa' },
});
