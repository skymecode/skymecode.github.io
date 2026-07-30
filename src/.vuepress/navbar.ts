import { navbar } from "vuepress-theme-hope";

export default navbar([
  { text: "博客主页", icon: "house", link: "/" },
  { text: "个人日志", icon: "pen-to-square", link: "/个人/" },
  {
    text: "后端",
    icon: "server",
    prefix: "/后端/",
    children: [
      { text: "Java学习", icon: "pen-to-square", link: "java/" },
      { text: "数据库", icon: "database", link: "数据库/" },
      { text: "算法学习", icon: "pen-to-square", link: "算法/" },
      { text: "Demo", icon: "code", link: "Demo/" },
    ],
  },
  {
    text: "前端",
    icon: "laptop-code",
    prefix: "/前端/",
    children: [
      { text: "HTML", icon: "code", link: "html/" },
      { text: "CSS", icon: "palette", link: "css/" },
      { text: "JavaScript", icon: "code", link: "javascript/" },
      { text: "ES6", icon: "code", link: "ES6/" },
      { text: "Vue", icon: "code", link: "vue/" },
      { text: "uniapp", icon: "mobile-screen", link: "uniapp/" },
      { text: "Smart Flow", icon: "diagram-project", link: "smart-flow/" },
      { text: "React", icon: "atom", link: "React/" },
    ],
  },
  {
    text: "刷题",
    icon: "code",
    prefix: "/刷题/",
    children: [{ text: "Hot 100", icon: "fire", link: "hot100/" }],
  },
  {
    text: "Linux",
    icon: "terminal",
    link: "/硬件/嵌入式/",
  },
  {
    text: "集合源码",
    icon: "book",
    link: "/集合源码/",
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
      { text: "Shiro", link: "shiro.html" },
      { text: "RabbitMQ", link: "rabbitmq.html" },
    ],
  },
  { text: "博客日志", icon: "circle-info", link: "/博客日志/" },
]);
