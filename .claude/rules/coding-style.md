# コーディングスタイル

## 基本原則

### イミュータビリティ（重要）

**状態は直接変更せず、新しいオブジェクトを作成する**

```typescript
// ❌ NG: 直接変更
task.status = 'done';
tasks.push(newTask);

// ✅ OK: 新しいオブジェクト/配列
const updatedTask = { ...task, status: 'done' };
const newTasks = [...tasks, newTask];
```

### ファイル構成

| 推奨 | 上限 |
|------|------|
| 100-300行 | 500行 |

- 機能/ドメイン単位でファイルを分割
- 1ファイルに複数の責務を持たせない

## 品質チェックリスト

コード完了前に確認：

- [ ] 読みやすいコード、明確な命名
- [ ] 関数は50行以下
- [ ] ファイルは500行以下
- [ ] ネストは3レベル以下
- [ ] 適切なエラーハンドリング
- [ ] デバッグ用 console.log なし
- [ ] ハードコードされた値なし（定数として定義）
- [ ] イミュータブルなパターン

## 関数設計

```typescript
// ✅ OK: 単一責務、短い関数
export async function addTask(params: { title: string; userId: string; householdId: string }) {
  await addDoc(collection(db, 'tasks'), {
    title: params.title.trim(),
    userId: params.userId,
    householdId: params.householdId,
    status: 'pending',
    dateKey: getTodayKey(),
  });
}

// ❌ NG: 複数責務、長い関数
export async function doEverything(data: any) {
  // 100行以上の処理...
}
```

## 命名規則

| 種類 | 規則 | 例 |
|------|------|-----|
| ファイル | camelCase | `firebaseClient.ts` |
| コンポーネント | PascalCase | `TasksView.tsx` |
| 関数 | camelCase | `addTask`, `useTasks` |
| 型/インターフェース | PascalCase | `UserProfile`, `Task` |
| 定数 | UPPER_SNAKE_CASE or PascalCase | `MAX_RETRY_COUNT` |
| カスタムフック | use + PascalCase | `useAuthState`, `useTasks` |

## レイヤー別責務

| レイヤー | やること | やらないこと |
|---------|---------|-------------|
| presentation | UI表示、ユーザー操作のハンドリング | ビジネスロジック、直接DB操作 |
| application | ユースケース実行、データ取得・更新 | UIレンダリング |
| domain | 型定義、ビジネスルール | 外部依存、副作用 |
| infrastructure | Firebase初期化、外部サービス接続 | ビジネスロジック |

## エラーハンドリング

```typescript
// ✅ OK: 適切なエラーハンドリング
try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (error: any) {
  if (error.code === 'auth/user-not-found') {
    throw new Error('ユーザーが見つかりません');
  }
  throw error;
}

// ❌ NG: エラー握りつぶし
try {
  await signInWithEmailAndPassword(auth, email, password);
} catch {}
```

## React / React Native 固有

### コンポーネント設計

- 関数コンポーネントのみ使用（クラスコンポーネント禁止）
- カスタムフックでロジックを分離
- Props の型は明示的に定義

### フック使用

```typescript
// ✅ OK: カスタムフックでロジック分離
export function useTasks(householdId?: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  // ...購読ロジック
  return tasks;
}

// ❌ NG: コンポーネント内に直接ロジック
function TasksView() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    // 長い購読ロジック...
  }, []);
}
```

## Firestore 操作

- リアルタイム購読は `onSnapshot` を使用
- 書き込みは `addDoc` / `updateDoc` / `deleteDoc`
- トランザクションが必要な場合は `runTransaction`
- `serverTimestamp()` をタイムスタンプに使用
- コレクションパスはハードコードせず、一箇所で管理を検討
