---
title: "Smart Flow 020：实时状态显示"
icon: "tower-broadcast"
date: 2026-07-03
category:
  - "前端"
tag:
  - "Smart Flow"
  - "Workflow"
  - "Inngest"
  - "Realtime"
star: true
---

# 020: 实时状态显示

提交：`aa6b003 020:实时状态显示`

对比基准：`971a99e 019:http-request结果传递`

本文写于 2026-07-03。当前项目使用的是：

- `inngest@^3.54.2`
- `@inngest/realtime@^0.4.4`

这套代码对应 Inngest v3 的 Realtime API。官方现在已经把 v3 Realtime 标为 deprecated，新项目推荐 v4 内置 Realtime API；但这个提交本身是基于 v3 的 `@inngest/realtime` 包实现的。

参考：

- Inngest v3 Realtime 文档：https://www.inngest.com/docs/reference/typescript/v3/realtime
- Inngest v3 React hook 文档：https://www.inngest.com/docs/reference/typescript/v3/realtime/react-hooks
- Inngest Next.js quick start：https://www.inngest.com/docs/getting-started/nextjs-quick-start
- Inngest createFunction/retries 参考：https://www.inngest.com/docs/reference/typescript/functions/create

## 这个提交解决的问题

019 提交已经能执行 workflow，并且 HTTP Request 节点能把请求结果写入 workflow context。

020 提交继续补上了用户界面的实时反馈：

1. 用户点击“开始执行”后，节点不再一直显示静态的 `initial`。
2. Inngest 后台执行每个节点时，会发布节点状态消息。
3. 前端 React Flow 节点订阅这些消息。
4. 节点 UI 根据消息变成 `loading`、`success` 或 `error`。

也就是说，020 的核心目标是：

> 把后台 Inngest workflow 执行过程，实时映射到画布上的节点状态。

## 整体设计

![image-20260703232701793](/Users/jackmojong/Library/Application Support/typora-user-images/image-20260703232701793.png)

这次设计分成两条链路：

1. 服务端发布状态
2. 客户端订阅状态

服务端链路：

```txt
workflow execute mutation
  -> inngest.send("workflows/execute.workflow")
  -> Inngest function exec 被触发
  -> 按拓扑排序执行节点
  -> 每个 executor 调用 publish(...)
  -> Inngest Realtime 把状态消息推给订阅者
```

客户端链路：

```txt
React Flow node mount
  -> useNodeStatus(...)
  -> refreshToken 获取订阅 token
  -> useInngestSubscription(...) 建立订阅
  -> 收到 realtime messages
  -> 根据 channel/topic/nodeId 找到当前节点最新消息
  -> setStatus(...)
  -> BaseExecutionNode/BaseTriggerNode 重新渲染状态边框
```

## 文件级变化

### 1. 新增依赖

文件：

- `package.json`
- `package-lock.json`

新增：

```json
"@inngest/realtime": "^0.4.4"
```

这个包提供了 v3 Realtime 所需能力：

- `channel`
- `topic`
- `getSubscriptionToken`
- `Realtime` 类型命名空间
- `realtimeMiddleware`
- `useInngestSubscription`

### 2. 开启 Inngest Realtime middleware

文件：

- `src/app/inngest/client.ts`

020 之前：

```ts
export const inngest = new Inngest({ id: "smart-flow" });
```

020 之后：

```ts
import { realtimeMiddleware } from "@inngest/realtime/middleware";

export const inngest = new Inngest({
  id: "smart-flow",
  middleware: [realtimeMiddleware()],
});
```

`realtimeMiddleware()` 的作用是给 Inngest function handler 注入 `publish`。

所以原来 handler 只能这样写：

```ts
async ({ event, step }) => {}
```

加了 middleware 后，可以这样写：

```ts
async ({ event, step, publish }) => {}
```

这里的 `publish` 就是发布 realtime 消息的函数。

本地类型里可以看到它的核心类型：

```ts
type PublishFn = <TMessage extends MaybePromise<Realtime.Message.Input>>(
  message: TMessage,
) => Promise<Awaited<TMessage>["data"]>;
```

翻译成人话：

> `publish` 接收一个 realtime message，发送出去，然后返回这条 message 的 `data`。

### 3. 定义 realtime channel 和 topic

新增文件：

- `src/app/inngest/channels/http-request.ts`
- `src/app/inngest/channels/manual-trigger.ts`

HTTP Request channel：

```ts
import { channel, topic } from "@inngest/realtime";

export const HTTP_REQUEST_CHANNEL_NAME = "http-request-execution";

export const httpRequestChannel = channel(HTTP_REQUEST_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
```

Manual Trigger channel：

```ts
export const MANUAL_TRIGGER_CHANNEL_NAME = "manual-trigger-execution";

export const manualTriggerChannel = channel(
  MANUAL_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
```

### channel 是什么

`channel(...)` 定义一条消息通道。

可以把它理解成一个命名空间：

```txt
http-request-execution
manual-trigger-execution
```

当前提交使用的是静态 channel，也就是所有 HTTP Request 节点都发到 `http-request-execution`，所有 Manual Trigger 节点都发到 `manual-trigger-execution`。

### topic 是什么

`topic("status")` 定义 channel 下面的一个消息分类。

当前每个 channel 只有一个 topic：

```txt
status
```

如果以后要扩展，可以继续加：

```txt
status
logs
result
progress
```

### `.type<...>()` 是什么

`.type<...>()` 是 TypeScript 类型约束。

它不会在运行时校验数据，但会让 TypeScript 知道这个 topic 的消息形状：

```ts
{
  nodeId: string;
  status: "loading" | "success" | "error";
}
```

因此发布状态时，只能发这几种状态：

```ts
httpRequestChannel().status({
  nodeId,
  status: "loading",
});
```

如果写成：

```ts
httpRequestChannel().status({
  nodeId,
  status: "done",
});
```

TypeScript 应该报错，因为 `"done"` 不在允许范围内。

### 4. 注册 function 可用的 realtime channels

文件：

- `src/app/inngest/functions.ts`

020 之前：

```ts
export const exec = inngest.createFunction(
  { id: "execute-workflow" },
  { event: "workflows/execute.workflow" },
  async ({ event, step }) => {
    // ...
  },
);
```

020 之后：

```ts
export const exec = inngest.createFunction(
  { id: "execute-workflow", retries: 0 },
  {
    event: "workflows/execute.workflow",
    channels: [httpRequestChannel(), manualTriggerChannel()],
  },

  async ({ event, step, publish }) => {
    // ...
  },
);
```

这里做了三件事。

第一，`retries: 0`：

默认情况下 Inngest function 会自动重试失败任务。实时状态消息如果在失败后被重试，可能出现重复的 `loading`、`error`、`success`。这里把 retries 设成 0，表示执行失败就失败，不让 Inngest 自动重跑整个 function。

第二，`channels: [...]`：

告诉 Inngest 这个 function 会使用哪些 realtime channel。

注意这里传的是：

```ts
httpRequestChannel()
manualTriggerChannel()
```

不是：

```ts
httpRequestChannel
manualTriggerChannel
```

因为 `httpRequestChannel` 是 channel builder，调用 `httpRequestChannel()` 后才得到实际 channel 对象。

第三，handler 参数多了 `publish`：

```ts
async ({ event, step, publish }) => {}
```

这个 `publish` 后面会继续传给每个 node executor。

### 5. executor 参数增加 publish

文件：

- `src/app/features/excutions/type.ts`

020 修改了节点 executor 的统一参数类型：

```ts
export interface NodeExecutorParams<TData = Record<string, unknown>> {
  data: TData;
  nodeId: string;
  context: WorkflowContext;
  step: StepTools;
  publish: Realtime.PublishFn;
}
```

这意味着所有 executor 都能拿到：

- 当前节点配置 `data`
- 当前节点 id `nodeId`
- workflow 上下文 `context`
- Inngest step 工具 `step`
- Inngest Realtime 发布函数 `publish`

然后在 `functions.ts` 里传入：

```ts
context = await executor({
  data: node.data as Record<string, unknown>,
  nodeId: node.id,
  context,
  step,
  publish,
});
```

这里很关键。如果漏传 `publish`，HTTP Request executor 一执行到：

```ts
await publish(...)
```

就会抛：

```txt
TypeError: publish is not a function
```

Inngest Dev Server 可能表现为：

```txt
invalid status code: 500
```

### 6. Manual Trigger executor 发布状态

文件：

- `src/app/features/trigger/components/manual-trigger/executor.tsx`

020 之前只是执行一个 step：

```ts
const result = await step.run("manual-trigger", async () => context);
return result;
```

020 之后增加状态发布：

```ts
await publish(
  manualTriggerChannel().status({
    nodeId,
    status: "loading",
  }),
);

const result = await step.run("manual-trigger", async () => context);

await publish(
  manualTriggerChannel().status({
    nodeId,
    status: "success",
  }),
);

return result;
```

执行顺序是：

```txt
publish loading
  -> step.run("manual-trigger")
  -> publish success
```

Manual Trigger 当前没有 catch，所以如果 `step.run` 抛错，它不会主动发布 `error`。不过这个节点现在的逻辑只是返回 `context`，失败概率很低。

### 7. HTTP Request executor 发布状态

文件：

- `src/app/features/excutions/components/http-request/executor.tsx`

020 给 HTTP Request 节点补了完整状态流：

```txt
loading
  -> success
```

或者：

```txt
loading
  -> error
```

代码结构是：

```ts
await publish(httpRequestChannel().status({ nodeId, status: "loading" }));

if (!data.variableName) {
  await publish(httpRequestChannel().status({ nodeId, status: "error" }));
  throw new NonRetriableError("HTTP Request node: No variableName configured");
}

if (!data.endpoint) {
  await publish(httpRequestChannel().status({ nodeId, status: "error" }));
  throw new NonRetriableError("HTTP Request node: No endpoint configured");
}

if (!data.method) {
  await publish(httpRequestChannel().status({ nodeId, status: "error" }));
  throw new NonRetriableError("HTTP Request node: Method not configured");
}

try {
  const result = await step.run("http-request", async () => {
    // 发 HTTP 请求并写入 context
  });

  await publish(httpRequestChannel().status({ nodeId, status: "success" }));

  return result;
} catch (error) {
  await publish(httpRequestChannel().status({ nodeId, status: "error" }));
  throw error;
}
```

这里的设计意图：

- 一进入节点就显示 `loading`
- 配置缺失时立即显示 `error`
- HTTP 请求成功后显示 `success`
- HTTP 请求失败、JSON body 解析失败、Handlebars 渲染失败时显示 `error`
- 错误继续往外抛，让 Inngest run 本身失败

`NonRetriableError` 的含义是：这是业务配置错误，不应该靠重试解决。例如 endpoint 没填、method 没配置。

### 8. 生成订阅 token

新增文件：

- `src/app/features/excutions/components/http-request/actions.ts`
- `src/app/features/trigger/components/manual-trigger/actions.ts`

HTTP Request token：

```ts
import { getSubscriptionToken, Realtime } from "@inngest/realtime";

export type httpRequestToken = Realtime.Token<
  typeof httpRequestChannel,
  ["status"]
>;

export async function fetchHttpRequestRealtimeToken(): Promise<httpRequestToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: httpRequestChannel(),
    topics: ["status"],
  });
  return token;
}
```

Manual Trigger token：

```ts
export type manualTriggerToken = Realtime.Token<
  typeof manualTriggerChannel,
  ["status"]
>;

export async function fetchManualTriggerRealtimeToken(): Promise<manualTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: manualTriggerChannel(),
    topics: ["status"],
  });
  return token;
}
```

### 为什么需要 token

浏览器不能直接拿 Inngest 服务端权限去订阅所有消息。

所以流程是：

```txt
server action
  -> getSubscriptionToken(...)
  -> 生成一个只允许订阅指定 channel/topic 的短期 token
  -> browser 用这个 token 建立订阅
```

这类似“给浏览器一张临时门票”。

### `Realtime.Token<typeof channel, ["status"]>` 是什么

这是一个类型工具。

```ts
Realtime.Token<typeof httpRequestChannel, ["status"]>
```

意思是：

> 这个 token 只能用于 `httpRequestChannel`，并且只允许订阅 `status` topic。

这样 `useInngestSubscription` 拿到数据时，TypeScript 能推导消息结构。

### 9. 通用 Hook：useNodeStatus

新增文件：

- `src/app/features/excutions/hooks/use-node-status.ts`

这个 hook 是前端实时状态显示的核心。

接口：

```ts
interface UseNodeStatusOptions {
  nodeId: string;
  channel: string;
  topic: string;
  refreshToken: () => Promise<Realtime.Subscribe.Token>;
}
```

用法：

```ts
const nodeStatus = useNodeStatus({
  nodeId: props.id,
  channel: HTTP_REQUEST_CHANNEL_NAME,
  topic: "status",
  refreshToken: fetchHttpRequestRealtimeToken,
});
```

内部逻辑：

```ts
const [status, setStatus] = useState<NodeStatus>("initial");

const { data } = useInngestSubscription({
  refreshToken,
  enabled: true,
});
```

`useInngestSubscription` 是 `@inngest/realtime/hooks` 提供的 React hook。

官方 v3 文档里的典型流程是：

1. 服务端用 `getSubscriptionToken()` 生成 token。
2. 客户端把 `refreshToken` 传给 `useInngestSubscription()`。
3. hook 返回累计的 realtime messages。

当前项目只使用了返回值里的 `data`：

```ts
const { data } = useInngestSubscription(...)
```

`data` 是已经收到的消息数组。

然后 hook 会筛选出属于当前节点的最新消息：

```ts
const latestMessage = data
  .filter(
    (msg) =>
      msg.kind === "data" &&
      msg.channel === channel &&
      msg.topic === topic &&
      msg.data.nodeId === nodeId,
  )
  .sort((a, b) => {
    if (a.kind === "data" && b.kind === "data") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  })[0];
```

筛选条件逐个解释：

- `msg.kind === "data"`：只处理真实业务消息，不处理 ping/pong 等内部消息。
- `msg.channel === channel`：只看指定 channel。
- `msg.topic === topic`：只看指定 topic。
- `msg.data.nodeId === nodeId`：只看当前 React Flow 节点。

排序逻辑：

```ts
new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
```

这是按时间倒序排，最新消息在第 0 个。

最后更新 React state：

```ts
if (latestMessage?.kind === "data") {
  setStatus(latestMessage.data.status as NodeStatus);
}
```

这个 `status` 最终传给 UI 节点。

### 10. 节点 UI 接入状态

修改文件：

- `src/app/features/excutions/components/http-request/node.tsx`
- `src/app/features/trigger/components/manual-trigger/node.tsx`

020 之前，节点状态是写死的：

```ts
const nodeStatus = "initial";
```

020 之后，状态来自实时订阅：

```ts
const nodeStatus = useNodeStatus({
  nodeId: props.id,
  channel: HTTP_REQUEST_CHANNEL_NAME,
  topic: "status",
  refreshToken: fetchHttpRequestRealtimeToken,
});
```

然后传给基础节点组件：

```tsx
<BaseExecutionNode
  {...props}
  status={nodeStatus}
/>
```

或者：

```tsx
<BaseTriggerNode
  {...props}
  status={nodeStatus}
/>
```

基础节点再把状态传给：

```tsx
<NodeStatusIndicator status={status} variant="border">
  ...
</NodeStatusIndicator>
```

`NodeStatusIndicator` 已经支持这些状态：

```ts
export type NodeStatus = "loading" | "success" | "error" | "initial";
```

所以 020 没有重新设计 UI，只是把真实状态接进了已有状态显示组件。

## 一次完整执行是什么样

假设 workflow 有两个节点：

```txt
Manual Trigger -> HTTP Request
```

用户点击开始执行：

```ts
executeWorkflow.mutate({ id: workflowId });
```

tRPC mutation 发送 Inngest event：

```ts
await inngest.send({
  name: "workflows/execute.workflow",
  data: { workflowId: input.id },
});
```

Inngest 收到 event 后触发：

```ts
exec = inngest.createFunction(...)
```

function 先准备 workflow：

```ts
const sortedNodes = await step.run("prepare-workflow", async () => {
  const workflow = await prisma.workflow.findUniqueOrThrow(...);
  return topologicalSort(workflow.nodes, workflow.connections);
});
```

然后按排序执行节点：

```ts
for (const node of sortedNodes) {
  const executor = getExecutor(node.type as NodeType);
  context = await executor({ data, nodeId, context, step, publish });
}
```

Manual Trigger executor 发布：

```txt
manual-trigger-execution/status
  { nodeId: "xxx", status: "loading" }

manual-trigger-execution/status
  { nodeId: "xxx", status: "success" }
```

HTTP Request executor 发布：

```txt
http-request-execution/status
  { nodeId: "yyy", status: "loading" }

http-request-execution/status
  { nodeId: "yyy", status: "success" }
```

如果 HTTP 请求失败，则第二条变成：

```txt
http-request-execution/status
  { nodeId: "yyy", status: "error" }
```

前端每个节点都订阅对应 channel，收到消息后只挑自己的 `nodeId`，最后更新自己的状态边框。

## 为什么要按 nodeId 过滤

当前 channel 是按节点类型分的，不是按具体节点分的。

例如所有 HTTP Request 节点都订阅：

```txt
http-request-execution/status
```

如果画布上有三个 HTTP Request 节点，它们都会收到同一个 channel 的所有 status 消息。

所以必须用：

```ts
msg.data.nodeId === nodeId
```

来判断“这条消息是不是发给我这个节点的”。

## 为什么还要按 createdAt 排序

`useInngestSubscription` 返回的是累计消息数组。

当前节点可能已经收到：

```txt
loading
success
```

或者：

```txt
loading
error
```

UI 只应该展示最后状态，所以 hook 会按 `createdAt` 排序，取最新一条。

## 这个设计的优点

1. executor 不直接依赖 React，仍然只是后端执行逻辑。
2. UI 不需要轮询数据库，也不需要不断 refetch workflow。
3. 状态更新粒度是节点级别，而不是整个 workflow 级别。
4. channel/topic 有类型，发布数据时更不容易写错。
5. `useNodeStatus` 是通用 hook，Manual Trigger 和 HTTP Request 都能复用。

## 已知问题和改进点

### 1. Server action 文件缺少 `"use server"`

这两个文件被 client component 间接用作 `refreshToken`：

- `src/app/features/excutions/components/http-request/actions.ts`
- `src/app/features/trigger/components/manual-trigger/actions.ts`

按 Next.js server action 的常见写法，文件顶部应该加：

```ts
"use server";
```

否则这些函数可能被当成普通模块处理，导致客户端导入服务端能力，比如 `inngest` client 或 `getSubscriptionToken`，引发构建或运行时问题。

### 2. Manual Trigger actions 有一个多余 import

文件：

```ts
src/app/features/trigger/components/manual-trigger/actions.ts
```

里面导入了：

```ts
import { httpRequestChannel } from "@/app/inngest/channels/http-request";
```

但没有使用。应该删除。

### 3. executor registry 有 TypeScript 泛型兼容问题

当前执行：

```bash
npx tsc --noEmit
```

会报：

```txt
src/app/features/excutions/lib/executor-registy.ts(10,3):
Type of computed property's value is 'NodeExecutor<HttpRequestData>',
which is not assignable to type 'NodeExecutor'.
```

原因是：

```ts
export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
};
```

`NodeExecutor` 默认数据类型是：

```ts
Record<string, unknown>
```

但 `httpRequestExecutor` 需要更具体的：

```ts
{
  variableName: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
}
```

TypeScript 认为“需要具体 data 的函数”不能随便当成“接受任意 data 的函数”使用。

这是类型层面的设计问题，不是 020 的 realtime 逻辑本身。

### 4. channel 维度偏粗

当前 channel 是按节点类型分：

```txt
manual-trigger-execution
http-request-execution
```

这样所有正在打开页面的用户，理论上都在订阅同一个静态 channel。

更稳的设计是按 workflow、execution 或 runId 分 channel，例如：

```txt
workflow:{workflowId}
run:{runId}
node:{nodeId}
```

这样可以避免不同 workflow、不同用户、不同浏览器页面之间互相收到不相关的状态消息。

### 5. `publish` 不是 durable step

当前代码直接使用 middleware 注入的：

```ts
publish(...)
```

这类消息适合进度提示，但不是 durable step。也就是说，如果 function 发生重试，状态消息可能再次发送。

当前提交通过：

```ts
retries: 0
```

降低重复发送的概率。

如果以后迁移到 Inngest v4，重要状态可以考虑使用官方推荐的 durable realtime publish。

## 020 的一句话总结

020 提交把 workflow 执行从“后台静默运行”升级成“节点状态实时可见”：服务端 executor 在执行前后通过 Inngest Realtime 发布状态，前端节点通过 subscription token 订阅消息，并用 `nodeId` 过滤出自己的最新状态，最终驱动 React Flow 节点显示 loading、success、error。
