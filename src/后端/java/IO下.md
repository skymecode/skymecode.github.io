---
title: "IO流(下)"
icon: "edit"
date: 2023-05-20
category:
  - "Java"
tag:
  - "Java"
star: true
description: "缓冲流 数据读取 对于字节和字符的读写，效率较低 所以我们要引入缓冲流 在管道的两端加入缓冲区，节点流外面的装饰，加入了缓冲区，可以直接从缓冲区读写数据，提高读写性能 字节缓冲流 BufferedInputStream 字节缓冲输入流 BufferedOutputStream 字节缓冲输出流 自定义数组的读写操作(8KB)，与用读写缓冲流相比，哪个性能更高？ 定义数组会性能更好，因为读写操作，操作的是一个数组 缓冲流是两个数组"
---
## 缓冲流

### 数据读取

对于字节和字符的读写，效率较低

所以我们要引入缓冲流

在管道的两端加入缓冲区，节点流外面的装饰，加入了缓冲区，可以直接从缓冲区读写数据，提高读写性能

### 字节缓冲流

#### BufferedInputStream

- 字节缓冲输入流

#### BufferedOutputStream

- 字节缓冲输出流
- 自定义数组的读写操作(8KB)，与用读写缓冲流相比，哪个性能更高？
- 定义数组会性能更好，因为读写操作，操作的是一个数组
- 缓冲流是两个数组

### LineNumberReader

- BufferedReader的子类，统计行号的功能

### 案例(读写排序）

```Java
public class test2 {
    public static void main(String[] args) throws IOException {
        //读取数据
        File file=new File("test.txt");
        System.out.println(file.getAbsoluteFile());
        FileReader fileReader=new FileReader("test.txt");
        BufferedReader br=new BufferedReader(fileReader);
        List<String> list=new ArrayList<>();
        String line;
        while ((line=br.readLine())!=null){
            list.add(line);
        }
        Collections.sort(list, new Comparator<String>() {
            @Override
            public int compare(String o1, String o2) {
                return (int)o2.substring(0,1).toCharArray()[0]-(int)o1.substring(0,1).toCharArray()[0];
            }
        });
        BufferedWriter bw=new BufferedWriter(new FileWriter("test1.txt"));
        for (String s : list) {
            bw.write(s);
        }
        bw.flush();
        bw.close();

    }
}
```

### 字符输入转换流InputStreamReader

解决乱码问题，指定的字符编码

### 字符输出转换流OutputStreamWriter

### 打印流

#### PrintWriter

#### PrintStream

### 随机访问流

RandomAccessFile

- IO体系中功能最丰富的文件内容访问类，既可以读取，又可以写入
- 直接跳到文件的任意位置来读取和写入，文件指针

| 构造方法 | 方法说明 |
| --- | --- |
|  | 文件路径，文件的访问模式 |
|  | 文件路径，文件的访问模式 |

- 访问模式

| 访问模式 | 说明 |
| --- | --- |
| r | 只读 |
| rw | 读写，默认模式，使用buffer |
| rws | 读写，对文件内容和元数据的每个更新都同步写入底层设备 |
| rwd | 读写，要求对文件内容每个更新都同步写入到底层设备 |

- 特殊方法

| 方法名 | 方法说明 |
| --- | --- |
| long getFilePointer() | 返回文件指针位置 |
| void seek(long pos) | 将文件指针移动到指定的pos |

### 数据流

#### DataInputStream

#### DataOutputStream

## 对象序列化

### 什么是对象序列化

- 把内存中的对象存储到磁盘文件中--对象序列化--ObjectOutputStream
- 把磁盘空间中的数据恢复成内存的对象--对象反序列化--ObjectInputStream

### 应用场景

- 项目中在内存中会保存对象，内存中的数据不能保存，把对象序列化之后，让系统重启也能恢复原本的状态

### 对象序列化和反序列化

#### 序列化

- 对象字节输出流:ObjectOutputStream
- 对象必须实现序列化接口

|  |  |
| --- | --- |
| Public ObjectOutputStream(OutputStream out) | 把原始字节输出流包装成高级对象字节流出流 |
| Public final void writeObject(Object obj) | 把对象写出去到关联的文件中 |

#### 反序列化

- 对象字节输入流 ObjectInputStream

|  |  |
| --- | --- |
| Public ObjectInputStream(InputStream out) | 把原始字节输入流包装成高级对象字节流入流 |
| Public final void readObject(Object obj) | 从文件中恢复到内存 |

### 序列化中的细节问题

- 序列化ID:当前类的版本,决对反序列化是否能成功,通过ID来验证类是否一致

```Plain
如果没有显示的写出序列化id,jvm匹配类信息来确定序列化版本是否一致
```

- transient关键字

```Plain
序列化的时候不考虑瞬时态的存储
```

- static静态属性

```Plain
属于类的信息，不属于对象，在做对象序列化的时候也不考虑
```

### 控制序列化

- extermainlizable:实现序列化接口的，提供了两个方法
    - readExternal:读的时候忽略哪些属性
    - writeExternal:写的时候控制
