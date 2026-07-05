---
title: "Smart Flow 019：让后一个节点使用前一个节点的返回结果"
icon: "link"
date: 2026-07-03
category:
  - "前端"
tag:
  - "Smart Flow"
  - "Workflow"
  - "Handlebars"
  - "HTTP Request"
star: true
---

# 在可视化工作流中，如何让后一个节点使用前一个节点的返回结果？

在做可视化工作流编辑器时，一个很常见的需求是：**当前节点需要使用上一个节点的执行结果作为输入**。

比如有两个 HTTP Request 节点：

1. 第一个节点请求用户信息
2. 第二个节点根据第一个节点返回的 `userId` 再请求订单信息

这时候第二个节点的接口地址可能需要这样配置：

```txt
https://api.example.com/users/{{getUser.httpResponse.data.id}}/orders
```

执行时，`{{getUser.httpResponse.data.id}}` 会被替换成前一个节点真实返回的数据。

这篇文章记录一下我在项目里是怎么设计这个能力的。

## 工作流里的 context

在工作流执行过程中，每个节点执行完成后，都会把自己的结果放进一个共享的 `context` 里。

比如一个 HTTP Request 节点执行完成后，会返回：

```ts
return {
  ...context,
  [data.variableName]: {
    httpResponse: {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    },
  },
};
```

如果用户给这个节点配置的变量名是：

```txt
getUser
```

那么它的执行结果就会进入 context：

```ts
{
  getUser: {
    httpResponse: {
      status: 200,
      statusText: "OK",
      data: {
        id: "123",
        name: "Jack"
      }
    }
  }
}
```

后面的节点就可以通过 `getUser` 访问这个结果。

## 为什么需要模板语法

HTTP 节点的配置通常是用户提前填好的，比如：

```txt
https://api.example.com/users/123/orders
```

但在可视化工作流里，`123` 不是固定值，它来自上一个节点的返回结果。

所以我们需要一种方式，在配置阶段保存一个“占位符”，在执行阶段再用真实数据替换它。

也就是：

```txt
配置阶段：
https://api.example.com/users/{{getUser.httpResponse.data.id}}/orders

执行阶段：
https://api.example.com/users/123/orders
```

这个问题本质上就是模板渲染问题。

## 为什么选择 Handlebars

我选择 Handlebars 来解决这个问题。

原因很简单：它正好适合“字符串模板 + 上下文数据”的场景。

代码类似这样：

```ts
const endpoint = Handlebars.compile(data.endpoint)(context);
```

假设 `data.endpoint` 是：

```txt
https://api.example.com/users/{{getUser.httpResponse.data.id}}/orders
```

而 `context` 是：

```ts
{
  getUser: {
    httpResponse: {
      data: {
        id: "123"
      }
    }
  }
}
```

那么最终生成的 endpoint 就是：

```txt
https://api.example.com/users/123/orders
```

这样当前节点就能使用上一个节点的返回结果。

## 为什么不自己写字符串替换

一开始看起来也可以自己写一个简单的 replace：

```ts
endpoint.replace(/\{\{(.+?)\}\}/g, ...)
```

但这样很快会遇到问题：

- 如何读取嵌套路径，比如 `getUser.httpResponse.data.id`
- 如果字段不存在怎么办
- 如何处理对象和数组
- 如何避免 JSON body 生成非法 JSON
- 后续如果要扩展函数能力怎么办

Handlebars 已经帮我们处理了模板解析、路径访问和 helper 扩展能力，所以不用自己维护一套脆弱的模板系统。

## 支持 JSON body

除了 URL，HTTP 请求的 body 也需要引用上游节点结果。

比如我们希望把上一个节点返回的整个对象作为请求 body 的一部分：

```json
{
  "user": {{json getUser.httpResponse.data}}
}
```

这里用了一个自定义 helper：

```ts
Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});
```

这样对象不会变成 `[object Object]`，而是会被正确序列化成 JSON。

例如：

```ts
{
  id: "123",
  name: "Jack"
}
```

会被渲染成：

```json
{
  "id": "123",
  "name": "Jack"
}
```

最终 body 就能保持合法 JSON。

## 执行前校验 JSON

在真正发请求之前，我还会校验 body 是否是合法 JSON：

```ts
const resolved = Handlebars.compile(data.body || "{}")(context);

JSON.parse(resolved);

options.body = resolved;
options.headers = {
  "Content-Type": "application/json",
};
```

这里的 `JSON.parse(resolved)` 不是为了使用解析后的对象，而是为了提前发现错误。

如果用户配置的模板渲染后不是合法 JSON，就应该直接报错，而不是发出一个错误请求。

## 完整执行逻辑

HTTP Request 节点的核心执行逻辑大概是这样：

```ts
const endpoint = Handlebars.compile(data.endpoint)(context);
const method = data.method;

const options: KyOptions = { method };

if (["POST", "PUT", "PATCH"].includes(method)) {
  const resolved = Handlebars.compile(data.body || "{}")(context);

  JSON.parse(resolved);

  options.body = resolved;
  options.headers = {
    "Content-Type": "application/json",
  };
}

const response = await ky(endpoint, options);

const contentType = response.headers.get("content-type");
const responseData = contentType?.includes("application/json")
  ? await response.json()
  : await response.text();

return {
  ...context,
  [data.variableName]: {
    httpResponse: {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    },
  },
};
```

这里有两个关键点：

第一，当前节点执行前，会用 `context` 渲染 endpoint 和 body。

第二，当前节点执行后，会把自己的结果继续写回 `context`。

这样多个节点之间就可以串起来：

```txt
节点 A 执行
  ↓
结果写入 context
  ↓
节点 B 从 context 读取 A 的结果
  ↓
节点 B 执行
  ↓
节点 B 的结果继续写入 context
```

## 用户体验上不应该暴露模板细节

虽然底层用了 Handlebars，但不代表用户必须手写：

```txt
{{getUser.httpResponse.data.id}}
```

更好的方式是做一个变量选择器。

比如在输入框旁边加一个“插入变量”按钮，用户点击后看到：

```txt
getUser
  ├─ status
  ├─ statusText
  └─ data
      ├─ id
      └─ name
```

用户选择 `getUser > data > id` 后，系统自动插入：

```txt
{{getUser.httpResponse.data.id}}
```

如果用户选择的是一个对象，就自动插入：

```txt
{{json getUser.httpResponse.data}}
```

这样 Handlebars 只是内部实现，用户看到的是更直观的“选择上游节点输出”。

## 总结

在可视化工作流中，让后一个节点使用前一个节点的结果，核心思路是：

1. 每个节点执行后，把结果写入 `context`
2. 后续节点配置中保存模板字符串
3. 执行时用 Handlebars 和 `context` 渲染模板
4. HTTP 请求完成后，再把当前节点结果继续写回 `context`
5. UI 上通过变量选择器隐藏模板语法复杂度

Handlebars 在这里解决的是执行层的问题：把用户配置里的占位符替换成真实的上下文数据。

而真正好的用户体验，是在可视化界面上让用户“点选变量”，而不是要求用户记住模板语法。
