---
title: "Spring"
icon: "Java"
date: 2023-09-28
category:
  - "Java框架"
tag:
  - "Spring"
  - "Java"
description: "前言: ​	最近感冒有点难受,但学习的过程并不难受(doge),突然发现这些框架就是为了开发效率而出现的(以后很想写一套MineCraft的开发框架),也比较钦佩那些写框架的人,毕竟自己写这些考虑完全不周全,Spring确实影响了Java的发展,所以Spring在Java里面地位重中之重,学好Spring也是一个承上启下的过程。 前言: ​	最近感冒有点难受,但学习的过程并不难受(doge),突然发现这些框架就是为了开发效率而出现的,也比较钦佩那些写框架的人,毕竟自己写这些考虑完全不周全,Spring确实影响了Java的发展,所以Spring在Java里面地位重中之重,学好Spring也是一个承上启下的过程。"
---
前言:

​ 最近感冒有点难受,但学习的过程并不难受(doge),突然发现这些框架就是为了开发效率而出现的(以后很想写一套MineCraft的开发框架),也比较钦佩那些写框架的人,毕竟自己写这些考虑完全不周全,Spring确实影响了Java的发展,所以Spring在Java里面地位重中之重,学好Spring也是一个承上启下的过程。

前言:

​ 最近感冒有点难受,但学习的过程并不难受(doge),突然发现这些框架就是为了开发效率而出现的,也比较钦佩那些写框架的人,毕竟自己写这些考虑完全不周全,Spring确实影响了Java的发展,所以Spring在Java里面地位重中之重,学好Spring也是一个承上启下的过程。

## Spring的入门

Spring如何上手？点开Github搜索Spring!

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230928203432123.png)

这里版本都到Spring6了，但为了学习,我还是使用Spring5(先学会老一辈的)

[https://docs.spring.io/spring-framework/docs/5.3.30/reference/html/core.html#spring-core](https://docs.spring.io/spring-framework/docs/5.3.30/reference/html/core.html#spring-core)

上面是Spring的官网文档

导入依赖:

```xml

            org.springframework
            spring-context
            5.3.28

```

这里面包括了:![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230928203906468.png)

然后在resources下创建

一个xml文件,里面加入我在官网文档里面找的xml

```xml

```

为什么加这个内容？

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230928204126503.png)

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230928204006442.png)

先看看带来了什么吧？

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230928204815307.png)

```xml

```

这里其实就是将key-value方式放入容器(也就是id),通过class反射创建对象

```java
package com.skyme;

import com.skyme.entity.User;
import org.junit.Test;
import org.springframework.context.support.ClassPathXmlApplicationContext;

/**
 * @author:Skyme
 * @create: 2023-09-28 20:43
 * @Description:
 */
public class AppTest {

    @Test
    public void test1(){
        //拿到配置文件,创建容器
        ClassPathXmlApplicationContext ctx = new ClassPathXmlApplicationContext("ApplicationContext.xml");
        //获取对象
        User user = ctx.getBean("user", User.class);
        System.out.println(user);
    }
}
```

首先我们有User这个类,然后在xml文件中配置好这个类使得在初始化的时候就能够创建,之后我们拿到的user都是同一个对象了。

## Spring的bean标签

### 初始化标签和销毁(析构)标签

```java
package com.skyme.entity;

/**
 * @author:Skyme
 * @create: 2023-09-28 20:46
 * @Description:
 */
public class User {
    private void init() {
        System.out.println("初始化");
    }

    private void destroy() {
        System.out.println("销毁");
    }
    private String name;

}
```

我在类中加上了这两个方法,然后再去xml中添加上这两个标签

```xml

```

然后就成这样了,之后我们在去看看程序运行会出现什么效果:

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230928210225917.png)

那初始化一般写什么呢？

​ 很显示,在之前过滤器当中,我们读取配置一般就要写在初始化方法里面

析构又写什么呢？

​ 一般去关闭连接这种,比如Redis,流等等

### Scope作用范围标签

```xml

```

Scope里面singleton也就是默认的参数,单例模式,而prototype是原型模式,在这个模式下析构函数不会执行了(每一次都是新的,不会去关注怎么销毁的)。

其次如果是web项目当中,这里面参数还可以填写request请求作用域,session会话作用域 globalSession 全局作用域

### Autowired自动装配

前景回顾:

```xml

```

```java
package com.skyme.service.serviceImpl;

import com.skyme.dao.UserDao;
import com.skyme.service.UserService;

/**
 * @author:Skyme
 * @create: 2023-09-28 21:15
 * @Description:
 */
public class UserServiceImpl implements UserService {

    private UserDao userDao;

    public void setUserDao(UserDao userDao) {
        this.userDao = userDao;
    }
}
```

原本service里面有dao，我们通过property这个标签然后使用set方法可以装配,name值就是set后面的名字

万一我们这个service里面非常多的dao，那岂不是得一直配,所以spring提供了自动装配的方法给我们

```xml

```

byType是什么意思呢？默认在容器找有没有当前的类型,但是如果容器中有多个匹配的呢？

这个时候byName就有用了，byName就会根据属性名去寻找

```xml

```

还有几个参数constructor 通过构造进行注入,no和default都相当于不自动注入

### lazy-init懒加载

设置为true的时候容器创建不会去初始化对象,默认为false

实际开发中懒加载不常用。

注意:depens-on标签依赖的对象一定先于这个创建,而ref不一定,因为是通过set方法进行设置的。

## Spring注入方式

### 构造器注入

当一个对象没有无参构造的时候咋去反射生成对象进容器呢？

```xml

```

使用&lt;constructor-arg&gt;标签进行构造注入

### 集合注入

注意:以下都是通过构造器注入,其实也可以使用property的方式(也就是set)

#### List

```xml

```

#### Map

```xml

```

#### Set

```xml

        hello

```

#### Properties类型

默认都是String类型的

```xml

                world

```

## 对IOC和DI的理解

Spring里面用的思想当然是上面这些拉,还有AOP后面再说

什么是IOC什么是DI?

IOC控制反转：在JavaSE的时候,我们需要对象,都是自己去new或者去反射创建一个对象,或多或少都是自己去直接间接的创建一个对象,而在Spring当中,我们将创建对象的控制权交给了Spring的容器进行管理对象,我们不再去自己创建对象和管理对象,这个叫做IOC

也就是说一个对象的完整生命周期交给了Spring容器

谁控制谁:SE的时候是我们去控制对象,而在Spring当中是Spring容器去控制对象,所以是Spring控制了对象

反转如何理解:对象的创建和管理等控制权交给了Spring，对象由SE主动创建变成了Spring提供对象,所以叫做反转

DI(依赖注入):在容器中,一个对象的属性赋值依赖于容器中其他对象,将容器的其他对象注入到这个对象的属性中

```text
我们可以将对象交给IoC容器进行管理，比如当我们需要一个接口的实现时，由它根据配置文件来决定到底给我们哪一个实现类，这样，我们就可以不用再关心我们要去使用哪一个实现类了，我们只需要关心，给到我的一定是一个可以正常使用的实现类，能用就完事了，反正接口定义了啥，我只管调，这样，我们就可以放心地让一个人去写视图层的代码，一个人去写业务层的代码，开发效率那是高的一匹啊！
```

## Spring注解实现

- 不难发现我们上面好像都是在写xml配置,但写多了就会发现,我一会儿要去搞代码,一会儿又要回来写配置,这样是不是感觉有点心累啊,所以Spring也是一个非常强的框架,里面我们可以使用注解进行实现

首先就是配置文件要改变一下,得新增加点命名空间

如果单独加开启注解的功能

```xml

```

其次就是加入要扫描的包(同时也开启了注解的功能)

```xml

```

使用了注解那就是如何将这些类放入容器成为对象了

当然作为MVC架构的项目,Spring为我们提供了一些十分方便的注解来识别这是那一层

```text
@Controller	控制层
@Service	业务层
@Repository	持久层
```

可以看到这些注解的源码

```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component
public @interface Service {
    @AliasFor(
        annotation = Component.class
    )
    String value() default "";
}
```

其实本质上也加入了@Component,这个注解也就是把类变成对象放入容器里面

那么如何注入呢？

有两种方式,一个是加入Java扩展包

```xml

            javax.annotation
            javax.annotation-api
            1.3.2

```

@Resource默认是按照名称去查找,找不到再按类型去找,而且不是Spring提供的注解

所以还有一种注解

@Autowired这个注解是由Spring提供的,就只按类型去找

里面有一个required表示必须注入,如果是true就会报没有注入的错误,false就不会

如果想按名称去找的话需要这样

```java
 @Autowired
 @Qualifier("userDaoImpl")
```

接下来就是@Scope注解(一般加在类上),也就是我们之前说的单例和原型模式的注解(还包括其他三个作用域rquest,session,globalSession)

然后就是初始化方法和销毁方法

@PostConstruct初始化

@PreDestroy销毁

还有一个就是@Value,里面可以填内容,也可以填${test},这个是什么呢?比如我写了一个配置文件config.properties

```properties
test=hello
```

加上这个标签

```xml

```

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230929160151966.png)

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230929160201125.png)

## Bean的生命周期

//todo

## AOP面向切面编程

### 注解实现

首先就是要导入一系列的包和配置xml了

**这里为了方便就把统一的spring的命名空间拉过来了**

```xml

```

我们加入了上面的开启AOP注解的标签,同时也要扫描包,不然谁知道在哪切这些注解啊

1. 创建一个切面——AOP类 这个类也是对象,所以要放进容器里面,然后就是@Aspect代表着它是切面的意思
  ```java
  package com.skyme.aspect;

  import org.aspectj.lang.JoinPoint;
  import org.aspectj.lang.annotation.Aspect;
  import org.aspectj.lang.annotation.Before;
  import org.springframework.aop.support.AopUtils;
  import org.springframework.stereotype.Component;

  /**
   * @author:Skyme
   * @create: 2023-09-29 22:17
   * @Description:
   */
  @Component
  @Aspect
  public class PointAspect {

  }
  ```
2. 一些注解@Before、@After、@Around **@Before** 就相当于在这个切入的方法之前做什么,**Spring的AOP本质就是动态代理**,所以我们可以使用JDK代理和CGLIB代理 下面这个配置表示强制使用cglib代理;原本spring是如果是实现的接口则使用jdk代理,否则就使用cglib代理
  ```xml

  ``` 然后我们在类中加点方法进去并为这个类加上@Before的注解
  ```java
     @Before("execution(* com.skyme.service..*.*(..))")
      public void before(JoinPoint joinPoint) {
          System.out.println("AOP执行");
          System.out.println("目标对象"+joinPoint.getTarget());//目标对象
          System.out.println("代理对象"+joinPoint.getThis());//代理对象
          System.out.println(AopUtils.isCglibProxy(joinPoint.getTarget()));
          System.out.println(AopUtils.isCglibProxy(joinPoint.getThis()));
      }
  ```
  ```text
  execution(* com.skyme.service..*.*(..))//切的规则,表示要切入的方法pointcut
  ``` 注:这里是切了所有service下的包和子包的方法 运行后的效果![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230930200407641.png)明显可以看到在执行login方法之前就执行了 **@AfterReturning** 表示目标方法完成后执行的通知。 **@AfterThrowing** 在方法抛出异常的时候执行,而不会在方法正常的时候返回 **@After** 无论方法失败还是成功都会执行 **@Around** 环绕通知就是在目标方法之前和之后执行，可以控制目标方法的执行
  ```java
  import org.aspectj.lang.ProceedingJoinPoint;
  import org.aspectj.lang.annotation.Around;
  import org.aspectj.lang.annotation.Aspect;
  import org.springframework.stereotype.Component;
  @Aspect
  @Component
  public class MyAspect {

      @Around("execution(* com.example.service.*.*(..))")
      public Object aroundAdvice(ProceedingJoinPoint joinPoint) throws Throwable {
          Object result = null;
          try {
              // 在目标方法执行前执行逻辑
              System.out.println("Before method execution");

              // 执行目标方法
              result = joinPoint.proceed();

              // 在目标方法成功返回后执行逻辑
              System.out.println("After method execution");
          } catch (Throwable e) {
              // 在目标方法抛出异常时执行逻辑
              System.out.println("Exception thrown: " + e.getMessage());
              throw e; // 可选择重新抛出异常或处理异常
          } finally {
              // 在无论目标方法成功或失败都执行逻辑
              System.out.println("Finally block");
          }

          return result;
      }
  }
  ```
3. 切入点语法pointcut
  ```java
  匹配方法：

  execution(modifiers-pattern? return-type-pattern declaring-type-pattern? method-name-pattern(param-pattern) throws-pattern?)

  示例：

  execution(* com.example.service.*.*(..)): 匹配com.example.service包中的所有方法。
  execution(public void com.example.service.UserService.*(..)): 匹配com.example.service.UserService类中的所有public void方法。
  execution(* com.example.service.*.get*(..)): 匹配com.example.service包中所有以"get"开头的方法。
  execution(* com.example.service.*.*(java.lang.String, ..)): 匹配com.example.service包中的所有方法，第一个参数是String类型的。
  匹配类：

  within(type-pattern)

  示例：

  within(com.example.service.*): 匹配com.example.service包中的所有方法。
  匹配注解：

  @annotation(annotation-type)

  示例：

  @annotation(org.springframework.transaction.annotation.Transactional): 匹配带有@Transactional注解的方法。
  匹配Bean名称：

  bean(bean-name-pattern)

  示例：

  bean(userService): 匹配名为 "userService" 的Bean上的所有方法。
  逻辑运算符：

  &&: 逻辑与

  ||: 逻辑或

  !: 逻辑非

  示例：

  execution(* com.example.service.*.*(..)) && !execution(* com.example.service.UserService.get*(..)): 匹配com.example.service包中的所有方法，但排除com.example.service.UserService类中以"get"开头的方法
  ```

### Xml实现

//todo

### 名词解释

```text
pointcut 切入点 切入的方法
aspect 切面 一个AOP类
advice 通知 切面的具体实现 对应的就是切面类中的方法
joinpoint 连接点 程序运行中可以插入切面的地方,在spring中只能是方法 比如login方法
target 目标对象 切入的对象 这个对象包含了业务代码的具体实现,比如UserServiceImpl类的对象
proxy 代理对象 目标对象应用了通知以后得创建一个新的对象,这个对象包含了原本的业务实现和扩展实现
weaving 织入 将通知应用到目标对象后创建代理对象的过程
```

## Spring整合Mybatis

//todo

### 事务的传播机制

@Transactional(propagation=Propagation.REQUIRED)

- 主要是业务层方法互相调用的时候事务的影响

就是一个业务里面去调别的方法,如果别的方法也有事务那如何处理？

```text
默认值:REQUIRED(0) 如果之前有事务,就直接使用已经开启的事务,没有就开一个
SUPPORTS(1) 如果其他方法调用这 个方法的时候,其他的方法有事务就使用事务,如果没有就不开启事务
MANDATORY(2) 必须在一个已有的事务中运行,否则会报错
REQUIRES_NEW(3) 不管之前是否开启了事务,都会开启一个新的事务,原本的事务挂起,直到这个方法执行完毕,原本的事务继续执行
NOT_SUPPORTED(4) spring不会为他开启事务 相当于没有事务
NEVER(5) 必须在一个没有事务的情况下运行,否则会报错
NESTED(6) 如果当前存在事务,则开启嵌套事务,在前面的事务内部运行,如果当前没有事务则和REQUIRE一样
```

注意:

REQUIRED a调用b，如果两个方法都是REQUIRED一旦发生回滚,两个方法都会回滚

REQUIRES_NEW a调用b 如果b是REQUIRES_NEW 单独提交,ab互不影响

NESTED(嵌套了嘛) a调用b 如果a是REQUIRED b是NESTED b回滚 a不受影响,但是a回滚b也会回滚

注解里面还有transactionManager也就是事务的管理器；isolation表示事务的隔离级别（default(-1)数据库隔离级别是什么就是什么,其余就是经典四个了);timeout超时时间,事务执行的最长时间;readOnly是否为只读事务；rollbackFor 遇到哪些异常会回滚,默认运行时异常都会回滚;noRollbackFor 遇到哪些异常不回滚

### 事务通过xml实现

//todo

## tkMapper

第三方插件

//todo
