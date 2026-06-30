import { defineUserConfig } from "vuepress";
import { webpackBundler } from "@vuepress/bundler-webpack";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Skyme的博客",
  description: "Skyme 的学习与博客记录",

  theme,

  bundler: webpackBundler({
    chainWebpack: (config) => {
      config.optimization.sideEffects(false);
    },
  }),

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
