import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "个人日志",
      icon: "pen-to-square",
      prefix: "个人/",
      children: "structure",
    },
    {
      text: "后端文章",
      icon: "book",
      prefix: "后端/",
      children: "structure",
    },
    {
      text: "前端文章",
      icon: "laptop-code",
      prefix: "前端/",
      children: "structure",
    },
    {
      text: "硬件",
      icon: "microchip",
      prefix: "硬件/",
      children: "structure",
    },
    {
      text: "集合源码",
      icon: "book",
      prefix: "集合源码/",
      children: "structure",
    },
    {
      text: "框架",
      icon: "layer-group",
      prefix: "java框架/",
      children: "structure",
    },
    {
      text: "中间件",
      icon: "gears",
      prefix: "中间件/",
      children: "structure",
    },
    "博客日志/1",
    "intro",
  ],
});
