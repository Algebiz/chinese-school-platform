# CLAUDE.md — 中文学校注册管理平台

## 项目概述

这是一个面向华人社区中文学校的年度注册管理系统。每年开学前，家长通过此平台为子女报名中文班和才艺班，完成在线支付。学校招生人员可通过管理后台监控报名情况并进行班次调整。

## 核心业务规则（非常重要）

### 注册规则
- 每个学生每学年**必须选1个中文班**（按年龄/年级分级）
- 才艺班**可选0个或多个**
- **同一学生不能选时间冲突的班级**（无论中文班还是才艺班）
- 每个班级有容量上限（capacity），超出后只能进入候补名单
- 一个家庭账号可以管理**多个学生**（兄弟姐妹）

### 支付规则
- 注册费用 = 中文班费用 + 所有才艺班费用之和
- 支持两种支付方式：Stripe（信用卡）和 PayPal
- 支付成功前，注册状态为 PENDING，支付成功后变为 CONFIRMED
- 管理员可免除特定学生的部分费用（在数据库直接操作，暂不做UI）

### 候补名单规则
- 满班时，学生自动进入该班的候补名单（Waitlist）
- 候补名单按加入时间排序（先来先得）
- 当有人退出时，系统自动给候补名单第一位发送通知邮件
- 管理员可手动将候补名单成员升级为正式注册

### 班级调整规则
- 只有 ADMIN 角色可以调整学生班级
- 调整时必须记录原因（系统审计用）
- 调整后必须发送邮件通知家长
- 调整需要考虑目标班级容量

## 数据库 Schema 概览

```
Family (家庭账号)
  ├── User (通过 NextAuth 管理登录)
  └── Students[] (该家庭的所有学生)
        └── Enrollments[] (每个学生的注册记录)
              ├── Class (报名的班级)
              └── Payment (支付记录)

Class (班级)
  ├── Teacher (老师)
  ├── ClassType: CHINESE | ARTS
  ├── Schedule (上课时间，JSON格式)
  └── Waitlists[] (候补名单)
```

## 项目目录结构

```
src/
├── app/
│   ├── (auth)/          # 公开页面：登录、注册
│   ├── (portal)/        # 家长门户（需要登录）
│   │   ├── dashboard/   # 家长仪表盘
│   │   ├── classes/     # 班级浏览
│   │   ├── enroll/      # 报名流程
│   │   ├── checkout/    # 支付页面
│   │   └── profile/     # 家庭信息管理
│   ├── (admin)/         # 管理后台（需要 ADMIN 角色）
│   │   ├── admin/
│   │   │   ├── page.tsx         # 仪表盘
│   │   │   ├── classes/         # 班级管理
│   │   │   ├── students/        # 学生搜索
│   │   │   ├── waitlist/        # 候补名单
│   │   │   └── export/          # 数据导出
│   └── api/
│       ├── auth/        # NextAuth routes
│       ├── classes/     # 班级相关 API
│       ├── enrollments/ # 注册相关 API
│       ├── payments/
│       │   ├── stripe/  # Stripe webhook & intent
│       │   └── paypal/  # PayPal order & capture
│       ├── admin/       # 管理员专用 API
│       └── webflow/     # Webflow 同步 API
├── components/
│   ├── ui/             # 基础 UI 组件
│   ├── forms/          # 表单组件
│   ├── admin/          # 管理后台组件
│   └── payment/        # 支付组件
├── lib/
│   ├── auth.ts         # NextAuth 配置
│   ├── db.ts           # Prisma client 单例
│   ├── stripe.ts       # Stripe 初始化
│   ├── paypal.ts       # PayPal API 封装
│   ├── email.ts        # Resend 邮件函数
│   ├── webflow.ts      # Webflow API 封装
│   └── enrollment-logic.ts  # 核心业务逻辑
├── emails/             # React Email 模板
└── types/              # TypeScript 类型定义
```

## 技术约定

### API 响应格式
所有 API 统一使用以下格式：
```typescript
// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: "错误描述", code: "ERROR_CODE" }
```

### 错误码约定
- `CAPACITY_FULL` — 班级已满
- `TIME_CONFLICT` — 时间冲突
- `ALREADY_ENROLLED` — 该学生已报名该班
- `PAYMENT_FAILED` — 支付失败
- `UNAUTHORIZED` — 未登录
- `FORBIDDEN` — 无权限（非管理员）

### 数据库操作
- 始终通过 `src/lib/db.ts` 导入 Prisma client（单例模式）
- 涉及多表写入的操作必须使用 `prisma.$transaction()`
- 查询时注意 N+1 问题，合理使用 `include`

### 身份验证
- 使用 `getServerSession()` 在服务端获取 session
- API route 中必须验证 session，未登录返回 401
- 管理员 API 额外验证 `session.user.role === 'ADMIN'`

### 语言
- 用户界面：中文为主，英文为辅
- 代码注释：中文或英文均可
- API 错误信息：英文（方便 debug）
- 用户看到的错误提示：中文

## 环境变量说明

```env
# 数据库
DATABASE_URL=             # Supabase PostgreSQL 连接字符串

# 认证
NEXTAUTH_SECRET=          # 随机字符串，用于加密 session
NEXTAUTH_URL=             # 生产环境为 https://your-domain.com

# Stripe
STRIPE_SECRET_KEY=        # sk_live_xxx 或 sk_test_xxx
STRIPE_WEBHOOK_SECRET=    # whsec_xxx (从 Stripe Dashboard 获取)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # pk_live_xxx 或 pk_test_xxx

# PayPal
PAYPAL_CLIENT_ID=         # 从 PayPal Developer Dashboard 获取
PAYPAL_CLIENT_SECRET=     # 同上
NEXT_PUBLIC_PAYPAL_CLIENT_ID=  # 同 PAYPAL_CLIENT_ID（客户端用）

# 邮件
RESEND_API_KEY=           # re_xxx (从 resend.com 获取)
EMAIL_FROM=               # noreply@your-school-domain.com

# Webflow
WEBFLOW_API_TOKEN=        # 从 Webflow Account Settings 获取
WEBFLOW_SITE_ID=          # 从 Webflow 项目设置获取
WEBFLOW_API_KEY=          # 自定义密钥，用于保护 /api/webflow/* 端点
```

## 当前开发状态

- [ ] 项目初始化
- [ ] 数据库 Schema
- [ ] 用户认证（注册/登录）
- [ ] 班级展示
- [ ] 选课流程
- [ ] Stripe 支付
- [ ] PayPal 支付
- [ ] 邮件通知
- [ ] 管理后台 - 仪表盘
- [ ] 管理后台 - 班级调整
- [ ] 管理后台 - 候补名单
- [ ] 数据导出
- [ ] Webflow 同步
- [ ] 测试
- [ ] 部署

## 学校信息（占位符，开发时使用）

- 学校名称：XX中文学校 / XX Chinese School
- 联系邮箱：info@school.com
- 联系电话：(XXX) XXX-XXXX
- 注册年度：2025-2026 学年
