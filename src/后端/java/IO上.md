---
title: "IO流(上)"
icon: "edit"
date: 2023-05-19
category:
  - "Java"
tag:
  - "Java"
star: true
description: "File类的使用 程序端和文件端的输入和输出 File类的概念 File类：代表操作系统的文件(具体的文件本身，文件目录)封装了文件相关的操作方法 File类的构造函数和对象创建 File类既是文件，又是目录 File类有三种常用的创建对象的方式 File.separator分隔符 相对路径和绝对路径的概念 File类的常见方法 setReadabble setWriteable Exists canRead canWrite getAbsolutePath getPath"
---
## File类的使用

- 程序端和文件端的输入和输出

### File类的概念

File类：代表操作系统的文件(具体的文件本身，文件目录)封装了文件相关的操作方法

### File类的构造函数和对象创建

File类既是文件，又是目录

File类有三种常用的创建对象的方式

File.separator分隔符

相对路径和绝对路径的概念

### File类的常见方法

```Java
setReadabble
setWriteable
Exists
canRead
canWrite
getAbsolutePath
getPath
```

删除文件夹的时候一定是空文件夹

### 文件遍历

- 得到的是一级文件,文件和文件目录
- 如果不是目录的时候或不存在的时候，得到的是null
- 隐藏文件夹也能返回
- 文件夹是空的,不返回null,返回长度为0的数组
- 没有访问权限,返回null

### 文件过滤

- 返回某个目录下的某个文件，希望返回的文件是特点的

FileNameFilter

### 装饰者模式

- 被装饰者和装饰者有相同的超类
- 装饰者有自己的一个超类
- 装饰者和被装饰者之间通过构造函数实现装配，装饰者在被装饰的行为之前或之后，加上自己的行为，实现装饰的效果

### 装饰者模式和IO的关系

### IO的体系

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/blog/image-20230519172431302.png)

- 针对文件操作的节点流--管道，以下四个类进行文件操作的时候，至少有一个用于建立管道
- 分别对不同的管道进行装饰
- ![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/blog/image-20230519172504089.png) image-20230519172504089

### 字节流和字符流

1. 建立管道,创立节点流对象，传入文件端地址
2. 装饰管道
3. 在管道中传输数据，管道的方法调用
4. 数据传输完成，关闭管道

#### FileInputStream

- 字节输入流：从文件端读取数据到程序

```Java
public class test1 {
    public static void main(String[] args) throws IOException {
        File file=new File("test1.txt");
        System.out.println(file.getAbsoluteFile());
        if(!file.exists()){
            boolean newFile = file.createNewFile();
            System.out.println(newFile);
        }
        FileInputStream fileInputStream=new FileInputStream(file);
        int len;
        while ((len=fileInputStream.read())!=-1){
            System.out.println(len);
        }
    }
}
```

#### FileOutputStream

字节输出流:从程序端将数据写到文件端

```Java
public class test1 {
    public static void main(String[] args) throws IOException {
        File file=new File("test1.txt");
        System.out.println(file.getAbsoluteFile());
        if(!file.exists()){
            boolean newFile = file.createNewFile();
            System.out.println(newFile);
        }
        FileInputStream fileInputStream=new FileInputStream(file);
        int len;
        while ((len=fileInputStream.read())!=-1){
            System.out.println(len);
        }
        //先建立管道
        FileOutputStream fos=new FileOutputStream("test.txt");
        byte[] b=new byte[10];
        byte start=97;
        for(int i=0;i<b.length;i++){
            b[i]=start;
            start++;
        }
        fos.write(b);
        fos.flush();
    }
}
```

#### FileReader

读取文本的时候，字节流会出现中文乱码，也可能内存溢出

文本是中文的时候，更适合字符流，以单个字符为单位读取

#### FileWrite

### 字节流和字符流区别

字节流适用于一切文件的读取

字符流适用于文本读写(中文)
