// デフォルトタスク（テンプレ）の一覧/編集ビュー。
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, TextInput, View, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultTask } from '../../domain/models';

const dayLabels = ['日','月','火','水','木','金','土'];

/** household単位のテンプレを編集するシンプルな画面 */
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
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [bottomOffset, setBottomOffset] = useState<number>(insets.bottom + 16);
  const toggleDay = (d: number) => setDays((prev) => prev.includes(d) ? prev.filter(x => x!==d) : [...prev, d]);
  const canAdd = title.trim().length > 0 && days.length > 0;

  useEffect(() => {
    // Anchor to safe-area bottom; KeyboardAvoidingView in AppRoot handles keyboard shift.
    setBottomOffset(insets.bottom + 16);
  }, [insets.bottom]);

  // 下部に固定フォームを置くため、リストは純粋に items のみを描画

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>デフォルトタスク</Text>
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: (insets.bottom + 16) + 220 }}
          renderItem={({ item, index }) => {
            const task = item as DefaultTask;
            const isFirst = index === 0;
            const isLast = index === items.length - 1;
            return (
              <View style={styles.item}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={task.title}
                  onChangeText={(v) => onUpdateTitle(task.id, v)}
                />
                <View style={styles.row}>
                  <Button title="↑" disabled={isFirst} onPress={() => onMove(task.id, 'up')} />
                  <View style={{ width: 8 }} />
                  <Button title="↓" disabled={isLast} onPress={() => onMove(task.id, 'down')} />
                  <View style={{ width: 8 }} />
                  <Button
                    title="削除"
                    color="#b00020"
                    onPress={() =>
                      Alert.alert('削除の確認', `「${task.title}」を削除しますか？`, [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除', style: 'destructive', onPress: () => onDelete(task.id) },
                      ])
                    }
                  />
                </View>
                <View style={{ height: 8 }} />
                <View style={styles.daysRow}>
                  {dayLabels.map((label, idx) => {
                    const active = (task.daysOfWeek || []).includes(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          const next = active ? task.daysOfWeek.filter(d=>d!==idx) : [...(task.daysOfWeek||[]), idx];
                          onUpdateDays(task.id, next);
                        }}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                      >
                        <Text style={[styles.dayText, active && styles.dayTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={{ height: 8 }} />
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.muted}>まだデフォルトタスクがありません</Text>}
          style={{ alignSelf: 'stretch' }}
        />
        {/* Bottom white backdrop to hide system gaps above keyboard */}
        <View pointerEvents="none" style={[styles.bottomOverlay, { height: bottomOffset }]} />
        {/* Bottom fixed new-item form */}
        <View style={[styles.fixedBarWrapper, { bottom: bottomOffset }]}>
          <View style={styles.fixedBar}>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>新規追加</Text>
            <TextInput
              placeholder="タイトル"
              value={title}
              onChangeText={setTitle}
              style={[styles.input, { marginBottom: 8 }]}
              returnKeyType="done"
              onSubmitEditing={() => {
                (async () => {
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
                })();
              }}
            />
            <View style={[styles.daysRow, { marginBottom: 8 }]}>
              {dayLabels.map((label, idx) => {
                const active = days.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => toggleDay(idx)}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                  >
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Button
              title="追加"
              disabled={!canAdd}
              onPress={() => {
                (async () => {
                  if (!canAdd) return;
                  try {
                    await Promise.resolve(onAdd(title.trim(), days));
                    setTitle('');
                    setDays([]);
                    Keyboard.dismiss();
                  } catch (e: any) {
                    Alert.alert('エラー', e?.message ?? '追加に失敗しました');
                  }
                })();
              }}
            />
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 999 },
  dayChipActive: { backgroundColor: '#eef4ff', borderColor: '#99b7ff' },
  dayText: { color: '#555' },
  dayTextActive: { color: '#2453ff', fontWeight: '600' },
  muted: { color: '#888' },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
  fixedBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  fixedBar: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
  },
});
