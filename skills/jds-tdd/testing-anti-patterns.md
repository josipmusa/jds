# Testing Anti-Patterns

**When to consult this guide:** any time you write new tests, modify existing test logic, introduce mock objects, or consider adding a method to production code that only tests would call.

## Overview

A test that only exercises your fakes is a test that proves nothing about your system. Mocks exist to stand in for expensive or external dependencies — they should never be the subject under test. Every assertion should trace back to an observable outcome of real production logic.

**Guiding principle:** Assert against real outcomes, not against mock choreography.

**Disciplined TDD naturally guards against every pitfall listed below.**

## Non-Negotiable Rules

These three rules are absolute. Violating any of them means the test is providing false confidence.

1. **Assertions belong on real outcomes.** If the only thing you can verify is that a fake was invoked, the test has no value.
2. **Production code serves production callers.** Any method that exists solely for test convenience does not belong in a production class.
3. **Understand before you isolate.** Introducing a mock without knowing how the real dependency behaves leads to tests that lie.

## Pitfall 1: Asserting on Mock Choreography

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

### Before You Proceed

Use this checklist before writing any `verify()` or mock-interaction assertion:

- [ ] Does this assertion check a real, observable side effect (database state, returned value, emitted event)?
- [ ] If I replaced the mock with the real dependency, would this assertion still make sense?
- [ ] Can I describe what production behavior this assertion proves?

**If any answer is no:** remove the mock assertion and test the actual outcome instead — either directly or through an integration test.

## Pitfall 2: Polluting Production with Test Helpers

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

### Before You Proceed

Run through these questions before adding any new method to a production class:

- [ ] Will any production caller ever invoke this method?
- [ ] If I delete this method, does any non-test code break?
- [ ] Is there a test utility class or a fresh-instance approach that eliminates the need for this method?

**If only tests need it:** extract it into a test helper or restructure tests to use a fresh instance per case. Keep production classes clean.

## Pitfall 3: Mocking Dependencies You Don't Understand

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

### Before You Proceed

Before introducing any mock, work through this decision sequence:

- [ ] Can I list every side effect the real method produces (writes, state changes, events)?
- [ ] Does my test depend on any of those side effects to reach its assertion?
- [ ] Do I understand the full call chain well enough to know what is safe to fake?

**If the test relies on a side effect:** do not mock the method that produces it. Instead, mock only the slow or external operation underneath it, or use an in-memory implementation that retains the necessary behaviour.

**If you're unsure what the test needs:** run it against the real implementation first, observe what must happen, then introduce the minimal mock at the right layer.

## Pitfall 4: Half-Built Fake Responses

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

### Before You Proceed

When constructing any fake response object, verify the following:

- [ ] Have I consulted the real API documentation or captured a sample response?
- [ ] Does my fake include every field that any downstream consumer might access?
- [ ] Does the shape of my fake match the real response schema field-for-field?

**When in doubt:** include all documented fields. A slightly verbose fake is far safer than a sparse one that hides missing data behind null.

## Pitfall 5: Writing Tests After the Fact

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

## Recognising Over-Complicated Mocks

**Symptoms that your mock setup has outgrown its usefulness:**
- The arrangement section dwarfs the actual act-and-assert logic
- You are mocking nearly every collaborator just to get the test to compile
- Your fakes lack methods or fields that the real components expose
- Changing the mock wiring breaks the test even though production logic hasn't changed

**A practical alternative:** integration tests backed by lightweight real components — in-memory databases, embedded servers, or test containers — are frequently simpler to write and far more trustworthy than elaborate mock graphs.

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

## How TDD Guards Against These Pitfalls

**The red-green-refactor cycle addresses each issue directly:**
1. **Start from a failing test** — You must articulate the expected outcome before writing any production code, which forces clarity about what you are actually verifying.
2. **Observe the failure** — Watching the test go red against real logic confirms your assertion targets genuine behaviour, not mock wiring.
3. **Implement only what the test demands** — There is no room for test-only convenience methods when every line of production code exists to turn a specific test green.
4. **Encounter real dependencies early** — Because you run against actual collaborators first, you discover what truly needs isolation before reaching for a mock.

**Bottom line:** if your test only proves that a mock was called correctly, you skipped the "watch it fail" step — mocks were introduced before the test ever ran against real code.

## Quick Reference

| Pitfall | Remedy |
|---------|--------|
| Asserting on mock calls | Verify the actual observable effect in real state |
| Production methods that only tests invoke | Extract to test utilities or instantiate fresh per test |
| Mocking unfamiliar dependencies | Map the dependency's side effects first; isolate only at the lowest necessary layer |
| Half-built fake responses | Replicate the full response schema from API docs or samples |
| Tests written after implementation | Follow the TDD cycle — every feature starts with a failing test |
| Overly elaborate mock setups | Switch to integration tests with in-memory or embedded real components |

## Smell Indicators

- Heavy use of `verify()` to confirm mock call sequences rather than real outcomes
- Production methods whose only callers live in test files
- Mock configuration occupying more than half the test method
- Removing a mock causes the test to fail even though no production logic changed
- Unable to articulate what specific production behaviour a mock is standing in for
- Defaulting to mocks as a precaution rather than a deliberate isolation choice
