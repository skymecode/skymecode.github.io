---
title: "OpenAi API Demo"
icon: "edit"
date: 2023-05-31
category:
  - "Java"
tag:
  - "Java"
star: true
description: "OpenAi API Demo 首先联想到forest框架可以进行请求 官方文档 image-20230531204212355 实现forest请求接口"
---
## OpenAi API Demo

首先联想到forest框架可以进行请求

### 官方文档

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/blog/image-20230531204212355.png)

### 实现forest请求接口

这是请求的接口

```java

import com.cdutseller.type.GPT.GptResponse;
import com.dtflys.forest.annotation.HTTPProxy;
import com.dtflys.forest.annotation.Post;
import com.dtflys.forest.annotation.Var;

public interface ChatGpt {

    @Post(
            url = "https://api.openai.com/v1/engines/${model}/completions",
            contentType = "application/json",
            headers = "Authorization: Bearer ${apiKey}",
            data = "{\"prompt\": \"${prompt}\", \"max_tokens\": ${maxTokens}, \"temperature\": ${temperature}}"
    )
    @HTTPProxy(host = "127.0.0.1", port = "8089")//代理不然连不上openai
    GptResponse send(@Var("prompt") String prompt);

}
```

### 结果

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/blog/image-20230531202406999.png)

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/blog/image-20230531204304434.png)
