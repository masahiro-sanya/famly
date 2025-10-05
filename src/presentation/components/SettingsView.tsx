import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export function SettingsView({
  householdId,
  onSaveHouseholdId,
  onSignOut,
}: {
  householdId: string;
  onSaveHouseholdId: (hid: string) => void;
  onSignOut: () => void;
}) {
  const [hid, setHid] = useState(householdId);
  useEffect(() => setHid(householdId), [householdId]);
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>設定</Text>
      <Text style={styles.label}>Household ID</Text>
      <TextInput value={hid} onChangeText={setHid} style={styles.input} />
      <View style={{ height: 8 }} />
      <Button title="保存" onPress={() => onSaveHouseholdId(hid)} />
      <View style={{ height: 16 }} />
      <Button title="ログアウト" color="#b00020" onPress={onSignOut} />
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
});

