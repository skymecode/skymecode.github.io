---
title: "JS 面试高频问题（教程式完整版）"
icon: "edit"
date: 2026-09-04
category:
  - "前端"
  - "JavaScript"
tag:
  - "javascript"
  - "面试"
  - "八股文"
  - "Event Loop"
  - "Promise"
  - "原型链"
  - "闭包"
star: true
---

# JavaScript 前端面试高频问题：教程式完整版

> 基于你提供的《JS 面试高频问题（2026重新分析面经版）》题单重新整理。
>
> 目标不是把答案压缩成关键词，而是按“**为什么 → 是什么 → 怎么运行 → 代码示例 → 面试怎么说 → 常见误区/追问**”的方式，把每道题整理成可以系统学习、也可以直接用于面试表达的教程。
>
> 说明：少数面试资料里常见的“栈存基本类型、堆存引用类型”“渲染就是宏任务”等说法属于简化模型。本文会保留面试所需的直观理解，同时标注更准确的边界，避免背出明显不严谨的结论。

---

## 如何使用这份资料

建议分三轮复习：

1. **第一轮：理解。** 先看“核心结论”和“原理”，不要背。
2. **第二轮：输出。** 只看题目，尝试用 30～60 秒回答，再对照“面试回答模板”。
3. **第三轮：追问。** 重点练代码输出题、手写题和“常见追问”。

如果时间很紧，优先级建议：

- 第一梯队：Event Loop、Promise、数据类型、原型链、闭包、`var/let/const`、箭头函数。
- 第二梯队：Promise 组合方法、`new`、`this`、`call/apply/bind`、深拷贝、GC、栈与堆。
- 第三梯队：数组、遍历、`Object`、`Proxy`。
- 第四梯队：模块化、ESM、`class`、`WeakMap`。
- 最后集中刷：代码输出 + 手写 + 场景机制题。

---

# 第一梯队：极高频

## 1. 什么是 JavaScript 事件循环（Event Loop）？宏任务和微任务的执行顺序是怎样的？为什么需要事件循环？

### 面试官可能怎么问

- 说一下 Event Loop。
- 为什么 JavaScript 是单线程还可以做异步？
- Promise 和 setTimeout 同时出现时，谁先执行？
- 微任务什么时候清空？
- 页面渲染发生在什么位置？

### 核心结论

JavaScript 主线程同一时间只能执行一段 JavaScript 代码，但浏览器还要处理定时器、网络、DOM 事件等异步任务，因此需要 **Event Loop** 协调“当前执行栈”和“等待执行的回调”。

可以先记住浏览器环境中的基本顺序：

```text
执行当前 task（例如 script）
        ↓
执行其中的同步代码
        ↓
当前 task 结束
        ↓
清空 microtask 队列
        ↓
浏览器可能进行一次渲染
        ↓
进入下一个 task
```

这里要注意：**不是“宏任务永远先于微任务”**。更准确地说，是“当前 task 已经在执行；当前 task 结束以后，微任务会在下一个 task 之前被清空”。

### 为什么需要 Event Loop？

假设网络请求必须阻塞等待：

```js
const data = request(); // 假设等待 5 秒
console.log(data);
```

如果这 5 秒里 JavaScript 主线程什么都不能做，页面点击、输入、动画都会受影响。

浏览器因此把很多能力放在 JavaScript 引擎之外，例如：

- 定时器；
- 网络请求；
- DOM 事件；
- 浏览器内部 I/O。

这些任务完成后，再把对应回调安排回来执行。Event Loop 就是这套调度机制的一部分。

### 调用栈、Web APIs、任务队列怎么配合？

可以用一个简化模型理解：

```text
同步 JS → Call Stack 执行

遇到异步能力
    ↓
交给浏览器环境处理
    ↓
异步条件满足
    ↓
对应回调进入等待队列
    ↓
主线程合适时机取出执行
```

### 宏任务和微任务有哪些？

常见 task（很多面试资料称“宏任务”）：

- 整段 `script`；
- `setTimeout`；
- `setInterval`；
- I/O 回调；
- 某些事件回调。

常见 microtask（微任务）：

- `Promise.then/catch/finally` 回调；
- `queueMicrotask`；
- `MutationObserver`。

Node.js 里还会涉及 `process.nextTick`、`setImmediate`，但它和浏览器的调度模型不是完全一回事。

### 页面渲染什么时候发生？

面试里经常简化成：

```text
task → microtask → render → next task
```

这个模型用来做常见输出题通常够用，但更准确地说：**浏览器有机会在 task 之间进行渲染，不保证每轮都一定渲染一次。**

### 经典输出题

```js
console.log(1);

setTimeout(() => {
  console.log(2);
});

Promise.resolve().then(() => {
  console.log(3);
});

console.log(4);
```

输出：

```text
1
4
3
2
```

分析：

1. 当前 `script` 开始执行。
2. `console.log(1)` 同步输出 `1`。
3. `setTimeout` 的回调等待后续 task。
4. `Promise.then` 的回调进入 microtask 队列。
5. `console.log(4)` 同步输出 `4`。
6. 当前 script 结束，清空微任务，输出 `3`。
7. 再进入后续 task，输出 `2`。

### 面试回答模板

> JavaScript 主线程同一时间只能执行一段 JS，所以浏览器需要 Event Loop 来协调同步代码和异步回调。整段 script 可以看作当前 task，先执行里面的同步代码。执行过程中，Promise 的 then/catch/finally 等回调会进入微任务队列，setTimeout 之类会等待后续 task。当前 task 执行完以后，会先清空所有微任务，然后浏览器可能进行渲染，再进入下一个 task。所以同一轮里 Promise.then 通常会早于 setTimeout 回调执行。

### 常见误区

- **误区：同步代码不是任务。** 更准确地说，同步代码是在当前 task 中立即执行的代码。
- **误区：宏任务一定比微任务先。** 应该说“当前 task 先执行，结束后先清空微任务，再进入下一个 task”。
- **误区：Promise 本身是异步的。** `new Promise(executor)` 中的 executor 是同步执行的，异步的是 `.then` 等回调的调度。

---

## 2. Promise 有哪些状态？状态如何变化？为什么状态一旦改变就不能再改？

### 核心结论

Promise 有三种状态：

- `pending`：未决；
- `fulfilled`：已成功；
- `rejected`：已失败。

状态只能这样变化：

```text
pending → fulfilled
pending → rejected
```

一旦进入 `fulfilled` 或 `rejected`，Promise 就已经 **settled（敲定）**，后续再调用 `resolve` 或 `reject` 不会重新改状态。

### 为什么要设计成不可逆？

Promise 表示“一次异步操作最终会得到的结果”。如果同一个 Promise 一会儿成功、一会儿失败，下游链式逻辑就无法稳定推理。

因此它采用“一次敲定”的语义：

```js
const p = new Promise((resolve, reject) => {
  resolve('success');
  reject(new Error('failed'));
  resolve('again');
});

p.then(console.log); // success
```

第一次有效的状态敲定生效，后续状态修改被忽略。

### pending 不等于“正在请求”

面试里容易说成“pending 就是在请求中”，这不准确。

`pending` 只是说明：**这个 Promise 还没有被敲定。** 它可能在等网络，也可能在等定时器、用户动作、文件读取，甚至只是业务代码还没调用 `resolve/reject`。

### resolve 一定等于 fulfilled 吗？

这是进阶追问。

如果 `resolve` 的是一个普通值，Promise 通常会走向 fulfilled；但如果 `resolve` 的是另一个 Promise/thenable，外层 Promise 会“采用”它的最终状态。

```js
const inner = new Promise((resolve) => {
  setTimeout(() => resolve('ok'), 1000);
});

const outer = new Promise((resolve) => {
  resolve(inner);
});

outer.then(console.log); // 约 1 秒后输出 ok
```

所以面试时不要把“调用 resolve”机械等同于“这一行之后立刻 fulfilled”。

### 面试回答模板

> Promise 有 pending、fulfilled、rejected 三种状态。初始是 pending，只能从 pending 变成 fulfilled 或 rejected，一旦 settled 就不能再改变，后续重复 resolve/reject 会被忽略。这样设计是为了保证一次异步操作只有一个稳定的最终结果，后续 Promise 链才能可靠地继续执行。

---

## 3. Promise.then 返回值规则是什么？返回普通值、Promise、抛异常分别会怎样？

### 核心结论

`then` 的核心不是“执行回调”这么简单，而是：

> **每次调用 `then` 都会返回一个新的 Promise。**

这就是 Promise 能链式调用的基础。

```js
const p2 = p1.then(onFulfilled, onRejected);
```

`p2` 的状态取决于回调的执行结果。

### 情况一：返回普通值

```js
Promise.resolve(1)
  .then((value) => {
    return value + 1;
  })
  .then(console.log); // 2
```

可以近似理解为：

```js
return Promise.resolve(value + 1);
```

新的 Promise 会 fulfilled，并把返回值传给下一个 `then`。

### 情况二：没有 return

```js
Promise.resolve(1)
  .then(() => {
    console.log('done');
  })
  .then((value) => {
    console.log(value); // undefined
  });
```

没有显式返回值，相当于 `return undefined`。

### 情况三：返回一个 Promise

```js
Promise.resolve()
  .then(() => {
    return new Promise((resolve) => {
      setTimeout(() => resolve('result'), 1000);
    });
  })
  .then(console.log);
```

外层 `then` 返回的新 Promise 会等待内部 Promise 的最终结果，然后再决定自己后续的状态和值。

### 情况四：抛出异常

```js
Promise.resolve()
  .then(() => {
    throw new Error('boom');
  })
  .catch((err) => {
    console.log(err.message); // boom
  });
```

回调中 `throw` 会让 `then` 返回的新 Promise 进入 rejected 状态，因此可以被后续 `catch` 捕获。

### 情况五：在 catch 中返回普通值

这是高频追问：

```js
Promise.reject('error')
  .catch((err) => {
    console.log(err);
    return 'recovered';
  })
  .then(console.log); // recovered
```

`catch` 本质上也会返回新的 Promise。错误被处理后，如果回调正常返回普通值，Promise 链可以“恢复”为 fulfilled。

### 面试口诀

```text
then 必返新 Promise
返回值 → 下个 then
返回 Promise → 等它
throw → 变 rejected
不 return → undefined
```

### 面试回答模板

> then 一定返回一个新的 Promise。回调返回普通值时，新 Promise 会 fulfilled，并把这个值传给下一个 then；返回另一个 Promise 时，会等待它的最终状态；如果回调抛异常，新 Promise 会 rejected，后续可以用 catch 捕获；如果没有 return，相当于返回 undefined。

---

## 4. async / await 和 Promise 的关系是什么？async 函数返回什么？await 后面的代码什么时候执行？

### 核心结论

`async/await` 是建立在 Promise 之上的语法机制，它让异步控制流写起来更像同步代码。

两个结论必须记住：

1. `async` 函数调用后一定返回 Promise。
2. `await` 不会阻塞整个 JS 主线程，它只会暂停当前 async 函数后续部分的继续执行。

### async 函数返回值

```js
async function foo() {
  return 123;
}

const result = foo();
console.log(result instanceof Promise); // true
```

可以近似理解成：

```js
function foo() {
  return Promise.resolve(123);
}
```

如果 async 函数抛异常：

```js
async function foo() {
  throw new Error('boom');
}
```

那么调用 `foo()` 得到的是一个 rejected Promise。

### await 做了什么？

```js
async function run() {
  console.log('A');
  const value = await Promise.resolve('B');
  console.log(value);
}

console.log('start');
run();
console.log('end');
```

输出：

```text
start
A
end
B
```

执行到 `await` 后，当前 async 函数的后续逻辑会暂时让出执行权。等等待的 Promise settled 后，后续继续逻辑会被安排在微任务中继续执行。

### await 普通值呢？

```js
async function foo() {
  const x = await 1;
  console.log(x);
}
```

可以把它理解成先经过 `Promise.resolve(1)`，因此 `await` 后续仍不会“同步紧接着”执行。

### 错误怎么捕获？

```js
async function load() {
  try {
    const data = await fetch('/api/data');
    return data;
  } catch (err) {
    console.error(err);
  }
}
```

`await` 一个 rejected Promise 时，会在当前 async 函数语义上表现得像“抛出异常”，因此可以用 `try/catch`。

### 面试回答模板

> async/await 本质上建立在 Promise 机制之上，可以理解为让 Promise 链写得更像同步流程。async 函数调用后一定返回 Promise，return 普通值会被包装成 fulfilled Promise，抛异常则对应 rejected Promise。await 会暂停当前 async 函数后续代码，但不会阻塞整个主线程；等待的 Promise 完成以后，await 后面的逻辑会在微任务阶段继续执行。

### 常见误区

- `await` **不是阻塞整个线程**。
- `async` 函数返回普通值给“函数内部”没错，但**调用者拿到的一定是 Promise**。
- `async/await` 不是让异步变成真正同步，而是改善异步控制流的写法。

---

## 5. JavaScript 有哪些数据类型？原始类型和对象有什么区别？

### 核心结论

JavaScript 可以按 8 个类型来记：

原始类型（Primitive）有 7 种：

- `number`
- `string`
- `boolean`
- `null`
- `undefined`
- `symbol`
- `bigint`

还有：

- `object`

数组、函数、日期、正则、Map、Set 等都属于对象体系中的不同对象类型。需要注意，`typeof function(){}` 会返回 `"function"`，但函数在语言类型体系上仍属于可调用对象。

### 原始值与对象最核心的区别

原始值是不可变值：

```js
let str = 'abc';
str[0] = 'x';
console.log(str); // abc
```

对象是可变的复合值：

```js
const user = { name: 'A' };
user.name = 'B';
console.log(user.name); // B
```

### 赋值时的区别

原始值赋值，表现为值的复制：

```js
let a = 1;
let b = a;
b = 2;
console.log(a); // 1
```

对象变量赋值时，两个变量可能引用同一个对象：

```js
const a = { count: 1 };
const b = a;
b.count = 2;
console.log(a.count); // 2
```

### “基本类型在栈，对象在堆”要怎么说？

这是面试里非常常见的简化模型，但不要把它说成 ECMAScript 规范硬性规定。

更稳妥的表述：

> 在常见引擎实现的理解模型里，调用帧等数据与栈密切相关，对象通常由堆式内存管理；但 JavaScript 规范并不要求“所有基本值必须放栈、所有对象必须放堆”，实际引擎还会做逃逸分析、装箱、优化等。

初中级前端面试如果不追底层，可以说“原始值按值语义理解，对象变量保存引用关系”，比死背具体内存地址更稳。

### 面试回答模板

> JavaScript 常说有 8 种类型，其中 7 种原始类型是 number、string、boolean、null、undefined、symbol、bigint，另外一种是 object。原始值是不可变的，变量赋值时表现为值复制；对象是可变复合值，多个变量可以引用同一个对象，所以修改对象内容会被其他引用观察到。

---

## 6. 如何判断数据类型？typeof、instanceof、Object.prototype.toString 有什么区别？

### 1）typeof

适合快速判断多数原始类型：

```js
typeof 1;          // "number"
typeof 'hello';    // "string"
typeof true;       // "boolean"
typeof undefined;  // "undefined"
typeof 1n;         // "bigint"
typeof Symbol();   // "symbol"
typeof function(){}; // "function"
```

问题：

```js
typeof null; // "object"
typeof [];   // "object"
typeof {};   // "object"
```

所以 `typeof` 不适合精细地区分对象种类。

### 2）instanceof

`instanceof` 判断的是：

> 某个构造函数的 `prototype` 是否出现在对象的原型链上。

```js
[] instanceof Array;  // true
[] instanceof Object; // true
```

为什么第二个也是 true？因为数组最终也会沿原型链走到 `Object.prototype`。

因此它不是“精准获取对象类型名称”的 API，而是“原型链关系判断”。

局限：

- 原始值一般不适用；
- 不同 realm（例如不同 iframe）里的构造函数不是同一个对象，可能导致判断失效；
- 原型链可被人为修改。

### 3）Object.prototype.toString.call

```js
Object.prototype.toString.call([]);        // "[object Array]"
Object.prototype.toString.call(new Date()); // "[object Date]"
Object.prototype.toString.call(/a/);       // "[object RegExp]"
Object.prototype.toString.call(null);      // "[object Null]"
```

这是传统面试里非常通用的精细类型识别方式。

### 4）实际开发还会用专用 API

比如判断数组：

```js
Array.isArray(value);
```

通常比自己写 `toString` 更直接。

### 三者怎么选？

| 方法 | 适合场景 | 主要局限 |
|---|---|---|
| `typeof` | 快速判断原始类型、函数 | `null` 和普通对象问题，无法细分对象 |
| `instanceof` | 判断实例与构造函数的原型链关系 | 跨 realm、原型链可变 |
| `Object.prototype.toString.call` | 传统方式精细区分内建对象 | 写法较长 |

### 如何判断 null？

最直接：

```js
value === null
```

不能用：

```js
value instanceof null // 语法/语义都不成立
```

### 面试回答模板

> typeof 适合快速判断大多数原始类型，但 typeof null 是 object，而且数组、对象等都会得到 object。instanceof 判断的是构造函数 prototype 是否在对象原型链上，适合判断实例关系，但跨 iframe 可能失效。需要更精细地区分内建对象时，可以用 Object.prototype.toString.call；像数组这种常见类型，实际开发优先用 Array.isArray。

---

## 7. 原型链是什么？JavaScript 的继承是如何实现的？

### 先理解三个概念

每个普通对象内部都有一个 `[[Prototype]]` 内部槽，可以通过：

```js
Object.getPrototypeOf(obj)
```

读取。

历史上常见：

```js
obj.__proto__
```

但业务代码更推荐标准 API。

函数对象通常还有一个 `prototype` 属性：

```js
function Person() {}
console.log(Person.prototype);
```

这个 `prototype` 主要在“把函数作为构造函数 `new`”时发挥作用。

### new 以后发生什么关系？

```js
function Person(name) {
  this.name = name;
}

Person.prototype.sayHi = function () {
  console.log('hi');
};

const p = new Person('Tom');
```

关键关系：

```text
p.[[Prototype]] === Person.prototype
```

也就是常见写法：

```js
Object.getPrototypeOf(p) === Person.prototype; // true
```

### 属性是怎么查找的？

执行：

```js
p.sayHi();
```

查找过程可以理解成：

```text
p 自身有没有 sayHi？
  ↓ 没有
Person.prototype 有没有？
  ↓ 有
调用它
```

如果还没有，就继续沿着 `[[Prototype]]` 向上找，直到 `null`。

这条连续的原型关系就是常说的 **原型链**。

### JavaScript 继承的本质

JavaScript 是基于原型的语言。`class extends` 虽然语法更像传统 OOP，但底层仍然建立在对象与原型关系之上。

```js
class Animal {
  speak() {
    console.log('animal');
  }
}

class Dog extends Animal {
  bark() {
    console.log('wang');
  }
}
```

实例 `dog` 可以调用 `speak`，本质仍然与原型链上的方法查找有关。

### 常见继承方式

面试资料里常见历史写法：

- 原型链继承；
- 构造函数借用；
- 组合继承；
- 寄生组合继承；
- `class extends`。

现代业务开发通常直接使用 `class extends` 或组合模式，不需要为了“继承”去手写复杂原型操作；但原型链原理仍然是高频考点。

### 面试回答模板

> JavaScript 对象内部有 [[Prototype]]，对象查找属性时会先看自身，没有就沿着 [[Prototype]] 一层层向上查，直到 null，这条链就是原型链。构造函数被 new 时，新对象的 [[Prototype]] 会指向构造函数的 prototype。JavaScript 的继承本质上是基于原型关系实现的，class/extends 只是更现代的语法形式。

---

## 8. 闭包是什么？有哪些应用场景？可能产生什么问题？

### 定义

闭包可以理解为：

> 函数与它创建时所处的词法环境之间的组合，使函数即使在外层执行结束后，仍然可以访问当时作用域中的变量。

### 最简单例子

```js
function outer() {
  let count = 0;

  return function inner() {
    count++;
    return count;
  };
}

const counter = outer();
console.log(counter()); // 1
console.log(counter()); // 2
```

`outer()` 已经执行结束，但 `inner` 仍然引用 `count`，因此相关词法环境仍然可达。

### 应用场景一：数据私有化

```js
function createCounter() {
  let count = 0;

  return {
    inc() {
      count++;
    },
    get() {
      return count;
    }
  };
}
```

外部不能直接访问 `count`，只能通过暴露的方法操作。

### 应用场景二：函数工厂 / 柯里化

```js
function multiply(a) {
  return function (b) {
    return a * b;
  };
}

const double = multiply(2);
console.log(double(5)); // 10
```

### 应用场景三：封装模块状态

早期 JavaScript 经常通过 IIFE + 闭包实现模块私有变量：

```js
const module = (() => {
  let secret = 42;

  return {
    getSecret() {
      return secret;
    }
  };
})();
```

现代 ESM 自带模块作用域，但“函数保留词法环境”的闭包机制仍然广泛存在。

### 闭包一定导致内存泄漏吗？

不是。

闭包只是让仍被使用的数据继续保持可达。如果闭包本身不再可达，它和相关环境照样可以被 GC 回收。

真正的问题是：**不需要的数据因为某些闭包或引用关系长期保持可达。**

例如：

```js
let handler = null;

function mount() {
  const hugeData = new Array(1e6).fill('x');

  handler = () => {
    console.log(hugeData.length);
  };
}
```

只要全局 `handler` 一直存在，`hugeData` 就仍然被引用。

### 面试回答模板

> 闭包是函数和它定义时词法作用域的组合。内部函数引用外层变量以后，即使外层函数已经执行完，只要这个内部函数仍然可达，相关变量就还能被访问。常见应用包括私有变量、函数工厂/柯里化、模块封装。闭包本身不等于内存泄漏，但如果不再需要的闭包长期持有大对象、DOM 等引用，就可能造成内存长期无法释放。

---

## 9. var、let、const 的区别是什么？什么是变量提升和暂时性死区？

### 对比表

| 特性 | `var` | `let` | `const` |
|---|---|---|---|
| 作用域 | 函数作用域 | 块级作用域 | 块级作用域 |
| 声明前访问 | 得到 `undefined`（常见表现） | TDZ，报错 | TDZ，报错 |
| 重复声明 | 同作用域可重复 | 不可重复 | 不可重复 |
| 重新赋值 | 可以 | 可以 | 不可以重新绑定 |
| 声明时初始化 | 可不初始化 | 可不初始化 | 必须初始化 |

### var 的变量提升

```js
console.log(a); // undefined
var a = 1;
```

可以用“声明被提升、赋值仍留在原位置”理解：

```js
var a;
console.log(a);
a = 1;
```

这只是便于理解的等价模型，不是引擎真的把源码搬来搬去。

### let/const 也“被创建”，但有 TDZ

```js
console.log(a); // ReferenceError
let a = 1;
```

从进入作用域到真正执行声明语句之前，这段区域称作 **Temporal Dead Zone（暂时性死区）**。

### const 到底“不能改”什么？

`const` 不能重新绑定变量：

```js
const a = 1;
a = 2; // TypeError
```

但如果绑定的是对象，可以修改对象内容：

```js
const user = { name: 'A' };
user.name = 'B'; // 可以
```

不能做的是：

```js
user = {}; // 不可以重新绑定
```

因此更准确的说法是：**const 保证绑定不可重新赋值，不保证对象深度不可变。**

### 块级作用域有什么意义？

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
```

`let` 在循环中能形成符合预期的块级绑定，因此输出 `0 1 2`。

### 面试回答模板

> var 是函数作用域，可以重复声明，并且声明前访问常见表现是 undefined；let 和 const 是块级作用域，同一作用域不能重复声明，声明前处于 TDZ，访问会报错。const 声明时必须初始化，而且不能重新绑定，但如果值是对象，对象内部属性仍然可以修改。

---

## 10. 箭头函数和普通函数有什么区别？

### 最核心：this

普通函数的 `this` 通常由调用方式决定：

```js
const obj = {
  name: 'obj',
  say() {
    console.log(this.name);
  }
};

obj.say(); // obj
```

箭头函数没有自己的 `this`，它捕获外层词法环境中的 `this`：

```js
const obj = {
  name: 'obj',
  say: () => {
    console.log(this.name);
  }
};
```

这里箭头函数的 `this` 并不会因为写在 `obj` 里就自动指向 `obj`。

### 箭头函数没有自己的 arguments

普通函数：

```js
function foo() {
  console.log(arguments);
}
```

箭头函数通常改用 rest 参数：

```js
const foo = (...args) => {
  console.log(args);
};
```

### 不能作为构造函数 new

```js
const Person = () => {};
new Person(); // TypeError
```

箭头函数没有 `[[Construct]]`，因此不能被 `new`。

### 没有普通构造函数那样的 prototype

```js
function A() {}
console.log(A.prototype); // object

const B = () => {};
console.log(B.prototype); // undefined
```

### call/apply/bind 能改变箭头函数 this 吗？

不能像普通函数那样重新绑定。

```js
const arrow = () => console.log(this);
arrow.call({ x: 1 });
```

箭头函数仍然使用定义位置捕获到的 `this`。

### 什么时候适合箭头函数？

- `map/filter/reduce` 等短回调；
- Promise 回调；
- 希望直接沿用外层 `this` 的场景。

什么时候谨慎：

- 对象方法需要动态 `this`；
- 构造函数；
- 需要 `arguments`；
- 需要根据调用方式动态绑定 `this`。

### 面试回答模板

> 箭头函数和普通函数最核心的区别是箭头函数没有自己的 this，它会捕获外层词法 this；普通函数的 this 通常由调用方式决定。箭头函数也没有自己的 arguments，不能作为构造函数被 new，也没有普通构造函数那样的 prototype。短回调或者需要继承外层 this 时箭头函数很合适，但对象方法或构造函数场景要谨慎。

---
# 第二梯队：高频

## 11. JavaScript 为什么是单线程？又是如何实现异步编程的？

### 为什么主线程采用单线程执行模型？

在浏览器里，JavaScript 经常要直接操作 DOM。如果同一份 DOM 状态允许多段 JavaScript 同时无约束地写入，就会产生大量同步和竞争问题。

例如两个执行流同时操作同一个节点：

```text
任务 A：删除节点
任务 B：修改节点文本
```

如果没有严格的并发控制，最终结果会变得很难预测。

因此浏览器主线程上的 JavaScript 执行采用“同一时间执行一段 JS”的模型，显著降低了 DOM/页面状态编程的复杂度。

### 单线程不等于整个浏览器只有一个线程

这是高频误区。

浏览器内部当然可以有很多线程/进程负责：

- 网络；
- 定时；
- 渲染相关工作；
- 文件与系统 I/O；
- Worker 等。

“JavaScript 是单线程”通常说的是：**一个 JS realm/主线程中的 JavaScript 执行栈不会同时跑两段普通 JS。**

### 异步是怎么实现的？

异步能力不是“JS 自己偷偷开线程执行回调”，而是 JavaScript 调用宿主环境提供的能力：

```js
setTimeout(() => {
  console.log('later');
}, 1000);
```

可以简化理解为：

```text
JS 注册定时器
   ↓
浏览器负责计时
   ↓
条件满足后回调进入可执行队列
   ↓
Event Loop 安排它回到 JS 主线程执行
```

### 异步编程方式的演进

可以按这个顺序理解：

```text
回调函数
  ↓
Promise
  ↓
Generator（某些历史方案）
  ↓
async / await
```

回调没有消失，Promise 和 async/await 只是让复杂异步流程更容易组合和推理。

### Web Worker 算不算多线程 JavaScript？

算独立执行环境，但 Worker 和主线程不共享普通 JS 调用栈，也不能直接操作主线程 DOM。一般通过消息传递：

```js
worker.postMessage(data);
```

这避免了普通共享内存并发带来的大量问题（虽然现代 Web 平台也存在 SharedArrayBuffer/Atomics 这种更高级的共享内存能力）。

### 面试回答模板

> 浏览器主线程里的 JavaScript 同一时间执行一段代码，这种模型可以避免多个执行流同时修改 DOM 等共享页面状态带来的复杂竞争问题。但浏览器本身并不是单线程，网络、定时器等能力由宿主环境处理。异步任务完成后，对应回调进入等待队列，再由 Event Loop 安排回到 JavaScript 主线程执行。Promise 和 async/await 是在这套异步调度机制之上的编程抽象。

---

## 12. 宏任务和微任务分别有哪些？完整执行流程是什么？

这一题与 Event Loop 高度相关，但面试官经常单独问“你给我列一下”。

### 常见 task（宏任务）

浏览器中常见：

- 初始 `script`；
- `setTimeout` 回调；
- `setInterval` 回调；
- 某些 DOM 事件回调；
- I/O/消息任务等。

Node.js 中还会听到：

- `setImmediate`；
- timers / poll / check 等不同事件循环阶段。

### 常见 microtask

浏览器常见：

- `Promise.then`；
- `Promise.catch`；
- `Promise.finally`；
- `queueMicrotask`；
- `MutationObserver`。

Node.js 还有 `process.nextTick`，但它有自己更特殊的调度优先级，不要简单把 Node 的所有规则直接套到浏览器。

### 完整流程怎么答？

```text
1. 取一个 task 执行
2. task 中同步代码一直执行到调用栈清空
3. 清空 microtask 队列
4. microtask 执行过程中新增的 microtask 也继续执行
5. 浏览器可能进行渲染
6. 再进入下一 task
```

第 4 点经常被漏掉。

例如：

```js
Promise.resolve().then(() => {
  console.log(1);
  Promise.resolve().then(() => console.log(2));
});

setTimeout(() => console.log(3));
```

输出：

```text
1
2
3
```

因为清空微任务时，微任务内部新创建的微任务仍会在进入下一个 task 前继续被处理。

### 微任务太多会怎样？

如果不断递归添加 microtask：

```js
function loop() {
  queueMicrotask(loop);
}
loop();
```

浏览器可能长时间没有机会进入下一 task 或渲染，造成“微任务饥饿”。

### 面试回答模板

> 常见宏任务有 script、setTimeout、setInterval 和一些事件/I/O 回调；常见微任务有 Promise.then/catch/finally、queueMicrotask、MutationObserver。事件循环里会先执行一个当前 task，调用栈清空后把微任务队列清空，期间新增的微任务也继续执行，然后浏览器才有机会渲染并进入下一 task。

---

## 13. Promise.all、Promise.race、Promise.allSettled、Promise.any 有什么区别？

### 一张表先记住

| 方法 | 什么时候 fulfilled | 什么时候 rejected | fulfilled 的主要结果 |
|---|---|---|---|
| `Promise.all` | 所有输入都成功 | 任意一个先失败 | 按输入顺序组成结果数组 |
| `Promise.race` | 第一个 settled 的是成功 | 第一个 settled 的是失败 | 第一个 settled 的结果 |
| `Promise.allSettled` | 所有输入都 settled 后 | 正常输入场景下不会因为某项失败而 reject | 每项的 `{status, value/reason}` |
| `Promise.any` | 任意一个先成功 | 所有输入都失败 | 第一个成功结果 |

### Promise.all：全部成功才成功

```js
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts()
]);
```

适合：多个互不依赖的任务可以并行执行，而且**缺一不可**。

一个失败：

```js
Promise.all([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3)
]).catch(console.log); // error
```

注意：`Promise.all` 的“快速失败”并不会自动取消其他已经启动的异步任务。

### Promise.race：谁先 settled 就采用谁

```js
const timeout = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('timeout')), 3000);
});

await Promise.race([
  fetch('/api/data'),
  timeout
]);
```

适合做超时竞争等场景。

要特别注意：`race` 不是“第一个成功”，而是**第一个完成（无论成功或失败）**。

### Promise.allSettled：我要知道每一个最终结果

```js
const results = await Promise.allSettled([
  Promise.resolve('A'),
  Promise.reject('B')
]);

console.log(results);
```

结果类似：

```js
[
  { status: 'fulfilled', value: 'A' },
  { status: 'rejected', reason: 'B' }
]
```

适合批量操作后做结果汇总，比如“10 个文件分别上传，失败的单独展示”。

### Promise.any：只要有一个成功就行

```js
const result = await Promise.any([
  requestMirrorA(),
  requestMirrorB(),
  requestMirrorC()
]);
```

适合多个等价数据源，谁先成功用谁。

如果所有 Promise 都失败，`Promise.any` 会 reject，并给出 `AggregateError`。

### 面试回答模板

> Promise.all 要所有 Promise 都成功，有一个失败就会 reject；race 采用第一个 settled 的结果，不管成功还是失败；allSettled 会等所有任务都结束，再返回每一项的状态和结果，不会因为其中某项失败就整体失败；any 是第一个成功就成功，只有全部失败才 reject。

---

## 14. Event Loop 代码输出题怎么做？Promise + setTimeout + async/await 的统一解题方法

### 不要凭感觉，先分类

看到输出题，先把每一行分成三类：

1. 当前同步执行；
2. 创建 microtask；
3. 创建后续 task。

然后按：

```text
同步 → 清空微任务 → 后续 task
```

推演。

### 经典题一

```js
console.log(1);

setTimeout(() => console.log(2), 0);

Promise.resolve()
  .then(() => console.log(3))
  .then(() => console.log(4));

setTimeout(() => console.log(5), 0);

console.log(6);
```

同步：

```text
1
6
```

微任务：

```text
3
4
```

后续两个定时器 task 按注册/可执行顺序处理：

```text
2
5
```

最终：

```text
1 6 3 4 2 5
```

### 为什么第二个 then 不是一开始就进队列？

```js
p.then(fn1).then(fn2)
```

第二个 `then` 监听的是**第一个 then 返回的新 Promise**。只有 `fn1` 执行完成、前一个新 Promise 被敲定后，`fn2` 才具备继续调度条件。

### 经典题二：async/await

```js
async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}

async function async2() {
  console.log('async2');
}

console.log('script start');

setTimeout(() => {
  console.log('setTimeout');
}, 0);

async1();

new Promise((resolve) => {
  console.log('promise1');
  resolve();
}).then(() => {
  console.log('promise2');
});

console.log('script end');
```

常见现代浏览器/规范语义下的结果：

```text
script start
async1 start
async2
promise1
script end
async1 end
promise2
setTimeout
```

关键点：

- `async1()` 调用后先同步执行到 `await`；
- `async2()` 中的同步代码立即执行；
- `await` 后半段安排为后续微任务；
- `new Promise` 的 executor 同步执行，所以 `promise1` 是同步日志；
- `.then` 回调属于微任务；
- `setTimeout` 最后进入后续 task。

### 解题模板

草稿纸上画三个区：

```text
同步区：

microtask：

后续 task：
```

每执行一步就更新队列。不要只背固定题答案，因为面试官换一行代码就会失效。

---

## 15. new 一个构造函数时内部发生了什么？

### 典型代码

```js
function Person(name) {
  this.name = name;
}

Person.prototype.sayHi = function () {
  console.log(this.name);
};

const p = new Person('Tom');
```

### new 的核心步骤

面试可以按四步答：

```text
1. 创建一个新对象
2. 把新对象的 [[Prototype]] 关联到构造函数.prototype
3. 用新对象作为 this 调用构造函数
4. 根据构造函数显式返回值决定最终返回新对象还是显式对象
```

### 第四步为什么容易漏？

```js
function A() {
  this.x = 1;
  return { y: 2 };
}

console.log(new A()); // { y: 2 }
```

如果构造函数显式返回一个对象，那么 `new` 的结果使用这个对象。

如果返回原始值：

```js
function B() {
  this.x = 1;
  return 123;
}

console.log(new B()); // B { x: 1 }
```

原始值会被忽略，仍返回新创建的实例对象。

### 手写一个简化版 new

```js
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);

  const isObject =
    result !== null &&
    (typeof result === 'object' || typeof result === 'function');

  return isObject ? result : obj;
}
```

### 面试回答模板

> new 主要做四件事：先创建一个新对象，把它的原型关联到构造函数的 prototype；然后以这个新对象作为 this 执行构造函数；最后如果构造函数显式返回了对象，就使用那个对象，否则返回新创建的实例。这样实例就能通过原型链访问构造函数 prototype 上的方法。

---

## 16. call、apply、bind 的区别是什么？

### 共同点

三者都和函数的 `this` 绑定有关。

```js
function greet(greeting, punctuation) {
  console.log(greeting, this.name, punctuation);
}

const user = { name: 'Tom' };
```

### call：立即执行，参数逐个传

```js
greet.call(user, 'Hello', '!');
```

### apply：立即执行，参数以数组/类数组形式传

```js
greet.apply(user, ['Hello', '!']);
```

### bind：先返回一个新函数，不立即执行

```js
const bound = greet.bind(user, 'Hello');
bound('!');
```

### 对比表

| API | 是否立即执行 | 后续参数形式 | 主要返回值 |
|---|---|---|---|
| `call` | 是 | 逐个参数 | 原函数执行结果 |
| `apply` | 是 | 数组/类数组 | 原函数执行结果 |
| `bind` | 否 | 可预绑定参数 | 新函数 |

### bind 还能做偏函数

```js
function add(a, b) {
  return a + b;
}

const add10 = add.bind(null, 10);
console.log(add10(5)); // 15
```

### 重要追问：箭头函数呢？

箭头函数没有自己的动态 `this`，所以：

```js
const fn = () => this;
fn.call({ x: 1 });
```

`call/apply/bind` 不能把箭头函数的 `this` 改成 `{x: 1}`。

### 重要追问：bind 后的函数还能 new 吗？

普通可构造函数经过 `bind` 后仍可能作为构造函数使用。此时 `new` 的构造语义优先，绑定的 `thisArg` 不会作为实例 `this`。

这属于进阶追问，初级面试先把“执行时机 + 参数形式 + 返回值”答稳。

### 面试回答模板

> call 和 apply 都会立即调用函数并显式指定 this，区别主要是 call 的参数逐个传，apply 的参数用数组或类数组传。bind 不立即执行，而是返回一个绑定了 this、并且可以预绑定部分参数的新函数。它常用于回调、方法借用或者偏函数场景。

### 进阶：手写 call / apply / bind

如果面试官继续要求手写，可以先说明“下面实现核心行为，原生内建函数还涉及严格模式、跨 realm、Property Descriptor、bound function 的规范细节”。

#### 简化版 myCall

```js
Function.prototype.myCall = function (thisArg, ...args) {
  const context = thisArg == null ? globalThis : Object(thisArg);
  const key = Symbol('fn');

  context[key] = this;

  try {
    return context[key](...args);
  } finally {
    delete context[key];
  }
};
```

思路：临时把当前函数放到目标对象上，通过：

```js
context[key](...args)
```

形成“对象方法调用”，从而让普通函数里的 `this` 指向 `context`。用 Symbol 是为了尽量避免和原对象属性重名。

#### 简化版 myApply

```js
Function.prototype.myApply = function (thisArg, args = []) {
  const context = thisArg == null ? globalThis : Object(thisArg);
  const key = Symbol('fn');

  context[key] = this;

  try {
    return context[key](...args);
  } finally {
    delete context[key];
  }
};
```

它和 `myCall` 的核心区别就是参数来源不同。

#### 简化版 myBind

```js
Function.prototype.myBind = function (thisArg, ...boundArgs) {
  const fn = this;

  function bound(...laterArgs) {
    const calledWithNew = this instanceof bound;

    return fn.apply(
      calledWithNew ? this : thisArg,
      [...boundArgs, ...laterArgs]
    );
  }

  if (fn.prototype) {
    bound.prototype = Object.create(fn.prototype);
    Object.defineProperty(bound.prototype, 'constructor', {
      value: bound,
      writable: true,
      configurable: true
    });
  }

  return bound;
};
```

这里额外考虑了“绑定后的普通可构造函数仍可能被 `new`”的面试追问。真正的原生 `bind` 还有更多规范细节，因此手写题重点是解释：

```text
保存原函数和预绑定参数
      ↓
返回新函数
      ↓
普通调用时使用绑定 this
      ↓
new 调用时不能把实例 this 强行替换成 thisArg
```

---

## 17. this 的指向规则是什么？优先级怎么判断？

`this` 是 JavaScript 面试里最容易“凭代码位置猜”的知识点。

### 规则一：普通函数直接调用

```js
function foo() {
  console.log(this);
}

foo();
```

结果取决于运行模式与环境：

- 非严格模式浏览器普通脚本中，可能绑定到全局对象；
- 严格模式下是 `undefined`；
- ESM 顶层天然是严格模式语义。

所以面试里最好不要只背“普通调用 this 就是 window”。

### 规则二：作为对象方法调用

```js
const obj = {
  name: 'Tom',
  say() {
    console.log(this.name);
  }
};

obj.say(); // Tom
```

这里调用点是 `obj.say()`，所以方法执行时 `this` 指向 `obj`。

但一旦把函数拿出来：

```js
const fn = obj.say;
fn();
```

调用方式变了，`this` 也可能变。

### 规则三：call/apply/bind 显式绑定

```js
fn.call(obj);
```

普通函数可以显式指定 `this`。

### 规则四：new 绑定

```js
function Person(name) {
  this.name = name;
}

const p = new Person('Tom');
```

构造调用中，`this` 指向新创建的实例对象（除构造过程中的特殊显式返回规则外）。

### 规则五：箭头函数没有自己的 this

```js
const obj = {
  name: 'Tom',
  later() {
    setTimeout(() => {
      console.log(this.name);
    }, 0);
  }
};
```

箭头函数捕获 `later` 调用时词法环境中的 `this`。

### 常见优先级记法

针对普通函数，常见面试简化为：

```text
new 绑定
   ↓
显式绑定 call/apply/bind
   ↓
隐式绑定 obj.fn()
   ↓
默认绑定
```

箭头函数不参与这套动态绑定竞争，它直接使用外层词法 `this`。

### 一个陷阱

```js
const obj = {
  name: 'A',
  getName() {
    return function () {
      return this.name;
    };
  }
};

const fn = obj.getName();
console.log(fn());
```

`fn()` 是普通函数直接调用，它不会因为函数“从 obj 的方法里返回”就自动继承 obj 的 `this`。

如果返回箭头函数：

```js
getName() {
  return () => this.name;
}
```

情况才不同。

### 面试回答模板

> 普通函数的 this 主要由调用方式决定：new 构造调用会绑定新实例；call/apply/bind 可以显式绑定；obj.fn() 这种方法调用一般绑定到调用者 obj；直接函数调用则是默认绑定，严格模式下可能是 undefined。箭头函数没有自己的 this，它使用外层词法 this，所以不能用 call/apply/bind 按普通函数方式重新绑定。

---

## 18. 深拷贝有哪些实现方式？循环引用怎么处理？

### 浅拷贝是什么？

浅拷贝只创建一个新的第一层容器，内部嵌套对象仍可能共享引用：

```js
const source = {
  user: { name: 'Tom' }
};

const copy = { ...source };
copy.user.name = 'Jerry';

console.log(source.user.name); // Jerry
```

常见浅拷贝：

```js
{ ...obj }
Object.assign({}, obj)
arr.slice()
[...arr]
```

### JSON 序列化为什么不是真正通用深拷贝？

```js
const copy = JSON.parse(JSON.stringify(obj));
```

优点：简单。

局限很多：

- `undefined`、函数、Symbol 等会丢失或行为不同；
- `Date` 会变成字符串；
- `Map/Set` 等无法按原语义保留；
- 循环引用会直接报错；
- 特殊对象原型和属性描述符会丢失。

### structuredClone

现代环境优先考虑：

```js
const copy = structuredClone(source);
```

它可以处理很多常见结构，例如：

- 循环引用；
- `Date`；
- `RegExp`；
- `Map`；
- `Set`；
- ArrayBuffer 等。

但函数不能直接被结构化克隆。

### 手写深拷贝时为什么用 WeakMap？

考虑：

```js
const obj = {};
obj.self = obj;
```

直接递归：

```text
obj → self → obj → self → ...
```

会无限递归。

解决办法：记录“原对象 → 已创建副本”的映射。

```js
function deepClone(value, cache = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (cache.has(value)) {
    return cache.get(value);
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  if (value instanceof Map) {
    const result = new Map();
    cache.set(value, result);
    for (const [k, v] of value) {
      result.set(deepClone(k, cache), deepClone(v, cache));
    }
    return result;
  }

  if (value instanceof Set) {
    const result = new Set();
    cache.set(value, result);
    for (const item of value) {
      result.add(deepClone(item, cache));
    }
    return result;
  }

  const result = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));

  cache.set(value, result);

  for (const key of Reflect.ownKeys(value)) {
    result[key] = deepClone(value[key], cache);
  }

  return result;
}
```

核心不是背所有类型分支，而是明白：

```text
基础值直接返回
对象先查缓存
创建副本后立刻写缓存
再递归处理成员
```

### 为什么 WeakMap 比 Map 常见？

这里缓存只服务于一次克隆过程，而且键是源对象。`WeakMap` 对对象键是弱引用语义，更符合“辅助映射不应该额外决定对象生命周期”的设计意图。

### 面试回答模板

> 浅拷贝只复制第一层，嵌套对象仍可能共享引用；深拷贝需要递归地创建独立结构。JSON 序列化简单但会丢失很多特殊类型，也不能处理循环引用。现代环境可以优先用 structuredClone。手写时通常用递归加 WeakMap，WeakMap 记录已经克隆过的源对象，遇到循环引用直接返回对应副本，从而避免无限递归。

---

## 19. JavaScript 垃圾回收机制是什么？V8 新生代和老生代怎么工作？

### GC 要解决什么问题？

JavaScript 允许动态创建大量对象：

```js
function create() {
  return { data: new Array(1000).fill(0) };
}
```

开发者通常不手动 `free` 内存，引擎需要自动判断哪些对象还能被程序访问、哪些已经没有必要保留。

### 核心概念：可达性

现代垃圾回收通常围绕“对象是否仍然从根集合可达”展开。

可以粗略理解根包括：

- 当前执行栈中的活跃引用；
- 全局可达对象；
- 引擎/宿主维护的一些活跃引用。

如果某对象从根出发再也走不到，就有机会被回收。

### 标记-清除思想

简化模型：

```text
从根开始
  ↓
标记所有可达对象
  ↓
未被标记的对象视为垃圾
  ↓
释放/回收相关空间
```

相比早期“引用计数”，可达性模型能够处理普通循环引用：

```js
let a = {};
let b = {};
a.b = b;
b.a = a;

a = null;
b = null;
```

虽然两个对象互相引用，但从根已经不可达，仍可被 GC 回收。

### 为什么分代？

大量程序对象有一个经验特征：

> 很多对象“出生后很快死亡”，少量对象会存活很久。

因此 V8 等引擎会做分代管理，常见概念包括：

- 新生代（Young Generation）；
- 老生代（Old Generation）。

### 新生代

新创建、生命周期较短的对象常先进入年轻区域。

年轻代回收通常频率更高、单次处理范围更小。存活多次的对象可能晋升到老生代。

面试里常听到 Scavenge / Minor GC、semi-space 等术语。记住核心即可：

```text
新对象多 → 回收频繁 → 存活对象逐渐晋升
```

### 老生代

存活时间长、体积较大或从年轻代晋升的对象会进入老生代。

老生代通常采用标记清除、标记整理，并配合增量、并发等优化手段，目标是降低长时间 Stop-The-World 带来的卡顿。

### 为什么 GC 也会影响前端性能？

如果短时间创建海量对象：

```js
for (let i = 0; i < 1e6; i++) {
  list.push({ i });
}
```

会带来：

- 更多内存分配；
- 更频繁 GC；
- 主线程暂停风险；
- 页面掉帧。

所以性能优化不仅是“算法快”，也要关注对象分配和生命周期。

### 面试回答模板

> JavaScript 由垃圾回收器自动管理对象生命周期，核心依据是可达性：从根对象还能访问到的对象需要保留，不可达对象可以回收。V8 会做分代管理，新生代存放大量短生命周期对象，回收更频繁；存活较久的对象会晋升到老生代，老生代通常通过标记清除、标记整理以及增量/并发等策略降低暂停时间。内存泄漏的本质通常不是 GC 不工作，而是不需要的数据仍然保持可达。

---

## 20. 栈和堆有什么区别？JavaScript 中应该怎么理解？

### 先说计算机里的通用概念

**栈（Stack）** 常与这些概念关联：

- 函数调用帧；
- 局部执行状态；
- LIFO（后进先出）；
- 分配/释放非常快；
- 空间相对有限。

**堆（Heap）** 常用于：

- 动态大小对象；
- 生命周期不严格跟函数调用一致的数据；
- 由垃圾回收器参与管理的对象内存。

### JavaScript 调用栈

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  console.log('c');
}

a();
```

调用关系可以想成：

```text
push a frame
  push b frame
    push c frame
    pop c
  pop b
pop a
```

### 什么是栈溢出？

```js
function loop() {
  loop();
}

loop();
```

无限递归不断压入调用帧，最终会触发类似：

```text
RangeError: Maximum call stack size exceeded
```

### “基本类型在栈，对象在堆”是否绝对？

不要把它当规范保证。

面试中的简化模型可以帮助理解“值语义和引用关系”，但现代 JS 引擎会做大量优化，具体内存布局并不是 ECMAScript 语言层面规定的。

更可靠的回答方式：

> 调用栈主要管理函数执行上下文/帧；动态对象通常由 GC 管理的堆式区域承载。至于某个具体原始值最终被引擎放在哪里，属于实现和优化细节，不应简单绝对化。

### 面试回答模板

> 栈是后进先出的结构，在 JavaScript 执行层面最典型的是调用栈，用来管理函数调用帧；堆更适合管理动态分配、生命周期不固定的对象，并由 GC 负责回收。面试里经常说“基本类型在栈、对象在堆”，这可以作为简化理解，但不是 ECMAScript 对所有引擎实现的硬性规定。

---

# 第三梯队：中高频

## 21. JavaScript 数组有哪些常用方法？哪些会改变原数组？

面试不需要把所有方法背完，核心是能按“是否修改原数组”和“用途”分类。

### 会修改原数组的常见方法

```text
push
pop
shift
unshift
splice
sort
reverse
fill
copyWithin
```

示例：

```js
const arr = [3, 1, 2];
const result = arr.sort();

console.log(arr);    // [1, 2, 3]
console.log(result === arr); // true
```

### 不修改原数组、返回新结果的常见方法

```text
map
filter
slice
concat
flat
flatMap
toSorted
toReversed
toSpliced
with
```

其中 `toSorted/toReversed/toSpliced/with` 属于较新的非变异数组方法。

### 查询/判断类

```text
find
findIndex
findLast
findLastIndex
includes
indexOf
some
every
```

### 遍历/聚合类

```text
forEach
reduce
reduceRight
entries
keys
values
```

### splice 和 slice 别混

`slice(start, end)`：

- 不改原数组；
- 截取 `[start, end)`；
- 返回新数组。

`splice(start, deleteCount, ...items)`：

- 修改原数组；
- 可以删除/插入/替换元素；
- 返回被删除元素。

### 面试回答模板

> 数组方法我一般按是否修改原数组分类。push、pop、shift、unshift、splice、sort、reverse 等会修改原数组；map、filter、slice、concat、flat 以及新的 toSorted/toReversed/toSpliced 会返回新结果，不直接修改原数组。查询类还有 find、includes、some、every，聚合常用 reduce。

---

## 22. for...in 和 for...of 有什么区别？

### for...in：遍历可枚举属性键

```js
const obj = { a: 1, b: 2 };

for (const key in obj) {
  console.log(key);
}
```

它主要遍历对象的**可枚举字符串属性名**，并且会涉及原型链上的可枚举属性，所以对象业务代码里经常配合：

```js
Object.hasOwn(obj, key)
```

判断自有属性。

### for...of：消费 iterable

```js
const arr = ['a', 'b'];

for (const value of arr) {
  console.log(value);
}
```

`for...of` 使用对象的迭代协议，本质会查找：

```js
value[Symbol.iterator]
```

常见可迭代对象：

- Array；
- String；
- Map；
- Set；
- TypedArray；
- NodeList（现代浏览器中常见实现）。

### 为什么不建议 for...in 遍历数组？

```js
const arr = ['a', 'b'];
arr.extra = 123;

for (const key in arr) {
  console.log(key);
}
```

可能得到：

```text
0
1
extra
```

它遍历的是属性键，不是“数组值迭代语义”。

### 面试回答模板

> for...in 遍历的是对象的可枚举属性键，并且可能包含原型链上的可枚举属性；for...of 走的是迭代协议，遍历 iterable 产生的值，适合 Array、Map、Set、String 等。数组一般优先用 for...of 或数组方法，不建议用 for...in 当普通数组遍历。

---

## 23. map 和 forEach 有什么区别？

### 最核心区别：返回值语义

`map` 用于“映射成一个新数组”：

```js
const nums = [1, 2, 3];
const doubled = nums.map((x) => x * 2);

console.log(doubled); // [2, 4, 6]
```

`forEach` 用于逐项执行副作用：

```js
nums.forEach((x) => {
  console.log(x);
});
```

`forEach` 返回值是 `undefined`。

### map 会不会修改原数组？

`map` 本身创建新数组，但回调如果修改了数组内部的对象，原对象当然仍然可能被改变：

```js
const users = [{ name: 'A' }];

const result = users.map((user) => {
  user.name = 'B';
  return user;
});

console.log(users[0].name); // B
```

所以“map 不修改原数组”更准确地说是：**map 不通过自己的数组结构操作去替换原数组，但回调里的副作用由你自己负责。**

### async + forEach 的经典坑

```js
await items.forEach(async (item) => {
  await save(item);
});
```

`forEach` 不会等待回调返回的 Promise，所以外层 `await` 没有达到“等待所有 save”效果。

需要并行：

```js
await Promise.all(items.map(save));
```

需要串行：

```js
for (const item of items) {
  await save(item);
}
```

### 面试回答模板

> map 和 forEach 都可以遍历数组，但语义不同。map 会根据每一项回调返回值生成一个新的结果数组，适合数据转换；forEach 主要用于执行副作用，返回 undefined。另外 async 回调配合 forEach 是常见坑，因为 forEach 不会等待每个 Promise。

---

## 24. reduce 有哪些使用场景？

### reduce 的本质

`reduce` 是把一组值逐步“累积”为一个结果：

```js
array.reduce((acc, item) => nextAcc, initialValue)
```

### 场景一：求和

```js
const sum = [1, 2, 3].reduce((acc, n) => acc + n, 0);
```

### 场景二：频率统计

```js
const words = ['a', 'b', 'a'];

const count = words.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});
```

结果：

```js
{ a: 2, b: 1 }
```

### 场景三：数组转对象

```js
const users = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
];

const byId = users.reduce((acc, user) => {
  acc[user.id] = user;
  return acc;
}, {});
```

### 场景四：分组

```js
const grouped = users.reduce((acc, user) => {
  const key = user.role;
  (acc[key] ||= []).push(user);
  return acc;
}, {});
```

现代环境也可以关注 `Object.groupBy/Map.groupBy` 等更直接的分组 API，但面试里 `reduce` 依然很常考。

### initialValue 为什么重要？

```js
[].reduce((a, b) => a + b);
```

空数组且没有初始值会抛错。

因此业务代码通常显式给初始值，类型和边界都更清晰。

### 面试回答模板

> reduce 的核心是把数组逐项累积成一个最终结果。常见场景包括求和、计数、分组、数组转对象、组合数据结构。实际写的时候我一般会显式传 initialValue，这样空数组行为和累加器类型都更确定。

---

## 25. 数组去重有哪些方法？

### 方法一：Set

最常用：

```js
const unique = [...new Set([1, 2, 2, 3])];
```

适合原始值去重。

### 方法二：filter + indexOf

```js
const unique = arr.filter((item, index) => {
  return arr.indexOf(item) === index;
});
```

可读，但大数组上会有重复搜索，复杂度通常不如 Set 方案。

### 方法三：对象数组按 id 去重

```js
const users = [
  { id: 1, name: 'A' },
  { id: 1, name: 'B' },
  { id: 2, name: 'C' }
];

const unique = [...new Map(
  users.map((user) => [user.id, user])
).values()];
```

这里后出现的同 id 对象会覆盖前面的。

如果希望保留第一个：

```js
const seen = new Set();
const unique = users.filter((user) => {
  if (seen.has(user.id)) return false;
  seen.add(user.id);
  return true;
});
```

### 对象能直接用 Set 做“内容去重”吗？

```js
new Set([{ a: 1 }, { a: 1 }]).size // 2
```

因为两个对象引用不同。若要按内容或业务 key 去重，需要定义自己的比较依据。

### 面试回答模板

> 原始值数组最直接用 Set 去重，例如 `[...new Set(arr)]`。对象数组通常要根据业务字段去重，可以用 Map 以 id 作为 key，或者 Set 记录已经出现过的 id。Set 对对象比较的是引用身份，不会自动按对象内容判断相等。

---

## 26. 数组扁平化怎么实现？

### 原生 flat

```js
const arr = [1, [2, [3]]];

arr.flat(1);        // [1, 2, [3]]
arr.flat(Infinity); // [1, 2, 3]
```

### 递归实现

```js
function flatten(arr) {
  const result = [];

  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flatten(item));
    } else {
      result.push(item);
    }
  }

  return result;
}
```

### reduce 版本

```js
function flatten(arr) {
  return arr.reduce((acc, item) => {
    return acc.concat(
      Array.isArray(item) ? flatten(item) : item
    );
  }, []);
}
```

### 指定深度怎么写？

```js
function flattenDepth(arr, depth = 1) {
  if (depth <= 0) return arr.slice();

  return arr.reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...flattenDepth(item, depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}
```

### 面试回答模板

> 现代 JavaScript 可以直接用 Array.prototype.flat，传 Infinity 可以完全扁平化。手写一般用递归遍历，遇到数组继续展开，普通值直接加入结果；如果面试官要求指定深度，就在递归时递减 depth。

---

## 27. 如何判断一个对象是不是空对象？

最常见：

```js
Object.keys(obj).length === 0
```

但要先明确“空对象”定义。

### 只关心自有可枚举字符串属性

```js
Object.keys(obj).length === 0
```

### 连 Symbol 自有属性也要考虑

```js
Reflect.ownKeys(obj).length === 0
```

### 如果还要限制必须是普通对象

```js
function isPlainEmptyObject(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }

  return Reflect.ownKeys(value).length === 0;
}
```

### 为什么 `JSON.stringify(obj) === '{}'` 不推荐？

它依赖序列化规则，会忽略某些属性类型，也绕了远路，不是清晰的意图表达。

### 面试回答模板

> 如果“空对象”定义为没有自有可枚举字符串属性，可以用 Object.keys(obj).length === 0；如果 Symbol 属性也算，就用 Reflect.ownKeys。实际项目最好先确认是否还需要限定为普通对象，因为 Date、Map 等对象即使 Object.keys 为空，也不代表业务上是“空普通对象”。

---

## 28. Object 和其他数据类型的本质区别是什么？

### 对象是属性集合 + 内部行为

普通对象可以看作动态的 key-value 属性集合，同时还具有内部原型关系和属性描述符机制。

```js
const user = {
  name: 'Tom',
  age: 18
};
```

对象属性键最终主要是：

- String；
- Symbol。

例如：

```js
const obj = {};
obj[1] = 'a';
console.log(obj['1']); // a
```

数字 key 会被转换成字符串属性键。

### 对象与原始值的区别

原始值：

- 不可变；
- 没有可直接修改的属性集合；
- 按值语义理解。

对象：

- 可变；
- 可以动态添加/删除属性；
- 可以有原型链；
- 多个变量可共享同一对象引用。

### 为什么字符串也能调用方法？

```js
'abc'.toUpperCase();
```

这不代表字符串原始值本身变成了永久对象。语言运行时可以进行临时装箱/抽象处理，让原始值能够访问对应原型方法。

### Object 和 Map 的区别顺带怎么答？

Object 更适合：

- 固定字段的数据记录；
- JSON 风格数据；
- 需要原型/属性描述符的对象模型。

Map 更适合：

- 动态键集合；
- 任意类型 key；
- 频繁增删查；
- 直接需要 `size` 和可靠迭代顺序。

### 面试回答模板

> 原始类型是不可变值，而 Object 是可变的复合结构，可以动态持有属性、具有原型关系和属性描述符。对象变量可以共享同一对象引用。普通 Object 的属性键主要是字符串和 Symbol；如果需要任意类型的 key、频繁增删和直接迭代，Map 往往更合适。

---

## 29. Object.defineProperty 和 Proxy 有什么区别？

这道题经常和 Vue 2 / Vue 3 响应式原理一起问。

### Object.defineProperty 做什么？

它针对**某一个对象属性**定义访问描述符：

```js
const obj = {};
let value = 1;

Object.defineProperty(obj, 'count', {
  get() {
    console.log('get');
    return value;
  },
  set(newValue) {
    console.log('set', newValue);
    value = newValue;
  }
});
```

它能拦截某个已定义属性的读取和写入。

### Proxy 做什么？

Proxy 是对一个对象的**多种对象操作**建立代理层：

```js
const target = { count: 1 };

const proxy = new Proxy(target, {
  get(target, key, receiver) {
    console.log('get', key);
    return Reflect.get(target, key, receiver);
  },

  set(target, key, value, receiver) {
    console.log('set', key, value);
    return Reflect.set(target, key, value, receiver);
  }
});
```

除了 `get/set`，Proxy 还能拦截：

- `has`；
- `deleteProperty`；
- `ownKeys`；
- `defineProperty`；
- `construct`；
- `apply` 等。

### 最大区别

`defineProperty` 更像“逐个属性安装 getter/setter”。

Proxy 更像“在对象外面套一个代理，统一拦截对象级操作”。

### 新增属性呢？

Proxy 天然能观察通过代理发生的新增：

```js
proxy.newKey = 123;
```

传统基于 `defineProperty` 的响应式如果只在初始化时遍历已有属性，就无法自动给未来新增属性预先安装 getter/setter，因此需要额外机制。

### 数组呢？

Proxy 可以更自然地拦截索引、长度等相关对象操作；基于 `defineProperty` 的旧方案往往需要对数组变异方法做额外处理。

### Reflect 为什么经常和 Proxy 搭配？

```js
Reflect.get(target, key, receiver)
```

它能更标准地执行默认对象语义，并在访问器、receiver 等细节上更稳健，比简单写 `target[key]` 更适合代理 trap 内部转发。

### 面试回答模板

> Object.defineProperty 是针对具体属性定义 getter/setter，而 Proxy 是对整个对象建立代理，可以统一拦截 get、set、delete、has、ownKeys 等多种操作。Proxy 对新增属性和数组索引等场景处理更自然，所以 Vue 3 使用 Proxy 做响应式；Vue 2 基于 defineProperty，需要初始化时遍历属性并对数组等情况做额外处理。

---
# 第四梯队：中频

## 30. JavaScript 模块化机制是什么？ESM 是如何运行的？

### 为什么需要模块化？

早期 JavaScript 常把大量代码直接放在全局：

```js
var user = {};
var config = {};
var request = function () {};
```

项目一大就会出现：

- 全局变量冲突；
- 依赖关系不清晰；
- 加载顺序难管理；
- 代码复用和测试困难。

模块化的目标，就是把代码拆成具有明确输入和输出边界的单元。

### 常见模块方案的历史脉络

面试里可能听到：

```text
IIFE / 命名空间
   ↓
CommonJS
AMD / CMD
   ↓
ES Module（ESM）
```

现代浏览器和现代前端工程的标准模块机制是 ESM。

### ESM 基本语法

导出：

```js
// math.js
export const PI = 3.14;

export function add(a, b) {
  return a + b;
}

export default function multiply(a, b) {
  return a * b;
}
```

导入：

```js
import multiply, { PI, add } from './math.js';
```

### ESM 的关键特点一：静态结构

静态 `import/export` 的依赖关系可以在模块真正执行之前被分析：

```js
import { add } from './math.js';
```

这让构建工具能够进行：

- 依赖图分析；
- tree shaking；
- 代码拆分优化；
- 静态错误检查。

### 关键特点二：模块有独立作用域

```js
// a.js
const secret = 123;
```

如果不 `export`，其他模块不能直接访问这个绑定。

### 关键特点三：import 是 live binding

```js
// counter.js
export let count = 0;
export function inc() {
  count++;
}
```

```js
// main.js
import { count, inc } from './counter.js';

console.log(count); // 0
inc();
console.log(count); // 1
```

导入的是一个“活绑定”的视图，不是 CommonJS 风格中简单把当时值复制出来的理解。

### ESM 大致运行阶段

可以用三个概念理解：

```text
解析/构建模块记录
       ↓
链接依赖、建立绑定
       ↓
按依赖关系求值执行
```

模块循环依赖时，ESM 的 live binding 和初始化时序尤其重要。

### 动态 import

```js
const module = await import('./feature.js');
```

动态 `import()` 返回 Promise，适合按需加载和代码分割。

### 面试回答模板

> 模块化的目的主要是隔离作用域、明确依赖和导出边界。现代 JavaScript 标准模块是 ESM，通过 import/export 声明依赖。静态 import 的依赖结构可以在执行前分析，所以有利于 tree shaking 等构建优化。ESM 每个模块有自己的作用域，而且 import 是 live binding；模块一般经历解析、链接、求值执行几个阶段。动态 import() 则返回 Promise，可以用于按需加载。

---

## 31. JS 模块导入时会不会执行 IIFE？ESM 导入到底会执行什么？

这道题容易因为“IIFE、模块作用域、打包器包装函数”几个概念混在一起而答乱。

### 先给结论

> **ESM 的 import 本身不等于 IIFE，也不要求浏览器把模块变成 IIFE。**

但是：

> 当一个模块第一次被求值时，它的顶层代码会执行一次；如果顶层代码中本来就写了 IIFE，那么这个 IIFE 当然会随模块求值而执行。

### 示例

```js
// module.js
console.log('module top-level');

(() => {
  console.log('IIFE run');
})();

export const x = 1;
```

```js
// main.js
import { x } from './module.js';
```

当 `module.js` 首次求值时会输出：

```text
module top-level
IIFE run
```

这不是“import 自动执行 IIFE”，而是“import 触发依赖模块进入模块加载/求值过程，模块自己的顶层代码被执行”。

### 同一个模块导入多次会执行多次吗？

通常同一个模块实例在同一个模块图/realm 中只会完成一次求值：

```js
import './module.js';
import './module.js';
```

不会因为写了两次静态 import 就把模块顶层逻辑重新运行两遍。

### 为什么有些打包产物看起来像 IIFE？

Webpack、Rollup、旧式 bundler 或某些输出格式，可能把多个模块包装到一个运行时函数或 IIFE 中。

这是**构建产物实现策略**，不是 ESM 语言语义本身。

### 面试回答模板

> ESM import 本身不是 IIFE。模块第一次被加载并求值时，会执行模块顶层代码一次；如果模块顶层自己写了 IIFE，那么 IIFE 会在这个求值过程中执行。某些打包器最后可能把模块包装成 IIFE 或运行时函数，那属于打包产物实现，不应该和原生 ESM 机制混为一谈。

---

## 32. ES6 有哪些新特性？

面试里“ES6”通常泛指现代 JavaScript，但如果想答得严谨，要注意：`async/await` 是 ES2017，不属于严格意义上的 ES2015（ES6）。

### ES6 / ES2015 高频特性

#### let / const 与块级作用域

```js
let count = 0;
const MAX = 10;
```

#### 箭头函数

```js
const add = (a, b) => a + b;
```

#### 模板字符串

```js
const msg = `hello ${name}`;
```

#### 解构赋值

```js
const { id, name } = user;
const [first, second] = list;
```

#### 默认参数

```js
function greet(name = 'Guest') {}
```

#### rest / spread

```js
function sum(...nums) {}

const copy = { ...obj };
const arr2 = [...arr1];
```

#### class

```js
class Person {
  constructor(name) {
    this.name = name;
  }
}
```

#### Module

```js
export const value = 1;
import { value } from './a.js';
```

#### Promise

```js
Promise.resolve(1).then(console.log);
```

#### Map / Set / WeakMap / WeakSet

用于新的集合和映射场景。

#### Symbol

```js
const key = Symbol('key');
```

#### 迭代器与 Generator

```js
function* gen() {
  yield 1;
  yield 2;
}
```

### 面试里怎么答最好？

不要一次背二十个名词。建议按类别回答：

```text
变量作用域：let / const
函数：箭头函数、默认参数、rest
语法：模板字符串、解构、spread
面向对象：class
异步：Promise
模块化：import/export
集合：Map/Set、Symbol
迭代：Iterator/Generator
```

### 面试回答模板

> ES6，也就是 ES2015，引入了很多现代 JavaScript 的基础能力，比如 let/const 和块级作用域、箭头函数、模板字符串、解构、默认参数、rest/spread、class、Promise、Map/Set、Symbol、Iterator/Generator 和原生 ESM。需要注意 async/await 是后续 ES2017 的能力，面试里有时会被泛称为 ES6+。

---

## 33. class 和 function 构造函数有什么区别？

### 二者都建立在原型机制上

传统构造函数：

```js
function Person(name) {
  this.name = name;
}

Person.prototype.say = function () {
  console.log(this.name);
};
```

class：

```js
class Person {
  constructor(name) {
    this.name = name;
  }

  say() {
    console.log(this.name);
  }
}
```

实例方法最终仍与 `Person.prototype` 相关，因此 `class` 不是一套脱离原型链的新对象系统。

### 关键差异一：class 不能不加 new 调用

```js
class Person {}
Person(); // TypeError
```

传统普通函数则可以直接调用：

```js
function Person() {}
Person(); // 可以作为普通函数调用
```

### 关键差异二：class 声明存在 TDZ 风格行为

```js
new Person(); // ReferenceError
class Person {}
```

不要像 `function declaration` 那样认为可以在声明前正常使用。

### 关键差异三：class body 使用严格模式语义

class 中的方法默认在严格模式语义下运行。

### 关键差异四：原型方法默认不可枚举

```js
class A {
  foo() {}
}

Object.keys(A.prototype); // 通常看不到 foo
```

而直接：

```js
A.prototype.foo = function () {};
```

得到的普通赋值属性默认是可枚举的。

### extends / super 更标准

```js
class Dog extends Animal {
  constructor(name) {
    super(name);
  }
}
```

相比传统手工构造原型链，语法更清晰，并处理了很多构造细节。

### 面试回答模板

> class 本质上仍建立在 JavaScript 原型机制上，实例方法也主要放在 prototype 上。但 class 提供了更严格、规范的类语法：必须通过 new 调用，声明前不能像函数声明那样直接使用，class body 是严格模式，而且原型方法默认不可枚举。extends/super 也把继承相关的原型和构造细节统一成了标准语法。

---

## 34. WeakMap 和 Map 有什么区别？

### Map

```js
const map = new Map();
const key = {};

map.set(key, 'value');
console.log(map.get(key));
```

特点：

- key 可以是各种值；
- 可迭代；
- 有 `size`；
- 可以 `keys/values/entries`；
- Map 持有键的普通强引用关系。

### WeakMap

```js
const wm = new WeakMap();
const key = {};

wm.set(key, 'metadata');
```

典型使用方式是以对象作为 key，并且 key 的存在不会仅仅因为 WeakMap 这条关联就被强制保活。

### 为什么叫 Weak？

如果一个对象除了 WeakMap 键关联以外不再从其他地方可达，那么垃圾回收器仍可以回收它。

```text
对象 key
 ↑
仅 WeakMap 弱关联

外部强引用消失
  ↓
key 可以被 GC
  ↓
对应 WeakMap 条目自然消失
```

### 为什么 WeakMap 不可枚举？

如果能够可靠枚举：

```js
for (const key of weakMap) {}
```

那么程序就能观察“哪些 key 还没被 GC”，而 GC 的时机本来就不应该成为稳定的业务语义。

因此 WeakMap 没有普通 Map 那样的：

- `size`；
- `keys()`；
- `values()`；
- `entries()`；
- 普通迭代。

### 对比

| 特性 | Map | WeakMap |
|---|---|---|
| 典型 key | 任意值 | 对象键场景 |
| 是否可迭代 | 是 | 否 |
| `size` | 有 | 无 |
| 是否会强保活对象 key | 会形成普通强引用 | 不会仅因弱键关系保活 |
| 典型场景 | 普通映射、缓存、计数 | 对象元数据、生命周期绑定缓存 |

### 面试回答模板

> Map 是普通键值映射，可迭代、有 size，键和值都会按正常引用语义保留。WeakMap 主要用于以对象为 key 的弱关联，如果这个对象在其他地方已经不可达，不会因为它仍是 WeakMap 的 key 就阻止 GC。也正因为 GC 时机不可观察，WeakMap 不提供遍历和 size，常用于对象元数据和跟对象生命周期绑定的缓存。

---

## 35. WeakMap 有哪些应用场景？

### 场景一：对象私有元数据

```js
const privateData = new WeakMap();

class User {
  constructor(name) {
    privateData.set(this, { token: 'secret' });
    this.name = name;
  }

  getToken() {
    return privateData.get(this).token;
  }
}
```

实例消失后，WeakMap 不会为了内部这条映射把实例永久保活。

现代 class 也有真正的 `#private` 私有字段，但 WeakMap 仍然是理解弱引用数据关联的经典例子。

### 场景二：DOM 元数据

```js
const meta = new WeakMap();

function register(element) {
  meta.set(element, {
    mountedAt: Date.now()
  });
}
```

DOM 对象如果被移除并且没有其他强引用，WeakMap 不会因为元数据关联阻止它回收。

### 场景三：递归算法防循环引用

深拷贝：

```js
const visited = new WeakMap();
```

序列化、图遍历等对象算法也可能使用类似模式。

### 场景四：对象级缓存

```js
const cache = new WeakMap();

function compute(obj) {
  if (cache.has(obj)) {
    return cache.get(obj);
  }

  const result = expensiveCompute(obj);
  cache.set(obj, result);
  return result;
}
```

当 `obj` 不再被业务使用时，缓存不会单独让它永远留在内存里。

### 面试回答模板

> WeakMap 最适合“数据生命周期跟某个对象绑定”的场景，比如保存对象私有元数据、DOM 元数据、对象级缓存，以及深拷贝里记录访问过的对象。它的优势是不会仅因为 key 存在于 WeakMap 就把对象强制保活，因此能减少某些手动清理缓存的压力。

---

## 36. typeof null 为什么是 object？实际开发怎么判断 null？

### 结论

```js
typeof null // "object"
```

这是 JavaScript 早期设计留下的历史兼容行为，并不是说 `null` 真的是普通对象。

### null 的语言类型仍然是独立原始类型

JavaScript 原始类型里明确有：

```text
Null
```

所以不要看到 `typeof null === 'object'` 就把 null 放进“引用类型”。

### 为什么一直不修？

因为 JavaScript 的 Web 兼容性要求极高。

大量旧代码可能已经依赖这个行为。如果今天直接改成：

```js
typeof null === 'null'
```

会破坏既有网页和库，因此这个历史行为一直保留。

### 正确判断方式

```js
value === null
```

如果想判断“null 或 undefined”：

更清晰写法：

```js
value === null || value === undefined
```

有些代码会使用：

```js
value == null
```

因为抽象相等规则下它能同时匹配 `null` 和 `undefined`，但是否采用取决于团队规范。面试里如果问“精确判断 null”，直接回答 `value === null`。

### 面试回答模板

> typeof null 会得到 object，这是 JavaScript 早期实现留下的历史兼容行为，但 null 本身仍然是独立的原始类型。这个行为因为 Web 兼容性不能轻易修改。实际开发判断 null 最直接就是 `value === null`。

---

## 37. 为什么不可迭代对象不能使用 for...of？

### for...of 不是“遍历任何对象”

`for...of` 要求右侧值符合 **Iterable Protocol（可迭代协议）**。

核心是对象需要提供：

```js
obj[Symbol.iterator]
```

它应该返回一个 iterator。

### 数组为什么可以？

```js
const arr = [1, 2, 3];
console.log(typeof arr[Symbol.iterator]); // function
```

因此：

```js
for (const value of arr) {
  console.log(value);
}
```

### 普通对象为什么默认不行？

```js
const obj = { a: 1, b: 2 };

for (const value of obj) {
  // TypeError
}
```

因为普通对象默认没有 `Symbol.iterator`。

### 想遍历普通对象怎么办？

```js
for (const [key, value] of Object.entries(obj)) {
  console.log(key, value);
}
```

`Object.entries(obj)` 返回数组，数组可迭代。

### 能不能自己让对象可迭代？

可以：

```js
const obj = {
  a: 1,
  b: 2,

  *[Symbol.iterator]() {
    yield this.a;
    yield this.b;
  }
};

for (const value of obj) {
  console.log(value);
}
```

### 面试回答模板

> for...of 是基于可迭代协议工作的，它会读取对象的 Symbol.iterator。Array、String、Map、Set 等默认实现了这个协议，所以可以直接 for...of；普通 Object 默认没有 Symbol.iterator，所以不能直接使用。遍历普通对象可以先用 Object.keys、Object.values 或 Object.entries 转成可迭代结构，也可以自己实现迭代器。

---

# 代码输出 / 场景题

## 38. 作用域链和变量提升相关代码输出题怎么分析？

### 先理解词法作用域

JavaScript 的作用域主要由代码**定义的位置**决定，而不是调用位置决定。

```js
const x = 'global';

function outer() {
  const x = 'outer';

  function inner() {
    console.log(x);
  }

  return inner;
}

const fn = outer();
fn(); // outer
```

`inner` 定义在 `outer` 内部，所以它查找 `x` 时沿定义时的词法环境向外找。

### 查找变量的顺序

可以理解成：

```text
当前词法环境
   ↓ 找不到
外层词法环境
   ↓ 找不到
更外层...
   ↓
全局环境
```

这就是常说的作用域链查找。

### 变量提升题一

```js
var a = 1;

function foo() {
  console.log(a);
  var a = 2;
}

foo();
```

输出：

```text
undefined
```

因为函数内部存在自己的 `var a` 绑定，可以用下面的简化模型理解：

```js
function foo() {
  var a;
  console.log(a);
  a = 2;
}
```

它不会去读外层全局 `a`。

### let 的 TDZ 题

```js
let a = 1;

function foo() {
  console.log(a);
  let a = 2;
}

foo();
```

这里不是输出全局 `1`，而是抛 `ReferenceError`。

因为函数块内已经存在自己的 `let a` 绑定，只是访问时仍处于 TDZ。

### 函数声明与 var 的题

不同声明形式的初始化时机细节比较多。面试时不要仅靠“所有东西都提升”一句话推理，建议按具体作用域建立阶段和执行阶段分析。

### 解题套路

1. 先画作用域层级；
2. 标记每个作用域自己声明了哪些名字；
3. 区分 `var` 与 `let/const`；
4. 再按执行顺序逐行跑；
5. 函数内部变量查找从当前作用域开始，不要看到外部同名变量就直接用外部。

---

## 39. async / await / Promise / setTimeout 执行顺序输出题

来看一个综合题：

```js
console.log('A');

setTimeout(() => {
  console.log('B');
}, 0);

async function foo() {
  console.log('C');
  await Promise.resolve();
  console.log('D');
}

foo();

Promise.resolve().then(() => {
  console.log('E');
});

console.log('F');
```

### 第一步：同步代码

输出：

```text
A
C
F
```

同时：

- 定时器回调 `B` 等待后续 task；
- `await` 后面的 `D` 被安排为微任务继续；
- `Promise.then` 的 `E` 也进入微任务队列。

### 第二步：清空微任务

根据入队顺序：

```text
D
E
```

### 第三步：定时器 task

```text
B
```

最终：

```text
A C F D E B
```

### 再加一层 Promise 链

```js
Promise.resolve()
  .then(() => {
    console.log(1);
  })
  .then(() => {
    console.log(2);
  });

Promise.resolve().then(() => {
  console.log(3);
});
```

结果：

```text
1
3
2
```

为什么不是 `1 2 3`？

因为第二个 `then` 依赖第一个 `then` 返回的新 Promise。第一轮微任务开始时队列大致是：

```text
第一个 then(1)
另一个 then(3)
```

执行 `1` 后才使后续 `then(2)` 进入队列尾部，因此得到：

```text
1 → 3 → 2
```

### 解题核心

> 不要把“整条 Promise 链”当成一个微任务。**每个回调的可执行时机由前一个 Promise 的 settled 状态决定。**

---

## 40. class 继承代码输出题怎么分析？

### 基础题

```js
class Animal {
  constructor(name) {
    this.name = name;
    console.log('Animal constructor');
  }

  speak() {
    console.log(`Animal: ${this.name}`);
  }
}

class Dog extends Animal {
  constructor(name) {
    console.log('Dog before super');
    super(name);
    console.log('Dog after super');
  }

  speak() {
    console.log(`Dog: ${this.name}`);
  }
}

const dog = new Dog('Lucky');
dog.speak();
```

输出：

```text
Dog before super
Animal constructor
Dog after super
Dog: Lucky
```

### 为什么派生类 constructor 里要先 super() 才能访问 this？

```js
class Dog extends Animal {
  constructor(name) {
    this.name = name; // ReferenceError
    super(name);
  }
}
```

派生类构造函数中的 `this` 需要在 `super()` 完成父类构造过程后才能使用。

### 方法覆盖怎么查？

`dog.speak()` 首先沿着实例原型关系找到 `Dog.prototype.speak`，所以调用子类覆盖方法。

如果子类中：

```js
speak() {
  super.speak();
  console.log('Dog extra');
}
```

则 `super.speak()` 会调用父类原型上的对应方法。

### 静态方法呢？

```js
class Animal {
  static type() {
    return 'animal';
  }
}

class Dog extends Animal {}

console.log(Dog.type()); // animal
```

静态成员位于构造函数这一侧的继承关系上，不是实例 `dog` 自己的方法。

### 解题建议

看到 class 输出题先分：

```text
实例字段/constructor
实例原型方法
static 静态成员
super 构造调用
super 方法调用
```

不要把它们混成一条“类继承链”。

---

## 41. toSorted 和 sort 的代码输出结果有什么区别？

### sort 会修改原数组

```js
const arr = [3, 1, 2];
const sorted = arr.sort((a, b) => a - b);

console.log(arr);    // [1, 2, 3]
console.log(sorted); // [1, 2, 3]
console.log(arr === sorted); // true
```

`sort` 原地排序，并返回同一个数组引用。

### toSorted 不修改原数组

```js
const arr = [3, 1, 2];
const sorted = arr.toSorted((a, b) => a - b);

console.log(arr);    // [3, 1, 2]
console.log(sorted); // [1, 2, 3]
console.log(arr === sorted); // false
```

`toSorted` 返回一个新数组。

### 为什么前端状态管理更喜欢非变异方法？

React 等状态管理场景经常依赖“新引用”来表达状态变化：

```js
setItems(items.toSorted(compareFn));
```

相比：

```js
items.sort(compareFn);
setItems(items);
```

前者更符合不可变数据更新思路，也避免无意间修改原状态。

### sort 默认是数字排序吗？

不是。

```js
[10, 2, 1].sort();
```

默认排序会按字符串转换后的比较规则处理，所以数字排序应明确：

```js
arr.sort((a, b) => a - b);
```

`toSorted` 也一样需要正确的比较函数。

### 面试回答模板

> sort 会原地修改数组并返回原数组本身；toSorted 是对应的非变异版本，会保留原数组并返回一个排序后的新数组。两者如果不传 compareFn，默认都不是简单的数值升序，因此数字排序通常写 `(a, b) => a - b`。

---
# JS 手写题高频

手写题最重要的不是把网上某一版代码背下来，而是先说清楚：

1. 输入输出是什么；
2. 状态放在哪里；
3. 边界条件是什么；
4. `this`、参数、返回值是否需要保留；
5. 有没有取消、错误、循环引用等特殊情况。

---

## 42. 手写防抖（debounce）函数

### 防抖解决什么问题？

假设搜索框每次输入都请求接口：

```text
h      → 请求
he     → 请求
hel    → 请求
hell   → 请求
hello  → 请求
```

用户快速输入时，大部分中间请求没有必要。

防抖的目标是：

> **事件连续触发时不断重新计时，只有停止触发达到 wait 时间后才真正执行。**

典型场景：

- 搜索联想；
- 输入校验；
- resize 后统一处理；
- 用户停止操作后保存草稿。

### 基础实现

```js
function debounce(fn, wait) {
  let timer = null;

  return function (...args) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}
```

### 为什么要保存 timer？

每次触发都要取消上一次尚未执行的定时器：

```js
clearTimeout(timer);
```

然后重新开始计时。

### 为什么用普通 function 返回，而不是箭头函数？

```js
return function (...args) {
  // this 来自实际调用方式
}
```

这样可以保留调用时的动态 `this`，再通过：

```js
fn.apply(this, args)
```

把 `this` 和参数转发给原函数。

### 带 cancel 的版本

```js
function debounce(fn, wait) {
  let timer = null;

  function debounced(...args) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return debounced;
}
```

### 面试回答思路

> 防抖的核心是共享一个 timer。每次事件触发先清掉旧 timer，再重新 setTimeout，所以连续触发期间不会执行；只有最后一次触发后等待完整 wait 时间才执行。为了不丢失调用上下文，返回普通函数并用 apply 转发 this 和参数。

---

## 43. 手写节流（throttle）函数

### 节流和防抖的本质区别

防抖：

```text
连续触发 -------- 停下来 ---- 执行一次
```

节流：

```text
连续触发 --------------------------------
执行       执行       执行       执行
    固定时间窗口最多一次
```

节流适合：

- scroll；
- mousemove；
- 高频拖拽；
- 滚动加载；
- 高频上报。

### 时间戳版

```js
function throttle(fn, wait) {
  let lastTime = 0;

  return function (...args) {
    const now = Date.now();

    if (now - lastTime >= wait) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```

特点：第一次通常立即执行，但窗口末尾最后一次触发可能被丢掉。

### 定时器版

```js
function throttle(fn, wait) {
  let timer = null;

  return function (...args) {
    if (timer) return;

    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
}
```

特点：第一次延迟执行，容易理解“wait 时间内只能存在一个 timer”。

### 更完整的 trailing 版本

```js
function throttle(fn, wait) {
  let lastTime = 0;
  let timer = null;
  let lastArgs;
  let lastThis;

  return function (...args) {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      lastTime = now;
      fn.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        lastTime = Date.now();
        fn.apply(lastThis, lastArgs);
        lastArgs = lastThis = null;
      }, remaining);
    }
  };
}
```

面试除非明确要求 leading/trailing 细节，一般先写基础版本，再主动说明可以扩展。

### 面试回答思路

> 节流是控制执行频率，在连续触发期间每个 wait 时间窗口最多执行一次。可以用时间戳判断距离上一次执行是否达到 wait，也可以用 timer 标记当前窗口。实际库实现通常还会区分 leading 和 trailing，也就是窗口开头和结尾是否执行。

---

## 44. 手写数组 map 方法

### map 的语义

```js
const result = arr.map((value, index, array) => {
  return newValue;
}, thisArg);
```

它会：

- 返回一个同长度的新数组；
- 对存在的元素调用回调；
- 回调接收 `value/index/array`；
- 支持 `thisArg`；
- 稀疏数组的“洞”需要注意。

### 面试简化版

```js
Array.prototype.myMap = function (callback, thisArg) {
  const result = new Array(this.length);

  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      result[i] = callback.call(
        thisArg,
        this[i],
        i,
        this
      );
    }
  }

  return result;
};
```

### 为什么要写 `if (i in this)`？

```js
const arr = new Array(3);
```

这个数组长度是 3，但三个位置是 hole，不是显式的 `undefined` 元素。

原生 `map` 不会对不存在的索引调用 callback，因此手写时用：

```js
if (i in this)
```

更接近原生语义。

### 严格规范版还有哪些细节？

真正的 ECMAScript 内建实现还会处理：

- `this == null`；
- callback 是否可调用；
- `ToObject`；
- 长度转换；
- Species 等规范细节。

面试通常不要求从零复刻完整规范，主动说明“这是核心语义版”即可。

---

## 45. 手写深拷贝函数

前面已经讲过原理，这里以“面试现场怎么写”为主。

### 第一步：先写核心版

```js
function deepClone(value, cache = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (cache.has(value)) {
    return cache.get(value);
  }

  const result = Array.isArray(value) ? [] : {};
  cache.set(value, result);

  for (const key of Reflect.ownKeys(value)) {
    result[key] = deepClone(value[key], cache);
  }

  return result;
}
```

这版已经展示了两个面试核心：

- 递归；
- WeakMap 解决循环引用。

### 第二步：面试官追问 Date/RegExp/Map/Set

```js
function deepClone(value, cache = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (cache.has(value)) {
    return cache.get(value);
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  if (value instanceof Map) {
    const result = new Map();
    cache.set(value, result);

    for (const [key, item] of value) {
      result.set(
        deepClone(key, cache),
        deepClone(item, cache)
      );
    }
    return result;
  }

  if (value instanceof Set) {
    const result = new Set();
    cache.set(value, result);

    for (const item of value) {
      result.add(deepClone(item, cache));
    }
    return result;
  }

  const result = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));

  cache.set(value, result);

  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);

    if ('value' in descriptor) {
      descriptor.value = deepClone(descriptor.value, cache);
    }

    Object.defineProperty(result, key, descriptor);
  }

  return result;
}
```

这版还保留了：

- 原型；
- Symbol key；
- 属性描述符。

但函数、DOM 节点、某些宿主对象等仍然需要额外策略。

### 面试现场怎么说

> 我先实现普通对象和数组 + WeakMap 循环引用，这是核心；如果需要生产级版本，还要明确支持哪些特殊对象，例如 Date、RegExp、Map、Set、属性描述符和原型。现代浏览器如果语义满足需求，也可以直接考虑 structuredClone。

---

## 46. 手写 EventEmitter（发布订阅模式）

### 它解决什么问题？

一个对象发布事件，多个订阅者收到通知：

```text
        ┌→ listener A
emit →  ├→ listener B
        └→ listener C
```

常见 API：

```text
on
emit
off
once
```

### 基础实现

```js
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(eventName, listener) {
    const listeners = this.events.get(eventName) || [];
    listeners.push(listener);
    this.events.set(eventName, listeners);

    return () => this.off(eventName, listener);
  }

  emit(eventName, ...args) {
    const listeners = this.events.get(eventName);
    if (!listeners) return false;

    // 复制一份，避免监听器执行中增删导致当前遍历混乱
    for (const listener of [...listeners]) {
      listener(...args);
    }

    return true;
  }

  off(eventName, listener) {
    const listeners = this.events.get(eventName);
    if (!listeners) return;

    const next = listeners.filter((fn) => fn !== listener);

    if (next.length === 0) {
      this.events.delete(eventName);
    } else {
      this.events.set(eventName, next);
    }
  }

  once(eventName, listener) {
    const wrapper = (...args) => {
      this.off(eventName, wrapper);
      listener(...args);
    };

    this.on(eventName, wrapper);
  }
}
```

### 测试

```js
const emitter = new EventEmitter();

const off = emitter.on('message', (msg) => {
  console.log('A:', msg);
});

emitter.once('message', (msg) => {
  console.log('once:', msg);
});

emitter.emit('message', 'hello');
emitter.emit('message', 'world');

off();
```

### 高频追问

- listener 抛异常怎么办？
- 监听器是否允许重复注册？
- emit 期间 off 自己怎么办？
- once 怎么保证只执行一次？
- 是否需要最大监听器数量避免泄漏？

面试不一定全部实现，但能说出这些设计点会加分。

---

## 47. 手写 Promise 常见静态方法

这里只手写组合方法，不从零实现完整 Promise/A+ 状态机。

### 手写 Promise.all

```js
Promise.myAll = function (iterable) {
  const items = Array.from(iterable);

  return new Promise((resolve, reject) => {
    if (items.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array(items.length);
    let completed = 0;

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          results[index] = value;
          completed++;

          if (completed === items.length) {
            resolve(results);
          }
        },
        reject
      );
    });
  });
};
```

核心点：

- `Promise.resolve(item)` 兼容普通值；
- 结果要按**输入顺序**存，不是完成顺序；
- 任意一个失败立即 reject；
- 空输入要得到 `[]`。

### 手写 Promise.race

```js
Promise.myRace = function (iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
};
```

谁先 settled，外层 Promise 就先被敲定，后面的 resolve/reject 自然失效。

### 手写 Promise.allSettled

```js
Promise.myAllSettled = function (iterable) {
  const items = Array.from(iterable);

  return Promise.all(
    items.map((item) =>
      Promise.resolve(item).then(
        (value) => ({
          status: 'fulfilled',
          value
        }),
        (reason) => ({
          status: 'rejected',
          reason
        })
      )
    )
  );
};
```

每个输入先被转换成“永远 fulfilled 的状态描述对象”，再用 `Promise.all` 汇总。

### 手写 Promise.any

```js
Promise.myAny = function (iterable) {
  const items = Array.from(iterable);

  return new Promise((resolve, reject) => {
    if (items.length === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }

    const errors = new Array(items.length);
    let rejectedCount = 0;

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        resolve,
        (error) => {
          errors[index] = error;
          rejectedCount++;

          if (rejectedCount === items.length) {
            reject(
              new AggregateError(
                errors,
                'All promises were rejected'
              )
            );
          }
        }
      );
    });
  });
};
```

### 面试现场重点

不需要只背代码，要解释：

```text
all：计数 + 保序 + 快速失败
race：所有输入都把 resolve/reject 接到同一个外层 Promise
allSettled：把成功失败都转换为结果对象再汇总
any：第一个成功就 resolve，所有失败才 AggregateError
```

---

## 48. 手写数组扁平化

### 完全扁平化

```js
function flatten(arr) {
  const result = [];

  function walk(list) {
    for (const item of list) {
      if (Array.isArray(item)) {
        walk(item);
      } else {
        result.push(item);
      }
    }
  }

  walk(arr);
  return result;
}
```

### 指定深度

```js
function flattenDepth(arr, depth = 1) {
  const result = [];

  function walk(list, currentDepth) {
    for (const item of list) {
      if (Array.isArray(item) && currentDepth > 0) {
        walk(item, currentDepth - 1);
      } else {
        result.push(item);
      }
    }
  }

  walk(arr, depth);
  return result;
}
```

### 大量深层嵌套怎么办？

极深递归可能导致调用栈溢出，可以改为显式栈：

```js
function flattenIterative(arr) {
  const stack = [...arr].reverse();
  const result = [];

  while (stack.length) {
    const item = stack.pop();

    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
    } else {
      result.push(item);
    }
  }

  return result;
}
```

这道题可以顺便体现你知道“递归很直观，但有调用栈边界”。

---

## 49. 手写数组去重

### 原始值：Set

```js
function unique(arr) {
  return [...new Set(arr)];
}
```

### 指定 key 的对象去重

```js
function uniqueBy(arr, getKey) {
  const seen = new Set();
  const result = [];

  for (const item of arr) {
    const key = getKey(item);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}
```

使用：

```js
const result = uniqueBy(users, (user) => user.id);
```

### 为什么不要上来 JSON.stringify 对象？

```js
JSON.stringify({ a: 1, b: 2 })
JSON.stringify({ b: 2, a: 1 })
```

序列化结果可能受属性顺序和不可序列化值影响，而且成本较高。业务对象去重通常应该明确“什么字段定义相同”。

---

## 50. 手写 LRU 缓存

### LRU 是什么？

LRU = **Least Recently Used**，最近最少使用。

缓存容量有限时，淘汰“最长时间没有被访问”的数据。

例如容量 3：

```text
访问 A → [A]
访问 B → [A, B]
访问 C → [A, B, C]
再次访问 A → [B, C, A]
加入 D → 淘汰 B → [C, A, D]
```

### 为什么 JS 的 Map 很适合手写？

Map：

- 保留插入顺序；
- `get/set/delete` 使用方便；
- 可以通过“删除后重新 set”把最近访问项移动到末尾。

### 实现

```js
class LRUCache {
  constructor(capacity) {
    if (capacity <= 0) {
      throw new Error('capacity must be > 0');
    }

    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return -1;
    }

    const value = this.cache.get(key);

    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    if (this.cache.size > this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
}
```

### 测试

```js
const cache = new LRUCache(2);

cache.put('a', 1);
cache.put('b', 2);
console.log(cache.get('a')); // 1，a 变成最近使用

cache.put('c', 3); // 淘汰 b
console.log(cache.get('b')); // -1
```

### 进阶追问

为什么很多算法题不用 Map，要求“双向链表 + 哈希表”？

因为在更通用语言/数据结构模型里，要实现 O(1) 的：

- 查找；
- 删除任意节点；
- 移到队尾；
- 删除队头；

经典方案就是：

```text
HashMap + Doubly Linked List
```

JavaScript Map 本身已经提供插入顺序，因此面试前端手写可以先用 Map 版；如果面试官明确考数据结构，再实现链表版。

---

## 51. 手写 Proxy 代理对象

“手写 Proxy”通常不是让你实现 JavaScript 引擎的 Proxy，而是让你**使用 Proxy 实现某个代理行为**。

### 示例一：数据校验

```js
const user = new Proxy(
  {
    name: '',
    age: 0
  },
  {
    set(target, key, value, receiver) {
      if (key === 'age') {
        if (!Number.isInteger(value) || value < 0) {
          throw new TypeError('age must be a non-negative integer');
        }
      }

      return Reflect.set(target, key, value, receiver);
    }
  }
);

user.age = 18; // ok
// user.age = -1; // TypeError
```

### 示例二：最小响应式雏形

```js
function reactive(target, onChange) {
  return new Proxy(target, {
    get(target, key, receiver) {
      return Reflect.get(target, key, receiver);
    },

    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver);
      const success = Reflect.set(target, key, value, receiver);

      if (success && !Object.is(oldValue, value)) {
        onChange(key, value, oldValue);
      }

      return success;
    },

    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const oldValue = target[key];
      const success = Reflect.deleteProperty(target, key);

      if (success && hadKey) {
        onChange(key, undefined, oldValue);
      }

      return success;
    }
  });
}
```

使用：

```js
const state = reactive(
  { count: 0 },
  (key, value, oldValue) => {
    console.log(`${String(key)}:`, oldValue, '→', value);
  }
);

state.count++;
```

### 为什么用 Reflect？

Proxy trap 里一般推荐把默认行为交给对应 Reflect 方法：

```js
Reflect.get
Reflect.set
Reflect.deleteProperty
```

这样语义更标准，也能正确传递 `receiver` 等细节。

---

# JS 场景 / 机制类

## 52. setTimeout(1000) 一定会在 1000ms 后执行吗？和 requestAnimationFrame 有什么区别？

### 结论

```js
setTimeout(fn, 1000);
```

表示的是：

> **至少在满足计时条件后，回调才有资格进入后续调度；不保证第 1000ms 精确执行。**

### 为什么会晚？

假设：

```js
setTimeout(() => {
  console.log('timer');
}, 1000);

const start = Date.now();
while (Date.now() - start < 5000) {
  // 阻塞主线程 5 秒
}
```

即使定时器 1 秒就到期，主线程一直被同步循环占用，回调只能等到主线程空闲以后执行。

所以它更像：

```text
至少等待 1000ms
      ↓
具备调度资格
      ↓
还要等待 JS 主线程和事件循环
      ↓
真正执行
```

### requestAnimationFrame（rAF）是什么？

```js
requestAnimationFrame((timestamp) => {
  // 更新下一帧视觉状态
});
```

rAF 的设计目标是把回调安排在浏览器准备绘制下一帧之前的合适时机，适合视觉动画更新。

### 两者区别

| 项目 | `setTimeout` | `requestAnimationFrame` |
|---|---|---|
| 主要目标 | 延时调度普通任务 | 跟浏览器绘制节奏同步 |
| 时间是否精确 | 不精确，只是最小/目标延时 | 由帧调度决定 |
| 动画适配 | 需要自己算节奏 | 更适合视觉更新 |
| 后台页面 | 可能被明显节流 | 通常也会暂停/降频 |

### 为什么动画优先 rAF？

如果显示器约 60Hz，一帧大约 16.7ms。用：

```js
setInterval(update, 16);
```

并不能保证回调恰好和浏览器绘制同步，容易：

- 一帧内重复计算；
- 错过帧；
- 页面不可见时浪费工作。

rAF 更贴近渲染调度。

### 面试回答模板

> setTimeout(1000) 不保证正好第 1000ms 执行，它只意味着延时条件满足后回调才有机会进入后续调度，如果主线程忙、浏览器限频或队列里还有任务都会继续延后。requestAnimationFrame 则是面向视觉更新的 API，浏览器会在合适的下一帧绘制前调用它，所以做动画通常比固定 setTimeout/setInterval 更合适。

---

## 53. 定时器为什么不准确？

定时器误差来自多个层面。

### 原因一：主线程被占用

```js
setTimeout(fn, 10);
heavySyncWork(); // 跑 2 秒
```

回调不能抢占当前 JavaScript 执行，只能等。

### 原因二：事件循环队列等待

即使定时器到期，前面还有其他 task、microtask，实际执行也会继续延后。

### 原因三：浏览器最小延时和嵌套定时器限制

浏览器会对某些连续嵌套定时器施加最小延迟，以避免过度占用 CPU。

### 原因四：后台标签页节流

页面不可见时，浏览器为了省电和资源管理，可能显著降低定时器频率。

### 原因五：系统调度与时钟粒度

操作系统线程调度、设备负载、节能模式等也会影响实际唤醒时间。

### 需要高精度间隔怎么办？

不要用“每次执行完再固定 +1000ms”简单累积误差，可以根据目标时间校正：

```js
const interval = 1000;
let expected = performance.now() + interval;

function tick() {
  const now = performance.now();
  const drift = now - expected;

  console.log('drift:', drift);

  expected += interval;
  setTimeout(tick, Math.max(0, interval - drift));
}

setTimeout(tick, interval);
```

但这也不能突破主线程阻塞的物理限制。

### 面试回答模板

> 定时器不精确主要因为它不是实时系统。延时到了只代表回调具备调度条件，仍要等待当前调用栈、事件循环队列；浏览器还会有嵌套定时器最小延迟、后台标签页节流，操作系统调度也有误差。所以 setTimeout 的 delay 应理解成目标/最小等待时间，不是精确执行时间。

---

## 54. 为什么 Promise 可以缓解“回调地狱”？

### 什么是回调地狱？

```js
getUser((user) => {
  getOrders(user.id, (orders) => {
    getDetail(orders[0].id, (detail) => {
      save(detail, () => {
        console.log('done');
      });
    });
  });
});
```

问题不只是“缩进难看”，更重要的是：

- 控制流被拆散到多层回调；
- 错误处理分散；
- 顺序、并行、条件组合困难；
- 回调可能存在“到底会调用几次、什么时候调用”的约定问题。

### Promise 把异步结果变成可组合对象

```js
getUser()
  .then((user) => getOrders(user.id))
  .then((orders) => getDetail(orders[0].id))
  .then((detail) => save(detail))
  .then(() => console.log('done'))
  .catch(handleError);
```

控制流从“层层嵌套”变成“链式组合”。

### Promise 解决的核心不是语法缩进

Promise 统一了异步操作的状态和后续注册方式：

```text
pending
fulfilled / rejected
then / catch
```

并且：

```js
then() → 新 Promise
```

所以异步步骤能继续组合。

### async/await 又进一步改善可读性

```js
try {
  const user = await getUser();
  const orders = await getOrders(user.id);
  const detail = await getDetail(orders[0].id);
  await save(detail);
} catch (err) {
  handleError(err);
}
```

### Promise 有没有“解决所有异步问题”？

没有。

如果你把所有业务逻辑都塞进超长 Promise 链，仍然会难维护。并发取消、流式数据、事件序列也可能需要 AbortController、AsyncIterator、Observable 等其他抽象。

### 面试回答模板

> 回调地狱的问题不只是缩进，而是异步控制流和错误处理被分散在多层回调里。Promise 把异步结果抽象成统一的状态对象，并且 then 会返回新的 Promise，所以顺序任务可以链式组合，错误也可以沿链统一传递到 catch。async/await 又让 Promise 链写得更接近同步控制流，因此可读性更好。

---

## 55. Promise 链式调用是如何实现的？

### 最重要的一句话

> 每次 `then` 都返回一个新的 Promise。

```js
const p2 = p1.then(fn1);
const p3 = p2.then(fn2);
```

如果 `then` 返回的还是原来 `p1`，后面的步骤就无法根据前一个回调的结果形成新的状态。

### 状态传播

```js
Promise.resolve(1)
  .then((x) => x + 1)
  .then((x) => x * 10)
  .then(console.log); // 20
```

第一步回调返回 `2`，决定第一个新 Promise 的 fulfilled 值是 `2`；下一步拿到 `2`，再返回 `20`。

### Promise 吸收/采用另一个 Promise 的状态

```js
Promise.resolve()
  .then(() => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(10), 1000);
    });
  })
  .then((value) => {
    console.log(value); // 10
  });
```

新的 Promise 不会把“内部 Promise 对象本身”直接当普通值立即传下去，而是按照 Promise resolution procedure 采用其最终结果。

### 异常传播

```js
Promise.resolve()
  .then(() => {
    throw new Error('boom');
  })
  .then(() => {
    console.log('不会执行 fulfilled 分支');
  })
  .catch((err) => {
    console.log(err.message);
  });
```

`throw` 让当前 `then` 返回的新 Promise rejected，后续没有 rejection handler 的 `then` 会让错误继续向后传播，直到被 `catch` 处理。

### 为什么不能返回自己？

概念上：

```js
const p2 = Promise.resolve().then(() => p2);
```

这会造成循环解析，因此规范会拒绝这种自解析情况。

### 面试回答模板

> Promise 能链式调用的核心是 then 每次都会创建并返回一个新的 Promise。then 回调返回普通值时，新 Promise 用这个值 fulfilled；返回 Promise/thenable 时，会采用它的最终状态；抛异常时，新 Promise rejected。这样每一步的执行结果都可以决定下一步 Promise 的状态，最终形成可组合的链。

---

## 56. 为什么会出现内存泄漏？

### 内存泄漏的本质

对于带垃圾回收的 JavaScript，内存泄漏通常不是“忘了 free”，而是：

> **业务上已经不需要的数据，因为仍然存在可达引用，所以 GC 判断它还不能回收。**

### 一个简单例子

```js
const cache = [];

function addData(data) {
  cache.push(data);
}
```

如果 `cache` 是长期存在的全局数组，并且从不清理，那么所有数据都始终从全局根可达。

GC 没有做错：它看到的确还有引用。

### “内存增长”不一定就是泄漏

需要区分：

- 正常缓存增长；
- 短时峰值；
- GC 尚未发生；
- 引擎为了性能保留已申请的 heap；
- 真正不可恢复的长期引用增长。

判断泄漏通常要观察多轮操作后的 heap baseline 是否持续上升，以及对象 retaining path。

### 前端排查思路

Chrome DevTools 常见手段：

- Memory Heap Snapshot；
- Allocation instrumentation；
- Performance/Memory 观察；
- 比较多次快照；
- 查看某对象为何仍被引用（Retainers）。

### 面试回答模板

> JavaScript 有 GC，但仍会内存泄漏，因为 GC 只能回收不可达对象。如果业务已经不需要某个对象，但全局变量、事件监听器、定时器、缓存、闭包等仍然引用它，那么它对 GC 来说还是可达的，就不会被回收。排查时一般看 Heap Snapshot 和 retaining path，找出是谁把对象一直保留下来。

---

## 57. JavaScript 中有哪些常见情况会造成内存泄漏？

### 1）意外的长期全局引用

```js
window.largeData = new Array(1e6).fill('x');
```

只要全局对象一直持有它，就不会回收。

### 2）事件监听器没有清理

```js
function mount() {
  window.addEventListener('resize', onResize);
}
```

组件销毁时如果监听器仍在，监听函数及其闭包引用的数据可能长期保留。

对应清理：

```js
window.removeEventListener('resize', onResize);
```

现代 API 也可以结合 AbortController：

```js
const controller = new AbortController();

window.addEventListener('resize', onResize, {
  signal: controller.signal
});

controller.abort();
```

### 3）定时器没有清理

```js
const timer = setInterval(() => {
  useBigObject(bigObject);
}, 1000);
```

不再使用时：

```js
clearInterval(timer);
```

### 4）闭包持有大对象

```js
function createHandler() {
  const huge = loadHugeData();

  return () => {
    console.log(huge.length);
  };
}
```

只要返回的函数长期可达，`huge` 也可能长期可达。

### 5）Detached DOM

DOM 已经从页面树移除，但 JS 变量还引用它：

```js
let cachedNode = document.querySelector('#panel');
cachedNode.remove();
```

如果 `cachedNode` 长期存在，对应 DOM 对象仍可能留在内存中。

### 6）无限增长的缓存 Map/Object/Array

```js
const cache = new Map();

function getData(key) {
  if (!cache.has(key)) {
    cache.set(key, expensiveLoad(key));
  }
  return cache.get(key);
}
```

如果 key 永远增长且没有淘汰策略，这就是非常典型的业务内存风险。

可以考虑：

- LRU；
- TTL；
- 最大容量；
- 对象生命周期缓存使用 WeakMap。

### 7）Observer / WebSocket / Subscription 没取消

例如：

```text
MutationObserver
IntersectionObserver
ResizeObserver
WebSocket
RxJS subscription
自定义 EventEmitter
```

组件卸载时要断开对应订阅关系。

### 8）未完成异步任务的闭包

一个长期 pending 的 Promise 本身不一定自动构成泄漏，但如果相关异步基础设施、回调列表或外部资源一直持有巨大上下文，就可能导致内存长期保持。

### 面试回答模板

> 常见内存泄漏包括全局变量长期持有数据、事件监听器和定时器没有清理、闭包持有不再需要的大对象、Detached DOM、没有上限的 Map/数组缓存，以及 Observer、WebSocket、订阅没有注销。本质都一样：业务不需要的数据仍然通过某条引用链从根可达，所以 GC 不能回收。

---

# 附录一：高频面试 30 秒回答速记

下面用于最后冲刺，不建议在没有理解正文前直接死背。

## Event Loop

> JavaScript 主线程同一时间执行一段 JS。当前 task 中同步代码先执行，结束后清空 Promise.then 等微任务，再进入下一 task，浏览器在 task 之间有机会渲染。setTimeout 属于后续 task，因此同一轮里 Promise 微任务通常先于 setTimeout 回调。

## Promise 状态

> Promise 有 pending、fulfilled、rejected 三种状态，只能从 pending 进入 fulfilled 或 rejected，一旦 settled 就不能再改变，后续重复 resolve/reject 被忽略。

## Promise.then

> then 每次都返回新的 Promise。返回普通值就作为新 Promise 的 fulfilled 值；返回 Promise 就等待它；throw 会让新 Promise rejected；没有 return 相当于返回 undefined。

## async/await

> async 函数调用后一定返回 Promise。await 不阻塞主线程，只暂停当前 async 函数后续逻辑；等待结果完成后，后续部分以微任务方式继续。

## 数据类型

> JavaScript 有 7 种原始类型：number、string、boolean、null、undefined、symbol、bigint，再加 object。数组、函数、Date 等都属于对象体系。

## 类型判断

> typeof 适合多数原始类型，但 null 是 object、对象不能细分；instanceof 判断原型链关系；需要精细内建类型可用 Object.prototype.toString.call，数组实际开发优先 Array.isArray。

## 原型链

> 对象查属性先查自身，再沿 [[Prototype]] 向上查直到 null。new 创建实例时，实例原型会关联构造函数.prototype。JavaScript 继承本质建立在原型关系上。

## 闭包

> 闭包是函数和其定义时词法环境的组合，使函数之后仍能访问外层变量。常用于私有状态、函数工厂和模块封装。闭包不等于泄漏，但长期持有不需要的数据会造成内存问题。

## var/let/const

> var 是函数作用域、可重复声明，声明前访问常见得到 undefined；let/const 是块级作用域，声明前处于 TDZ。const 必须初始化且不能重新绑定，但对象内部属性仍可修改。

## 箭头函数

> 箭头函数没有自己的 this 和 arguments，this 继承外层词法环境；不能 new，也没有普通构造函数的 prototype。普通函数 this 由调用方式决定。

## Promise 组合方法

> all 全部成功才成功；race 取第一个 settled；allSettled 等所有结束并返回每项状态；any 取第一个成功，全部失败才 AggregateError。

## new

> new 创建对象、连接构造函数.prototype、以新对象为 this 调用构造函数，最后如果构造函数显式返回对象则采用它，否则返回新实例。

## call/apply/bind

> call/apply 都立即执行并绑定 this，call 参数逐个传，apply 传数组；bind 返回绑定后的新函数，不立即执行，并可以预绑定参数。

## this

> 普通函数 this 看调用方式：new、显式绑定、对象方法调用、默认调用；箭头函数没有自己的 this，直接捕获外层词法 this。

## 深拷贝

> 浅拷贝只创建第一层容器，嵌套对象仍共享引用；深拷贝递归复制。JSON 有类型和循环引用局限；structuredClone 更完整；手写通常递归 + WeakMap 解决循环引用。

## GC

> GC 按可达性判断对象是否还能从根访问。V8 做分代管理，短生命周期对象主要在年轻代频繁回收，长期存活对象进入老生代。泄漏通常是无用对象仍然保持可达。

## 栈和堆

> JavaScript 调用栈管理函数调用帧，递归过深会 stack overflow；对象等动态数据通常由 GC 管理的堆式空间承载。“基本类型一定在栈、对象一定在堆”只是简化模型，不是语言规范硬性规定。

## Map / WeakMap

> Map 可迭代、有 size、支持任意类型 key；WeakMap 主要用于对象弱关联，不会因为对象只是 WeakMap key 就阻止 GC，因此不可枚举，适合对象元数据和生命周期缓存。

## defineProperty / Proxy

> defineProperty 主要逐属性定义 getter/setter；Proxy 对整个对象建立代理，可以拦截 get、set、delete、ownKeys 等更多操作，对新增属性和数组处理也更自然。

## 防抖 / 节流

> 防抖是连续触发时只在停止一段时间后执行最后一次，典型是搜索框；节流是持续触发期间固定时间窗口最多执行一次，典型是 scroll、mousemove。

---

# 附录二：面试复习路线

## 第一阶段：必须能口述

按顺序练：

```text
Event Loop
→ Promise 状态
→ then 链
→ async/await
→ 数据类型
→ 类型判断
→ 原型链
→ 闭包
→ var/let/const
→ 箭头函数
```

目标：每题 30～60 秒说清楚，不追求长。

## 第二阶段：必须能追问

```text
Promise.all / race / allSettled / any
new
call / apply / bind
this
深拷贝 + WeakMap
垃圾回收
栈和堆
数组与遍历
Proxy
ESM
```

目标：主问题答完以后，能继续接住 1～2 个追问。

## 第三阶段：必须能现场推理

```text
Promise + setTimeout 输出题
async/await 输出题
作用域 + TDZ 输出题
class / super 输出题
sort / toSorted 输出题
```

目标：不要背答案，用队列、作用域、原型等规则现场推。

## 第四阶段：必须能手写

至少熟练：

```text
debounce
throttle
deepClone
EventEmitter
Promise.all
flatten
unique
LRU
```

目标：10～15 分钟内写出核心版本，并能解释边界。

---

# 附录三：面试表达原则

很多题“知道”但面试得分低，不是知识点完全不会，而是表达结构混乱。

推荐统一使用下面的回答框架：

```text
第一句：先给定义/结论
第二段：解释核心机制
第三段：举一个最典型例子
第四段：补一个坑或边界
```

例如 Event Loop 不要这样开头：

> “就是宏任务和微任务之间相互……然后那个队列……”

可以改成：

> “JavaScript 主线程同一时间执行一段 JS，所以浏览器用 Event Loop 协调同步代码和异步回调。当前 task 先执行同步部分，结束后清空微任务，再进入下一 task。比如同一轮 Promise.then 和 setTimeout 同时注册时，then 的微任务一般会先执行。”

先把主干说清楚，面试官追问时再补细节。

---

# 最终总览

这套题的知识关系并不是 57 个互不相关的答案，可以串成几条主线：

### 主线一：执行模型

```text
单线程
  ↓
调用栈
  ↓
Event Loop
  ↓
Task / Microtask
  ↓
Promise
  ↓
async / await
```

### 主线二：对象模型

```text
数据类型
  ↓
Object
  ↓
[[Prototype]]
  ↓
原型链
  ↓
new
  ↓
class / extends
  ↓
this / call / apply / bind
```

### 主线三：内存模型

```text
引用关系
  ↓
闭包
  ↓
GC 可达性
  ↓
WeakMap
  ↓
内存泄漏
```

### 主线四：数据处理

```text
Array / Object / Map / Set
  ↓
遍历
  ↓
map / reduce
  ↓
去重 / 扁平化
  ↓
深拷贝
```

### 主线五：工程能力

```text
模块化 / ESM
  ↓
Proxy
  ↓
防抖 / 节流
  ↓
EventEmitter
  ↓
LRU
  ↓
真实性能与内存问题
```

真正准备面试时，建议按“主线”理解，再按“题目”训练输出。这样面试官换问法时，你仍然能从底层机制推回答案，而不是只认得背过的标题。

