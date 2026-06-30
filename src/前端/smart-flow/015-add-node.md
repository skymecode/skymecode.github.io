---
title: "Smart Flow 015：添加节点的最小闭环"
icon: "plus"
date: 2026-06-29
category:
  - "前端"
tag:
  - "Smart Flow"
  - "React Flow"
  - "Workflow"
star: true
---

# Smart Flow 015：添加节点的最小闭环

你可以把 `015` 理解成：它在前端建立了一个“添加节点”的完整最小闭环。

核心链路是：

```
点击加号
-> 打开右侧 Sheet 节点选择器
-> 选择某个节点类型
-> 往 React Flow 的 nodes state 里插入一个新 node
-> React Flow 根据 node.type 找到对应组件
-> 渲染成画布上的真实节点
```

**为什么要这样分层**

前端工程里最怕把所有逻辑写进一个大组件。所以这次提交拆成了几层：

```
NodeSelector：负责“选什么节点、怎么添加”
nodeComponents：负责“type 对应哪个 React 组件”
BaseTriggerNode / BaseExecutionNode：负责不同大类节点的通用外观
ManualTriggerNode / HttpRequestNode：负责具体节点自己的文案、图标、数据
BaseNode / BaseHandle / WorkflowNode：负责更底层的 UI 样式复用
```

这样以后新增一个节点，比如 Slack、Email、Condition，不需要重写整个 UI，只需要新增一个具体节点组件，然后注册到 `nodeComponents`。

**NodeSelector 做了什么**

文件：`src/components/node-selector.tsx:45`

它是右侧弹出的节点选择面板。用的是 `Sheet`，因为这个场景不是居中弹窗，而是“从右边滑出来的选择抽屉”。

```
<NodeSelector open={openNode} onOpenChange={setOpenNode}>
  <Button>+</Button>
</NodeSelector>
```

这里的 `children` 就是触发按钮。`NodeSelector` 内部用：

```
<SheetTrigger asChild>{children}</SheetTrigger>
```

意思是：不要额外生成一个按钮，直接把传进来的 `Button` 当作 Sheet 的触发器。

`open` 和 `onOpenChange` 是典型的受控组件写法：

```
open: boolean;
onOpenChange: (open: boolean) => void;
```

为什么不让 `NodeSelector` 自己管？因为它可以被不同入口复用。比如：

- 右上角加号按钮用它
- 初始节点中间的加号也用它

每个入口自己维护自己的打开状态，更灵活。

**添加节点的逻辑**

关键代码在 `src/components/node-selector.tsx:51`。

它用了 React Flow 的：

```
const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
```

分别作用是：

```
getNodes：拿当前画布所有节点
setNodes：修改画布节点
screenToFlowPosition：把屏幕坐标转换成画布坐标
```

为什么要 `screenToFlowPosition`？因为 React Flow 画布可以缩放、拖动。屏幕中心点不等于画布坐标中心点，必须转换。

新增节点位置是：

```
const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;
```

然后加一点随机偏移：

```
x: centerX + (Math.random() - 0.5) * 200
y: centerY + (Math.random() - 0.5) * 200
```

这样连续添加多个节点时，不会完全重叠在一起。

`createId()` 是为了生成唯一 id：

```
id: createId()
```

React Flow 每个 node 都必须有唯一 `id`。

**为什么限制手动触发器只能有一个**

这段逻辑：

```
if (selection.type === NodeType.MANUAL_TRIGGER) {
  const hasManualTrigger = nodes.some(
    (node) => node.type === NodeType.MANUAL_TRIGGER,
  );

  if (hasManualTrigger) {
    toast.error("Only one manual trigger is allowed per workflow");
    return;
  }
}
```

因为 workflow 通常只能有一个开始触发点。否则用户放两个“手动触发”，流程从哪里开始会变得不清楚。

**为什么 INITIAL 节点会被替换**

这里：

```
const hasInitialTrigger = nodes.some(
  (node) => node.type === NodeType.INITIAL,
);

if (hasInitialTrigger) {
  return [newNode];
}
```

`INITIAL` 其实不是业务节点，只是一个空状态占位加号。用户第一次选了真实节点之后，就应该把这个占位节点替换掉，而不是继续保留。

**React Flow 怎么知道渲染哪个组件**

文件：`src/app/config/initial-node.tsx:6`

```
export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
} as const satisfies NodeTypes;
```

React Flow 渲染 node 时会看：

```
node.type
```

如果是：

```
type: NodeType.HTTP_REQUEST
```

就会渲染：

```
<HttpRequestNode />
```

这个映射表就是前端节点系统的“注册中心”。

**BaseTriggerNode 和 BaseExecutionNode 为什么分开**

Trigger 节点是起点，只需要输出：

```
<BaseHandle type="source" position={Position.Right} />
```

Execution 节点是中间执行步骤，需要输入和输出：

```
<BaseHandle type="target" position={Position.Left} />
<BaseHandle type="source" position={Position.Right} />
```

所以分成：

```
BaseTriggerNode：右侧一个输出点
BaseExecutionNode：左侧输入点 + 右侧输出点
```

这就是业务语义影响 UI 结构。

**BaseHandle 是什么**

文件：`src/components/react-flow/base-handle.tsx:8`

`Handle` 是 React Flow 的连接点。它决定节点能不能连线、从哪里连线。

封装成 `BaseHandle` 是为了统一样式：

```
宽高 11px
圆形
浅色背景
浅色边框
暗色模式适配
```

以后所有连接点都长一样，不需要每个节点重复写 Tailwind class。

这里有个小问题：`{...props}` 写了两次，应该删掉一个。

**WorkflowNode 是什么**

文件：`src/components/work-flow-node.tsx:17`

它不是节点主体，而是节点外层能力：

```
上方 toolbar：设置、删除
中间 children：真正的节点 UI
下方 toolbar：节点名称和描述
```

所以它接收：

```
children
onDelete
onSettings
name
description
```

`children` 是 React 里很重要的组合方式。意思是：这个组件负责外框，里面具体放什么由调用方决定。

比如：

```
<WorkflowNode name="HTTP Request">
  <BaseNode>...</BaseNode>
</WorkflowNode>
```

**为什么具体节点很薄**

例如 `src/app/features/excutions/components/http-request/node.tsx:17`：

```
<BaseExecutionNode
  icon={GlobeIcon}
  name="HTTP Request"
  description={description}
/>
```

它只关心 HTTP 节点自己的东西：

```
图标是什么
名字是什么
描述怎么从 data 里算出来
设置按钮以后怎么打开
```

节点边框、连接点、toolbar 都交给基类组件。

这就是抽象的价值：具体节点越薄，以后新增节点越快。

**布局细节**

右侧选择器：

```
className="w-full sm:max-w-md overflow-y-auto"
```

意思是：

```
手机：占满宽度
大屏：最大宽度 md
内容太长：可以滚动
```

节点选项：

```
py-5 px-4
flex items-center gap-6
border-l-2 border-transparent hover:border-l-primary
```

意思是：

```
上下留白 20px，左右 16px
图标和文字横向排列
间距 24px
默认左边框透明
hover 时左边出现主色边框
```

画布节点主体：

```
relative rounded-md border bg-card text-card-foreground
```

意思是：

```
relative：方便内部 handle 定位
rounded-md：圆角
border：边框
bg-card：使用主题里的卡片背景
text-card-foreground：使用主题里的卡片文字色
```

**现在还没完成的部分**

这次提交完成的是“前端添加和展示节点”的雏形，还没完成：

```
保存节点到数据库
删除节点
打开设置面板
配置 HTTP 请求
执行 workflow
节点状态显示
连接线持久化
```

所以它更像是 workflow editor 的 UI 骨架第一版。

你现在学习这块，建议按这个顺序看：

```
1. editor.tsx：React Flow 怎么挂到页面上
2. nodeComponents：type 怎么映射到组件
3. NodeSelector：点击后怎么新增 node
4. BaseTriggerNode / BaseExecutionNode：节点为什么有不同连接点
5. BaseNode / BaseHandle / WorkflowNode：通用 UI 是怎么抽出来的
```
