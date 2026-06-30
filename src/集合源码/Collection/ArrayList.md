---
title: "ArrayList源码解析"
icon: "edit"
date: 2023-07-20
category:
  - "Java"
tag:
  - "源码"
  - "Java"
  - "集合"
  - "ArrayList"
description: "ArrayList 首先要知道ArrayList的类关系 可以看到ArrayList是继承自AbstractList，而AbstractList实现了List,List实现自Collection"
---
# ArrayList

---

- 首先要知道ArrayList的类关系

![](https://skyme-1307417630.cos.ap-chengdu.myqcloud.com/skyme/728328-20190423154902120-976780151.png)

可以看到ArrayList是继承自AbstractList，而AbstractList实现了List,List实现自Collection

常用的方法有:add,addAll,remove,set,clear,size等等

成员变量:

```java
  private static final long serialVersionUID = 8683452581122892189L;

    /**
     * Default initial capacity.
     */
    private static final int DEFAULT_CAPACITY = 10;

    /**
     * Shared empty array instance used for empty instances.
     */
    private static final Object[] EMPTY_ELEMENTDATA = {};

    /**
     * Shared empty array instance used for default sized empty instances. We
     * distinguish this from EMPTY_ELEMENTDATA to know how much to inflate when
     * first element is added.
     */
    private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};

    /**
     * The array buffer into which the elements of the ArrayList are stored.
     * The capacity of the ArrayList is the length of this array buffer. Any
     * empty ArrayList with elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA
     * will be expanded to DEFAULT_CAPACITY when the first element is added.
     */
    transient Object[] elementData; // non-private to simplify nested class access

    /**
     * The size of the ArrayList (the number of elements it contains).
     *
     * @serial
     */
    private int size;
```

上述成员变量当中主要的变量就elemnetData以及size，可以看到elementData是一个transient关键字(意味着不会持久化的一个变量)

## 构造函数

```java
public ArrayList(int initialCapacity) {
        if (initialCapacity > 0) {
            this.elementData = new Object[initialCapacity];
        } else if (initialCapacity == 0) {
            this.elementData = EMPTY_ELEMENTDATA;
        } else {
            throw new IllegalArgumentException("Illegal Capacity: "+
                                               initialCapacity);
        }
    }

    /**
     * Constructs an empty list with an initial capacity of ten.
     */
    public ArrayList() {
        this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA;
    }

    /**
     * Constructs a list containing the elements of the specified
     * collection, in the order they are returned by the collection's
     * iterator.
     *
     * @param c the collection whose elements are to be placed into this list
     * @throws NullPointerException if the specified collection is null
     */
    public ArrayList(Collection c) {
        Object[] a = c.toArray();
        if ((size = a.length) != 0) {
            if (c.getClass() == ArrayList.class) {
                elementData = a;
            } else {
                elementData = Arrays.copyOf(a, size, Object[].class);
            }
        } else {
            // replace with empty array.
            elementData = EMPTY_ELEMENTDATA;
        }
    }
```

构造函数有三种,两种有参，一种无参

### 无参构造

```java
   private static final int DEFAULT_CAPACITY = 10;
   private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};
/**
     * Constructs an empty list with an initial capacity of ten.
     */
    public ArrayList() {
        this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA;
    }
```

无参构造上的注释就告诉了我们，这个list的初始化容量就是10，我们看源码会发现，这个初始的成员变量引用的地址其实是一个Object空数组,这意味着其实就是空

### 有参构造:

```java
    /**
     * Constructs an empty list with the specified initial capacity.
     *
     * @param  initialCapacity  the initial capacity of the list
     * @throws IllegalArgumentException if the specified initial capacity
     *         is negative
     */
    public ArrayList(int initialCapacity) {
        if (initialCapacity > 0) {
            this.elementData = new Object[initialCapacity];
        } else if (initialCapacity == 0) {
            this.elementData = EMPTY_ELEMENTDATA;
        } else {
            throw new IllegalArgumentException("Illegal Capacity: "+
                                               initialCapacity);
        }
    }
```

第一种有参构造,参数是一个int整数，可以看到如果这个参数大于0那么就会去赋予这个elementData一个长度固定的Object数组，0的话就给的是个Object数组为空的数组，其余就抛出IllegalArgumentException这个异常了

```java
    /**
     * Constructs a list containing the elements of the specified
     * collection, in the order they are returned by the collection's
     * iterator.
     *
     * @param c the collection whose elements are to be placed into this list
     * @throws NullPointerException if the specified collection is null
     */
    public ArrayList(Collection c) {
        elementData = c.toArray();
        if ((size = elementData.length) != 0) {
            // c.toArray might (incorrectly) not return Object[] (see 6260652)
            if (elementData.getClass() != Object[].class)
                elementData = Arrays.copyOf(elementData, size, Object[].class);
        } else {
            // replace with empty array.
            this.elementData = EMPTY_ELEMENTDATA;
        }
    }
```

这个就是参数变成了一个Collection的类而已,Collection的实现有很多，我们放入某种即可 比如就放ArrayList，根据源码我们可以发现它先调用了自身的toArray方法转成了一个Object数组,然后对长度进行匹配，如果长度合法，我们就通过反射判断是否这个c是不是ArrayList类,如果是我们直接赋给elementData，如果不是我们通过copyOf去做,为什么要去copyOf？因为如果c本身就是ArrayList，我们直接用elementData指向a,这样直接共享底层数组减少不必要的复制。

## 自动扩容

为什么要提到自动扩容，因为我们经常使用add方法去添加元素

当我做如下操作的时候

```java
 list.add("hello");
//就会进入下面这个方法
    public boolean add(E e) {
        ensureCapacityInternal(size + 1);  // Increments modCount!!
        elementData[size++] = e;
        return true;
    }
```

带着size+1参数值进入下面的函数

```java
private void ensureCapacityInternal(int minCapacity) {
        ensureExplicitCapacity(calculateCapacity(elementData, minCapacity));
    }
```

但是首先会进入这个函数

```java
  private static int calculateCapacity(Object[] elementData, int minCapacity) {
        if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
            return Math.max(DEFAULT_CAPACITY, minCapacity);
        }
        return minCapacity;
    }
```

这个函数当中我们返回值是int,在这里我们会去比较容量*DEFAULT_CAPACITY*=10和我们传入的参数值大小

然后返回其中的一个最大值,返回后进入下面这个函数

```java
    private void ensureExplicitCapacity(int minCapacity) {
        modCount++;

        // overflow-conscious code 溢出意识代码
        if (minCapacity - elementData.length > 0)
            grow(minCapacity);
    }
```

然后比较大小,如果大于0的话会进行扩容

```java
   private void grow(int minCapacity) {
        // overflow-conscious code 溢出意识代码
        int oldCapacity = elementData.length;
        int newCapacity = oldCapacity + (oldCapacity >> 1);
        if (newCapacity - minCapacity < 0)
            newCapacity = minCapacity;
        if (newCapacity - MAX_ARRAY_SIZE > 0)
            newCapacity = hugeCapacity(minCapacity);//不必纠结，只是在Integer.MAX_VALUE-8之间选择
        // minCapacity is usually close to size, so this is a win:
        elementData = Arrays.copyOf(elementData, newCapacity);
    }
```

```java
  int newCapacity = oldCapacity + (oldCapacity >> 1);
```

这个就是进行扩容了,右移一位那么就会除2所以每次扩容增加1.5倍,

```java
elementData = Arrays.copyOf(elementData, newCapacity);
```

这里copyOf之前的elementData,并赋予新的容量

## add(),addAll()

---

add(e)上面已经说完了，这里说一下add(index,e)

```java
public void add(int index, E element) {
        rangeCheckForAdd(index);

        ensureCapacityInternal(size + 1);  // Increments modCount!!
        System.arraycopy(elementData, index, elementData, index + 1,
                         size - index);
        elementData[index] = element;
        size++;
    }
```

rangeCheckForAdd是判断索引是否合法

mensureCapacityInternal(size + 1)进行扩容判断

```java
 System.arraycopy(elementData, index, elementData, index + 1,
                         size - index);
elementData[index] = element;
```

复制一定索引进行数组复制，然后再将element给到elementData[index]

---

```java
public boolean addAll(Collection c) {
        Object[] a = c.toArray();
        int numNew = a.length;
        ensureCapacityInternal(size + numNew);  // Increments modCount
        System.arraycopy(a, 0, elementData, size, numNew);
        size += numNew;
        return numNew != 0;
    }
```

```java
public boolean addAll(int index, Collection c) {
        rangeCheckForAdd(index);
        Object[] a = c.toArray();
        int numNew = a.length;
        ensureCapacityInternal(size + numNew);  // Increments modCount

        int numMoved = size - index;
        if (numMoved > 0)
            System.arraycopy(elementData, index, elementData, index + numNew,
                             numMoved);

        System.arraycopy(a, 0, elementData, index, numNew);
        size += numNew;
        return numNew != 0;
    }
```

其实主要就是arraycopy的使用个人认为，关键还是ensureCapacityInternal数组扩容

这里可以说下Arrays.copyOf不只是复制数组元素，还创建了一个新的数组对象。 System.arrayCopy只复制已有的数组元素。

## set()

既然底层是一个数组*ArrayList*的`set()`方法也就变得非常简单，直接对数组的指定位置赋值即可。

```java
public E set(int index, E element) {
    rangeCheck(index);//下标越界检查
    E oldValue = elementData(index);
    elementData[index] = element;//赋值到指定位置，复制的仅仅是引用
    return oldValue;
}
```

## get()

`get()`方法同样很简单，唯一要注意的是由于底层数组是Object[]，得到元素后需要进行类型转换。

```java
public E get(int index) {
    rangeCheck(index);
    return (E) elementData[index];//注意类型转换
}
```

## remove()

`remove()`方法也有两个版本，一个是`remove(int index)`删除指定位置的元素，另一个是`remove(Object o)`删除第一个满足`o.equals(elementData[index])`的元素。删除操作是`add()`操作的逆过程，需要将删除点之后的元素向前移动一个位置。需要注意的是为了让GC起作用，必须显式的为最后一个位置赋`null`值。

```java
public E remove(int index) {
    rangeCheck(index);
    modCount++;
    E oldValue = elementData(index);
    int numMoved = size - index - 1;
    if (numMoved > 0)
        System.arraycopy(elementData, index+1, elementData, index, numMoved);
    elementData[--size] = null; //清除该位置的引用，让GC起作用
    return oldValue;
}
```

关于Java GC这里需要特别说明一下，**有了垃圾收集器并不意味着一定不会有内存泄漏**。对象能否被GC的依据是是否还有引用指向它，上面代码中如果不手动赋`null`值，除非对应的位置被其他元素覆盖，否则原来的对象就一直不会被回收。

## trimToSize()

ArrayList还给我们提供了将底层数组的容量调整为当前列表保存的实际元素的大小的功能。它可以通过trimToSize方法来实现。代码如下:

```java
    /**
     * Trims the capacity of this ArrayList instance to be the
     * list's current size.  An application can use this operation to minimize
     * the storage of an ArrayList instance.
     */
    public void trimToSize() {
        modCount++;
        if (size < elementData.length) {
            elementData = (size == 0)
              ? EMPTY_ELEMENTDATA
              : Arrays.copyOf(elementData, size);
        }
    }
```

ArrayList 的内部使用数组存储元素，当数组将被存满，就会创建一个新数组，其容量是当前数组的 1.5 倍。

同时，所有元素都将移至新数组，假设内部数组已满，而我们现在又添加了 1 个元素，ArrayList 容量就会以相同的比例扩展（即前一个数组的1.5倍）。

在这种情况下，内部数组中将有一些未分配的空间。

这时，trimToSize() 方法可以删除未分配的空间并更改 ArrayList 的容量，使其等于 ArrayList 中的元素个数。

## indexOf(), lastIndexOf()

获取元素的第一次出现的index:

```java
/**
     * Returns the index of the first occurrence of the specified element
     * in this list, or -1 if this list does not contain the element.
     * More formally, returns the lowest index i such that
     * (o==null ? get(i)==null : o.equals(get(i))),
     * or -1 if there is no such index.
     */
    public int indexOf(Object o) {
        if (o == null) {
            for (int i = 0; i < size; i++)
                if (elementData[i]==null)
                    return i;
        } else {
            for (int i = 0; i < size; i++)
                if (o.equals(elementData[i]))
                    return i;
        }
        return -1;
    }
```

获取元素的最后一次出现的index:

```java
    /**
     * Returns the index of the last occurrence of the specified element
     * in this list, or -1 if this list does not contain the element.
     * More formally, returns the highest index i such that
     * (o==null ? get(i)==null : o.equals(get(i))),
     * or -1 if there is no such index.
     */
    public int lastIndexOf(Object o) {
        if (o == null) {
            for (int i = size-1; i >= 0; i--)
                if (elementData[i]==null)
                    return i;
        } else {
            for (int i = size-1; i >= 0; i--)
                if (o.equals(elementData[i]))
                    return i;
        }
        return -1;
    }
```

## fail-fast

Java中的快速失败（fail-fast）是一种迭代器（Iterator）和集合（Collection）在遇到并发修改时抛出异常的行为机制。它是为了帮助开发者在多线程环境下及时发现并发修改问题，防止出现不确定的行为或数据不一致的情况。

快速失败的机制是Java集合框架的一部分，它适用于实现了Iterable接口的集合类。当一个集合正在被迭代器遍历时，如果其他线程对该集合进行了结构上的修改（添加、删除等），那么迭代器会立即检测到这些修改，并抛出ConcurrentModificationException异常。

这种设计是基于“不要捕获不到的错误”（fail-fast）的思想，意味着当错误发生时，尽早暴露出来，让开发者知道问题所在，而不是在不确定的时间点或地点导致不稳定的行为。

快速失败机制并不保证在所有情况下都能捕获到并发修改的错误，特别是在多线程环境中，开发者仍需采取其他并发控制措施（例如使用同步机制）来确保数据一致性和线程安全性。
