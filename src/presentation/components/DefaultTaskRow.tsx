// デフォルトタスク1件分の行。タイトル編集・並び替え・曜日切替・削除を担当する。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, Pressable } from 'react-native';
import { IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { DefaultTask } from '../../domain/models';
import type { FamlyTheme } from '../theme';

export const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function DefaultTaskRow({
  task,
  isFirst,
  isLast,
  onUpdateTitle,
  onUpdateDays,
  onMove,
  onDelete,
}: {
  task: DefaultTask;
  isFirst: boolean;
  isLast: boolean;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateDays: (id: string, days: number[]) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
}) {
  const { colors } = useTheme<FamlyTheme>();
  // 入力中の値はローカルに保持し、確定時だけ Firestore へ書き込む。
  // onChangeText で直接書き込むと1文字ごとに write が走り、
  // onSnapshot の再描画でカーソル位置も飛ぶ。
  const [draft, setDraft] = useState(task.title);
  const editing = useRef(false);

  // 他メンバーによる更新は、自分が編集中でないときだけ取り込む。
  useEffect(() => {
    if (!editing.current) setDraft(task.title);
  }, [task.title]);

  const commitTitle = () => {
    const next = draft.trim();
    if (!next) {
      setDraft(task.title); // 空のまま確定させず元に戻す
      return;
    }
    if (next === task.title) return;
    onUpdateTitle(task.id, next);
  };

  const days = task.daysOfWeek ?? [];

  const styles = useMemo(
    () => ({
      item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
      input: { backgroundColor: colors.inputBackground, marginBottom: 8 },
      row: { flexDirection: 'row' as const, alignItems: 'center' as const },
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
    }),
    [colors]
  );

  return (
    <View style={styles.item}>
      <TextInput
        mode="outlined"
        value={draft}
        onChangeText={setDraft}
        onFocus={() => {
          editing.current = true;
        }}
        onBlur={() => {
          editing.current = false;
          commitTitle();
        }}
        onSubmitEditing={commitTitle}
        returnKeyType="done"
        style={styles.input}
        dense
      />
      <View style={styles.row}>
        <IconButton icon="arrow-up" size={18} disabled={isFirst} onPress={() => onMove(task.id, 'up')} />
        <IconButton icon="arrow-down" size={18} disabled={isLast} onPress={() => onMove(task.id, 'down')} />
        <IconButton
          icon="delete"
          size={18}
          iconColor={colors.dangerText}
          onPress={() =>
            Alert.alert('削除の確認', `「${task.title}」を削除しますか？`, [
              { text: 'キャンセル', style: 'cancel' },
              { text: '削除', style: 'destructive', onPress: () => onDelete(task.id) },
            ])
          }
        />
      </View>
      <View style={styles.daysRow}>
        {DAY_LABELS.map((label, idx) => {
          const active = days.includes(idx);
          return (
            <Pressable
              key={idx}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}曜日`}
              onPress={() => {
                const next = active ? days.filter((d) => d !== idx) : [...days, idx];
                onUpdateDays(task.id, next);
              }}
              style={styles.dayBtn}
            >
              <Text style={active ? styles.dayBtnTextActive : styles.dayBtnText}>
                {active ? `✓ ${label}` : label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
