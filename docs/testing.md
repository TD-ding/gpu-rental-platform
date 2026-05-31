# 测试文档

## 概述

后端使用 **Jest + Supertest** 进行集成测试，测试用内存 SQLite 数据库实现完全隔离。

- 测试文件位于 `server/tests/`
- 共 65 个测试用例，覆盖 5 个路由模块

## 运行测试

```bash
# 在 server 目录下运行
cd server
npm test

# 在项目根目录运行
npm test
```

## 测试架构

### 测试隔离策略

每个测试套件（describe）的 `beforeEach` / `afterEach`：

1. **创建内存数据库**：`new Database(':memory:')`，每次测试独立
2. **Mock 依赖模块**：用 `jest.doMock` 替换 `../src/config/db` 为内存数据库实例
3. **禁用限流**：Mock `rateLimit` 中间件为 passthrough
4. **设置 JWT_SECRET**：通过 `process.env.JWT_SECRET` 注入测试密钥
5. **创建 Express 应用**：手动挂载路由到新的 Express 实例
6. **测试后清理**：关闭数据库、清除模块缓存、删除环境变量

### 测试辅助工具

`server/tests/setup.js` 提供以下辅助函数：

| 函数 | 说明 |
|------|------|
| `createTestDb()` | 创建内存 SQLite 数据库，含完整表结构和外键约束 |
| `seedTestUser(db, role)` | 插入测试用户（密码 `password123`），返回 `{ id, username, role }` |
| `seedTestGpu(db, overrides)` | 插入测试 GPU（默认价格 500 分、10 单元），支持部分覆盖 |
| `seedTestOrder(db, overrides)` | 插入测试订单（默认 pending），支持部分覆盖 |
| `generateToken(user)` | 生成测试 JWT（1 小时有效期） |
| `authHeader(user)` | 返回 `{ Authorization: 'Bearer <token>' }` 请求头 |

常量：
- `TEST_JWT_SECRET = 'test_jwt_secret_for_unit_tests'`

## 测试��盖范围

### auth.test.js（14 个用例）

| 分类 | 用例 |
|------|------|
| 注册 - 成功 | 注册新用户，返回 Token 和用户信息 |
| 注册 - 校验 | 缺少字段、邮箱格式、密码长度、用户名格式、重复用户名、重复邮箱 |
| 登录 - 成功 | 正确凭据登录 |
| 登录 - 失败 | 密码错误、用户不存在、缺少字段 |
| 当前用户 | 携带 Token 获取用户信息、无 Token 拒绝、无效 Token 拒绝 |

### gpus.test.js（18 个用例）

| 分类 | 用例 |
|------|------|
| 列表 | 空列表、分页、状态筛选 |
| 详情 | 获取单个、404 |
| 创建 | 管理员创建成功、未认证拒绝、非管理员拒绝、必填字段、零/负价格 |
| 更新 | 管理员更新成功、���价格拒绝、available_units 上限、404 |
| 删除 | 无订单删除成功、有订单拒绝、404 |

### orders.test.js（16 个用例）

| 分类 | 用例 |
|------|------|
| 创建 | 创建成功、未认证拒绝、无效时长、超最大时长、GPU 不存在、每用户每 GPU 限制、已完成订单可再下单 |
| 我的订单 | 查看订单列表、未认证拒绝 |
| 全部订单 | 管理员查看、非管理员拒绝 |
| 状态变更 | 合法流转、非法流转、无效状态值、取消归还 GPU 单元、归还上限 total_units、404 |
| 支付 | 支付 pending 订单、非 pending 拒绝、他人订单拒绝 |

### users.test.js（8 个用例）

| 分类 | 用例 |
|------|------|
| 列表 | 管理员查看、非管理员拒绝、未认证拒绝 |
| 角色变更 | 修改角色成功、无效角色、404 |
| 删除 | 无订单删除、删除自己拒绝、有活跃订单拒绝、已完成订单可删除 |

### stats.test.js（3 个用例）

| 分类 | 用例 |
|------|------|
| 统计 | 管理员获取统计数据（GPU 数、订单数、用户数、收入）、非管理员拒绝、未认证拒绝 |

## 配置

`server/jest.config.js`：

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,
};
```

运行参数：`--runInBand --forceExit --detectOpenHandles`
- `--runInBand`：串行运行，避免 SQLite 并发冲突
- `--forceExit`：测试完成后强制退出（bcrypt worker 线程可能阻止退出）
- `--detectOpenHandles`：检测未关闭的句柄，帮助发现资源泄漏

## 扩展测试

添加新测试时：

1. 在 `server/tests/` 下创建 `<模块名>.test.js`
2. 引入 `setup.js` 中的辅助函数
3. 在 `beforeEach` 中创建内存数据库并 Mock 依赖
4. 使用 `supertest(request)` 发送 HTTP 请求
5. 运行 `npm test` 验证
