# CRM MVP：Supabase 数据库设置（Mac + Cursor）

这份指南对应 `customerCRM-marketing-new` 项目的 **Java 21 + Spring Boot + Flyway** 后端。

## 第 1 步：新建 Supabase Project

1. 访问 https://supabase.com/dashboard 并登录。
2. 点击 **New project**，选择你自己的 Organization。
3. Project name 填写 `customercrm-marketing`。
4. 选择可用的 Sydney / Australia 区域，设置一个强数据库密码，并安全保存。
5. 项目创建成功后会自带名为 `postgres` 的 PostgreSQL 数据库。**不用在 SQL Editor 手动创建 CRM 表。**

## 第 2 步：复制数据库连接参数

进入新项目，点击顶部的 **Connect**。选择 **Session pooler**（端口 `5432`；支持常见的 IPv4 网络），查看连接参数。

连接参数一般形式：

- Host：你的 `aws-...pooler.supabase.com`（以控制台实际显示为准）
- Database：`postgres`
- User：`postgres.<项目引用 ID>`（以控制台实际显示为准）
- Port：`5432`
- Password：创建项目时设置的 Database Password

⚠️ **不要误用 Project URL**（`https://...supabase.co`），那不是 JDBC 主机。**不要用 anon / publishable / service_role API key 当数据库密码。**

官方参考：https://supabase.com/docs/guides/getting-started/quickstarts/spring-boot

## 第 3 步：在 Cursor 配置密钥

在 Cursor 打开项目根目录，使用终端：

```bash
git pull
cp .env.supabase.example .env.supabase
```

然后在 Cursor 左侧文件列表找到 `.env.supabase`，填写：

```dotenv
DB_URL=jdbc:postgresql://YOUR_POOLER_HOST:5432/postgres?sslmode=require&currentSchema=crm_app
DB_USER=postgres.YOUR_PROJECT_REF
DB_PASSWORD=YOUR_DATABASE_PASSWORD
CRM_ADMIN_USERNAME=admin
CRM_ADMIN_PASSWORD=YOUR_NEW_STRONG_ADMIN_PASSWORD
SMS_MODE=preview
```

**必须保留** `currentSchema=crm_app`。CRM 的客户信息会被创建在不对外开放的 `crm_app` schema，而不是 Supabase 默认 Data API 暴露的 `public` schema。该 schema 会由 Flyway 尝试自动创建。

以上是占位符，不能直接照抄。密码不需要放在 `DB_URL` 中。不要把包含密码的文件上传 GitHub、截图或发送到聊天中。`.env.supabase` 已被 Git 忽略。

## 第 4 步：使用 Supabase 启动 CRM

安装并打开 Docker Desktop，然后在项目根目录执行：

```bash
docker compose --env-file .env.supabase -f docker-compose.supabase.yml up --build
```

仅启动前端和后端两个容器，**不会启动本地 PostgreSQL 容器**。

成功启动后访问 http://localhost:3000，并使用 `CRM_ADMIN_USERNAME` 和 `CRM_ADMIN_PASSWORD` 登录。

Flyway 会在 Supabase 数据库的 `crm_app` schema 创建业务表，包括 `customers`、`tags`、`customer_tags`、`deals`、`activities` 和 `sms_messages`。

在 Supabase 的 SQL Editor 里查看表名（注意 schema 是 `crm_app`）：

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'crm_app' ORDER BY table_name;
```

## 常见问题

- **password authentication failed**：核对 Database Password 和池化用户名 `postgres.<PROJECT_REF>`。
- **UnknownHostException / Connection refused**：核对 Connect 的 Session pooler Host 和 Port。
- **JDBC URL 错误**：必须是 `jdbc:postgresql://HOST:5432/postgres?sslmode=require&currentSchema=crm_app`。
- **Flyway migration failed**：查看 `docker compose --env-file .env.supabase -f docker-compose.supabase.yml logs backend`。请不要随意删除迁移记录。
- **登录失败**：使用 CRM 管理员密码，不是 Supabase 数据库密码。
- **无法打开网页**：检查 Docker Desktop 及 `localhost:3000` 端口。

## 安全说明

这是供开发和授权测试使用的 MVP，尚未完成生产环境安全评估。只使用虚构数据；真实 irelax 客户资料必须获得公司授权。上线前需要进一步完成 HTTPS、权限、安全审查、备份与隐私评估。

短信默认 `SMS_MODE=preview`，不会真正发送。
