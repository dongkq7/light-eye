import eslint from '@eslint/js'
import globals from 'globals' // 需要处理全局变量：window console等
import tseslint from 'typescript-eslint' // 需要对ts进行支持
import eslintPrettier from 'eslint-plugin-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const ignores = [
  'dist',
  'node_modules',
  'build',
  '**/*.js',
  '**/*.mjs',
  '**/*.d.ts',
  'eslint.config.mjs',
  'apps/frontend/monitor/src/components/ui/**/*',
  'coverage/', // 忽略根目录 coverage
  'packages/**/coverage/', // 忽略子包 coverage
  'demos/**'
]

// 前端配置
const frontendConfig = {
  files: ['apps/frontend/monitor/**/*.{js,ts,vue,jsx,tsx}'], // 检查范围
  extends: [...eslintPluginVue.configs['flat/recommended']], // 继承配置
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    globals: {
      // 会自动引入前端相关的全局变量
      ...globals.browser
    },
    parserOptions: {
      // 针对react
      ecmaFeatures: {
        jsx: true
      }
    },
    parser: tseslint.parser
  },
  plugins: {
    'react-hooks': reactHooks,
    'react-refresh': reactRefresh
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    'react-refresh/only-export-components': [
      // 要求文件只导出 React 组件
      'warn',
      {
        allowConstantExport: true // 允许导出常量
      }
    ]
  }
}

// 为 shadcn/ui 组件创建特殊配置，禁用 react-refresh 规则
const shadcnConfig = {
  files: ['apps/frontend/monitor/src/components/ui/**/*.{js,ts,jsx,tsx}'],
  rules: {
    'react-refresh/only-export-components': 'off' // 完全关闭这个规则
  }
}

// 后端配置
const backendConfig = {
  files: ['apps/backend/**/*.{js,ts}'],
  languageOptions: {
    globals: {
      ...globals.node // 允许使用node相关的全局变量
    },
    parser: tseslint.parser
  },
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'error'
  }
}

export default tseslint.config(
  // 通用配置
  {
    ignores,
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended], // 继承一些配置
    plugins: {
      prettier: eslintPrettier
      // 'simple-import-sort': importSort
    },
    // 自定义规则
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
      // "simple-import-sort/imports": "error",
      // "simple-import-sort/exports": "error"
    }
  },
  // 前端配置
  frontendConfig,
  shadcnConfig,
  // 后端配置
  backendConfig
)
