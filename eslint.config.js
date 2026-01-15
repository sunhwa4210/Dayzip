// eslint.config.js
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const path = require('path');                 // ⬅️ 추가
const importPlugin = require('eslint-plugin-import'); // ⬅️ 추가

module.exports = defineConfig([
  // Expo 기본 설정
  expoConfig,

  // 공통 무시
  { ignores: ['dist/*'] },

  // ⬇️ alias(@) + TS를 import 규칙이 이해하도록 설정
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { import: importPlugin },
    settings: {
      // TS/Node resolver가 tsconfig의 paths와 파일 확장자를 인식하도록
      'import/resolver': {
        typescript: {
          project: path.resolve(__dirname, './tsconfig.json'),
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'],
        },
      },
      // TS 파일을 import 플러그인이 파싱할 수 있게
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      // 필요시 완화 (선택)
      // 'import/no-unresolved': 'error',
      // 'import/namespace': 'error',
    },
  },
]);
