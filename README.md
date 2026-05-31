# GPU算力租赁平台

高性能GPU算力���需租赁平台，支持用户浏览GPU资源、在线租赁下单、订单管理，管理员可管理GPU资源、查看订单和管理用户。

## 技术栈

- **前端**: React 18 + React Router 6 + Axios
- **后端**: Node.js + Express + better-sqlite3 + JWT
- **管理面板**: React 18 + React Router 6

## 项目结构

```
gpu-rental-platform/
├── server/                # 后端服务 (Express + SQLite)
│   ├── .env.example       # 环境变量示例
│   ├── Dockerfile         # 服务端 Docker 镜像（多阶段构建）
│   ├── jest.config.js     # Jest 测试配置
│   ├── tests/             # 单元测试（65 个用例）
│   │   ├── setup.js       # 测试辅助工具（内存 DB、种子数据、Token 生成）
│   │   ├── auth.test.js   # 认证路由测试
│   │   ├── gpus.test.js   # GPU 资源路由测试
│   │   ├── orders.test.js # 订单路由测试
│   │   ├── users.test.js  # 用户管理路由测试
│   │   └── stats.test.js  # 统计路由测试
│   └── src/
│       ├── config/db.js          # 数据库配置、迁移与种子数据
│       ├── middleware/
│       │   ├── auth.js           # JWT 认证 + adminOnly 中间件
│       │   └── rateLimit.js      # 登录限流（15分钟/10次）
│       ├── routes/
│       │   ├── auth.js           # 注册/登录/当前用户
│       │   ├── gpus.js           # GPU CRUD（分页、部分更新）
│       │   ├── orders.js         # 订单（状态机、每用户每GPU限1活跃订单）
│       │   ├── stats.js          # 仪表盘统计
│       │   └── users.js          # 用户管理（分页、角色、删除）
│       └── index.js              # 入口（导出 app，支持测试）
├── client/                # 用户前端
│   ├── Dockerfile         # 多阶段构建 → Nginx
│   ├── nginx.conf         # API 代理 + SPA 路由
│   └── src/
│       ├── components/    # Navbar, ErrorBoundary, GpuCard, RentModal
│       ├── pages/         # Home, GpuList, Orders, Login, Register
│       ├── utils/         # api.js, AuthContext.js, format.js
│       └── App.js
├── admin/                 # 管理员面板
│   ├── Dockerfile         # 多阶段构建 → Nginx
│   ├── nginx.conf         # API 代理 + SPA 路由
│   └── src/
│       ├── components/    # Sidebar
│       ├── pages/         # Dashboard, GpuManage, OrderManage, UserManage, Login
│       ├── utils/         # api.js, AuthContext.js, format.js
│       └── App.js
├── docs/                  # 项目文档
│   ├── architecture.md    # 架构设计（数据库、状态机、认证、并发）
│   ├── api.md             # API 接口详细文档
│   ├── deployment.md      # 部署指南（本地开发 + Docker + 生产）
│   ├── testing.md         # 测试文档（策略、覆盖范围、辅助工具）
│   ├── frontend.md        # 前端开发文档（用户端 + 管理端）
│   └── ci.md              # CI/CD 文档
├── .github/workflows/     # GitHub Actions CI
│   └── ci.yml             # 服务端测试 + 前端构建验证
├── docker-compose.yml     # Docker Compose 编排（server + client + admin）
├── .dockerignore
├── .gitignore
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 配置环境变量

```bash
cd server
cp .env.example .env
# 编辑 .env，必须修改 JWT_SECRET 为安全的随机字符串
```

### 3. 启动后端

```bash
cd server
npm run dev
```

后端运行在 `http://localhost:5000`，首次启动自动创建数据库、迁移、种子数据。

### 4. 启动前端

```bash
cd client
npm start
```

用户前端运行在 `http://localhost:3000`

### 5. 启动管理面板

```bash
cd admin
npm start
```

管理面板运行在 `http://localhost:3001`

### 6. 运行测试

```bash
cd server
npm test
```

65 个测试用例覆盖所有后端路由。

### 7. Docker 部署

```bash
docker compose up -d
```

- 后端：`http://localhost:5000`
- 用户前端：`http://localhost:3000`
- 管理面板：`http://localhost:3001`

> 生产环境必须修改 `JWT_SECRET`，不要使用默认值。

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

## 环境变量

| 变量 | 说明 | 默认值 | 必填 |
|------|------|--------|------|
| PORT | 服务端口 | 5000 | 否 |
| JWT_SECRET | JWT 签名密钥 | 无 | **是** |
| DB_PATH | SQLite 数据库路径 | ./data/gpu_rental.db | 否 |
| ALLOWED_ORIGINS | CORS 允许的来源（逗号分隔） | http://localhost:3000,http://localhost:3001 | 否 |

## API 接口

详细接口文档见 [docs/api.md](docs/api.md)。

简要列表：

- **认证**: `POST /api/auth/register` | `POST /api/auth/login` | `GET /api/auth/me`
- **GPU**: `GET /api/gpus` | `GET /api/gpus/:id` | `POST /api/gpus` | `PUT /api/gpus/:id` | `DELETE /api/gpus/:id`
- **订单**: `POST /api/orders` | `GET /api/orders/my` | `GET /api/orders` | `PUT /api/orders/:id/status` | `PUT /api/orders/:id/pay`
- **用户**: `GET /api/users` | `PUT /api/users/:id/role` | `DELETE /api/users/:id`
- **统计**: `GET /api/stats`

订单状态流转：`pending → paid → running → completed`，`pending/paid → cancelled`

## 详细文档

| 文档 | 内容 |
|------|------|
| [架构设计](docs/architecture.md) | 整体架构、数据库设计、状态机、认证授权、并发一致性 |
| [API 接口](docs/api.md) | 全部接口的请求/响应格式、校验规则、错误码 |
| [部署指南](docs/deployment.md) | 本地开发、Docker 部署、生产注意事项、数据备份 |
| [测试文档](docs/testing.md) | 测试策略、覆盖范围、辅助工具、扩展方法 |
| [前端开发](docs/frontend.md) | 用户端和管理端目录���构、路由、认证流程 |
| [CI/CD](docs/ci.md) | GitHub Actions 流水线配置说明 |

## 金额说明

所有金额以**分（整数）**存储，前端整数运算，展示时除以 100 转换为元。