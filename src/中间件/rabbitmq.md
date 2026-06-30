---
title: "RabbitMQ"
icon: "Java"
date: 2023-10-10
category:
  - "中间件"
tag:
  - "RabbitMQ"
  - "Java"
description: "同步调用 异步调用 优势: 解除耦合,拓展性强 无需等待，性能好 故障隔离 缓存消息,流量削封填故 缺点 时效性低,拿不到结果 不确定执行是否成功 业务安全依靠Broker"
---
## 同步调用

## 异步调用

优势:

- 解除耦合,拓展性强
- 无需等待，性能好
- 故障隔离
- 缓存消息,流量削封填故 ![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697113469379-0c7ff936-ecc6-4b33-b762-eb42be45962c.png)

缺点

- 时效性低,拿不到结果
- 不确定执行是否成功
- 业务安全依靠Broker

## 技术选型

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697113469349-39487efd-6d6e-42b2-b0d9-c475a6a72c61.png)

## 认识和安装

### RBMQ整体架构概念：

- virtual-host:虚拟主机,起到数据隔离的作用
- publiser:消息发送者
- consumer:消息的消费者
- queue:队列,存储消息
- exchange:交换机,负责路由消息

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697113469466-edb5a315-3d19-4b9b-beb8-abaffb2b5161.png)

## 快速入门

建队列,交换机绑定队列,然后路由发送到队列(队列都收到了)

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697294649765-3017567d-b976-4dbf-89d1-190bb2ad84e4.png)

## 数据隔离

## AMQP

翻译过来就是高级消息队列协议

Spring AMQP

spring-rabbit是底层默认实现

## Work模型

- 多个消费者绑定到一个队列,可以加快消息处理的速度
- 同一条消息只会被一个消费者处理
- 通过设置prefetch来控制消费者预取的消息数量,处理完一条再处理吓一跳,实现能者多劳

## Fanout交换机

真实生产环境都会警告exchange来发送消息,而不是直接发送到队列,交换机的类型有三种

- Fanout:广播
- Direct:定向
- Topic:话题

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697119963073-59b92807-84f7-4356-b895-101f040577f8.png)

Fanout Exchange会将接收到的消息广播到每一个跟其绑定的Queue，所以叫广播模式

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697120012272-be575474-866b-4db4-85bb-cea4b685498a.png)

## Direct交换机

- 每一个Queue都与Exchange设置一个BindingKey
- 发布者发送消息时,指定消息的RoutingKey
- Exchange将消息路由到BindingKey与消息RoutingKey一致的队列

## Topic交换机

TopicExchange与DirectExchange类似,区别在于routingKey可以是多个单词的列表,并且以**.**分割

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697121868499-4c563246-1b4e-4505-9836-4a4665b558fe.png)

## 生产者重连

## 生产者确认

## 数据持久化

一般就是消息的持久化

## Lazy Queue

惰性队列

- 接收到消息后直接存入磁盘而非内存(内存中只保留最近的消息,默认2048条)
- 消费者要消费消息才会从磁盘中读取并加载到内存
- 支持数百万条的存储
- 在3.12版本后,所有队列都是lazy queue模式,无法更改

## 消费者确认机制

- ack:成功处理消息,RabbitMQ从队列中删除该消息
- nack:消息处理失败，RabbitMQ需要再次投递消息
- reject:消息处理失败并拒绝该消息,RabbitMQ从队列中删除该消息

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697270260339-3c3ca8c8-0a46-47ec-8f62-37382f016bda.png)

## 消费者失败处理

开启重试模式后,重试次数耗尽,如果消息依然失败,需要有MessageRecover接口来处理,包含三种不同的实现:

- RejectAndDontRequeueRecover：重试耗尽后,直接reject,丢弃消息。默认这种方式
- ImmediateRequeueMessageRecoverer:重试耗尽后,返回nack,消息重新入队
- RepublishMessageRecoverer:重试耗尽后,将失败消息投递到指定交换机

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697269720637-b4c67ba4-aa84-4875-b584-82d4cef38216.png)

## 业务幂等性

![](https://cdn.nlark.com/yuque/0/2023/png/22577838/1697270381592-d0412177-878f-47aa-85d8-6eebba18af8a.png)

**面试也会经常问到,如何保持业务幂等性。**

第一种是加上唯一ID

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697271043240-eb643a6c-6691-4276-ac06-f76451d72256.png)

如何保证支付服务与交易服务之间的订单状态一致性

![](https://cdn.nlark.com/yuque/0/2023/png/22577838/1697271512679-6999cf0b-11e6-4f4a-a184-8086f1789102.png)

如果交易服务消息处理失败,有没有什么失败兜底方案

![](https://cdn.nlark.com/yuque/0/2023/png/22577838/1697271589387-20685ec7-8a2e-48b9-a167-ef7e01a61ff3.png)

## 延时消息

延时消息：生产者发送消息指定一个时间,消费者不会立刻收到消息,而是在指定时间后才收到消息

延时任务:设置一定时间之后才执行的任务

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697283208880-6e05a6ec-2ce4-44bb-bb4d-91fab1e9ca19.png)

## 死信交换机

![](https://cdn.nlark.com/yuque/0/2023/png/22577838/1697283347376-65d78979-905e-4753-8ce1-beaf90cb25a9.png)

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/1697284948316-0a004e87-eb17-44ac-8866-8a092fdd27c3.png)
