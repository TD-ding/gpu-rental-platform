# 协作开发日志 — GPU算力租赁平台

## 项目信息

- **项目名称**: gpu-rental-platform
- **项目类型**: 平台 (Platform)
- **技术栈**: React 18 + Node.js Express + better-sqlite3 + JWT
- **仓库地址**: https://github.com/TD-ding/gpu-rental-platform
- **开发日期**: 2026-05-31

## 迭代记录

### Round 1: feat - 初始版本

**Generator**: 完成项目初始搭建，包含后端（Express + better-sqlite3 + JWT）、前端（React 18 用户端）、管理面板（React 18），全部功能闭环。

**Commit**: `3e66b09` feat: init GPU rental platform with frontend, backend, and admin panel

### Round 2: refactor - 代码质量优化

**Reviewer 反馈摘要**: 后端密码校验缺失、JWT密钥默认值风险、登录无防刷、用户删除不处理关联订单、管理员面板前端不验证角色、token过期不跳转、Orders页面闪烁、提示消息不消失、.env泄露、缺少全局错误处理。

**模糊化后发送给 Generator**: 9项自然语言反馈

**Generator 修复**: 后端密码长度校验、登录限流、JWT_SECRET启动检查、删除用户前检查活跃订单、管理员前端角色验证、401响应拦截器、Orders加载状态、消息3秒自动消失、根目录.gitignore、.env.example、全局错误处理。

**Commit**: `ccb6210` fix: address security, UX, and robustness feedback

### Round 3: feat - 用户体验优化

**Reviewer 反馈摘要**: bcrypt同步阻塞、CORS完全开放、缺少helmet、订单状态无转换校验、金额浮点精度、租赁时长无上限、GPU删除不检查关联、Dashboard全量拉取、列表无分页、admin每次路由验证、CSS重复、RentModal无loading、登录跳转丢上下文、缺updated_at。

**模糊化后发送给 Generator**: 11项自然语言反馈

**Generator 修复**: CORS白名单、bcrypt异步化、订单状态机、金额改为分存储、时长720h上限、GPU删除检查关联、/api/stats统计接口、分页、AdminAuthProvider、RentModal loading状态、updated_at字段。

**Commit**: `c34044b` feat: CORS restriction, async crypto, order flow control, price as cents, pagination, admin auth context

### Round 4: feat - 功能增强

**Reviewer 反馈摘要**: db.js迁移逻辑不可靠、available_units归还超total、PUT全量替换、客户端无分页、formatPrice/STATUS_MAP重复定义、登录跳转不回原页、邮箱格式未校验、用户名无字符限制、无ErrorBoundary、价格计算前端浮点、GPU价格小数位无限制。

**模糊化后发送给 Generator**: 10项自然语言反馈

**Generator 修复**: schema_version版本号迁移、GPU部分更新、available_units上限、客户端分页、format.js共享工具、登录来源页跳转、邮箱校验、用户名字符限制、ErrorBoundary、整数价格计算、价格输入step限制。

**Commit**: `87b7116` feat: schema migrations, partial GPU update, client pagination, shared format utils, input validation

### Round 5: fix - Bug修复

**Reviewer 反馈摘要**: API 404被SPA fallback拦截、外键约束未开启、价格可填0或负数、uncaughtException后继续运行、单用户可占满库存、seed中hashSync、分页响应格式不统一。

**模糊化后发送给 Generator**: 7项自然语言反馈

**Generator 修复**: API路径404返回JSON、外键约束启用、价格≤0校验、schema_version查询修复、每用户每GPU限1活跃订单、异步bcrypt seed、统一分页响应格式、未捕获异常退出进程。

**Commit**: `64e8beb` fix: API 404 JSON response, FK constraints, price validation, migration bug fix, per-GPU order limit, async seed

## 基础设施 (Step 4)

### 单元测试

65个测试用例全部通过：
- auth.test.js: 14 cases（注册校验、登录、/me）
- gpus.test.js: 18 cases（CRUD、分页、价格校验、部分更新）
- orders.test.js: 17 cases（创建、状态流转、支付、每用户限制）
- users.test.js: 9 cases（列表、角色修改、删除保护）
- stats.test.js: 3 cases（统计数据）

**Commit**: `0647592` feat: add unit tests, Docker config, and GitHub Actions CI

### Docker

- server/Dockerfile: 多阶段构建
- client/Dockerfile + nginx.conf: React build → nginx 服务
- admin/Dockerfile + nginx.conf: React build → nginx 服务
- docker-compose.yml: 三服务编排 + 数据库持久化

### CI

- .github/workflows/ci.yml: 服务端测试 + 前端构建验证

## 文档 (Step 5)

6份详细文档：
- docs/architecture.md — 架构设计
- docs/api.md — API接口文档
- docs/deployment.md — 部署指南
- docs/testing.md — 测试文档
- docs/frontend.md — 前端开发文档
- docs/ci.md — CI/CD文档

**Commit**: `03e5fe8` docs: add project documentation and update README

## 参与会话

- **Main Session**: 协调、模糊化反馈、PR管理
- **Generator Session** (codeing-superpowers): ctx_eff668ad-1577-4dc6-a917-5594ee1e8eec
- **Reviewer Session** (codeing-superpowers): ctx_4218abf3-cf9e-4bba-98dd-24607a6b47b5
