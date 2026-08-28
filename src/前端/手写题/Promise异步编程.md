---
title: "Promise 异步编程"
icon: "code"
date: 2026-08-28
category:
  - "前端"
  - "手写题"
tag:
  - "Promise"
  - "异步编程"
  - "并发控制"
  - "手写题"
---

# Promise 异步编程

前端面试高频题型：并发控制 + 重试 + 失败中止。

## 一、题目：限制并发数的 Promise.allSettled（带重试）

给定一批异步任务（每个任务是一个返回 Promise 的函数），要求：

1. **并发最多 `limit` 个**——同一时刻运行的任务数不超过 `limit`。
2. **每个任务失败自动重试**最多 `retries` 次。
3. **可选**：任意一个任务失败且重试耗尽后，立刻中止整个并发池并 reject。
4. **结果顺序**和任务顺序保持一致。
5. 不失败中止的情况下：单个任务失败时，结果用 `{ error: err }` 记录，其他任务继续跑完。

> 这道题其实是 `Promise.allSettled` + 并发限制 + 重试 + 可中止的综合版。

## 二、完整实现

```js
// 一个是任务数组，一个是并发上限，一个是参数选项
async function promiseAllS(tasks, limit, options = {}) {
  const { retries = 1, abortOnError = false } = options;
  let abort = false;
  let running = 0;
  let completed = 0;
  let index = 0;
  const results = new Array(tasks.length);
  return new Promise((resolve, reject) => {
    async function runWithRetries(task, currentIndex, attemp = 0) {
      try {
        return await task();
      } catch (err) {
        if (attemp < retries) {
          console.log("当前重试任务索引:", currentIndex, "重试次数:", attemp);
          return runWithRetries(task, currentIndex, attemp + 1);
        }
        throw err;
      }
    }

    function run() {
      if (completed >= tasks.length) {
        resolve(results);
        return;
      }
      if (index >= tasks.length || running >= limit || abort) {
        return;
      }
      const currentIndex = index++;
      running++;
      runWithRetries(tasks[currentIndex], currentIndex)
        .then((data) => {
          results[currentIndex] = data;
        })
        .catch((err) => {
          results[currentIndex] = { error: err };
          if (abortOnError) {
            abort = true;
            reject(err);
            return;
          }
        })
        .finally(() => {
          if (!abort) {
            completed++;
            running--;
            run();
          }
        });
    }
    for (let i = 0; i < Math.min(limit, tasks.length); i++) {
      run();
    }
  });
}
```

## 三、思路拆解

### 3.1 用什么数据结构追踪并发？

不需要队列！核心只要**四个变量**：

| 变量 | 作用 |
| --- | --- |
| `index` | 下一个要分配的任务下标（每次 `index++` 取任务，天然保证任务顺序） |
| `running` | 当前正在跑的任务数（用于和 `limit` 比较，决定还能不能再启动新任务） |
| `completed` | 已经跑完的任务数（含成功/失败，用来判断全部结束） |
| `abort` | 开关，开启后不再启动任何新任务 |

这其实就是一个**并发令牌桶**的朴素实现——有令牌（running < limit）就派发任务，没令牌就等运行中的任务结束后再派发（通过 finally 里再调用 `run()`）。

### 3.2 为什么 `results` 要按 `currentIndex` 赋值，而不是 push？

因为并发跑的时候**完成顺序不一定等于入队顺序**。比如任务 0 很慢、任务 1 很快，任务 1 会先完成。如果用 `push` 就会导致结果顺序错乱。

按数组下标精确写回 `results[currentIndex]`，可以保证最终 `results[i]` 一定对应 `tasks[i]`。

### 3.3 初始启动多少个并发？

```js
for (let i = 0; i < Math.min(limit, tasks.length); i++) {
  run();
}
```

同时启动 `limit` 个（如果任务数少于 limit 就启动 `tasks.length` 个）。把并发塞到满，之后靠每个任务结束时的 `finally` 再补一个新任务，维持"永远有 limit 个在跑"的状态。

### 3.4 任务函数里的四个分支

每个 `run()` 里面按顺序判断：

```text
run():
  ① 全部完成了？ → resolve(results) 结束
  ② 没任务了 或 达到并发上限 或 被中止了？ → return 啥也不做
  ③ 取一个 index 的任务，running++，启动它
     成功 → 写入 results
     失败 → 写 { error: err }；如果 abortOnError=true，就 reject 全并设 abort=true
     无论成败（finally）:
       没被中止才 completed++ / running-- / 再 run() 一次
```

**关键点**：`completed++` 和 `run()` 必须在 `finally` 里，因为失败和成功都要做。

### 3.5 重试机制 runWithRetries

```js
async function runWithRetries(task, currentIndex, attemp = 0) {
  try {
    return await task();
  } catch (err) {
    if (attemp < retries) {
      console.log("当前重试任务索引:", currentIndex, "重试次数:", attemp);
      return runWithRetries(task, currentIndex, attemp + 1);
    }
    throw err;
  }
}
```

思路就是"没超过重试次数就递归再来一次"，超过就把错误向上抛，交给外面 `.catch` 处理。

这里 `attemp` 初始是 0，比较 `attemp < retries`：
- `retries = 1` 时：第一次失败后可以**再试 1 次**（总共执行 2 次），符合"至少跑 1 次 + 最多补 1 次重试"语义。
- 如果想要"总共只执行 retries 次"，可以把初始值设成 1。

## 四、执行过程示例

假设：

```js
tasks = [taskA, taskB, taskC, taskD, taskE];   // 5 个
limit = 2;
retries = 1;
abortOnError = false;
```

执行流程：

```text
启动阶段：先放 2 个 → running = 2
  index=0 → taskA 跑
  index=1 → taskB 跑
index=2 了，同时 running = 2 == limit，不继续放。

假设 taskB 先完成：
  results[1]=...，completed=1，running=1
  再 run()：没达到并发上限 → 放 index=2 taskC，running=2

假设 taskA 失败（第一次）：
  进入 runWithRetries 递归（attemp=0 < 1）→ 再跑 taskA
  taskA 第二次成功，results[0]=...，completed=2，running=1
  再 run()：放 index=3 taskD，running=2

taskC 完成 → 放 index=4 taskE
taskD 完成 → running=1，再 run()：index=5 == tasks.length，return
taskE 完成 → completed=5 == tasks.length，resolve(results)
```

最终按 0~4 顺序依次对应 results。

## 五、选项参数说明

```js
const { retries = 1, abortOnError = false } = options;
```

| 参数 | 默认 | 含义 |
| --- | --- | --- |
| `retries` | 1 | 失败后最多**额外重试几次**（总共执行 1+retries 次） |
| `abortOnError` | false | false：像 `allSettled`，单个任务失败不影响其他，错误写 `{error}`<br>true：像 `Promise.all`，任何任务失败且重试耗尽后立刻 reject，所有已启动的任务虽仍在跑，但最终结果会被丢弃 |

## 六、边界情况

1. **空任务数组 `tasks = []`**
   - `Math.min(limit, 0) = 0`，初始循环一次都不进
   - `completed=0 >= tasks.length=0` → 会进入 resolve 吗？
   - **不会**。因为只有 `run()` 里才判断 `completed >= tasks.length`，但初始循环没调用任何 `run()`。
   - **修正**：在函数开头加一个判断：
     ```js
     if (tasks.length === 0) return Promise.resolve([]);
     ```

2. **`limit <= 0`**
   - 初始循环也不会跑，永远不 resolve。
   - **修正**：`limit = Math.max(1, limit)`。

3. **tasks 里包含非函数？**
   - 会在 `task()` 调用时直接抛 TypeError，进入 catch，因为 `runWithRetries` 是 try/catch 包裹的，不会阻塞。

4. **并发满了但 `completed` 还没满时，靠什么推进？**
   - 靠**每个任务结束后的 `finally { run() }`**，有且仅有这一个推进动力。不用 setInterval / while，是纯回调驱动。

5. **`abort = true` 后，正在跑的任务怎么办？**
   - 已经在 Promise 里面执行的任务**无法中断**（JS Promise 本身不可取消）。
   - 但：
     - `finally` 里因为 `abort` 为真，不再触发后续任务。
     - 之后再调用 `run()` 会被 `if(...|| abort) return` 挡住。
   - 这是 JS 的通用限制，除非任务支持 AbortSignal，否则不会有真正意义的"终止任务"。面试时说清楚这点。

## 七、可以怎么扩（面试加分）

1. **支持 AbortController**：每个任务接收 `signal`，abortOnError=true 时 `abortController.abort()`，任务里 `fetch` 等原生操作就会真正取消。
2. **进度回调 `onProgress(done, total)`**：completed++ 后调用，用于进度条展示。
3. **错误聚合**：`abortOnError=false` 时返回 `errors[]`，告诉调用方哪些索引失败。
4. **重试间隔 `retryDelay`**：每次重试之间 `await sleep(delay * 2^attemp)`（指数退避），避免瞬时雪崩。
5. **任务优先级**：改成优先级队列，而非按 index 顺序取。

## 八、简单用法

```js
// 模拟一个 100 个请求、最多同时 6 个、每个失败重试 2 次
const tasks = Array.from({ length: 100 }, (_, i) => async () => {
  await new Promise((r) => setTimeout(r, Math.random() * 500));
  if (Math.random() < 0.2) throw new Error(`task ${i} 炸了`);
  return `task ${i} ok`;
});

promiseAllS(tasks, 6, { retries: 2, abortOnError: false })
  .then((results) => {
    console.log("完成，共", results.length, "个结果");
    results.forEach((r, i) => {
      if (r && r.error) console.log(`第 ${i} 个失败：`, r.error.message);
    });
  })
  .catch((err) => console.log("整体失败（abortOnError=true 时才会来）", err));
```

## 九、总结

这道题的灵魂不在 `Promise` 语法本身，而在**"用几个整数做并发控制 + 循环补任务"**：

- 取任务 = `index++`
- 判并发 = `running < limit`
- 补任务 = `finally` 里调 `run()`
- 保顺序 = `results[currentIndex] = ...`
- 重试 = 递归 `runWithRetries(..., attemp+1)`
- 中止 = `abort` 开关 + `reject(err)`

熟悉这套模板后，`Promise.all / allSettled / 限流 / 重试` 各种组合都能直接改几行写出来。
