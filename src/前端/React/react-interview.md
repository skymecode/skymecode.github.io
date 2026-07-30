---
title: React 八股文
description: React 核心原理面试题整理，涵盖 Hooks 与 Fiber 架构
tag:
  - React
  - 面试
---

# React 八股文

## Hooks

### 1. Hooks 的整体执行入口是什么？

`renderWithHooks`，然后可以说第二个问题的内容。

### 2. renderWithHooks 做了什么？

分为三个阶段：

**阶段一**：在调用函数前准备环境，把当前正在渲染的 fiber 赋予给全局变量 `currentlyRenderingFiber = workInProgress`，让后续 hook 知道自己属于哪个组件，读取 current 树上已有的 hook 链表头；判断当前是 mount 还是 update（首次渲染还是更新渲染）来切换 dispatcher。

**阶段二**：创建 hook 对象挂载到链表尾部，要么就是 update 的时候复用之前的然后克隆到 workInProgress 树。

**阶段三**：收尾——防止在渲染周期外误用 hook，返回子节点。

> 它是 React 内部负责"执行函数组件"的核心入口函数，位于 `ReactFiberHooks.js` 中，在 `beginWork → updateFunctionComponent` 时被调用——它的核心职责是把 Fiber 和 Hook 串联起来：先做准备工作（设置全局指针、切换 dispatcher），再真正执行函数组件函数体，让函数体里每个 Hook 调用能创建/复用对应的 Hook 节点，最后收尾返回子节点。

### 3. 为什么 hooks 必须按照固定顺序调用？

Hooks 的使用规则：不要在循环、条件或嵌套函数中使用 Hook，确保总是在你的 React 函数的最顶层以及任何 return 之前调用他们。

存 Hooks 状态的对象是以**单链表**的形式储存状态，如果用循环、条件或者嵌套函数等方式使用 Hooks，会破坏 Hooks 的调用顺序。

```
fiber.memorizedstate(hook0)-> next(hook1)-> next(hook2)->next(hook3)->next(hook4)->...
```

React 中每个组件都有一个对应的 FiberNode，其实就是一个对象，这个对象有个属性叫 `memoizedState`。当组件是函数组件的时候，`Fiber.memoizedState` 上存储的就是 Hooks 单链表。

单链表的每个 Hook 节点没有名字或者 key，因为除了它们的顺序，我们无法记录它们的唯一性。因为为了确保某个 Hook 是它本身，我们不能破坏这个链表的稳定性。

Hook 类型定义如下：

```typescript
export type Hook = {
    memoizedState: any, // 最新状态值
    baseState: any, // 初始状态值
    baseQueue: Update<any, any> | null,
    queue: UpdateQueue<any, any> | null, // 环形链表，存储的是该 hook 多次调用产生的更新对象
    next: Hook | null,  // next 指针，指向链表中的下一个 Hook，如果为 null，证明是最后一个 Hook
}
```

### 4. 为什么 hooks 不能写在条件语句中？

同上。

### 5. hooks 链表是在什么时候创建的？

在 `renderWithHooks` 的第二阶段创建的，也就是执行函数组件的时候创建的。

### 6. hooks 的数据最终存在哪里？

存储在 Fiber 节点上的 `memoizedState` 属性上，准确来说是以链表的形式挂在在函数组件对应的 Fiber 的 `memoizedState` 上。

hook 节点有五个属性：

- `memoizedState`：当前 hook 保存的数据
- `baseState`：基础 state（用于计算更新后的 state）
- `baseQueue`：未处理的更新队列
- `queue`：更新队列，例如 `setState` 产生的 update
- `next`：下一个 hook 节点

### 7. currentHook 和 workInProgressHook 分别是什么？

`currentHook` 是更新阶段指向 current Fiber 中旧 Hook 链表的指针，用于读取之前保存的 Hook 状态；`workInProgressHook` 是指向 workInProgress Fiber 新 Hook 链表的指针，用于创建或更新新的 Hook 节点。React 更新时通过 `currentHook` 按顺序遍历旧 Hook，通过 `workInProgressHook` 构建新的 Hook 链表，这也是 Hooks 必须保持调用顺序的原因。

### 8. mount 和 update 阶段 Hooks 执行流程有什么不同？

mount 没有 Hooks，所以是创建链表，而 update 是有 Hooks 的，所以是复制旧的 Hooks 生成新的 Hooks 并且处理更新队列。

### 9. useState 的实现原理？

`useState` 在 mount 阶段通过 `mountState` 创建 Hook 节点，初始化 updateQueue，并绑定 `dispatchSetState`。调用 setter 时，`dispatchSetState` 会将 action 封装成 Update 节点，加入 queue 的环形链表；如果满足条件会提前计算 eagerState，若状态未变化则可能跳过调度（优化）。进入更新渲染阶段后，`useState` 实际复用了 `updateReducer` 的逻辑，通过 `basicStateReducer` 遍历 Update 队列计算最新 state。整个过程依赖 Fiber 上的 Hook 链表、`Hook.queue` 的环形更新队列以及 current/workInProgress 双缓存机制。

### 10. useState 的更新队列是如何设计的？

React 的 `useState` 更新队列采用**环形单向链表**设计，UpdateQueue 挂载在 `Hook.queue` 上，`queue.pending` 保存最新 Update 节点。`setState` 会创建 Update 并插入环形链表，render 阶段 `updateReducer` 会遍历队列，根据 action 和 reducer 计算新的 state，同时利用 `baseQueue` 保存低优先级未处理更新。

```javascript
const queue = {
  pending: null,
  dispatch: null,
  lastRenderedReducer: basicStateReducer,
  lastRenderedState: 0
}
```

### 11. setState 做了什么？dispatch 的本质是什么？

`setState` 本质不是修改 state，而是一个绑定了当前 Fiber 和 Hook queue 的 dispatch 函数。调用 `setState` 时，本质是在 Hook 的更新队列中添加一个 Update，然后通知 Fiber 调度重新渲染。而 dispatch 的本质就是一个闭包，保存了要更新的 fiber 的 hook。

### 12. useEffect 的实现原理是什么？

`useEffect` 的实现依赖 Hook 链表和 Fiber 的 Effect 链表。`renderWithHooks` 执行函数组件时，`mountEffect`/`updateEffect` 会创建 Effect 对象，并将其保存到 `Fiber.updateQueue` 的环形链表中，同时 Hook 节点挂载到 `Fiber.memoizedState`。render 阶段只负责收集 effect，不执行副作用。commit 阶段 DOM 更新完成后，React 遍历 `Fiber.updateQueue`，异步执行 passive effect。如果 effect 返回 cleanup 函数，React 会保存 destroy，在依赖变化或组件卸载时先执行 cleanup，再执行新的 effect。

### 13. useEffect 什么时候执行？

`useEffect` 在 render 阶段只负责注册 effect，在 commit 阶段 DOM 更新完成后执行。也就是说在浏览器绘制完后再执行。

### 14. useEffect 的依赖数组是如何比较的？

React 使用 `Object.is` 比较前后两次依赖数组中的每一个元素。

### 15. useEffect 的清理函数什么时候执行？

组件卸载、依赖变化之前，以及严格模式下的首次 mount。

### 16. useEffect 和 useLayoutEffect 的区别是什么？

`useEffect` 是异步执行，而 `useLayoutEffect` 是同步执行。`useLayoutEffect` 是在 DOM 更新后、浏览器绘制前执行，所以 SSR 应该不适用，而 `useEffect` 不会阻塞绘制。

### 17. useEffect 中调用 setState 会有什么问题？

在 `useEffect` 中调用 `setState` 本身是允许的，它会创建状态更新并触发新一轮 render。但由于 Effect 已经在当前提交之后执行，立即设置状态会形成 `render → commit → effect → setState → render` 的级联更新，造成额外渲染。如果更新的 state 又导致 Effect 的依赖变化，就会形成无限循环。对于能根据 props 或现有 state 直接计算出的派生数据，应在 render 中计算；只有同步网络请求、订阅、定时器等外部系统时，在 Effect 中更新 state 才通常是合理的。

### 18. 什么是闭包陷阱？如何解决？

闭包陷阱通常指 React 回调捕获了某次 render 的 props 或 state 快照，之后异步回调、定时器或 Effect 继续读取这份旧值，从而出现 stale closure。解决方式要根据场景选择：Effect 应随数据变化时正确声明依赖；根据旧 state 更新时使用函数式更新；需要在稳定回调中读取最新值时使用 `useRef` 或 `useEffectEvent`；异步请求则通过 cleanup、忽略旧结果或取消请求避免过期响应。

### 19. useRef 的原理是什么？

`useRef` 在 mount 阶段通过 `mountRef` 创建 Hook 节点和 `{ current: initialValue }` 对象，并把该对象保存在 `hook.memoizedState` 中；在 update 阶段，`updateRef` 通过 `updateWorkInProgressHook` 获取对应 Hook，直接返回之前保存的 ref 对象，因此多次渲染中对象引用保持不变。修改 `ref.current` 只是普通对象属性赋值，不会创建 Update、没有更新队列，也不会触发 Fiber 调度，所以不会引起重新渲染。用于 DOM 时，React 会在 commit 阶段将真实 DOM 写入 `ref.current`，卸载时再设置为 `null`。

### 20. useRef 为什么修改不会触发重新渲染？

修改 `ref.current` 只是普通对象属性赋值，不会创建 Update、没有更新队列，也不会触发 Fiber 调度，所以不会引起重新渲染。

### 21. useMemo 的实现原理是什么？

`useMemo` 在 mount 阶段执行计算函数，并把计算结果和依赖数组以 `[value, deps]` 的形式保存在 `Hook.memoizedState` 中。更新时通过 `updateWorkInProgressHook` 获取对应 Hook，使用 `Object.is` 逐项比较依赖；依赖未变化则返回旧值，变化则重新计算并覆盖缓存。它本质是 render 阶段的计算结果缓存，主要用于避免昂贵计算或保持对象引用稳定。

### 22. useCallback 和 useMemo 的关系是什么？

两者使用相同的依赖比较机制，但缓存的东西不同：`useMemo` 缓存的是函数执行后的结果，而 `useCallback` 缓存的是函数本身。`useCallback` 可以理解为专门用于缓存函数的 `useMemo`。

### 23. 如何用 useMemo 模拟 useCallback？

```javascript
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);

// 等价于
const handleClick = useMemo(() => {
  return () => {
    console.log(count);
  };
}, [count]);
```

### 24. useReducer 的使用场景是什么？

当状态结构复杂、多个字段存在关联、状态转换规则较多，或者希望将更新逻辑集中管理和测试时，适合使用 `useReducer`。简单且独立的状态使用 `useState` 更直观；复杂表单、工作流编辑器、请求状态机、撤销重做等场景更适合 `useReducer`。

### 25. useImperativeHandle 的作用是什么？

`useImperativeHandle` 用于自定义组件通过 ref 向父组件暴露的实例内容。它通常与 ref 配合，只暴露 focus、reset、open 等必要命令式方法，避免父组件直接操作子组件内部 DOM 或实现细节。

### 26. 自定义 Hook 的本质是什么？

自定义 Hook 本质上是组合其他 Hook 的普通函数。React 不会为它创建特殊类型的 Hook 节点，内部调用的 `useState`、`useEffect` 等仍按顺序加入当前组件的 Hook 链表。它复用的是有状态逻辑，每次调用拥有独立状态，并不自动共享状态。

### 27. 你写过什么样的自定义 Hook？

- `useWorkflowExecution`：封装工作流运行、状态、错误和取消逻辑
- `useSSE` / `useRealtime`：封装实时执行状态订阅与 cleanup
- `useDebouncedValue`：封装搜索、节点配置自动保存的防抖值
- `useLocalStorage`：封装状态和本地存储同步
- `useNodeSelection`：封装 React Flow 节点选择逻辑

### 28. Hooks 相比类组件的优势是什么？

Hooks 的主要优势是能在不改变组件层级的情况下复用有状态逻辑，并允许按业务关注点组织代码，而不是被类组件生命周期拆散。同时函数组件不需要处理 `this` 和方法绑定，逻辑更容易拆分和组合。但 Hooks 也要求正确处理调用顺序、依赖数组和闭包问题，并不是简单地用函数替换类。

### 29. React 何时清除 effect？

`useEffect` 的 cleanup 会在依赖变化后、下一次 effect setup 执行之前调用，也会在组件卸载时调用。开发环境开启 Strict Mode 后，React 还会在首次挂载时额外执行一次 setup、cleanup、setup，用来检查副作用是否可以被正确清理。普通重新渲染但依赖不变时，不会执行 cleanup。

---

## Fiber

### 1. 为什么 React 16 要引入 Fiber？

当组件很庞大时，更新状态可能造成页面卡顿，根本原因在于——更新流程是**同步、不可中断的**。

为了解决这个问题，React 重写了代码，提出了 Fiber 架构，设计出**异步可中断的架构**。

### 2. Fiber 解决了什么问题？

同上。

### 3. Fiber 节点的数据结构是什么？

**单向链表**。主要包含以下链接属性：

- `return`：指向父 Fiber 节点的指针
- `child`：指向第一个子 Fiber 节点的指针
- `sibling`：指向下一个兄弟 Fiber 节点的指针

### 4. current Fiber Tree 和 workInProgress Fiber Tree 的区别是什么？

Current Fiber Tree 是上一次 commit 完成后正在生效的 Fiber 树，由 `root.current` 指向；WorkInProgress Fiber Tree 是本次 render 阶段基于 Current Tree 创建或复用的候选树。对应 Fiber 通过 `alternate` 相互关联。React 在 WorkInProgress Tree 上处理更新、执行组件和计算副作用，期间不会直接破坏 Current Tree。render 完成后进入 commit，将 DOM 修改应用完成，再令 `root.current = finishedWork`，此时 WorkInProgress 成为新的 Current，而旧 Current 作为 alternate 留待下一次更新复用。

### 5. 双缓存（双 fiber 树）机制是如何工作的？

React 通常为同一个组件节点维护最多两个 Fiber：一个是已经生效的 `current Fiber`，另一个是本次 render 正在处理的 `workInProgress Fiber`。React 不直接修改 current，而是在 workInProgress 上计算下一版 UI，完成后再交换两者的角色。

### 6. alternate 指针的作用是什么？

`alternate` 双向连接同一组件的 current Fiber 和 workInProgress Fiber。它让 React 能找到对应旧节点，读取旧 props、state 和 Hook 链表，进行新旧协调；同时用于复用另一个 Fiber 对象，减少内存分配。提交后两棵树身份交换，但 alternate 关系仍被保留，为下一次更新继续复用。

### 7. FiberRootNode 的作用是什么？

FiberRootNode 是每个 React Root 对应的根级管理对象，它本身不是普通 Fiber。它通过 `containerInfo` 连接宿主容器，通过 `current` 指向当前已经提交的 HostRoot Fiber，并作为 current/workInProgress 双缓存切换的入口。同时它统一保存整棵树的 Lane 的调度状态、Scheduler 回调、Suspense 挂起与重试、错误处理、缓存和 Transition 等根级信息。提交完成后，React 会令 `root.current = finishedWork`，使本轮 WorkInProgress Tree 成为新的 Current Tree。

### 8. React 的 render 和 commit 两个阶段分别做了什么？

**Render 阶段**负责计算下一版 UI。它基于 Current Fiber Tree 构建 WorkInProgress Fiber Tree，向下执行 `beginWork`，处理更新队列、调用函数组件、执行 Hooks 并协调子节点；然后向上执行 `completeWork`，完成宿主节点准备并收集 flags。Render 阶段主要是计算过程，并发模式下可以被暂停或放弃。

**Commit 阶段**负责把 `finishedWork` 应用到页面。它依次执行 Before Mutation、Mutation 和 Layout 等子阶段：读取更新前快照、真正增删改 DOM、切换 `root.current`、执行 ref、生命周期和 `useLayoutEffect`；之后再处理 `useEffect` 的 cleanup 和 setup。

最核心的区别就是：**Render 负责算，Commit 负责改。**

### 9. beginWork 做什么？

`beginWork` 是向下递归处理 Fiber 的过程，它根据 Fiber 类型处理更新；函数组件会执行 `renderWithHooks`，然后通过 reconciliation 创建或复用子 Fiber，并返回 child 继续向下。它还会根据 props、lanes 和 context 判断是否可以 bailout。

### 10. completeWork 做什么？

`completeWork` 是向上回溯完成 Fiber 的过程。对于函数组件主要汇总子树信息；对于 HostComponent，首次挂载时创建并组装 DOM 实例，更新时标记需要修改的属性；最后通过 `bubbleProperties` 将子节点的 flags、`subtreeFlags` 和 lanes 向父节点冒泡，为 Commit 阶段真正执行 DOM 操作做准备。

### 11. effectList 是什么？如何构建？

旧版 React 中，EffectList 是 Render 阶段收集出的、包含所有待提交副作用 Fiber 的单向链表。它在 `completeUnitOfWork` 向上回溯时构建：先把子树的 EffectList 拼到父 Fiber，再把当前有副作用的 Fiber 追加到尾部，最终 Commit 阶段通过 `nextEffect` 直接遍历。

现代 React 的主要实现已经改为使用 `flags` 和 `subtreeFlags`，在 complete 阶段向上冒泡标记，Commit 阶段只递归进入包含对应副作用标记的子树。需要注意，它与函数组件 `Fiber.updateQueue` 中保存 `useEffect` 的环形 Effect 链表不是同一个结构。

### 12. commit 阶段分为哪几个子阶段？

三个阶段。

### 13. before mutation、mutation、layout 阶段分别做什么？

**Before Mutations 阶段（执行前准备）**

- 执行类组件的 `getSnapshotBeforeUpdate` 钩子（用于获取 DOM 更新前的快照，比如滚动位置）；
- 解绑 / 清空旧 ref（对即将被删除 / 替换的节点，将 `ref.current` 设为 null，避免引用无效 DOM）。

**Mutations 阶段（核心：操作 DOM）**

- 这是**唯一操作真实 DOM**的阶段，按照 Render 阶段生成的 Effect 链表，执行 DOM 的增、删、改操作（比如将"count: 1"的文本节点改成"count: 2"，插入新的组件 DOM，删除不需要的节点）；
- 修改 DOM 会**让浏览器标记需要重绘/回流**，但**不会立即触发**浏览器渲染；
- 由于所有 DOM 操作**同步、连续、不可中断**地执行，因此不会出现 DOM 半新半旧的不一致状态。

**Layout 阶段（执行回调，获取最新 DOM）**

- DOM 已经更新完成，但**浏览器尚未绘制**，此时可以安全获取最新的 DOM 信息（如节点宽高、滚动位置）；
- 执行类组件的 `componentDidMount`（组件挂载时）、`componentDidUpdate`（组件更新时）钩子；
- 执行函数组件的 `useLayoutEffect` 回调（同步执行，会阻塞浏览器绘制，适合需要依赖最新 DOM 的场景）；
- 更新 ref 的新值（将 `ref.current` 赋值为更新后的 DOM 节点）；
- 注意：`useEffect` 回调**不在这里执行**，会在 Layout 阶段结束后，异步执行（避免阻塞浏览器绘制）。
