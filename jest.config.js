/**
 * ルート（アプリ側）のテスト設定。
 * 現状は React Native に依存しない純粋なロジック（src/lib, src/domain 等）を対象とする。
 * コンポーネントのテストを追加する際は jest-expo プリセットの導入を検討すること。
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          target: 'ES2020',
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
};
