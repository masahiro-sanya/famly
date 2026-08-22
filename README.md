# Famly (MVP v0.1)

シンプルな家族向けタスク記録アプリ（Expo + React Native + Firebase）。

- 認証: Firebase Auth（メール/パスワード）
- 記録/履歴: Firestore に「やった」タスクを保存・一覧表示
- 編集/削除: 既存タスクのタイトル編集と削除
- 完了チェック: done/pending をトグル
- リアクション: 🙏/👍/🎉/❤️ で反応（1人1タスク1種類1回）
- 共有: `householdId` 単位で履歴共有（初期値はユーザーID）
- UI: React Native Paper（Material Design）

## セットアップ

1) Node.js LTS（推奨 v20）を用意

2) 依存関係をインストール
```
npm install
```

UI(React Native Paper)・状態管理(Zustand)・Auth永続化(AsyncStorage)は
`package.json` に入っているので、追加インストールは不要です。

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

4) Firestore を作成し、リポジトリのルールを適用
- Firestore Database → データベースを作成（例: `asia-northeast1`）
- Console でルールを手書きせず、リポジトリの `firestore.rules` をデプロイする
```
firebase deploy --only firestore:rules --project <PROJECT_ID>
```
  - Console のテンプレート（`allow read, write: if request.auth != null;`）は
    全ユーザーが全データを読み書きできてしまうため、開発用でも使わない

5) インデックスを適用
```
firebase deploy --only firestore:indexes --project <PROJECT_ID>
```
- 内容は `firestore.indexes.json` を参照
- ステータスが「有効」になるまで 1–3 分かかる

6) デフォルトタスク自動生成
- `functions/` に実装済み（`default_tasks/{householdId}/items` から当日分を `tasks` に生成）
- Cloud Scheduler ジョブは Functions のデプロイ時に自動作成される（05:00 JST）
- データモデル: `title: string`, `daysOfWeek: number[]`, `order?: number`

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
  - 設定: 家族の作成／招待コードでの参加・再発行、世帯名の変更、退出、ログアウト、アカウント削除

## 追加: プライバシーポリシー（Hosting）と環境変数

アプリ内の「プライバシーポリシー」ボタンは `EXPO_PUBLIC_PRIVACY_POLICY_URL` が設定されていると表示されます。

1) URLの用意（Firebase Hosting 推奨）
- 本リポジトリには Hosting 用のテンプレートを同梱
  - テンプレート: `hosting/privacy/index.template.html`
  - 生成物: `hosting/privacy/index.html`（Git管理外）
  - 置換スクリプト: `scripts/prepare-privacy.js`（deploy 前に自動実行）
- 連絡先メール/運営者名は環境変数で注入（Gitに載せない）
  - `FAMLY_PRIVACY_CONTACT_EMAIL`（必須／本番）
  - `FAMLY_OPERATOR_NAME`（任意。未設定なら該当セクション非表示）

2) デプロイ（例: dev）
```
# 事前に .env を用意（.env.example を参照）
FAMLY_PRIVACY_CONTACT_EMAIL=support@your.domain \
FAMLY_OPERATOR_NAME="Your Company, Inc." \
firebase deploy --only hosting --project <PROJECT_ID>
```
デプロイ後のURL例: `https://<PROJECT_ID>.web.app/privacy`

3) アプリにURLを設定
- ローカル: `.env` に `EXPO_PUBLIC_PRIVACY_POLICY_URL` を設定 → `npx expo start -c`
- EAS(Build): Secrets に同名環境変数を登録

### 環境変数まとめ
- クライアント（公開可）
  - `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `EXPO_PUBLIC_PRIVACY_POLICY_URL`（設定時に設定画面へボタン表示）
- Hosting（生成用／サーバー側）
  - `FAMLY_PRIVACY_CONTACT_EMAIL`（必須）
  - `FAMLY_OPERATOR_NAME`（任意）

### 環境変数の取得方法（どこで取る？）

Firebase（EXPO_PUBLIC_FIREBASE_*）
- 取得元: Firebase Console → 歯車（プロジェクトの設定）→ 一般 → 下部「マイアプリ」の Web アプリ（</>）を選択 → 「SDK の設定と構成」→ Config
- 対応表:
  - `apiKey` → `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `authDomain` → `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `projectId` → `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - `appId` → `EXPO_PUBLIC_FIREBASE_APP_ID`
  - `messagingSenderId` → `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- 補足: これらはクライアント公開前提の値（秘密鍵ではありません）

プライバシーポリシーURL（EXPO_PUBLIC_PRIVACY_POLICY_URL）
- 取得元: 自身で用意した https の公開URL
  - 本リポジトリの手順で Firebase Hosting にデプロイしている場合 → `https://<PROJECT_ID>.web.app/privacy`
  - 独自ドメイン/Notion/GitHub Pages 等でも可（https 推奨）

設定場所（開発/本番）
- ローカル開発: リポジトリ直下の `.env` に追記 → `npx expo start -c`
- EAS（ビルド時に注入）: Expo Dashboard → Project → Environment Variables で登録（または CLI）
  - 例: `eas secret:push --name EXPO_PUBLIC_PRIVACY_POLICY_URL --value https://<PROJECT_ID>.web.app/privacy`

確認方法
- 開発: 一時的に `console.log(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID)` などで確認 → 表示されない場合はキャッシュクリア（`npx expo start -c`）
- アプリ: 設定タブに「プライバシーポリシー」ボタンが出てリンクが開けば URL は注入済み

## Cloud Functions（Callable）

本リポジトリ `functions/` には Callable を含む実装が同梱されています。

- `deleteMyAccount`
  - 役割: アカウント削除。共有世帯のメンバーから外し、本人のスタンプを削除、
    個人世帯のタスク/テンプレを削除、共有世帯のタスクは残して本人の情報のみ匿名化、
    `users/{uid}` と Auth ユーザーを削除
- `createHousehold`
  - 役割: 世帯の新規作成（世帯作成・`users/{uid}.householdId` 更新・旧世帯からの離脱を1トランザクション）
  - ルールで `households` の create を禁止しているため、作成経路はこの Callable のみ
- `regenerateInviteCode`
  - 役割: 招待コードの再発行（呼び出し元が所属する世帯のみ）
  - ルールで `households.inviteCode` のクライアント更新を禁止しているため、再発行経路はこの Callable のみ
- `joinByInvite`
  - 役割: 招待コード参加（旧世帯の `members` から外し、新世帯へ追加、`users/{uid}.householdId` 更新）
  - クライアントは他世帯の `households` を読めないため、参加経路はこの Callable のみ
- `generateDailyTasksNow`
  - 役割: 当日分タスクの手動生成（検証用）。生成先は呼び出し元自身の世帯に限定

デプロイ（例: dev）
```
cd functions
npm install
npm run build
firebase deploy --only functions --config ../firebase.json --project <PROJECT_ID>
```

アプリからの呼び出し
- `src/application/account.ts` … `deleteMyAccount()` を呼び出し
- `src/application/households.ts` … `createHousehold(name)` / `regenerateInviteCode()` / `joinByInviteCallable(code)` を使用

## EAS ビルド（開発/本番）

eas.json にプロファイルを用意しています。目的に応じて使い分けてください。

- 開発（Dev Client / 内部配布）
  - iOS: `eas build -p ios --profile development`
  - Android: `eas build -p android --profile development`
  - チャンネル: `development`

- 本番（ストア提出用ビルド）
  - iOS: `eas build -p ios --profile production`
  - Android: `eas build -p android --profile production`
  - 提出（iOS）: `eas submit -p ios --latest`
  - チャンネル: `production`

注意
- iOS は提出のたびに `app.json` の `ios.buildNumber` を増やしてください。
- Android は `android.versionCode` を増やしてください。
- ビルド前に EAS Secrets に `EXPO_PUBLIC_*` と `EXPO_PUBLIC_PRIVACY_POLICY_URL` を登録してください。

## Firebase デプロイ（推奨手順）

`firebase.json` に Functions/Hosting の `predeploy` を設定済みです。基本は次のコマンドだけで OK です。

一括デプロイ
```
# 開発（.firebaserc の dev エイリアスを使用）
firebase deploy --project dev --only "firestore:rules,functions,hosting"

# 本番（prod エイリアス）
firebase deploy --project prod --only "firestore:rules,functions,hosting"
```

個別デプロイ
```
firebase deploy --project dev --only firestore:rules
firebase deploy --project prod --only functions
firebase deploy --project dev --only hosting
```

デプロイ順（重要）
- `functions` → `firestore:rules` → アプリ（EAS Update / ストア配信）の順に出す。
- ルールは `households` の create と `inviteCode` の更新をクライアントに許していない。先にルールだけ出すと、
  `createHousehold` / `regenerateInviteCode` Callable を持たない旧クライアントで
  家族の新規作成と招待コードの再発行が失敗する。

環境変数の読み込み（Hosting の privacy 生成用）
- `scripts/prepare-privacy.js` が predeploy で `.env`, `.env.local`, `.env.production`, `.env.prod` を自動読込します。
- 開発: ルートの `.env` に `FAMLY_PRIVACY_CONTACT_EMAIL` 等を設定
- 本番: `.env.production` か `.env.prod` を作成して値を設定

## Firestore ルール（本番）

`firestore.rules` をデプロイしてください（`isMember` 基準／stamps 自己削除許可を含む）。
```
firebase deploy --only firestore:rules --project <PROJECT_ID>
```
必要なインデックス（`firestore.indexes.json`）
- 複合（`tasks`）: `householdId (==), dateKey (==), createdAt (desc)`
- 単一フィールド（`stamps.fromUserId`）: COLLECTION_GROUP スコープ
  - `deleteMyAccount` の `collectionGroup('stamps')` クエリで必要

## App Store 提出の準備（概要）

- `app.json` に `ios.bundleIdentifier`（例: `com.example.famly`）を追加
- EAS Secrets に `EXPO_PUBLIC_*` と `EXPO_PUBLIC_PRIVACY_POLICY_URL` を登録
- TestFlight ビルド（例）
```
eas build -p ios
# 送信
eas submit -p ios --latest
```
- App Store Connect
  - プライバシーポリシーURL設定、App Privacy回答（メール/名前、追跡なし）
  - スクリーンショット、サポートURL、レビューノート（テストアカウントを記載）


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
    5. 生成の手動テスト: Callable `generateDailyTasksNow` を呼ぶ（自分の世帯のみ生成される）
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
- 手動生成テスト（Callable）
  - `firebase functions:shell` から `generateDailyTasksNow({}, { auth: { uid: '<YOUR_UID>' } })`
  - 生成先は呼び出したユーザーの世帯に限定される（URLを叩く無認証エンドポイントは廃止）

5) スケジュール（自動生成）
- Functions v2 の `onSchedule({ schedule: '0 5 * * *', timeZone: 'Asia/Tokyo' })` により、05:00 JST に Cloud Scheduler ジョブが作成されます
- エラー時は Console の Cloud Scheduler/Cloud Logs を確認

6) コスト最適化のヒント
- Artifact Registry のクリーンアップポリシーを設定
  - 例: 「未タグのイメージは1日で削除」「最新3個のみ保持」
- Functions は `minInstances=0`（デフォルト）で常駐コストゼロ
- ログを最小限に（大量の info ログを避ける）
- 単一リージョン `asia-northeast1` に統一

## Firestore ルール（MVP本番想定）

このリポジトリに `firestore.rules` を同梱しています。内容は次の方針です。
- users: 自分のみ read/update、初回 create も本人のみ（同一世帯メンバーの read は可）
- households: read はメンバーのみ。create/delete は不可（作成は Callable `createHousehold` 経由）。
  update はメンバーのみで、`members` に許される変更は「自分が抜ける」ことだけ（参加は Callable `joinByInvite` 経由）。
  `inviteCode` の書き換えも不可（再発行は Callable `regenerateInviteCode` 経由）
- default_tasks/items: householdメンバーのみ read/write
- tasks: 自分の household のみ read、create は自分の householdId、update/delete も household 内に限定
- tasks/stamps: 本人のみ create（fromUserId==uid）、削除は自分のスタンプのみ、update は不可

適用コマンド（dev例）:
```
firebase deploy --only firestore:rules --project famly-dev-41b50
```

## インデックス（必須）

`firestore.indexes.json` に定義済み。`firebase deploy --only firestore:indexes` で適用する。

- 複合（tasks / 当日一覧）
  - householdId (==), dateKey (==), createdAt (desc)
- 単一フィールド（stamps / fromUserId・COLLECTION_GROUP スコープ）
  - `deleteMyAccount` のスタンプ削除で使用

## テスト / CI

```
npm run typecheck && npm test              # アプリ
npm run test:rules                         # Firestore ルール（エミュレーターを自動起動）
cd functions && npm run typecheck && npm test && npm run build
```

- `.github/workflows/ci.yml` が push(main/develop) と PR で上記を実行する（app / functions / rules の3ジョブ）
- テスト対象
  - JST 日付ユーティリティ（`src/lib/date.test.ts` / `functions/src/lib/date.test.ts`）
  - クライアントと Functions で二重に持っている JST 変換の一致（`src/lib/date.contract.test.ts`）
  - Functions の判断ロジック（`functions/src/lib/plan.test.ts`）
    … 当日タスクの重複防止 / アカウント削除時の削除・匿名化の振り分け / 参加時の世帯遷移 / 入力の正規化
  - Firestore ルール（`tests/rules/firestore.rules.test.ts`、エミュレーター必須）
- `npm run test:rules` は Java が要る（Firestore エミュレーターが JVM 上で動くため）
- 方針は `.claude/rules/testing.md` を参照

## 開発メモ / アーキテクチャ
- レイヤ構成（簡易クリーンアーキテクチャ）
  - `src/domain/`: モデル定義（`models.ts`）
  - `src/application/`: ユースケース/フック（`auth.ts`, `tasks.ts`）
  - `src/infrastructure/`: Firebase クライアント（`firebaseClient.ts`）
  - `src/presentation/`: UIコンポーネント/画面（`AppRoot.tsx`, `components/*`）
- UI ライブラリ: React Native Paper（`AppRoot.tsx` を `PaperProvider` でラップ）
- 状態管理: Zustand（`src/application/store.ts` の UI ストア）
- Auth永続化: `src/infrastructure/firebaseClient.ts` で React Native 環境は `initializeAuth(getReactNativePersistence(AsyncStorage))` を使用（Webは `getAuth`）
- ルートの `App.tsx` は薄いラッパー。`SafeAreaProvider` と `ErrorBoundary` で
  `src/presentation/AppRoot` を包む
- 日付: JST 基準の `dateKey` はクライアント/Functions とも `lib/date.ts` に集約
  （端末のタイムゾーンに依存しない）
- 型: TypeScript strict

## ドキュメント
- 仕様書（公開版）: `docs/famly_mvp_v0.1_spec.md:1`
- エージェント/貢献ガイド: `AGENTS.md:1`

## 注意事項
- `.env`/シークレットはコミットしない（`.gitignore`で除外済み）。
- 依存追加時は理由と影響（サイズ/互換性）をPRで記載。
- 本実装は最小構成です。画面遷移やUIライブラリ、エラー通知、テストは段階的に拡張してください。
