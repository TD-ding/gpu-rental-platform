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
│   └── src/
│       ├── config/db.js          # 数据库配置与初始化
│       ├── middleware/
│       │   ├── auth.js           # JWT认证中间件
│       │   └── rateLimit.js      # 接口限流中间件
│       ├── routes/
│       │   ├── auth.js           # 认证路由
│       │   ├── gpus.js           # GPU资源路由
│       │   ├── orders.js         # 订单路由
│       │   └── users.js          # 用户管理路由
│       └── index.js              # 入口文件
├── client/                # 用户前端
│   └── src/
│       ├── components/           # 公共组件
│       ├── pages/                # 页面组件
│       ├── utils/                # 工具函数 (API, AuthContext)
│       └── App.js                # 应用入口
├── admin/                 # 管理员面板
│   └── src/
│       ├── components/           # 公共组件
│       ├── pages/                # 页面组件
│       ├── utils/                # 工具函数 (API)
│       └── App.js                # 应用入口
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

后端默认运行在 `http://localhost:5000`，首次启动会自动创建数据库、默认管理员账号和示例GPU数据。

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

## API 接口

### 认证
- `POST /api/auth/register` - 注册（密码至少6位，用户名2-20字符）
- `POST /api/auth/login` - 登录（限流：15分钟内最多10次）
- `GET /api/auth/me` - 获取当前用户

### GPU资源
- `GET /api/gpus` - 获取GPU列表
- `GET /api/gpus/:id` - 获取GPU详情
- `POST /api/gpus` - 添加GPU（管理员）
- `PUT /api/gpus/:id` - 更新GPU（管理员）
- `DELETE /api/gpus/:id` - 删除GPU（管理员）

### 订单
- `POST /api/orders` - 创建订单
- `GET /api/orders/my` - 我的订单
- `GET /api/orders` - 所有订单（管理员）
- `PUT /api/orders/:id/status` - 更新订单状态（管理员）
- `PUT /api/orders/:id/pay` - 支付订单

### 用户管理
- `GET /api/users` - 用户列表（管理员）
- `PUT /api/users/:id/role` - 修改用户角色（管理员）
- `DELETE /api/users/:id` - 删除用户（管理员，有活跃订单时禁止删除）

## 功能清单

### 用户端
- 注册 / 登录
- 浏览GPU算力列表（显卡型号、显存、算力、价格）
- 租赁下单（选择时长，自动计算费用）
- 订单管理（查看订单、支付）
- 响应式布局
- Token过期自动跳转登录页
- 操作提示3秒自动消失

### 管理员面板
- 仪表盘（GPU数量、订单数、用户数、收入统计）
- GPU资源管理（增删改查）
- 订单管理（查看所有订单、修改状态）
- 用户管理（查看用户、切换角色、删除）
- 前端校验管理员身份，非管理员自动跳转登录页

### 安全特性
- 后端密码长度校验（≥6位）
- 登录接口限流（15分钟/10次）
- JWT密钥启动时检查，使用默认值拒绝启动
- 删除用户前检查是否有活跃订单
- 全局错误处理防止服务崩溃
- .env 敏感信息不纳入版本控制