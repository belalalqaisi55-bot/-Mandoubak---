import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'android/**/*', 'app/**/*', 'node_modules/**/*', 'public/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
