# CI/CD 文档

## GitHub Actions

CI 配置位于 `.github/workflows/ci.yml`，在 push 和 PR 到 `main` 分支时自动触发。

### 流水线任务

```
push/PR to main
       │
       ├── server-test    (Node 22, npm ci + npm test)
       │
       ├── client-build   (Node 22, npm install + npm run build)
       │
       └── admin-build    (Node 22, npm install + npm run build)
```

三个任务并行运行，互不依赖。

### server-test

| 步骤 | 命令 | 说明 |
|------|------|------|
| Checkout | `actions/checkout@v4` | 拉取代码 |
| Setup Node | `actions/setup-node@v4` | Node 22，缓存 npm |
| Install | `npm ci` | 根据 lock 文件安装 |
| Test | `npm test` | 运行 Jest 测试 |

环境变量：`JWT_SECRET=ci_test_jwt_secret`

### client-build / admin-build

| 步骤 | 命令 | 说明 |
|------|------|------|
| Checkout | `actions/checkout@v4` | 拉取代码 |
| Setup Node | `actions/setup-node@v4` | Node 22，缓存 npm |
| Install | `npm install --legacy-peer-deps` | 安装依赖 |
| Build | `npm run build` | 构建生产版本 |

使用 `--legacy-peer-deps` 是因为 react-scripts 5 的 peer dependency 声明可能与 React 18 不完全匹配。

### 本地验证

在推送前可本地运行对应的检查：

```bash
# 后端测试
cd server && npm test

# 前端构建
cd client && npm run build

# 管理面板构建
cd admin && npm run build
```
