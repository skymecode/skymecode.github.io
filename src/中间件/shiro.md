---
title: "Shiro"
icon: "Java"
date: 2023-10-10
category:
  - "中间件"
tag:
  - "Shiro"
  - "Java"
description: "Shiro Apache Shiro是Java的一个安全(权限)框架 Shiro 可以轻松的完成:身份认证、授权、加密、会话管理等 Shiro可以使用在JavaSE、JavaEE 功能强大且易用,可以快速轻松地保护任务应用程序 功能 Authentication 身份认证/登录,验证用户是不是拥有相应的身份 Authorization 授权,即权限验证,验证某个已认证的用户是否拥有某个权限;即判断用户是否能进行什么操作,如:验证某个用户是否拥有某个角色;或者细粒度的验证某个用户是否对某个资源是否某个权限 Session Manager 会话管理,即用户登录后就是一次会话,在没有退出前,它的所有信息都在会话中;会话开业是普通的JavaSE环境,也可以是Web环境 Cryptography 加密,巴欧数据的安全性,如密码加密存储到数据库,而不是明文存储 Web Support Web支持,非常容易的集成Web环境; Caching 缓存,比如用户登录后,其用户信息、拥有的角色/权限不必每次去查,可以提高效率 Concurrency 支持多线程并发验证 Testing 测试 “Run As\" 用另外用户身份 Remember Me 记住我"
---
## Shiro

1. Apache Shiro是Java的一个安全(权限)框架
2. Shiro 可以轻松的完成:身份认证、授权、加密、会话管理等
3. Shiro可以使用在JavaSE、JavaEE
4. 功能强大且易用,可以快速轻松地保护任务应用程序

## 功能

1. Authentication 身份认证/登录,验证用户是不是拥有相应的身份
2. Authorization 授权,即权限验证,验证某个已认证的用户是否拥有某个权限;即判断用户是否能进行什么操作,如:验证某个用户是否拥有某个角色;或者细粒度的验证某个用户是否对某个资源是否某个权限
3. Session Manager 会话管理,即用户登录后就是一次会话,在没有退出前,它的所有信息都在会话中;会话开业是普通的JavaSE环境,也可以是Web环境
4. Cryptography 加密,巴欧数据的安全性,如密码加密存储到数据库,而不是明文存储
5. Web Support Web支持,非常容易的集成Web环境;
6. Caching 缓存,比如用户登录后,其用户信息、拥有的角色/权限不必每次去查,可以提高效率
7. Concurrency 支持多线程并发验证
8. Testing 测试
9. “Run As" 用另外用户身份
10. Remember Me 记住我

## 原理

1. ### Shiro架构(外部) 首先是一个应用程序要和Shiro进行交互,那么传递的对象就是Subject(也就是当前用户或可以是对象)，然后会传入到ShiroSecurityManager(也就是安全管理器)使用各种工具(组件)，然后Shiro通过Realm(数据源)获取数据进行安全校验
2. ### 内部 内部主要是各种管理器

## 基本使用

shrio可以使用数据库,也可以使用ini类型的文件

## 登录认证

要说登录认证,那么肯定要知道是什么登录认证

1. ### 概念
    1. 初始化获取SecurityManager
    2. 获取Subject对象
    3. 创建token,web应用用户名密码从页面传递
    4. 完成登录
2. ### 登录认证基本流程
    1. 收集用户身份/凭证,例如用户名/密码
    2. 调用Subject.login进行登录,如果失败将得到响应的AuthenticationException异常,根据异常提示用户错误信息,否则登录成功
    3. 创建自定义的Realm类,继承AuthorizingRealm类,实现doGetAuthticationInfo()方法

## 角色和授权

1. 授权：访问控制,在授权中需要了解几个关键对象:主体,资源,权限,角色
2.
3. 授权流程：
    1. 首先调用Subject.isPermitted*/hasRole接口，其会委托给SecurityManager,而SecurityManager接着会委托给Authorizer;
    2. Authorizer是真正的授权者,如果调用isPermitted("user:view"),其首先会通过PermissionResolver把字符串转换成相应的Permission实例
    3. 在尽显授权之前，其会调用相应的Realm获取Subject相应的角色/权限用于匹配传入的角色/权限
    4. Authorizer会判断Realm的角色/权限是否和传入的匹配,如果有多个Realm，会委托ModularRealmAuthorizer进行循环判断,如果匹配如isPermitted/hasRole会返回true,否则返回false表示授权失败

## Shiro加密

## Shiro自定义登录认证

## Shiro整合SpringBoot

## 登录认证实现

## 多个realm的认证策略设置

1. 多个realm实现原理 当程序配置多个Realm时候,例如用户名密码,手机号验证码校验

​ AuthenticationStrategy是一个无状态的组件,它在身份验证尝试中被询问4次(这4次交互所需的任何必要的状态将被作为方法参数)

① 在所有 Realm 被调用之前

② 在调用 Realm 的 getAuthenticationInfo 方法之前

③ 在调用 Realm 的 getAuthenticationInfo 方法之后

④ 在所有 Realm 被调用之后

认证策略的另外一项工作就是聚合所有 Realm 的结果信息封装至一个AuthenticationInfo 实例中，并将此信息返回，以此作为 Subject 的身份信息。

Shiro 中定义了 3 种认证策略的实现：
![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/f1a468af89ff374901ec81b1ca95de8a.png)

ModularRealmAuthenticator 内置的认证策略默认实现是 AtLeastOneSuccessfulStrategy 方式。可以通过配置修改策略。

```java
@Bean
public DefaultWebSecurityManager defaultWebSecurityManager(){
//1 创建  defaultWebSecurityManager 对象
    DefaultWebSecurityManager defaultWebSecurityManager = new DefaultWebSecurityManager();
//2 创建认证对象，并设置认证策略
    ModularRealmAuthenticator modularRealmAuthenticator = new
ModularRealmAuthenticator();
    modularRealmAuthenticator.setAuthenticationStrategy(new
AllSuccessfulStrategy());
    defaultWebSecurityManager.setAuthenticator(modularRealmAuthenticator)
;
//3 封装  myRealm 集合
    List list = new ArrayList<>();
    list.add(myRealm);
    list.add(myRealm2);
//4 将 myRealm 存入 defaultWebSecurityManager 对象
    defaultWebSecurityManager.setRealms(list);
//5 返回
    return defaultWebSecurityManager;
}
```

## Remember me功能

1. 基本流程

## 角色认证

## 权限验证

## 异常处理

使用@ControllerAdvice和@ExceptionHandler实现特殊异常处理

## 前端页面授权验证

## 缓存工具EhCache

## 会话管理

1. SessionManager 会话管理器
