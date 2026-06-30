import { navbar } from "vuepress-theme-hope";

export default navbar([
  { text: "博客主页", icon: "house", link: "/" },
  { text: "个人日志", icon: "pen-to-square", link: "/个人/" },
  {
    text: "后端",
    icon: "server",
    prefix: "/后端/",
    children: [
      {
        text: "Java学习",
        icon: "pen-to-square",
        prefix: "java/",
        children: [
          { text: "基础回顾", link: "1" },
          { text: "面向对象基础", link: "2" },
          { text: "封装相关知识", link: "3" },
          { text: "字符串相关知识", link: "4" },
          { text: "继承", link: "5" },
          { text: "多态", link: "6" },
          { text: "接口和抽象类", link: "7" },
          { text: "Set相关知识", link: "Set相关" },
          { text: "集合时间复杂度", link: "Java集合时间复杂度" },
          { text: "异常", link: "异常" },
          { text: "泛型", link: "泛型" },
          { text: "线程(上)", link: "线程" },
          { text: "线程(下)", link: "线程下" },
          { text: "网络编程", link: "网络编程" },
          { text: "注解", link: "注解" },
          { text: "反射", link: "反射" },
        ],
      },
      {
        text: "数据库",
        icon: "database",
        prefix: "数据库/",
        children: [{ text: "Mysql", link: "1" }],
      },
      {
        text: "算法学习",
        icon: "pen-to-square",
        prefix: "算法/",
        children: [
          { text: "DFS", link: "1" },
          { text: "每日一题饥饿的牛", link: "2" },
          { text: "每日一题矩阵", link: "3" },
          { text: "LeetCode", link: "4" },
        ],
      },
      {
        text: "Demo",
        icon: "code",
        prefix: "Demo/",
        children: [{ text: "OpenAi", link: "openai" }],
      },
    ],
  },
  {
    text: "前端",
    icon: "laptop-code",
    prefix: "/前端/",
    children: [
      { text: "HTML", icon: "code", prefix: "html/", children: [{ text: "HTML基础", link: "1" }] },
      {
        text: "CSS",
        icon: "palette",
        prefix: "css/",
        children: [
          { text: "CSS基础", link: "1" },
          { text: "CSS盒子模型", link: "2" },
          { text: "CSS定位和浮动", link: "3" },
          { text: "CSS弹性盒子", link: "4" },
        ],
      },
      {
        text: "JavaScript",
        icon: "code",
        prefix: "javascript/",
        children: [
          { text: "JS入门", link: "1" },
          { text: "DOM", link: "2" },
        ],
      },
      { text: "ES6", icon: "code", prefix: "ES6/", children: [{ text: "ES6基础", link: "1" }] },
      {
        text: "Vue",
        icon: "code",
        prefix: "vue/",
        children: [
          { text: "vue基础和扩展", link: "1" },
          { text: "vueX", link: "vuex" },
          { text: "pinia", link: "pinia" },
        ],
      },
      { text: "uniapp", icon: "mobile-screen", prefix: "uniapp/", children: [{ text: "uniapp", link: "1" }] },
      {
        text: "Smart Flow",
        icon: "diagram-project",
        prefix: "smart-flow/",
        children: [
          { text: "013/014 编辑器页面与画布建模", link: "013-014-editor" },
          { text: "013/014 补充学习记录", link: "013-014-notes" },
          { text: "015 添加节点的最小闭环", link: "015-add-node" },
          { text: "016 保存工作流与节点状态", link: "016-save-and-status" },
          { text: "017/018 工作流执行与动态变量名", link: "017-018-execute-and-dynamic-key" },
        ],
      },
    ],
  },
  {
    text: "Linux",
    icon: "terminal",
    prefix: "/硬件/嵌入式/",
    children: [{ text: "嵌入式Linux", link: "1" }],
  },
  {
    text: "集合源码",
    icon: "book",
    prefix: "/集合源码/Collection/",
    children: [{ text: "ArrayList", link: "ArrayList" }],
  },
  {
    text: "框架",
    icon: "layer-group",
    prefix: "/java框架/",
    children: [
      { text: "Mybatis", link: "mybatis" },
      { text: "Spring", link: "spring" },
      { text: "SpringBoot", link: "springboot" },
      { text: "SpringMVC", link: "springmvc" },
    ],
  },
  {
    text: "中间件",
    icon: "gears",
    prefix: "/中间件/",
    children: [
      { text: "Shiro", link: "shiro" },
      { text: "RabbitMQ", link: "rabbitmq" },
    ],
  },
  { text: "博客日志", icon: "circle-info", link: "/博客日志/1.html" },
]);
