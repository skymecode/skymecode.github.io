---
title: "Smart Flow 031：编辑器 UI 全面改造"
icon: "pen-ruler"
date: 2026-07-15
category:
  - "前端"
tag:
  - "Smart Flow"
  - "Workflow"
  - "React Flow"
  - "UI"
star: true
---

# 031: 编辑器 UI 全面改造

> 作者：skymecode

---

## 一、改造背景

之前的编辑器右侧边栏是用"检查器"的方式工作的：点击节点后会弹出一个对话框来配置。但这种方式有几个问题：

1. **操作不直观**：用户需要先点击节点，再在弹出的对话框中配置，然后关闭对话框，步骤太多
2. **上下文切换**：对话框会遮挡画布，用户无法同时看到节点和配置
3. **功能受限**：对话框空间有限，无法展示复杂的配置项

参考了 `browser-automation-app` 项目的设计，我们决定把右侧边栏改成一个"编辑器"，直接在边栏里编辑节点配置，就像在 Word 里编辑文档一样。这样用户可以一边看到画布上的节点，一边编辑配置，操作更加流畅。

---

## 二、主要改动概览

| 文件                          | 改动类型 | 说明                              |
| ----------------------------- | -------- | --------------------------------- |
| `package.json`                | 修改     | 升级 @xyflow/react 到新版本       |
| `base-handle.tsx`             | 修改     | 调整节点连接点样式和位置          |
| `node-registry.ts`            | 修改     | 给每个节点添加了可编辑字段定义    |
| `node-editor.tsx`             | 新建     | 动态渲染节点配置表单的组件        |
| `use-upstream-connections.ts` | 新建     | 获取上游节点输出变量的 Hook       |
| `right-sidebar.tsx`           | 重构     | 增加编辑器标签页，重写工具栏按钮  |
| `editor.tsx`                  | 修改     | 用 ReactFlowProvider 包裹整个布局 |
| `layout.tsx`                  | 修改     | 限制页面高度为视口高度            |

---

## 三、详细改动说明

### 3.1 升级 ReactFlow 到新版本

**文件：** `package.json`

**为什么改：** 之前的 ReactFlow 版本比较旧，存在一些已知问题。我当时面临几个选择：

| 选择           | 优点                               | 缺点                                   |
| -------------- | ---------------------------------- | -------------------------------------- |
| 继续使用旧版本 | 不需要改动代码                     | 连接点样式不好看，缺少新功能，性能较差 |
| 升级到最新版本 | 更好的性能，更多新功能，样式更美观 | 需要改动一些代码适配新 API             |

最终选择升级，因为：

1. `browser-automation-app` 使用的是新版本，保持项目间一致性很重要
2. 新版本的连接点（handle）样式更圆润，不需要我们自己写太多 CSS
3. 新版本提供了更多实用的 Hook 和工具函数，比如 `useStore`、`getIncomers` 等
4. 新版本修复了一些已知的 bug，比如节点拖拽时的卡顿问题

**升级命令：**

```bash
npm install @xyflow/react@latest
```

**升级后需要注意的变化：**

- `ReactFlow` 组件的 props 有一些变化，比如 `defaultEdgeOptions` 改成了 `edgeOptions`
- `useReactFlow` 返回的函数名有变化，比如 `setNodes` 改成了 `setNodes`（这个没改）
- 连接点的默认样式有变化，我们需要重新调整 CSS

---

### 3.2 修改节点连接点样式

**文件：** `src/components/react-flow/base-handle.tsx`

**为什么改：** 之前的连接点样式有两个问题：

1. **位置不对**：连接点放在节点内部，被节点的 padding 挡住了，导致用户很难连接节点
2. **样式不好看**：连接点太小，没有边框，不容易被用户发现

参考 `browser-automation-app` 的设计，我们把连接点移到了节点的边缘。

**核心改动：**

```tsx
// 之前的连接点（在节点内部）
<div className="absolute w-3 h-3 rounded-full border-2">
  {/* ... */}
</div>

// 现在的连接点（在节点边缘）
<div
  className="absolute w-4 h-4 rounded-full border-2 -z-10"
  style={{
    transform: type === "source" ? "translate(100%, -50%)" : "translate(-100%, -50%)",
  }}
>
  {/* ... */}
</div>
```

**为什么选择这些 CSS 属性：**

- `w-4 h-4`：把连接点从 `w-3 h-3`（12px）改成 `w-4 h-4`（16px），更大更容易点击
- `rounded-full`：圆形连接点，这是行业标准的设计
- `border-2`：给连接点加了边框，使其更明显，用户更容易看到
- `-z-10`：让连接点在节点后面，不会遮挡节点内容
- `transform: translate(100%, -50%)`：
  - `translate(100%, 0)` 会把元素向右移动自身宽度的 100%，也就是移到元素右边
  - `translate(0, -50%)` 会把元素向上移动自身高度的 50%，也就是垂直居中
  - 所以 `translate(100%, -50%)` 就是把连接点移到节点右侧边缘，并且垂直居中
- `transform: translate(-100%, -50%)`：同理，把连接点移到节点左侧边缘，垂直居中

**为什么不用其他方案：**

我也考虑过其他方案，比如：

- **用 margin 代替 transform**：`margin-left: 100%`，但 margin 会影响布局，可能导致节点宽度变化
- **用 position 配合 left/right**：`left: 100%`，但需要知道节点的实际宽度，不够灵活
- **用 flex 布局**：把节点和连接点放在一个 flex 容器里，但这样会改变节点的结构

最终选择 `transform`，因为：

1. `transform` 不会影响其他元素的布局，是最安全的方式
2. `transform` 性能更好，浏览器会用 GPU 加速渲染
3. `transform` 代码更简洁，一行就能实现想要的效果

**修改后的效果：**

- 输出连接点（source）在节点右侧边缘
- 输入连接点（target）在节点左侧边缘
- 用户可以轻松地从一个节点拖到另一个节点

---

### 3.3 给节点注册器添加字段定义

**文件：** `src/app/features/editor/node-registry.ts`

**为什么改：** 之前的节点注册器只定义了节点的基本信息（名称、图标、颜色），没有定义每个节点有哪些配置项。这导致编辑器不知道该渲染什么表单字段。

我需要设计一个数据结构，让编辑器能够：

1. 知道每个节点类型有哪些字段
2. 知道每个字段是什么类型（文本、下拉、数字等）
3. 知道每个字段的标签、占位符、是否必填等信息

**设计决策过程：**

我一开始考虑过几种方案：

| 方案                   | 优点                 | 缺点                                       |
| ---------------------- | -------------------- | ------------------------------------------ |
| 在组件内部硬编码字段   | 简单直接             | 每个节点组件都要写一遍，代码重复，维护困难 |
| 用 JSON 配置文件       | 易于维护             | 没有类型检查，容易出错                     |
| 用 TypeScript 接口定义 | 有类型检查，结构清晰 | 需要学习 TypeScript 接口语法               |

最终选择用 TypeScript 接口定义，因为：

1. TypeScript 接口可以提供类型检查，防止写错字段名或字段类型
2. 接口可以继承和扩展，方便后续添加新的字段类型
3. 代码结构清晰，其他开发者可以很容易理解

**新增的类型：**

```typescript
// 字段类型：文本输入、多行文本、下拉选择、数字输入
export type NodeFieldType = "text" | "textarea" | "select" | "number";

// 字段定义接口
export interface NodeField {
  key: string; // 字段名（用来存储数据）
  label: string; // 显示在表单上的标签
  type: NodeFieldType; // 输入类型
  required?: boolean; // 是否必填（可选，默认 false）
  placeholder?: string; // 占位提示文字（可选）
  options?: { value: string; label: string }[]; // 下拉选项（只有 select 类型需要）
  defaultValue?: string; // 默认值（可选）
}

// 输出变量定义（上游节点可以提供的变量）
export interface NodeOutput {
  path: string; // 变量路径，如 "httpResponse.data"
  label: string; // 显示名称
}
```

**为什么这样设计字段接口：**

- `key: string`：用字符串作为字段名，这样可以用 `data[key]` 的方式存储和读取数据，非常灵活
- `label: string`：显示给用户看的标签，需要友好的中文名称
- `type: NodeFieldType`：字段类型决定了渲染什么输入组件，比如 `"select"` 类型就渲染下拉框
- `required?: boolean`：可选属性，默认 `false`，这样不需要为每个字段都写 `required: false`
- `options?: { value: string; label: string }[]`：只有 `select` 类型需要这个属性，所以也是可选的
- `defaultValue?: string`：默认值，用户打开编辑器时会显示这个值

**给 AI 节点添加的字段示例：**

```typescript
[NodeType.AI]: {
  // ... 原有信息（label、icon、accent）
  fields: [
    { key: "variableName", label: "Variable Name", type: "text", required: true },
    { key: "provider", label: "Provider", type: "select", required: true, options: [
      { value: "QWEN", label: "Qwen" },
      { value: "DEEPSEEK", label: "DeepSeek" },
      { value: "GEMINI", label: "Gemini" },
      { value: "OPENAI_COMPATIBLE", label: "OpenAI Compatible" },
    ]},
    { key: "model", label: "Model", type: "text", required: true },
    { key: "credentialId", label: "Credential ID", type: "text" },
    { key: "prompt", label: "Prompt", type: "textarea", required: true },
    { key: "temperature", label: "Temperature", type: "number", defaultValue: "0.7" },
    { key: "maxOutputTokens", label: "Max Output Tokens", type: "number", defaultValue: "2048" },
  ],
  outputs: [
    { path: "text", label: "文本输出" },
    { path: "usage", label: "Token 用量" },
  ],
}
```

**为什么字段顺序这么排：**

字段顺序很重要，应该按照用户填写的逻辑顺序排列：

1. **基本信息**：Variable Name（变量名）- 这是最基础的，每个节点都需要
2. **配置信息**：Provider、Model、Credential ID - 这些是 AI 服务的基本配置
3. **核心功能**：Prompt - 这是 AI 节点最重要的配置
4. **高级配置**：Temperature、Max Output Tokens - 这些是高级选项，放在后面

这样用户填写时会很自然，不需要来回切换。

**技术要点：**

- 用 TypeScript 的 `interface` 定义数据结构，确保类型安全
- 用 `enum` 一样的 `Record<string, ...>` 存储每个节点类型的配置
- 这样编辑器就可以通过 `nodeRegistry[nodeType].fields` 获取所有可编辑字段

---

### 3.4 创建节点编辑器组件

**文件：** `src/app/features/editor/components/node-editor.tsx`

**为什么改：** 之前没有专门的组件来渲染节点配置表单。我需要一个组件，它能：

1. 接收选中的节点作为 props
2. 根据节点类型找到对应的字段配置
3. 动态渲染表单
4. 处理用户输入并更新节点数据

**核心逻辑：**

```typescript
export function NodeEditor({ node }: NodeEditorProps) {
  // 使用 ReactFlow 提供的 updateNodeData 函数来更新节点数据
  const { updateNodeData } = useReactFlow();

  // 获取上游节点的输出变量（后面会讲）
  const connections = useUpstreamConnections();

  // 追踪当前聚焦的字段（用于插入变量）
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);

  if (!node) {
    return <p>点击画布上的节点来编辑配置</p>;
  }

  // 获取节点类型对应的配置
  const nodeType = String(node.type);
  const registry = nodeRegistry[nodeType];

  // 获取节点当前的数据
  const data = (node.data || {}) as Record<string, unknown>;

  // 处理字段变化
  const handleFieldChange = (key: string, value: string) => {
    updateNodeData(node.id, { [key]: value });
  };

  // 渲染表单
  return (
    <div className="flex flex-col gap-3 p-4">
      {registry.fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label>{field.label}</Label>
          {/* 根据字段类型渲染不同的输入组件 */}
          <FieldInput
            field={field}
            value={String(data[field.key] || "")}
            onChange={(v) => handleFieldChange(field.key, v)}
            onFocus={() => setActiveFieldKey(field.key)}
            onBlur={() => setActiveFieldKey(null)}
          />
        </div>
      ))}
    </div>
  );
}
```

**为什么选择这些技术：**

1. **`useReactFlow()`**：这是 ReactFlow 提供的核心 Hook，它返回了很多有用的函数和状态，比如 `updateNodeData`、`getNodes`、`addNodes` 等。我选择用 `updateNodeData` 而不是 `setNodes`，因为：
   - `updateNodeData(nodeId, updates)` 只更新指定节点的数据，不会影响其他节点
   - `setNodes(newNodes)` 需要传入完整的节点数组，如果不小心写错了，可能会丢失其他节点
   - `updateNodeData` 是 ReactFlow 推荐的更新节点数据的方式

2. **`useState<string | null>(null)`**：用状态来追踪当前聚焦的字段。为什么需要这个？因为用户可能在输入框中插入上游变量，我需要知道当前聚焦的是哪个字段，才能把变量插入到正确的位置。

3. **`nodeRegistry[nodeType]`**：通过节点类型查找对应的配置。这就是为什么我们之前要在 `node-registry.ts` 中定义字段配置。

4. **`data[field.key]`**：用字段的 `key` 属性来读取和存储数据。这种方式非常灵活，不管字段叫什么名字，都可以用同样的方式处理。

5. **`registry.fields.map((field) => ...)`**：用 `map` 函数遍历字段数组，动态生成表单。这样不管有多少个字段，都不需要手动写每个输入组件。

**为什么不直接在 `right-sidebar.tsx` 中写表单：**

我也考虑过直接在 `right-sidebar.tsx` 中写表单，但最终选择把它抽成一个独立的组件，因为：

1. **职责分离**：`right-sidebar.tsx` 负责管理标签页切换和布局，`node-editor.tsx` 负责渲染表单，职责更清晰
2. **复用性**：如果以后需要在其他地方显示节点配置，可以直接复用这个组件
3. **可测试性**：独立的组件更容易写单元测试
4. **代码量**：表单渲染逻辑比较复杂，放在单独的文件里更易读

---

### 3.5 创建上游变量 Hook

**文件：** `src/app/features/editor/hooks/use-upstream-connections.ts`

**为什么改：** 在编辑节点配置时，经常需要引用上游节点的输出结果。比如 HTTP 请求节点返回的数据，需要在 AI 节点的 prompt 中使用。

之前没有这个功能，用户需要手动输入变量名，很容易写错。现在我需要一个 Hook，它能：

1. 找到当前选中节点的所有上游节点
2. 收集这些上游节点的输出变量
3. 返回这些变量，供编辑器使用

**核心逻辑：**

```typescript
export function useUpstreamConnections(): UpstreamConnection[] {
  // 从 ReactFlow 的 store 中获取所有节点和连线
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);

  // 找到当前选中的节点
  const selected = nodes.find((n) => n.selected);

  // 使用 useMemo 缓存计算结果，避免重复计算
  return useMemo(() => {
    if (!selected) return [];

    // 用队列做广度优先搜索，找到所有上游节点
    const ancestors: Node[] = [];
    const seen = new Set<string>();
    const queue: Node[] = [selected];

    while (queue.length) {
      const current = queue.shift()!;
      // getIncomers 是 ReactFlow 提供的函数，获取输入连接的节点
      for (const incomer of getIncomers(current, nodes, edges)) {
        if (seen.has(incomer.id)) continue;
        seen.add(incomer.id);
        ancestors.push(incomer);
        queue.push(incomer);
      }
    }

    // 收集所有上游节点的输出变量
    return ancestors.flatMap((node) => {
      const registry = nodeRegistry[String(node.type)];
      if (!registry?.outputs) return [];

      return registry.outputs.map((output) => ({
        token: `{{ ${node.id}.${output.path} }}`,
        label: `${nodeLabel} · ${output.label}`,
        nodeType: node.type,
        nodeId: node.id,
      }));
    });
  }, [selected, nodes, edges]);
}
```

**为什么选择这些技术：**

1. **`useStore((s) => s.nodes)`**：这是 ReactFlow 的状态管理方式。`useStore` 接收一个选择器函数，返回需要的状态。为什么不用 `useReactFlow()` 返回的 `nodes`？
   - `useReactFlow()` 返回的 `nodes` 是完整的节点数组，每次任何节点变化都会触发组件重新渲染
   - `useStore` 可以选择性地订阅状态，只有当选择器返回的值变化时才会重新渲染
   - 在这个场景中，我们只需要知道节点数组和连线数组，用 `useStore` 更高效

2. **`useMemo`**：缓存计算结果。为什么需要缓存？
   - 广度优先搜索（BFS）算法的时间复杂度是 O(n)，n 是节点数量
   - 如果每次组件渲染都重新计算，当节点很多时会影响性能
   - `useMemo` 会缓存计算结果，只有当依赖（`selected`、`nodes`、`edges`）变化时才会重新计算
   - 依赖数组 `[selected, nodes, edges]` 确保了：只有选中节点变了、节点数组变了、连线数组变了，才重新计算

3. **广度优先搜索（BFS）**：为什么用 BFS 而不是深度优先搜索（DFS）？
   - BFS 按照层级顺序遍历节点，先找到直接上游，再找间接上游
   - DFS 会先深入一条路径，可能跳过其他直接上游
   - 在工作流中，我们通常想先看到最近的上游节点，所以 BFS 更合适
   - BFS 用队列（queue）实现，DFS 用栈（stack）实现

4. **`getIncomers(current, nodes, edges)`**：这是 ReactFlow 提供的工具函数，用来获取某个节点的所有输入连接的节点。为什么不用自己写？
   - 自己写需要遍历所有连线，找到目标节点是当前节点的连线，再找到对应的源节点
   - `getIncomers` 已经封装了这个逻辑，代码更简洁
   - `getIncomers` 经过了 ReactFlow 团队的优化，性能更好

5. **`ancestors.flatMap((node) => ...)`**：`flatMap` 是 `map` + `flat` 的组合，把多个数组合并成一个数组。为什么用它？
   - 每个上游节点可能有多个输出变量
   - 我们需要把所有节点的所有输出变量合并成一个数组
   - `flatMap` 正好能做到这一点

6. **`token: "{{ ${node.id}.${output.path} }}"`**：为什么用这种格式？
   - `{{ }}` 是模板语法的常见格式，比如 Handlebars、Mustache 等
   - `node.id` 是节点的唯一标识，确保变量能正确找到对应的节点
   - `output.path` 是变量路径，比如 `"text"`、`"data"` 等
   - 这种格式清晰易懂，用户一眼就能看出这是一个变量引用

**为什么不把这个逻辑直接写在 `node-editor.tsx` 中：**

我也考虑过直接在 `node-editor.tsx` 中写这个逻辑，但最终选择抽成一个独立的 Hook，因为：

1. **复用性**：其他组件可能也需要获取上游节点的变量
2. **可测试性**：独立的 Hook 更容易写单元测试
3. **代码量**：这个逻辑比较复杂，放在单独的文件里更易读
4. **遵循 React 最佳实践**：复杂的逻辑应该抽成自定义 Hook

---

### 3.6 重构右侧边栏

**文件：** `src/app/features/editor/components/right-sidebar.tsx`

**为什么改：** 之前的侧边栏只有两个标签（工具栏、检查器），现在需要增加一个"编辑器"标签，并且工具栏按钮要改成更简洁的样式。

**主要改动：**

#### 3.6.1 增加编辑器标签页

```typescript
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="toolbar">工具栏</TabsTrigger>
  <TabsTrigger value="editor">编辑器</TabsTrigger>  {/* 新增 */}
  <TabsTrigger value="inspector">检查器</TabsTrigger>
</TabsList>
```

**为什么选择 `grid w-full grid-cols-3`：**

- `grid` 启用 CSS Grid 布局
- `w-full` 让 TabsList 占满整个宽度
- `grid-cols-3` 把 TabsList 分成 3 列，每个标签占 1/3 的宽度

为什么不用 `flex`？

- `flex` 也可以实现同样的效果，但 `grid` 在这种等宽分布的场景下更简洁
- `grid-cols-3` 一行就能实现，用 `flex` 需要写 `flex: 1` 给每个子元素

#### 3.6.2 选中节点时自动切换到编辑器

```typescript
const selectedNode = useStore((s) => s.nodes.find((n) => n.selected));

// 监听选中节点变化
const [prevSelectedId, setPrevSelectedId] = useState(selectedNode?.id);

useEffect(() => {
  if (selectedNode && selectedNode.id !== prevSelectedId) {
    setPrevSelectedId(selectedNode.id);
    setActiveTab("editor"); // 自动切换到编辑器
  }
}, [selectedNode, prevSelectedId]);
```

**为什么需要 `prevSelectedId`：**

我一开始直接用了：

```typescript
useEffect(() => {
  if (selectedNode) {
    setActiveTab("editor");
  }
}, [selectedNode]);
```

但这样有一个问题：当用户在编辑器中修改字段时，`selectedNode` 可能会变化（因为节点数据更新了），导致 `useEffect` 重新执行，又把标签切回编辑器。这会影响用户体验。

所以我需要用 `prevSelectedId` 来记录上一次选中的节点 ID，只有当节点 ID 真正变化时才切换标签。

**为什么用 `useEffect`：**

`useEffect` 是 React 的副作用 Hook，用来处理需要在组件渲染后执行的操作。在这里，我需要在选中节点变化后切换标签，这是一个典型的副作用场景。

#### 3.6.3 工具栏按钮改用 Button 组件

之前用的是自定义的 `NodeOptionButton`，现在改用 shadcn/ui 的 `Button` 组件：

```typescript
// 之前（NodeOptionButton）
<NodeOptionButton entry={entry} onSelect={onAddNode} />

// 现在（Button）
<Button
  variant="ghost"
  onClick={() => addNode(entry)}
  className="justify-start gap-2.5 px-1.5 text-xs cursor-grab active:cursor-grabbing"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData("application/reactflow", entry.type);
    e.dataTransfer.effectAllowed = "move";
  }}
>
  <NodeIcon entry={entry} />
  {entry.label}
</Button>
```

**为什么选择 `Button` 组件：**

1. **一致性**：项目中已经使用了 shadcn/ui 的 `Button` 组件，保持风格一致很重要
2. **功能完善**：`Button` 组件支持很多属性，比如 `variant`、`size`、`disabled` 等
3. **可访问性**：`Button` 组件已经处理了键盘导航、焦点状态等可访问性问题
4. **样式美观**：`Button` 组件有默认的 hover、active 状态样式

**为什么选择 `variant="ghost"`：**

shadcn/ui 的 `Button` 组件有几个 variant：

- `default`：实心按钮，有背景色
- `secondary`：次要按钮，背景色较浅
- `outline`：边框按钮，透明背景
- `ghost`：幽灵按钮，只有文字和图标，没有背景

在侧边栏中，按钮很多，如果都用 `default` 或 `secondary`，会显得很拥挤。`ghost` 样式最适合这种场景，只有 hover 时才显示背景，视觉上更清爽。

**为什么选择这些 className：**

- `justify-start`：让内容左对齐，默认是居中的
- `gap-2.5`：图标和文字之间的间距（10px）
- `px-1.5`：水平 padding（6px），比默认的 padding 小，更紧凑
- `text-xs`：文字大小（12px），适合侧边栏的紧凑布局
- `cursor-grab`：鼠标悬停时显示抓手形状，提示用户可以拖拽
- `active:cursor-grabbing`：鼠标按下时显示抓取形状，增强交互反馈

**为什么选择 `draggable` 属性：**

`draggable` 是 HTML5 的原生属性，设置为 `true` 后，元素就可以被拖拽。为什么不用 JavaScript 实现拖拽？

- HTML5 原生拖拽 API 已经足够用了
- 原生 API 支持 `dataTransfer`，可以在拖拽过程中传递数据
- 原生 API 有 `dragstart`、`dragend`、`dragover`、`drop` 等事件，方便处理拖拽逻辑

**为什么选择 `e.dataTransfer.setData("application/reactflow", entry.type)`：**

- `"application/reactflow"` 是自定义的 MIME 类型，用来标识这是 ReactFlow 的拖拽数据
- `entry.type` 是节点类型，比如 `"AI"`、`"HTTP_REQUEST"` 等
- 这样画布端收到拖拽事件时，就可以知道用户想添加什么类型的节点

**为什么选择 `e.dataTransfer.effectAllowed = "move"`：**

`effectAllowed` 告诉浏览器这个拖拽操作的类型：

- `"copy"`：复制
- `"move"`：移动
- `"link"`：链接

在这里，用户是把节点从侧边栏"移动"到画布，所以选择 `"move"`。

#### 3.6.4 实现 addNode 函数

```typescript
const addNode = (entry: NodeRegistryEntry) => {
  // 检查手动触发器是否已经存在
  if (entry.type === NodeType.MANUAL_TRIGGER) {
    const existingNodes = getNodes();
    if (existingNodes.some((n) => n.type === NodeType.MANUAL_TRIGGER)) {
      toast.error("每个工作流只能有一个手动触发器");
      return;
    }
  }

  // 自动编号（如 "HTTP 请求 1", "HTTP 请求 2"）
  const nodes = getNodes();
  const count = nodes.filter((n) => n.type === entry.type).length;
  const title = `${entry.label} ${count + 1}`;

  // 计算画布中央位置
  const { x, y, zoom } = getViewport();
  const position = {
    x: (width / 2 - x) / zoom,
    y: (height / 2 - y) / zoom,
  };

  // 添加节点
  addNodes({
    id: createId(),
    type: entry.type,
    position,
    data: { title, values: {} },
  });
};
```

**为什么要检查手动触发器：**

工作流只能有一个起点，也就是手动触发器。如果允许用户添加多个手动触发器，工作流的逻辑就会混乱。所以需要在添加前检查。

**为什么要自动编号：**

如果用户添加多个相同类型的节点，比如两个 HTTP 请求节点，它们的标题应该区分开。自动编号可以让用户一眼就知道哪个是哪个。

**为什么这样计算画布中央位置：**

```typescript
const { x, y, zoom } = getViewport();
const position = {
  x: (width / 2 - x) / zoom,
  y: (height / 2 - y) / zoom,
};
```

- `getViewport()` 返回当前视图的状态：
  - `x` 和 `y` 是视图的偏移量（画布被平移了多少）
  - `zoom` 是当前缩放比例
- `width / 2` 和 `height / 2` 是画布容器的中心坐标
- `width / 2 - x` 是考虑了视图偏移后的中心坐标
- 除以 `zoom` 是因为画布的坐标系和视图的坐标系不同，需要转换

**为什么选择 `addNodes` 而不是 `setNodes`：**

- `addNodes(newNodes)` 把新节点添加到现有节点数组中
- `setNodes(newNodes)` 用新节点数组替换现有节点数组
- 如果用 `setNodes`，需要先获取现有节点，然后拼接新节点，代码更复杂
- `addNodes` 是 ReactFlow 推荐的添加节点的方式

**为什么选择 `createId()`：**

`createId()` 是 ReactFlow 提供的函数，用来生成唯一的节点 ID。为什么不用 `Math.random()`？

- `Math.random()` 生成的是浮点数，不够直观
- `createId()` 生成的是类似 `"node-123"` 的字符串，更符合 ReactFlow 的规范
- `createId()` 保证了 ID 的唯一性，不会重复

---

### 3.7 修复布局高度问题

**文件：** `src/app/features/editor/components/editor.tsx` 和 `src/app/(dashboard)/layout.tsx`

**为什么改：** 之前右侧边栏的内容会无限向下延伸，导致整个页面可以无限滚动。这有几个问题：

1. 页面底部出现滚动条，影响用户体验
2. 画布和侧边栏的高度不一致，视觉上不协调
3. 当内容很多时，用户需要滚动整个页面才能看到底部的内容

**layout.tsx 的改动：**

```typescript
// 之前
<SidebarProvider>
  <AppSidebar />
  <SidebarInset className="overflow-hidden bg-accent/20">{children}</SidebarInset>
</SidebarProvider>

// 之后
<SidebarProvider className="h-svh">  {/* 限制高度为视口高度 */}
  <AppSidebar />
  <SidebarInset className="min-h-0 overflow-hidden">{children}</SidebarInset>
</SidebarProvider>
```

**为什么选择 `h-svh`：**

- `h-svh` 是 Tailwind CSS 的类，设置高度为视口高度（small viewport height）
- 为什么不用 `h-screen`？
  - `h-screen` 是 CSS 的原生属性，设置高度为屏幕高度
  - 但在移动端，浏览器的地址栏和工具栏会占用一部分空间，`h-screen` 可能会超出可视区域
  - `h-svh` 是 CSS 的新属性，会自动减去浏览器 UI 占用的空间，更适合移动端

**为什么选择 `min-h-0`：**

- 默认情况下，flex 子元素的 `min-height` 是 `auto`，这意味着子元素的高度不会小于其内容的高度
- 当内容很多时，子元素会撑破父容器的高度限制
- `min-h-0` 强制子元素的最小高度为 0，这样子元素就可以被压缩到父容器的高度范围内

**editor.tsx 的改动：**

```typescript
// 用 ReactFlowProvider 包裹整个布局，让侧边栏也能访问 ReactFlow 的 store
<ReactFlowProvider>
  <Group orientation="horizontal" className="size-full">
    {/* ... */}
  </Group>
</ReactFlowProvider>
```

**为什么要用 `ReactFlowProvider` 包裹：**

之前的结构是：

```
<ReactFlow>
  {/* 画布 */}
</ReactFlow>
<RightSidebar />
```

`RightSidebar` 在 `ReactFlow` 外面，所以无法访问 ReactFlow 的 store。当我们在 `RightSidebar` 中使用 `useStore` 或 `useReactFlow` 时，就会报错。

解决方案是用 `ReactFlowProvider` 包裹整个布局：

```
<ReactFlowProvider>
  <ReactFlow>
    {/* 画布 */}
  </ReactFlow>
  <RightSidebar />
</ReactFlowProvider>
```

这样 `RightSidebar` 也在 `ReactFlowProvider` 的范围内，可以正常使用 ReactFlow 的 Hooks。

---

### 3.8 布局结构的全面调整

**文件：** `src/app/features/editor/components/editor.tsx`

**为什么改：** 之前的布局有几个问题：

1. 右侧边栏太窄，内容显示不全
2. 画布和侧边栏的比例不合适
3. 用户无法调整画布和侧边栏的宽度

参考 `browser-automation-app` 的设计，我们使用了 `react-resizable-panels` 库来实现可拖动调整的面板布局。

**之前的布局结构：**

```
┌──────────────────────────────────────────────────────┐
│  Header                                              │
├──────────────────────────────────────────────────────┤
│  Canvas (80%)               │  Sidebar (20%)         │
│                              │                       │
│                              │                       │
│                              │                       │
└──────────────────────────────┴───────────────────────┘
```

**现在的布局结构：**

```
┌──────────────────────────────────────────────────────────────────┐
│  Header                                                          │
├──────────────────────────────────────────────────────────────────┤
│  Canvas (可拖动调整)               │  Sidebar (可拖动调整)          │
│                                    │                              │
│  • 固定高度，不随内容滚动           │  • 固定高度，内容区域滚动       │
│  • ReactFlow 画布                  │  • 三标签页：工具栏/编辑器/检查器│
│                                    │                              │
└────────────────────────────────────┴─────────────────────────────┘
```

**核心改动：**

```tsx
// 之前的布局（固定百分比）
<div className="flex h-full">
  <div className="flex-1">{/* 画布 */}</div>
  <div className="w-[20%]">{/* 侧边栏 */}</div>
</div>

// 现在的布局（可拖动调整）
<Group orientation="horizontal" className="size-full">
  <Panel defaultSize={65} minSize={30}>
    {/* 画布 */}
  </Panel>
  <Panel defaultSize={35} minSize={25}>
    {/* 侧边栏 */}
  </Panel>
</Group>
```

**为什么选择 `react-resizable-panels`：**

我考虑过几种方案：

| 方案                          | 优点                         | 缺点                                       |
| ----------------------------- | ---------------------------- | ------------------------------------------ |
| 自己用 JavaScript 实现        | 不需要额外依赖               | 代码量大，容易有 bug，需要处理很多边缘情况 |
| 使用 `react-split-pane`       | 功能完善                     | 文档不够清晰，维护不活跃                   |
| 使用 `react-resizable-panels` | 文档清晰，维护活跃，功能完善 | 需要安装额外依赖                           |

最终选择 `react-resizable-panels`，因为：

1. 它是 shadcn/ui 推荐使用的库，和项目的技术栈一致
2. 文档非常清晰，有很多示例代码
3. 维护活跃，经常更新
4. 功能完善，支持垂直/水平分割、最小尺寸限制、动画等

**为什么选择这些参数：**

- `orientation="horizontal"`：水平分割面板，画布在左边，侧边栏在右边
- `defaultSize={65}`：画布默认占 65% 的宽度
- `minSize={30}`：画布最小占 30% 的宽度，防止用户把画布拖得太小
- `defaultSize={35}`：侧边栏默认占 35% 的宽度
- `minSize={25}`：侧边栏最小占 25% 的宽度，确保配置表单能正常显示

**为什么选择 `size-full`：**

- `size-full` 是 Tailwind CSS 的类，相当于 `width: 100%; height: 100%;`
- 让 `Group` 组件占满父容器的宽度和高度

**布局调整后的效果：**

1. **可拖动调整**：用户可以根据自己的需求调整画布和侧边栏的宽度
2. **固定高度**：整个编辑器区域高度固定为视口高度，不会随内容无限延伸
3. **独立滚动**：画布和侧边栏各自独立滚动，互不影响
4. **响应式**：在小屏幕上也能正常显示

---

### 3.9 HTML 元素选择和组件结构设计

**为什么重要：** 选择正确的 HTML 元素不仅影响样式，还影响可访问性、语义化和浏览器兼容性。下面我详细解释几个常见的选择。

#### 3.9.1 为什么用 `<div>` 而不是 `<span>` 包裹按钮

比如工具栏按钮的结构：

```tsx
<div className="flex flex-col gap-0.5 pb-0">
  <Button ...>
    <NodeIcon ... />
    {entry.label}
  </Button>
</div>
```

**为什么外层用 `<div>` 而不是 `<span>`：**

| 选择     | 原因                                                            |
| -------- | --------------------------------------------------------------- |
| `<div>`  | ✅ 块级元素，可以设置 `width`、`height`、`padding`、`margin`    |
| `<div>`  | ✅ 默认 `display: block`，垂直排列子元素更自然                  |
| `<div>`  | ✅ 可以包含块级子元素（比如按钮）                               |
| `<span>` | ❌ 行内元素，设置 `width`、`height` 不生效                      |
| `<span>` | ❌ 默认 `display: inline`，垂直方向的 padding/margin 行为不一致 |
| `<span>` | ❌ 不应该包含块级子元素（虽然浏览器能渲染，但不符合语义）       |

**具体到这个场景：**

- 我们需要给按钮列表设置 `flex flex-col gap-0.5`（垂直排列，间距 2px）
- 我们需要按钮列表占满整个宽度
- 这些都需要块级元素的特性，所以用 `<div>`

**什么时候该用 `<span>`：**

- 包裹一小段文字，比如 `<span className="text-red-500">*</span>`
- 包裹一个图标，和文字在同一行
- 只需要行内样式，不需要改变布局

简单的判断方法：

> 如果你想让这个元素"独占一行"或者"可以设置宽高"，用 `<div>`
> 如果你想让这个元素"和其他元素在同一行"，用 `<span>`

#### 3.9.2 为什么按钮内部用图标 + 文字，而不是纯文字

```tsx
<Button ...>
  <NodeIcon entry={entry} />  {/* 图标 */}
  {entry.label}               {/* 文字 */}
</Button>
```

**为什么要加图标：**

1. **识别速度**：用户看图标比看文字更快，特别是在列表中
2. **视觉平衡**：纯文字的按钮看起来比较单调，加个图标更美观
3. **一致性**：浏览器标签页、侧边栏菜单等地方都是图标 + 文字，用户已经习惯了

**为什么图标放在左边：**

- 这是 UI 设计的惯例，用户从左到右阅读
- 图标作为"视觉锚点"，帮助用户快速定位
- 文字长度变化时，图标位置不变，视觉更稳定

#### 3.9.3 为什么用嵌套的 `<div>` 而不是一个 `<div>` 搞定

比如表单字段的结构：

```tsx
<div key={field.key} className="flex flex-col gap-1.5">
  <Label>{field.label}</Label>
  <Input ... />
</div>
```

**为什么不写成：**

```tsx
<Label className="block mb-1.5">{field.label}</Label>
<Input ... />
```

**原因：**

1. **语义分组**：外层 `<div>` 把标签和输入框"绑定"在一起，表示它们是一组的
2. **可维护性**：如果以后要给整个字段加背景色、边框、padding，直接在外层 `<div>` 上加就行
3. **flex 布局**：用 `flex flex-col gap-1.5` 比手动算 `margin` 更可靠，不会出现"边距折叠"等问题
4. **复用性**：如果要把这个字段抽成组件，直接把外层 `<div>` 连同子元素一起抽走就行

**什么是"边距折叠"（margin collapse）：**
这是 CSS 的一个特性：当两个垂直方向的 margin 碰到一起时，它们会合并成一个较大的 margin，而不是相加。

```
margin-bottom: 10px
    ↓
margin-top: 10px

实际间距 = 10px（而不是 20px）
```

用 flex 布局的 `gap` 就不会有这个问题，间距永远是你设置的值。

#### 3.9.4 为什么用 `<p>` 而不是 `<div>` 显示提示文字

```tsx
if (!node) {
  return <p>点击画布上的节点来编辑配置</p>;
}
```

**为什么用 `<p>`：**

- `<p>` 是 paragraph（段落）的缩写，语义上就是"一段文字"
- 屏幕阅读器（给盲人用的）会把 `<p>` 识别为段落，朗读时有适当的停顿
- 搜索引擎也能更好地理解页面结构

**什么时候用 `<div>`，什么时候用语义化标签：**

| 元素          | 用途                     | 例子                                     |
| ------------- | ------------------------ | ---------------------------------------- |
| `<div>`       | 纯布局容器，没有特殊语义 | 包裹一组元素做 flex 布局                 |
| `<p>`         | 段落文字                 | 提示信息、描述文字                       |
| `<h1>`~`<h6>` | 标题                     | 页面标题、区块标题                       |
| `<button>`    | 可点击的按钮             | 提交、取消、删除                         |
| `<input>`     | 输入框                   | 文本输入、密码输入                       |
| `<label>`     | 输入框的标签             | 和 input 关联，点击 label 也能聚焦 input |
| `<ul>`/`<ol>` | 列表                     | 无序列表/有序列表                        |
| `<nav>`       | 导航区域                 | 侧边栏菜单                               |
| `<main>`      | 主要内容区域             | 页面主体内容                             |
| `<section>`   | 独立的区块               | 一个功能模块                             |

**为什么语义化重要：**

1. **可访问性**：屏幕阅读器能正确朗读页面结构
2. **SEO**：搜索引擎能更好地理解页面内容，排名可能更高
3. **可维护性**：其他开发者看你的代码，一看标签就知道这个区域是干嘛的
4. **浏览器默认样式**：很多语义化标签有默认样式，不需要你写太多 CSS

#### 3.9.5 为什么组件要拆成这么多文件

现在的文件结构：

```
editor/
  ├── components/
  │   ├── editor.tsx          // 主编辑器组件
  │   ├── right-sidebar.tsx   // 右侧边栏
  │   ├── node-editor.tsx     // 节点编辑器
  │   └── ...
  ├── hooks/
  │   └── use-upstream-connections.ts  // 自定义 Hook
  ├── node-registry.ts        // 节点配置
  └── ...
```

**为什么不把所有代码都写在一个文件里：**

1. **职责单一**：每个文件只做一件事
   - `editor.tsx` 负责整体布局和画布
   - `right-sidebar.tsx` 负责右侧边栏的标签切换
   - `node-editor.tsx` 负责节点表单的渲染
   - `use-upstream-connections.ts` 负责上游节点的计算

2. **可维护性**：代码多了之后，一个文件几千行，找东西要滚半天
   - 拆成小文件，每个文件几百行，一目了然

3. **可复用性**：
   - 比如 `use-upstream-connections.ts` 这个 Hook，其他组件也需要上游节点变量时可以直接用
   - 比如 `node-editor.tsx` 这个组件，以后在弹窗里编辑节点也可以复用

4. **协作开发**：
   - 如果大家都改同一个文件，很容易冲突
   - 拆成多个文件，每个人改自己负责的部分，冲突少

5. **测试方便**：
   - 小文件、小函数更容易写单元测试
   - 测试 Hook 就测 Hook，测试组件就测组件，不用混在一起

**怎么判断该不该拆组件：**

一个简单的判断标准：

> 当你发现一个文件超过 300 行，或者你在写注释"// ===== 某某功能 ======"来分隔代码块时，就该考虑拆分了。

**拆分的原则：**

- **按功能拆**：相关的代码放在一起
- **按层级拆**：页面组件 → 区块组件 → 基础组件
- **按逻辑拆**：UI 渲染和业务逻辑分开（比如 Hook 放业务逻辑，组件放 UI）

---

### 3.10 React 核心概念解释：key、props、map 等

对于刚接触 React 的同学，下面这些概念可能比较抽象。我用最通俗的话解释一下。

#### 3.10.1 `key` 是什么？为什么列表一定要加 `key`？

```tsx
{
  registry.fields.map((field) => (
    <div key={field.key} className="flex flex-col gap-1.5">
      ...
    </div>
  ));
}
```

**`key` 是什么：**

- `key` 是 React 用来识别列表中每个元素的"身份证号"
- 就像每个人都有身份证号，React 靠 `key` 来区分列表中的每个元素

**为什么一定要加 `key`：**

假设我们有一个待办事项列表：

```
1. 买菜  ← 第一项
2. 做饭  ← 第二项
3. 洗碗  ← 第三项
```

如果我们删除了第一项"买菜"，列表变成：

```
1. 做饭  ← 现在是第一项了
2. 洗碗  ← 现在是第二项了
```

**如果没有 `key`：**

- React 会懵逼："咦？第一项怎么从'买菜'变成'做饭'了？第二项怎么从'做饭'变成'洗碗'了？第三项去哪了？"
- React 会以为所有元素都变了，把整个列表重新渲染一遍
- 性能差，而且可能会有 bug（比如输入框的光标位置丢失）

**如果有 `key`：**

- React 一看："哦，key='buy-food' 的元素没了，key='cook' 和 key='wash-dishes' 还在"
- React 只需要删除第一项，其他两项保持不动
- 性能好，状态也不会丢失

**`key` 的要求：**

1. **唯一**：同一个列表中，每个元素的 `key` 不能重复
2. **稳定**：同一个元素的 `key` 不能变来变去
3. **字符串或数字**：`key` 只能是字符串或数字

**为什么我们用 `field.key` 作为 `key`：**

```tsx
{registry.fields.map((field) => (
  <div key={field.key} ...>
```

- `field.key` 是字段名，比如 `"variableName"`、`"prompt"` 等
- 同一个节点的字段名肯定是唯一的（不会有两个字段都叫 `"prompt"`）
- 字段名也不会随便变，所以很稳定
- 完美符合 `key` 的要求

**千万不要用数组下标（index）当 `key`：**

```tsx
// ❌ 不推荐！
{items.map((item, index) => (
  <div key={index} ...>
))}
```

为什么？如果列表顺序变了，下标也会变，那 `key` 就乱了。就像学生排座位，每个人的座位号（下标）会变，但学号（真正的 key）不会变。

**简单记忆：**

> `key` 就是元素的"身份证号"，要唯一、要稳定。
> 有了它，React 才能高效地更新列表。

---

#### 3.10.2 `field` 是什么？`map` 是干嘛的？

```tsx
{registry.fields.map((field) => (
  <div key={field.key} ...>
    <Label>{field.label}</Label>
    <Input value={data[field.key]} ... />
  </div>
))}
```

**`map` 是什么：**

- `map` 是 JavaScript 数组的一个方法
- 它的作用是：把一个数组"变成"另一个数组
- 就像翻译官，把"中文数组"翻译成"英文数组"

**举个例子：**

```js
const numbers = [1, 2, 3];

// 把每个数字乘以 2
const doubled = numbers.map((n) => n * 2);
// 结果：[2, 4, 6]

// 把每个数字变成字符串
const strings = numbers.map((n) => `数字${n}`);
// 结果：["数字1", "数字2", "数字3"]
```

**在 React 中，`map` 用来把"数据数组"变成"JSX 数组"：**

```js
// 数据数组
const fields = [
  { key: "name", label: "姓名" },
  { key: "email", label: "邮箱" },
];

// 用 map 变成 JSX 数组
const inputs = fields.map((field) => (
  <input key={field.key} placeholder={field.label} />
));

// 结果相当于：
// [
//   <input key="name" placeholder="姓名" />,
//   <input key="email" placeholder="邮箱" />,
// ]
```

**`field` 是什么：**

- `field` 就是 `map` 回调函数的参数
- 每遍历数组中的一个元素，`field` 就代表当前这个元素
- 就像排队点名，点到谁，`field` 就是谁

**再看一遍我们的代码：**

```tsx
// registry.fields 是一个字段配置的数组
// 比如：
// [
//   { key: "variableName", label: "Variable Name", type: "text", ... },
//   { key: "prompt", label: "Prompt", type: "textarea", ... },
//   ...
// ]

{registry.fields.map((field) => (
  // 每遍历一个字段，就渲染一个表单控件
  <div key={field.key} className="flex flex-col gap-1.5">
    <Label>{field.label}</Label>          {/* 显示字段标签 */}
    <Input value={data[field.key]} ... /> {/* 显示输入框，值从 data 中取 */}
  </div>
))}
```

**为什么要用 `map`，不用手写：**

如果不用 `map`，你就得手写每个字段：

```tsx
// 手写 10 个字段，就要写 10 遍，累死...
<div key="variableName" className="...">
  <Label>Variable Name</Label>
  <Input value={data.variableName} />
</div>
<div key="prompt" className="...">
  <Label>Prompt</Label>
  <Textarea value={data.prompt} />
</div>
<div key="method" className="...">
  <Label>Method</Label>
  <Select value={data.method} />
</div>
// ... 还有好多
```

用 `map` 的好处：

1. **代码少**：一行 `map` 搞定，不用复制粘贴
2. **好维护**：要加字段？往 `fields` 数组里加一项就行
3. **不容易错**：手写容易抄错，`map` 自动生成，不会有复制粘贴错误

**简单记忆：**

> `map` 就是"批量生产"，给它一组数据，它给你生成一组 JSX。
> `field` 就是当前正在被"生产"的那个数据。

---

#### 3.10.3 `props` 是什么？组件之间怎么传数据？

```tsx
// 父组件
<NodeEditor node={selectedNode} />;

// 子组件
export function NodeEditor({ node }: NodeEditorProps) {
  // ...
}
```

**`props` 是什么：**

- `props` 是 properties（属性）的缩写
- 就是父组件传给子组件的数据
- 就像函数的参数，调用函数时传参数，使用组件时传 props

**举个例子：**

```tsx
// 定义一个"打招呼"组件
function Greeting({ name }) {
  return <p>你好，{name}！</p>;
}

// 使用组件，传 name 进去
<Greeting name="小明" />  // 渲染：你好，小明！
<Greeting name="小红" />  // 渲染：你好，小红！
```

`name` 就是一个 prop，不同的值会渲染出不同的结果。

**为什么用 props：**

1. **组件复用**：同一个组件，传不同的 props，就能显示不同的内容
2. **数据流动**：父组件把数据传给子组件，数据从上往下流，清晰易懂
3. **组件独立**：子组件只管接收 props 然后渲染，不用管数据从哪来

**props 的特点：**

- **只读**：子组件不能修改 props，只能用
- **单向流动**：数据只能从父组件传到子组件，不能反过来
- 子组件想改数据怎么办？父组件把修改函数也通过 props 传下来

**在我们的代码中：**

```tsx
// 父组件 RightSidebar
<NodeEditor node={selectedNode} />;

// 子组件 NodeEditor
export function NodeEditor({ node }: NodeEditorProps) {
  // node 就是从父组件传下来的 prop
  if (!node) {
    return <p>点击画布上的节点来编辑配置</p>;
  }
  // ...
}
```

- 父组件 `RightSidebar` 把当前选中的节点 `selectedNode` 通过 `node` prop 传给子组件
- 子组件 `NodeEditor` 收到 `node` 后，根据它来渲染表单
- 子组件要更新节点数据怎么办？用 `useReactFlow()` 的 `updateNodeData`（这是 ReactFlow 提供的全局方法，不是 props 传的）

**简单记忆：**

> `props` 就是组件的"输入参数"。
> 父组件给子组件传 props，子组件根据 props 渲染内容。

---

#### 3.10.4 `data[field.key]` 是什么语法？

```tsx
<Input value={String(data[field.key] || "")} ... />
```

**这叫"方括号表示法"（Bracket Notation），用来动态读取对象的属性。**

**两种读取对象属性的方式：**

```js
const person = { name: "小明", age: 18 };

// 方式一：点表示法（.）
console.log(person.name); // "小明"

// 方式二：方括号表示法（[]）
console.log(person["name"]); // "小明"
```

两种方式结果一样，但方括号表示法有一个超能力：**可以用变量当属性名**。

**什么时候用方括号表示法：**

当属性名是动态的，不是写死的，就用方括号：

```js
const key = "name";
console.log(person[key]); // "小明"
// 相当于 person["name"]
```

**在我们的代码中：**

```tsx
const data = { variableName: "result", prompt: "你好" };
const field = { key: "prompt", label: "Prompt", ... };

// data[field.key] 相当于：
// data["prompt"]
// 结果是："你好"
```

- `field.key` 是字段名，比如 `"variableName"`、`"prompt"`
- `data[field.key]` 就是从 `data` 对象中读取对应字段的值
- 因为字段名是动态的（不同字段有不同的 key），所以必须用方括号表示法

**为什么不用 `data.field.key`：**

初学者常犯的错误：

```tsx
// ❌ 错的！
<Input value={data.field.key} />
```

为什么错？

- `data.field.key` 会被理解为：找 `data` 的 `field` 属性，然后找它的 `key` 属性
- 但 `data` 里没有叫 `field` 的属性，只有 `"variableName"`、`"prompt"` 等
- 所以会是 `undefined`

正确写法是：

```tsx
// ✅ 对的！
<Input value={data[field.key]} />
```

**简单记忆：**

> 属性名是写死的，用点（`.`）：`data.name`
> 属性名是变量，用方括号（`[]`）：`data[key]`

---

#### 3.10.5 `useState` 是什么？为什么要用它？

```tsx
const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
```

**`useState` 是什么：**

- `useState` 是 React 提供的一个 Hook（钩子）
- 它的作用是：给组件添加"状态"
- 状态就是会变化的数据，变化了组件就会重新渲染

**没有状态会怎样：**

```tsx
function Counter() {
  let count = 0;

  const add = () => {
    count = count + 1;
    console.log(count); // 控制台能看到 1, 2, 3...
  };

  return (
    <div>
      <p>计数：{count}</p>
      <button onClick={add}>加1</button>
    </div>
  );
}
```

你会发现：点击按钮，控制台里的数字在变，但页面上的数字永远是 0！

为什么？因为普通变量变化了，React 不知道，不会重新渲染组件。

**用了 `useState` 就不一样了：**

```tsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0); // 初始值是 0

  const add = () => {
    setCount(count + 1); // 用 setCount 来修改
  };

  return (
    <div>
      <p>计数：{count}</p>
      <button onClick={add}>加1</button>
    </div>
  );
}
```

这次点击按钮，页面上的数字就会变了！因为 `setCount` 会告诉 React："状态变了，重新渲染一下吧！"

**`useState` 返回的是什么：**

```tsx
const [count, setCount] = useState(0);
```

- `count`：当前状态的值（读取用）
- `setCount`：修改状态的函数（写入用）
- `useState(0)`：括号里的 `0` 是初始值

这是 JavaScript 的"数组解构"语法，`useState` 返回一个数组，第一个元素是值，第二个元素是修改函数。

**在我们的代码中：**

```tsx
const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
```

- `activeFieldKey`：当前聚焦的字段名（比如 `"prompt"`），初始值是 `null`（没有聚焦）
- `setActiveFieldKey`：修改当前聚焦字段的函数
- 为什么需要这个？因为用户点击上游变量芯片时，我们要知道把变量插入到哪个输入框

什么时候设置：

```tsx
// 用户聚焦输入框时
onFocus={() => setActiveFieldKey(field.key)}

// 用户失焦时
onBlur={() => setActiveFieldKey(null)}
```

什么时候用：

```tsx
// 用户点击变量芯片时，找到目标字段，插入变量
const targetKey = activeFieldKey;
if (targetKey) {
  const currentValue = String(data[targetKey] || "");
  updateNodeData(node.id, { [targetKey]: currentValue + token });
}
```

**简单记忆：**

> `useState` 就是"会触发重新渲染的变量"。
> 数据变了需要页面跟着变，就用 `useState`。
> 数据变了不需要页面变，就用普通变量。

---

#### 3.10.6 `className` 是什么？为什么不用 `class`？

```tsx
<div className="flex flex-col gap-1.5">
```

**为什么是 `className` 不是 `class`：**

- HTML 里用 `class`，比如 `<div class="flex">`
- 但 JavaScript 里 `class` 是关键字（用来定义类的），不能用作属性名
- 所以 React 用 `className` 代替 `class`

**`className` 的值是什么：**

- 是一个字符串，里面是 CSS 类名，多个类名用空格分开
- 我们用的是 Tailwind CSS，所以类名都是 Tailwind 提供的工具类

**常用 Tailwind 类名解释：**

| 类名              | 作用                 | 相当于 CSS                       |
| ----------------- | -------------------- | -------------------------------- |
| `flex`            | 弹性布局             | `display: flex`                  |
| `flex-col`        | 垂直排列             | `flex-direction: column`         |
| `gap-1.5`         | 子元素间距 6px       | `gap: 0.375rem`                  |
| `w-full`          | 宽度 100%            | `width: 100%`                    |
| `h-full`          | 高度 100%            | `height: 100%`                   |
| `p-4`             | 内边距 16px          | `padding: 1rem`                  |
| `m-2`             | 外边距 8px           | `margin: 0.5rem`                 |
| `text-sm`         | 小号文字             | `font-size: 0.875rem`            |
| `text-gray-500`   | 灰色文字             | `color: #6b7280`                 |
| `bg-white`        | 白色背景             | `background-color: white`        |
| `rounded-md`      | 圆角                 | `border-radius: 0.375rem`        |
| `border`          | 边框                 | `border: 1px solid`              |
| `cursor-pointer`  | 鼠标悬停显示手型     | `cursor: pointer`                |
| `overflow-auto`   | 内容溢出时显示滚动条 | `overflow: auto`                 |
| `justify-between` | 两端对齐             | `justify-content: space-between` |
| `items-center`    | 垂直居中             | `align-items: center`            |
| `shrink-0`        | 不压缩               | `flex-shrink: 0`                 |
| `flex-1`          | 占满剩余空间         | `flex: 1 1 0%`                   |

**简单记忆：**

> HTML 写 `class`，React 写 `className`，功能一样。
> Tailwind 就是一堆写好的 CSS 类，想用哪个写哪个。

---

#### 3.10.7 JSX 中的 `{ }` 大括号是干嘛的？

```tsx
<Label>{field.label}</Label>
<Input value={data[field.key]} />
<p>你好，{name}！</p>
```

**`{ }` 的作用：在 JSX 中插入 JavaScript 表达式。**

JSX 看起来像 HTML，但它其实是 JavaScript 的语法扩展。在 JSX 里：

- 直接写的东西会被当作 HTML 标签或文本
- 用 `{ }` 包起来的东西会被当作 JavaScript 代码执行

**举个例子：**

```tsx
const name = "小明";
const age = 18;

// ❌ 错的：直接写变量名，会被当作文字显示
<p>name 今年 age 岁</p>
// 显示：name 今年 age 岁

// ✅ 对的：用 { } 包起来，会被当作变量求值
<p>{name} 今年 {age} 岁</p>
// 显示：小明 今年 18 岁
```

**`{ }` 里可以写什么：**

- 变量：`{name}`
- 表达式：`{age + 1}`、`{name.toUpperCase()}`
- 函数调用：`{formatDate(date)}`
- 三元表达式：`{isLoggedIn ? "欢迎回来" : "请登录"}`
- map 遍历：`{items.map(item => <li>{item}</li>)}`

**`{ }` 里不能写什么：**

- `if` 语句（要用三元表达式代替）
- `for` 循环（要用 `map` 代替）
- 变量声明（`const`、`let`）

**属性里也能用 `{ }`：**

```tsx
// 静态值用引号
<Input value="hello" />

// 动态值用大括号
<Input value={name} />
<Input value={data[field.key]} />
<Button disabled={!isValid}>提交</Button>
```

**简单记忆：**

> 想在 JSX 里写 JavaScript？用 `{ }` 包起来！
> 就像告诉 React："别把这当文字，执行一下这段代码！"

---

#### 3.10.8 箭头函数 `=>` 是什么？

```tsx
onClick={() => addNode(entry)}
onChange={(e) => handleChange(field.key, e.target.value)}
```

**箭头函数是 JavaScript 中定义函数的一种简写方式。**

**普通函数 vs 箭头函数：**

```js
// 普通函数写法
function add(a, b) {
  return a + b;
}

// 箭头函数写法
const add = (a, b) => {
  return a + b;
};

// 更短的写法（只有一行 return 时）
const add = (a, b) => a + b;
```

**为什么 React 里到处都是箭头函数：**

1. **事件处理函数**：

```tsx
// 写法一：提前定义函数
const handleClick = () => {
  console.log("点击了");
};
<button onClick={handleClick}>按钮</button>

// 写法二：直接写箭头函数（内联）
<button onClick={() => console.log("点击了")}>按钮</button>
```

2. **需要传参数时**：

```tsx
// ❌ 错的：这样会在渲染时就执行，不是点击时执行
<button onClick={addNode(entry)}>添加</button>

// ✅ 对的：用箭头函数包一层，点击时才执行
<button onClick={() => addNode(entry)}>添加</button>
```

为什么第一种错？因为 `addNode(entry)` 是"调用函数"，渲染的时候就会执行，而不是等到点击的时候。
用箭头函数包一层，就是"定义一个函数"，点击的时候才会调用这个函数。

3. **map 回调函数**：

```tsx
{
  items.map((item) => <div key={item.id}>{item.name}</div>);
}
```

**箭头函数的简写规则：**

| 情况                  | 写法                                               |
| --------------------- | -------------------------------------------------- |
| 没有参数              | `() => { ... }`                                    |
| 一个参数              | `(x) => { ... }` 或 `x => { ... }`（可以省略括号） |
| 多个参数              | `(a, b) => { ... }`                                |
| 函数体只有一行 return | `(a, b) => a + b`（省略大括号和 return）           |
| 返回一个对象          | `() => ({ name: "小明" })`（要用括号包起来）       |

**简单记忆：**

> 箭头函数就是简写的函数，`参数 => 返回值`。
> 事件处理要传参？用箭头函数包一层！

---

#### 3.10.9 事件处理：`onClick`、`onChange`、`onFocus`、`onBlur`

```tsx
<Button onClick={() => addNode(entry)}>
  添加节点
</Button>

<Input
  value={...}
  onChange={(e) => handleChange(field.key, e.target.value)}
  onFocus={() => setActiveFieldKey(field.key)}
  onBlur={() => setActiveFieldKey(null)}
/>
```

**什么是事件：**

- 用户和页面交互时发生的事情，比如点击、输入、滚动等
- React 给这些事件起了名字，都是以 `on` 开头，驼峰命名

**常用事件：**

| 事件名         | 触发时机         | 例子                   |
| -------------- | ---------------- | ---------------------- |
| `onClick`      | 点击元素时       | 按钮点击               |
| `onChange`     | 输入框的值改变时 | 输入文字、选择下拉选项 |
| `onFocus`      | 元素获得焦点时   | 点击输入框准备输入     |
| `onBlur`       | 元素失去焦点时   | 点击输入框外面         |
| `onKeyDown`    | 按下键盘时       | 按 Enter 提交          |
| `onMouseEnter` | 鼠标移入时       | 悬停显示提示           |
| `onMouseLeave` | 鼠标移出时       | 悬停结束隐藏提示       |
| `onDragStart`  | 开始拖拽时       | 拖拽节点               |
| `onDrop`       | 放置拖拽元素时   | 放到画布上             |

**事件对象 `e`：**

事件处理函数会收到一个"事件对象"，通常命名为 `e` 或 `event`，里面包含事件的详细信息。

```tsx
// e 就是事件对象
onChange={(e) => {
  console.log(e.target.value);  // 输入框的当前值
  console.log(e.target.name);   // 输入框的 name 属性
}}
```

常用的 `e.target` 属性：

- `e.target.value`：输入框的值
- `e.target.checked`：复选框是否选中
- `e.target.name`：元素的 name 属性

**为什么我们这样写：**

```tsx
onChange={(e) => handleChange(field.key, e.target.value)}
```

- `onChange` 触发时，React 会把事件对象 `e` 传给我们的函数
- 我们从 `e.target.value` 拿到输入框的新值
- 然后调用 `handleChange`，把字段名和新值传进去

**简单记忆：**

> 用户做了什么动作，就触发什么事件。
> 事件处理函数收到事件对象 `e`，里面有你需要的信息。

---

#### 3.10.10 条件渲染：`&&` 和 `? :`

```tsx
{
  node && <NodeEditor node={node} />;
}

{
  node ? <NodeEditor node={node} /> : <p>点击画布上的节点来编辑配置</p>;
}

{
  field.required && <span className="text-red-500">*</span>;
}
```

**什么是条件渲染：**

- 根据条件决定渲染什么内容
- 就像 `if` 语句，但 JSX 里不能写 `if`，所以用 `&&` 或三元表达式

**方式一：`&&`（有就显示，没有就不显示）**

```tsx
{
  isLoggedIn && <p>欢迎回来！</p>;
}
```

- 如果 `isLoggedIn` 是 `true`，就显示 `<p>欢迎回来！</p>`
- 如果 `isLoggedIn` 是 `false`，就什么都不显示

原理：JavaScript 的 `&&` 运算符，如果左边是真，就返回右边的值；如果左边是假，就返回左边的值。
React 遇到 `false`、`null`、`undefined` 时，什么都不渲染。

**我们的代码中：**

```tsx
{
  node && <NodeEditor node={node} />;
}
```

- 如果 `node` 存在（不是 null/undefined），就渲染 `NodeEditor` 组件
- 如果 `node` 不存在，就什么都不渲染

```tsx
{
  field.required && <span className="text-red-500">*</span>;
}
```

- 如果字段是必填的，就显示红色的 `*` 号
- 如果不是必填的，就不显示

**方式二：三元表达式 `? :`（二选一）**

```tsx
{
  isLoggedIn ? <p>欢迎回来！</p> : <p>请先登录</p>;
}
```

- 如果 `isLoggedIn` 是 `true`，显示第一个（`?` 后面的）
- 如果 `isLoggedIn` 是 `false`，显示第二个（`:` 后面的）

就像简化版的 `if...else`：

```js
if (isLoggedIn) {
  return <p>欢迎回来！</p>;
} else {
  return <p>请先登录</p>;
}
```

**方式三：多个条件（嵌套三元，慎用）**

```tsx
{
  status === "loading" ? (
    <p>加载中...</p>
  ) : status === "error" ? (
    <p>加载失败</p>
  ) : (
    <p>加载成功</p>
  );
}
```

嵌套太多会很难读，建议超过两层就用其他方式（比如提前 return、或者用对象映射）。

**简单记忆：**

> 有就显示，没有就不显示 → 用 `&&`
> 二选一 → 用三元 `? :`
> JSX 里不能写 `if`，但可以用这些技巧代替

---

#### 3.10.11 解构赋值：`{ node }` 和数组解构

```tsx
// 对象解构
export function NodeEditor({ node }: NodeEditorProps) { ... }

// 数组解构
const [activeTab, setActiveTab] = useState("toolbar");
```

**什么是解构赋值：**

- 从对象或数组中"提取"值，赋给变量
- 是一种简写方式，让代码更简洁

**对象解构：**

```js
// 原始写法
const person = { name: "小明", age: 18 };
const name = person.name;
const age = person.age;

// 解构写法
const { name, age } = person;
// 结果一样：name = "小明", age = 18
```

**在函数参数中解构：**

我们的组件经常这样写：

```tsx
// 解构 props，直接拿到 node
function NodeEditor({ node }) {
  return <p>{node.data.label}</p>;
}

// 等价于
function NodeEditor(props) {
  const node = props.node;
  return <p>{node.data.label}</p>;
}
```

为什么这样写？因为更简洁，而且一眼就能看出组件需要哪些 props。

**重命名解构出来的变量：**

```js
const person = { name: "小明" };
const { name: personName } = person;
// personName = "小明"（name 改名叫 personName）
```

**数组解构：**

```js
// 原始写法
const colors = ["红", "绿", "蓝"];
const first = colors[0];
const second = colors[1];

// 解构写法
const [first, second] = colors;
// first = "红", second = "绿"
```

**`useState` 就是数组解构：**

```tsx
const [count, setCount] = useState(0);

// 等价于
const stateArray = useState(0);
const count = stateArray[0]; // 第一个元素是值
const setCount = stateArray[1]; // 第二个元素是修改函数
```

`useState` 返回一个数组，第一个是状态值，第二个是设置函数。我们用数组解构把它们分别赋值给 `count` 和 `setCount`。

**为什么变量名叫 `setXxx`：**
这是 React 的惯例，状态值叫 `xxx`，修改函数就叫 `setXxx`。比如：

- `count` / `setCount`
- `activeTab` / `setActiveTab`
- `selectedNode` / `setSelectedNode`

这样一看就知道哪个是值，哪个是修改函数。

**简单记忆：**

> 解构就是"拆开包装，直接拿里面的东西"。
> 对象用 `{ }` 解构，数组用 `[ ]` 解构。
> `useState` 返回数组，所以用数组解构。

---

#### 3.10.12 TypeScript 类型注解：`: string`、`| null`、`interface`

```tsx
const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);

interface NodeEditorProps {
  node: Node | undefined;
}

export function NodeEditor({ node }: NodeEditorProps) {
```

**TypeScript 是什么：**

- JavaScript 的超集，给 JS 加上了类型系统
- 简单说就是：每个变量、每个函数参数、每个返回值都有"类型"
- 写错类型时，编辑器会报错提醒你，避免运行时 bug

**常用类型：**

| 类型        | 意思       | 例子               |
| ----------- | ---------- | ------------------ |
| `string`    | 字符串     | `"hello"`          |
| `number`    | 数字       | `123`、`3.14`      |
| `boolean`   | 布尔值     | `true`、`false`    |
| `null`      | 空值       | `null`             |
| `undefined` | 未定义     | `undefined`        |
| `string[]`  | 字符串数组 | `["a", "b"]`       |
| `object`    | 对象       | `{ name: "小明" }` |

**联合类型 `|`（或者）：**

```tsx
// activeFieldKey 可以是字符串，也可以是 null
const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
```

`string | null` 的意思是：这个值的类型"要么是 string，要么是 null"。
为什么需要？因为刚开始没有聚焦的字段，所以是 `null`；聚焦后变成字段名（字符串）。

**接口 `interface`：**

```tsx
interface NodeEditorProps {
  node: Node | undefined;
}
```

`interface` 用来定义对象的类型，说明这个对象有哪些属性、每个属性是什么类型。

比如 `NodeEditorProps` 这个接口说：

- 有一个属性叫 `node`
- 它的类型是 `Node | undefined`（Node 类型或者 undefined）

**为什么要用 TypeScript：**

1. **提前发现错误**：写错了属性名、传错了参数类型，编辑器立刻报错
2. **代码提示**：写代码时编辑器会自动提示有哪些属性、方法
3. **更好维护**：别人看你的代码，看类型就知道数据长什么样
4. **重构安全**：改了某个类型，所有用到的地方都会报错，不会漏掉

**简单记忆：**

> TypeScript 就是"给 JavaScript 加了类型检查"。
> `: 类型` 表示"这个东西是什么类型"。
> `A | B` 表示"要么是 A，要么是 B"。
> `interface` 用来定义对象长什么样。

---

#### 3.10.13 可选链 `?.` 和空值合并 `??`

```tsx
<Input value={String(data[field.key] ?? "")} />;

const label = node?.data?.label || "未命名";
```

**可选链 `?.`：**

安全地访问深层属性，不用担心中间某个值是 `null` 或 `undefined`。

```js
const person = { name: "小明" };

// ❌ 错的：如果 person 是 null，会报错
console.log(person.name); // TypeError: Cannot read properties of null

// ✅ 对的：用可选链，遇到 null/undefined 就返回 undefined
console.log(person?.name); // undefined（不会报错）
```

**我们的代码中：**

```tsx
const label = node?.data?.label || "未命名";
```

- 如果 `node` 不存在，整个表达式返回 `undefined`
- 如果 `node` 存在但 `node.data` 不存在，也返回 `undefined`
- 只有都存在时，才返回 `node.data.label`
- 最后用 `|| "未命名"` 提供默认值

**空值合并 `??`：**

```js
const value = data.value ?? "默认值";
```

`??` 的意思是：如果左边是 `null` 或 `undefined`，就用右边的值；否则用左边的值。

**`??` vs `||` 的区别：**

| 左边的值        | `\|\|` 结果 | `??` 结果 |
| --------------- | ----------- | --------- |
| `null`          | 默认值      | 默认值    |
| `undefined`     | 默认值      | 默认值    |
| `0`             | 默认值      | `0`       |
| `""` (空字符串) | 默认值      | `""`      |
| `false`         | 默认值      | `false`   |

`||` 把所有"假值"都替换，`??` 只替换 `null` 和 `undefined`。

**我们的代码中：**

```tsx
value={String(data[field.key] ?? "")}
```

为什么用 `??` 而不是 `||`？

- 如果字段的值是 `0` 或 `false` 或空字符串，`||` 会把它们替换成默认值
- 但这些可能是用户真正输入的值，不应该被替换
- 用 `??` 就只会在 `null`/`undefined` 时用空字符串，更安全

**简单记忆：**

> `?.` 安全访问属性，遇到空就停，不会报错。
> `??` 只在 null/undefined 时用默认值，比 `||` 更精确。

---

## 四、数据流和交互流程

### 4.1 节点配置数据流

```
用户在编辑器输入内容
    ↓
handleFieldChange(key, value)  // 用户输入触发 onChange 事件
    ↓
updateNodeData(node.id, { [key]: value })  // 更新 ReactFlow 节点数据
    ↓
ReactFlow 更新节点数据  // ReactFlow 内部状态更新
    ↓
画布上的节点重新渲染，显示新的配置  // 组件重新渲染
```

### 4.2 上游变量插入流程

```
用户点击某个输入框（聚焦）
    ↓
setActiveFieldKey(field.key)  // 记录当前聚焦的字段
    ↓
用户点击上游变量芯片
    ↓
insertToken(token)  // 将变量插入到当前字段
    ↓
updateNodeData(node.id, { [targetKey]: currentValue + token })  // 更新节点数据
    ↓
输入框显示新内容  // 组件重新渲染
```

### 4.3 添加节点流程

**点击添加：**

```
用户点击工具栏按钮
    ↓
addNode(entry)  // 调用添加节点函数
    ↓
addNodes({ id, type, position, data })  // ReactFlow 添加节点
    ↓
画布中央出现新节点  // 组件重新渲染
```

**拖拽添加：**

```
用户拖动按钮到画布
    ↓
画布的 onDrop 事件触发  // ReactFlow 捕获 drop 事件
    ↓
解析拖拽数据，获取节点类型  // e.dataTransfer.getData("application/reactflow")
    ↓
在鼠标位置创建新节点  // addNodes({ id, type, position, data })
```

---

## 五、遇到的问题和解决方案

### 5.1 useStore 报错：ReactFlowProvider 未找到

**问题：** 在 `RightSidebar` 中使用 `useStore` 时，报错说没有找到 `ReactFlowProvider`。

**原因：** `RightSidebar` 不在 `ReactFlow` 组件的范围内，无法访问 ReactFlow 的 store。

**解决方案：** 用 `ReactFlowProvider` 包裹整个布局（包括侧边栏）。

```typescript
<ReactFlowProvider>
  <Group orientation="horizontal" className="size-full">
    <Panel>{/* 画布 */}</Panel>
    <Panel>{/* 侧边栏 */}</Panel>
  </Group>
</ReactFlowProvider>
```

**为什么这个解决方案有效：**

`ReactFlowProvider` 是 React 的 Context Provider，它会把 ReactFlow 的 store 注入到整个组件树中。只要组件在 `ReactFlowProvider` 的范围内，就可以使用 `useStore` 和 `useReactFlow` 等 Hooks。

### 5.2 页面高度无限延伸

**问题：** RAG 节点有很多配置字段，导致侧边栏内容很长，整个页面可以无限滚动。

**原因：** 外层布局没有限制高度，内容可以无限向下延伸。

**解决方案：**

1. 在 `layout.tsx` 中用 `h-svh` 限制高度
2. 在侧边栏中用 `flex-1 overflow-auto` 让内容区域滚动

```typescript
// 侧边栏结构
<div className="flex h-full flex-col">
  <div className="shrink-0">{/* 标签栏 - 固定高度 */}</div>
  <div className="flex-1 overflow-auto">{/* 可滚动内容 - 占满剩余空间 */}</div>
  <div className="shrink-0">{/* 底部按钮 - 固定高度 */}</div>
</div>
```

**为什么这个解决方案有效：**

- `flex h-full flex-col`：让侧边栏成为一个垂直的 flex 容器，高度占满父容器
- `shrink-0`：让标签栏和底部按钮固定高度，不被压缩
- `flex-1`：让内容区域占满剩余空间
- `overflow-auto`：当内容超出内容区域高度时，显示滚动条

### 5.3 点击按钮添加两次节点

**问题：** 点击工具栏按钮，画布上出现两个相同的节点。

**原因：** `addNode` 函数内部调用了 `addNodes`，最后又调用了 `onAddNode`，而 `onAddNode` 也会添加节点。

**解决方案：** 移除 `addNode` 末尾的 `onAddNode(entry)` 调用，只保留 `addNodes`。

**为什么会出现这个问题：**

我在重构代码时，把原来的 `onAddNode` 函数的逻辑移到了 `addNode` 函数中，但忘记移除对 `onAddNode` 的调用。这是一个典型的代码重构时容易犯的错误。

---

## 六、总结

这次改造的核心思想是：**把"弹窗配置"改成"侧边栏实时编辑"**，让用户体验更流畅。

### 学到的知识点

1. **ReactFlow 的状态管理**：`useReactFlow()`、`useStore()`、`updateNodeData()`、`addNodes()`
2. **自定义 Hook**：`useUpstreamConnections()` 封装复杂逻辑
3. **布局技巧**：用 `flex` + `overflow-auto` 实现固定高度内的滚动
4. **拖拽功能**：`draggable` 属性 + `onDragStart`/`onDrop` 事件
5. **TypeScript 接口**：用 `interface` 定义数据结构，确保类型安全
6. **shadcn/ui 组件**：`Button`、`Tabs`、`Accordion`、`Input`、`Textarea`、`Select`
7. **CSS Grid 和 Flex**：用 `grid-cols-3` 实现等宽分布，用 `flex-1` 实现弹性布局
8. **算法**：广度优先搜索（BFS）找上游节点

### 下一步可以改进的地方

1. 添加底部控制台面板（日志和输出显示）
2. 节点上显示已填写字段的预览值
3. 添加删除工作流的菜单
4. 运行按钮移到顶部

---

> 这是我作为前端实习生的第一篇技术笔记，很多地方可能写得不够专业，希望各位前辈多多指教！😊
