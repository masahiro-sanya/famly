# CLAUDE.md

famly リポジトリで Claude Code が作業する際のガイドライン。

## プロジェクト概要

**famly** は家族向けタスク共有アプリ。Expo (React Native) + Firebase (Firestore / Auth / Functions / Hosting) で構成。

- `src/` - クライアントアプリ (Expo / React Native / TypeScript)
- `functions/` - Cloud Functions (Node.js 22, Firebase 2nd Gen)
- `firestore.rules` - Firestore セキュリティルール
- `hosting/` - Firebase Hosting（プライバシーポリシーページ等）

## よく使うコマンド

### 開発

```bash
npx expo start                         # 開発サーバー起動
npx expo start --ios                   # iOS シミュレーター
npx expo start --android               # Android エミュレーター
npx expo start --web                   # Web ブラウザ
```

### Firebase

```bash
firebase emulators:start               # ローカルエミュレーター起動
firebase deploy --only functions        # Functions デプロイ
firebase deploy --only firestore:rules  # ルールデプロイ
firebase deploy --only hosting          # Hosting デプロイ
```

### テスト

```bash
npm run typecheck && npm test           # アプリ（純ロジック）
npm run test:rules                      # Firestore ルール（エミュレーター自動起動 / 要 Java）
cd functions && npm test                # Cloud Functions のロジック
```

### Cloud Functions (functions/)

```bash
cd functions && npm install             # 依存インストール
cd functions && npm run build           # ビルド
```

### EAS Build

```bash
eas build --platform ios                # iOS ビルド
eas build --platform android            # Android ビルド
eas update                              # OTA アップデート
```

## アーキテクチャ

### レイヤー構成（クリーンアーキテクチャ）

```
presentation/ (UIコンポーネント, React Native)
    ↓
application/ (ユースケース, カスタムフック, ビジネスロジック)
    ↓
domain/      (型定義, ドメインモデル)
    ↓
infrastructure/ (Firebase クライアント, 外部サービス)
```

### ファイル構成

```
src/
├── presentation/           # UI層
│   ├── AppRoot.tsx         # ルートコンポーネント
│   ├── components/         # UIコンポーネント
│   │   ├── AuthForm.tsx
│   │   ├── TasksView.tsx
│   │   ├── DefaultTasksView.tsx
│   │   ├── ProfileView.tsx
│   │   ├── SettingsView.tsx
│   │   └── InputBar.tsx
│   └── theme.ts            # テーマ定義
├── application/            # アプリケーション層
│   ├── auth.ts             # 認証ロジック
│   ├── tasks.ts            # タスク CRUD
│   ├── defaultTasks.ts     # デフォルトタスク管理
│   ├── households.ts       # 世帯管理・招待
│   ├── stamps.ts           # リアクション/スタンプ
│   ├── account.ts          # アカウント管理
│   └── store.ts            # Zustand UIストア
├── domain/
│   └── models.ts           # ドメインモデル型定義
├── infrastructure/
│   └── firebaseClient.ts   # Firebase 初期化
├── lib/
│   └── date.ts             # ユーティリティ
└── types/                  # 型定義ファイル
```

### 主要パターン

- **状態管理**: Zustand (UI状態のみ) + Firebase onSnapshot (リアルタイム同期)
- **認証**: Firebase Auth (Email/Password)
- **DB**: Firestore (リアルタイムリスナーで購読)
- **UI**: React Native Paper (Material Design)
- **デプロイ**: EAS Build + EAS Update (OTA)

## Firestore コレクション構成

| コレクション | 用途 |
|-------------|------|
| `users/{uid}` | ユーザープロフィール (name, email, householdId) |
| `households/{hid}` | 世帯 (name, inviteCode, members[]) |
| `tasks/{taskId}` | タスク (title, status, householdId, dateKey) |
| `tasks/{taskId}/stamps/{sid}` | リアクションスタンプ |
| `default_tasks/{hid}/items/{docId}` | テンプレートタスク (daysOfWeek) |
| `join_attempts/{uid}` | 招待コードの試行回数（Functions 専用。ルール未定義＝クライアントからは不可） |

## Cloud Functions

| 関数 | トリガー | 用途 |
|------|---------|------|
| `generateDailyTasks` | スケジュール (JST 05:00) | テンプレートから当日タスク自動生成 |
| `generateDailyTasksNow` | Callable | 手動タスク生成（検証用・自世帯のみ） |
| `deleteMyAccount` | Callable | アカウント削除 |
| `joinByInvite` | Callable | 招待コードで世帯参加 |
| `createHousehold` | Callable | 世帯の新規作成（作成・所属付け替え・旧世帯離脱を1トランザクション） |
| `regenerateInviteCode` | Callable | 招待コードの再発行（自世帯のみ） |

## 環境変数

**ファイル**: `.env` (`.env.example` を参照)

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_PRIVACY_POLICY_URL        # 任意
FAMLY_PRIVACY_CONTACT_EMAIL            # Hosting 用
FAMLY_OPERATOR_NAME                    # Hosting 用（任意）
```

## ルールリファレンス

`.claude/rules/` に詳細ガイドライン:
- `coding-style.md` - コーディングスタイル
- `git-workflow.md` - Git ワークフロー
- `testing.md` - テスト方針

## コマンドリファレンス

| コマンド | 説明 |
|---------|------|
| `/plan` | 実装前に計画を立てる |
| `/code-review` | コードレビューを実行 |
| `/verify` | ビルド・リントの包括的検証 |
| `/create-pr` | PR を作成 |
| `/create-commit` | ブランチ作成・コミット |

## コード調査ツール

- `mcp__serena__get_symbols_overview` - ファイル構造の確認
- `mcp__serena__find_symbol` - 関数/型の検索
- `mcp__serena__search_for_pattern` - パターン検索
- `mcp__serena__find_referencing_symbols` - 依存関係の把握

**全ファイル読み込みを避け、シンボルツールから始めること。**

## Tech Stack

- **フレームワーク**: Expo SDK 54 / React Native 0.81
- **言語**: TypeScript (strict mode)
- **UI**: React Native Paper v5
- **状態管理**: Zustand v5
- **バックエンド**: Firebase (Auth, Firestore, Functions, Hosting)
- **ビルド**: EAS Build / EAS Update
- **アニメーション**: React Native Reanimated v4
