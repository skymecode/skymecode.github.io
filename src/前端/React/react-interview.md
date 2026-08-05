---
title: React 八股文
description: React 核心原理面试题整理，涵盖 Hooks、Fiber、Reconciliation、VDOM 与版本差异
icon: "code"
date: 2026-08-05
category:
  - "前端"
tag:
  - "React"
  - "面试"
  - "Hooks"
  - "Fiber"
  - "Reconciliation"
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
  memoizedState: any; // 最新状态值
  baseState: any; // 初始状态值
  baseQueue: Update<any, any> | null;
  queue: UpdateQueue<any, any> | null; // 环形链表，存储的是该 hook 多次调用产生的更新对象
  next: Hook | null; // next 指针，指向链表中的下一个 Hook，如果为 null，证明是最后一个 Hook
};
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
  lastRenderedState: 0,
};
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

### 14. Render 为什么可以中断？

Render 阶段可以中断，是因为 Fiber 将原来连续递归的组件树协调过程拆分成了一个个 Fiber 工作单元，并用 `workInProgress` 等指针显式保存执行进度。在并发工作循环中，React 每处理完一个工作单元都会通过 Scheduler 判断是否需要让出主线程；需要时可以暂停，稍后继续，也可以在出现高优先级更新后放弃旧 Render。与此同时，Render 只在 WorkInProgress Tree 上计算，不立即修改真实 DOM，Current Tree 仍然保持完整，因此中断不会让用户看到半成品。Commit 阶段会真正修改 DOM，为保证界面一致性，通常不能被中断。

### 15. Commit 为什么不能中断？

Commit 阶段不可中断，是因为它会真正修改 DOM、切换 `root.current`、处理 ref，并执行布局 Effect 和生命周期。如果执行到一半暂停，用户可能看到半新半旧的 UI，Fiber Current Tree 也可能与真实 DOM 不一致。同时，DOM 操作和用户副作用属于外部可观察操作，无法像 Render 阶段的 WorkInProgress Tree 那样直接丢弃。为了保证一次更新的原子性和界面一致性，React 会同步完成核心 Commit；而普通 `useEffect` 属于 Passive Effect，通常在核心提交完成后单独处理。

### 16. `performSyncWorkOnRoot` 和 `performConcurrentWorkOnRoot` 的区别？

`performSyncWorkOnRoot` 是同步更新入口，不经过 Scheduler，也不进行时间切片，会通过 `renderRootSync` 连续完成整棵 WorkInProgress Tree。
`performConcurrentWorkOnRoot` 是并发任务入口，由 Scheduler 调用，渲染过程中可以通过 `shouldYield` 暂停并让出主线程；如果任务过期或必须同步处理，也可能退化成同步渲染。

### 17. `flags`（`effectTag`）的作用是什么？

`flags` 用于记录当前 Fiber 在 Commit 阶段需要执行的操作，例如 `Placement`、`Update`、`ChildDeletion`、`Ref` 和 `Passive`。它采用位掩码设计，一个 Fiber 可以同时拥有多个标记；`subtreeFlags` 则表示后代节点中是否存在副作用，帮助 Commit 阶段跳过没有工作的子树。旧版 React 中这个字段叫 `effectTag`。

### 18. Scheduler 在 Fiber 架构中负责什么？

Scheduler 负责"什么时候执行任务"和"哪个任务先执行"。它按照任务优先级和过期时间安排回调，并在任务执行超过时间片时让出主线程。Scheduler 不负责 Diff、执行组件或修改 DOM，这些属于 Reconciler 和 Renderer。

### 19. Reconciler 在做什么？

Reconciler 负责计算 UI 应该如何变化。它会处理更新队列、执行函数组件和 Hooks、协调新旧子节点、创建或复用 WorkInProgress Fiber，并通过 `flags` 记录需要提交的操作，最终生成 `finishedWork`。简单来说，Reconciler 负责"算出改什么"。

### 20. Renderer 在做什么？

Renderer 负责把 Reconciler 的计算结果应用到具体宿主环境。例如 React DOM 会创建、插入、更新和删除 DOM；React Native 则操作原生 View。不同 Renderer 通过 HostConfig 实现 `createInstance`、`appendChild`、`removeChild` 等平台相关方法。简单来说，Renderer 负责"具体怎么改"。

### 21. 时间切片（Time Slice）是如何实现的？

Fiber 将整棵组件树的渲染拆成一个个 Fiber 工作单元。并发工作循环每处理完一个 Fiber，就通过 `shouldYield` 检查时间片是否用完；如果需要让出主线程，就保存当前 `workInProgress`，暂停本轮 Render，之后由 Scheduler 再继续执行。浏览器环境下 Scheduler 通常通过 `MessageChannel` 安排下一轮工作。

### 22. `shouldYield` 的作用是什么？

`shouldYield` 用于判断 React 当前是否应该停止继续处理 Fiber，并把主线程交还给浏览器。它会根据当前任务已经执行的时间和浏览器是否需要绘制进行判断：返回 `false` 就继续执行，返回 `true` 就退出并发工作循环，之后再恢复。它只是提供判断，不会直接中断 JavaScript。

### 23. 优先级调度是如何实现的？

React 首先根据更新来源为 Update 分配 Lane，并把 Lane 合并到 `root.pendingLanes`。调度时通过 `getNextLanes` 从未完成、未挂起或已被唤醒的任务中选择最高优先级工作，再转换成 Scheduler 优先级安排回调。更高优先级更新可以打断低优先级并发 Render，长期未执行的任务还可以被标记为过期，避免饥饿。

### 24. Lanes 模型是什么？

Lanes 是 React 使用二进制位表示更新优先级和更新集合的模型。每个 Update 会被分配一个 Lane，例如同步、连续输入、默认、Transition 或 Idle Lane；多个 Lane 可以通过位运算合并成 Lanes。它不仅表示优先级，还支持更新合并、跳过低优先级更新、Suspense 挂起与恢复、过期处理以及并发任务打断。

---

## Reconciliation & Diff

### 1. 什么是 Reconciliation？

Reconciliation 是 React 的协调过程。当组件的 props、state 或 context 发生变化时，React 会重新执行组件得到新的 React Element，然后将其与旧的 Fiber 节点进行比较，判断哪些节点可以复用，哪些需要新增、更新、移动或删除。

这个过程主要发生在 render 阶段，结果是构建一棵新的 workInProgress Fiber 树，并在 Fiber 上标记 Placement、Update、Deletion 等副作用。之后进入 commit 阶段，React 才会根据这些标记真正更新 DOM。

### 2. Diff 算法的核心策略有哪些？

React 的 Diff 是一种基于启发式假设的 O(n) 协调算法，核心策略主要有三点：

**第一**，React 按照父子层级比较节点，不会在整棵旧树中进行跨层全局搜索。

**第二**，React 会先判断元素类型。类型不同，就删除旧子树并创建新子树；类型相同，就复用原来的 DOM 节点或 Fiber，只更新变化的属性，并继续递归比较子节点。

**第三**，在列表中 React 使用 key 标识节点。通常只有 key 和 type 都匹配时，旧 Fiber 才能被复用。没有 key 时会按索引和位置匹配，所以列表发生插入、删除或排序时，可能导致错误复用和状态错位。

从源码实现上看，React 会先从左到右顺序比较列表；出现失配后，再把剩余旧 Fiber 放进 Map，通过 key 或索引查找可复用节点，最后标记节点的新增、移动和删除。

### 3. 为什么 Diff 只进行同层比较？

React 只在同一个父节点的子节点之间进行 Diff，不会跨层全局搜索节点。因为通用树 Diff 的计算成本很高，React 基于 UI 结构通常比较稳定这一假设，采用同层比较，将复杂度从可能的 `O(n³)` 降低到近似 `O(n)`。如果节点跨父级移动，React 通常会把它视为旧节点删除、新节点创建。

### 4. 不同 type 的节点会如何处理？

当新旧节点的 `type` 不同时，React 不会复用旧 Fiber，而是删除旧节点及其子树，再创建新的 Fiber 和 DOM。旧组件会卸载，内部 state 和 Hook 状态也会丢失。只有 `type` 相同，并且列表场景下 `key` 也匹配，才有机会复用旧 Fiber。

### 5. key 在 Diff 中起什么作用？

`key` 是 React 用来标识兄弟节点身份的特殊属性。列表更新时，React 通过 `key` 在旧 Fiber 中寻找对应节点，再结合 `type` 判断是否能够复用。稳定的 `key` 可以帮助 React 正确判断节点的移动、新增和删除，并保证组件状态与正确的数据项对应。

### 6. 不设置 key 会有什么问题？

不设置 `key` 时，React 会发出警告，并默认使用数组索引匹配节点。当列表发生插入、删除或排序时，索引会变化，React 可能把旧 Fiber 复用给错误的数据项，造成组件状态、输入内容或动画状态错位，同时引发更多不必要的更新。

### 7. 为什么不能使用 index 作为 key？

不设置 `key` 时，React 会发出警告，并默认使用数组索引匹配节点。当列表发生插入、删除或排序时，索引会变化，React 可能把旧 Fiber 复用给错误的数据项，造成组件状态、输入内容或动画状态错位，同时引发更多不必要的更新。

### 8. 列表更新时 React 如何判断移动、新增、删除？

React 在列表更新时，会先从左到右顺序比较新旧子节点。如果发生失配，就把剩余旧 Fiber 按 key 放入 Map，没有 key 时使用索引。之后遍历剩余新节点，根据 key 查找旧 Fiber，并结合 type 判断能否复用。

找不到匹配 Fiber 的节点属于新增，会标记 `Placement`；成功复用的节点通过旧索引和 `lastPlacedIndex` 比较，如果旧索引小于 `lastPlacedIndex`，说明其相对顺序发生变化，也会标记 `Placement`，表示移动；最后 Map 中没有被复用的旧 Fiber 会标记为删除。

因此可以总结为：**key 负责找到身份，type 负责判断能否复用，lastPlacedIndex 负责判断是否移动，剩余旧 Fiber 负责判断删除。**

### 9. VDOM 比较维度有哪些？

type、key、props 和 children。其中 type 决定节点是否可以复用，key 用于列表中确定节点身份，props 判断节点属性变化，children 继续递归协调。

### 10. VDOM 和 Fiber 的区别

VDOM 是 React Element 对 UI 的轻量描述，它只负责表达 UI 结构；Fiber 是 React 内部数据，用于保存组件状态、更新队列、调度优先级和协调过程。VDOM 是一次描述，而 Fiber 是长期工作单元。

### 11. VDOM 转 Fiber 流程

组件执行后生成 React Element，也就是虚拟节点。React 在 render 阶段通过 `beginWork` 调用 `reconcileChildren`，对新的 React Element 和旧 Fiber 进行 Diff，然后创建或复用 FiberNode，形成 workInProgress Fiber Tree。完成后进入 commit 阶段，将 Fiber 中记录的变化同步到真实 DOM。

---

## VDOM 原理

### 1. 什么是 Virtual DOM？

Virtual DOM 是对目标 UI 的内存表示。在 React 中通常表现为 React Element 对象，里面包含 type、props、key 等信息。状态变化时，React 会生成新的 UI 描述，与旧 Fiber 进行协调，最后把必要变化同步到真实平台。

### 2. 为什么需要 VDOM？

VDOM 提供了状态和真实界面之间的抽象层，让开发者以声明式方式描述目标 UI，而不用手动管理节点的创建、属性更新、移动和删除。

### 3. VDOM 的优势是什么？

主要优势是声明式编程、统一的更新模型、将计算和真实修改分离、批量调度更新、减少不必要的宿主操作，以及支持多平台 Renderer。它并不保证每次都比精准的手写 DOM 操作更快。

### 4. React 更新流程的整体步骤是什么？

更新触发后，React 创建 Update 并进行调度，根据 current 构建 workInProgress Fiber 树；render 阶段执行组件、处理 Hooks 和 Reconciliation，生成 flags；completeWork 结束后进入 commit 阶段，执行 DOM 插入、更新、移动、删除以及 Effect，最后将 finishedWork 切换为新的 current。

### 5. React 为什么不做细粒度更新？

React 并不是不做细粒度更新，它在 commit 阶段会执行最小必要的 DOM 操作。React 默认没有采用运行时 Signal 式的属性级依赖追踪，而是以组件为渲染单元，状态变化后重新执行组件，再通过 Fiber 协调计算真实变化。这样可以保持组件是普通 JavaScript 函数，维持声明式、纯函数式的 UI 快照模型，并支持优先级调度和可中断渲染。对于不必要的组件渲染，可以使用 memo，当前 React Compiler 也能自动完成更细粒度的记忆化优化。

### 6. React 如何实现多平台渲染？

React 将组件和 Hooks 等核心能力、Fiber Reconciler 以及平台 Renderer 分离。Reconciler 负责计算变化，Renderer 通过 HostConfig 把变化转成 DOM 操作、Android/iOS 原生 View 操作或其他宿主平台操作。

---

## React 版本差异

### 1. React 15、16、17、18 架构有什么变化？

React 15 使用 Stack Reconciler，通过同步递归完成更新，一旦开始就无法中断。React 16 重写协调器并引入 Fiber，将组件树拆成一个个工作单元，为优先级调度、暂停和恢复渲染提供基础。React 17 主要为渐进升级服务，核心架构仍然是 Fiber，重点调整了事件委托。React 18 则在 Fiber 基础上正式引入并发渲染能力，并增加自动批处理、Transition 和新的 Root API。

### 2. React 18 的自动批处理机制是什么？

React 18 的自动批处理是指在使用 `createRoot` 后，无论更新来自 React 事件、Promise、定时器还是原生事件，React 都会尽可能把同一批次中的多个状态更新加入队列，最后只执行一次 Render 和 Commit，从而减少重复渲染。它合并的是渲染过程，而不是简单覆盖或合并所有 state。特殊情况下可以使用 `flushSync` 强制同步提交。

### 3. startTransition 和 useTransition 是什么？

`startTransition` 用于把一部分状态更新标记为非紧急更新，使这次渲染可以被用户输入等更高优先级更新中断。`useTransition` 在此基础上还返回 `isPending`，用于显示等待状态。它适合搜索结果、列表筛选和页面切换，不适合控制输入框的 value。

### 4. React 18 为什么必须使用 createRoot？

React 18 需要使用 `createRoot`，是因为新的并发调度、自动批处理等能力是基于新的 Root 实现启用的。旧的 `ReactDOM.render` 虽然暂时还能运行，但会进入 React 17 兼容模式，无法获得完整的 React 18 行为。SSR 场景则使用 `hydrateRoot`。

### 5. React 17 事件系统做了什么调整？

React 17 把事件委托从 `document` 移动到每个 React 根容器，使多个 React 版本或 React 与其他框架能够更安全地共存，也让 `stopPropagation` 更加符合原生行为。另外，React 17 移除了 SyntheticEvent 事件池，因此异步使用事件对象不再需要调用 `event.persist()`。

### 6. React 18 为什么不支持 IE？

React 18 不再支持 IE，主要是因为自动批处理和并发调度等新能力依赖 microtask 等现代浏览器特性，而这些能力无法在 IE 中被充分可靠地 polyfill。同时 IE 自身也已经结束支持，因此需要兼容 IE 的项目应继续使用 React 17。

### 7. StrictMode 的作用是什么？

StrictMode 是开发环境下的检查工具，不会影响生产环境。它会额外执行组件渲染、Effect 和 ref 回调，以发现不纯渲染、缺少 Effect 清理、ref 清理错误及废弃 API。React 18 中 Effect 看起来执行两次，是为了模拟挂载、卸载和重新挂载，提前发现并发渲染下可能出现的问题。

### 8. Concurrent Mode 是什么？

Concurrent Mode 是早期名称，React 18 更准确的说法是并发渲染。它是一种底层渲染机制，允许 React 在 Render 阶段暂停、恢复或放弃低优先级工作，并优先处理输入等高优先级更新。它不是多线程，Commit 阶段仍然需要一次性保持界面一致。React 18 也不要求整个应用全局进入并发模式，而是通过 Transition、Suspense 等并发特性渐进启用。
