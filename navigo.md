# Navigo Router Documentation

## Quick Reference

### Installation and Initialization

```typescript
const router = new Navigo('/root/path', {
  strategy: 'ONE' | 'ALL', // Default: 'ONE'
  noMatchWarning: boolean, // Default: false
})
```

### Core Methods

| Method       | Description                 | Example                       |
| ------------ | --------------------------- | ----------------------------- |
| `on()`       | Register routes             | `router.on('/path', handler)` |
| `navigate()` | Navigate with URL change    | `router.navigate('/path')`    |
| `resolve()`  | Navigate without URL change | `router.resolve()`            |
| `notFound()` | Handle 404 routes           | `router.notFound(handler)`    |
| `destroy()`  | Remove all routes           | `router.destroy()`            |

## Detailed Guide

### Route Registration Methods

1. **Single Route**

```typescript
router.on('/foo/bar', () => {
  // Handler for '/foo/bar'
})
```

2. **Root Route**

```typescript
router.on(() => {
  // Handler for root path
})
```

3. **Multiple Routes Map**

```typescript
router.on({
  '/foo/bar': () => {
    /* handler */
  },
  '/foo/baz': () => {
    /* handler */
  },
})
```

4. **Named Routes**

```typescript
router.on({
  '/foo/bar': {
    as: 'routeName',
    uses: () => {
      /* handler */
    },
  },
})
```

### Route Hooks

#### Hook Types

```typescript
type RouteHooks = {
  before?: (done: Function, match: Match) => void
  after?: (match: Match) => void
  leave?: (done: Function, match: Match) => void
  already?: (match: Match) => void
}
```

#### Adding Hooks

1. **Route-Specific Hooks**

```typescript
router.on('/path', handler, {
  before: (done, match) => {
    // Pre-route logic
    done() // Continue
    // done(false); // Cancel navigation
  },
  after: (match) => {
    // Post-route logic
  },
})
```

2. **Global Hooks**

```typescript
router.hooks({
  before: (done, match) => {
    // Global pre-route logic
    done()
  },
})
```

### Navigation Options

```typescript
type NavigateOptions = {
  title?: string
  stateObj?: Object
  historyAPIMethod?: string
  updateBrowserURL?: boolean
  callHandler?: boolean
  callHooks?: boolean
  updateState?: boolean
  force?: boolean
  resolveOptions?: ResolveOptions
}
```

### Path Generation

1. **Simple Link**

```typescript
router.link('path') // Returns: '/root/path/path'
```

2. **Named Route Generation**

```typescript
router.generate(
  'routeName',
  {
    id: 'value',
    action: 'save',
  },
  {
    includeRoot: true | false,
  }
)
```

### Type Definitions

```typescript
type Match = {
  url: string
  queryString: string
  hashString: string
  route: Route
  data: Object | null
  params: Object | null
}

type Route = {
  name: string
  path: string | RegExp
  handler: Function
  hooks: RouteHooks
}

type RouterOptions = ResolveOptions & {
  linksSelector?: string
}

type ResolveOptions = {
  strategy?: 'ONE' | 'ALL'
  hash?: boolean
  noMatchWarning?: boolean
}
```

### Best Practices

1. **Route Organization**

   - Define routes hierarchically
   - Use named routes for complex navigation
   - Group related routes together

2. **Hook Usage**

   - Use global hooks for authentication/logging
   - Use route-specific hooks for route-level concerns
   - Always call `done()` in before/leave hooks

3. **Error Handling**

   - Always implement notFound handlers
   - Use hooks for error boundaries
   - Handle navigation failures gracefully

4. **Performance**
   - Use 'ONE' strategy unless multiple matches needed
   - Clean up with destroy() when router instance no longer needed
   - Update page links manually after dynamic content changes

## Common Patterns

### Authentication Guard

```typescript
router.hooks({
  before: (done, match) => {
    if (!isAuthenticated() && match.url !== '/login') {
      router.navigate('/login')
      done(false)
    } else {
      done()
    }
  },
})
```

### Dynamic Route Parameters

```typescript
router.on('/user/:id/:action', ({ data }) => {
  const { id, action } = data
  // Handle route with parameters
})
```

### Nested Routes

```typescript
router.on({
  '/parent': {
    as: 'parent',
    uses: () => {
      /* parent handler */
    },
    hooks: {
      /* parent hooks */
    },
  },
  '/parent/child': {
    as: 'child',
    uses: () => {
      /* child handler */
    },
  },
})
```
