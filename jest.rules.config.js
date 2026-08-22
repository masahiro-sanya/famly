/**
 * firestore.rules のテスト設定。Firestore エミュレーターが必要なので、
 * ルートの `npm test`（src 配下の純ロジック）とは分けている。
 *   npm run test:rules
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/rules/**/*.test.ts'],
  testTimeout: 30000,
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
