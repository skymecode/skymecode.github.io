---
title: "Mybatis"
icon: "Java"
date: 2023-09-27
category:
  - "Java框架"
tag:
  - "Mybatis"
  - "Java"
description: "Mybatis是什么 Mybatis是一个基于JDBC，反射,代理等技术封装出来的一个持久层框架,主要用来操作数据库,并且是一个orm框架,实际也只是半个orm，真正的全ORM框架应该是hibernate这种框架,可以一句sql都不用换去写操作数据 ORM是什么? Object Relation Mapping 对象关系映射 对象就是Java的实体类, 关系就是关系型数据库 映射 就是将实体和数据库中的表进行映射起来 类和表进行映射 属性和字段进行映射 为什么选择Mybatis"
---
## Mybatis是什么

Mybatis是一个基于JDBC，反射,代理等技术封装出来的一个持久层框架,主要用来操作数据库,并且是一个orm框架,实际也只是半个orm，真正的全ORM框架应该是hibernate这种框架,可以一句sql都不用换去写操作数据

- ORM是什么? Object Relation Mapping 对象关系映射 对象就是Java的实体类, 关系就是关系型数据库 映射 就是将实体和数据库中的表进行映射起来 类和表进行映射 属性和字段进行映射

### 为什么选择Mybatis

在开发的时候如果直接使用jdbc去操作数据库,很繁琐并且代码重复。写项目需要考虑开发效率和运行效率。这两个效率是反比,在实际开发中需要去平衡选择两种效率,Mybatis是目前的比较一种平衡的实现。

## MyBatis实现CRUD

导入包

在maven项目里面的pom.xml下导入包

要使用mybatis肯定也要导入mysql的连接依赖

```xml

    4.0.0

    org.skyme
    mybatistest
    1.0-SNAPSHOT

        17
        17
        UTF-8

            org.mybatis
            mybatis
            3.5.6

            mysql
            mysql-connector-java
            8.0.32

            org.projectlombok
            lombok
            1.18.28

            junit
            junit
            4.13.2
            test

```

mybatis xml配置

&lt;environments&gt;就是环境

这里面可以放多个环境

&lt;transactionManager type="JDBC"/&gt;事务的类型

这个是数据源,显然根据我们的name就可以知道填写什么了,也可以配置连接池里面的一些数据,比如最大连接数这些。

```xml

```

下面是完整的配置的xml

```xml

```

那么我们怎么去写sql呢？像以前jdbc那样吗？当然不是,我们用了Mybatis就可以用xml单独的一个文件去写sql语句了

首先在resources加上这个

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230925165550408.png)

这里我写好了这些sql了,最原始的格式就是这样,见名知义

```xml

        select * from user where username=#{username}

        select * from user

        insert into user (username,password,salt,nickname,tel_phone,email,create_date,login_date,state)
        values (#{username},#{password},#{salt},#{nickname},#{tel_phone},#{email},#{create_date},#{login_date},#{state})

        update user set password=#{password},nickname=#{nickname},tel_phone=#{tel_phone},email=#{email},state=#{state} where uid=#{uid}

        delete from user wherr uid=#{uid}

```

我们怎么去执行这些sql呢？

在官方文档当中我们会发现SqlSessionFactory

所以我们使用Mybatis去执行sql那么必须拿到一个会话,怎么拿到会话？那就需要这个工厂去创建会话

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230925165911448.png)

然后下面是一些这些名称的解释

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230925170122030.png)

所以我们有了下面的代码:

```java
		//构建mybatis的环境
        InputStream resourceAsStream = getClass().getClassLoader().getResourceAsStream("config.xml");
        //构建会话工厂->数据源-程序和数据库的每一次操作可以成为一次会话
        SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(resourceAsStream);
        //得到会话,增删改不会自动提交事务,想要提交事务就得传true;
        sqlSession = sqlSessionFactory.openSession();
```

这里我使用了Java单元测试,方便使用

```java
@Test
    public void test(){
        //执行查询
      User user=  sqlSession.selectOne("org.skyme.entity.User.select","skyme");
        System.out.println(user);
    }
```

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230925170725579.png)

ok执行结果就是上面那个,第二个参数都好理解,第一个参数是啥？

(不会就去到处问问嘛doge)

```text
在 MyBatis 中，selectOne 方法的第一个参数是一个字符串，用于指定 SQL 查询语句的 ID。这个 ID 对应于映射文件中定义的一个 <select> 标签，其中的 id 属性值应该与第一个参数的值相同。
在这个例子中，第一个参数的值为 "org.skyme.entity.User.select"，它表示调用了映射文件中 org.skyme.entity.User 命名空间下的 select 标签对应的 SQL 查询语句。所以，这个方法的作用是执行 org.skyme.entity.User 命名空间下的 select 标签对应的 SQL 查询语句，并将查询结果封装成一个 User 对象返回。
```

但是我们这样用会发现一个问题,我们每次都要去写这个里面的参数,先不说容易出错,就是写都觉得恼火了(doge)，那么有没有别的办法呢？

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230925172645504.png)

上面官方给了个名词,其实我不是想说上面官方说的意思,实际我想表达的是刚刚我们所思考的问题

官方也给出了相应的解决:

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230925172835900.png)

也就是说现在我们可以在类里面写好方法,然后用方法去映射这些sql了,这样就更加方便我们去调用我们想调用的sql而且还可以保证不会写错

比如:

```java
package org.skyme.Mapper;
import org.skyme.entity.*;

import java.util.List;

public interface UserMapper {
    User select(String username);

    List selectAll();
}
```

```text
<mapper namespace="org.skyme.Mapper.UserMapper">
```

我们只需要将空间的命名改为UserMapper，也就是这个接口

然后

```java
@Test
public void test(){
        //执行查询
        UserMapper mapper = sqlSession.getMapper(UserMapper.class);
        List users = mapper.selectAll();
        System.out.println(users);
}
```

这样就方便许多了,我们就不写那个长长的参数了(xml命名空间里的sql标签)

```text
还有一些细节问题,sqlSession不会自动提交事务,我们要去手动提交,或者我们设置为自动提交,然后记得关闭这个会话!
```

## 通过注解来实现CRUD

既然用到框架了,那么怎么没有注解呢？

Mybatis当然也提供了注解给我们使用

```java
package org.skyme.Mapper;
import org.apache.ibatis.annotations.Select;
import org.skyme.entity.*;

import java.util.List;

public interface UserMapper {

    @Select("select * from user where username=#{username}")
    User select(String username);
    @Select("select * from user")
    List selectAll();
}
```

就像上面这样我们在之前不是通过UserMapper这个接口去映射xml文件嘛,现在我们只需要在方法上面注解就是了,甚至不用去写xml，但是不是很推荐这种方式

以下还有一些注解:

```text
@Insert
@Update
@Delete
@Result		该注解实现了结果集的封装
@Results	可以与@Result一起使用，封装多个结果集
@One		实现一对一的结果集封装
@Many		实现一对多的结果集封装
```

这里暂时不去深究下面几种注解

## 映射

### 一对一

再说说取别名

```xml

```

这里使用了

```xml

```

也就是将这个类取了个别名,但是这样一个个去取有点麻烦

```xml

```

这样去将整个包都取了别名,别名也就是类名了

然后我们在UserMapper.xml这个文件里面可以去写映射关系了！

```xml

```

比如这就是返回结果的映射

```text
id是主键
property是实体类的名称
column是数据库字段名称
如果我们查询出来的还有一对一关系这种,我们还可以使用下面这个
```

```xml

```

这个放在&lt;resultMap&gt;下面,意思就是如果一个用户有一个公司的字段ID,那么查询出来的结果肯定不止这个人吧，还有公司吧,上面我们就是关联出这个一对一的关系

还能够换一种方式

```xml

```

这里相当于多次调用了,但本质还是只执行了一个sql,相当于封装在里面了个sql和Company映射

就是说上面就是两种:一种是分开查,一种是连接查

一般数据多的时候我们就分开查,连接查适合数据量小的时候

### 一对多

一对多呢,就是一个公司可能有多个用户(比如一个人有多个评论)

所以

```xml

            这里面填写公司的映射

```

注意这里没有javaType了,但我们有了ofType也就是泛型，其实和一对一差不多，也有分开查和联查,实体类里面有了集合属性

分开查询的时候使用懒加载

首先要在配置文件里面配置懒加载参数

解释下lazyLoadingEnabled是启动懒加载

而aggressiveLazyLoading这个参数是按需加载(如果为false则不会执行子查询,当没有访问到子类的时候,反之,但必须开启懒加载)

```xml

```

## 分页

之前我们分页就是自己写sql语句或者自己建个分页类

比如分页的sql语句

```mysql
select * from 表 limit (currentPage-1)*pageSize,pageSize
```

然后如何找出总页数呢?

```mysql
select count(*) from 表
```

总共页数:向下取整

```text
int totalPageNum=(totalRecord + pageSize - 1) / pageSize
```

实际我们分页一般使用分页插件pagehelper

```xml

            com.github.pagehelper
            pagehelper
            5.3.2
```

插件配置

mybatis配置文件里面加入

```xml

```

这里我们可以开启分页查询,比较简单

```java
 UserMapper mapper = sqlSession.getMapper(UserMapper.class);
        PageHelper.startPage(1,2);
        List users = mapper.selectAll();
        System.out.println(users.size());
```

可以发现我们只需要PageHelper.startPage就可以了,所以我们写sql的时候不用分号结束

实现的原理:在同一个线程当中!(ThreadLocal)

```java
 PageHelper.startPage(1,2);//放入了一个分页对象放入了ThreadLocal中
//只要在一个线程中就可以获取到
```

然后呢PageHelper有个拦截器,这个拦截器当执行sql的时候,会去找有没有Page对象,然后有的话就会替换我们原有的sql语句,就是先去替换成cout算出总条数,然后再去做limit

还有呢就是PageInfo这个类,可以看到里面有分页查询的各个属性,比如总数,多少页这种

```java
PageInfo{pageNum=1, pageSize=2, size=2, startRow=1, endRow=2, total=7, pages=4, list=Page{count=true, pageNum=1, pageSize=2, startRow=0, endRow=2, total=7, pages=4, reasonable=true, pageSizeZero=false}[User(uid=1, username=skyme, password=965448824b5c434537aea7941b04d014, salt=965448824b5c434537aea7941b04d014, nickname=965448824b5c434537aea7941b04d014, telPhone=19140309154, email=46559677@qq.com, createDate=2023-09-19 17:46:41, loginDate=null, state=0), User(uid=2, username=xxg, password=dee49d2bcedb690a15ce142ec4bcd1bb, salt=dee49d2bcedb690a15ce142ec4bcd1bb, nickname=dee49d2bcedb690a15ce142ec4bcd1bb, telPhone=19140309154, email=46559677@qq.com, createDate=2023-09-19 17:46:44, loginDate=null, state=0)], prePage=0, nextPage=2, isFirstPage=true, isLastPage=false, hasPreviousPage=false, hasNextPage=true, navigatePages=8, navigateFirstPage=1, navigateLastPage=4, navigatepageNums=[1, 2, 3, 4]}
```

注意:startPage这个方法只会影响到开启过后的第一个查询语句

当sql分页查询出来的List对象（Page对象),是pageHelper重写的继承了ArrayList

```Java
   @Test
    public void test(){
        //执行查询
        UserMapper mapper = sqlSession.getMapper(UserMapper.class);
        PageHelper.startPage(1,2);
        List<User> users = mapper.selectAll();
        System.out.println(users.getClass().getSimpleName());
        List<User> list = mapper.selectAll();
        System.out.println(list.getClass().getSimpleName());
        PageInfo<User> pageInfo = new PageInfo<>(users);
        System.out.println(pageInfo);
    }
```

执行的结果:

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230925235855451.png)

确实只影响了第一个查询,并且可以证明Page继承了List

所以总的来说就是先startPage然后开启分页,将Page对象放入ThreadLocal当中,然后拦截器去拦截第一个sql，再去ThreadLocal里面获取Page对象,然后进行分页查询将信息放入Page对象里面,然后我们可以使用PageInfo获取Page对象的分页数据

## 动态Sql

为什么要使用动态sql,比如我们去购物网站按标签查询的时候,会发现有很多标签,也就是有很多条件,但是写sql不可能写这多么sql去组合这么多情况,所以正常实现应该是去传参,动态的拼接一个sql出来。

mybatis也提供了动态sql的功能

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/v2-ed74f3c2573456d04808233d1cf3f7fe_720w.webp)

### if

这里使用where 1=1就可以在后面都用and

```xml

 select

 from student
 where 1=1

 and name like concat('%', #{name}, '%')

 and sex=#{sex}

```

### Where

如果只有一个条件的时候且有and/or,那么使用了Where标签过后就会去除前面的and

```xml

 select

 from student

 and name like concat('%', #{name}, '%')

 and sex=#{sex}

```

为什么要使用包装类,因为使用基本类型有默认值,所以不好进行判断,如果包装类的话没有值就是Null

### choose when otherwise

就只会执行一个,如果所有的when都没有那么才会进入otherwise

```xml

 select

 from student
 where 1=1

 and student_id=#{studentId}

 and name=#{name}

 and 1=2

```

### set

主要用于update,用于确认修改的字段使用，可以自动去除最后面的逗号

```xml
update id="updateByPrimaryKeySelective" parameterType="com.homejim.mybatis.entity.Student">
 update student

 `name` = #{name,jdbcType=VARCHAR},

 phone = #{phone,jdbcType=VARCHAR},

 email = #{email,jdbcType=VARCHAR},

 sex = #{sex,jdbcType=TINYINT},

 locked = #{locked,jdbcType=TINYINT},

 gmt_created = #{gmtCreated,jdbcType=TIMESTAMP},

 gmt_modified = #{gmtModified,jdbcType=TIMESTAMP},

 where student_id = #{studentId,jdbcType=INTEGER}
```

### foreach

foreach 标签可以对数组， Map 或实现 Iterable 接口。

foreach 中有以下几个属性：

- collection: 必填， 集合/数组/Map的名称.
- item: 变量名。 即从迭代的对象中取出的每一个值
- index: 索引的属性名。 当迭代的对象为 Map 时， 该值为 Map 中的 Key.
- open: 循环开头的字符串
- close: 循环结束的字符串
- separator: 每次循环的分隔符

推荐使用@Parm指定参数

```xml

 select

 from student
 where student_id in

 #{id}

```

批量插入

```xml

 insert into student(name, phone, email, sex, locked)
 values

 (
 #{student.name}, #{student.phone},#{student.email},
 #{student.sex},#{student.locked}
 )

```

### trim

就是可以自己的前缀和后缀,有点自定义标签

### selectKey

使用 selectKey 标签可以在执行插入操作后立即获取自增主键的值，而不需要再进行一次查询操作。selectKey 标签需要指定一个返回结果集的列名，MyBatis 将该列的值作为参数传递给 selectKey 标签

```xml

    INSERT INTO user(username, password) VALUES (#{username}, #{password})

        SELECT LAST_INSERT_ID()

```

### ${}和#{}的区别:

1. #{}：表示预编译的参数占位符，MyBatis 会将传入的参数值通过 JDBC PreparedStatement 进行预编译，并将结果作为参数传递给 SQL 语句。使用 #{} 可以避免 SQL 注入攻击，提高程序的安全性。
2. ${}：表示直接的字符串替换，MyBatis 会在运行时将传入的参数值直接替换到 SQL 语句中。使用 ${} 可能会导致 SQL 注入攻击，因为攻击者可以通过传入恶意参数来修改 SQL 语句的行为。

因此，建议在使用动态 SQL 时尽可能使用 #{} 表达式，以提高程序的安全性。如果必须使用 ${}，则应该对传入的参数进行严格的验证和过滤，避免 SQL 注入攻击的发生。

## 缓存

作为一个持久层框架,当然要考虑缓存的问题，使用了缓存就可以有效的减少数据库的查询次数，降低数据库压力

mybatis缓存主要分为:一级缓存和二级缓存

### 一级缓存

![](https://codingsir.oss-cn-hangzhou.aliyuncs.com/202302221427633.png)

```text
一级缓存的数据存储在SqlSession对象里面

缓存的数据存储正在SqlSession对象中(类似Map集合,键对应的sql语句,值就是语句对应的结果)
```

一级缓存如何保证数据一致性的:

```text
当执行查询语句时,自动走缓存,缓存中如果有数据返回,缓存没有就查询数据库,更新缓存

当执行非查询语句(新增,修改，删除)就会自动删除缓存
```

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230926193924200.png)

先安装好日志框架后才可以看到执行的sql(debug级别的)

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230926194546420.png)

可以发现查询两次结果只执行了一次sql,因为我们Mybatis为我们做好了一级缓存，将上次存储的结果放入了sqlSession当中,所以当我们执行相同的sql返回的结果时候,就直接去sqlSession里面找有没有一样的缓存

- MyBatis 的缓存本质上是一个 HashMap，它的键是查询语句和参数的组合，值是查询结果。当我们执行一个查询时，MyBatis 会先从缓存中查找对应的查询结果，如果缓存中存在，则直接返回缓存的结果；如果缓存中不存在，则从数据库中查询数据，并将查询结果存入缓存中。

只有将事务提交的时候,才会放入缓存

### 二级缓存

默认缓存会有如下的一些效果

```text
映射文件所有的select语句都会缓存
映射文件中的所有insert,delete,update语句都会刷新缓存
```

二级缓存默认关闭的,二级缓存时基于namespace的缓存,一个namespace对应一个缓存

在配置文件中

```xml

```

然后再在mapper的文件当中

```xml

```

上面表示缓存只读,每50秒刷新一次可以存储10000个引用,回收算法为LRU

#### 二级缓存整合ehcache

Ehcache是一种广泛使用的开源Java分布式缓存,主要面向通用缓存,JavaEE和轻量级容器。它具有内存和磁盘存储,缓存加速器,缓存扩展,缓存异常处理程序,一个gzip缓存servlet过滤器,支持REST和SOAP api等特点。

添加ehcache依赖

加入ehcache.xml配置文件

```xml

```

然后再在UserMapper.xml下加入

```xml

```

#### 二级缓存整合redis

在resources加入redis配置文件

```text
host=localhost
port=6379
password=w5103265
database=0
```

在map.xml里面加入

```xml

```

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/image-20230928150956843.png)

当我们执行查询的时候,会发现已经存入了

什么时候用二级缓存？

应该在查询频率比较高的,并且绝大多数都是单表操作,多表会出现脏数据

一级缓存来说对于有多个 SqlSession 或者分布式的环境下，数据库写操作会引起脏数据以及对于增删改多的操作来说，清除一级缓存会很频繁，这会导致一级缓存形同虚设。

二级缓存来说实现了 SqlSession 之间缓存数据的共享，除了跟一级缓存一样对于增删改多的操作来说，清除二级缓存会很频繁，这会导致二级缓存形同虚设；MyBatis 的二级缓存不适应用于映射文件中存在多表查询的情况，由于 MyBatis 的二级缓存是基于 namespace 的，多表查询语句所在的 namspace 无法感应到其他 namespace 中的语句对多表查询中涉及的表进行的修改，引发脏数据问题。虽然可以通过 Cache ref 来解决多表的问题，但这样做的后果是，缓存的粒度变粗了，多个 Mapper namespace 下的所有操作都会对缓存使用造成影响。

## 事务的并发

- 需要去了解各种锁(专门写了一篇)
- 了解事物(专门写了一篇)

### 悲观锁

认为每一次操作数据库都会发生问题,那就每一次操作数据库的时候就会先进行加锁，这样的话事务操作的时候针对数据进行加锁,其他事务就无法操作这些数据

```text
select * from user for update
```

### 乐观锁

乐观锁认为每一次操作数据都不会发生问题

在设计表的时候会添加一个字段叫version,事务开启的时候,会先去查一次version，记录下来,接下来再进行数据库操作,在操作完成后,再次查询version，比较两个version是否一致,如果一致的话就更改version提交事务,如果不一致就说明这次事务发生了问题,不能正常提交了
