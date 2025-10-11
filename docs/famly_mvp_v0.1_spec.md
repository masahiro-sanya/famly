
# 📦 Famly MVP v0.1 仕様書

> 公開リポジトリ向け注記
> - 本書は機密情報を含みません。APIキーや秘密情報は絶対にコミットしないでください。
> - 設定値は `.env` や Expo の `extra`（`app.config.ts`）経由で注入してください。本文のコード例はすべてダミー・プレースホルダを使用します。

## 🎯 コンセプト
家族のがんばり（家事・育児タスク）を、記録して、見える化する。  
まずは **タスク管理のみ** に絞り、App Storeに提出可能な状態を目指す。

---

## ✅ 機能要件（v0.1 / 公開版ベース）

- 🔐 認証：Firebase Auth（メールログイン）
- 👨‍👩‍👧 家族共有：`householdId` を共有して家族グループを作成/参加
- 📝 タスク登録：タイトル + 完了チェック（done/pending切替）
- 🔁 日次リセット：当日分のみを既定表示（履歴は任意）
- 🗓️ デフォルトタスク：曜日別テンプレートを設定
- 🤖 自動生成：毎朝（例: 5:00）に当日タスクを自動生成（Firebase Functions + Cloud Scheduler）
- 🙌 感謝スタンプ：家族同士で「ありがとう」スタンプを送信
- ☁️ Firestore連携：`tasks`, `users`, `households` を利用
- 🧠 状態管理：Zustand または Recoil を採用
- 🎨 UI：React Native Paper で構築
- 📦 配布：EAS Build による iOS ビルド（TestFlight 経由）

---

## 🔐 データ設計（Firestore）

```yaml
/users/{userId}
  - name
  - email
  - householdId

/households/{householdId}
  - name
  - members: [userId1, userId2]

/tasks/{taskId}
  - title: "洗濯物たたむ"
  - userId
  - householdId
  - createdAt
  - dateKey: "YYYY-MM-DD"   # 日次リセット/当日抽出用
  - status: "done" | "pending"
  - reactions: { thanks?: number, like?: number, ... }
  - completedAt?
  - completedByUserId?
  - completedByName?

# デフォルトタスク（v0.1で運用開始）
/default_tasks/{householdId}/{docId}
  - title
  - daysOfWeek: [0-6]        # 0=Sun ... 6=Sat
  - order?: number           # 任意の並び順

# 感謝スタンプ（いずれかの形で可）
# 1) サブコレクション
/tasks/{taskId}/stamps/{stampId}
  - fromUserId
  - type: "thanks"
  - createdAt

# 2) ルートコレクション
/stamps/{stampId}
  - taskId
  - fromUserId
  - toUserId?   # 任意
  - type: "thanks"
  - createdAt
```

---

## 🛠 技術構成

- クライアント：Expo + React Native + TypeScript
- 状態管理：Zustand もしくは Recoil
- 認証：Firebase Auth（メール）
- DB：Firestore（リアルタイム同期）+ Functions（当日タスク生成）
- UI：React Native Paper
- 配布：EAS Build → TestFlight 配布

---

## 🚀 セットアップ/実行手順（このリポジトリ）

### 1. 開発環境準備
- Node.js LTS（推奨: v20）
- npm（lockfile は `package-lock.json`）

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数と設定（機密情報の非コミット）
- `.env` に公開可能なクライアント用変数（`EXPO_PUBLIC_` 接頭辞）を定義します。
  - 例:
    ```env
    EXPO_PUBLIC_FIREBASE_API_KEY=...
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
    EXPO_PUBLIC_FIREBASE_APP_ID=...
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    ```
- ルートに `app.config.ts` を作成し、`extra` に環境値を受け渡します。
  ```ts
  // app.config.ts
  import 'dotenv/config';
  import type { ExpoConfig } from 'expo/config';

  export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
    ...config,
    extra: {
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    },
  });
  ```

`services/firebase.ts` の参考実装（例）：
```ts
import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const extra = Constants.expoConfig?.extra as
  | {
      firebaseApiKey?: string;
      firebaseAuthDomain?: string;
      firebaseProjectId?: string;
      firebaseAppId?: string;
      firebaseMessagingSenderId?: string;
    }
  | undefined;

const firebaseConfig = {
  apiKey: extra?.firebaseApiKey,
  authDomain: extra?.firebaseAuthDomain,
  projectId: extra?.firebaseProjectId,
  appId: extra?.firebaseAppId,
  messagingSenderId: extra?.firebaseMessagingSenderId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 4. UIライブラリ導入（任意）
```bash
npx expo install react-native-paper
```

### 5. 動作確認
```bash
npx expo start
```
スマホのExpo GoアプリでQRコードを読み込み、実機テスト。

### 6. 自動生成（Functions / Scheduler）
- Firebase Functions を有効化してデプロイ（別リポジトリ/フォルダでも可）
  - 役割: `default_tasks` を参照して当日の `tasks` を生成
  - 生成ルール: householdIdごとに `daysOfWeek` が当日と一致するものをコピー
- Cloud Scheduler を設定（例: 毎日 05:00 JST）でHTTP/Callableを実行
  - 認証は `Firebase App Check` 又は `IAM` で制御
- インデックス: `tasks` は `householdId` + `dateKey` + `createdAt desc`

### 7. iOSビルド & 配布（参考）
- EAS BuildでiOS用バイナリを作成
```bash
npx expo install eas-cli
eas build -p ios
```
- TestFlightにアップロード → テスターに配布 → 問題なければApp Store申請

---

## 🔒 セキュリティ/プライバシー方針（公開リポジトリ）
- APIキーやシークレットはコミット禁止。`.env*` は `.gitignore` で除外。
- クライアントで必要な値は `EXPO_PUBLIC_` 接頭辞を付けて明示的に公開する。
- Firestore セキュリティルールは最小権限原則（本仕様はスキーマのみを定義）。
- 実データや個人情報を含むスクリーンショット/ダンプはリポジトリに含めない。

---

## ✅ v0.1 ゴール
- 家族がApp Storeからインストールし、当日タスクを共有・完了チェック・感謝スタンプができる
- Apple審査に通る最低限の完成度を担保
