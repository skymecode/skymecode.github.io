---
title: "SpringMVC"
icon: "Java"
date: 2023-10-04
category:
  - "Java框架"
tag:
  - "SpringMVC"
  - "Java"
description: "前言：用过springboot的都知道约定大于配置这个理念,servlet在一定程度上解决了我们的需求,可是servlet的复杂程度不亚于spring的配置,在现代追求快速开发的理念上好像有些不吻合,谁都不想花费大量时间在配置上面,springmvc虽然比servlet方便,但它在我看来只是在向springboot过度中的一个驱动 Web框架 在之前写web项目中,实现功能主要依赖于servlet实现,在实现servlet的时候,实现功能还是会有点麻烦,所以才会出现基于servlet的web框架用来替换servlet实现功能,但不能完全抛弃,这样的话开发效率大大提神"
---
前言：用过springboot的都知道约定大于配置这个理念,servlet在一定程度上解决了我们的需求,可是servlet的复杂程度不亚于spring的配置,在现代追求快速开发的理念上好像有些不吻合,谁都不想花费大量时间在配置上面,springmvc虽然比servlet方便,但它在我看来只是在向springboot过度中的一个驱动

## Web框架

在之前写web项目中,实现功能主要依赖于servlet实现,在实现servlet的时候,实现功能还是会有点麻烦,所以才会出现基于servlet的web框架用来替换servlet实现功能,但不能完全抛弃,这样的话开发效率大大提神

常见的web技术:servlet,springmvc,struts2

运行效率:servlet&gt;springmvc&gt;struts2

开发效率:springmvc≈sttructs2&gt;servlet

## XML实现

xml实现其实就是一些配置问题

当然无论如何都有spring-mvc.xml这个springmvc的配置文件

```xml

                loginController

```

上面的配置url和控制器映射即xml实现

## 注解实现

通过@RequestMapping实现url映射controller

```java
package com.skyme.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * @author:Skyme
 * @create: 2023-10-04 22:06
 * @Description:
 */

@Controller
public class LoginController  {
   @RequestMapping("/login")
    public String login(){
       return "login";
   }
   @RequestMapping("/loginDo")
   public String loginDo(String username,String password){
       System.out.println(username);
       System.out.println(password);
       return "login";
   }

}
```

@RequestMapping详解

- 这个注解主要用来映射url和方法的,它可以出现在类和方法上,如果出现在类上的话,那么路径就需要先写类上的路径后写方法上的路径;比如UserController上如果有注解@RequestMapping("/user")访问就成了/user/???
- path和value是互为别名,两者的效果是一样的,都是设置访问路径 类型是字符串数组,也就意味着一个方法可以访问多个路径,如果访问的路径不存在就响应404
- method设置这个访问的请求方式,RequestMethod枚举数组,可以支持多种请求方式 如果使用了不支持的请求方式响应405
- params这个表示请求这个方法是必须携带的请求参数 是字符串数组,可以携带多个请求参数 如果请求中没有携带指定的参数那么响应400
- header 这个请求表示这个方法必须携带请求头,是字符串数组,可以携带多个请求头 如果请求中没有携带指定头就响应404
- consumes 指定请求的数据类型 如果不正确就响应415 415-Unsupported Media Type
- produces 指定响应的数据类型

```java
 @RequestMapping("/loginDo")
   public String loginDo(@RequestParam("username") String username,@RequestParam("password") String password){
       System.out.println(username);
       System.out.println(password);
       return "login";
   }
```

在这里我们使用了@RequestParam注解,可以对应相应的参数,我们可以在里面加入required,默认值为true,如果为false,那么可以加个defaultValue

如何拿token呢？直接注解@RequestHeader("token")这样拿

如果参数是json呢？@RequstBody就可以解析了

## SpringMvc的运行流程

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1691302-20211208150248701-1377434442.png)

1. 用户请求发送DispatcherServlet(前端控制器)
2. 前端就控制器接收到请求后调用HandlerMapping
3. 映射处理器找到对应的处理器(xml配置或扫描注解@RequestMapping,生成处理器对象及处理器的拦截器一并的返回给前端就控制器)
4. 前端控制器找到对应的处理适配器(HandlerAdapter)
5. 适配器去调用对应的控制器(后端控制器),后端控制器执行方法,会得到一个ModelandView
6. 处理适配器再将ModelAndView响应给前端控制器
7. 前端控制器通过视图解析器找到对应的视图,返回给前端控制器
8. 前端控制器将视图根据数据进行渲染得到一个静态页面
9. 前端控制器将这个页面响应给客户端

### 方法返回的子类型

#### String

```text

```

#### Void

```text

```

#### ModelAndView

#### ModelMap

#### List

#### Set

#### 自定义类型

### 类型转换器

在默认的时候,请求参数是String类型,在后台接收没有使用String来接收这个参数的时候,springmvc默认情况下会有一些拦截器来处理类型不一样的参数,也可能会出现无法处理的一个情况,这个时候就需要一个类型转换器来进行处理

```text
比如:前端传递了日期的参数,后台用Date来接收,springmvc默认情况下可以处理yyyy/MM/dd格式的参数,但无法处理yyyy-MM-dd,会响应400表示参数不正确,为了解决这个问题,就需要实现一个类型转换器
```

实现一个类型转换器,需要实现转换器的接口,代码如下

```java
package com.skyme.convert;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * @author:Skyme
 * @create: 2023-10-05 17:15
 * @Description:
 */
@Component
public class DateConvert implements Converter {

    @Override
    public Date convert(String source) {
        if(source!=null&&!"".equals(source)){
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd");
            try {
                return  simpleDateFormat.parse(source);
            } catch (ParseException e) {
                throw new RuntimeException(e);
            }
        }
        return null;
    }
}
```

```xml

```

## 文件上传

我们一般使用MultipartFile上传单个文件和多个文件

1. 首先是添加Apache文件上传jar包

commons-fileupload-1.3.1.jar

1. 配置MultipartResolver处理文件 必须为id:multipartResolver不然识别不到
  ```xml

  ```
2. 代码
  ```java
      @PostMapping("/uploadDo")
      public String uploadDo( @RequestParam("sFile")CommonsMultipartFile file) {
          String originalFilename = file.getOriginalFilename();//原文件
          String path = "D://springmvcdata/" + UUID.randomUUID().toString()+originalFilename.substring(originalFilename.lastIndexOf("."));
          try {
              file.transferTo(new File(path));
          } catch (IOException e) {
              throw new RuntimeException(e);
          }
          return "upload";
      }
  ```
  ```jsp
  <%--
    Created by IntelliJ IDEA.
    User: Skyme
    Date: 2023/10/5
    Time: 19:28
    To change this template use File | Settings | File Templates.
  --%>
  <%@ page contentType="text/html;charset=UTF-8" language="java" %>
  <html>
  <head>
      <title>上传</title>
  </head>
  <body>
  <form action="/springmvc_an/user/uploadDo" method="post" enctype="multipart/form-data">
      <input type="file" name="sFile"><br>
      <input type="submit" value="上传">
  </form>
  </body>
  </html>
  ``` 多文件上传改为数组即可，前端加上multiple 大文件上传使用分片进行处理(待学hash加密分片)
  ### 上传到指定服务器服务器
  ```xml

        com.sun.jersey
        jersey-client
        1.19.4

        com.sun.jersey
        jersey-core
        1.19.4

  ```
  ```java
      @PostMapping("/uploadDo")
      public String uploadDo( @RequestParam("sFile")CommonsMultipartFile file) {
          String originalFilename = file.getOriginalFilename();//原文件
           String path = "http://localhost:8088/upload/files/" + UUID.randomUUID().toString()+originalFilename.substring(originalFilename.lastIndexOf("."));
  //        try {
  //            file.transferTo(new File(path));
  //        } catch (IOException e) {
  //            throw new RuntimeException(e);
  //        }
          //开始处理文件
          Client client = Client.create();
          //连接服务器
          WebResource resource = client.resource(path);\
          //执行上传
          resource.put(file.getBytes());
          return "upload";
      }
  ```

## SpringMVC处理JSON

spring建议使用jackson

还可以使用fastjson,gson

### 使用jackson

```xml

      com.fasterxml.jackson.core
      jackson-annotations
      2.13.5

      com.fasterxml.jackson.core
      jackson-core
      2.13.5

      com.fasterxml.jackson.core
      jackson-databind
      2.13.5

```

```xml

                        application/json;charset=utf-8
                            text/html;charset=utf-8

                        application/json;charset=utf-8
                            text/html;charset=utf-8

```

当我们响应json的时候,要给方法加上@ResponBody的注解

但是如果我们响应整个Controller响应json的话

可以直接加上@RestController(@Controller+
@ResponseBody)

```xml

```

## 跨域和异常处理

### 跨域

全局跨域

在springmvc配置文件里面添加如下内容

```xml

```

局部跨域

使用注解@CrossOrigin

### 异常处理

springmvc提供了一套异常处理机制,可以针对性的去处理一些异常

#### 局部配置

在控制器中添加一个专门的方法来捕获对应的异常,并进行处理

在Controller中可以添加一个异常的处理方法,使用注解@ExceptionHandler来捕获对应的异常,但是方法响应式页面的话,异常处理也必须是页面,方法响应为json的话异常处理的方法也必须为json

#### 全局配置

@ControllerAdvice+@ExceptionHandler配合

```java
@ControllerAdvice
public class ExceptionController {

    @ExceptionHandler(RuntimeException.class)
    //返回json@ResponseBody
    public void exception(Exception e) {

	//处理异常
    }
}
```

## 拦截器

写拦截器那么就要去实现mvc里面的HandlerInterceptor,里面有三个方法preHandle、postHandle、afterCompletion

springmvc解决乱码问题,可以使用过滤器,放在web.xml里面

```xml

    encFilter
    org.springframework.web.filter.CharacterEncodingFilter

      encoding
      utf-8

    encFilter
    /*

```

### 实现拦截器

```java
package com.skyme.interceptor;

import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * @author:Skyme
 * @create: 2023-10-05 20:52
 * @Description:
 */
@Component
public class LoginInterceptor implements HandlerInterceptor {
    //目标方法执行之前
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HandlerMethod handlerMethod = (HandlerMethod) handler;
        return HandlerInterceptor.super.preHandle(request, response, handler);
    }
    //目标方法执行完成以后，如果目标方法抛出异常,这个方法不会执行
    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) throws Exception {
        HandlerInterceptor.super.postHandle(request, response, handler, modelAndView);
    }

    //响应之前执行，无论目标方法是否抛出异常都执行
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        HandlerInterceptor.super.afterCompletion(request, response, handler, ex);
    }
}
```

配置到spring-mvc里面

```xml

```

### 拦截器的使用场景

1. 认证和授权：拦截器可以用于验证用户的身份和权限，确保只有经过认证和授权的用户才能访问受保护的资源。
2. 日志记录：拦截器可以用于记录请求和响应的日志，以便进行故障排除、性能分析和审计等。
3. 参数校验和数据转换：拦截器可以在请求到达处理器之前对请求参数进行校验和转换，以确保数据的有效性和一致性。

## Restful风格请求

restful是目前比较流行的一种资源操作方式,基于http请求

组成部分:url和操作方式

url主要是定位资源,操作方式主要是针对资源的操作

操作方式主要就是请求方式 GET获取资源 POST提交数据 DELETE删除数据 PUSH提交数据 PUT更新数据等

比如:

get[http://localhost/springmvc/user/10](http://localhost/springmvc/user/10)查询id为10的user对象

delet[http://localhost/springmvc/user/10](http://localhost/springmvc/user/10)删除id为10的user

post[http://localhost/springmvc/user](http://localhost/springmvc/user)提交数据

相对于之前的请求,路径上基本可以把信息把所有信息暴露出来,但restful可以达到一致,要做什么由请求方式来决定的,因为请求的方式相对固定,所以不需要再路径上再去描述相关的功能,这个叫做restful,一般响应的都是json
