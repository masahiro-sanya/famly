# Famly (MVP v0.1)

シンプルな家族向けタスク記録アプリ（Expo + React Native + Firebase）。

- 認証: Firebase Auth（メール/パスワード）
- 記録/履歴: Firestore に「やった」タスクを保存・一覧表示
- 編集/削除: 既存タスクのタイトル編集と削除
- 共有: `householdId` 単位で履歴共有（初期値はユーザーID）
- 最小UI: React Native 標準コンポーネントで実装（Paper導入は任意）

## セットアップ

1) Node.js LTS（推奨 v20）を用意

2) 依存関係をインストール
```
npm install
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
- フィールド: `householdId`（昇順/==）→ `createdAt`（降順）
- ステータスが「有効」になるまで 1–3 分待機（エラーメッセージのリンクから作成でもOK）

6) 起動と確認
- `npx expo start -c`
- Expo Go でログイン→タスクを追加・編集・削除できることを確認


## 使い方（現状）
- 未ログイン時: メール/パスワードでログイン or 新規登録
- ログイン後: 画面上部のタブで操作
  - タスク: 入力欄は画面下部に固定。「やったこと」を入力して記録、下に履歴が表示（作成者名を表示）
    - 各行の「編集」でタイトル変更、「削除」で削除
  - プロフィール: 名前を編集して保存
  - 設定: `householdId` を変更、ログアウト

## データモデル（抜粋）
- `users/{userId}`: `name`, `email`, `householdId`
- `tasks/{taskId}`: `title`, `userId`, `householdId`, `createdAt`, `status`

Firestore セキュリティルールは最小権限で運用してください。クライアントのみの公開リポジトリにはルールは含みません。

## 開発メモ / アーキテクチャ
- レイヤ構成（簡易クリーンアーキテクチャ）
  - `src/domain/`: モデル定義（`models.ts`）
  - `src/application/`: ユースケース/フック（`auth.ts`, `tasks.ts`）
  - `src/infrastructure/`: Firebase クライアント（`firebaseClient.ts`）
  - `src/presentation/`: UIコンポーネント/画面（`AppRoot.tsx`, `components/*`）
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
