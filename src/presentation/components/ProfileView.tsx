import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { UserProfile } from '../../domain/models';
import type { FamlyTheme } from '../theme';

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
  const { colors } = useTheme<FamlyTheme>();
  const [name, setName] = useState(profile.name);
  useEffect(() => setName(profile.name), [profile.name]);

  const styles = useMemo(() => ({
    card: { alignSelf: 'stretch' as const, borderRadius: 16 },
    sectionTitle: { fontWeight: '600' as const, marginBottom: 12 },
    input: { backgroundColor: colors.inputBackground },
    label: { color: colors.textSecondary, marginBottom: 2 },
    muted: { color: colors.textMuted },
    hint: { color: colors.textHint, fontSize: 11, marginTop: 2 },
  }), [colors]);

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>プロフィール</Text>

        <Text variant="labelSmall" style={styles.label}>メール</Text>
        <Text variant="bodyMedium" style={styles.muted}>{profile.email}</Text>

        <View style={{ height: 12 }} />
        <Text variant="labelSmall" style={styles.label}>家族</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          {householdName || '未参加'}
          {membersCount != null ? `（${membersCount}人）` : ''}
        </Text>
        {householdId ? <Text variant="bodySmall" style={styles.hint}>ID: {householdId}</Text> : null}

        <View style={{ height: 16 }} />
        <TextInput
          label="名前"
          mode="outlined"
          value={name}
          onChangeText={setName}
          style={styles.input}
          dense
        />
        <View style={{ height: 8 }} />
        <Button mode="contained" onPress={() => onSave(name)}>
          保存
        </Button>
      </Card.Content>
    </Card>
  );
}
