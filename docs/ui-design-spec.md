# Famly UI デザイン仕様書

## 概要

React Native Paper コンポーネントを活用し、マテリアルデザイン(MD3)ベースの統一されたUIに刷新する。
アプリの構造・機能はそのまま維持し、見た目とUXを改善する。

---

## ターゲットユーザー

- 20〜30代の若い夫婦（共働きカップル・新婚）
- 家事タスクを気持ちよく共有したい

## デザインコンセプト

**「やさしい・あたたかい・家庭的」**

子育て系アプリ（みてね、ぴよログ、トツキトオカ等）の調査をもとに、以下の方針を採用：

- 暖色ベースのやさしい配色（コーラルピンク系）
- 彩度は控えめ（パステル〜くすみ系。ビビッドすぎない）
- 白い背景でコンテンツを引き立てる
- テキストは温かいダーク（真っ黒ではなくダークブラウン系）
- セカンダリーは差し色程度（やわらかブルー）

---

## デザイン方針

- RN標準 → Paper の `Button`, `TextInput`, `Text`, `Card`, `Appbar`, `Chip`, `Divider`, `IconButton` 等に置き換え
- ブランドカラーを定義し、PaperProvider のカスタムテーマで全画面に統一適用
- ハードコードカラー禁止。全色を `useTheme()` 経由で取得
- 構造（Clean Architecture / コンポーネント分割）は変更しない
- ダークモード対応: `useColorScheme()` でシステム設定に自動追従

---

## カラーテーマ

### ライトテーマ

| 用途 | カラーコード | 説明 |
|------|------------|------|
| Primary | `#E08D7B` | やさしいコーラルピンク。みてね・トツキトオカを参考にした温かみ |
| Primary Container | `#FFDAD3` | ソフトピーチ。contained-tonal ボタン等 |
| Secondary | `#7EAAB8` | くすんだスカイブルー。差し色・アクセント用 |
| Secondary Container | `#D1E7EF` | 淡い水色。セカンダリーの背景 |
| Tertiary | `#B5A28E` | ウォームベージュ。補助アクセント |
| Error | `#BA1A1A` | 削除・エラー表示 |
| Background | `#FFFBF9` | ほんのり温かいオフホワイト |
| Surface | `#FFFBF9` | カード・入力欄の背景 |
| On Background | `#291816` | ダークブラウン（テキスト主色。真っ黒を避ける） |

### カスタムセマンティックトークン

ハードコードカラーを撲滅し、全コンポーネントで一貫した色管理を行うための拡張トークン。

| トークン名 | ライト値 | 用途 |
|-----------|---------|------|
| `textSecondary` | `#5D4037` | ラベル・補助テキスト |
| `textMuted` | `#8D7B76` | 控えめなテキスト |
| `textHint` | `#A8968F` | ヒント・プレースホルダー |
| `textDark` | `#3E2723` | 強調テキスト |
| `inputBackground` | `#FFFFFF` | TextInputの背景 |
| `divider` | `#E0CEC8` | 区切り線 |
| `doneBackground` | `#F5E0DB` | 完了済みタスクの背景 |
| `dangerText` | `#BA1A1A` | 危険操作のテキスト色 |
| `dangerBorder` | `#BA1A1A` | 危険ボタンのボーダー |
| `dangerBackground` | `#BA1A1A` | 危険ボタンの背景 |
| `brandTitle` | `#E08D7B` | アプリタイトル「Famly」の色 |
| `modalBackground` | `#FFFFFF` | モーダルの背景 |
| `emojiButtonBackground` | `#F5E0DB` | リアクション絵文字ボタンの背景 |

### ダークテーマ

| 用途 | カラーコード | 説明 |
|------|------------|------|
| Primary | `#FFB4A5` | ライトコーラル（ダーク背景上で映える） |
| Secondary | `#A4D4E4` | ライトスカイブルー |
| Background | `#1A1110` | 温かいダークブラウン（純黒を避ける） |
| Surface | `#1A1110` | 背景と同色 |
| On Background | `#F0DFDA` | ウォームオフホワイト |

各セマンティックトークンもダーク用にトーン反転して定義する。

### テーマ定義ファイル

`src/presentation/theme.ts`

- `FamlyCustomColors` 型 + `FamlyTheme` 型をエクスポート
- `lightTheme` / `darkTheme` を定義
- 後方互換のため `export const theme = lightTheme` も維持

### テーマ切替

`AppRoot.tsx` で `useColorScheme()` によりシステム設定に自動追従。

---

## 参考にした子育て系アプリ

| アプリ | メインカラー | 特徴 |
|--------|------------|------|
| みてね（家族アルバム） | やさしいオレンジ | 白ベース + 暖色。写真が主役の控えめUI |
| ぴよログ（育児記録） | やわらかい黄緑 | テーマカラー選択可。片手操作UI |
| トツキトオカ（妊娠記録） | ベージュ/クリーム | 絵本のような温かいパステル調 |
| minto（TODO共有） | テーマ選択式 | シンプル + ダークモード対応 |

**共通傾向**: 暖色ベース / 彩度控えめ / 白い背景 / ダークブラウン系テキスト

---

## 画面別 変更仕様

### 1. AppRoot.tsx

| 項目 | 仕様 |
|------|------|
| ヘッダー | Paper `<Appbar.Header>` + `<Appbar.Content title="Famly" />` |
| タブ切替 | Paper `<Button>` の行。active=`contained-tonal` / inactive=`text` |
| テーマ | `useColorScheme()` → `lightTheme` or `darkTheme` を `PaperProvider` に渡す |
| StatusBar | ダーク時 `light` / ライト時 `auto` |

### 2. AuthForm.tsx（ログイン/新規登録）

| 項目 | 仕様 |
|------|------|
| 入力欄 | Paper `<TextInput>` (mode="outlined", dense) |
| ボタン | Paper `<Button>` (mode="contained" / "outlined") |
| カード | Paper `<Card>` (mode="outlined") |
| パスワードリセット | Paper `<Button>` (mode="text") |

### 3. TasksView.tsx（タスク一覧）

| 項目 | 仕様 |
|------|------|
| リスト | Paper `<Card>` + `<FlatList>` |
| 完了トグル | `<IconButton>` check(contained) / undo(outlined) |
| 編集・削除 | `<IconButton>` pencil / delete |
| リアクション | Paper `<Chip>` (compact) |
| リアクション追加 | Paper `<Portal>` + `<Modal>` |
| 完了済み | `doneBackground` 背景 + 取り消し線 + `textOnDone` 色 |

### 4. DefaultTasksView.tsx（テンプレ設定）

| 項目 | 仕様 |
|------|------|
| 入力欄 | Paper `<TextInput>` (mode="outlined") |
| 曜日チップ | Paper `<Chip>` (compact, selected) |
| 並び替え | `<IconButton>` arrow-up / arrow-down |
| 新規追加 | bottom fixed `<Card mode="elevated">` |

### 5. ProfileView.tsx（プロフィール）

| 項目 | 仕様 |
|------|------|
| カード | Paper `<Card>` (mode="outlined") |
| ラベル | Paper `<Text>` (variant="labelSmall") + `textSecondary` 色 |
| 値表示 | Paper `<Text>` + `textMuted` 色 |

### 6. SettingsView.tsx（設定）

| 項目 | 仕様 |
|------|------|
| セクション | 機能ごとに Paper `<Card>` で区切り (elevation={0}) |
| 危険ボタン | `dangerText` / `dangerBorder` / `dangerBackground` トークン使用 |
| コピーボタン | `<IconButton>` content-copy / check |
| メンバー表示 | `textDark` / `textHint` トークン使用 |

### 7. InputBar.tsx（タスク入力バー）

| 項目 | 仕様 |
|------|------|
| 配置 | position: absolute, bottom: 16 |
| カード | Paper `<Card mode="elevated">` |
| 入力欄 | Paper `<TextInput>` (mode="outlined") |
| 送信 | Paper `<IconButton>` (icon="send", mode="contained") |

### 8. TabButton.tsx

- Paper `<Button>` で代替済み。**削除済み**。

---

## 実装済みの変更

- 全コンポーネントで `useTheme<FamlyTheme>()` 経由でカラー取得
- ハードコードカラー 38箇所 → 0箇所に削減
- ダークモード自動切替（`useColorScheme()`）
- StyleSheet.create → `useMemo` による動的スタイル（テーマ依存色のみ）

---

## 対象外（変更しない）

- アプリの機能・ロジック（application層 / domain層 / infrastructure層）
- Firestoreルール / Firebase Functions
- ナビゲーション構造（タブ4画面構成はそのまま）
