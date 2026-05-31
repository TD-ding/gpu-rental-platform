# GPU算力租赁平台

高性能GPU算力按需租赁平台，支持用户浏览GPU资源、在线租赁下单、订单管理，管理员可管理GPU资源、查看订单和管理用户。

## 技术栈

- **前端**: React 18 + React Router 6 + Axios
- **后端**: Node.js + Express + better-sqlite3 + JWT
- **管理面板**: React 18 + React Router 6

## 项目结构

```
gpu-rental-platform/
├── server/                # 后端服务 (Express + SQLite)
│   ├── .env.example       # 环境变量示例
│   ├── Dockerfile         # 服务端 Docker 镜像
│   ├── jest.config.js     # Jest 测试配置
│   ├── tests/             # 单元测试
│   └── src/
│       ├── config/db.js          # 数据库配置、迁移与初始化
│       ├── middleware/
│       │   ├── auth.js           # JWT认证中间件
│       │   └── rateLimit.js      # 接口限流中间件
│       ├── routes/
│       │   ├── auth.js           # 认证路由
│       │   ├── gpus.js           # GPU资源路由（分页、部分更新）
│       │   ├── orders.js         # 订单路由（分页、状态流转、归还上限）
│       │   ├── stats.js          # 统计数据路由
│       │   └── users.js          # 用户管理路由（分页）
│       └── index.js              # 入口文件
├── client/                # 用户前端
│   ├── Dockerfile         # 客户端 Docker 镜像
│   ├── nginx.conf         # Nginx 配置（API代理 + SPA路由）
│   └── src/
│       ├── components/           # ErrorBoundary, GpuCard, RentModal, Navbar
│       ├── pages/                # 页面组件
│       ├── utils/                # API, AuthContext, format (共享格式化/映射)
│       └── App.js                # 应用入口
├── admin/                 # 管理员面板
│   ├── Dockerfile         # 管理面板 Docker 镜像
│   ├── nginx.conf         # Nginx 配置（API代理 + SPA路由）
│   └── src/
│       ├── components/           # Sidebar
│       ├── pages/                # 页面组件
│       ├── utils/                # API, AuthContext, format (共享格式化/映射)
│       └── App.js                # 应用入口
├── .github/workflows/     # GitHub Actions CI
├── docker-compose.yml     # Docker Compose 编排
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

### 3. 启动后端服务

```bash
cd server
npm run dev
```

后端默认运行在 `http://localhost:5000`，首次启动会自动创建数据库、运行迁移、创建默认管理员账号和示例GPU数据。

**注意**: 服务启动时会检查 `JWT_SECRET`，如果未设置或使用默认值将拒绝启动。

### 4. 启动前端

```bash
cd client
npm start
```

前端默认运行在 `http://localhost:3000`

### 5. 启动管理面板

```bash
cd admin
npm start
```

管理面板默认运行在 `http://localhost:3001`（需手动设置端口，或直接使用3000以外的端口）

### 6. 运行测试

```bash
cd server
npm test
```

### 7. 使用 Docker 部署

```bash
# 修改 JWT_SECRET
docker compose up -d
```

- 后端：`http://localhost:5000`
- 用户前端：`http://localhost:3000`
- 管理面板：`http://localhost:3001`

## CI

项目使用 GitHub Actions 自动运行 CI，配置在 `.github/workflows/ci.yml`：
- 服务端单元测试（Jest + Supertest，65个测试用例）
- 用户前端构建验证
- 管理面板构建验证

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 5000 |
| JWT_SECRET | JWT签名密钥 (**必填**) | 无 |
| DB_PATH | SQLite数据库路径 | ./data/gpu_rental.db |
| ALLOWED_ORIGINS | CORS允许的来源（逗号分隔） | http://localhost:3000,http://localhost:3001 |

## 数据库迁移

使用 `schema_version` 表管理迁移版本，每次启动自动检查并运行未执行的迁移。当前版本：2。

## API 接口

### 认证
- `POST /api/auth/register` - 注册（邮箱格式校验、用户名限字母数字下划线中文、密码≥6位、异步加密）
- `POST /api/auth/login` - 登录（限流：15分钟内最多10次）
- `GET /api/auth/me` - 获取当前用户

### GPU资源
- `GET /api/gpus` - 获取GPU列表（支持 `page`, `limit`, `status` 分页查询）
- `GET /api/gpus/:id` - 获取GPU详情
- `POST /api/gpus` - 添加GPU（管理员）
- `PUT /api/gpus/:id` - 更新GPU（管理员，部分更新：未传字段保留原值，available_units上限为total_units）
- `DELETE /api/gpus/:id` - 删除GPU（管理员，有关联订单时禁止删除）

### 订单
- `POST /api/orders` - 创建订单（最大720小时，金额以分为单位整数存储，每用户每GPU限1个活跃订单）
- `GET /api/orders/my` - 我的订单（分页）
- `GET /api/orders` - 所有订单（管理员，分页）
- `PUT /api/orders/:id/status` - 更新订单状态（管理员，仅允许合法流转）
- `PUT /api/orders/:id/pay` - 支付订单

### 订单状态流转规则
```
pending → paid / cancelled
paid → running / cancelled
running → completed
completed → (终态)
cancelled → (终态)
```

### 用户管理
- `GET /api/users` - 用户列表（管理员，分页）
- `PUT /api/users/:id/role` - 修改用户角色（管理员）
- `DELETE /api/users/:id` - 删除用户（管理员，有活跃订单时禁止删除）

### 统计
- `GET /api/stats` - 仪表盘统计数据（管理员）

## 金额说明

所有金额在后端以**分（整数）**存储，避免浮点数精度问题。前端计算也使用整数运算（cents × hours），展示时除以100转换为元。价格输入限制最多2位小数。

## 功能清单

### 用户端
- 注册 / 登录（邮箱格式校验、用户名限字母数字下划线中文）
- 浏览GPU算力列表（分页、显卡型号、显存、算力、价格）
- 租赁下单（整数价格计算、选择时长、提交按钮防重复、最大720小时）
- 订单管理（查看订单、支付、分页浏览）
- 登录后跳转回来源页（记住之前访问的页面）
- 响应式布局
- Token过期自动跳转登录页
- 操作提示3秒自动消失
- React ErrorBoundary 防止渲染错误导致白屏

### 管理员面板
- 仪表盘（后端直接返回统计数据）
- GPU资源管理（增删改查、分页、部分更新、价格2位小数限制、有关联订单禁止删除）
- 订单管理（查看所有订单、合法状态流转、分页）
- 用户管理（查看用户、切换角色、删除、���页）
- 全局管理员认证状态（AuthContext），切换页面无需重复验证

### 安全与健壮性
- API 不存在时返回 JSON 错误而非 HTML
- 数据库外键约束已启用（foreign_keys=ON）
- GPU 价格 CHECK 约束（>0），前后端双重校验
- 未捕获异常/未处理 Promise 拒绝时进程退出，避免状态不一致
- 每用户每GPU限1个活跃订单，防止单用户占满库存
- 种子数据密码哈希使用异步 bcrypt，不阻塞启动
- 所有列表接口统一分页响应格式（page/limit/total/totalPages）
- 后端密码长度校验（≥6位）
- 邮箱格式校验
- 用户名限字母数字下划线中文
- 密码加密异步处理，不阻塞主线程
- 登录接口限流（15分钟/10次）
- JWT密钥启动时检查，使用默认值拒绝启动
- CORS限制，只允许配置的前端来源访问
- 金额整数存储（分），前端整数运算，避免浮点精度问题
- 订单状态严格按流转规则变化
- GPU归还时 available_units 上限为 total_units
- GPU更新支持部分更新（未传字段保留原值）
- 删除用户/GPU前检查关联数据
- 租赁时长上限720小时
- 数据库迁移使用版本号管理（schema_version表，MAX(version)查询）
- 全局错误处理防止服务崩溃
- React ErrorBoundary 防止前端白屏
- 共享格式化/映射工具（format.js），避免重复代码
- .env 敏感信息不纳入版本控制
- 订单状态变更记录 updated_at 时间