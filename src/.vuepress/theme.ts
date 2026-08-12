import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme(
  {
    hostname: "https://skymecode.github.io",

    author: {
      name: "Skyme",
      url: "https://github.com/skymecode",
    },

    logo: "/logo1.png",

    repo: "skymecode/skymecode.github.io",
    docsDir: "src",

    navbar,
    sidebar,

    footer: "路的尽头依旧是路",
    copyright: "Copyright © 2026 Skyme",
    displayFooter: true,

    blog: {
      avatar: "/logo2.jpg",
      description: "hava a good luck",
      intro: "/intro.html",
      medias: {
        GitHub: "https://github.com/skymecode",
      },
    },

    metaLocales: {
      editLink: "在 GitHub 上编辑此页",
    },

    markdown: {
      align: true,
      attrs: true,
      figure: false,
      gfm: true,
      imgLazyload: true,
      imgSize: true,
      mark: true,
      tasklist: true,
      vPre: true,
    },

    plugins: {
      blog: true,
      git: {
        createdTime: false,
        updatedTime: false,
        contributors: false,
        changelog: false,
      },
      components: {
        components: ["Badge", "VPCard"],
      },
      icon: {
        prefix: "fa6-solid:",
      },
    },
  },
  {
    custom: true,
  },
);
