# AGENTS

このリポジトリでエージェント（自動コーディング支援）が安全かつ一貫したやり方で作業するためのガイドです。ルールと手順はリポジトリ全体に適用されます（スコープ: ルート配下すべて）。

## 1. プロジェクト概要
- スタック: Expo + React Native + React + TypeScript（strict）
- 主要パッケージ（`package.json` より）
  - expo `~54.0.10`
  - react `19.1.0`
  - react-native `0.81.4`
  - firebase `^12.3.0`
- エントリ: `index.ts` → `App.tsx`
- 設定: `app.json`（iOS/Android/Web の基本設定）

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

## 4. ディレクトリ指針（必要時）
現状はシンプル構成（`App.tsx`, `index.ts`）。機能追加が必要になった場合は次のような配置を推奨（新規作成時のみ）。

- `components/`: 再利用可能な純粋コンポーネント
- `screens/`: 画面単位のコンポーネント
- `lib/`: 共通ユーティリティ（関数/フォーマッタ等）
- `services/`: 外部サービス連携（例: Firebase）
- `types/`: 共有型定義

既存ファイルの大規模再配置や命名規則変更は事前合意がある場合のみ実施。

## 5. Firebase/機密情報の扱い
- API キー等の秘匿情報はリポジトリにコミットしない。
- Expo の `extra`（`app.config.ts` 経由）や `.env` を利用して注入する方法を採用。
- 例（参考）:
  1) ルートに `app.config.ts` を用意し、`extra` に環境値を渡す
  2) 実行時は `Constants.expoConfig?.extra` から参照
- 導入や変更が必要な場合は、まず相談/合意を取ること。

## 6. テスト/検証
- 現状テスト設定は未導入。必要になった場合は以下を提案:
  - ユニット: Jest + React Native Testing Library
  - 型: `tsc --noEmit` を CI/ローカルで実行
- 追加前に合意を取り、影響範囲を明確化する。

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
- 仕様書がある場合は `docs/` 配下に配置推奨（例: `docs/famly_mvp_v0.1_spec.md`）。
- 現在、開発者のローカルにある仕様（例: `~/Downloads/famly_mvp_v0.1_spec.md`）は参照不能のため、必要に応じリポジトリへコピーして共有してください。

---

不明点やあいまいな要件がある場合は、必ず着手前に質問し、合意形成後に実装します。小さく早く、確実に前進させることを最優先とします。
