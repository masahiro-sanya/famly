// アプリのルート。タブ切替・大域UIをまとめる薄いコンテナ。
import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Appbar, Button, Provider as PaperProvider, Text } from 'react-native-paper';
import { useAuthState, signOut, updateProfileName } from '../application/auth';
import { addTask, useTasks, updateTaskTitle, deleteTask, updateTaskStatus, addThanksStamp, addReaction } from '../application/tasks';
import { AuthForm } from './components/AuthForm';
import { TasksView } from './components/TasksView';
import { DefaultTasksView } from './components/DefaultTasksView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { InputBar } from './components/InputBar';
import { useUIStore } from '../application/store';
import { useHousehold, createHousehold, regenerateInviteCode, joinByInviteCallable, leaveHousehold, useHouseholdMembers, updateHouseholdName } from '../application/households';
import { useDefaultTasks, addDefaultTask, updateDefaultTaskDays, updateDefaultTaskTitle, deleteDefaultTask, moveDefaultTask } from '../application/defaultTasks';
import { lightTheme, darkTheme } from './theme';

const TAB_BUTTONS = [
  { value: 'tasks', label: 'タスク' },
  { value: 'defaults', label: 'テンプレ' },
  { value: 'profile', label: 'プロフィール' },
  { value: 'settings', label: '設定' },
] as const;

export default function AppRoot() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { user, profile } = useAuthState();
  const tasks = useTasks(profile?.householdId);
  const currentHousehold = useHousehold(profile?.householdId);
  const members = useHouseholdMembers(profile?.householdId);
  const defaults = useDefaultTasks(profile?.householdId);
  const tab = useUIStore((s) => s.tab);
  const setTab = useUIStore((s) => s.setTab);
  const isEditingTask = useUIStore((s) => s.isEditingTask);
  const setIsEditingTask = useUIStore((s) => s.setEditingTask);

  const dynamicStyles = useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 16,
    } as const,
    appbarTitle: {
      fontSize: 26,
      fontWeight: '700' as const,
      color: theme.colors.brandTitle,
    },
  }), [theme]);

  if (!user) {
    return (
      <PaperProvider theme={theme}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={24}
        >
          <SafeAreaView style={dynamicStyles.container}>
            <Appbar.Header style={styles.appbar} elevated={false}>
              <Appbar.Content title="Famly" titleStyle={dynamicStyles.appbarTitle} />
            </Appbar.Header>
            <AuthForm />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'auto'} />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <SafeAreaView style={dynamicStyles.container}>
          <Appbar.Header style={styles.appbar} elevated={false}>
            <Appbar.Content title="Famly" titleStyle={dynamicStyles.appbarTitle} />
          </Appbar.Header>

          <View style={styles.tabsRow}>
            {TAB_BUTTONS.map((b) => (
              <Button
                key={b.value}
                mode={tab === b.value ? 'contained-tonal' : 'text'}
                compact
                onPress={() => setTab(b.value as any)}
                style={styles.tabBtn}
                labelStyle={styles.tabLabel}
              >
                {b.label}
              </Button>
            ))}
          </View>

          {tab === 'tasks' && (
            <TasksView
              currentUserId={user.uid}
              tasks={tasks}
              onUpdate={(id, newTitle) => updateTaskTitle(id, newTitle)}
              onDelete={(id) => deleteTask(id)}
              onEditingChange={setIsEditingTask}
              onToggleStatus={(id, next) =>
                updateTaskStatus(id, next, {
                  id: user.uid,
                  name: profile?.name ?? (user.email?.split('@')[0] ?? 'Unknown'),
                })}
              onThanks={(id) => addThanksStamp(id, user.uid)}
              onReact={(id, type) => addReaction(id, user.uid, type)}
            />
          )}
          {tab === 'defaults' && profile && (
            <DefaultTasksView
              items={defaults}
              onAdd={(title, days) => addDefaultTask({ householdId: profile.householdId, title, daysOfWeek: days })}
              onUpdateTitle={(id, v) => updateDefaultTaskTitle(profile.householdId, id, v)}
              onUpdateDays={(id, ds) => updateDefaultTaskDays(profile.householdId, id, ds)}
              onMove={(id, dir) => moveDefaultTask(profile.householdId, defaults, id, dir)}
              onDelete={(id) => deleteDefaultTask(profile.householdId, id)}
            />
          )}
          {tab === 'tasks' && !isEditingTask && (
            <InputBar
              onSubmit={async (title) => {
                await addTask({
                  title,
                  userId: user.uid,
                  householdId: profile?.householdId ?? user.uid,
                });
              }}
            />
          )}

          {tab === 'profile' && profile && (
            <ProfileView
              profile={profile}
              onSave={(name) => updateProfileName(user.uid, name.trim())}
              householdName={currentHousehold?.name ?? null}
              householdId={profile.householdId}
              membersCount={currentHousehold?.members?.length ?? null}
            />
          )}

          {tab === 'settings' && profile && (
            <SettingsView
              householdId={profile.householdId}
              inviteCode={currentHousehold?.inviteCode}
              householdName={currentHousehold?.name}
              members={members}
              onCreateHousehold={async (name) => {
                await createHousehold(name);
              }}
              onJoinByCode={async (code) => {
                // 失敗はそのまま呼び出し元へ伝える（旧クライアント直書きのフォールバックは廃止）
                await joinByInviteCallable(code);
              }}
              onRegenerateInvite={async () => {
                await regenerateInviteCode();
              }}
              onUpdateHouseholdName={async (name) => {
                if (profile.householdId) await updateHouseholdName(profile.householdId, name);
              }}
              onLeave={async () => {
                if (profile.householdId) await leaveHousehold(user.uid, profile.householdId);
              }}
              onSignOut={() => signOut()}
            />
          )}

          <StatusBar style={colorScheme === 'dark' ? 'light' : 'auto'} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 8,
  },
  tabLabel: {
    fontSize: 13,
  },
});
