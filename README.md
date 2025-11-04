LightEye — 前端监控与可观测性平台

## 项目简介

Light Eye 是一套前端监控解决方案，覆盖“前端 SDK 采集 + 上报传输 + 后端存储与查询 + 管理后台展示”的完整链路。

核心能力：

- 错误监控：JS 运行时错误、资源加载错误、Promise 未捕获异常、React 错误边界
- 性能监控：Web Vitals（CLS/FCP/INP/LCP/TTFB）、FP、DOM Ready、Load、Navigation/网络阶段耗时
- 用户行为追踪：最近操作事件序列与最后一次交互上下文（辅助复现问题）
- 数据上报：批量/实时上报，beforeunload 使用 sendBeacon 兜底，携带浏览器基础信息
- 管理后台：项目管理、错误列表与图表可视化

技术栈：

- 前端 SDK：TypeScript、插件化架构（packages/core、browser、react、vue、browser-utils、utils）
- 管理后台：React + Vite + React Query + shadcn/ui + Recharts
- 后端服务：NestJS（apps/backend），PostgreSQL（项目/用户等关系数据）、ClickHouse（监控事件/埋点时序数据）
- 工程化：Monorepo（pnpm workspace + Turbo）、ESLint/Prettier、Jest

## 目录结构

```
.
├── apps
│   ├── backend
│   │   ├── monitor-server     # 业务 API（用户/认证/应用管理，PostgreSQL）
│   │   └── dsn-server         # DSN 上报服务（ClickHouse 存储与查询）
│   └── frontend
│       └── monitor            # 管理后台（React）
├── packages                   # 可复用 SDK 模块
│   ├── core                   # Monitor 核心与类型定义
│   ├── browser                # 浏览器端采集与传输（Errors/Metrics/Transport）
│   ├── browser-utils          # 事件追踪与 DOM 工具
│   ├── react                  # React 集成（错误边界）
│   ├── vue                    # 预留 Vue 集成
│   └── utils                  # 公共缓存与工具
└── demos                      # 集成示例（react/vue/vanilla）
```

## 环境要求

- Node.js ≥ 18
- pnpm ≥ 9（项目使用 `packageManager: pnpm@10.x`，建议使用最新稳定版）
- 本地或容器化数据库：
  - PostgreSQL（默认 dev 连接：host=localhost, db=postgres, user=postgres, pass=123456）
  - ClickHouse（默认 dev 连接：`http://localhost:8123`，user=default, pass=123456）

提示：仓库提供可选的容器编排（参见脚本 `pnpm docker:start`），如需一键启动基础设施，可在根目录执行。

## 安装

```
pnpm i
```

## 一键开发（推荐）

根目录已配置 Turbo 流水线，支持并行启动：

```
# 后端与前端并行开发
pnpm dev

# 或仅构建/仅服务
pnpm build:server  # 构建两个 Nest 服务
pnpm build:lib     # 构建 SDK 包
pnpm start:dev     # 并行启动各服务的 dev
```

## 分服务启动（手动）

也可分别进入包目录启动，便于按需调试：

```
# 启动 DSN 上报服务（ClickHouse）
pnpm --filter dsn-server start:dev

# 启动业务 API（PostgreSQL）
pnpm --filter monitor-server start:dev

# 启动管理后台（Vite）
pnpm --filter monitor dev
```

默认代理与接口：

- 管理后台请求基础地址：`/api`（apps/backend/monitor-server）
- 监控上报 DSN：`/dsn-api`（apps/backend/dsn-server）

上述前缀由前端 `apps/frontend/monitor/src/service/config/index.ts` 管理，可按需修改。

## SDK 使用示例

浏览器端（不区分框架）：

```ts
import { init } from '@light-eye/browser'

const { monitor, transport, eventTracker } = init({
  dsn: '/dsn-api/storage/tracing',
  transportOptions: {
    useBatch: true,
    bufferSize: 10,
    lazyTimeout: 3000
  },
  eventTracker: {
    enabled: true,
    maxEvents: 10,
    timeout: 5000
  }
})
```

React 应用（错误边界）：

```tsx
import { LightEyeBoundary } from '@light-eye/react'

function AppRoot() {
  return (
    <LightEyeBoundary options={{ dsn: '/dsn-api/storage/tracing' }}>
      <App />
    </LightEyeBoundary>
  )
}
```

## 管理后台接口封装

管理后台统一使用二次封装的 Axios：

- 双实例：`request`（业务 API）与 `dsnRequest`（埋点上报域）
- 统一错误模型 `RequestError` 与业务码校验
- Token 注入与自动刷新、并发刷新排队
- 全局登录失效回调（toast 提示 + 跳转登录）

参考入口：`apps/frontend/monitor/src/service/index.ts`

## 数据库与配置（开发默认）

monitor-server（PostgreSQL）：`apps/backend/monitor-server/src/app.module.ts`

```
type: 'postgres', host: 'localhost', username: 'postgres', password: '123456', database: 'postgres'
```

dsn-server（ClickHouse）：`apps/backend/dsn-server/src/app.module.ts`

```
url: 'http://localhost:8123', username: 'default', password: '123456'
```

如需调整连接信息，请修改对应模块配置或通过环境变量注入。

## 常用脚本

```
pnpm lint            # 代码规范/拼写检查
pnpm test            # 运行各包单测
pnpm build:lib       # 构建所有 SDK 包
pnpm build:server    # 构建后端服务
pnpm dev             # 一键并行开发（推荐）
pnpm docker:start    # 可选：拉起容器化依赖（ClickHouse/Postgres 等，视 compose 配置）
```

## 约定与说明

- DSN 上报路径与业务 API 均通过前端代理转发，确保同域开发体验
- 后端鉴权使用 JWT（monitor-server），前端在 Axios 拦截器中自动注入/刷新 Token
- ClickHouse 表结构与视图参考 dsn-server 的服务实现（`storage` 模块）

---

如需更多示例，可查看 `demos/` 目录中的 React/Vue/Vanilla 工程，快速验证集成效果。
