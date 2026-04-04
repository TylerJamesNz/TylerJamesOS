# Coding Principles

These rules apply to every line of code written for Tyler James OS. They are not suggestions. When starting a new feature, open this file first.

---

## The prime directive: No vibe coding

Vibe coding — writing code by feel, copy-pasting from Stack Overflow or AI output without understanding it, letting the codebase grow organically without intent — is explicitly banned.

Every piece of code must be:
- **Understood** before it is committed
- **Intentional** — solving a specific, defined problem
- **Connected** to existing patterns in the codebase, not floating alone

If you find yourself unsure why something works, stop and figure it out before moving on.

---

## SOLID principles

### Single Responsibility
Every module, function, and component does one thing. A component that fetches data, transforms it, and renders it is three things. Break it up.

```ts
// ❌ Wrong — doing too much
function TransactionList() {
  const [data, setData] = useState([])
  useEffect(() => { fetch('/api/transactions').then(...) }, [])
  const grouped = groupByCategory(data)
  return <div>{grouped.map(...)}</div>
}

// ✅ Right — data fetching separated from display
function TransactionList() {
  const { transactions } = useTransactions() // custom hook owns fetching
  const grouped = useGroupedTransactions(transactions) // transform hook
  return <TransactionGrid groups={grouped} /> // component only renders
}
```

### Open/Closed
Code should be open for extension, closed for modification. Add new behaviour by adding new code, not by editing existing working code.

### Liskov Substitution
Subtypes must be substitutable for their base types. In practice: don't override behaviour in a way that breaks callers.

### Interface Segregation
Don't force components or functions to depend on interfaces they don't use. Pass only what is needed.

```ts
// ❌ Wrong — passing the whole transaction object when only two fields are needed
function TransactionRow({ transaction }: { transaction: Transaction }) {
  return <div>{transaction.description} — {transaction.amount}</div>
}

// ✅ Right — explicit, minimal props
function TransactionRow({ description, amount }: { description: string; amount: number }) {
  return <div>{description} — {amount}</div>
}
```

### Dependency Inversion
Depend on abstractions, not concretions. Business logic should not know about database drivers, API clients, or specific services.

---

## Reuse first

Before writing a new utility function, component, or hook — look for an existing one. If something similar exists, extend it. The rule: **never solve the same problem twice**.

Shared code lives in:
- `lib/` — pure functions, utilities, formatters
- `components/ui/` — base UI components (shadcn)
- `components/[feature]/` — feature-specific but potentially reusable components
- `hooks/` — shared React hooks

---

## TypeScript rules

- **No `any`.** If you don't know the type, figure it out. If it's truly dynamic, use `unknown` and narrow it.
- **Explicit return types on all functions.** No implicit inference on public API surfaces.
- **Zod for all external data.** Any data coming from the API, user input, or external services must be validated with a Zod schema before use.

---

## File and naming conventions

- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Components:** One component per file. Export as named export AND default export.
- **Hooks:** Prefix with `use`. Live in `hooks/` or co-located with their component if only used there.
- **Constants:** `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for config objects.

---

## API design rules

- All API routes return consistent response shapes:
  ```ts
  // Success
  { data: T, error: null }
  // Error
  { data: null, error: { code: string, message: string } }
  ```
- Never expose database IDs directly in URLs if they can be guessed. Use UUIDs.
- All mutations require auth. No exceptions.

---

## Database rules

- **Never write raw SQL** except for migrations where Prisma falls short.
- All schema changes go through Prisma migrations. No manual schema edits in production.
- Every table has `created_at` and `updated_at`.
- Soft deletes (`deleted_at`) on any entity where history matters.

---

## Testing philosophy

- Write tests for business logic (categorisation engine, transaction parsing, task creation rules).
- Don't test framework behaviour (don't test that React renders a div).
- Integration tests over unit tests where possible — test the whole flow, not individual functions in isolation.
- Tests live next to the code they test: `finance.ts` → `finance.test.ts`

---

## Git rules

- Commits are small and focused. One logical change per commit.
- Commit messages are imperative: "Add transaction category model" not "Added" or "Adding"
- No committing broken code to main. Feature branches for anything non-trivial.
- No `// TODO` comments in committed code — create a real task instead.
