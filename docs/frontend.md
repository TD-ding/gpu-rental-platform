# 前端开发文档

## 用户端（client/）

### 技术栈

- React 18 + React Router 6 + Axios
- react-scripts (CRA) 构建

### 目录结构

```
client/src/
├── index.js              # 入口，渲染 App 到 #root
├── App.js                # 路由配置 + AuthProvider + ErrorBoundary
├── components/
│   ├── Navbar.js         # 顶部导航栏（登录状态切换）
│   ├── ErrorBoundary.js  # 渲染错误捕获，显示回退 UI
│   ├── GpuCard.js        # GPU 卡片组件（展示信息 + 租赁按钮）
│   └── RentModal.js      # 租赁弹窗（选择时长、计算价格）
├── pages/
│   ├── Home.js           # 首页（Hero + 特性卡片）
│   ├── GpuList.js        # GPU 列表（分页、租赁下单）
│   ├── Orders.js         # 我的订单（分页、支付按钮）
│   ├── Login.js          # 登录页（来源页跳转）
│   └── Register.js       # 注册页（前端校验）
└── utils/
    ├── api.js            # Axios 实例（Token 注入 + 401 拦截）
    ├── AuthContext.js     # 认证上下文（登录/登出/会话恢复）
    └── format.js         # 格式化工具（价格、状态映射）
```

### 页面路由

| 路径 | 组件 | 认证 | 说明 |
|------|------|------|------|
| `/` | Home | 否 | 首页 |
| `/gpus` | GpuList | 否 | GPU 列表（租赁需登录） |
| `/orders` | Orders | 是 | 我的订单 |
| `/login` | Login | 否 | 登录（支持来源页跳转） |
| `/register` | Register | 否 | 注册 |

### 认证流程

1. 登录/注册成功 → Token 存入 `localStorage.token` → 跳转到来源页或首页
2. Axios 请求拦截器自动注入 `Authorization: Bearer <token>`
3. 401 响应 → 清除 Token → 跳转 `/login`
4. `AuthContext` 挂载时检查已有 Token 的有效性（调用 `/auth/me`）

### 来源页跳转

用户在 GPU 列表点击租赁但未登录时：
1. 跳转到 `/login`，`location.state.from` 记录来源页
2. 登录成功后跳回来源页

### 租赁下单流程

1. GpuList 页面渲染 GPU 卡片列表
2. 点击"立即租赁" → 登录检查 → 打开 RentModal
3. RentModal 输入时长（1-720 小时），实时计算总价
4. 提交 → `POST /orders` → 成功/失败提示（3 秒自动消失）

---

## 管理员面板（admin/）

### 技术栈

- React 18 + React Router 6 + Axios
- react-scripts (CRA) 构建

### 目录结构

```
admin/src/
├── index.js              # 入口
├── App.js                # 路由 + AdminAuthProvider + ProtectedRoute
├── components/
│   └── Sidebar.js        # 侧边导航栏
├── pages/
│   ├── Login.js          # 管理员登录
│   ├── Dashboard.js      # 仪表盘（统计数据）
│   ├── GpuManage.js      # GPU 管理（CRUD + 分页）
│   ├── OrderManage.js    # 订单管理（状态流转 + 分页）
│   └── UserManage.js     # 用户管理（角色/删除 + 分页）
└── utils/
    ├── api.js            # Axios 实例（admin_token + 401/403 拦截）
    ├── AuthContext.js     # 管理员认证上下文（验证 admin 角色）
    └── format.js         # 格式化工具（与用户端相同）
```

### 页面路由

| 路径 | 组件 | 认证 | 说明 |
|------|------|------|------|
| `/login` | AdminLogin | 否 | 管理员登录 |
| `/dashboard` | Dashboard | 管理员 | 仪表盘 |
| `/gpus` | GpuManage | 管理员 | GPU 管理 |
| `/orders` | OrderManage | 管理员 | 订单管理 |
| `/users` | UserManage | 管理员 | 用户管理 |

### 认证保护

- `AdminAuthProvider` 在会话恢复时验证 `role === 'admin'`
- 非管理员登录会被拒绝，显示"需要管理员权限"
- Token 存储在 `localStorage.admin_token`（与用户端隔离）
- 403 响应也会清除 Token 并跳转登录页
- `ProtectedRoute` 组件：未认证时重定向到 `/login`

---

## 共享工具

### format.js

用户端和管理员面板使用相同的格式化工具：

```js
formatPrice(1599)         // "15.99"（分 → 元）
STATUS_MAP['pending']     // "待支付"
NEXT_STATUS['pending']    // ['paid', 'cancelled']
GPU_STATUS_MAP['available'] // "可用"
```

### api.js 差异

| 属性 | 用户端 | 管理端 |
|------|--------|--------|
| Token 存储 | `localStorage.token` | `localStorage.admin_token` |
| 401 处理 | 清除 Token → 跳转 `/login` | 清除 Token → 跳转 `/login` |
| 403 处理 | 无特殊处理 | 清除 Token → 跳转 `/login` |
