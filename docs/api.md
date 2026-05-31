# API 接口文档

Base URL: `http://localhost:5000/api`

所有接口返回 JSON。错误响应格式：`{ "error": "错误描述" }`

认证接口使用 `Authorization: Bearer <token>` 头部。

---

## 认证

### POST /auth/register

注册新用户。

**请求体：**

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**校验规则：**
- `username`：2-20 位，仅限字母、数字、下划线、中文字符
- `email`：合法邮箱格式
- `password`：最少 6 位

**成功响应 (200)：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 2,
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

**错误响应：**
- `400` - 字段缺失 / 格式不合法 / 用户名或邮箱已存在
- `500` - 注册失败

---

### POST /auth/login

用户登录。限流：15 分钟内最多 10 次请求。

**请求体：**

```json
{
  "username": "testuser",
  "password": "password123"
}
```

**成功响应 (200)：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 2,
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

**错误响应：**
- `400` - 字段缺失
- `401` - 用户名或密码错误
- `429` - 请求过于频繁

---

### GET /auth/me

获取当前登录用户信息。需要认证。

**请求头：** `Authorization: Bearer <token>`

**成功响应 (200)：**

```json
{
  "user": {
    "id": 2,
    "username": "testuser",
    "email": "test@example.com",
    "role": "user",
    "created_at": "2024-01-01 00:00:00"
  }
}
```

**错误响应：**
- `401` - 未提供 Token / Token 无效

---

## GPU 资源

### GET /gpus

获取 GPU 列表。公开接口，无需认证。支持分页和状态筛选。

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码（最小 1） |
| limit | int | 20 | 每页数量（1-100） |
| status | string | | 筛选状态（available / unavailable） |

**成功响应 (200)：**

```json
{
  "gpus": [
    {
      "id": 1,
      "name": "NVIDIA A100",
      "model": "A100 80GB",
      "vram": "80GB HBM2e",
      "compute_power": "312 TFLOPS (FP16)",
      "price_per_hour": 1599,
      "total_units": 10,
      "available_units": 10,
      "status": "available",
      "description": "...",
      "created_at": "2024-01-01 00:00:00"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 6,
  "totalPages": 1
}
```

---

### GET /gpus/:id

获取单个 GPU 详情。公开接口。

**成功响应 (200)：**

```json
{
  "gpu": { ... }
}
```

**错误响应：**
- `404` - GPU 不存在

---

### POST /gpus

添加 GPU。管理员接口。

**请求体：**

```json
{
  "name": "NVIDIA A100",
  "model": "A100 80GB",
  "vram": "80GB HBM2e",
  "compute_power": "312 TFLOPS (FP16)",
  "price_per_hour": 1599,
  "total_units": 10,
  "description": "描述文本"
}
```

**校验规则：**
- `name`、`model`、`vram`、`compute_power`、`price_per_hour` 为必填
- `price_per_hour` 必须 > 0，自动取整为整数（分）
- `total_units` 默认为 1，最小为 1
- `available_units` 自动设为 `total_units`

**成功响应 (200)：**

```json
{
  "id": 7,
  "message": "GPU added successfully"
}
```

**错误响应：**
- `400` - 必填字段缺失 / 价格 ≤ 0
- `401` - 未认证
- `403` - 非管理员
- `500` - 添加失败

---

### PUT /gpus/:id

更新 GPU 信息。管理员接口。支持部分更新：未传字段保留原值。

**请求体：**（所有字段均可选）

```json
{
  "name": "新名称",
  "price_per_hour": 1999,
  "available_units": 5
}
```

**特殊逻辑：**
- `price_per_hour` 必须 > 0，自动取整
- `available_units` 会被限制不超过 `total_units`
- `total_units` 和 `available_units` 均不允许为负

**成功响应 (200)：**

```json
{
  "message": "GPU updated successfully"
}
```

**错误响应：**
- `400` - 价格 ≤ 0
- `401` / `403` - 认证/权限不足
- `404` - GPU 不存在

---

### DELETE /gpus/:id

删除 GPU。管理员接口。有关联订单时禁止删除（应设为 unavailable 替代）。

**成功响应 (200)：**

```json
{
  "message": "GPU deleted successfully"
}
```

**错误响应：**
- `400` - GPU 有关联订单
- `404` - GPU 不存在

---

## 订单

### POST /orders

创建订单。需要认证。

**请求体：**

```json
{
  "gpu_id": 1,
  "hours": 10
}
```

**业务规则：**
- `hours` 范围 1-720
- GPU 必须为 available 且 `available_units > 0`
- 每用户每 GPU 最多 1 个活跃订单（pending / paid / running）
- `total_price = price_per_hour × hours`（整数运算，单位为分）
- 创建时自动扣减 `available_units`

**成功响应 (200)：**

```json
{
  "order_id": 1,
  "total_price": 15990,
  "message": "Order created successfully"
}
```

**错误响应：**
- `400` - 参数无效 / 时长超限 / GPU 不可用 / 已有活跃订单 / 库存不足
- `401` - 未认证
- `404` - GPU 不存在

---

### GET /orders/my

获取当前用户的订单列表。需要认证。支持分页。

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| limit | int | 20 | 每页数量（1-100） |

**成功响应 (200)：**

```json
{
  "orders": [
    {
      "id": 1,
      "user_id": 2,
      "gpu_id": 1,
      "hours": 10,
      "total_price": 15990,
      "status": "pending",
      "created_at": "2024-01-01 00:00:00",
      "updated_at": null,
      "gpu_name": "NVIDIA A100",
      "gpu_model": "A100 80GB"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "totalPages": 1
}
```

---

### GET /orders

获取所有订单。管理员接口。支持分页。额外返回 `username` 字段。

**查询参数：** 同上

**成功响应 (200)：**

```json
{
  "orders": [
    {
      "id": 1,
      "user_id": 2,
      "gpu_id": 1,
      "hours": 10,
      "total_price": 15990,
      "status": "pending",
      "created_at": "2024-01-01 00:00:00",
      "updated_at": null,
      "gpu_name": "NVIDIA A100",
      "gpu_model": "A100 80GB",
      "username": "testuser"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "totalPages": 1
}
```

---

### PUT /orders/:id/status

更新订单状态。管理员接口。仅允许合法状态流转。

**请求体：**

```json
{
  "status": "paid"
}
```

**状态流转规则：**

| 当前状态 | 允许的目标状态 |
|----------|---------------|
| pending | paid, cancelled |
| paid | running, cancelled |
| running | completed |
| completed | （终态） |
| cancelled | （终态） |

**副作用：** 状态变为 `cancelled` 或 `completed` 时，自动归还 GPU 单元（`available_units + 1`，上限为 `total_units`）。同时更新 `updated_at`。

**成功响应 (200)：**

```json
{
  "message": "Order status updated"
}
```

**错误响应：**
- `400` - 无效状态 / 非法流转
- `404` - 订单不存在

---

### PUT /orders/:id/pay

支付订单。需要认证。仅订单所有者可操作。仅 pending 状态可支付。

**成功响应 (200)：**

```json
{
  "message": "Payment successful"
}
```

**错误响应：**
- `400` - 订单非 pending 状态
- `404` - 订单不存在 / 非订单所有者

---

## 用户管理

### GET /users

获取用户列表。管理员接口。支持分页。

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| limit | int | 20 | 每页数量（1-100） |

**成功响应 (200)：**

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@gpurental.com",
      "role": "admin",
      "created_at": "2024-01-01 00:00:00"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 2,
  "totalPages": 1
}
```

---

### PUT /users/:id/role

修改用户角色。管理员接口。

**请求体：**

```json
{
  "role": "admin"
}
```

- `role` 仅允许 `user` 或 `admin`

**成功响应 (200)：**

```json
{
  "message": "User role updated"
}
```

**错误响应：**
- `400` - 无效角色
- `404` - 用户不存在

---

### DELETE /users/:id

删除用户。管理员接口。

**业务规则：**
- 不可删除自己
- 用户有活跃订单（pending / paid / running）时禁止删除
- 删除时会同时删除该用户的所有历史订单（事务保证）

**成功响应 (200)：**

```json
{
  "message": "User deleted"
}
```

**错误响应：**
- `400` - 不能删除自己 / 用户有活跃订单
- `404` - 用户不存在

---

## 统计

### GET /stats

获取仪表盘统计数据。管理员接口。

**成功响应 (200)：**

```json
{
  "stats": {
    "gpus": 6,
    "orders": 10,
    "users": 3,
    "revenue": 159900
  }
}
```

- `revenue`：非取消订单的 `total_price` 之和（单位：分）

---

## 通用错误

| 状态码 | 含义 |
|--------|------|
| 400 | 请求参数错误 / 业务规则冲突 |
| 401 | 未认证（Token 缺失或无效） |
| 403 | 权限不足（需要管理员角色） |
| 404 | 资源不存在 / API 路径不存在 |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |
