import React, { useMemo, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, View, TouchableOpacity } from 'react-native';
import { DefaultTask } from '../../domain/models';

const dayLabels = ['日','月','火','水','木','金','土'];

export function DefaultTasksView({
  items,
  onAdd,
  onUpdateTitle,
  onUpdateDays,
  onDelete,
}: {
  items: DefaultTask[];
  onAdd: (title: string, days: number[]) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateDays: (id: string, days: number[]) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const toggleDay = (d: number) => setDays((prev) => prev.includes(d) ? prev.filter(x => x!==d) : [...prev, d]);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>デフォルトタスク</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={item.title}
              onChangeText={(v) => onUpdateTitle(item.id, v)}
            />
            <View style={{ height: 8 }} />
            <View style={styles.daysRow}>
              {dayLabels.map((label, idx) => {
                const active = (item.daysOfWeek || []).includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      const next = active ? item.daysOfWeek.filter(d=>d!==idx) : [...(item.daysOfWeek||[]), idx];
                      onUpdateDays(item.id, next);
                    }}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                  >
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 8 }} />
            <Button title="削除" color="#b00020" onPress={() => onDelete(item.id)} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>まだデフォルトタスクがありません</Text>}
        style={{ alignSelf: 'stretch' }}
      />
      <View style={{ height: 16 }} />
      <Text style={styles.sectionTitle}>新規追加</Text>
      <TextInput
        placeholder="タイトル"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <View style={{ height: 8 }} />
      <View style={styles.daysRow}>
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
      <View style={{ height: 8 }} />
      <Button
        title="追加"
        onPress={() => { if (title.trim()) { onAdd(title, days); setTitle(''); setDays([]); } }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 999 },
  dayChipActive: { backgroundColor: '#eef4ff', borderColor: '#99b7ff' },
  dayText: { color: '#555' },
  dayTextActive: { color: '#2453ff', fontWeight: '600' },
  muted: { color: '#888' },
});

