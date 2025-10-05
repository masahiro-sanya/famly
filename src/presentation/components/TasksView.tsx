import React, { useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Task } from '../../domain/models';

export function TasksView({
  currentUserId,
  tasks,
  onUpdate,
  onDelete,
  onEditingChange,
}: {
  currentUserId: string;
  tasks: Task[];
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onEditingChange?: (editing: boolean) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>履歴</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 180 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item }) => {
          const isEditing = editingId === item.id;
          if (isEditing) {
            return (
              <View style={styles.listItem}>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  value={editingTitle}
                  onChangeText={setEditingTitle}
                />
                <View style={styles.row}>
                  <Button
                    title="保存"
                    onPress={() => {
                      const v = editingTitle.trim();
                      if (!v) return;
                      onUpdate(item.id, v);
                      setEditingId(null);
                      setEditingTitle('');
                      onEditingChange?.(false);
                    }}
                  />
                  <View style={{ width: 12 }} />
                  <Button
                    title="キャンセル"
                    onPress={() => {
                      setEditingId(null);
                      setEditingTitle('');
                      onEditingChange?.(false);
                    }}
                  />
                </View>
              </View>
            );
          }
          return (
            <View style={styles.listItem}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listMeta}>
                    {item.userName ? item.userName : item.userId === currentUserId ? 'あなた' : '不明なユーザー'}
                  </Text>
                  {'createdAt' in item && item.createdAt ? (
                    <Text style={styles.listMeta}>{new Date(item.createdAt.toDate()).toLocaleString()}</Text>
                  ) : (
                    <Text style={styles.listMeta}>saving...</Text>
                  )}
                </View>
                <View style={styles.actions}>
                  <Button
                    title="編集"
                    onPress={() => {
                      setEditingId(item.id);
                      setEditingTitle(item.title);
                      onEditingChange?.(true);
                    }}
                  />
                  <View style={{ width: 8 }} />
                  <Button title="削除" color="#b00020" onPress={() => onDelete(item.id)} />
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.muted}>まだ記録がありません</Text>}
        style={{ alignSelf: 'stretch' }}
      />
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
    paddingBottom: 24,
    position: 'relative',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listTitle: { fontSize: 16 },
  listMeta: { color: '#666', fontSize: 12 },
  muted: { color: '#888' },
});
