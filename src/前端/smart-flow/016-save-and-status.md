---
title: "Smart Flow 016：保存工作流与节点状态"
icon: "floppy-disk"
date: 2026-06-30
category:
  - "前端"
tag:
  - "Smart Flow"
  - "React Flow"
  - "Workflow"
star: true
---

# Smart Flow 016：保存工作流与节点状态

## 更新

首先将保存从保存名称改成保存整个editor(也就是边，节点等信息)

首先更改trpc的router，这个应该是workflow下的任务，而editor是具体的任务

![](/assets/images/smart-flow/save-editor.png)

现在点击保存能够完整保存这个工作流（demo）

## 每个节点的状态显示

我们要为节点加入status，所以要更新状态

状态应该先在react-flow官网引入最基础的组件，然后再基于这个组件修改现有的组件

![](/assets/images/smart-flow/node-status.png)
