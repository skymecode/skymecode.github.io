---
title: "JavaSet相关"
icon: "edit"
date: 2023-05-10
category:
  - "Java"
tag:
  - "Java"
star: true
description: "HashSet HashSet的底层是HashMap Hash表实现： JDK8之前底层实现是数组+链表的结构 JDK8之和底层实现是数组+链表+红黑树的结构 hash值 在Object类中,hashCode()方法实现了获取对象的hash值 JDK根据对象地址，按照某种规则算出来的int类型的数值 HashSet实现原理(JDK8以及之后) 1. 创建一个长度为16的数组 1. 数组默认都是null,获取元素的hash值，根据一定的算法求出对应数组索引位置 1. 如果当前数组位置已经存在元素，则开始进行equals进行hash值比较,如果相同则不放人，如果不同则挂载在当前数组索引下实现一个链表结构 1. 当链表长度超过8则转换为红黑树 1. ![image-20230511152235715](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/blog/image-20230511152235715.png)"
---
## HashSet

---

HashSet的底层是HashMap

Hash表实现：

JDK8之前底层实现是数组+链表的结构

JDK8之和底层实现是数组+链表+红黑树的结构

### hash值

---

- 在Object类中,hashCode()方法实现了获取对象的hash值
- JDK根据对象地址，按照某种规则算出来的int类型的数值

### HashSet实现原理(JDK8以及之后)

---

```
1. 创建一个长度为16的数组
1. 数组默认都是null,获取元素的hash值，根据一定的算法求出对应数组索引位置
1. 如果当前数组位置已经存在元素，则开始进行equals进行hash值比较,如果相同则不放人，如果不同则挂载在当前数组索引下实现一个链表结构
1. 当链表长度超过8则转换为红黑树
1. ![image-20230511152235715](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/blog/image-20230511152235715.png)
```

```text
如果hashcode相同，equals一定为true吗，如果equlas相同,hashcode一定为true吗
答：1.不一定;2.一定
```

hashcode是一种参考，而equals才是真正的比较,一般重写equals也要重写hashcode方法

案例:

```java
package 面向对象.集合.C类型;

import java.util.HashSet;
import java.util.Set;

public class test {
    public static void main(String[] args) {
       Set set=new HashSet<>();
       A a=new A();
       A b=new A();

       set.add(a);
       set.add(b);
        System.out.println(set.size());

    }
}
class A{
    @Override
    public int hashCode() {
        System.out.println("hashCode");
        return 123456;
    }
    @Override
    public boolean equals(Object obj) {
        System.out.println("equals");
        return true;
    }
}
```

案例：

我们要求学生的名字和ID一样就是相同的人，我们要去重就得重写hashcode和equals

```java
package 面向对象.集合.C类型;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class test {
    public static void main(String[] args) {
       Set set=new HashSet<>();
       Student a=new Student("张三","123");
       Student b=new Student("李四","125");
       set.add(a);
       set.add(b);
       Student c=new Student("张三","123");
       set.add(c);
        System.out.println(set.size());

    }
}
class Student{
    public Student() {
    }

    public Student(String name, String id) {
        this.name = name;
        this.id = id;
    }

    private  String name;
    private String id;

    public String getName() {
        return name;
    }

    public String getId() {
        return id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setId(String id) {
        this.id = id;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Student student = (Student) o;
        return Objects.equals(name, student.name) && Objects.equals(id, student.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, id);
    }
}
```

## LinkedHashSet

---

- 放入的顺序和输出的顺序一致

## TreeSet

---

- 可排序，无重复

默认排序：按数值大小，按字母首字符大小

自定义排序：没有自定义对象提供比较方式会报错，两种实现方法:Comparable接口和Comparator接口

- Comparable接口：实现在要比较的类中，定义该类的比较方法
- Comparator接口：自定义一个比较器,用于TreeSet
