# Virtual Scroller 开发计划

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术决策](#2-技术决策)
- [3. 架构设计](#3-架构设计)
- [4. 详细开发步骤](#4-详细开发步骤)
- [5. API 设计](#5-api-设计)
- [6. 测试策略](#6-测试策略)
- [7. 性能优化](#7-性能优化)

---

## 1. 项目概述

### 1.1 目标

构建一个**无头（Headless）**的虚拟滚动 Hook，充分发挥 SolidJS 细粒度响应式更新的优势，支持：
- 动态高度项目
- 高度缓存机制
- 平滑滚动体验
- Shift Anchor（锚点机制）保持滚动位置稳定
- 可选的自定义滚动条

### 1.2 参考项目

| 项目 | 特点 | 借鉴点 |
|------|------|--------|
| rc-virtual-list (React) | 成熟稳定，高度缓存机制 | 高度变化时的滚动位置调整算法 |
| vue-virtual-scroller (Vue 3) | View Pool、Shift Anchor | 视图复用、锚点机制、测量队列 |
| TanStack Virtual | 无头设计，框架无关 | 架构抽象思路 |
| virtua | 零配置，小体积 | 简洁的 API 设计 |

### 1.3 核心设计原则

1. **无头设计**：只提供逻辑，不提供 UI，用户完全控制渲染
2. **信号驱动**：所有状态通过 Signal 管理，实现细粒度更新
3. **性能优先**：使用 `createTaskQueue` 分批测量，避免阻塞主线程
4. **内存安全**：自动清理 Observer，防止内存泄漏

---

## 2. 技术决策

### 2.1 无头设计

#### 决策：✅ 采用无头（Headless）设计

**理由：**

| 维度 | 分析 |
|------|------|
| **灵活性** | 用户完全控制 UI，可以实现任何视觉设计 |
| **可复用性** | 同一套逻辑可以用于不同的 UI 场景 |
| **包体积** | 不包含 UI 代码，体积更小 |
| **测试性** | 逻辑和 UI 分离，更容易测试 |

**实现方式：**

```typescript
// 核心 Hook
export function useVirtualScroll<T>(options: UseVirtualScrollOptions<T>): VirtualScrollReturn<T> {
  // ... 内部实现
  return {
    containerProps,
    visibleRange,
    visibleItems,
    measureItem,
    scrollToIndex,
    scrollToOffset,
    totalHeight,
    anchorRef,
  };
}
```

### 2.2 高度缓存机制

#### 决策：✅ 采用高度缓存

**理由：**

| 维度 | 分析 |
|------|------|
| **用户体验** | 无缓存时，每次滚动都需要重新测量所有可见项目，导致布局抖动 |
| **性能** | 缓存后只需测量新增/变化的项目，减少 DOM 操作 |
| **实现成本** | 使用 `createStore` 存储高度映射，成本低 |
| **内存占用** | 使用对象存储，可按需清理不可见区域的缓存 |

**实现方案：**

```typescript
// 高度缓存存储（使用 createStore 实现细粒度更新）
const [heights, setHeights] = createStore<Record<number, number>>({});

// 更新缓存
function updateHeight(index: number, height: number) {
  setHeights(index, height);
}

// 获取高度（优先使用缓存，否则使用估算值）
function getHeight(index: number): number {
  return heights[index] ?? estimatedItemHeight;
}
```

**缓存策略：**

1. **初始阶段**：使用 `estimatedItemHeight` 估算值
2. **渲染后**：通过 ResizeObserver 测量实际高度并缓存
3. **高度变化**：更新缓存并触发重新计算
4. **缓存清理**：可选策略 - 保留最近 N 个项目的缓存

### 2.3 测量队列

#### 决策：✅ 使用 `createTaskQueue` 分批测量

**理由：**

| 维度 | 分析 |
|------|------|
| **性能** | 避免一次性测量大量项目阻塞主线程 |
| **用户体验** | 滚动更流畅，无卡顿感 |
| **实现成本** | 已有 `@solid-primitive/scheduler` 依赖，无需额外安装 |
| **可控性** | 内置 `latest`、`all` 等策略，灵活可控 |

**实现方式：**

```typescript
import { createTaskQueue, $DISCARD } from "@solid-primitive/scheduler";

// 创建测量队列（使用 latest 策略，只保留最新任务）
const measureQueue = createTaskQueue({ strategy: "latest" });

// 提交测量任务
const measureItem = (index: number, element: HTMLElement) => {
  measureQueue.submit(() => {
    const height = element.offsetHeight;
    setHeights(index, height);
    return "measured";
  }).then((result) => {
    if (result === $DISCARD) {
      // 任务被丢弃（有更新的任务）
      return;
    }
    // 处理结果
  });
};
```

### 2.4 Shift Anchor 锚点机制

#### 决策：✅ 采用 Shift Anchor

**理由：**

| 维度 | 分析 |
|------|------|
| **用户体验** | 数据变化时滚动位置保持稳定，避免跳动 |
| **实现成本** | 相对简单，只需记录和恢复锚点信息 |
| **兼容性** | 适用于所有数据变化场景（添加、删除、排序） |

**实现方式：**

```typescript
// 数据变化前记录锚点
const saveAnchor = (scrollTop: number) => {
  // 找到当前可见的第一个项目
  for (let i = 0; i < items.length; i++) {
    if (offset + getHeight(i) > scrollTop) {
      setAnchor({ index: i, offset: scrollTop - offset });
      return;
    }
  }
};

// 数据变化后恢复锚点
const restoreAnchor = () => {
  const anchorInfo = anchor();
  if (!anchorInfo) return;

  // 计算新的滚动位置
  let newScrollTop = 0;
  for (let i = 0; i < anchorInfo.index; i++) {
    newScrollTop += getHeight(i);
  }
  newScrollTop += anchorInfo.offset;

  return newScrollTop;
};
```

### 2.5 自定义滚动条

#### 决策：分阶段实现

**Phase 1：使用原生滚动条**

理由：
- 快速实现核心功能
- 原生滚动条已具备完整的交互体验
- 减少初始复杂度

**Phase 2：可选的自定义滚动条**

理由：
- 更好的视觉一致性
- 支持自定义样式
- 更精确的滚动控制

**实现方式：**

```typescript
// 用户可以完全自定义滚动条
function MyList() {
  const { containerProps, totalHeight, scrollToOffset, ... } = useVirtualScroll(options);

  return (
    <div style={{ position: "relative" }}>
      <div {...containerProps()} style={{ overflow: "hidden" }}>
        {/* 渲染项目 */}
      </div>
      <CustomScrollbar
        containerHeight={500}
        contentHeight={totalHeight()}
        onScroll={scrollToOffset}
      />
    </div>
  );
}
```

---

## 3. 架构设计

### 3.1 文件结构

```
packages/virtual-scroller/
├── src/
│   ├── index.ts              # 导出所有公共 API
│   ├── useVirtualScroll.ts   # 主 Hook（核心逻辑）
│   ├── useHeights.ts         # 高度测量和缓存（使用 createTaskQueue）
│   ├── useVisibleRange.ts    # 可见范围计算
│   ├── useScrollTo.ts        # 滚动到指定位置
│   ├── useShiftAnchor.ts     # Shift Anchor 锚点机制
│   ├── types.ts              # 类型定义
│   └── primitives/
│       └── useSize.ts        # 尺寸测量原语（封装 ResizeObserver）
├── package.json
├── tsdown.config.ts
└── DEVELOPMENT_PLAN.md
```

### 3.2 依赖关系

```json
{
  "dependencies": {
    "@solid-component/utils": "workspace:^",
    "@solid-component/polymorphic": "workspace:^",
    "@solid-primitive/scheduler": "^0.5.0",
    "@solid-primitive/resize-observer": "^2.0.0"
  },
  "peerDependencies": {
    "solid-js": "^1.6.5"
  }
}
```

**已有的依赖：**
- `@solid-primitive/scheduler`：已在 `packages/floating` 中使用，提供 `createTaskQueue`
- `@solid-primitive/resize-observer`：已在项目中使用

### 3.3 无头设计架构

```typescript
// useVirtualScroll 是唯一的入口点
export function useVirtualScroll<T>(options: UseVirtualScrollOptions<T>) {
  // 内部 hooks
  const { heights, measureItem, getHeight } = useHeights(options);
  const { visibleRange, totalHeight } = useVisibleRange(options, getHeight);
  const { scrollToIndex, scrollToOffset } = useScrollTo(options, getHeight);
  const { anchorRef } = useShiftAnchor(options, getHeight);

  // 返回给用户的接口
  return {
    // 容器 props（用户需要绑定到滚动容器）
    containerProps: Accessor<ContainerProps>,
    // 可见范围
    visibleRange: Accessor<VisibleRange>,
    // 可见项目列表
    visibleItems: Accessor<VisibleItem<T>[]>,
    // 测量函数（用户需要在项目渲染后调用）
    measureItem: (index: number, element: HTMLElement) => void,
    // 滚动控制
    scrollToIndex: (index: number, align?: ScrollAlign) => void,
    scrollToOffset: (offset: number) => void,
    // 总高度（用于设置填充高度）
    totalHeight: Accessor<number>,
    // 锚点 ref（用于 Shift Anchor）
    anchorRef: (el: HTMLElement) => void,
  };
}
```

### 3.4 信号驱动架构

```typescript
// 核心信号
const [scrollTop, setScrollTop] = createSignal(0);
const [containerHeight, setContainerHeight] = createSignal(0);

// 高度缓存（使用 createStore 实现细粒度更新）
const [heights, setHeights] = createStore<Record<number, number>>({});

// 派生状态（Memo 自动缓存）
const visibleRange = createMemo(() => {
  return calculateVisibleRange(scrollTop(), containerHeight(), getHeight);
});

const totalHeight = createMemo(() => {
  return calculateTotalHeight(itemCount(), getHeight);
});
```

### 3.5 数据流

```
用户滚动 → onScroll 事件 → setScrollTop
                ↓
        visibleRange 重新计算（Memo 自动缓存）
                ↓
        visibleItems 更新（仅变化的项目）
                ↓
        用户渲染项目 + 调用 measureItem
                ↓
        ResizeObserver 测量 → createTaskQueue 分批处理
                ↓
        更新 heights Store → totalHeight 重新计算
                ↓
        Shift Anchor 调整滚动位置（如果需要）
```

### 3.6 关键优化点

| 优化点 | 实现方式 | 收益 |
|--------|----------|------|
| **分批测量** | `createTaskQueue` | 避免一次性测量大量项目阻塞主线程 |
| **细粒度更新** | `createStore` + Signal | 只有依赖变化的部分才重新计算 |
| **视图复用** | View Pool（可选） | 减少 DOM 创建/销毁开销 |
| **锚点机制** | Shift Anchor | 数据变化时保持滚动位置稳定 |
| **自动清理** | `onCleanup` | 防止内存泄漏 |

---

## 4. 详细开发步骤

### Phase 1：核心虚拟滚动（Headless Hook）

#### Step 1.1：项目结构搭建

**任务：**
- 创建 `packages/virtual-scroller` 目录
- 配置 `package.json`、`tsdown.config.ts`
- 创建基础文件结构

**依赖：**
- `@solid-component/utils`
- `@solid-component/polymorphic`
- `@solid-primitive/scheduler`（已有）
- `@solid-primitive/resize-observer`（已有）
- `solid-js` (peer)

**验收标准：**
- [ ] 项目结构符合 monorepo 规范
- [ ] 构建配置正确
- [ ] TypeScript 配置继承根配置

#### Step 1.2：类型定义

**任务：**
- 定义 `UseVirtualScrollOptions` 接口
- 定义返回值类型
- 定义内部类型（高度缓存、可见范围等）

**关键类型：**

```typescript
export interface UseVirtualScrollOptions<T> {
  /** 数据列表 */
  items: Accessor<T[]>;
  /** 容器高度 */
  height: Accessor<number>;
  /** 估算的项目高度（用于初始渲染和未测量项目） */
  estimatedItemHeight: Accessor<number>;
  /** 项目的唯一标识符（用于优化） */
  keyAccessor?: (item: T, index: number) => string | number;
  /** overscan 数量（可见区域外预渲染的项目数） */
  overscan?: number;
  /** 高度变化回调 */
  onHeightChange?: (index: number, height: number) => void;
  /** 滚动事件回调 */
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
}

export interface VirtualScrollReturn<T> {
  /** 容器 props（需要绑定到滚动容器） */
  containerProps: Accessor<ContainerProps>;
  /** 可见范围 */
  visibleRange: Accessor<VisibleRange>;
  /** 可见项目列表 */
  visibleItems: Accessor<VisibleItem<T>[]>;
  /** 测量函数（需要在项目渲染后调用） */
  measureItem: (index: number, element: HTMLElement) => void;
  /** 滚动控制 */
  scrollToIndex: (index: number, align?: ScrollAlign) => void;
  scrollToOffset: (offset: number) => void;
  /** 总高度（用于设置填充高度） */
  totalHeight: Accessor<number>;
  /** 锚点 ref（用于 Shift Anchor） */
  anchorRef: (el: HTMLElement) => void;
}

export interface ContainerProps {
  ref: (el: HTMLElement) => void;
  style: { overflow: string; height: string };
  onScroll: (e: Event) => void;
}

export interface VisibleItem<T> {
  index: number;
  item: T;
  offset: number;
}

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
}

export type ScrollAlign = "start" | "center" | "end" | "auto";
```

**验收标准：**
- [ ] 类型定义完整
- [ ] 包含 JSDoc 注释
- [ ] 导出所有公共类型

#### Step 1.3：尺寸测量原语（useSize）

**任务：**
- 封装 `@solid-primitive/resize-observer`
- 提供统一的尺寸测量接口

**实现：**

```typescript
import { createResizeObserver } from "@solid-primitive/resize-observer";

export function useSize(element: Accessor<HTMLElement | undefined>) {
  const [size, setSize] = createSignal({ width: 0, height: 0 });

  createResizeObserver(element, (entry) => {
    setSize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    });
  });

  return size;
}
```

**验收标准：**
- [ ] 正确监听元素尺寸变化
- [ ] 自动清理 Observer
- [ ] 返回响应式的尺寸值

#### Step 1.4：高度测量和缓存（useHeights）

**任务：**
- 实现 `useHeights` hook
- 使用 `createTaskQueue` 分批测量
- 实现高度缓存机制

**实现要点：**

```typescript
import { createTaskQueue, $DISCARD } from "@solid-primitive/scheduler";
import { createResizeObserver } from "@solid-primitive/resize-observer";

export function useHeights<T>(options: UseVirtualScrollOptions<T>) {
  // 高度缓存（使用 createStore 实现细粒度更新）
  const [heights, setHeights] = createStore<Record<number, number>>({});

  // 测量队列（使用 createTaskQueue 分批处理）
  const measureQueue = createTaskQueue({ strategy: "latest" });

  // 元素引用映射
  const elementMap = new Map<number, HTMLElement>();

  // 测量单个项目高度
  const measureItem = (index: number, element: HTMLElement) => {
    elementMap.set(index, element);

    // 使用队列分批测量，避免阻塞主线程
    measureQueue.submit(() => {
      const height = element.offsetHeight;
      if (height !== heights[index]) {
        setHeights(index, height);
        options.onHeightChange?.(index, height);
      }
      return "measured";
    }).then((result) => {
      if (result === $DISCARD) {
        // 任务被丢弃（有更新的任务）
        return;
      }
    });
  };

  // 获取高度（优先缓存，否则估算）
  const getHeight = (index: number): number => {
    return heights[index] ?? options.estimatedItemHeight();
  };

  // 清理
  onCleanup(() => {
    elementMap.clear();
  });

  return {
    heights,
    measureItem,
    getHeight,
  };
}
```

**验收标准：**
- [ ] 使用 `createTaskQueue` 分批测量
- [ ] 高度缓存正确更新
- [ ] 组件卸载时正确清理
- [ ] 高度变化时触发重新计算

#### Step 1.5：可见范围计算（useVisibleRange）

**任务：**
- 实现可见范围计算算法
- 处理动态高度项目
- 支持滚动缓冲区

**算法：**

```typescript
export function useVisibleRange<T>(
  options: UseVirtualScrollOptions<T>,
  getHeight: (index: number) => number,
) {
  const visibleRange = createMemo(() => {
    const scrollTop = scrollTop();
    const containerHeight = options.height();
    const items = options.items();
    const overscan = options.overscan ?? 3;

    let startIndex = 0;
    let currentOffset = 0;

    // 找到起始索引
    for (let i = 0; i < items.length; i++) {
      const height = getHeight(i);
      if (currentOffset + height > scrollTop) {
        startIndex = i;
        break;
      }
      currentOffset += height;
    }

    // 应用 overscan
    startIndex = Math.max(0, startIndex - overscan);

    // 找到结束索引
    let endIndex = startIndex;
    let visibleHeight = 0;
    for (let i = startIndex; i < items.length; i++) {
      visibleHeight += getHeight(i);
      endIndex = i;
      if (visibleHeight >= containerHeight + getHeight(i) * overscan) {
        break;
      }
    }

    return {
      startIndex,
      endIndex: Math.min(items.length - 1, endIndex),
    };
  });

  // 可见项目列表
  const visibleItems = createMemo(() => {
    const range = visibleRange();
    const items = options.items();
    const result: VisibleItem<T>[] = [];

    for (let i = range.startIndex; i <= range.endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        offset: getOffset(i),
      });
    }

    return result;
  });

  // 总高度
  const totalHeight = createMemo(() => {
    const items = options.items();
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getHeight(i);
    }
    return total;
  });

  return {
    visibleRange,
    visibleItems,
    totalHeight,
  };
}
```

**验收标准：**
- [ ] 正确计算可见范围
- [ ] 支持 overscan 缓冲区
- [ ] 处理动态高度项目
- [ ] 边界条件处理正确

#### Step 1.6：Shift Anchor 锚点机制

**任务：**
- 实现 Shift Anchor 算法
- 数据变化时保持滚动位置稳定

**算法：**

```typescript
export function useShiftAnchor<T>(
  options: UseVirtualScrollOptions<T>,
  getHeight: (index: number) => number,
) {
  // 记录锚点信息
  const [anchor, setAnchor] = createSignal<{
    index: number;
    offset: number;
  } | null>(null);

  // 记录锚点元素
  let anchorElement: HTMLElement | null = null;

  const anchorRef = (el: HTMLElement) => {
    anchorElement = el;
  };

  // 在数据变化前记录锚点
  const saveAnchor = (scrollTop: number) => {
    const items = options.items();
    let currentOffset = 0;

    for (let i = 0; i < items.length; i++) {
      const height = getHeight(i);
      if (currentOffset + height > scrollTop) {
        setAnchor({
          index: i,
          offset: scrollTop - currentOffset,
        });
        return;
      }
      currentOffset += height;
    }
  };

  // 在数据变化后恢复锚点
  const restoreAnchor = () => {
    const anchorInfo = anchor();
    if (!anchorInfo) return;

    const items = options.items();
    if (anchorInfo.index >= items.length) {
      setAnchor(null);
      return;
    }

    // 计算新的滚动位置
    let newScrollTop = 0;
    for (let i = 0; i < anchorInfo.index; i++) {
      newScrollTop += getHeight(i);
    }
    newScrollTop += anchorInfo.offset;

    setAnchor(null);
    return newScrollTop;
  };

  return {
    anchorRef,
    saveAnchor,
    restoreAnchor,
  };
}
```

**验收标准：**
- [ ] 数据变化时滚动位置保持稳定
- [ ] 正确处理边界情况（锚点项目被删除）
- [ ] 性能开销最小

#### Step 1.7：滚动到指定位置（useScrollTo）

**任务：**
- 实现滚动到指定索引
- 实现滚动到指定偏移量

**实现：**

```typescript
export function useScrollTo(
  containerRef: Accessor<HTMLElement | undefined>,
  getHeight: (index: number) => number,
  containerHeight: Accessor<number>,
) {
  const scrollToIndex = (index: number, align: ScrollAlign = "auto") => {
    const container = containerRef();
    if (!container) return;

    // 计算目标偏移量
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getHeight(i);
    }

    // 根据对齐方式调整
    const itemHeight = getHeight(index);
    const viewHeight = containerHeight();

    switch (align) {
      case "start":
        // 保持在顶部
        break;
      case "center":
        offset -= (viewHeight - itemHeight) / 2;
        break;
      case "end":
        offset -= viewHeight - itemHeight;
        break;
      case "auto":
      default:
        // 如果项目已经在可见区域内，不滚动
        const currentScrollTop = container.scrollTop;
        if (offset >= currentScrollTop && offset + itemHeight <= currentScrollTop + viewHeight) {
          return;
        }
        // 否则滚动到最近的边缘
        if (offset < currentScrollTop) {
          // 项目在视口上方，滚动到顶部
        } else {
          // 项目在视口下方，滚动到底部
          offset -= viewHeight - itemHeight;
        }
        break;
    }

    container.scrollTop = Math.max(0, offset);
  };

  const scrollToOffset = (offset: number) => {
    const container = containerRef();
    if (!container) return;
    container.scrollTop = offset;
  };

  return { scrollToIndex, scrollToOffset };
}
```

**验收标准：**
- [ ] 支持滚动到指定索引
- [ ] 支持四种对齐方式（start、center、end、auto）
- [ ] 支持滚动到指定偏移量

#### Step 1.8：主 Hook（useVirtualScroll）

**任务：**
- 实现主 Hook
- 集成所有子 hooks
- 处理滚动事件

**实现要点：**

```typescript
export function useVirtualScroll<T>(options: UseVirtualScrollOptions<T>): VirtualScrollReturn<T> {
  // 容器引用
  let containerRef: HTMLElement | undefined;
  const [containerRefAccessor, setContainerRefAccessor] = createSignal<HTMLElement>();

  // 滚动位置
  const [scrollTop, setScrollTop] = createSignal(0);
  const [scrollLeft, setScrollLeft] = createSignal(0);

  // 容器尺寸
  const containerSize = useSize(containerRefAccessor);

  // 高度测量
  const { heights, measureItem, getHeight } = useHeights(options);

  // 可见范围
  const { visibleRange, visibleItems, totalHeight } = useVisibleRange(
    { ...options, height: () => containerSize().height },
    getHeight,
  );

  // Shift Anchor
  const { anchorRef, saveAnchor, restoreAnchor } = useShiftAnchor(options, getHeight);

  // 滚动控制
  const { scrollToIndex, scrollToOffset } = useScrollTo(
    containerRefAccessor,
    getHeight,
    () => containerSize().height,
  );

  // 滚动事件处理（带节流）
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
    options.onScroll?.(target.scrollTop, target.scrollLeft);
  };

  // 容器 ref 回调
  const setContainerRef = (el: HTMLElement) => {
    containerRef = el;
    setContainerRefAccessor(el);
  };

  // 容器 props
  const containerProps = createMemo(() => ({
    ref: setContainerRef,
    style: {
      overflow: "auto",
      height: `${options.height()}px`,
    },
    onScroll: handleScroll,
  }));

  // 清理
  onCleanup(() => {
    containerRef = undefined;
  });

  return {
    containerProps,
    visibleRange,
    visibleItems,
    measureItem,
    scrollToIndex,
    scrollToOffset,
    totalHeight,
    anchorRef,
  };
}
```

**验收标准：**
- [ ] Hook 正确返回所有接口
- [ ] 滚动时平滑更新
- [ ] 高度测量正确工作
- [ ] 内存清理正确

---

### Phase 2：优化和增强

#### Step 2.1：滚轮事件优化

**任务：**
- 使用 `createTaskQueue` 节流滚动事件
- 避免滚动事件过于频繁触发

**实现：**

```typescript
// 使用 createTaskQueue 替代 requestAnimationFrame
const scrollQueue = createTaskQueue({ strategy: "latest" });

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;

  scrollQueue.submit(() => {
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
    options.onScroll?.(target.scrollTop, target.scrollLeft);
    return "updated";
  });
};
```

**验收标准：**
- [ ] 滚动事件使用 `createTaskQueue` 节流
- [ ] 组件卸载时正确清理

#### Step 2.2：无限滚动支持

**任务：**
- 实现滚动到底部检测
- 支持加载更多数据

**API：**

```typescript
interface UseInfiniteScrollOptions {
  /** 是否还有更多数据 */
  hasMore: Accessor<boolean>;
  /** 加载更多的回调 */
  onLoadMore: () => void;
  /** 加载状态 */
  loading?: Accessor<boolean>;
  /** 距离底部多远触发加载（像素） */
  threshold?: number;
}

function useInfiniteScroll(
  containerRef: Accessor<HTMLElement | undefined>,
  options: UseInfiniteScrollOptions,
) {
  // 监听滚动位置，检测是否到达底部
  createEffect(() => {
    const container = containerRef();
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const threshold = options.threshold ?? 100;

      if (scrollHeight - scrollTop - clientHeight < threshold) {
        if (options.hasMore() && !options.loading?.()) {
          options.onLoadMore();
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    onCleanup(() => container.removeEventListener("scroll", handleScroll));
  });
}
```

**验收标准：**
- [ ] 滚动到底部时触发加载
- [ ] 支持加载状态显示
- [ ] 避免重复加载

#### Step 2.3：性能优化

**任务：**
- 使用 `batch` 合并更新
- 使用 `untrack` 避免不必要的追踪
- 使用 `onCleanup` 清理资源

**优化点：**

```typescript
// 1. 使用 batch 合并多个状态更新
batch(() => {
  setScrollTop(newScrollTop);
  setScrollLeft(newScrollLeft);
});

// 2. 使用 untrack 避免不必要的追踪
createEffect(() => {
  const range = visibleRange();
  untrack(() => {
    // 这里不需要追踪 items 的变化
    console.log("Visible range changed:", range);
  });
});

// 3. 使用 onCleanup 清理资源
onCleanup(() => {
  elementMap.clear();
});
```

**验收标准：**
- [ ] 减少不必要的重新计算
- [ ] 正确清理所有副作用
- [ ] 内存无泄漏

---

### Phase 3：可选的自定义滚动条

#### Step 3.1：滚动条组件

**任务：**
- 实现自定义滚动条组件
- 支持拖拽滚动
- 支持自动隐藏

**组件结构：**

```typescript
interface ScrollbarProps {
  /** 滚动容器高度 */
  containerHeight: number;
  /** 内容总高度 */
  contentHeight: number;
  /** 当前滚动位置 */
  scrollTop: number;
  /** 滚动事件回调 */
  onScroll: (scrollTop: number) => void;
  /** 自动隐藏延迟（毫秒） */
  autoHideDelay?: number;
  /** 是否显示轨道 */
  showTrack?: boolean;
}
```

**验收标准：**
- [ ] 滚动条位置和大小正确
- [ ] 支持拖拽滚动
- [ ] 支持点击轨道快速滚动
- [ ] 支持自动隐藏

#### Step 3.2：集成自定义滚动条

**任务：**
- 将自定义滚动条与 useVirtualScroll 集成
- 通过选项控制是否使用自定义滚动条

**实现：**

```typescript
// 用户代码示例
function MyVirtualList() {
  const {
    containerProps,
    visibleItems,
    measureItem,
    totalHeight,
  } = useVirtualScroll({
    items: () => items,
    height: () => 500,
    estimatedItemHeight: () => 50,
  });

  return (
    <div style={{ position: "relative" }}>
      <div {...containerProps()}>
        <div style={{ height: `${totalHeight()}px` }}>
          <For each={visibleItems()}>
            {(item) => (
              <div
                ref={(el) => measureItem(item.index, el)}
                style={{ position: "absolute", top: `${item.offset}px` }}
              >
                {item.item.text}
              </div>
            )}
          </For>
        </div>
      </div>
      <Scrollbar
        containerHeight={500}
        contentHeight={totalHeight()}
        scrollTop={/* 从 containerProps 获取 */}
        onScroll={/* 调用 scrollToOffset */}
      />
    </div>
  );
}
```

**验收标准：**
- [ ] 自定义滚动条正确显示
- [ ] 滚动交互正常
- [ ] 与原生滚动条可切换

---

## 5. API 设计

### 5.1 基础用法（Headless Hook）

```tsx
import { useVirtualScroll } from "@solid-component/virtual-scroller";

function VirtualList<T>(props: { items: T[]; height: number }) {
  const {
    containerProps,
    visibleItems,
    measureItem,
    totalHeight,
  } = useVirtualScroll({
    items: () => props.items,
    height: () => props.height,
    estimatedItemHeight: () => 50,
  });

  return (
    <div {...containerProps()}>
      <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
        <For each={visibleItems()}>
          {(item) => (
            <div
              ref={(el) => measureItem(item.index, el)}
              style={{
                position: "absolute",
                top: `${item.offset}px`,
                width: "100%",
              }}
            >
              {item.item.text}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
```

### 5.2 动态高度

```tsx
function DynamicHeightList() {
  const {
    containerProps,
    visibleItems,
    measureItem,
    totalHeight,
  } = useVirtualScroll({
    items: () => items,
    height: () => 500,
    estimatedItemHeight: () => 50,
  });

  return (
    <div {...containerProps()}>
      <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
        <For each={visibleItems()}>
          {(item) => (
            <div
              ref={(el) => measureItem(item.index, el)}
              style={{
                position: "absolute",
                top: `${item.offset}px`,
                width: "100%",
                height: item.item.expanded ? "100px" : "50px",
              }}
            >
              {item.item.text}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
```

### 5.3 滚动到指定位置

```tsx
function ScrollToExample() {
  const {
    containerProps,
    visibleItems,
    measureItem,
    totalHeight,
    scrollToIndex,
  } = useVirtualScroll({
    items: () => items,
    height: () => 500,
    estimatedItemHeight: () => 50,
  });

  return (
    <>
      <button onClick={() => scrollToIndex(100, "center")}>
        Scroll to 100
      </button>
      <div {...containerProps()}>
        <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
          <For each={visibleItems()}>
            {(item) => (
              <div
                ref={(el) => measureItem(item.index, el)}
                style={{
                  position: "absolute",
                  top: `${item.offset}px`,
                  width: "100%",
                }}
              >
                {item.item.text}
              </div>
            )}
          </For>
        </div>
      </div>
    </>
  );
}
```

### 5.4 无限滚动

```tsx
import { useVirtualScroll, useInfiniteScroll } from "@solid-component/virtual-scroller";

function InfiniteList() {
  const [items, setItems] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);

  const virtualScroll = useVirtualScroll({
    items,
    height: () => 500,
    estimatedItemHeight: () => 50,
  });

  // 集成无限滚动
  useInfiniteScroll(
    () => virtualScroll.containerProps().ref,
    {
      hasMore,
      loading,
      onLoadMore: async () => {
        setLoading(true);
        const newItems = await fetchItems();
        setItems(prev => [...prev, ...newItems]);
        setHasMore(newItems.length > 0);
        setLoading(false);
      },
    }
  );

  return (
    <div {...virtualScroll.containerProps()}>
      <div style={{ height: `${virtualScroll.totalHeight()}px`, position: "relative" }}>
        <For each={virtualScroll.visibleItems()}>
          {(item) => (
            <div
              ref={(el) => virtualScroll.measureItem(item.index, el)}
              style={{
                position: "absolute",
                top: `${item.offset}px`,
                width: "100%",
              }}
            >
              {item.item.text}
            </div>
          )}
        </For>
        {loading() && <div>Loading...</div>}
      </div>
    </div>
  );
}
```

### 5.5 自定义滚动条

```tsx
import { useVirtualScroll } from "@solid-component/virtual-scroller";
import { Scrollbar } from "./Scrollbar";

function CustomScrollbarList() {
  const {
    containerProps,
    visibleItems,
    measureItem,
    totalHeight,
    scrollToOffset,
  } = useVirtualScroll({
    items: () => items,
    height: () => 500,
    estimatedItemHeight: () => 50,
  });

  const [scrollTop, setScrollTop] = createSignal(0);

  return (
    <div style={{ position: "relative" }}>
      <div
        {...containerProps()}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        style={{ overflow: "hidden" }}
      >
        <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
          <For each={visibleItems()}>
            {(item) => (
              <div
                ref={(el) => measureItem(item.index, el)}
                style={{
                  position: "absolute",
                  top: `${item.offset}px`,
                  width: "100%",
                }}
              >
                {item.item.text}
              </div>
            )}
          </For>
        </div>
      </div>
      <Scrollbar
        containerHeight={500}
        contentHeight={totalHeight()}
        scrollTop={scrollTop()}
        onScroll={scrollToOffset}
      />
    </div>
  );
}
```

### 5.6 与 Polymorphic 集成

```tsx
import { useVirtualScroll } from "@solid-component/virtual-scroller";
import { Polymorphic } from "@solid-component/polymorphic";

function PolymorphicVirtualList<T extends ValidComponent = "div">(
  props: PolymorphicProps<T, { items: any[]; height: number }>
) {
  const [local, others] = splitProps(props, ["items", "height"]);

  const {
    containerProps,
    visibleItems,
    measureItem,
    totalHeight,
  } = useVirtualScroll({
    items: () => local.items,
    height: () => local.height,
    estimatedItemHeight: () => 50,
  });

  return (
    <Polymorphic as="div" {...others} {...containerProps()}>
      <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
        <For each={visibleItems()}>
          {(item) => (
            <Polymorphic
              as="div"
              ref={(el: HTMLElement) => measureItem(item.index, el)}
              style={{
                position: "absolute",
                top: `${item.offset}px`,
                width: "100%",
              }}
            >
              {item.item.text}
            </Polymorphic>
          )}
        </For>
      </div>
    </Polymorphic>
  );
}
```

---

## 6. 测试策略

### 6.1 单元测试

**测试文件：** `src/useVirtualScroll.test.tsx`

**测试用例：**

```typescript
describe("useVirtualScroll", () => {
  // 基础渲染
  it("should return visible items within range", () => {});
  it("should calculate correct total height", () => {});
  it("should update visible range on scroll", () => {});

  // 动态高度
  it("should handle dynamic item heights", () => {});
  it("should update total height when item height changes", () => {});
  it("should use estimated height for unmeasured items", () => {});

  // Shift Anchor
  it("should maintain scroll position when items change", () => {});
  it("should handle anchor item deletion", () => {});

  // 滚动控制
  it("should scroll to specific index", () => {});
  it("should scroll to specific offset", () => {});
  it("should support start/center/end/auto alignment", () => {});

  // 高度缓存
  it("should cache measured heights", () => {});
  it("should trigger re-render on height change", () => {});

  // 性能
  it("should batch measurements with createTaskQueue", () => {});
  it("should cleanup observers on unmount", () => {});
});

describe("useInfiniteScroll", () => {
  it("should trigger onLoadMore when scrolling to bottom", () => {});
  it("should not trigger onLoadMore when loading", () => {});
  it("should not trigger onLoadMore when hasMore is false", () => {});
  it("should respect threshold setting", () => {});
});
```

### 6.2 集成测试

**测试场景：**
- 大数据量（10,000+ 项目）渲染性能
- 快速滚动时的流畅度
- 动态添加/删除项目
- 窗口大小变化时的响应

### 6.3 性能测试

**指标：**
- 首次渲染时间
- 滚动帧率（目标：60fps）
- 内存占用
- 项目渲染数量

---

## 7. 性能优化

### 7.1 减少 DOM 操作

- 使用 `For` 组件而不是 `Index`（reference-keyed）
- 避免不必要的 DOM 更新
- 使用 `batch` 合并状态更新

### 7.2 优化计算

- 使用 `createMemo` 缓存派生状态
- 使用 `untrack` 避免不必要的追踪
- 避免在渲染时进行复杂计算

### 7.3 内存管理

- 及时清理 ResizeObserver
- 按需清理高度缓存
- 避免内存泄漏

### 7.4 渲染优化

- 使用 CSS `contain` 属性隔离渲染
- 使用 `will-change` 提示浏览器优化
- 避免强制同步布局

---

## 附录 A：vue-virtual-scroller 优化借鉴

本组件借鉴了 vue-virtual-scroller 的以下优化策略：

### A.1 Shift Anchor（锚点机制）

**问题**：当数据变化（添加/删除项目）时，滚动位置会跳动。

**解决方案**：在数据变化前记录当前可见的锚点项目和偏移量，数据变化后恢复到相同的位置。

```typescript
// 数据变化前
saveAnchor(scrollTop);

// 数据变化
setItems(newItems);

// 数据变化后
const newScrollTop = restoreAnchor();
if (newScrollTop !== undefined) {
  container.scrollTop = newScrollTop;
}
```

### A.2 Measurement Queue（测量队列）

**问题**：一次性测量大量项目会阻塞主线程，导致卡顿。

**解决方案**：使用 `createTaskQueue` 分批测量，每帧只测量一个项目。

```typescript
const measureQueue = createTaskQueue({ strategy: "latest" });

const measureItem = (index: number, element: HTMLElement) => {
  measureQueue.submit(() => {
    const height = element.offsetHeight;
    setHeights(index, height);
    return "measured";
  });
};
```

### A.3 View Pool（视图池）- 可选优化

**问题**：频繁创建/销毁 DOM 元素有性能开销。

**解决方案**：复用 DOM 元素，只更新内容。

```typescript
// 视图池管理
const viewPool: HTMLElement[] = [];

function getView(): HTMLElement {
  return viewPool.pop() ?? document.createElement("div");
}

function recycleView(el: HTMLElement) {
  viewPool.push(el);
}
```

**注意**：View Pool 是可选优化，对于大多数场景，SolidJS 的细粒度更新已经足够高效。

---

## 附录 B：与现有组件集成

### B.1 使用 @solid-component/utils

```typescript
import { createControllableSignal } from "@solid-component/utils";

// 用于滚动位置的可控/非可控模式
const [scrollTop, setScrollTop] = createControllableSignal({
  value: () => props.scrollTop,
  defaultValue: 0,
  onChange: props.onScrollChange,
});
```

### B.2 使用 @solid-component/polymorphic

```typescript
import { Polymorphic, type PolymorphicProps } from "@solid-component/polymorphic";

// 支持自定义渲染元素
function PolymorphicVirtualList<T extends ValidComponent = "div">(
  props: PolymorphicProps<T, { items: any[] }>
) {
  const { containerProps, visibleItems, measureItem, totalHeight } = useVirtualScroll({
    items: () => props.items,
    height: () => 500,
    estimatedItemHeight: () => 50,
  });

  return (
    <Polymorphic as="div" {...props} {...containerProps()}>
      {/* 渲染项目 */}
    </Polymorphic>
  );
}
```

### B.3 使用 @solid-primitive/scheduler

```typescript
import { createTaskQueue, $DISCARD } from "@solid-primitive/scheduler";

// 创建测量队列
const measureQueue = createTaskQueue({ strategy: "latest" });

// 提交测量任务
measureQueue.submit(() => {
  const height = element.offsetHeight;
  setHeights(index, height);
  return "measured";
}).then((result) => {
  if (result === $DISCARD) {
    // 任务被丢弃
    return;
  }
  // 处理结果
});
```

### B.4 使用 @solid-primitive/resize-observer

```typescript
import { createResizeObserver } from "@solid-primitive/resize-observer";

// 监听容器尺寸变化
createResizeObserver(containerRef, (entry) => {
  setContainerHeight(entry.contentRect.height);
});

// 监听项目尺寸变化
createResizeObserver(elementRef, (entry) => {
  setHeights(index, entry.contentRect.height);
});
```

---

## 附录 C：命名约定

遵循项目现有命名约定：

- Hook：camelCase，`use` 前缀（如 `useVirtualScroll`）
- 类型：PascalCase（如 `UseVirtualScrollOptions`）
- 文件：hook 文件 camelCase
- 包名：kebab-case（如 `@solid-component/virtual-scroller`）
