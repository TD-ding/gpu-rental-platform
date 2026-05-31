# 部署指南

## 本地开发

### 前提条件

- Node.js >= 18
- npm >= 8

### 安装与启动

```bash
# 1. 安装全部依赖
npm run install:all

# 2. 配置环境变量
cd server
cp .env.example .env
# 编辑 .env，必须修改 JWT_SECRET
cd ..

# 3. 启动后端（开发模式，nodemon 热重载）
cd server
npm run dev

# 4. 启动用户前端（另开终端）
cd client
npm start

# 5. 启动管理员面板（另开终端）
cd admin
npm start
```

### 端口分配

| 服务 | 默认端口 |
|------|----------|
| 后端 API | 5000 |
| 用户前端 | 3000 |
| 管理员面板 | 3001 |

### 环境变量

配置文件位于 `server/.env`，模板见 `server/.env.example`：

| 变量 | 说明 | 默认值 | 必填 |
|------|------|--------|------|
| PORT | 服务端口 | 5000 | 否 |
| JWT_SECRET | JWT 签名密钥 | 无 | **是** |
| DB_PATH | SQLite 数据库路径 | ./data/gpu_rental.db | 否 |
| ALLOWED_ORIGINS | CORS 允许的来源（逗号分隔） | http://localhost:3000,http://localhost:3001 | 否 |

**注意**：服务启动时会检查 `JWT_SECRET`，如果未设置或使用默认占位值将拒绝启动。

### 默认账号

首次启动自动创建管理员账号：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

> 生产环境请务必修改默认密码。

---

## Docker 部署

### 前提条件

- Docker >= 20
- Docker Compose >= 2.0

### 一键部署

```bash
# 构建并启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f server

# 停止
docker compose down

# 停止并清除数据卷
docker compose down -v
```

### 服务架构

```
                    ┌──────────────────────────┐
                    │      Docker Network       │
                    │                          │
  :3000 ──→  client (nginx)  ──┐              │
                              │              │
  :3001 ──→  admin (nginx)  ──┤  /api/*      │
                              │  ──────→     │
  :5000 ──→  server (node)  ←─┘              │
              │                               │
              └── db-data volume              │
                  (/app/data/gpu_rental.db)   │
                    └──────────────────────────┘
```

- **client** 和 **admin** 容器使用 Nginx 托管静态文件，并将 `/api/*` 请求代理到 server
- **server** 容器使用 Node.js 运行后端，SQLite 数据持久化到 Docker volume
- 默认 `JWT_SECRET` 为 `gpu_rental_docker_secret_change_me`，**生产环境必须修改**

### 自定义配置

```bash
# 修改 JWT_SECRET
JWT_SECRET=your_secure_random_string docker compose up -d

# 或创建 .env 文件
echo "JWT_SECRET=your_secure_random_string" > .env
docker compose up -d
```

### Dockerfile 说明

每个服务有独立的 Dockerfile：

| 服务 | Dockerfile | 构建策略 |
|------|-----------|----------|
| server | `server/Dockerfile` | 三阶段：构建 client → 构建 admin → 最终镜像（含两个前端产物） |
| client | `client/Dockerfile` | 两阶段：Node 构建 → Nginx 托管 |
| admin | `admin/Dockerfile` | 两阶段：Node 构建 → Nginx 托管 |

Nginx 配置（`client/nginx.conf` 和 `admin/nginx.conf`）：
- `/api/*` 反向代理到 `http://server:5000`
- 其他路径 `try_files` + SPA fallback

---

## 生产部署注意事项

### 安全

1. **必须修改 JWT_SECRET**：使用强随机字符串（至少 32 位）
2. **修改默认管理员密码**：首次登录后立即修改
3. **配置 ALLOWED_ORIGINS**：仅允许实际域名
4. **启用 HTTPS**：在 Nginx 前增加反向代理（如 Caddy / Nginx 主机）配置 TLS 证书
5. **限制数据库文件权限**：确保 `gpu_rental.db` 仅服务进程可读写

### 性能

- SQLite WAL 模式已启用，支持并发读取
- 所有列表接口支持分页，默认每页 20 条，最大 100 条
- 如需更高并发，可迁移至 PostgreSQL（需替换 better-sqlite3）

### 数据备份

```bash
# 备份 SQLite 数据库
cp server/data/gpu_rental.db backup/gpu_rental_$(date +%Y%m%d).db

# Docker 环境
docker compose exec server sqlite3 /app/data/gpu_rental.db ".backup /app/data/backup.db"
```

### 监控

- 后端进程有 `uncaughtException` 和 `unhandledRejection` 处理，异常时自动退出
- Docker `restart: unless-stopped` 策略会自动重启崩溃的容器
- 建议配合外部监控（如 Prometheus + Grafana）跟踪服务健康状态
