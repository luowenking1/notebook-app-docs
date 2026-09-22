# Notebook App — Backend

个人笔记应用的后端 API 服务实现，对应仓库根目录的《需求文档》与《技术文档》。

## 技术栈（当前实现）

- Node.js + TypeScript + Express
- JWT 认证（bcryptjs 哈希密码）
- **数据层**：内存 Repository（`src/db/store.ts`），用于本地开发和测试，无需安装数据库。
  接口设计与技术文档中的 PostgreSQL 表结构保持一致，后续可以直接替换为真实数据库实现，
  不需要改动 `modules/*` 下的业务逻辑代码。
- 测试：Jest + ts-jest + Supertest（单元测试 + 路由级端到端集成测试）

## 已实现的功能

| 模块 | 说明 |
|---|---|
| 账号 (auth) | 注册 / 登录 / JWT 签发与校验 |
| 笔记本 (notebooks) | 创建 / 重命名 / 删除（级联软删除内部笔记） |
| 笔记 (notes) | 创建 / 更新（自动保存）/ 分页列表 / 软删除 / 恢复 / 彻底删除 / 置顶 / 回收站过期清理 |
| 标签 (tags) | 创建 / 重命名 / 删除 / 关联到笔记 |
| 搜索 (search) | 标题+正文全文匹配，带高亮片段，支持按笔记本/标签过滤 |

所有接口都通过 `requireAuth` 中间件校验 JWT，并在业务层校验数据归属（`userId` 匹配），
防止跨用户越权访问 —— 对应需求文档中的多用户数据隔离要求。

## 快速开始

```bash
npm install
npm run dev      # 本地开发，http://localhost:3000
npm test         # 运行全部测试
npm run test:coverage   # 运行测试并生成覆盖率报告
npm run build && npm start   # 编译并以生产模式运行
```

## API 路径一览

详见根目录《技术文档》第 4 节，接口前缀为 `/api/v1`。

## 测试

`tests/` 目录下按功能拆分：

- `auth.service.test.ts` / `auth.routes.test.ts`：注册登录、密码哈希、重复邮箱、错误密码等
- `notebooks.service.test.ts`：笔记本增删改、级联软删除、越权防护
- `notes.service.test.ts`：自动保存、软删除/恢复/彻底删除、置顶排序、回收站过期清理
- `tags.service.test.ts`：标签唯一性、笔记打标签、删除标签级联清理
- `search.service.test.ts`：标题/正文匹配、高亮、按笔记本/标签过滤、用户隔离
- `notes.routes.test.ts`：端到端主流程（笔记本→笔记→标签→搜索→回收站）+ 跨用户越权防护

当前共 51 个测试用例，全部通过。

## 后续待办

- 接入真实 PostgreSQL（替换 `src/db/store.ts`）
- Refresh Token / 密码找回接口
- 图片附件上传
- 前端 React 应用
