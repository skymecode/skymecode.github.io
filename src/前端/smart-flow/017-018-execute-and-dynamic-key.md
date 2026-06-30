---
title: "Smart Flow 017/018：工作流执行与动态变量名"
icon: "play"
date: 2026-06-30
category:
  - "前端"
tag:
  - "Smart Flow"
  - "React Flow"
  - "Inngest"
  - "tRPC"
star: true
---

# 017 和 018 前端工作说明

本文档基于 git 提交：

- `801eb31 017:工作流执行`
- `368601c 018:配置动态key`

重点从前端功能、交互设计、数据流和实现方式说明这两次提交做了什么。

## 总览

`017` 主要完成了工作流的执行入口和执行链路：用户在编辑器中配置好节点后，可以点击“开始执行”，前端通过 tRPC 调用服务端 mutation，服务端再发送 Inngest 事件，由 Inngest 按节点顺序执行工作流。

`018` 主要增强了 HTTP Request 节点的配置能力：用户不再只能把请求结果写入固定的 `httpResponse` 字段，而是可以在节点配置弹窗里填写 `Variable Name`，让每个 HTTP 请求节点把结果保存到指定变量中，方便后续节点引用。

## 017：工作流执行

### 做了什么

`017` 给编辑器增加了一个真正可触发的执行入口。

前端侧新增或改动的核心内容包括：

- 在编辑器画布中判断当前 workflow 是否存在 `MANUAL_TRIGGER` 节点。
- 只有存在手动触发节点时，才在 React Flow 画布底部显示“开始执行”按钮。
- 新增 `ExecuteWorkflowButton` 组件，负责触发执行 mutation。
- 新增 `useExecuteWorkflow` hook，封装 tRPC mutation 和 toast 反馈。
- 执行成功后提示 `Workflow "xxx" executed`。
- 执行失败后提示 `Failed to execute workflow: ...`。

相关文件：

- `src/app/features/editor/components/editor.tsx`
- `src/app/features/editor/components/execute-workflow-button.tsx`
- `src/app/features/workflows/hooks/use-workflows.ts`
- `src/app/features/workflows/server/routers.ts`
- `src/app/inngest/functions.ts`
- `src/app/inngest/utils.ts`

### 为什么这样设计

#### 1. 执行按钮放在编辑器画布内

工作流执行是编辑器场景里的核心动作，它依赖当前画布里的节点和连线。把按钮放在 React Flow 的 `Panel position="bottom-center"` 中，可以让执行动作始终贴近画布，不需要用户离开编辑器页面。

这比放在列表页或侧边栏更符合用户心智：用户是在“看着当前 workflow”时点击执行，而不是在其他页面发起执行。

#### 2. 只有存在 Manual Trigger 才显示执行按钮

代码通过：

```ts
const hasManualTrigger = useMemo(() => {
  return nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);
}, [nodes]);
```

判断当前节点中是否有手动触发器。

这样设计的原因是：手动执行需要一个明确的触发入口节点。如果 workflow 里没有 `MANUAL_TRIGGER`，用户点击执行会缺少明确语义。前端直接隐藏执行按钮，可以减少无效操作，也避免后端收到不完整的执行请求。

#### 3. 执行动作封装成 hook

`useExecuteWorkflow` 沿用了项目里已有的工作流 hook 风格，例如 `useCreateWorkflow`、`useUpdateWorkflow`。这样做有几个好处：

- UI 组件只关心“点击后执行”，不用关心 tRPC 细节。
- toast 成功/失败反馈集中管理。
- 后续如果要加缓存刷新、执行记录跳转、埋点，都可以在 hook 内扩展。

#### 4. 前端只负责触发，不负责真正执行

前端点击按钮后，只发送 workflow id：

```ts
executeWorkflow.mutate({ id: workflowId });
```

真正的执行放在服务端和 Inngest 中完成。这样设计更合理，因为节点执行可能包含 HTTP 请求、AI 请求、重试、长耗时任务等，不适合放在浏览器里跑。

前端职责保持清晰：

- 展示 workflow。
- 收集节点配置。
- 保存节点和连线。
- 发起执行请求。
- 展示执行结果或执行状态。

### 如何实现

#### 1. 编辑器判断是否显示执行按钮

`editor.tsx` 中维护了 React Flow 的 `nodes` 和 `edges` 状态。提交 `017` 新增了 `hasManualTrigger`：

```ts
const hasManualTrigger = useMemo(() => {
  return nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);
}, [nodes]);
```

然后在 React Flow 内部渲染按钮：

```tsx
{hasManualTrigger && (
  <Panel position="bottom-center">
    <ExecuteWorkflowButton workflowId={workflowId} />
  </Panel>
)}
```

这让按钮的展示和画布状态绑定：用户添加或删除手动触发节点后，按钮会跟着出现或消失。

#### 2. 执行按钮组件触发 mutation

新增的 `ExecuteWorkflowButton` 非常薄：

```tsx
export const ExecuteWorkflowButton = ({ workflowId }: { workflowId: string }) => {
  const executeWorkflow = useExecuteWorkflow();

  const handleExecute = () => {
    executeWorkflow.mutate({ id: workflowId });
  };

  return (
    <Button size="lg" onClick={handleExecute} disabled={executeWorkflow.isPending}>
      开始执行
    </Button>
  );
};
```

按钮只做三件事：

- 拿到 `workflowId`。
- 调用 `useExecuteWorkflow`。
- pending 时禁用按钮，避免重复点击。

#### 3. hook 封装 tRPC 调用和 toast

`useExecuteWorkflow` 调用 `trpc.workflows.execute.mutationOptions`：

```ts
export const useExecuteWorkflow = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.workflows.execute.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow "${data.name}" executed`);
      },
      onError: (error) => {
        toast.error(`Failed to execute workflow: ${error.message}`);
      },
    }),
  );
};
```

这里的前端体验重点是即时反馈。用户点击执行后，即使真正的工作流执行是在 Inngest 里异步完成，前端至少能告诉用户“执行请求已发起”或“发起失败”。

#### 4. 服务端发送 Inngest 事件

tRPC router 新增 `execute` mutation：

```ts
await inngest.send({
  name: "workflows/execute.workflow",
  data: { workflowId: input.id },
});
```

它先校验 workflow 属于当前用户，再发送事件。这对前端来说很重要：前端只传 id，权限和数据完整性交给服务端处理。

#### 5. Inngest 按节点顺序执行

`src/app/inngest/functions.ts` 把原先测试 AI 调用的函数替换成真正的 workflow executor。

执行流程是：

1. 从事件里拿到 `workflowId`。
2. 查询 workflow 的 `nodes` 和 `connections`。
3. 使用 `topologicalSort` 根据连线排序节点。
4. 遍历排序后的节点。
5. 根据节点类型从 `executorRegistry` 找到对应 executor。
6. 每个节点接收并返回 `context`，让上一个节点的输出可以传给下一个节点。

这为后续前端展示“节点执行中、成功、失败、输出内容”等状态打下基础。

## 018：配置动态 key

### 做了什么

`018` 聚焦 HTTP Request 节点配置体验，主要做了这些事：

- HTTP Request 配置弹窗从手写 `useState` 表单改成 `react-hook-form + zod`。
- 新增 `Variable Name` 字段。
- 对变量名做合法性校验。
- 对 endpoint 做 URL 校验。
- 根据请求方法动态显示 Body 字段。
- HTTP Request 节点卡片的描述文案显示变量名。
- executor 把 HTTP 请求结果写入 `context[data.variableName]`。

相关文件：

- `src/app/features/excutions/components/http-request/dialog.tsx`
- `src/app/features/excutions/components/http-request/node.tsx`
- `src/app/features/excutions/components/http-request/executor.tsx`

### 为什么这样设计

#### 1. 固定 `httpResponse` 不够用

在 `017` 中，HTTP Request executor 会把请求结果写到固定字段：

```ts
{
  ...context,
  httpResponse: {
    status,
    statusText,
    data,
  }
}
```

这个设计在只有一个 HTTP Request 节点时能工作，但一旦 workflow 中有多个 HTTP Request 节点，后面的节点会覆盖前面的 `httpResponse`。

`018` 引入 `variableName` 后，每个节点可以把结果写到自己的命名空间中，例如：

```ts
{
  getUser: {
    httpResponse: {...}
  },
  createOrder: {
    httpResponse: {...}
  }
}
```

这样后续节点就可以明确引用某个节点的结果，而不是依赖一个会被覆盖的通用字段。

#### 2. 变量名在前端配置，而不是系统自动生成

让用户在节点弹窗中填写 `Variable Name`，可以让 workflow 更可读。节点输出不只是技术上的 id，而是具有业务含义的名字，例如：

- `getUser`
- `fetchOrders`
- `createTicket`

这对低代码/工作流编辑器很重要，因为用户后续看节点和表达式时，需要快速知道每个变量代表什么。

#### 3. 使用 react-hook-form + zod 管理表单

`018` 把原来手动维护的 `formData` 状态改成：

```ts
const form = useForm<HttpRequestFormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: getDefaultValues(data),
});
```

这样设计的原因是 HTTP Request 节点配置已经不只是简单输入框。它包含：

- 必填变量名。
- 变量名格式校验。
- 必填 endpoint。
- URL 格式校验。
- method 枚举。
- body 条件展示。
- 打开弹窗时回填已有配置。

这些需求更适合用表单库和 schema 统一管理，否则组件里会充满手写校验和状态同步逻辑。

#### 4. Body 字段按 method 动态显示

代码通过：

```ts
const watchMethod = form.watch("method");
const showBodyField = ["POST", "PUT", "PATCH"].includes(watchMethod);
```

只有在 `POST`、`PUT`、`PATCH` 时显示 Body。

这属于前端体验优化：GET/DELETE 通常不需要 body，隐藏无关字段可以降低配置噪音，也能减少用户误填。

#### 5. 在节点卡片上显示变量名

HTTP Request 节点描述从：

```ts
GET: https://api.example.com
```

升级为：

```ts
myApiCall = GET: https://api.example.com
```

这让画布上的节点不需要打开弹窗，也能看出这个节点的输出变量叫什么。

### 如何实现

#### 1. 定义表单 schema

`dialog.tsx` 中新增了 zod schema：

```ts
const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, underscores, and $",
    }),
  endpoint: z
    .string()
    .trim()
    .min(1, "Endpoint 不能为空")
    .url("请输入合法的 URL，例如 https://api.example.com/users"),
  method: z.enum(httpMethods),
  body: z.string().optional(),
});
```

变量名使用接近 JavaScript 标识符的规则，这样后续做表达式引用时会更自然，例如：

```txt
{{myApiCall.httpResponse.data}}
```

#### 2. 打开弹窗时同步节点数据

配置弹窗可能被反复打开。为了保证用户看到的是当前节点配置，打开时会 reset 表单：

```ts
useEffect(() => {
  if (open) {
    form.reset(getDefaultValues(data));
  }
}, [open, data, form]);
```

这避免了弹窗内部残留上一次编辑的临时状态。

#### 3. 表单里提供引用提示

变量名字段下面新增了说明：

```tsx
{`{{${watchVariableName || "myApiCall"}.httpResponse.data}}`}
```

它的作用不是执行表达式，而是给用户即时反馈：当前变量名保存后，后续节点大概应该如何引用它。

从前端产品角度看，这能降低用户理解动态 key 的成本。

#### 4. 保存配置到 React Flow 节点 data

`node.tsx` 中的 `handleSubmit` 将表单值写回节点数据：

```ts
updateNodeData(props.id, {
  variableName: data.variableName,
  endpoint: data.endpoint,
  method: data.method,
  body: data.body || "",
});
```

这些数据会随着工作流保存逻辑进入数据库。之后执行 workflow 时，服务端拿到的节点 data 就包含 `variableName`。

#### 5. executor 使用动态 key 写入 context

`executor.tsx` 中新增了 variableName 校验：

```ts
if (!data.variableName) {
  throw new NonRetriableError("HTTP Request node: No variableName configured");
}
```

请求成功后构造统一响应结构：

```ts
const responsePayload = {
  httpResponse: {
    status: response.status,
    statusText: response.statusText,
    data: responseData,
  },
};
```

然后写入动态 key：

```ts
return {
  ...context,
  [data.variableName]: responsePayload,
};
```

这就是 `018` 的核心：前端配置的变量名会直接影响执行上下文的数据结构。

## 从前端视角看完整链路

完整链路可以理解为：

1. 用户在 React Flow 编辑器中添加 `MANUAL_TRIGGER` 和 `HTTP_REQUEST` 节点。
2. 用户打开 HTTP Request 节点配置弹窗。
3. 用户填写 `Variable Name`、`Method`、`Endpoint`、必要时填写 `Body`。
4. 配置保存到 React Flow node 的 `data` 中。
5. 用户保存 workflow，节点 data 和 edges 持久化到数据库。
6. 编辑器检测到存在 `MANUAL_TRIGGER`，显示“开始执行”按钮。
7. 用户点击“开始执行”。
8. `useExecuteWorkflow` 调用 `workflows.execute` mutation。
9. 服务端发送 Inngest event。
10. Inngest 查询 workflow 节点和连线。
11. 服务端按拓扑顺序执行节点。
12. HTTP Request 节点把响应结果写入 `context[variableName]`。

从用户感知上看，`017` 让工作流“能跑起来”，`018` 让节点输出“能被命名和复用”。

## 这两次提交形成的前端能力

`017` 提供的是执行能力：

- 编辑器里出现执行入口。
- 用户可以从画布直接触发 workflow。
- 前端有 pending 和 toast 反馈。
- 执行逻辑不阻塞浏览器。

`018` 提供的是配置能力：

- HTTP Request 节点配置更结构化。
- 用户可以给节点输出命名。
- 节点卡片能显示关键配置。
- 表单有基础校验，减少无效配置。
- 为后续表达式引用和多节点数据传递打基础。

## 后续可以继续优化的点

这两次提交完成了基础链路，但从前端体验看还有几个明显的后续方向：

- 执行时在节点上展示 `running`、`success`、`error` 状态。
- 点击执行后跳转到 execution detail 页面。
- 展示每个节点的输入、输出和错误信息。
- 在 HTTP Request Body 中支持引用上游变量。
- 在配置弹窗中提供变量选择器，而不是只展示字符串提示。
- 对 workflow 执行前做前端校验，例如必须有 trigger、不能有孤立节点、HTTP Request 必须配置 endpoint。
- 改善执行按钮状态，例如显示 loading 文案而不只是 disabled。

## 小结

`017` 的核心是把“工作流编辑器”推进到“可执行工作流编辑器”：前端增加执行按钮和 mutation，后端接 Inngest，执行器按节点类型运行。

`018` 的核心是把 HTTP Request 节点从“固定输出字段”升级为“用户可命名输出”：前端通过表单收集 `variableName`，节点卡片展示变量名，执行器用动态 key 写入 context。

从前端角度看，这两次提交的价值是让画布上的节点开始具备真实运行语义：用户不仅能画出流程，还能配置节点输出，并通过一次点击发起执行。
