module.exports = {
  preset: 'ts-jest', // 结合TS使用
  testEnvironment: 'jest-environment-jsdom', // 模拟浏览器环境
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // 继承子包自身的 tsconfig.json
        tsconfig: './tsconfig.json'
      }
    ]
  },
  collectCoverage: true, // 收集覆盖率
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/', '/build/']
}
