/**
 * browser-utils 包的 Jest 配置（继承根目录基础配置）
 */
const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  // 子包特有的测试匹配规则（只执行当前包的测试文件）
  testMatch: ['**/__tests__/**/*.test.ts'],
  // 子包的 coverage 输出目录（避免与其他包冲突）
  coverageDirectory: 'coverage'
}
