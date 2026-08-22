// タスク一覧。編集/削除/完了トグルと、Slack風リアクションを提供。
import React, { useMemo, useState } from 'react';
import { FlatList, View, Pressable } from 'react-native';
import { Button, Card, Chip, Divider, IconButton, Modal, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { Task } from '../../domain/models';
import type { FamlyTheme } from '../theme';

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
  const { colors } = useTheme<FamlyTheme>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [pickerFor, setPickerFor] = useState<string | null>(null);
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

  const styles = useMemo(() => ({
    card: { alignSelf: 'stretch' as const, borderRadius: 16 },
    sectionTitle: { fontWeight: '600' as const, marginBottom: 8 },
    editInput: { marginBottom: 8, backgroundColor: colors.inputBackground },
    editRow: { flexDirection: 'row' as const, gap: 8, alignItems: 'center' as const },
    listItem: { paddingVertical: 8 },
    listItemDone: { backgroundColor: colors.doneBackground, borderRadius: 8, paddingHorizontal: 8 },
    itemRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2 },
    listTitleDone: { textDecorationLine: 'line-through' as const, color: colors.textOnDone },
    metaDone: { color: colors.textMuted },
    reactionsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: 6, marginTop: 6 },
    chip: { height: 32 },
    chipText: { fontSize: 13 },
    modalSheet: { backgroundColor: colors.modalBackground, padding: 20, margin: 24, borderRadius: 16 },
    emojiGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 16, justifyContent: 'center' as const },
    emojiBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.emojiButtonBackground },
    muted: { color: colors.textMuted, textAlign: 'center' as const, marginTop: 16 },
  }), [colors]);

  return (
    <>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>履歴</Text>
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 340 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ItemSeparatorComponent={() => <Divider style={{ marginVertical: 4 }} />}
            renderItem={({ item }) => {
              const isEditing = editingId === item.id;
              if (isEditing) {
                return (
                  <View style={styles.listItem}>
                    <TextInput
                      mode="outlined"
                      value={editingTitle}
                      onChangeText={setEditingTitle}
                      style={styles.editInput}
                      dense
                    />
                    <View style={styles.editRow}>
                      <Button
                        mode="contained"
                        compact
                        onPress={() => {
                          const v = editingTitle.trim();
                          if (!v) return;
                          onUpdate(item.id, v);
                          setEditingId(null);
                          setEditingTitle('');
                          onEditingChange?.(false);
                        }}
                      >
                        保存
                      </Button>
                      <Button
                        mode="text"
                        compact
                        onPress={() => {
                          setEditingId(null);
                          setEditingTitle('');
                          onEditingChange?.(false);
                        }}
                      >
                        キャンセル
                      </Button>
                    </View>
                  </View>
                );
              }
              return (
                <View style={[styles.listItem, item.status === 'done' && styles.listItemDone]}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        variant="bodyLarge"
                        style={item.status === 'done' ? styles.listTitleDone : undefined}
                      >
                        {item.title}
                      </Text>
                      {item.status === 'done' && (
                        <Text variant="bodySmall" style={styles.metaDone}>
                          {item.completedByName ?? (item.completedByUserId === currentUserId ? 'あなた' : '不明なユーザー')}
                          {item.completedAt ? `  ${new Date(item.completedAt.toDate()).toLocaleString()}` : ''}
                        </Text>
                      )}
                    </View>
                    <IconButton
                      icon={item.status === 'done' ? 'undo-variant' : 'check'}
                      mode={item.status === 'done' ? 'outlined' : 'contained'}
                      size={20}
                      onPress={() => onToggleStatus?.(item.id, item.status === 'done' ? 'pending' : 'done')}
                      containerColor={item.status === 'done' ? undefined : colors.primary}
                      iconColor={item.status === 'done' ? colors.textMuted : colors.onPrimary}
                      style={{ margin: 0 }}
                    />
                    <IconButton
                      icon="pencil"
                      size={18}
                      onPress={() => {
                        setEditingId(item.id);
                        setEditingTitle(item.title);
                        onEditingChange?.(true);
                      }}
                      style={{ margin: 0 }}
                    />
                    <IconButton
                      icon="delete"
                      size={18}
                      iconColor={colors.dangerText}
                      onPress={() => onDelete(item.id)}
                      style={{ margin: 0 }}
                    />
                  </View>
                  <View style={styles.reactionsRow}>
                    {((item.reactions?.thanks ?? item.thanksCount ?? 0) > 0) && (
                      <Chip
                        compact
                        onPress={async () => { await onThanks?.(item.id); }}
                        style={styles.chip}
                        textStyle={styles.chipText}
                      >
                        🙏{item.reactions?.thanks ?? item.thanksCount ?? 0}
                      </Chip>
                    )}
                    {reactions.filter(r => r.type !== 'thanks').map((r) => {
                      const count = item.reactions?.[r.type] ?? 0;
                      if (count > 0) {
                        return (
                          <Chip
                            key={r.type}
                            compact
                            onPress={async () => { await onReact?.(item.id, r.type); }}
                            style={styles.chip}
                            textStyle={styles.chipText}
                          >
                            {r.emoji}{count}
                          </Chip>
                        );
                      }
                      return null;
                    })}
                    <IconButton
                      icon="plus-circle-outline"
                      size={20}
                      onPress={() => setPickerFor(item.id)}
                      style={{ margin: 0 }}
                    />
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.muted}>まだ記録がありません</Text>}
            style={{ alignSelf: 'stretch' }}
          />
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={!!pickerFor}
          onDismiss={() => setPickerFor(null)}
          contentContainerStyle={styles.modalSheet}
        >
          <Text variant="titleSmall" style={{ marginBottom: 12 }}>リアクションを追加</Text>
          <View style={styles.emojiGrid}>
            {reactions.map((r) => (
              <Pressable
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
                <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Modal>
      </Portal>
    </>
  );
}
