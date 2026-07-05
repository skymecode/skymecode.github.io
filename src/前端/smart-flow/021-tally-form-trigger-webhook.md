---
title: "Smart Flow 021：Tally 表单触发 Webhook"
icon: "wpforms"
date: 2026-07-04
category:
  - "前端"
tag:
  - "Smart Flow"
  - "Workflow"
  - "Tally"
  - "Webhook"
star: true
---

# 021: Tally 表单触发 Webhook

提交：`3cb8965 021:tally表单触发webhook`

对比基准：`aa6b003 020:实时状态显示`

本文写于 2026-07-04。这个提交的核心是把 Tally 表单接入 workflow，让一次外部表单提交可以自动触发一次工作流执行。

本文重点从前端角度解释：

- 用户在画布里如何添加 Tally 表单触发器
- 前端如何展示 webhook 配置入口
- Tally 提交的数据如何变成 workflow context
- HTTP Request 节点如何消费 Tally 字段
- 为什么要改 HTTP Request 的 URL 校验

参考：

- Tally Webhooks 官方文档：https://tally.so/help/webhooks

## 这个提交解决的问题

020 提交已经实现了节点执行状态的实时显示，但 workflow 的启动方式仍然主要依赖用户在编辑器里点击“开始执行”。

021 提交补上了一个外部触发入口：

```txt
Tally 表单提交
  -> Tally 调用 Nodebase webhook
  -> Nodebase 解析表单 payload
  -> 发送 Inngest event
  -> workflow 开始执行
  -> Tally 表单数据进入 context
  -> 后续节点通过 {{tally.xxx}} 使用这些数据
```

这意味着 Tally 表单不只是一个展示页面，而是 workflow 的输入界面。

用户可以用 Tally 收集：

- URL
- 邮箱
- 姓名
- 工单内容
- 审批信息
- 任意表单字段

然后后续节点可以用这些字段继续发 HTTP 请求、调用 AI、通知系统或写入数据库。

## 前端视角下的整体体验

从用户角度看，这个功能由三个前端行为组成。

第一步，在节点选择器里添加 Tally 触发器：

```txt
Node Selector
  -> Trigger Nodes
  -> Tally Form
```

第二步，双击或点击设置按钮打开 Tally 节点弹窗：

```txt
Tally 表单节点
  -> 打开配置弹窗
  -> 复制 Webhook URL
```

第三步，把 URL 配置到 Tally 后，在后续 HTTP Request 节点里使用表单字段：

```txt
{{tally.answersByLabel.url}}
```

例如 Tally 表单里有一个 label 为 `url` 的输入框，用户提交：

```txt
https://postman-echo.com/get
```

HTTP Request 节点的 Endpoint 就可以写：

```txt
{{tally.answersByLabel.url}}
```

执行时会被渲染成：

```txt
https://postman-echo.com/get
```

## 用户界面入口

### 1. 节点选择器增加 Tally Form

文件：

- `src/components/node-selector.tsx`

021 在 `triggerNodes` 里新增了 Tally 表单触发器：

```ts
{
  type: NodeType.TALLY_FORM_TRIGGER,
  label: "Tally Form",
  description: "Runs the flow when a Google Form is submitted",
  icon: "/images/googleform.svg",
}
```

前端意义：

Tally 表单被当成一种 trigger node，而不是普通 execution node。

这个分类很重要，因为 workflow 的第一步通常不是“做某件事”，而是“什么时候开始做”。Tally 表单触发器表达的就是：

> 当表单提交时，开始执行这个 workflow。

当前 description 里还写着 Google Form，这是历史文案残留，后续可以改成：

```txt
Runs the flow when a Tally form is submitted
```

### 2. React Flow 注册 Tally 节点组件

文件：

- `src/app/config/initial-node.tsx`

新增注册：

```ts
[NodeType.TALLY_FORM_TRIGGER]: TallyTriggerNode
```

React Flow 依赖这个映射决定某个 node type 应该渲染成哪个 React 组件。

如果只在 Prisma 里加了 `TALLY_FORM_TRIGGER`，但没有在这里注册，结果是：

```txt
数据库知道这个节点类型
但画布不知道怎么显示它
```

所以从前端角度看，`initial-node.tsx` 是后端节点类型和画布组件之间的桥。

### 3. Prisma NodeType 增加 Tally 类型

文件：

- `prisma/schema.prisma`
- `prisma/migrations/20260703190333_form_trigger/migration.sql`

新增 enum：

```prisma
enum NodeType {
  INITIAL
  MANUAL_TRIGGER
  HTTP_REQUEST
  TALLY_FORM_TRIGGER
}
```

前端为什么要关心这个？

因为 React Flow 的 node type 最终会保存到数据库：

```ts
type: selection.type
```

如果数据库 enum 不支持 `TALLY_FORM_TRIGGER`，前端即使能创建节点，保存 workflow 时也会失败。

## Tally 节点组件

文件：

- `src/app/features/trigger/components/tally-trigger/node.tsx`

Tally 节点组件做三件事：

1. 订阅当前节点的执行状态
2. 渲染一个触发器节点 UI
3. 打开 Tally webhook 配置弹窗

核心结构：

```tsx
export const TallyTriggerNode = memo((props: NodeProps) => {
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: TALLY_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchTallyTriggerRealtimeToken,
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <BaseTriggerNode
        {...props}
        icon="/images/googleform.svg"
        name="Tally表单"
        description="当表单提交时触发"
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
      <ManualTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
});
```

这里虽然导入名叫 `ManualTriggerDialog`，但实际文件已经是 Tally webhook 弹窗。这是一个命名遗留问题，不影响功能，但后续应该重命名为 `TallyTriggerDialog`，这样代码语义会更清楚。

## Tally Webhook 弹窗

文件：

- `src/app/features/trigger/components/tally-trigger/dialog.tsx`

这个弹窗是前端体验的重点。

它不需要用户填写复杂配置，只做一件事：

> 给用户一个可以复制到 Tally 后台的 Webhook URL。

### 生成 workflow 级别的 webhook URL

弹窗用 `useParams` 从当前编辑页路由里拿 `workflowId`：

```ts
const params = useParams<{ workflowId?: string | string[] }>();

const workflowId = Array.isArray(params.workflowId)
  ? params.workflowId[0]
  : params.workflowId;
```

然后拼出路径：

```ts
const webhookPath = workflowId
  ? `/api/webhooks/tally/${workflowId}`
  : "/api/webhooks/tally/[workflowId]";
```

最后加上当前 ngrok 外网域名：

```ts
const TALLY_WEBHOOK_ORIGIN = "https://till-hatchery-semantic.ngrok-free.dev";

const webhookUrl = `${TALLY_WEBHOOK_ORIGIN}${webhookPath}`;
```

最终用户看到的是：

```txt
https://till-hatchery-semantic.ngrok-free.dev/api/webhooks/tally/{workflowId}
```

### 为什么 URL 里放 workflowId

Tally 调用 webhook 时，是外部匿名请求，它没有登录态，也不会知道当前用户正在编辑哪个 workflow。

所以 URL 必须携带 workflowId：

```txt
/api/webhooks/tally/{workflowId}
```

这样服务端收到请求后才能知道：

```txt
这次表单提交应该触发哪个 workflow
```

### 前端弹窗负责降低配置成本

弹窗里还提供了复制按钮：

```tsx
<Button
  type="button"
  variant="outline"
  size="icon"
  onClick={handleCopyWebhookUrl}
  aria-label="复制 Tally Webhook URL"
>
  {copied ? <CheckIcon /> : <ClipboardIcon />}
</Button>
```

这个细节对前端体验很重要。

Webhook URL 较长，用户手动选中复制容易出错。复制按钮能让配置动作变成：

```txt
打开弹窗 -> 点击复制 -> 粘贴到 Tally
```

## Webhook 路由设计

文件：

- `src/app/api/webhooks/tally/[workflowId]/route.ts`
- `src/app/api/webhooks/tally/route.ts`
- `src/app/api/webhooks/tally/handle-tally-webhook.ts`

### 主要入口

Tally 弹窗生成的主入口是动态路由：

```txt
POST /api/webhooks/tally/{workflowId}
```

对应文件：

```txt
src/app/api/webhooks/tally/[workflowId]/route.ts
```

代码逻辑：

```ts
export async function POST(
  request: NextRequest,
  context: TallyWebhookRouteContext,
) {
  const { workflowId } = await context.params;

  return handleTallyWebhook(request, workflowId);
}
```

### 兼容入口

同时保留了 query 参数形式：

```txt
POST /api/webhooks/tally?workflowId={workflowId}
```

对应文件：

```txt
src/app/api/webhooks/tally/route.ts
```

这个入口不是前端弹窗主推的方式，但保留它有两个好处：

1. 本地测试更方便
2. 兼容之前错误实现里的 query 参数设计

## 按 Tally 官方 payload 接收数据

Tally 官方 webhook 的核心结构是：

```json
{
  "eventId": "...",
  "eventType": "FORM_RESPONSE",
  "createdAt": "...",
  "data": {
    "formId": "...",
    "formName": "...",
    "responseId": "...",
    "submissionId": "...",
    "fields": [
      {
        "key": "question_xxx",
        "label": "url",
        "type": "INPUT_TEXT",
        "value": "https://postman-echo.com/get"
      }
    ]
  }
}
```

021 的 handler 做了三层处理。

### 1. 只接受 JSON

```ts
if (!contentType.includes("application/json")) {
  return {
    error: NextResponse.json(
      {
        success: false,
        error: "Tally webhooks must use Content-Type: application/json.",
      },
      { status: 415 },
    ),
  };
}
```

Tally 官方 webhook 是 JSON POST，所以这里直接拒绝非 JSON 请求。

### 2. 校验是否为 Tally FORM_RESPONSE

```ts
if (!isRecord(value) || value.eventType !== "FORM_RESPONSE") {
  return false;
}

if (!isRecord(value.data) || !Array.isArray(value.data.fields)) {
  return false;
}
```

这个校验保证后续代码可以安全读取：

```ts
payload.data.fields
```

### 3. 规范化成前端/节点友好的 context

handler 不把 Tally 原始 payload 原样丢给 workflow，而是整理成更好用的结构：

```ts
return {
  eventId,
  eventType,
  createdAt,
  receivedAt,
  form,
  submission,
  fields,
  answersByKey,
  answersByLabel,
  raw,
};
```

最终进入 workflow 的数据是：

```ts
initialData: {
  tally,
}
```

后续节点看到的 context 就是：

```json
{
  "tally": {
    "answersByLabel": {
      "url": "https://postman-echo.com/get"
    }
  }
}
```

## answersByKey 和 answersByLabel

Tally 的每个字段都有 `key`、`label`、`type`、`value`。

### answersByKey

```json
{
  "answersByKey": {
    "question_BZqj5Y": "https://postman-echo.com/get"
  }
}
```

`key` 是 Tally 生成的字段标识。

优点：

- 同一个表单内比较稳定
- 不怕用户改 label 文案

缺点：

- 不直观
- 换一个表单通常会变
- 用户不容易手写

### answersByLabel

```json
{
  "answersByLabel": {
    "url": "https://postman-echo.com/get"
  }
}
```

`label` 是表单问题标题。

优点：

- 前端用户更容易理解
- 后续节点模板更好写

缺点：

- 如果 Tally 表单里没有 label，就不会生成
- 如果用户改了问题标题，模板也要跟着改
- 如果多个字段 label 一样，会被整理成数组

当前更适合给用户推荐的写法是：

```txt
{{tally.answersByLabel.url}}
```

而不是：

```txt
{{tally.answersByKey.question_BZqj5Y}}
```

因为前者更符合“从前端配置 workflow”的心智模型。

## HTTP Request 如何消费 Tally 字段

文件：

- `src/app/features/excutions/components/http-request/dialog.tsx`
- `src/app/features/excutions/components/http-request/executor.tsx`

HTTP Request executor 本来就支持 Handlebars 模板：

```ts
const endpoint = Handlebars.compile(data.endpoint)(context);
```

这意味着 `endpoint` 可以写成：

```txt
{{tally.answersByLabel.url}}
```

执行时会用 workflow context 渲染。

如果 context 是：

```json
{
  "tally": {
    "answersByLabel": {
      "url": "https://postman-echo.com/get"
    }
  }
}
```

那么渲染结果就是：

```txt
https://postman-echo.com/get
```

### 为什么要改 HTTP Request 的前端校验

021 之前，HTTP Request dialog 对 endpoint 使用的是严格 URL 校验：

```ts
z.string().url()
```

所以用户输入：

```txt
{{tally.answersByLabel.url}}
```

会被表单直接拦住，提示：

```txt
请输入合法的 URL，例如 https://api.example.com/users
```

但从执行层看，这个模板是合法的，因为执行时会先渲染再请求。

因此 021 把校验改成：

```ts
const hasTemplateExpression = (value: string) => /\{\{[^}]+\}\}/.test(value);

endpoint: z
  .string()
  .trim()
  .min(1, "Endpoint 不能为空")
  .refine((value) => {
    if (hasTemplateExpression(value)) {
      return true;
    }

    return z.url().safeParse(value).success;
  });
```

现在 endpoint 支持两类值：

```txt
https://api.example.com/users
{{tally.answersByLabel.url}}
```

这个改动是典型的前端表单校验要和运行时能力对齐。

如果运行时支持模板，但前端 schema 不允许模板，用户就无法保存合法配置。

## Inngest 执行入口抽象

文件：

- `src/app/inngest/utils.ts`
- `src/app/features/workflows/server/routers.ts`
- `src/app/api/webhooks/tally/handle-tally-webhook.ts`

021 新增了统一 helper：

```ts
export const sendWorkflowExecution = ({
  workflowId,
  initialData,
}: SendWorkflowExecutionInput) => {
  return inngest.send({
    name: "workflows/execute.workflow",
    data: {
      workflowId,
      initialData,
    },
  });
};
```

这样 workflow 的 event name 只集中在一个地方：

```txt
workflows/execute.workflow
```

前端手动点击执行和 Tally webhook 执行，本质上都走同一个入口：

```txt
sendWorkflowExecution(...)
```

区别只是有没有 `initialData`。

手动执行：

```ts
await sendWorkflowExecution({
  workflowId: input.id,
});
```

Tally webhook 执行：

```ts
await sendWorkflowExecution({
  workflowId,
  initialData: {
    tally,
  },
});
```

## Tally 触发器 executor

文件：

- `src/app/features/trigger/components/tally-trigger/executor.tsx`
- `src/app/inngest/channels/tally-trigger.ts`

Tally executor 本身不做复杂业务。

它的职责是：

1. 发布当前 Tally 节点 `loading`
2. 把当前 context 原样向后传
3. 发布当前 Tally 节点 `success`

代码结构：

```ts
const result = await step.run("tally-trigger", async () => context);
return result;
```

为什么它只返回 context？

因为真正的表单数据已经在 webhook 阶段放进了：

```ts
initialData.tally
```

当 Inngest function 开始执行时：

```ts
let context = event.data.initialData || {};
```

所以 Tally 触发器节点要做的是确认触发链路成立，并把这份 context 继续传给下游节点。

## 实时状态链路

021 沿用了 020 的 realtime 状态模式。

新增 channel：

```ts
export const TALLY_TRIGGER_CHANNEL_NAME = "tally-trigger-execution";
```

新增 topic：

```ts
topic("status").type<{
  nodeId: string;
  status: "loading" | "success" | "error";
}>()
```

前端节点订阅：

```ts
const nodeStatus = useNodeStatus({
  nodeId: props.id,
  channel: TALLY_TRIGGER_CHANNEL_NAME,
  topic: "status",
  refreshToken: fetchTallyTriggerRealtimeToken,
});
```

执行器发布：

```ts
await publish(
  tallyTriggerChannel().status({
    nodeId,
    status: "loading",
  }),
);
```

因此 Tally 表单提交触发 workflow 后，画布上的 Tally 节点也能显示执行状态。

## 从前端理解完整数据流

下面是 021 的完整链路：

```txt
用户在 Node Selector 添加 Tally Form 节点
  -> React Flow 创建 type=TALLY_FORM_TRIGGER 的节点
  -> 保存 workflow 时写入数据库

用户打开 Tally 节点配置
  -> dialog 从路由读取 workflowId
  -> 生成 ngrok webhook URL
  -> 用户复制到 Tally 后台

用户提交 Tally 表单
  -> Tally POST /api/webhooks/tally/{workflowId}
  -> Next.js route 读取 workflowId
  -> handleTallyWebhook 校验 payload
  -> normalizeTallyPayload 生成 tally context
  -> sendWorkflowExecution({ workflowId, initialData: { tally } })

Inngest 执行 workflow
  -> event.data.initialData 成为初始 context
  -> Tally trigger executor 原样传递 context
  -> HTTP Request executor 编译 endpoint 模板
  -> {{tally.answersByLabel.url}} 变成真实 URL
  -> HTTP 请求执行
```

## 用户应该怎么配置

### Tally 表单

给问题设置清晰 label，例如：

```txt
url
```

不要只依赖 Tally 自动生成的 `question_xxx`。

### Tally Webhook

在 Tally 后台配置：

```txt
Method: POST
URL: https://till-hatchery-semantic.ngrok-free.dev/api/webhooks/tally/{workflowId}
```

### HTTP Request 节点

如果表单字段 label 是 `url`，Endpoint 填：

```txt
{{tally.answersByLabel.url}}
```

如果要在 JSON Body 里使用：

```json
{
  "url": "{{tally.answersByLabel.url}}"
}
```

## 当前实现的限制

### 1. ngrok 域名写死在前端

当前代码里：

```ts
const TALLY_WEBHOOK_ORIGIN = "https://till-hatchery-semantic.ngrok-free.dev";
```

这适合本地开发演示，但不适合生产。

后续更好的做法是从环境变量或服务端配置读取：

```txt
NEXT_PUBLIC_APP_URL
```

或者由服务端生成 webhook URL，再传给前端。

### 2. Tally dialog 的导出命名仍叫 ManualTriggerDialog

当前文件里：

```ts
export function ManualTriggerDialog(...)
```

实际用途已经是 Tally webhook dialog。

后续应该重命名为：

```ts
TallyTriggerDialog
```

这样 `node.tsx` 也会更清晰。

### 3. 没有签名校验

Tally 官方支持 signing secret。当前 route 只校验 payload shape，没有校验请求确实来自 Tally。

公开部署时应该加上：

```txt
Tally-Signature
```

签名校验可以避免外部随意调用 webhook 触发 workflow。

### 4. 没有幂等处理

Tally webhook 如果没有及时收到 2xx，可能会重试。

当前代码没有用 `eventId` 或 `submissionId` 做幂等，因此重复 webhook 可能重复触发 workflow。

后续可以存一张 webhook event 表，用：

```txt
eventId
submissionId
```

避免重复执行。

## 前端角度的核心收获

021 的关键不只是新增一个后端 webhook，而是把一个外部输入源包装成画布里可理解、可配置、可连接的前端节点。

前端要完成的事情有三层：

1. 节点层：让用户能在画布里选择并看到 Tally 触发器
2. 配置层：让用户能复制正确 webhook URL 并完成外部系统配置
3. 变量层：让后续节点能用 `{{tally.answersByLabel.xxx}}` 消费表单字段

这三个层次打通后，Tally 才真正成为 workflow 的触发器。

最终用户不需要理解 Inngest、Next.js route 或 payload normalize，只需要知道：

```txt
Tally 提交 -> Workflow 执行 -> 后续节点可以用 tally 变量
```
