# Famly (MVP v0.1)

シンプルな家族向けタスク記録アプリ（Expo + React Native + Firebase）。

- 認証: Firebase Auth（メール/パスワード）
- 記録/履歴: Firestore に「やった」タスクを保存・一覧表示
- 編集/削除: 既存タスクのタイトル編集と削除
- 完了チェック: done/pending をトグル
- リアクション: 🙏/👍/🎉/❤️ で反応（1人1タスク1種類1回）
- 共有: `householdId` 単位で履歴共有（初期値はユーザーID）
- 最小UI: React Native 標準コンポーネントで実装（Paper導入は任意）

## セットアップ

1) Node.js LTS（推奨 v20）を用意

2) 依存関係をインストール
```
npm install
```

2.1) UI/状態管理（任意だが推奨）
```
# Paper（Expo環境での推奨インストール）
npx expo install react-native-paper react-native-safe-area-context react-native-gesture-handler react-native-reanimated react-native-vector-icons

# Zustand（状態管理）
npm i zustand
```

3) Firebase 設定（秘密情報はコミットしない）
- `.env.example` を `.env` にコピーし、値を設定
```
cp .env.example .env
```
- 使用する環境変数（クライアント公開可のEXPO_PUBLIC_*）
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - `EXPO_PUBLIC_FIREBASE_APP_ID`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

4) 開発サーバを起動
```
npx expo start
```
- Expo Go でQRコード読み取り → 実機で動作確認

## Firebase 設定手順

1) プロジェクトと Web アプリの作成
- Firebase Console → プロジェクト作成
- プロジェクトの設定 → 全般 → 下部「マイアプリ」→ Web アプリ（</>）を追加
- 「SDK の設定と構成」→「Config」で `firebaseConfig` を確認

2) `.env` に反映（このリポジトリ直下）
- 次の対応で値を貼り付け（EXPO_PUBLIC_ は必須の接頭辞）
  - `EXPO_PUBLIC_FIREBASE_API_KEY` = `apiKey`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` = `authDomain`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID` = `projectId`
  - `EXPO_PUBLIC_FIREBASE_APP_ID` = `appId`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = `messagingSenderId`
- 保存後の起動はキャッシュクリア推奨: `npx expo start -c`

3) Authentication を有効化
- Authentication → サインイン方法 → 「メール/パスワード」を有効化
- 必要に応じてテストユーザーを作成

4) Firestore を作成（開発ルール）
- Firestore Database → データベースを作成（例: `asia-northeast1`）
- ルールタブで以下に置換して公開（開発用。公開前に強化）
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5) 複合インデックスを作成（tasks 用）
- Firestore → インデックス → 複合 → 追加
- コレクション: `tasks`
- フィールド:
  - `householdId`（昇順/==）
  - `dateKey`（昇順/==）
  - `createdAt`（降順）
- ステータスが「有効」になるまで 1–3 分待機（エラーメッセージのリンクから作成でもOK）

6) デフォルトタスク自動生成（任意: 公開版では推奨）
- Firebase Functions を用意（別リポジトリ/フォルダ可）
  - `default_tasks/{householdId}/items` を参照し、当日分を `tasks` に生成
- Cloud Scheduler を設定（毎日 05:00 JST など）
  - HTTP/Callable で Functions を起動（認証はIAM/App Check等）
- データモデル: `default_tasks` は以下を想定
  - `title: string`, `daysOfWeek: number[]`, `order?: number`

7) 起動と確認
- `npx expo start -c`
- Expo Go でログイン→タスクを追加・編集・削除できることを確認


## 使い方（現状）
- 未ログイン時: メール/パスワードでログイン or 新規登録
- ログイン後: 画面上部のタブで操作
  - タスク: 入力欄は画面下部に固定。「やったこと」を入力して記録、下に履歴が表示（完了時のみ完了者名を表示）。
    - 各行の「編集」でタイトル変更、「削除」で削除
    - 「完了/未完了」でステータス切替
    - 反応: 既に付いたチップ（🙏/👍/🎉/❤️）のみ表示。なければ「＋」を押して選択→追加
  - プロフィール: 名前を編集して保存
  - 設定: `householdId` を変更、ログアウト

## データモデル（抜粋）
- `users/{userId}`: `name`, `email`, `householdId`
- `tasks/{taskId}`: `title`, `userId`, `householdId`, `createdAt`, `dateKey`, `status`, `reactions?`, `completedAt?`, `completedByUserId?`, `completedByName?`
- `default_tasks/{householdId}/items/{docId}`: `title`, `daysOfWeek:number[]`, `order?:number`

## Functions（雛形）
- 本リポジトリ `functions/` に雛形を同梱
  - `functions/src/index.ts`: 05:00 JSTに `default_tasks` から当日分を `tasks` へ生成（Functions 2nd Gen / Node.js 20）
  - 手順（例）
    1. Firebase CLI をセットアップ（ローカル）
    2. `cd functions && npm install`
    3. `npm run build`
    4. `firebase deploy --only functions`（または `npm run deploy`）
    5. 生成の手動テスト: `generateDailyTasksHttp` をHTTPで叩く（必要に応じて保護）
  - Cloud Scheduler（Console）で 05:00 JST にトリガー

## Functions デプロイ手順（詳細）

前提: Functions(Gen2) と Cloud Scheduler は Blaze プランが必要です。まず対象プロジェクトを Blaze にアップグレードしてください（Console → 課金 → プラン）。

1) Firebase CLI セットアップ/ログイン
- インストール（未導入時）: `npm i -g firebase-tools`
- ログイン: `firebase login`
- アカウント切替（必要なら）: `firebase login:list` → `firebase login:use <email>`

2) デプロイ先プロジェクトの選択
- ルートで `.firebaserc` を設定（本リポジトリは dev を default に設定済み）
- 明示切替: `firebase use dev` または `firebase use prod`

3) デプロイ（dev の例｜Node.js 20 / Functions v2）
```
cd functions
npm install
npm run build
# .firebaserc の default が dev の場合は --project 省略可
firebase deploy --only functions --config ../firebase.json --project famly-dev-41b50
```
- prod の例: `--project famly-68b56`

4) 動作確認
- Console → Functions でデプロイ完了を確認
- HTTPテスト（手動生成）
  - デプロイ後に表示される `generateDailyTasksHttp` のURLにアクセス
  - householdId を指定して単体確認: `...?householdId=<YOUR_HOUSEHOLD_ID>`

5) スケジュール（自動生成）
- Functions v2 の `onSchedule({ schedule: '0 5 * * *', timeZone: 'Asia/Tokyo' })` により、05:00 JST に Cloud Scheduler ジョブが作成されます
- エラー時は Console の Cloud Scheduler/Cloud Logs を確認

6) コスト最適化のヒント
- Artifact Registry のクリーンアップポリシーを設定
  - 例: 「未タグのイメージは1日で削除」「最新3個のみ保持」
- Functions は `minInstances=0`（デフォルト）で常駐コストゼロ
- ログを最小限に（大量の info ログを避ける）
- 単一リージョン `asia-northeast1` に統一

Firestore セキュリティルールは最小権限で運用してください。クライアントのみの公開リポジトリにはルールは含みません。

## 開発メモ / アーキテクチャ
- レイヤ構成（簡易クリーンアーキテクチャ）
  - `src/domain/`: モデル定義（`models.ts`）
  - `src/application/`: ユースケース/フック（`auth.ts`, `tasks.ts`）
  - `src/infrastructure/`: Firebase クライアント（`firebaseClient.ts`）
  - `src/presentation/`: UIコンポーネント/画面（`AppRoot.tsx`, `components/*`）
- UI ライブラリ: React Native Paper（`AppRoot.tsx` を `PaperProvider` でラップ）
- 状態管理: Zustand（`src/application/store.ts` の UI ストア）
- ルートの `App.tsx` は薄いラッパーで `src/presentation/AppRoot` を描画
- UI: 依存追加を避け標準コンポーネントで構成（Paper導入は任意）
- 型: TypeScript strict

## ドキュメント
- 仕様書（公開版）: `docs/famly_mvp_v0.1_spec.md:1`
- エージェント/貢献ガイド: `AGENTS.md:1`

## 注意事項
- `.env`/シークレットはコミットしない（`.gitignore`で除外済み）。
- 依存追加時は理由と影響（サイズ/互換性）をPRで記載。
- 本実装は最小構成です。画面遷移やUIライブラリ、エラー通知、テストは段階的に拡張してください。
