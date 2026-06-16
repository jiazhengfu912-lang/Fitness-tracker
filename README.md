# Fitness Tracker

## 项目简介

`Fitness Tracker` 是一个面向个人长期使用的健身记录网站，用于持续记录训练、饮食和体重数据，并基于历史数据进行回看和基础统计。

当前版本支持：

1. 注册登录
2. 每日训练记录
3. 力量动作和训练组
4. 有氧记录
5. 饮食餐次和食物明细
6. 体重记录
7. 历史记录
8. 基础统计

## 技术栈

- React
- Vite
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security
- Git + GitHub

## 已实现功能

### 1. 用户系统

- 注册
- 登录
- 退出
- 登录态保护

### 2. 今日记录

- 创建训练会话
- 创建有氧记录
- 创建饮食餐次

### 3. 力量训练

- 训练会话
- 动作记录
- 训练组记录
- 重量
- 次数
- 热身组
- 删除同步 Supabase

### 4. 有氧训练

- 类型
- 时长
- 距离
- 消耗热量
- 强度
- 备注

### 5. 饮食记录

- 餐次
- 食物名称
- 摄入克数
- 热量
- 蛋白质
- 碳水
- 脂肪

### 6. 体重记录

- 日期
- 体重
- 体脂率
- 腰围
- 备注
- 同一天记录更新而不是重复插入

### 7. 历史记录

- 按日期查看训练、有氧、饮食数据

### 8. 基础统计

- 最近 7 天
- 最近 30 天
- 力量训练统计
- 有氧统计
- 饮食统计

## 项目目录结构

```text
fitness-tracker
├─ docs
├─ supabase
│  └─ sql
├─ frontend
│  ├─ src
│  │  ├─ components
│  │  ├─ lib
│  │  ├─ pages
│  │  ├─ routes
│  │  └─ types
└─ .agents
```

## 本地运行方式

```bash
cd frontend
npm install
npm run dev
```

## 环境变量配置

需要在本地创建：

`frontend/.env.local`

内容模板：

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

注意事项：

1. 不要提交 `.env.local`
2. 不要使用 `service_role` key
3. 不要把 secret key 放进前端
4. 不要把 Supabase 密钥写进 README

## Supabase 配置

1. 创建 Supabase 项目
2. 获取 `Project URL`
3. 获取 `publishable key / anon public key`
4. 执行 `supabase/sql/001_init_schema.sql`
5. 执行 `supabase/sql/002_add_body_metrics.sql`
6. 确认 `Authentication -> Users` 可注册用户
7. 确认 `Table Editor` 中存在业务表
8. 确认 RLS 已开启

说明：

- 前端只使用 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
- 不要在前端使用 `service_role` key
- `body_metrics` 相关迁移需要单独执行体重记录扩展脚本

## 数据库表

- `profiles`
- `user_preferences`
- `strength_exercises`
- `strength_workout_sessions`
- `strength_workout_exercises`
- `strength_workout_sets`
- `cardio_records`
- `foods`
- `meal_records`
- `meal_items`
- `body_metrics`

## 页面路由

- `/`
- `/today`
- `/workouts/:sessionId`
- `/meals/:mealRecordId`
- `/weight`
- `/stats`
- `/history`
- `/login`
- `/register`

## 开发规范

1. 每次开发前先 `git status`
2. 每次修改后执行 `npm run build`
3. 不提交 `.env.local`
4. 不提交密钥
5. 不直接修改生产数据库
6. 不绕过 Supabase RLS
7. 每个阶段完成后 `git commit` 并 `push`

## 后续计划

1. 部署到 Vercel
2. 数据导出
3. 食物库复用
4. 训练模板
5. 图表趋势
6. 目标管理
7. 移动端体验优化
8. README 中补充线上访问地址
