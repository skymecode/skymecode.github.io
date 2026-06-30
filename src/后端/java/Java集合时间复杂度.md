---
title: "集合时间复杂度"
icon: "edit"
date: 2023-05-10
category:
  - "Java"
tag:
  - "Java"
star: true
description: "摘抄 原文链接：https://www.cnblogs.com/aspirant/p/8902285.html hashmap的扩容因子是0.75 原因 参考：HashMap默认加载因子为什么选择0.75？(阿里)"
---
## 摘抄

---

原文链接：[https://www.cnblogs.com/aspirant/p/8902285.html](https://www.cnblogs.com/aspirant/p/8902285.html)

---

hashmap的扩容因子是0.75 原因 参考：[HashMap默认加载因子为什么选择0.75？(阿里)](https://www.cnblogs.com/aspirant/p/11470928.html)

阿里的人问 数组的时间复杂度是多少，链表的是多少，hashmap的时间复杂度是多少。。。。。

后来才知道，时间复杂度是要区分 增删改查的。。。。主要看查询的时间复杂度；

1、数组 查询的时间复杂度 O(n)

2、链表 查询的时间复杂度 O(n)

3、hashmap 查询的时间复杂度 O(1)

数组 查询的时间复杂度 O(n)

建议看一下下面的博客：

hashSet,hashtable,hashMap 都是基于散列函数， 时间复杂度 O(1) 但是如果太差的话是O(n)

TreeSet==&gt;O(log(n))==&gt; 基于树的搜索，只需要搜索一半即可

O⑴的原因是离散后，下标对应关键字
hash就是散列，甚至再散列。但是我一直对hash表的时间复杂度有个疑问。一个需要存储的字符串，通过hash函数散列到一个相对较短的索引，使得存取速度加快。但为什么存取的时间复杂度能达到常量级O(1)呢？？ 查找时搜索索引不需要费时间吗？为什么不是O(n)呢？ n是hash表的长度,

如果对Hashtable的构造有很深的理解的话，就知道了，Hashtable 其实是综合了数组和链表的优点，当Hashtable对数值进行搜索的时候，首先用该数值与Hashtable的长度做了取模的操作，得到的数字直接作为hashtable中entry数组的index,因为hashtable是由entry数组组成的，因此，可以直接定位到指定的位置，不需要搜索，当然，这里还有个问题，每个entry其实是链表，如果entry有很多值的话，还是需要挨个遍历的，因此可以这样讲Hashtable的时间复杂度最好是O(1)但是最差是 O(n) 最差的时候也就是hashtable中所有的值的hash值都一样，都分配在一个entry里面，当然这个概率跟中1亿彩票的概率相差不大。

如果还不理解可以参考我写的专门的博客：

关于HashMap的：[HashMap的实现原理--链表散列](http://www.cnblogs.com/aspirant/p/8908399.html)

关于Hashtable的：[Hashtable数据存储结构-遍历规则，Hash类型的复杂度为啥都是O(1)-源码分析](http://www.cnblogs.com/aspirant/p/8906018.html)

在看起来就是对Entry链表的循环的时间复杂度影响最大，链表查找的时间复杂度为O(n)，与链表长度有关。我们要保证那个链表长度为1，才可以说时间复杂度能满足O(1)。但这么说来只有那个hash算法尽量减少冲突，才能使链表长度尽可能短，理想状态为1。因此可以得出结论：HashMap的查找时间复杂度只有在最理想的情况下才会为O(1)，最差是O(n),而要保证这个理想状态不是我们开发者控制的。

开始=================

常用数据结构的时间复杂度

### 常用数据结构的时间复杂度

---

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/blog/image-20230511162933294.png)
