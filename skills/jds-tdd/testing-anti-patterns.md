# Testing Anti-Patterns

**Load this reference when:** writing or changing tests, adding mocks, or tempted to add test-only methods to production code.

## Overview

Tests must verify real behavior, not mock behavior. Mocks are a means to isolate, not the thing being tested.

**Core principle:** Test what the code does, not what the mocks do.

**Following strict TDD prevents these anti-patterns.**

## The Iron Laws

```
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding dependencies
```

## Anti-Pattern 1: Testing Mock Behavior

**The violation:**
```java
// BAD: Testing that the mock exists, not real behavior
@Test
void When_OrderIsPlaced_Expect_InventoryUpdated() {
    InventoryService mockInventory = mock(InventoryService.class);
    when(mockInventory.reserve(anyString(), anyInt())).thenReturn(true);

    OrderService orderService = new OrderService(mockInventory);
    orderService.placeOrder("SKU-001", 5);

    // You're verifying the mock was called, not that inventory was actually reserved
    verify(mockInventory).reserve("SKU-001", 5);
}
```

**Why this is wrong:**
- You are verifying the mock was called, not that real inventory logic works
- Test passes when mock is configured correctly, tells you nothing about real behavior
- If the real `InventoryService.reserve()` has validation or side effects, this test misses them entirely

**The fix:**
```java
// GOOD: Test with real InventoryService or test its behavior separately
@Test
void When_OrderIsPlaced_Expect_InventoryUpdated() {
    InventoryService inventory = new InventoryService(testDatabase);
    inventory.addStock("SKU-001", 10);

    OrderService orderService = new OrderService(inventory);
    orderService.placeOrder("SKU-001", 5);

    assertEquals(5, inventory.getStock("SKU-001"));
}
```

### Gate Function

```
BEFORE asserting on any mock interaction (verify, times, etc.):
  Ask: "Am I testing real behavior or just that a mock was called?"

  IF testing mock interaction:
    STOP - Test the actual effect instead, or integration-test the real components

  Test real behavior instead
```

## Anti-Pattern 2: Test-Only Methods in Production

**The violation:**
```java
// BAD: resetState() only used in tests
public class ConnectionPool {
    private final List<Connection> connections = new ArrayList<>();

    public Connection acquire() { /* ... */ }
    public void release(Connection conn) { /* ... */ }

    // This method exists ONLY for tests
    public void resetState() {
        connections.forEach(Connection::close);
        connections.clear();
    }
}

// In tests
@AfterEach
void tearDown() {
    connectionPool.resetState();
}
```

**Why this is wrong:**
- Production class polluted with test-only code
- Dangerous if accidentally called in production (wipes all connections)
- Violates separation of concerns
- Future developers may think `resetState()` is part of the public API

**The fix:**
```java
// GOOD: Test utilities handle test cleanup
// ConnectionPool has NO resetState() — it does not own its own teardown

// In test-support/
public final class TestConnectionPool {
    private TestConnectionPool() {}

    public static void cleanup(ConnectionPool pool) {
        // Use reflection or package-private access to clean up
        // OR create a fresh pool per test instead
    }
}

// In tests — or better, just create a new pool per test
@BeforeEach
void setUp() {
    connectionPool = new ConnectionPool(testConfig);
}
```

### Gate Function

```
BEFORE adding any method to a production class:
  Ask: "Is this only used by tests?"

  IF yes:
    STOP - Don't add it
    Put it in test utilities or use a fresh instance per test

  Ask: "Does this class own this resource's lifecycle?"

  IF no:
    STOP - Wrong class for this method
```

## Anti-Pattern 3: Mocking Without Understanding

**The violation:**
```java
// BAD: Mock prevents the side effect the test depends on
@Test
void When_DuplicateUserRegistered_Expect_ConflictThrown() {
    UserRepository mockRepo = mock(UserRepository.class);
    // Mock prevents the actual save that the duplicate check depends on!
    when(mockRepo.save(any(User.class))).thenReturn(new User());

    UserService service = new UserService(mockRepo);
    service.register("alice@example.com", "password123");
    // Second registration should throw — but it won't because mock
    // doesn't actually persist anything for the duplicate check
    assertThrows(DuplicateUserException.class,
        () -> service.register("alice@example.com", "password123"));
}
```

**Why this is wrong:**
- The mocked `save()` returns a User but never persists it
- The duplicate check (`findByEmail`) is also mocked or returns nothing
- Test passes for the wrong reason or fails mysteriously
- Over-mocking "to be safe" breaks the behavior the test needs

**The fix:**
```java
// GOOD: Use an in-memory repository that preserves real behavior
@Test
void When_DuplicateUserRegistered_Expect_ConflictThrown() {
    UserRepository repo = new InMemoryUserRepository();

    UserService service = new UserService(repo);
    service.register("alice@example.com", "password123");

    assertThrows(DuplicateUserException.class,
        () -> service.register("alice@example.com", "password123"));
}
```

### Gate Function

```
BEFORE mocking any method:
  STOP - Don't mock yet

  1. Ask: "What side effects does the real method have?"
  2. Ask: "Does this test depend on any of those side effects?"
  3. Ask: "Do I fully understand what this test needs?"

  IF depends on side effects:
    Mock at lower level (the actual slow/external operation)
    OR use in-memory implementations that preserve necessary behavior
    NOT the high-level method the test depends on

  IF unsure what test depends on:
    Run test with real implementation FIRST
    Observe what actually needs to happen
    THEN add minimal mocking at the right level
```

## Anti-Pattern 4: Incomplete Mocks

**The violation:**
```java
// BAD: Partial mock — only fields you think you need
PaymentResponse mockResponse = new PaymentResponse();
mockResponse.setStatus("SUCCESS");
mockResponse.setTransactionId("txn-123");
// Missing: metadata that downstream audit logging uses

// Later: NullPointerException when audit logger accesses response.getMetadata().getTimestamp()
```

**Why this is wrong:**
- Partial mocks hide structural assumptions — you only mocked fields you knew about
- Downstream code may depend on fields you didn't include — silent `NullPointerException`
- Tests pass but integration fails — mock is incomplete, real API is complete
- False confidence — test proves nothing about real behavior

**The fix:**
```java
// GOOD: Mirror real API response completely
PaymentResponse mockResponse = new PaymentResponse();
mockResponse.setStatus("SUCCESS");
mockResponse.setTransactionId("txn-123");
mockResponse.setMetadata(new PaymentMetadata("req-789", Instant.now()));
// All fields the real payment gateway returns
```

### Gate Function

```
BEFORE creating mock responses:
  Check: "What fields does the real API response contain?"

  Actions:
    1. Examine actual API response from docs/examples
    2. Include ALL fields system might consume downstream
    3. Verify mock matches real response schema completely

  If uncertain: Include all documented fields
```

## Anti-Pattern 5: Tests as Afterthought

**The violation:**
```
Implementation complete
No tests written
"Ready for testing"
```

**Why this is wrong:**
- Testing is part of implementation, not an optional follow-up
- TDD would have caught this — the test comes first
- Cannot claim complete without tests

**The fix:**
```
TDD cycle:
1. Write failing test     (mvn test — FAIL)
2. Implement to pass      (mvn test — PASS)
3. Refactor
4. THEN claim complete
```

## When Mocks Become Too Complex

**Warning signs:**
- Mock setup longer than test logic
- Mocking everything to make test pass
- Mocks missing methods real components have
- Test breaks when mock changes

**Consider:** Integration tests with real components (in-memory databases, embedded servers) are often simpler and more reliable than complex mock chains.

```java
// Instead of 20 lines of Mockito setup:
@Test
void When_UserSearchesByName_Expect_MatchingResults() {
    // Use an in-memory H2 database — no mocking needed
    UserRepository repo = new JpaUserRepository(testEntityManager);
    repo.save(new User("alice@example.com", "Alice"));
    repo.save(new User("bob@example.com", "Bob"));

    List<User> results = repo.findByNameContaining("Ali");

    assertEquals(1, results.size());
    assertEquals("Alice", results.get(0).getName());
}
```

## TDD Prevents These Anti-Patterns

**Why TDD helps:**
1. **Write test first** — Forces you to think about what you are actually testing
2. **Watch it fail** — Confirms test tests real behavior, not mocks
3. **Minimal implementation** — No test-only methods creep in
4. **Real dependencies** — You see what the test actually needs before mocking

**If you are testing mock behavior, you violated TDD** — you added mocks without watching the test fail against real code first.

## Quick Reference

| Anti-Pattern | Fix |
|--------------|-----|
| Verify mock interactions | Test the real effect instead |
| Test-only methods in production | Move to test utilities or use fresh instances |
| Mock without understanding | Understand dependencies first, mock minimally |
| Incomplete mocks | Mirror real API completely |
| Tests as afterthought | TDD — tests first |
| Over-complex mocks | Consider integration tests with in-memory implementations |

## Red Flags

- Excessive `verify()` calls checking mock interactions
- Methods only called from test files
- Mock setup is >50% of test code
- Test fails when you remove a mock
- Cannot explain why a mock is needed
- Mocking "just to be safe"
