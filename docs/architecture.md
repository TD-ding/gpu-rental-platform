# 架构设计

## 整体架构

```
┌─────────────┐  ┌─────────────┐
│  用户前端     │  │  管理员面板   │
│  React SPA   │  │  React SPA   │
│  :3000       │  │  :3001       │
└──────┬───────┘  └──────┬───────┘
       │                 │
       │  /api/*         │  /api/*
       ▼                 ▼
┌─────────────────────────────┐
│      Express 后端 :5000     │
│  ┌───────┐ ┌──────────────┐ │
│  │ 路由   │ │ 中间件        │ │
│  │ auth   │ │ JWT auth     │ │
│  │ gpus   │ │ adminOnly    │ │
│  │ orders │ │ rateLimit    │ │
│  │ users  │ │ cors         │ │
│  │ stats  │ └──────────────┘ │
│  └───┬───┘                   │
│      │                       │
│  ┌───▼───────────────────┐   │
│  │  better-sqlite3       │   │
│  │  SQLite (WAL + FK)    │   │
│  └───────────────────────┘   │
└─────────────────────────────┘
```

- **用户前端** 和 **管理员面板** 均为 React SPA，通过 Axios 调用后端 API
- **后端** 单进程 Express 服务，内嵌 SQLite 数据库
- 生产模式下后端同时托管用户前端的静态文件（SPA catch-all），管理员面板通过独立的 Nginx 容器提供

## 技术选型

| 层面 | 技术 | 选型原因 |
|------|------|----------|
| 前端框架 | React 18 + React Router 6 | 组件化、生态成熟 |
| HTTP 客户端 | Axios | 请求/响应拦截器便于统一处理 Token |
| 后端框架 | Express | 轻量、中间件生态丰富 |
| 数据库 | SQLite (better-sqlite3) | 零配置、单文件部署、同步 API 简化逻辑 |
| 认证 | JWT (jsonwebtoken) | 无状态、前后端分离友好 |
| 密码加密 | bcryptjs (异步) | 安全哈希、异步不阻塞主线程 |
| 限流 | express-rate-limit | 登录接口防暴力破解 |
| 容器化 | Docker + Docker Compose | 一键部署三个服务 |
| 反向代理 | Nginx | 前端静态托管 + API 代理 + SPA 路由 |
| CI | GitHub Actions | 与代码仓库集成、自动测试和构建验证 |
| 测试 | Jest + Supertest | 服务端集成测试、内存数据库隔离 |

## 数据库设计

### ER 关系

```
users 1──* orders *──1 gpu_resources
```

### 表结构

#### users

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| username | TEXT | UNIQUE, NOT NULL | 用户名（字母数字下划线中文，2-20位） |
| email | TEXT | UNIQUE, NOT NULL | 邮箱 |
| password | TEXT | NOT NULL | bcrypt 哈希 |
| role | TEXT | DEFAULT 'user' | 角色：user / admin |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### gpu_resources

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| name | TEXT | NOT NULL | GPU 名称 |
| model | TEXT | NOT NULL | 型号 |
| vram | TEXT | NOT NULL | 显存 |
| compute_power | TEXT | NOT NULL | 算力 |
| price_per_hour | INTEGER | NOT NULL, CHECK(>0) | 每小时价格（分） |
| total_units | INTEGER | DEFAULT 1, CHECK(>=0) | 总单元数 |
| available_units | INTEGER | DEFAULT 1, CHECK(>=0) | 可用单元数 |
| status | TEXT | DEFAULT 'available' | 状态：available / unavailable |
| description | TEXT | | 描述 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### orders

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| user_id | INTEGER | NOT NULL, FK → users.id | 下单用户 |
| gpu_id | INTEGER | NOT NULL, FK → gpu_resources.id | 租赁 GPU |
| hours | INTEGER | NOT NULL, CHECK(>0) | 租赁时长（小时） |
| total_price | INTEGER | NOT NULL, CHECK(>0) | 总价（分） |
| status | TEXT | DEFAULT 'pending' | 订单状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | | 状态变更时间 |

### 金额存储

所有金额以**分（整数）**存储，避免浮点数精度问题。前端展示时除以 100 转换为元，输入限制最多 2 位小数。

### 迁移机制

使用 `schema_version` 表跟踪数据库版本，每次启动自动执行未完成的迁移：

```
当前版本: 2
版本 1: 创建 users、gpu_resources、orders 表
版本 2: 预留（每用户每 GPU 活跃订单限制由应用层实现）
```

查询使用 `SELECT MAX(version)` 确保获取最新版本号。

## 订单状态机

```
pending ──→ paid ──→ running ──→ completed
   │          │
   └──→ cancelled ←──┘
```

- `completed` 和 `cancelled` 为终态，不可再变更
- 仅管理员可通过 `PUT /orders/:id/status` 推进状态
- 用户可通过 `PUT /orders/:id/pay` 将 pending → paid
- 订单取消或完成时，自动归还 GPU 单元（`available_units + 1`，上限为 `total_units`）

## 认证与授权

### JWT 流程

1. 用户注册/登录 → 后端签发 JWT（有效期 7 天），返回给前端
2. 前端存入 `localStorage`（用户端用 `token`，管理端用 `admin_token`）
3. 后续请求通过 `Authorization: Bearer <token>` 携带
4. 后端 `auth` 中间件验证 Token，将解码结果挂载到 `req.user`
5. `adminOnly` 中间件检查 `req.user.role === 'admin'`

### 前端认证保护

- **用户端**：`AuthContext` 在挂载时检查 Token 有效性，401 响应自动清除 Token 并跳转登录页
- **管理端**：`AdminAuthProvider` 额外验证 `role === 'admin'`，非管理员 Token 被拒绝；403 也触发登出

## 并发与一致性

- better-sqlite3 同步 API + WAL 模式，无异步竞态
- 订单创建和状态变更使用 `db.transaction()` 保证原子性
- GPU `available_units` 使用 `UPDATE ... WHERE available_units > 0` 防止超卖
- 归还时 `MIN(available_units + 1, total_units)` 防止超出总量
- 外键约束（`foreign_keys = ON`）保证引用完整性
- CHECK 约束保证价格 > 0、数量 >= 0
