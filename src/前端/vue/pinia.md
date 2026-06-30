---
title: "pinia"
icon: "vue"
date: 2023-07-19
category:
  - "前端"
  - "vue"
tag:
  - "前端"
  - "pinia"
  - "vue2"
star: true
description: "Pinia Pinia 是什么？ Pinia 是 Vue 的专属状态管理库，它允许你跨组件或页面共享状态。如果你熟悉组合式 API 的话，你可能会认为可以通过一行简单的 export const state = reactive({}) 来共享一个全局状态。对于单页应用来说确实可以，但如果应用在服务器端渲染，这可能会使你的应用暴露出一些安全漏洞。 而如果使用 Pinia，即使在小型单页应用中，你也可以获得如下功能： Devtools 支持 追踪 actions、mutations 的时间线 在组件中展示它们所用到的 Store 让调试更容易的 Time travel 热更新 不必重载页面即可修改 Store 开发时可保持当前的 State 插件：可通过插件扩展 Pinia 功能 为 JS 开发者提供适当的 TypeScript 支持以及自动补全功能。 支持服务端渲染"
---
# Pinia

## Pinia 是什么？

---

Pinia 是 Vue 的专属状态管理库，它允许你跨组件或页面共享状态。如果你熟悉组合式 API 的话，你可能会认为可以通过一行简单的`export const state = reactive({})`来共享一个全局状态。对于单页应用来说确实可以，但如果应用在服务器端渲染，这可能会使你的应用暴露出一些安全漏洞。 而如果使用 Pinia，即使在小型单页应用中，你也可以获得如下功能：

- Devtools 支持
    - 追踪 actions、mutations 的时间线
    - 在组件中展示它们所用到的 Store
    - 让调试更容易的 Time travel
- 热更新
    - 不必重载页面即可修改 Store
    - 开发时可保持当前的 State
- 插件：可通过插件扩展 Pinia 功能
- 为 JS 开发者提供适当的 TypeScript 支持以及 **自动补全** 功能。
- 支持服务端渲染

---

### Store是什么？

Store (如 Pinia) 是一个保存状态和业务逻辑的实体，它并不与你的组件树绑定。换句话说，**它承载着全局状态**。它有点像一个永远存在的组件，每个组件都可以读取和写入它。它有**三个概念**，[state](https://pinia.vuejs.org/zh/core-concepts/state.html)、[getter](https://pinia.vuejs.org/zh/core-concepts/getters.html)和[action](https://pinia.vuejs.org/zh/core-concepts/actions.html)，我们可以假设这些概念相当于组件中的`data`、`computed`和`methods`

### 应该使用的地方

一个 Store 应该包含可以在整个应用中访问的数据。这包括在许多地方使用的数据，例如显示在导航栏中的用户信息，以及需要通过页面保存的数据，例如一个非常复杂的多步骤表单。

## 定义Store

简单的定义:

```js
import { defineStore } from 'pinia'

// 你可以对 `defineStore()` 的返回值进行任意命名，但最好使用 store 的名字，同时以 `use` 开头且以 `Store` 结尾。(比如 `useUserStore`，`useCartStore`，`useProductStore`)
// 第一个参数是你的应用中 Store 的唯一 ID。
export const useAlertsStore = defineStore('alerts', {
  // 其他配置...
})
```

也和Vue的选项式API类似,传入state、actions、getters属性的Option对象

```js
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++
    },
  },
})
```

你可以认为`state`是 store 的数据 (`data`)，`getters`是 store 的计算属性 (`computed`)，而`actions`则是方法 (`methods`)

### 关于如何解决vue2报错

```text
Uncaught Error: 【🍍】: getActivePinia was called with no active Pinia. Did you forget to install pinia?
```

这个问题困扰了很久最终解决就是在export里面调用就好了,好像是因为vue2的原因？

```vue

    hello
{{store.count}}
改变数据

name:
{{store.name}}

  import {main} from '../stores/hello'

export default {
  name: 'HelloWorld',
  props: {

    msg:
    String
  },
  data(){

   return{
    store:main(),

   }
  },
  methods: {
    changeState() {
      this.store.increment()

    },
  },
  mounted() {

  },

}

../stores/hello
```
