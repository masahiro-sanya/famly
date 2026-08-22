# テスト方針

## 現状

jest + ts-jest を導入済み。CI（`.github/workflows/ci.yml`）で app / functions / rules の3ジョブが回る。

```bash
npm run typecheck && npm test           # アプリ（src 配下の純ロジック）
npm run test:rules                      # Firestore ルール（エミュレーター自動起動 / 要 Java）
cd functions && npm test                # Cloud Functions のロジック
```

| 対象 | ファイル |
|------|---------|
| JST 日付ユーティリティ | `src/lib/date.test.ts` / `functions/src/lib/date.test.ts` |
| クライアントと Functions の JST 変換の一致 | `src/lib/date.contract.test.ts` |
| Functions の判断ロジック | `functions/src/lib/plan.test.ts` |
| Firestore ルール | `tests/rules/firestore.rules.test.ts` |

未着手はコンポーネントテスト（jest-expo プリセットの導入が要る）と E2E。

## 推奨テスト戦略

### テストタイプ

| 種類 | 対象 | 比率 |
|------|------|------|
| **ユニットテスト** | ユーティリティ関数、ドメインロジック | 70% |
| **統合テスト** | カスタムフック、Firestore操作 | 25% |
| **E2Eテスト** | 重要なユーザーフロー | 5% |

### 優先的にテストすべき箇所

- `src/lib/` - ユーティリティ関数（純粋関数）
- `src/domain/` - ドメインモデルのバリデーション
- `src/application/` - ビジネスロジック（Firebase モック使用）
- `functions/src/` - Cloud Functions

### Cloud Functions テスト

```bash
cd functions
npm test
```

Cloud Functions は以下を必ずテスト：
- `todayKeyJST()` - タイムゾーン変換の正確性
- `generateForHousehold()` - 重複防止ロジック
- `deleteMyAccount` - データ削除の完全性
- `joinByInvite` - バリデーションとエラーケース

Firestore への読み書きを含む部分はエミュレーターなしでは回せないため、
判断ロジックを `functions/src/lib/plan.ts` に純関数として切り出し、そこをテストしている。
Callable 本体は「切り出した判断に従って読み書きするだけ」の薄い層に保つこと。

## Firestore ルールテスト

```bash
npm run test:rules
```

セキュリティルールのテストは以下を確認：
- 認証なしアクセスの拒否
- 自分以外のユーザーデータへのアクセス制限
- household メンバーシップの検証
- stamps の作成/削除権限

## 手動テスト

自動テストで届かない UI とデバイス上の挙動は以下を手動確認：

1. **認証フロー**: サインアップ → ログイン → ログアウト → パスワードリセット
2. **タスク操作**: 作成 → 完了 → 取り消し → 削除
3. **世帯管理**: 作成 → 招待コード生成 → 参加 → 退出
4. **リアクション**: スタンプ付与 → トグル削除
5. **デフォルトタスク**: テンプレート登録 → 自動生成確認

## テストが失敗した場合

1. エラーメッセージを確認
2. **テストではなく実装を修正**（テストが正しい場合）
3. Firebase Emulator のログを確認
4. Firestore ルールが原因の場合はルールを修正
