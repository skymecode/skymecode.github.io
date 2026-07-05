---
title: "Smart Flow 023：逻辑分支节点"
icon: "code-branch"
date: 2026-07-05
category:
  - "前端"
tag:
  - "Smart Flow"
  - "Workflow"
  - "Control Flow"
  - "React Flow"
star: true
---

# 023: 逻辑分支节点

提交：`4594f3d 023:逻辑分支节点`

对比基准：`8c80e7a 022:ai节点`

本文写于 2026-07-05。这个提交把 workflow 从“按拓扑排序线性执行节点”升级为“节点可以根据执行结果选择不同输出分支”，并新增了 Condition、Switch、Loop、Transform、Error Handler 五类节点。

## 这个提交解决的问题

022 的执行模型是：

```txt
topologicalSort(nodes, edges)
  -> for node of sortedNodes
  -> executor(context)
  -> context = result
```

这个模型适合顺序执行，但不适合真实自动化场景里的控制流：

- HTTP 状态码是 200 才继续，否则走失败分支。
- 根据用户类型进入不同流程。
- 遍历数组中的每一项。
- 对中间数据做变量转换。
- 某段流程失败时进入 Catch 分支，而不是整个 workflow 直接失败。

023 的核心目标是：

> 把 React Flow 的 `sourceHandle` 变成运行时分支选择能力，让节点 executor 可以返回 `output`，执行引擎根据 output 选择下一条 edge。

## 前端视角的整体架构

```txt
Node Selector
  -> 添加控制流节点
  -> React Flow 渲染带多个 source handle 的节点
  -> Dialog 收集条件、规则、循环或错误变量配置
  -> updateNodeData 写入 node.data
  -> workflow update 保存 nodes/edges
  -> Edge.sourceHandle 保存为 Connection.fromOutput
  -> Inngest 执行节点 executor
  -> executor 返回 { context, output }
  -> executeNode 根据 output 过滤 outgoing edges
  -> 递归执行被选中的下一批节点
```

核心数据关系：

```txt
React Flow Edge.sourceHandle
  -> Prisma Connection.fromOutput
  -> executor result.output
  -> getSelectedConnections(...)
  -> 下一步执行哪个节点
```

例如 Condition 节点有两个 handle：

```txt
true
false
```

当 executor 返回：

```ts
{ context, output: "true" }
```

执行引擎只会执行 `fromOutput = "true"` 的连接。

## 数据库节点类型

文件：

- `prisma/schema.prisma`
- `prisma/migrations/20260705120000_control_flow_nodes/migration.sql`

### NodeType 扩展

```prisma
enum NodeType {
  INITIAL
  MANUAL_TRIGGER
  HTTP_REQUEST
  TALLY_FORM_TRIGGER
  AI
  CONDITION
  SWITCH
  LOOP
  TRANSFORM
  ERROR_HANDLER
}
```

解释：

新增五种节点类型：

- `CONDITION`：二选一条件判断，输出 `true` 或 `false`。
- `SWITCH`：多分支规则匹配，输出 `route-1`、`route-2`、`route-3` 或 `fallback`。
- `LOOP`：把数组拆成多次 `loop` 输出，最后输出 `done`。
- `TRANSFORM`：把模板渲染成变量，写入 context。
- `ERROR_HANDLER`：执行 Try 分支，失败时执行 Catch 分支。

为什么只改 enum：

节点配置仍然保存在 `Node.data` JSON 中，连线仍然保存在 `Connection.fromOutput/toInput` 中，所以不需要为每种控制流节点创建新的数据库表。

## 执行器返回类型升级

文件：

- `src/app/features/excutions/type.ts`

022 中执行器只能返回新的 `WorkflowContext`：

```ts
export type NodeExecutor<TData = Record<string, unknown>> = (
  params: NodeExecutorParams<TData>,
) => Promise<WorkflowContext>;
```

023 改成了三种返回形态。

### 增加 executionId

```ts
export interface NodeExecutorParams<TData = Record<string, unknown>> {
  data: TData;
  nodeId: string;
  executionId?: string;
  context: WorkflowContext;
  step: StepTools;
  publish: Realtime.PublishFn;
}
```

解释：

`executionId` 是一次节点运行的唯一路径标识。它主要服务 Loop 场景：同一个节点可能在不同迭代里执行多次，如果 Inngest `step.run` 使用同一个 key，会复用旧结果。

例如：

```txt
root-0-loopNode-0-0-httpNode
root-0-loopNode-1-0-httpNode
```

这两个 executionId 能区分同一个 HTTP 节点在不同 loop item 下的执行。

### 单输出结果

```ts
export interface NodeExecutionOutput {
  context: WorkflowContext;
  output?: string;
}
```

解释：

`context` 是节点执行后的上下文，`output` 是要走的 source handle。普通节点不需要指定 output；控制流节点需要指定。

### 兼容三种结果

```ts
export type NodeExecutorResult =
  | WorkflowContext
  | NodeExecutionOutput
  | {
      outputs: NodeExecutionOutput[];
    };
```

解释：

这段设计兼容三种节点：

1. 普通节点继续返回 `WorkflowContext`，例如 HTTP、AI、Transform。
2. 分支节点返回 `{ context, output }`，例如 Condition、Switch、Error Handler。
3. Loop 返回 `{ outputs: [...] }`，因为一个 Loop 节点会产生多次后续执行。

为什么这样设计：

不强迫所有旧 executor 立刻改成新结构。旧的 `return context` 仍然能运行，由 `normalizeExecutorResult` 统一转换。

### 判断对象类型

```ts
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
```

解释：

运行时结果是 unknown，需要先判断是不是普通对象。数组不算普通对象，因为 `{ outputs: [...] }` 和 `{ context: ... }` 才是结构化返回。

### 判断多输出

```ts
const hasOutputs = (
  value: NodeExecutorResult,
): value is { outputs: NodeExecutionOutput[] } => {
  if (!isRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record.outputs);
};
```

解释：

Loop executor 会返回：

```ts
{ outputs: NodeExecutionOutput[] }
```

这段 helper 用来识别这种结果。

### 判断单输出

```ts
const hasContext = (
  value: NodeExecutorResult,
): value is NodeExecutionOutput => {
  if (!isRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return isRecord(record.context);
};
```

解释：

Condition 和 Switch 返回 `{ context, output }`。只要有 `context` 对象，就按单输出结果处理。

### 统一归一化

```ts
export const normalizeExecutorResult = (
  result: NodeExecutorResult,
): NodeExecutionOutput[] => {
  if (hasOutputs(result)) {
    return result.outputs.filter(
      (output): output is NodeExecutionOutput =>
        isRecord(output) && isRecord(output.context),
    );
  }

  if (hasContext(result)) {
    return [
      {
        context: result.context,
        output: typeof result.output === "string" ? result.output : undefined,
      },
    ];
  }

  return [
    {
      context: result as WorkflowContext,
    },
  ];
};
```

解释：

执行引擎不直接处理三种返回形态，而是统一变成数组：

```ts
NodeExecutionOutput[]
```

这让后续调度逻辑可以统一写成：

```txt
for output of outputs
  -> 找 output 对应的连接
  -> 执行下一节点
```

## 共享控制流 Realtime Channel

文件：

- `src/app/inngest/channels/control-flow.ts`
- `src/app/features/excutions/components/control-flow/actions.ts`

### Channel

```ts
export const CONTROL_FLOW_CHANNEL_NAME = "control-flow-execution";

export const controlFlowChannel = channel(CONTROL_FLOW_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
```

解释：

Condition、Switch、Loop、Transform、Error Handler 都属于控制流能力，因此共用一个 realtime channel。前端节点只需要订阅 `control-flow-execution/status`。

### Token Server Action

```ts
"use server";

export type ControlFlowToken = Realtime.Token<
  typeof controlFlowChannel,
  ["status"]
>;

export async function fetchControlFlowRealtimeToken(): Promise<ControlFlowToken> {
  return getSubscriptionToken(inngest, {
    channel: controlFlowChannel(),
    topics: ["status"],
  });
}
```

解释：

和 AI 节点一样，浏览器不能直接创建订阅 token，所以通过 Server Action 获取。

## 节点注册和选择器

文件：

- `src/app/config/initial-node.tsx`
- `src/components/node-selector.tsx`

### React Flow 节点注册

```ts
export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.TALLY_FORM_TRIGGER]: TallyTriggerNode,
  [NodeType.AI]: AiNode,
  [NodeType.CONDITION]: ConditionNode,
  [NodeType.SWITCH]: SwitchNode,
  [NodeType.LOOP]: LoopNode,
  [NodeType.TRANSFORM]: TransformNode,
  [NodeType.ERROR_HANDLER]: ErrorHandlerNode,
} as const satisfies NodeTypes;
```

解释：

React Flow 根据 `node.type` 找组件。数据库 enum、节点选择器和这里的映射必须一致，否则节点能保存但不能渲染。

### 节点选择器增加控制流节点

```ts
const executionNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP请求",
    description: "建立HTTP请求",
    icon: GlobeIcon,
  },
  {
    type: NodeType.AI,
    label: "AI",
    description: "调用 Qwen、DeepSeek 或 Gemini",
    icon: BotIcon,
  },
  {
    type: NodeType.TRANSFORM,
    label: "变量转换",
    description: "渲染模板并写入上下文变量",
    icon: PencilLineIcon,
  },
  {
    type: NodeType.CONDITION,
    label: "条件判断",
    description: "根据条件结果走 True 或 False",
    icon: GitBranchIcon,
  },
  {
    type: NodeType.SWITCH,
    label: "分支 Switch",
    description: "按多条规则选择一个输出分支",
    icon: RouteIcon,
  },
  {
    type: NodeType.LOOP,
    label: "循环",
    description: "遍历数组并为每一项执行 Loop 分支",
    icon: RepeatIcon,
  },
  {
    type: NodeType.ERROR_HANDLER,
    label: "错误处理",
    description: "Try 分支失败时转到 Catch 分支",
    icon: ShieldAlertIcon,
  },
];
```

解释：

这五个节点都放在 `executionNodes` 中，因为它们不会自己触发 workflow，而是在 workflow 启动后参与执行。

从产品语义看：

- Trigger node 回答“什么时候开始”。
- Execution/control node 回答“开始后做什么，以及怎么走”。

## 共享多输出节点外壳

文件：

- `src/app/features/excutions/components/control-flow/node-shell.tsx`

### Handle 配置类型

```ts
export type ControlFlowHandle = {
  id: string;
  label: string;
  top: string;
  tone?: "default" | "success" | "danger" | "warning";
};
```

解释：

控制流节点需要多个 source handle。这个类型描述每个输出点：

- `id` 会成为 React Flow edge 的 `sourceHandle`。
- `label` 显示在节点右侧。
- `top` 控制 handle 垂直位置。
- `tone` 控制颜色语义。

### Shell Props

```ts
interface ControlFlowNodeShellProps extends NodeProps {
  icon: LucideIcon;
  name: string;
  description?: string;
  status?: NodeStatus;
  outputHandles: ControlFlowHandle[];
  children?: ReactNode;
  onSettings?: () => void;
  onDoubleClick?: () => void;
}
```

解释：

不同控制流节点只需要传入 icon、名称、描述和输出 handle，就能获得一致的节点 UI。

为什么这样设计：

Condition、Switch、Loop、Error Handler 都是“左边一个输入，右边多个输出”。抽一个 shell 可以避免每个节点重复写删除逻辑、状态边框和 handle 渲染。

### 删除节点和相关边

```ts
const handleDelete = () => {
  setNodes((currentNodes) => currentNodes.filter((node) => node.id !== id));
  setEdges((currentEdges) =>
    currentEdges.filter((edge) => edge.source !== id && edge.target !== id),
  );
};
```

解释：

删除控制流节点时，也要删除所有连接到这个节点的边。否则画布上会留下指向不存在节点的 edge。

### 渲染输入 handle 和多个输出 handle

```tsx
<BaseHandle
  id="target-1"
  type="target"
  position={Position.Left}
/>
{outputHandles.map((handle) => (
  <div key={handle.id}>
    <span
      className="absolute right-5 -translate-y-1/2 whitespace-nowrap rounded-sm bg-background px-1 text-[10px] text-muted-foreground"
      style={{ top: handle.top }}
    >
      {handle.label}
    </span>
    <BaseHandle
      id={handle.id}
      type="source"
      position={Position.Right}
      className={cn(
        handleToneClassName[handle.tone ?? "default"],
      )}
      style={{ top: handle.top }}
    />
  </div>
))}
```

解释：

左侧固定一个输入 handle。右侧根据 `outputHandles` 动态渲染多个 source handle。React Flow 会把右侧 handle 的 `id` 写入 edge 的 `sourceHandle`。

这是前端实现分支的关键：用户从 `True` handle 拉线，保存后就是 `fromOutput = "true"`。

## 共享条件判断逻辑

文件：

- `src/app/features/excutions/components/control-flow/operators.ts`
- `src/app/features/excutions/components/control-flow/evaluate.ts`

### 操作符定义

```ts
export const comparisonOperators = [
  { value: "exists", label: "存在" },
  { value: "isEmpty", label: "为空" },
  { value: "equals", label: "等于" },
  { value: "notEquals", label: "不等于" },
  { value: "contains", label: "包含" },
  { value: "startsWith", label: "开头是" },
  { value: "endsWith", label: "结尾是" },
  { value: "greaterThan", label: "大于" },
  { value: "lessThan", label: "小于" },
  { value: "greaterOrEqual", label: "大于等于" },
  { value: "lessOrEqual", label: "小于等于" },
] as const;
```

解释：

这些操作符既用于前端 Select，也用于执行器判断。统一定义可以保证 UI 可选项和运行时可执行项一致。

### 类型和 zod enum 值

```ts
export type ComparisonOperator = (typeof comparisonOperators)[number]["value"];

export const comparisonOperatorValues = comparisonOperators.map(
  (operator) => operator.value,
) as [ComparisonOperator, ...ComparisonOperator[]];
```

解释：

`ComparisonOperator` 从数组推导，避免手写联合类型。`comparisonOperatorValues` 用于 `z.enum(...)`。

### 条件规则

```ts
export type ConditionRule = {
  label?: string;
  leftValue?: string;
  operator?: ComparisonOperator;
  rightValue?: string;
};
```

解释：

Condition 只有一条规则，Switch 有多条规则，所以抽成通用 `ConditionRule`。

### 判断是否需要右侧值

```ts
export const operatorsWithoutRightValue: ComparisonOperator[] = [
  "exists",
  "isEmpty",
];

export const needsRightValue = (operator?: ComparisonOperator) => {
  return operator ? !operatorsWithoutRightValue.includes(operator) : true;
};
```

解释：

`exists` 和 `isEmpty` 只需要左侧值，其他操作符需要右侧值。前端弹窗用它决定是否显示右侧输入框。

### 模板渲染

```ts
export const renderTemplate = (
  value: string | undefined,
  context: WorkflowContext,
) => {
  if (!value) {
    return "";
  }

  return Handlebars.compile(value)(context);
};
```

解释：

控制流节点同样支持 workflow context 模板。例如：

```txt
{{myApiCall.httpResponse.status}}
```

执行前会被渲染成真实值。

### 比较值

```ts
export const compareValues = (
  leftValue: string,
  operator: ComparisonOperator,
  rightValue = "",
) => {
  switch (operator) {
    case "exists":
      return !isEmpty(leftValue);
    case "isEmpty":
      return isEmpty(leftValue);
    case "equals":
      return leftValue === rightValue;
    case "notEquals":
      return leftValue !== rightValue;
    case "contains":
      return leftValue.includes(rightValue);
    case "startsWith":
      return leftValue.startsWith(rightValue);
    case "endsWith":
      return leftValue.endsWith(rightValue);
    case "greaterThan":
      return toNumber(leftValue) > toNumber(rightValue);
    case "lessThan":
      return toNumber(leftValue) < toNumber(rightValue);
    case "greaterOrEqual":
      return toNumber(leftValue) >= toNumber(rightValue);
    case "lessOrEqual":
      return toNumber(leftValue) <= toNumber(rightValue);
  }
};
```

解释：

所有比较先按字符串渲染，再按操作符判断。数值比较会用 `Number(...)` 转换；如果不是合法数字，比较结果会自然变成 false。

### 执行规则

```ts
export const evaluateRule = (rule: ConditionRule, context: WorkflowContext) => {
  if (!rule.leftValue || !rule.operator) {
    return false;
  }

  return compareValues(
    renderTemplate(rule.leftValue, context),
    rule.operator,
    renderTemplate(rule.rightValue, context),
  );
};
```

解释：

Switch executor 可以直接复用这段逻辑：按顺序执行每条规则，第一条返回 true 的规则就是命中的分支。

## Condition 节点

文件：

- `src/app/features/excutions/components/condition/node.tsx`
- `src/app/features/excutions/components/condition/dialog.tsx`
- `src/app/features/excutions/components/condition/executor.ts`

### 节点 UI

```tsx
<ControlFlowNodeShell
  {...props}
  id={props.id}
  icon={GitBranchIcon}
  name="条件判断"
  description={description}
  status={nodeStatus}
  outputHandles={[
    { id: "true", label: "True", top: "36%", tone: "success" },
    { id: "false", label: "False", top: "68%", tone: "danger" },
  ]}
  onSettings={handleOpenSettings}
  onDoubleClick={handleOpenSettings}
/>
```

解释：

Condition 节点有两个输出：

- `true`
- `false`

用户从哪个 handle 拉线，就决定该分支的后续节点。

### 配置描述

```ts
const description = props.data?.leftValue
  ? `${props.data.leftValue} ${props.data.operator || "equals"} ${props.data.rightValue || ""}`
  : "Not configured";
```

解释：

画布节点显示条件摘要，方便用户不打开弹窗也能看出当前判断逻辑。

### 表单 Schema

```ts
const formSchema = z.object({
  leftValue: z.string().trim().min(1, "请输入左侧表达式"),
  operator: z.enum(comparisonOperatorValues),
  rightValue: z.string().optional(),
});
```

解释：

Condition 必须有左侧值和操作符。右侧值是否需要，由 `needsRightValue(operator)` 决定 UI 展示，不在 schema 里强制。

### 右侧值条件展示

```ts
const operator = form.watch("operator");
const showRightValue = needsRightValue(operator);
```

```tsx
{showRightValue && (
  <FormField
    control={form.control}
    name="rightValue"
    render={({ field }) => (
      <FormItem>
        <FormLabel>右侧值</FormLabel>
        <FormControl>
          <Input placeholder="200" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

解释：

当操作符是 `exists` 或 `isEmpty` 时，不显示右侧输入框，减少用户误填。

### 执行器

```ts
export const conditionExecutor: NodeExecutor<ConditionData> = async ({
  data,
  nodeId,
  executionId,
  context,
  step,
  publish,
}) => {
  await publishStatus(publish, nodeId, "loading");

  if (!data.leftValue || !data.operator) {
    await publishStatus(publish, nodeId, "error");
    throw new NonRetriableError("Condition node: condition not configured");
  }

  const matched = await step.run(
    `condition-${executionId ?? nodeId}`,
    async () => {
      return compareValues(
        renderTemplate(data.leftValue, context),
        data.operator as ComparisonOperator,
        renderTemplate(data.rightValue, context),
      );
    },
  );

  await publishStatus(publish, nodeId, "success");

  return {
    context,
    output: matched ? "true" : "false",
  };
};
```

解释：

执行器做了三件事：

1. 发布 loading。
2. 渲染并比较左右值。
3. 返回 `output: "true"` 或 `output: "false"`。

这个 `output` 会和 edge 的 `sourceHandle` 对齐，从而选择后续分支。

## Switch 节点

文件：

- `src/app/features/excutions/components/switch/node.tsx`
- `src/app/features/excutions/components/switch/dialog.tsx`
- `src/app/features/excutions/components/switch/executor.ts`

### 节点输出

```tsx
outputHandles={[
  {
    id: "route-1",
    label: props.data?.rules?.[0]?.label || "规则 1",
    top: "24%",
    tone: "success",
  },
  {
    id: "route-2",
    label: props.data?.rules?.[1]?.label || "规则 2",
    top: "43%",
    tone: "success",
  },
  {
    id: "route-3",
    label: props.data?.rules?.[2]?.label || "规则 3",
    top: "62%",
    tone: "success",
  },
  {
    id: "fallback",
    label: props.data?.fallbackLabel || "Default",
    top: "81%",
    tone: "warning",
  },
]}
```

解释：

Switch 当前固定支持三条规则和一个默认分支。每条规则的 label 可以在弹窗里配置，并显示在 handle 旁边。

为什么先固定三条：

这样 UI 和 handle 布局稳定，保存结构也简单。后续如果需要动态规则数量，可以基于这个模型扩展。

### 至少一条规则

```ts
const formSchema = z
  .object({
    rules: z.array(ruleSchema).length(3),
    fallbackLabel: z.string().optional(),
  })
  .refine(
    (data) =>
      data.rules.some((rule) => rule.leftValue?.trim() && rule.operator),
    {
      message: "至少配置一条分支规则",
      path: ["rules"],
    },
  );
```

解释：

Switch 可以有空规则，但至少要配置一条可执行规则，否则它只会永远走 fallback，用户通常不是这个意图。

### 默认值

```ts
const emptyRule = {
  label: "",
  leftValue: "",
  operator: "equals" as const,
  rightValue: "",
};

const getDefaultValues = (data?: SwitchDialogData): SwitchFormValues => ({
  rules: [0, 1, 2].map((index) => ({
    ...emptyRule,
    ...(data?.rules?.[index] || {}),
  })),
  fallbackLabel: data?.fallbackLabel || "Default",
});
```

解释：

即使旧数据没有三条规则，也会补齐成三条，保证表单和节点 handle 数量一致。

### 提交时补 label

```ts
const handleSubmit = form.handleSubmit((values) => {
  onSubmit({
    rules: values.rules.map((rule, index) => ({
      label: rule.label?.trim() || `规则 ${index + 1}`,
      leftValue: rule.leftValue?.trim() || "",
      operator: rule.operator,
      rightValue: rule.rightValue?.trim() || "",
    })),
    fallbackLabel: values.fallbackLabel?.trim() || "Default",
  });
  onOpenChange(false);
});
```

解释：

用户不填规则名称时，自动使用 `规则 1`、`规则 2`、`规则 3`。这样节点右侧 handle 始终有可读 label。

### 执行器

```ts
export const switchExecutor: NodeExecutor<SwitchData> = async ({
  data,
  nodeId,
  executionId,
  context,
  step,
  publish,
}) => {
  await publishStatus(publish, nodeId, "loading");

  const rules = data.rules || [];
  if (!rules.some((rule) => rule.leftValue && rule.operator)) {
    await publishStatus(publish, nodeId, "error");
    throw new NonRetriableError("Switch node: no rules configured");
  }

  const output = await step.run(`switch-${executionId ?? nodeId}`, async () => {
    const matchedIndex = rules.findIndex((rule) => evaluateRule(rule, context));

    return matchedIndex >= 0 ? `route-${matchedIndex + 1}` : "fallback";
  });

  await publishStatus(publish, nodeId, "success");

  return {
    context,
    output,
  };
};
```

解释：

Switch 按规则顺序判断，命中第一条就输出对应 route。没有命中时输出 `fallback`。

这意味着规则顺序很重要：

```txt
rule 1 优先级最高
rule 2 次之
rule 3 再次
fallback 最后
```

## Loop 节点

文件：

- `src/app/features/excutions/components/loop/node.tsx`
- `src/app/features/excutions/components/loop/dialog.tsx`
- `src/app/features/excutions/components/loop/executor.ts`

### 节点输出

```tsx
outputHandles={[
  { id: "loop", label: "Loop", top: "36%", tone: "success" },
  { id: "done", label: "Done", top: "68%", tone: "warning" },
]}
```

解释：

Loop 有两个分支：

- `loop`：每个数组 item 都执行一次。
- `done`：所有 item 处理完以后执行一次。

### 表单 Schema

```ts
const variableNameSchema = z
  .string()
  .min(1, "变量名不能为空")
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
    message: "变量名只能包含字母、数字、下划线和 $，且不能以数字开头",
  });

const formSchema = z.object({
  itemsExpression: z.string().trim().min(1, "请输入数组表达式"),
  itemVariableName: variableNameSchema,
  indexVariableName: variableNameSchema,
  maxItems: z.number().int().min(1).max(1000),
});
```

解释：

Loop 配置包括：

- `itemsExpression`：渲染后必须是 JSON 数组。
- `itemVariableName`：当前项变量名，默认 `item`。
- `indexVariableName`：当前索引变量名，默认 `index`。
- `maxItems`：最大循环次数，防止一次执行无限展开。

### 表单输入数组表达式

```tsx
<Input
  placeholder="{{json myApiCall.httpResponse.data}}"
  {...field}
/>
```

解释：

推荐使用 `{{json someArray}}`，这样 Handlebars 渲染后仍然是可 `JSON.parse` 的数组字符串。

### 执行器解析数组

```ts
const rendered = renderTemplate(data.itemsExpression, context);
const parsed = JSON.parse(rendered);

if (!Array.isArray(parsed)) {
  throw new NonRetriableError(
    "Loop node: expression must resolve to an array",
  );
}
```

解释：

Loop executor 不直接读取对象路径，而是读取一个模板表达式。这样它可以遍历任意上游节点生成的数组，只要最终能渲染成 JSON array。

### 生成多输出

```ts
const items = parsed.slice(0, maxItems);
const loopOutputs: NodeExecutionOutput[] = items.map((item, index) => ({
  output: "loop",
  context: {
    ...context,
    [itemVariableName]: item,
    [indexVariableName]: index,
  },
}));

return [
  ...loopOutputs,
  {
    output: "done",
    context: {
      ...context,
      [`${itemVariableName}Count`]: items.length,
    },
  },
];
```

解释：

如果数组有 3 项，Loop 会返回 4 个输出：

```txt
loop with item 0
loop with item 1
loop with item 2
done with itemCount = 3
```

每个 loop 输出都有自己的 context，里面注入当前 `item` 和 `index`。

### 返回 outputs

```ts
return { outputs };
```

解释：

Loop 不能只返回一个 `{ context, output }`，因为它需要让后续 `loop` 分支执行多次。所以使用多输出形态。

## Transform 节点

文件：

- `src/app/features/excutions/components/transform/node.tsx`
- `src/app/features/excutions/components/transform/dialog.tsx`
- `src/app/features/excutions/components/transform/executor.ts`

### 节点 UI

```tsx
<BaseExecutionNode
  {...props}
  id={props.id}
  icon={PencilLineIcon}
  status={nodeStatus}
  name="变量转换"
  description={description}
  onSettings={handleOpenSettings}
  onDoubleClick={handleOpenSettings}
/>
```

解释：

Transform 是普通单输出执行节点，不需要多个 handle，因此复用 `BaseExecutionNode`，而不是 `ControlFlowNodeShell`。

### 表单 Schema

```ts
const valueTypes = ["text", "json", "number", "boolean"] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "变量名不能为空")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "变量名只能包含字母、数字、下划线和 $，且不能以数字开头",
    }),
  valueType: z.enum(valueTypes),
  value: z.string().min(1, "请输入变量值"),
});
```

解释：

Transform 把一个模板渲染结果写入 context，并支持转换成文本、JSON、数字或布尔值。

### 输出类型选择

```tsx
<SelectContent>
  <SelectItem value="text">文本</SelectItem>
  <SelectItem value="json">JSON</SelectItem>
  <SelectItem value="number">数字</SelectItem>
  <SelectItem value="boolean">布尔</SelectItem>
</SelectContent>
```

解释：

前端明确让用户选择输出类型，避免后续节点拿到的全是字符串。

### 类型转换

```ts
const castValue = (value: string, valueType: TransformData["valueType"]) => {
  switch (valueType) {
    case "json":
      return JSON.parse(value);
    case "number": {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new NonRetriableError("Transform node: value is not a number");
      }
      return parsed;
    }
    case "boolean":
      return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
    default:
      return value;
  }
};
```

解释：

- `json` 用 `JSON.parse`。
- `number` 要保证是有限数字。
- `boolean` 支持 `true/1/yes/y`。
- 默认保持字符串。

### 写入 context

```ts
const nextValue = await step.run(
  `transform-${executionId ?? nodeId}`,
  async () => {
    const rendered = renderTemplate(data.value, context);
    return castValue(rendered, data.valueType || "text");
  },
);

await publishStatus(publish, nodeId, "success");

return {
  ...context,
  [data.variableName]: nextValue,
};
```

解释：

Transform 的本质是“声明一个新变量”。例如配置：

```txt
variableName = statusCode
valueType = number
value = {{myApiCall.httpResponse.status}}
```

下游节点就可以用：

```txt
{{statusCode}}
```

## Error Handler 节点

文件：

- `src/app/features/excutions/components/error-handler/node.tsx`
- `src/app/features/excutions/components/error-handler/dialog.tsx`
- `src/app/features/excutions/components/error-handler/executor.ts`

### 节点输出

```tsx
outputHandles={[
  { id: "try", label: "Try", top: "36%", tone: "success" },
  { id: "catch", label: "Catch", top: "68%", tone: "danger" },
]}
```

解释：

Error Handler 有两个分支：

- `try`：正常执行路径。
- `catch`：try 分支中的任意节点失败后执行。

### 错误变量表单

```ts
const formSchema = z.object({
  errorVariableName: z
    .string()
    .min(1, "错误变量名不能为空")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "变量名只能包含字母、数字、下划线和 $，且不能以数字开头",
    }),
});
```

解释：

Catch 分支需要读取错误信息，所以用户可以配置错误变量名，默认是 `error`。

### 表单提示

```tsx
<FormDescription>
  Catch 分支中可通过 {`{{${errorVariableName}.message}}`}{" "}
  访问错误。
</FormDescription>
```

解释：

这告诉用户 catch 分支如何使用错误对象，例如：

```txt
{{error.message}}
{{error.name}}
```

### Error Handler executor

```ts
export const errorHandlerExecutor: NodeExecutor<ErrorHandlerData> = async ({
  nodeId,
  context,
  publish,
}) => {
  await publishStatus(publish, nodeId, "loading");

  return {
    context,
    output: "try",
  };
};
```

解释：

Error Handler 自己不执行 try/catch 逻辑。它只声明先走 `try` 输出。真正捕获异常的是 Inngest 调度器里的 `executeErrorHandler`。

为什么不把 try/catch 写在 executor 里：

executor 只知道当前节点，不知道它后面连了哪些节点。try/catch 必须由全局执行引擎根据图结构来处理。

## 执行器注册

文件：

- `src/app/features/excutions/lib/executor-registy.ts`

```ts
const executorRegistry = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.TALLY_FORM_TRIGGER]: tallyTriggerExecutor,
  [NodeType.AI]: aiExecutor,
  [NodeType.CONDITION]: conditionExecutor,
  [NodeType.SWITCH]: switchExecutor,
  [NodeType.LOOP]: loopExecutor,
  [NodeType.TRANSFORM]: transformExecutor,
  [NodeType.ERROR_HANDLER]: errorHandlerExecutor,
} satisfies Record<NodeType, NodeExecutor<never>>;
```

解释：

所有节点类型都注册到同一个 registry。Inngest 执行引擎只调用：

```ts
const executor = getExecutor(node.type);
```

这样调度器不需要知道每个节点内部如何执行。

## 普通节点适配 executionId

文件：

- `src/app/features/excutions/components/http-request/executor.tsx`
- `src/app/features/excutions/components/ai/executor.ts`
- `src/app/features/trigger/components/manual-trigger/executor.tsx`
- `src/app/features/trigger/components/tally-trigger/executor.tsx`

### HTTP Request step key

```ts
const result = await step.run(
  `http-request-${executionId ?? nodeId}`,
  async () => {
    // ...
  },
);
```

### AI step key

```ts
const result = await step.run(
  `ai-generate-text-${executionId ?? nodeId}`,
  async () => {
    // ...
  },
);
```

### Trigger step key

```ts
const result = await step.run(
  `manual-trigger-${executionId ?? nodeId}`,
  async () => context,
);
```

解释：

023 之前这些节点用固定 `nodeId` 作为 step key。引入 Loop 后，同一个节点可能在多次迭代中执行。如果 step key 不变，Inngest 会认为这是同一个 step，导致复用之前的结果。

`executionId ?? nodeId` 保留了兼容性：

- 新递归调度会传 `executionId`。
- 如果某个地方没传，仍然回退到 `nodeId`。

## Inngest 执行引擎升级

文件：

- `src/app/inngest/functions.ts`

这是 023 最核心的变化。

### 引入控制流 channel

```ts
channels: [
  httpRequestChannel(),
  manualTriggerChannel(),
  tallyTriggerChannel(),
  aiChannel(),
  controlFlowChannel(),
],
```

解释：

执行 Condition、Switch、Loop、Transform、Error Handler 时，需要向前端发布状态，所以 Inngest function 要声明 `controlFlowChannel()`。

### 定义 trigger roots

```ts
const triggerNodeTypes = new Set<NodeType>([
  NodeType.INITIAL,
  NodeType.MANUAL_TRIGGER,
  NodeType.TALLY_FORM_TRIGGER,
]);
```

解释：

workflow 的入口优先是 trigger 节点。没有 trigger 时，才使用没有入边的图根节点。

### RuntimeNode 和 RuntimeConnection

```ts
type RuntimeNode = Pick<WorkflowNode, "id" | "type" | "data" | "credentialId">;

type RuntimeConnection = Pick<
  Connection,
  "id" | "fromNodeId" | "toNodeId" | "fromOutput" | "toInput"
>;
```

解释：

执行时只需要这些字段。把 Prisma 返回对象裁剪成轻量结构，可以让调度逻辑更明确。

### 合并节点 data 和 credentialId

```ts
const getNodeData = (node: RuntimeNode): Record<string, unknown> => ({
  ...((node.data as Record<string, unknown>) || {}),
  ...(node.credentialId ? { credentialId: node.credentialId } : {}),
});
```

解释：

延续 022 的设计：数据库里 `credentialId` 是独立字段，执行器收到的是合并后的 `data`。

### 根据 output 选择连接

```ts
const getSelectedConnections = (
  connections: RuntimeConnection[],
  output?: string,
) => {
  if (!output) {
    return connections;
  }

  return connections.filter((connection) => connection.fromOutput === output);
};
```

解释：

普通节点没有 output，就走所有出边。控制流节点有 output，就只走匹配 `fromOutput` 的边。

这是 runtime 分支选择的核心代码。

### 错误序列化

```ts
const serializeWorkflowError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
};
```

解释：

Catch 分支要把错误写入 context。直接放 `Error` 对象不可控，所以序列化成普通对象，便于模板访问和 JSON 化。

### 准备 workflow 图数据

```ts
const workflow = await step.run("prepare-workflow", async () => {
  const workflow = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: {
      nodes: true,
      connections: true,
    },
  });

  return {
    nodes: topologicalSort(workflow.nodes, workflow.connections).map(
      (node) => ({
        id: node.id,
        type: node.type,
        data: node.data,
        credentialId: node.credentialId,
      }),
    ),
    connections: workflow.connections.map((connection) => ({
      id: connection.id,
      fromNodeId: connection.fromNodeId,
      toNodeId: connection.toNodeId,
      fromOutput: connection.fromOutput,
      toInput: connection.toInput,
    })),
  };
});
```

解释：

这里仍然调用 `topologicalSort`，但用途变了：

- 022：排序结果就是执行顺序。
- 023：排序结果主要用于稳定节点列表和提前发现环。

真正执行顺序由递归图遍历决定。

### 构建 nodeMap 和 outgoingConnections

```ts
const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]));
const outgoingConnections = new Map<string, RuntimeConnection[]>();
const incomingNodeIds = new Set<string>();

for (const connection of workflow.connections) {
  incomingNodeIds.add(connection.toNodeId);
  const current = outgoingConnections.get(connection.fromNodeId) || [];
  current.push(connection);
  outgoingConnections.set(connection.fromNodeId, current);
}
```

解释：

递归执行时需要快速知道：

- 某个 `nodeId` 对应哪个 node。
- 某个 node 有哪些出边。
- 哪些节点有入边，用来计算 graph roots。

### 选择 roots

```ts
const graphRoots = workflow.nodes.filter(
  (node) => !incomingNodeIds.has(node.id),
);
const triggerRoots = workflow.nodes.filter((node) =>
  triggerNodeTypes.has(node.type),
);
const roots = triggerRoots.length > 0 ? triggerRoots : graphRoots;
```

解释：

优先从 trigger 节点开始执行，因为 workflow 语义上应该由触发器启动。如果没有 trigger，才从无入边节点开始，方便测试或兼容已有画布。

### 初始化 context

```ts
const initialContext = (
  event.data.initialData && typeof event.data.initialData === "object"
    ? event.data.initialData
    : {}
) as WorkflowContext;
```

解释：

Tally webhook 触发时会传入 `initialData`。这里保证初始 context 一定是对象。

## 递归执行节点

文件：

- `src/app/inngest/functions.ts`

### executeNode 函数签名

```ts
const executeNode = async (
  nodeId: string,
  context: WorkflowContext,
  executionId: string,
  path: string[],
): Promise<WorkflowContext> => {
```

解释：

参数含义：

- `nodeId`：当前要执行的节点。
- `context`：当前路径上的上下文。
- `executionId`：当前路径的唯一执行 ID，用于 Inngest step key。
- `path`：已经经过的节点，用于检测循环。

### 检测环

```ts
if (path.includes(nodeId)) {
  throw new NonRetriableError("Workflow contains a cycle");
}
```

解释：

当前执行引擎不允许用户画出闭环。Loop 节点本身通过多 outputs 实现循环语义，不依赖图结构回边。

### Error Handler 特殊分派

```ts
if (node.type === NodeType.ERROR_HANDLER) {
  return executeErrorHandler(node, context, executionId, path);
}
```

解释：

Error Handler 需要执行 try 分支并捕获 try 分支内部错误。这个逻辑必须由调度器处理，所以在普通 executor 逻辑前单独分派。

### 执行普通节点并归一化结果

```ts
const executor = getExecutor(node.type);
const outputs = normalizeExecutorResult(
  await executor({
    data: getNodeData(node),
    nodeId: node.id,
    executionId,
    context,
    step,
    publish,
  }),
);
```

解释：

无论 executor 返回 `context`、`{ context, output }` 还是 `{ outputs }`，这里都会变成 `NodeExecutionOutput[]`。

### 根据 output 递归执行后续节点

```ts
let finalContext = context;
for (const [outputIndex, output] of outputs.entries()) {
  finalContext = output.context;
  const nextConnections = getSelectedConnections(
    outgoingConnections.get(node.id) || [],
    output.output,
  );

  for (const [connectionIndex, connection] of nextConnections.entries()) {
    finalContext = await executeNode(
      connection.toNodeId,
      output.context,
      `${executionId}-${outputIndex}-${connectionIndex}-${connection.toNodeId}`,
      [...path, nodeId],
    );
  }
}

return finalContext;
```

解释：

这段是 023 的分支执行核心：

1. 遍历 executor 产出的每个 output。
2. 用 `output.output` 过滤当前节点的出边。
3. 对每条匹配边递归执行目标节点。
4. 生成新的 executionId，保证每条路径唯一。

对于 Condition：

```txt
outputs = [{ context, output: "true" }]
只走 true handle
```

对于 Loop：

```txt
outputs = [
  { context: item0Context, output: "loop" },
  { context: item1Context, output: "loop" },
  { context: doneContext, output: "done" },
]
loop 分支执行两次，done 分支执行一次
```

## Error Handler 执行逻辑

文件：

- `src/app/inngest/functions.ts`

### 执行 Error Handler 节点本身

```ts
const executor = getExecutor(node.type);
const nodeData = getNodeData(node);
const outputs = normalizeExecutorResult(
  await executor({
    data: nodeData,
    nodeId: node.id,
    executionId,
    context,
    step,
    publish,
  }),
);
const baseContext = outputs[0]?.context || context;
```

解释：

Error Handler executor 会发布 loading，并返回 `output: "try"`。调度器拿到 base context 后，开始执行 try/catch 分支。

### 拆分 Try 和 Catch 连接

```ts
const connections = outgoingConnections.get(node.id) || [];
const tryConnections = connections.filter(
  (connection) => connection.fromOutput === "try",
);
const catchConnections = connections.filter(
  (connection) => connection.fromOutput === "catch",
);
```

解释：

Error Handler 的两个 source handle 分别对应两组边。调度器需要单独处理。

### 错误变量名

```ts
const errorVariableName =
  typeof nodeData.errorVariableName === "string" &&
  nodeData.errorVariableName
    ? nodeData.errorVariableName
    : "error";
```

解释：

如果用户没配置错误变量名，就默认写到 `context.error`。

### 执行 Try 分支

```ts
try {
  let finalContext = baseContext;
  for (const [connectionIndex, connection] of tryConnections.entries()) {
    finalContext = await executeNode(
      connection.toNodeId,
      baseContext,
      `${executionId}-try-${connectionIndex}-${connection.toNodeId}`,
      [...path, node.id],
    );
  }

  await publish(
    controlFlowChannel().status({
      nodeId: node.id,
      status: "success",
    }),
  );

  return finalContext;
}
```

解释：

Try 分支全部成功时，Error Handler 节点状态变成 success，并返回 try 分支最终 context。

### Try 失败且没有 Catch

```ts
catch (error) {
  if (catchConnections.length === 0) {
    await publish(
      controlFlowChannel().status({
        nodeId: node.id,
        status: "error",
      }),
    );
    throw error;
  }
```

解释：

如果 try 分支失败，但用户没有连 catch 分支，错误继续向外抛出，workflow 失败。

### 写入错误对象并执行 Catch

```ts
const catchContext = {
  ...baseContext,
  [errorVariableName]: serializeWorkflowError(error),
};

try {
  let finalContext = catchContext;

  for (const [
    connectionIndex,
    connection,
  ] of catchConnections.entries()) {
    finalContext = await executeNode(
      connection.toNodeId,
      catchContext,
      `${executionId}-catch-${connectionIndex}-${connection.toNodeId}`,
      [...path, node.id],
    );
  }

  await publish(
    controlFlowChannel().status({
      nodeId: node.id,
      status: "success",
    }),
  );

  return finalContext;
}
```

解释：

Catch 分支会拿到一个新的 context：

```ts
{
  ...baseContext,
  error: {
    name,
    message,
    stack
  }
}
```

后续节点可以用 `{{error.message}}` 通知用户或写入日志。

### Catch 也失败

```ts
catch (catchError) {
  await publish(
    controlFlowChannel().status({
      nodeId: node.id,
      status: "error",
    }),
  );

  throw catchError;
}
```

解释：

如果 Catch 分支自己也失败，Error Handler 变成 error，并继续抛出 catch 分支错误。

## 根节点执行

文件：

- `src/app/inngest/functions.ts`

```ts
let context = initialContext;
for (const [rootIndex, root] of roots.entries()) {
  context = await executeNode(
    root.id,
    initialContext,
    `root-${rootIndex}-${root.id}`,
    [],
  );
}

return {
  workflowId,
  result: context,
};
```

解释：

执行引擎从每个 root 开始递归执行。`rootIndex` 进入 executionId，保证多入口时 step key 不冲突。

注意这里每个 root 都从 `initialContext` 开始执行，最后一个 root 的结果会成为最终返回值。这个行为适合当前以单 trigger 为主的设计；如果后续支持多个并行 root 合并结果，需要专门定义 context merge 策略。

## sendWorkflowExecution 调整

文件：

- `src/app/inngest/utils.ts`

```ts
export const sendWorkflowExecution = async (data: {
  workflowId: string;
  [key: string]: any;
}) => {
  return inngest.send({
    name: "workflows/execute.workflow",
    data,
  });
};
```

解释：

之前函数签名固定为 `workflowId + initialData`。023 改成更宽松的 data 对象，方便不同触发器传入不同字段。

从前端/触发器角度看，这让 Tally webhook、手动触发、未来更多 trigger 可以复用同一个发送函数。

## 典型执行示例

### Condition 示例

画布：

```txt
HTTP Request
  -> Condition
       true  -> AI
       false -> Transform
```

Condition 配置：

```txt
leftValue = {{api.httpResponse.status}}
operator = equals
rightValue = 200
```

运行逻辑：

```txt
HTTP Request 写入 context.api
Condition 渲染 status
status === "200"
  -> output = "true"
  -> 只执行 True handle 连到的 AI
```

### Switch 示例

画布：

```txt
Switch
  route-1  -> VIP 流程
  route-2  -> 企业客户流程
  route-3  -> 普通客户流程
  fallback -> 默认流程
```

Switch 执行器按顺序找第一条命中规则：

```txt
命中第 1 条 -> output = route-1
命中第 2 条 -> output = route-2
命中第 3 条 -> output = route-3
都没命中 -> output = fallback
```

### Loop 示例

Loop 配置：

```txt
itemsExpression = {{json users}}
itemVariableName = user
indexVariableName = index
maxItems = 100
```

如果 `users` 有 2 项，会产生：

```txt
loop context: { user: users[0], index: 0 }
loop context: { user: users[1], index: 1 }
done context: { userCount: 2 }
```

`loop` 分支会执行两次，`done` 分支执行一次。

### Error Handler 示例

画布：

```txt
Error Handler
  try   -> HTTP Request
  catch -> Transform / 通知节点
```

如果 HTTP Request 抛错：

```txt
executeErrorHandler catch
  -> context.error = { name, message, stack }
  -> 执行 catch 分支
```

## 设计总结

023 的关键设计是把“节点执行结果”从单一 context 扩展成“context + output”。前端通过多个 source handle 表达可选分支，服务端把 handle ID 存成 `Connection.fromOutput`，执行器返回同名 output，Inngest 调度器据此选择下一条边。

这让几个能力可以在同一套架构下实现：

- Condition 用 `true/false` 表达二分支。
- Switch 用 `route-x/fallback` 表达多分支。
- Loop 用多个 `{ output: "loop" }` 表达重复执行。
- Transform 继续作为普通单输出节点写 context。
- Error Handler 由调度器特殊处理 try/catch 图结构。

相对于 022 的线性执行，023 最大的变化是执行顺序不再等于拓扑排序结果，而是由递归调度器根据每个节点的输出动态决定。
