# CRM MVP：Supabase 数据库设置（Mac + Cursor）

这份指南对应 `customerCRM-marketing-new` 项目现有的 **Java 21 + Spring Boot + Flyway** 后端。

## 第 1 步：新建 Supabase Project

1. 访问 https://supabase.com/dashboard 并登录。
2. 点击 **New project**，选择你自己的 Organization。
3. Project name 填写 `customercrm-marketing`。
4. 选择可用的 Sydney / Australia 区域，自己设置一个强数据库密码，并安全保存。
5. 项目创建成功后会自带名为 `postgres` 的 PostgreSQL 数据库。**不用在 SQL Editor 手动创建 CRM 表。**

## 第 2 步：复制数据库连接参数

进入新项目，点击顶部的 **Connect**。选择 **Session pooler**（端口 `5432`；与常见的 IPv4 网络兼容），找到连接参数。

一般形式：

- Host：你的 `aws-...pooler.supabase.com`（以控制台显示的实际值为准）
- Database：`postgres`
- User：`postgres.<你的项目引用ID>`（以控制台显示的实际值为准）
- Port：`5432`
- Password：创建项目时设置的 Database Password

⚠️ **不要误用 Project URL**（`https://...supabase.co`），那不是 JDBC 主机。**也不要使用 anon/publishable 或 service_role API key 作为数据库密码。**

参考：https://supabase.com/docs/guides/getting-started/quickstarts/spring-boot

## 第 3 步：在 Cursor 配置密钥

在 Cursor 内打开项目根目录，使用终端：

```bash
git pull
cp .env.supabase.example .env.supabase
```

然后在 Cursor 左侧文件列表找到 `.env.supabase`，改为你自己的配置：

```dotenv
DB_URL=jdbc:postgresql://<实际POOLER_HOST>:5432/postgres?sslmode=require
DB_USER=postgres.<实际PROJECT_REF>
DB_PASSWORD=<你的数据库密码>
CRM_ADMIN_USERNAME=admin
CRM_ADMIN_PASSWORD=<新的强管理员密码，至少12位>
SMS_MODE=preview
```

以上 `<...>` 是示意占位符，不能照抄。注意密码不需要放在 `DB_URL` 中。不要把包含密码的文件上传 GitHub、截图或发送到聊天中。`.env.supabase` 已由 `.gitignore` 保护。

## 第 4 步：使用 Supabase 启动 CRM

安装并打开 Docker Desktop，确保服务运行，然后在项目根目录执行：

```bash
docker compose --env-file .env.supabase -f docker-compose.supabase.yml up --build
```

这个配置只启动前端和后端两个容器，**不会启动本地 PostgreSQL 容器**。

成功启动后，打开 http://localhost:3000，使用 `CRM_ADMIN_USERNAME` 和 `CRM_ADMIN_PASSWORD` 登录。

后端的 **Flyway** 会在 Supabase 数据库中运行项目的 SQL 迁移，创建 `customers`、`tags`、`customer_tags`、`deals`、`activities` 和 `sms_messages`。

回 Supabase 的 **Table Editor** 或 SQL Editor 就能看到这些表。例如仅检查表名：

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```

## 排错

- **password authentication failed**：核对 Database Password 和池化用户名 `postgres.<PROJECT_REF>`，不是 Supabase 登录密码。
- **UnknownHostException / Connection refused**：核对 Connect 页面显示的 Session pooler Host/Port，不要把 `https://` 写进 JDBC URL。
- **No suitable driver / JDBC URL 错误**：应为 `jdbc:postgresql://HOST:5432/postgres?sslmode=require`。
- **Flyway migration failed**：查看 `docker compose --env-file .env.supabase -f docker-compose.supabase.yml logs backend`。不要在已含数据的数据库上随意清空 Flyway 历史表。
- **登录被拒绝**：使用 CRM 管理员密码，而不是 Supabase 数据库密码。
- **本地无法打开网页**：检查 Docker Desktop 是否运行，以及 `localhost:3000` 是否已被其他程序占用。

## 安全须知

本系统当前仅适合开发与授权测试。请只用虚构客户资料。真实 irelax 客户数据需取得公司授权，并在正式应用前做好网络、访问控制、隐私、加密和备份评估。

短信始终默认为 `SMS_MODE=preview`，不会真实发送。
