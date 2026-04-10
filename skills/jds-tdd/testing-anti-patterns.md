[//]: # (Adapted from obra/superpowers: https://github.com/obra/superpowers/blob/main/skills/test-driven-development/testing-anti-patterns.md)

# Testing Anti-Patterns

**When to consult this guide:** before introducing any mock, before adding a method to a production class, or when a test starts to feel harder to write than the feature itself.

## Purpose

Mocks are surgical tools. Used precisely, they isolate the one moving part you're testing. Used carelessly, they replace the system under test with a fake you then verify — which proves the fake works, not the system.

**Three rules that cannot be bent:**

1. Every assertion must be traceable to observable behavior in real code.
2. Production classes must not carry methods that only test harnesses invoke.
3. A mock you don't fully understand is a liability — map the dependency before isolating it.

## Problem 1: Asserting on Mock Choreography

**What goes wrong:**
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

**The problem:**
- The only assertion is that the fake received a call — nothing about real inventory logic is exercised
- A correctly configured mock will always make this test green, regardless of whether `InventoryService.reserve()` actually works
- Validation rules, persistence side effects, and error paths in the real implementation are completely invisible here

**The correction:**
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

### Decision Gate

Use this checklist before writing any `verify()` or mock-interaction assertion:

- [ ] Does this assertion check a real, observable side effect (database state, returned value, emitted event)?
- [ ] If I replaced the mock with the real dependency, would this assertion still make sense?
- [ ] Can I describe what production behavior this assertion proves?

**If any answer is no:** remove the mock assertion and test the actual outcome instead — either directly or through an integration test.

## Problem 2: Polluting Production with Test Helpers

**What goes wrong:**
```java
// BAD: clearAll() exists purely for test teardown
public class ConnectionPool {
    private final List<Connection> connections = new ArrayList<>();

    public Connection acquire() { /* ... */ }
    public void release(Connection conn) { /* ... */ }

    // This method exists ONLY for tests
    public void clearAll() {
        connections.forEach(Connection::close);
        connections.clear();
    }
}

// In tests
@AfterEach
void tearDown() {
    connectionPool.clearAll();
}
```

**The problem:**
- The production class now carries dead weight that only test code exercises
- If someone calls `resetState()` in a production path, every active connection is silently destroyed
- New team members have no way to know this method is test-only — it looks like a legitimate part of the API
- It blurs the boundary between what the class does for its callers and what tests need for setup/teardown

**The correction:**
```java
// GOOD: Dedicated test helper owns cleanup logic
// ConnectionPool has NO clearAll() — cleanup is not its responsibility

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

### Decision Gate

Run through these questions before adding any new method to a production class:

- [ ] Will any production caller ever invoke this method?
- [ ] If I delete this method, does any non-test code break?
- [ ] Is there a test utility class or a fresh-instance approach that eliminates the need for this method?

**If only tests need it:** extract it into a test helper or restructure tests to use a fresh instance per case. Keep production classes clean.

## Problem 3: Mocking Dependencies You Don't Understand

**What goes wrong:**
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

**The problem:**
- `save()` returns an object but has no persistence — the state the duplicate check relies on never materialises
- `findByEmail` either returns nothing or is also mocked to return nothing, so the duplicate path is unreachable
- The test either passes for the wrong reason or fails in a way that sends you chasing phantom bugs
- Blanket mocking "just in case" actively sabotages the behaviour the test is supposed to verify

**The correction:**
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

### Decision Gate

Before introducing any mock, work through this decision sequence:

- [ ] Can I list every side effect the real method produces (writes, state changes, events)?
- [ ] Does my test depend on any of those side effects to reach its assertion?
- [ ] Do I understand the full call chain well enough to know what is safe to fake?

**If the test relies on a side effect:** do not mock the method that produces it. Instead, mock only the slow or external operation underneath it, or use an in-memory implementation that retains the necessary behaviour.

**If you're unsure what the test needs:** run it against the real implementation first, observe what must happen, then introduce the minimal mock at the right layer.

## Problem 4: Half-Built Fake Responses

**What goes wrong:**
```java
// BAD: Incomplete mock — populates only the fields you anticipate
PaymentResponse mockResponse = new PaymentResponse();
mockResponse.setStatus("SUCCESS");
mockResponse.setTransactionId("txn-123");
// Omitted: metadata object that the audit trail reads downstream

// Later: NullPointerException when audit logger accesses response.getMetadata().getTimestamp()
```

**The problem:**
- You populated the fields you knew about and left the rest null — a structural assumption baked into the test
- Code further down the call chain may read fields you never set, producing `NullPointerException`s that only appear at integration time
- The test gives a green bar while the real API response would exercise a completely different code path
- This creates a dangerous gap between what tests prove and what production actually does

**The correction:**
```java
// GOOD: Mirror real API response completely
PaymentResponse mockResponse = new PaymentResponse();
mockResponse.setStatus("SUCCESS");
mockResponse.setTransactionId("txn-123");
mockResponse.setMetadata(new PaymentMetadata("req-789", Instant.now()));
// All fields the real payment gateway returns
```

### Decision Gate

When constructing any fake response object, verify the following:

- [ ] Have I consulted the real API documentation or captured a sample response?
- [ ] Does my fake include every field that any downstream consumer might access?
- [ ] Does the shape of my fake match the real response schema field-for-field?

**When in doubt:** include all documented fields. A slightly verbose fake is far safer than a sparse one that hides missing data behind null.

## Problem 5: Writing Tests After the Fact

**What goes wrong:**
```
Feature coded
Zero tests exist
"I'll add tests now"
```

**The problem:**
- Tests are not a separate phase — they are an integral part of building the feature
- With TDD, this situation is impossible: you cannot write production code without a failing test prompting it
- Declaring "done" without tests means the feature is unverified and the definition of complete has not been met

**The correction:**
```
TDD cycle:
1. Start with a failing test   (mvn test — RED)
2. Write just enough to pass   (mvn test — GREEN)
3. Clean up the code
4. THEN mark the task done
```

## When the Mock Setup Outgrows the Test

Warning signs that you've reached diminishing returns:
- The `when()` / `thenReturn()` setup takes more lines than the assertion
- You're mocking collaborators you haven't examined in the actual code
- Changing the mock's behavior breaks the test but no production behavior changed
- You can't describe in one sentence what production path this test exercises

At this point, an integration test against an in-memory implementation is nearly always simpler and more trustworthy than continuing to extend the mock graph.

```java
// Instead of layering stubs on stubs, use a real in-memory store:
@Test
void When_UserSearchesByPartialName_Expect_MatchingResultsReturned() {
    UserRepository repo = new InMemoryUserRepository();
    repo.save(new User("alice@example.com", "Alice Liddell"));
    repo.save(new User("bob@example.com", "Bob Marley"));

    List<User> matches = repo.findByNameContaining("Ali");

    assertEquals(1, matches.size());
    assertEquals("Alice Liddell", matches.get(0).getName());
}
```

## How Following TDD Prevents These Problems

The RED step is the safeguard:
1. Writing the assertion before any implementation forces you to specify *what* you're proving before you set up how to prove it.
2. Watching the test fail against real code — before introducing any mock — shows you which dependencies actually matter.
3. Implementing the minimum to turn it green leaves no room for convenience methods that only tests would call.
4. If mocking is introduced during refactoring rather than from the start, you already know what the real system does and can isolate safely.

**The sign that you skipped RED:** your test only ever asserted on mock interactions, never on a real outcome.

## Quick Reference

| Problem | Remedy |
|---------|--------|
| Asserting on mock invocations | Replace with an assertion on the real state change |
| Production method only called from tests | Move logic to a test utility class |
| Mock set up before understanding the dependency | Read the real implementation first; isolate only what is slow or external |
| Fake response missing fields | Build the full response from API docs or a captured sample |
| Tests added after implementation | Delete the code; begin the TDD cycle from a failing test |
| Mock setup dominates the test | Switch to an in-memory real implementation |

## Warning Signs

- Test IDs contain `mock`, `fake`, or `stub` in their names
- Methods appear in production classes with no non-test callers
- Mock configuration exceeds the assertion logic in length
- Removing the mock makes the test fail even though no production logic changed
- You cannot name the specific production behavior this test is designed to catch
