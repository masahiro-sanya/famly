# AGENTS

このリポジトリでエージェント（自動コーディング支援）が安全かつ一貫したやり方で作業するためのガイドです。ルールと手順はリポジトリ全体に適用されます（スコープ: ルート配下すべて）。

## 1. プロジェクト概要
- スタック: Expo + React Native + React + TypeScript（strict）+ Firebase
- 主要パッケージ（正は `package.json`。バージョンはここに二重管理しない）
  - expo / react / react-native / firebase
  - UI: react-native-paper、状態管理: zustand
- エントリ: `index.ts` → `App.tsx`（`SafeAreaProvider` + `ErrorBoundary` → `AppRoot`）
- サーバー: `functions/`（Cloud Functions 2nd Gen / Node.js 22）
- 設定: `app.json`（iOS/Android/Web の基本設定）、`firestore.rules`、`firestore.indexes.json`

## 2. 開発・実行
- 依存関係インストール: `npm install`（または `npm ci`）
- 開発サーバ起動: `npm run start`
  - Android: `npm run android`
  - iOS: `npm run ios`
  - Web: `npm run web`
- Node.js: LTS（推奨: v20 系）。`npm` を使用（lockfile は `package-lock.json`）。

## 3. コードスタイルと設計方針
- TypeScript strict 前提。型の穴埋め・型安全性の維持を優先。
- React: 関数コンポーネント + Hooks を使用。副作用は `useEffect`、状態は `useState`/`useReducer`。
- 命名とファイル:
  - 画面/コンポーネント: `PascalCase` の `.tsx`
  - ユーティリティ/型: `camelCase`/`snake_case` は既存に合わせ `.ts`
  - 既存のエクスポート形（`default export` の `App`）は維持。新規は原則 `named export` を推奨。
- 最小変更主義: 既存の構造や命名をむやみに変更しない。影響範囲を限定し、差分を小さく保つ。
- 無関係変更の混入禁止（リフォーマット・リネーム・不要な並び替え等）。
-- レイヤ構成（定義済み）: `src/domain`（モデル）, `src/application`（ユースケース/hooks）, `src/infrastructure`（外部I/O）, `src/presentation`（UI）。

## 4. ディレクトリ構成

- `src/domain/`: モデル定義（`models.ts`）
- `src/application/`: ユースケース/カスタムフック（`auth.ts`, `tasks.ts`, `households.ts` 等）
- `src/infrastructure/`: 外部I/O（`firebaseClient.ts`）
- `src/presentation/`: UI（`AppRoot.tsx`, `components/*`, `theme.ts`）
- `src/lib/`: 共通ユーティリティ（`date.ts` … JST基準の日付キー）
- `functions/src/`: Cloud Functions（`lib/date.ts` はクライアント側と同じ計算を持つ）

既存ファイルの大規模再配置や命名規則変更は事前合意がある場合のみ実施。

## 5. Firebase/機密情報の扱い
- API キー等の秘匿情報はリポジトリにコミットしない。
- クライアント設定は `.env` の `EXPO_PUBLIC_*` から注入する（`.env.example` 参照）。
- セキュリティルールは Console で手書きせず `firestore.rules` を編集してデプロイする。
- 導入や変更が必要な場合は、まず相談/合意を取ること。

## 6. テスト/検証
- ルート: `npm run typecheck` / `npm test`（jest + ts-jest）
- functions: `npm run typecheck` / `npm test` / `npm run build`
- `.github/workflows/ci.yml` が push(main/develop) と PR で上記を実行する
- 現状の対象は JST 日付ユーティリティ。コンポーネントテストを足す場合は
  `jest-expo` プリセットの導入が必要（合意の上で）。
- 方針の詳細は `.claude/rules/testing.md`

## 7. 依存関係
- 追加は最小限に。軽量・メンテされているものを選ぶ。
- 追加/更新時は理由、代替案、バンドル影響（サイズ/互換性）を記載。
- インストールは `npm install <pkg>` を使用（`package-lock.json` に整合）。

## 8. エージェントの作業手順（Codex CLI 想定）
- 事前アナウンス: コマンド実行や大きな変更の前に 1–2 行で簡潔に意図を共有。
- プラン管理: `update_plan` を使ってステップを更新。常に 1 つだけ `in_progress`。
- リポジトリ検索: `rg`（ripgrep）優先。ファイル出力は 250 行以内に分割して読む。
- 変更適用: `apply_patch` を使用。最小差分、無関係変更の混入を避ける。
- バリデーション: 変更範囲に絞って確認（型チェック/ビルド/画面起動の手順を提示）。
- 制限遵守: ネットワーク/ファイル書込などの制約・承認フローを尊重。

## 9. Do / Don’t
- Do
  - 目的に直結する最小の実装
  - 既存のスタイル・構造を尊重
  - 影響範囲の明示と安全なロールアウト
  - 変更理由/代替案の簡潔な説明
- Don’t
  - 無断の大規模リファクタ/再構成
  - 秘密情報のコミット
  - 無関係ファイルのフォーマット/命名変更

## 10. 仕様・ドキュメント
- 仕様: `docs/famly_mvp_v0.1_spec.md`
- ロードマップ: `docs/Famly_Version_Roadmap.md`
- UI: `docs/ui-design-spec.md`
- レビュー観点: `docs/code-review-checklist.md`
- セットアップ/デプロイ手順: `README.md`
- `docs/_local/` は Git 管理外（ローカル作業用）。

---

不明点やあいまいな要件がある場合は、必ず着手前に質問し、合意形成後に実装します。小さく早く、確実に前進させることを最優先とします。
