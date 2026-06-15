---
name: fitness-architecture
description: Use this skill when working on the fitness tracker website requirements, technical architecture, database design, Supabase Auth, RLS, React Vite TypeScript frontend structure, or MVP planning. Do not use this skill for unrelated projects.
---

# Fitness Architecture Skill

## 目标

用于控制 Codex 在“每日健身记录网站”项目中输出稳定、可执行、可验证的架构设计和开发步骤。

## 适用场景

当任务涉及以下内容时，必须使用本 Skill：

1. 每日健身记录网站需求分析。
2. React + Vite + TypeScript 项目结构设计。
3. Supabase Auth 登录注册设计。
4. Supabase PostgreSQL 数据表设计。
5. Row Level Security 权限隔离设计。
6. 力量训练、有氧、饮食模块拆分。
7. MVP 开发顺序规划。
8. 项目文档生成。

## 禁止场景

以下任务不得使用本 Skill：

1. 非健身记录项目。
2. 普通闲聊。
3. 无关算法题。
4. 无关嵌入式项目。
5. 无关 PCB 项目。
6. 无关图片生成任务。

## 固定技术栈

1. 前端：React + Vite + TypeScript。
2. 样式：Tailwind CSS。
3. 后端：Supabase。
4. 认证：Supabase Auth。
5. 数据库：Supabase PostgreSQL。
6. 部署：Vercel。
7. 代码管理：Git + GitHub。

## 认证设计规则

1. 禁止自建 users 密码表。
2. 禁止在业务表保存 password_hash。
3. 用户账号必须由 Supabase Auth 管理。
4. 业务表通过 user_id 关联 auth.users.id。
5. 所有业务表必须开启 Row Level Security。
6. 用户只能访问 user_id = auth.uid() 的数据。

## 数据库设计规则

业务表必须优先包含：

1. profiles
2. strength_exercises
3. strength_workout_sessions
4. strength_workout_exercises
5. strength_workout_sets
6. cardio_records
7. foods
8. meal_records
9. meal_items
10. user_preferences

每张业务表必须包含：

1. id
2. user_id
3. created_at
4. updated_at

## 文档输出规则

输出文档时必须包含：

1. 当前阶段目标。
2. 目录结构。
3. 页面路由。
4. 数据表。
5. 权限策略。
6. 开发顺序。
7. 验收标准。
8. 风险与修复方式。

## 代码生成规则

没有明确要求写代码时，禁止创建或修改代码文件。

允许修改的文档目录：

1. docs/

禁止随意修改：

1. package.json
2. src/
3. .env
4. 数据库 SQL 文件

## 输出格式

每次输出必须包含：

1. 修改了哪些文件。
2. 每个文件改了什么。
3. 下一步命令。
4. 验收标准。
5. 失败后的修复方式。