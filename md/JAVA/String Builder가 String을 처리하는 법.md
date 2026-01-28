---
created: 2025-01-21
modified: 2025-01-28
---

## String Interning
JVM이 같은 문자열을 string pool에 하나만 존재하도록 하여 메모리를 절약하는 방법이다.

JVM에서 String은 특별한 클래스로, 다른 클래스와 다르게 리터럴을 지원하고, 리터럴은 스트링 풀에 저장된다. JVM은 String에 값을 할당할 때 스트링 풀에서 일치하는 값을 찾고, 해당 값을 가리키는 주소를 준다. 스트링 풀에 존재하는 같은 내용의 문자열은 같은 주소값을 가지므로 리터럴을 사용해 할당한 같은 내용의 String 객체들에는 `.equals()`도, `==`도 `true`를 반환한다.

```java
String a = "hello";
String b = "hello";
boolean isSame = (a == b); // true
```

JAVA는 String 리터럴 `"abc"`를 스트링 풀에 저장하고, `String` 객체의 인스턴스를 초기화할 때 문자열 값을 String pool에 저장하고 `String`의 인스턴스는 String pool의 문자열 값의 주소를 가리키는 값을 가짐으로써 메모리를 절약한다.

> JVM은 Integer 인스턴스의 -128~127까지의 값을 미리 메모리에 캐시하고, `Integer a = 127;`로 접근하면 해당 인스턴스를 메모리에 새로 생성하지 않고 곧바로 가져온다는 점에서 비슷하게 느껴진다.

## `String`의 문자열 값이 저장되는 곳
> ❌ 항상 String pool에 저장되는 곳은 아니다.

`new`를 사용해 String 객체를 만드는 경우 JVM은 Java Heap에 데이터를 저장한다. 따라서, 최적화를 위해서는 (그리고 코드 가독성을 위해서도) 리터럴이 가능한 곳은 리터럴로 적어주는 것이 좋다.
```java
String a = "hello";
String b = "hello";
String c = new String("hello");
boolean isSameAb = (a == b); // true
boolean isSameAc = (a == c); // false
```
> Java의 String은 C++ 등과 달리 불변하므로 이미 존재하는 리터럴 문자열이 있다면 무조건 캐싱해서 가져다 사용하는 게 메모리와 성능 면에서 이득이다.

## Manual Interning
String Pool로부터 같은 값을 가지는 String 객체를 가져오는 방법도 존재한다. `.intern()`을 사용하면 된다. String Pool에 존재하지 않더라도 생성한다.
```java
String a = "hello";
String b = new String("hello");
String c = b.intern();
boolean isSameAb = (a == b); // false
boolean isSameAc = (a == c); // true
```

JAVA 7부터는 String Pool도 Heap에 존재하고, GC가 사용하지 않는 String 리터럴을 String Pool로부터 정리하므로 동일한 String이 많은 상태로 힙에 존재한다면 정리하는 것이 좋은 대안일 수 있다.

| 문자열 생성 방법 | 코드 | 저장되는 곳 |
| - | - | - |
| 리터럴 | `String s = "Hello"` | String pool |
| 런타임 생성 | `new String("Hello")`<br>`obj.toString()` | Java Heap |
| Manual Interning | `new String("Hello").intern()` | String pool |

## `StringBuilder`가 문자열을 처리하는 법
`StringBuilder`의 선언을 보면
```java
public final class StringBuilder
    extends AbstractStringBuilder
    implements Appendable, java.io.Serializable, Comparable<StringBuilder>, CharSequence
{
    ...
```
`AbstractStringBuilder`를 상속하는 것을 볼 수 있다.

`AbstractStringBuilder`를 보면
```java
abstract sealed class AbstractStringBuilder implements Appendable, CharSequence
    permits StringBuilder, StringBuffer {
    /**
     * The value is used for character storage.
     */
    byte[] value;
    ...
```
값을 `byte[] value`에 저장하고 있고 [(JEP 254)](https://openjdk.org/jeps/254), `Appendable`을 구현한 곳을 확인하면
```java
    /**
     * Appends the string representation of the {@code Object} argument.
     * <p>
     * The overall effect is exactly as if the argument were converted
     * to a string by the method {@link String#valueOf(Object)},
     * and the characters of that string were then
     * {@link #append(String) appended} to this character sequence.
     *
     * @param   obj   an {@code Object}.
     * @return  a reference to this object.
     */
    public AbstractStringBuilder append(Object obj) {
        return append(String.valueOf(obj));
    }

    /**
     * Appends the specified string to this character sequence.
     * <p>
     * The characters of the {@code String} argument are appended, in
     * order, increasing the length of this sequence by the length of the
     * argument. If {@code str} is {@code null}, then the four
     * characters {@code "null"} are appended.
     * <p>
     * Let <i>n</i> be the length of this character sequence just prior to
     * execution of the {@code append} method. Then the character at
     * index <i>k</i> in the new character sequence is equal to the character
     * at index <i>k</i> in the old character sequence, if <i>k</i> is less
     * than <i>n</i>; otherwise, it is equal to the character at index
     * <i>k-n</i> in the argument {@code str}.
     *
     * @param   str   a string.
     * @return  a reference to this object.
     */
    public AbstractStringBuilder append(String str) {
        if (str == null) {
            return appendNull();
        }
        byte coder = this.coder;
        int count = this.count;
        byte[] value = this.value;
        int len = str.length();
        byte newCoder = (byte)(coder | str.coder());
        if (needsNewBuffer(value, coder, count + len, newCoder)) {
            this.value = value = ensureCapacityNewCoder(value, coder, count, count + len, newCoder);
            this.coder = newCoder;
        }
        str.getBytes(value, count, newCoder);
        this.count = count + len;
        return this;
    }

    /**
     * Appends the specified {@code StringBuffer} to this sequence.
     *
     * @param   sb   the {@code StringBuffer} to append.
     * @return  a reference to this object.
     */
    public AbstractStringBuilder append(StringBuffer sb) {
        return this.append((AbstractStringBuilder)sb);
    }

    /**
     * @since 1.8
     */
    AbstractStringBuilder append(AbstractStringBuilder asb) {
        if (asb == null) {
            return appendNull();
        }
        int len = asb.length();
        byte coder = this.coder;
        int count = this.count;
        byte[] value = this.value;
        byte newCoder = (byte)(coder | asb.coder);
        if (needsNewBuffer(value, coder, count + len, newCoder)) {
            this.value = value = ensureCapacityNewCoder(value, coder, count, count + len, newCoder);
            this.coder = newCoder;
        }
        asb.getBytes(value, count, newCoder);
        this.count = count + len;
        maybeLatin1 |= asb.maybeLatin1;
        return this;
    }

    // Documentation in subclasses because of synchro difference
    @Override
    public AbstractStringBuilder append(CharSequence s) {
        if (s == null) {
            return appendNull();
        }
        if (s instanceof String str) {
            return this.append(str);
        }
        if (s instanceof AbstractStringBuilder asb) {
            return this.append(asb);
        }
        return this.append(s, 0, s.length());
    }
```
문자열을 합치는 `append()`가 `byte[] value`의 크기를 확인하고, 작은 경우 크기를 조절해가면서 문자열을 저장한다. 즉, `StringBuilder`는 mutable한 `byte` Array를 가지고 크기를 바꿔가면서 들고 있다가, `toString`에서 String으로 반환하게 된다.
```java
    @Override
    public String toString() {
        // Create a copy, don't share the array
        return new String(value, 0, count);
    }
```
String으로 만들게 되는 경우 해당 사이즈만큼을 String이 갖는 byte array가 힙에 하나 더 생기게 된다.

## `+`로 이어붙인 String은 어떻게 계산될까
1. 둘 다 리터럴인 경우
    - 컴파일 단계에서 하나의 문자열 리터럴로 처리되어 스트링 풀에 들어간다.
2. 내부적으로 `StringBuilder`를 사용한다. (~JAVA 8)
    - 따라서 String을 반환하는 함수에서 귀찮게 `new StringBuilder`를 하고, `append()`하면서 문자열을 만드는 것은 비효율적일 수 있다. 단, `for`문을 돌면서 문자열을 `+=`하는 경우에는 매번 immutable한 문자열이 힙에 생기기 때문에 느리고 비효율적이다.
3. 런타임에서 선택 (JAVA 9~): [JEP 280](https://openjdk.org/jeps/280)
    - 추가하는 문자열들을 스택에 쌓고, `invokedynamic`(바이트코드)를 통해 `StringConcatFactory`를 호출한다.
    - 컴파일러가 최적하는 것이 아닌 JVM에 최적화 방법을 맡긴다.
    - 여전히 루프 내부 `+=` 연산은 비효율적이다. `String`을 할당해 저장하는 것은 다름 없기 때문이다.

### `StringConcatFactory`
- JDK9~14까지는 여러 전략(`enum Strategy`)을 기반으로 `StringConcatFactory`가 결정했다.
- JDK15 이후는 default 전략인 `MH_INLINE_SIZED_EXACT` 기반으로 수행된다. [#](https://github.com/openjdk/jdk15/commit/36c4b11bc6cf5a008d5935934aa75f2d2bbe6a23#diff-1339c269a3729d849799d29a7431ccd508a034ced91c1796b952795396843891)

    > `MH_INLINE_SIZED_EXACT`: 필요한 용량을 계산하고, 버퍼를 한 번만 할당하고 복사하는 방식

- MH(메서드 핸들)을 사용하는 점이 가장 큰 차이점인데, 함수포인터들을 사용하여, 함수 포인터들을 런타임에서 조립하여 순서대로 실행한다. 생성된 함수포인터들을 하나씩 invoke하여 원하는 결과물을 만들어 낸다. (처음 실행할 때에는 인스턴스와 만드는 것과 비슷하지만, 두 번째 실행될 때부터는 새로운 인스턴스나 메서드를 찾아가며 실행하지 않고 같은 `CallSite`를 바로 실행시켜 객체지향의 성질은 잃지만 더욱 빠르다.)
- 실제 생성과정은 `private static MethodHandle generateMHInlineCopy()`에 저수준에 가깝게 구현되어 있다. [#](https://github.com/openjdk/jdk15/blob/36c4b11bc6cf5a008d5935934aa75f2d2bbe6a23/src/java.base/share/classes/java/lang/invoke/StringConcatFactory.java#L549)

## `StringBuffer`와의 차이
`StringBuffer`는 멀티스레드에서 안전하다는 점이 다르다.

#StringBuilder #String #Pool #JAVA