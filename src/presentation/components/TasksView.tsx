import React, { useMemo, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Task } from '../../domain/models';

export function TasksView({
  currentUserId,
  tasks,
  onUpdate,
  onDelete,
  onEditingChange,
  onToggleStatus,
  onThanks,
  onReact,
}: {
  currentUserId: string;
  tasks: Task[];
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onEditingChange?: (editing: boolean) => void;
  onToggleStatus?: (id: string, next: 'done' | 'pending') => void;
  onThanks?: (id: string) => Promise<'added' | 'removed' | void>;
  onReact?: (id: string, type: string) => Promise<'added' | 'removed' | void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [thanksDisabled, setThanksDisabled] = useState<Record<string, boolean>>({});
  const [reactDisabled, setReactDisabled] = useState<Record<string, boolean>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null); // taskId を保持（モーダル開閉）
  const reactions = useMemo(() => (
    [
      { type: 'thanks', emoji: '🙏' },
      { type: 'like', emoji: '👍' },
      { type: 'party', emoji: '🎉' },
      { type: 'heart', emoji: '❤️' },
      { type: 'smile', emoji: '😄' },
      { type: 'sparkles', emoji: '✨' },
    ] as const
  ), []);
  return (
    <>
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
            <View style={[styles.listItem, item.status === 'done' && styles.listItemDone]}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, item.status === 'done' && styles.listTitleDone]}>{item.title}</Text>
                  {item.status === 'done' && (
                    <Text style={[styles.listMeta, styles.listMetaDone]}>
                      {item.completedByName ?? (item.completedByUserId === currentUserId ? 'あなた' : '不明なユーザー')}
                    </Text>
                  )}
                  {item.status === 'done' && item.completedAt ? (
                    <Text style={styles.listMeta}>完了 {new Date(item.completedAt.toDate()).toLocaleString()}</Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <Button
                    title={item.status === 'done' ? '未完了' : '完了'}
                    onPress={() => onToggleStatus?.(item.id, item.status === 'done' ? 'pending' : 'done')}
                  />
                  <View style={{ width: 8 }} />
                  <View style={{ width: 8 }} />
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
              {/* Reactions line: wraps to new line like Slack */}
              <View style={styles.reactionsRow}>
                {((item.reactions?.thanks ?? item.thanksCount ?? 0) > 0) && (
                  <TouchableOpacity
                    onPress={async () => { await onThanks?.(item.id); }}
                    style={styles.pill}
                  >
                    <Text style={styles.pillText}>🙏{item.reactions?.thanks ?? item.thanksCount ?? 0}</Text>
                  </TouchableOpacity>
                )}
                {reactions.filter(r => r.type !== 'thanks').map((r) => {
                  const count = item.reactions?.[r.type] ?? 0;
                  if (count > 0) {
                    return (
                      <TouchableOpacity
                        key={r.type}
                        onPress={async () => { await onReact?.(item.id, r.type); }}
                        style={styles.pill}
                      >
                        <Text style={styles.pillText}>{r.emoji}{count}</Text>
                      </TouchableOpacity>
                    );
                  }
                  return null;
                })}
                <TouchableOpacity
                  onPress={() => setPickerFor(item.id)}
                  style={[styles.addReaction, { marginLeft: 6 }]}
                >
                  <Text style={styles.addReactionText}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.muted}>まだ記録がありません</Text>}
        style={{ alignSelf: 'stretch' }}
      />
    </View>
    {/* Reaction Picker Modal (Slack-like) */}
    <Modal
      transparent
      visible={!!pickerFor}
      animationType="fade"
      onRequestClose={() => setPickerFor(null)}
    >
      <Pressable style={styles.modalBackdrop} onPress={() => setPickerFor(null)}>
        <View style={styles.modalSheet}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>リアクションを追加</Text>
          <View style={styles.emojiGrid}>
            {reactions.map((r) => (
              <TouchableOpacity
                key={r.type}
                onPress={async () => {
                  if (!pickerFor) return;
                  if (r.type === 'thanks') {
                    await onThanks?.(pickerFor);
                  } else {
                    await onReact?.(pickerFor, r.type);
                  }
                  setPickerFor(null);
                }}
                style={styles.emojiBtn}
              >
                <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  </>
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
  listItemDone: {
    backgroundColor: '#f2f2f2',
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
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  pillText: { fontSize: 14 },
  listTitleDone: { textDecorationLine: 'line-through', color: '#666' },
  listMetaDone: { color: '#888' },
  addReaction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addReactionText: { fontSize: 18, lineHeight: 18, color: '#555' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emojiBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  listTitle: { fontSize: 16 },
  listMeta: { color: '#666', fontSize: 12 },
  muted: { color: '#888' },
});
