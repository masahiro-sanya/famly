// デフォルトタスク（テンプレ）の一覧/編集ビュー。
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, View, Keyboard, Pressable, TouchableWithoutFeedback } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultTask } from '../../domain/models';
import type { FamlyTheme } from '../theme';
import { DAY_LABELS, DefaultTaskRow } from './DefaultTaskRow';

export function DefaultTasksView({
  items,
  onAdd,
  onUpdateTitle,
  onUpdateDays,
  onMove,
  onDelete,
}: {
  items: DefaultTask[];
  onAdd: (title: string, days: number[]) => Promise<void> | void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateDays: (id: string, days: number[]) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
}) {
  const { colors } = useTheme<FamlyTheme>();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [bottomOffset, setBottomOffset] = useState<number>(insets.bottom + 16);
  const toggleDay = (d: number) => setDays((prev) => prev.includes(d) ? prev.filter(x => x!==d) : [...prev, d]);
  const canAdd = title.trim().length > 0 && days.length > 0;

  useEffect(() => {
    setBottomOffset(insets.bottom + 16);
  }, [insets.bottom]);

  const handleAdd = async () => {
    const v = title.trim();
    if (!v || days.length === 0) return;
    try {
      await Promise.resolve(onAdd(v, days));
      setTitle('');
      setDays([]);
      Keyboard.dismiss();
    } catch (e: any) {
      Alert.alert('エラー', e?.message ?? '追加に失敗しました');
    }
  };

  const styles = useMemo(() => ({
    card: { alignSelf: 'stretch' as const, borderRadius: 16 },
    sectionTitle: { fontWeight: '600' as const, marginBottom: 12 },
    input: { backgroundColor: colors.inputBackground, marginBottom: 8 },
    daysRow: { flexDirection: 'row' as const, flexWrap: 'nowrap' as const, gap: 4 },
    dayBtn: {
      height: 32,
      flex: 1,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.secondaryContainer,
    },
    dayBtnText: { fontSize: 13, color: colors.onSurface },
    dayBtnTextActive: { fontSize: 13, color: colors.onSurface, fontWeight: '600' as const },
    muted: { color: colors.textMuted, textAlign: 'center' as const, marginTop: 16 },
    bottomOverlay: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
    },
    fixedBarWrapper: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 16,
      paddingHorizontal: 4,
    },
    fixedBar: { borderRadius: 16 },
  }), [colors]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>デフォルトタスク</Text>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingBottom: (insets.bottom + 16) + 220 }}
            renderItem={({ item, index }) => (
              <DefaultTaskRow
                task={item}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onUpdateTitle={onUpdateTitle}
                onUpdateDays={onUpdateDays}
                onMove={onMove}
                onDelete={onDelete}
              />
            )}
            ListEmptyComponent={<Text style={styles.muted}>まだデフォルトタスクがありません</Text>}
            style={{ alignSelf: 'stretch' }}
          />
          {/* Bottom overlay */}
          <View pointerEvents="none" style={[styles.bottomOverlay, { height: bottomOffset }]} />
          {/* Bottom fixed new-item form */}
          <View style={[styles.fixedBarWrapper, { bottom: bottomOffset }]}>
            <Card style={styles.fixedBar} mode="elevated">
              <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>新規追加</Text>
                <TextInput
                  label="タイトル"
                  mode="outlined"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                  dense
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                <View style={[styles.daysRow, { marginBottom: 8 }]}>
                  {DAY_LABELS.map((label, idx) => {
                    const active = days.includes(idx);
                    return (
                      <Pressable
                        key={idx}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${label}曜日`}
                        onPress={() => toggleDay(idx)}
                        style={styles.dayBtn}
                      >
                        <Text style={active ? styles.dayBtnTextActive : styles.dayBtnText}>
                          {active ? `✓ ${label}` : label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Button mode="contained" onPress={handleAdd} disabled={!canAdd}>
                  追加
                </Button>
              </Card.Content>
            </Card>
          </View>
        </Card.Content>
      </Card>
    </TouchableWithoutFeedback>
  );
}
