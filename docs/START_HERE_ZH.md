# SYMPHORA CRM MVP — 中文启动与使用指南

## 1. 本地运行（Mac）
这是一个已经提交到 GitHub 的完整代码项目，需要在你自己的电脑启动；当前并没有部署公开网站。

1. 安装 **Docker Desktop**，确认 Docker Engine 正常运行。
2. 打开终端，运行：

   ```bash
   git clone https://github.com/NiaFu/customerCRM-marketing-new.git
   cd customerCRM-marketing-new
   cp .env.example .env
   ```

3. 用 Cursor 打开当前文件夹，编辑根目录的 `.env`，**务必替换** `DB_PASSWORD` 与 `CRM_ADMIN_PASSWORD`。管理员密码至少 12 位，不能保留 `CHANGE_ME`。
4. 运行：

   ```bash
   docker compose up --build
   ```

5. 浏览器访问 **http://localhost:3000**。用户名和密码使用 `.env` 里的 `CRM_ADMIN_USERNAME` / `CRM_ADMIN_PASSWORD`。

停止服务：在终端按 `Ctrl+C`，或另一个终端执行 `docker compose down`。数据储存在 Docker 的 Postgres volume 中。**不要运行 `docker compose down -v`，除非确认要删除所有本地数据。**

## 2. 按照这个顺序体验功能

1. **Customers** → Add customer：添加虚构客户，输入澳洲手机号码。系统会把 `04...` 转为 `+614...`；重复号码会报错。
2. **Customer tags**：先使用系统默认标签，也可以创建新的标签（例如“ROBO Interested”）。
3. 打开客户详情，在 **Customer tags** 点击标签，为客户添加一个或多个分类。
4. **Sales pipeline** → New opportunity：选择客户，输入产品、报价和下次跟进日期。新建后使用卡片下拉菜单修改成交阶段。
5. 再进入客户详情 → **Manual SMS**：填写消息，点击 **Save SMS preview**。系统只会记录一条 `PREVIEW`，**不会真的发送**。
6. 如果选择 **Marketing**，只有正确记录客户的明确营销同意且没有退订，才可继续操作。服务/配送类消息必须如实选择 `SERVICE`，不能借此发送营销信息。

## 3. 开启真实短信前的工作

- 注册并测试 ClickSend 账户；核对号码格式、发送者标识及澳洲相关法律要求。
- 把 `.env` 的 `SMS_MODE` 改为 `clicksend`，设置 `CLICKSEND_USERNAME`、`CLICKSEND_API_KEY`、`SMS_FROM`。
- 使用**自己持有的测试号码**进行首次发送；确认费用及 ClickSend 后台状态。
- 本 MVP 暂未实现完整的双向短信收件箱、自动退订处理、投递回执同步。真实营销需要人工处理退订，不能把 `QUEUED` 当成 `DELIVERED`。

## 4. 代码目录

- `backend/`：Spring Boot REST API、数据库、短信服务
- `backend/src/main/resources/db/migration/`：Flyway 数据库结构
- `frontend/src/App.tsx`：主要 Web 页面
- `frontend/src/api.ts`：浏览器 API 请求封装
- `frontend/src/styles.css`：界面样式
- `docker-compose.yml`：本地三个容器（数据库、后端、前端）
- `.github/workflows/ci.yml`：自动检查（Java、React、PostgreSQL API 冒烟测试）

## 5. 首版边界

这是一个用于研发及本地试用的 MVP，不是经过生产级安全审查的 SaaS 平台。

- 目前只有一个管理员账号，未实现独立员工账号。
- 暂无 CSV 导入导出、自动群发、定时营销、AI、双向回复、完整审计日志、备份恢复自动化。
- 系统目前只绑定到本地 `127.0.0.1:3000`，并非公网服务。
- 在取得公司授权、完成 HTTPS/权限/备份/隐私评估之前，**不要导入真实 irelax 客户数据**。
