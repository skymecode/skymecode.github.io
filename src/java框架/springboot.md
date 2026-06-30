---
title: "SpringBoot"
icon: "Java"
date: 2023-10-06
category:
  - "Java框架"
tag:
  - "SpringBoot"
  - "Java"
description: "前言:配置还是太多了,不想搞配置了,为了快速开发,选择了SpringBoot,也就是Spring组织下的一个集成spring和springmvc以及tomcat等的项目,然后默认配置很多东西,约定大于配置 SpringBoot快速入门 注解解释 @RestController 就是@Controller和@ResponseBody 组合 @GettingMaping 就是@RequestMapping添加了method为GET @SpringBootConfiguration 表示当前是springboot的配置 组合注解 	@Configuration 表示为配置类	在springboot中如果需要添加配置的时候可以使用这个注解 	@Indexed 索引 @EnableAutoConfiguration 启动自动配置 @ComponentScan 组件扫描,类型xml中的component-scan 标签,从当前类的包开始扫描,包含当前包以及子包"
---
前言:配置还是太多了,不想搞配置了,为了快速开发,选择了SpringBoot,也就是Spring组织下的一个集成spring和springmvc以及tomcat等的项目,然后默认配置很多东西,约定大于配置

## SpringBoot快速入门

### 注解解释

```text
@RestController 就是@Controller和@ResponseBody 组合
@GettingMaping 就是@RequestMapping添加了method为GET
@SpringBootConfiguration 表示当前是springboot的配置 组合注解
	@Configuration 表示为配置类	在springboot中如果需要添加配置的时候可以使用这个注解
	@Indexed 索引
@EnableAutoConfiguration 启动自动配置
@ComponentScan 组件扫描,类型xml中的component-scan 标签,从当前类的包开始扫描,包含当前包以及子包
```

### 启动器

在springboot中添加依赖的时候发现依赖总是包含了starter这个词,这个称为启动,启动器本质就是spring为了帮助我们完成自动化配置,提供了自动配置依赖,这些依赖就是启动器。是由spring-boot-starter-parent项目将依赖关系声明为一个或者多个启动器。这样的话我们就可以根据实际的需求将需要的启动器引入即可,比如当前是一个web项目,所以引入了一个web的启动器

## 配置原理

### java配置

在springboot中出现的配置可以使用java配置来完成,java配置主要依赖于java的类和注解来完成,可以替换xml配置，和xml的配置效果是一样的

```text
@Configuration 一般加在类上面,表示当前类是一个配置类,这个配置可以替换spring中的xml文件
@PropertySource("classpath:db.properties") 可以指定引入外部配置文件的地址
@Value("com.mysql.jdbc.Driver")或者@Value("${jdbc.driver}") 普通属性的值注入,可以使用${name}方式配置文件的值
@Bean 可以声明在方法上,将方法的返回值放入spring的容器,替换了xml的bean标签
```

​
