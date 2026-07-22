import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'src/generated/**/*', 'test_api.js', 'scripts/**/*', 'server-bundle/index.js']
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11yPlugin.flatConfigs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    ...reactPlugin.configs.flat?.recommended,
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      ...Object.fromEntries(
        Object.entries(jsxA11yPlugin.flatConfigs.recommended.rules).map(([rule, val]) => {
          const isOff = val === 'off' || val === 0 || (Array.isArray(val) && (val[0] === 'off' || val[0] === 0));
          return [
            rule,
            isOff ? val : Array.isArray(val) ? ['error', ...val.slice(1)] : 'error'
          ];
        })
      ),
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'prefer-const': 'warn',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      '@typescript-eslint/no-use-before-define': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
