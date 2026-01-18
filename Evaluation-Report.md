
## 1. Gap Analysis (Omissions)

### Gap A: The "Oracle Problem" in AI Testing (FR4)
**Requirement:** FR4 (Conversational Parsing).
**Omission:** No automated tests verify that Claude AI correctly parses natural language into JSON.
**Analysis:** This represents a classic "Oracle Problem" (Y&P Ch22). Because Large Language Models (LLMs) are non-deterministic, the same input (e.g., "Send meds to Western General") may result in slightly different JSON structures or phrasing across runs. Standard unit assertions are too rigid to handle this variance. 
**Impact:** Automated verification is currently limited to the internal parsers (`messageParser.ts`), while the end-to-end AI interpretation relies on manual validation. This creates a regression risk where prompt changes could break the UI without triggering a CI failure.

### Gap B: Mock Object Validity (Optimistic Inaccuracy)
**Requirement:** FR2 (Cost Calculation).
**Omission:** Unit tests rely entirely on Mock objects for the `Drone` entity and `GeometryService`.
**Analysis:** This introduces a risk of "Optimistic Inaccuracy" (Y&P Ch12). The tests verify that the calculation logic is correct *assuming* the mocks behave like the real system. However, if the database schema for Drones changes (e.g., `costPerMove` becomes `baseRate`), the unit tests will still pass while the integration fails.
**Impact:** There is a verification gap between the Unit layer and the System layer that is only partially covered by the FR1 integration tests.

---

## 2. Statistical Evaluation: Fault Injection (Mutation Analysis)
To evaluate the **adequacy** of the FR2 (Cost) test suite beyond simple code coverage (Y&P Ch9), I performed a manual **Fault Injection** experiment (Y&P Ch16).

**Method:** I introduced 5 deliberate syntax mutations into `PathServiceImpl.java` to determine if the test suite was sensitive enough to detect "logical neighbors" of the correct code.

| ID | Mutation Type | Code Change | Expected Result | Actual Result | Status |
|----|---------------|-------------|-----------------|---------------|--------|
| M1 | Arithmetic | `total + cost` → `total - cost` | Test Fail | Test Failed | **Killed** |
| M2 | Boundary | `moves > 0` → `moves >= 0` | Test Fail | Test Failed | **Killed** |
| M3 | Constant | `baseCost = 1.0` → `baseCost = 0.0` | Test Fail | Test Failed | **Killed** |
| M4 | Logic | `if(cooling)` → `if(!cooling)` | Test Fail | Test Failed | **Killed** |
| M5 | Precision | `Math.round` → `(removed)` | Test Fail | Test Failed | **Killed** |

**Outcome:** The Mutation Score is **100% (5/5)**. This provides statistical confidence that the FR2 test suite is robust and effectively guards against logical regressions, even at a 73% coverage level.

---

## 3. Adequacy of Targets vs. Actuals

| Component | Metric | Target | Actual | Status | Deviation Analysis |
|-----------|--------|--------|--------|--------|--------------------|
| **FR1 (Pathfinding)** | Instruction Cov | 90% | 95% | **Exceeded** | Critical logic is near-exhaustively verified. |
| **Backend (Path)** | Instruction Cov | 70% | 73% | **Met** | Core service logic exceeds the thoroughness target. |
| **Frontend (All)** | Statement Cov | 70% | 74.19% | **Met** | Achieved via late-stage NLP parser testing. |
| **FR10 (API)** | Endpoint Cov | 100% | 100% | **Met** | All 3 API endpoints verified via the CI harness. |

---

## 4. Environment Limitations
All testing was performed in a **Localhost** environment (Y&P Ch22), which introduces two specific limitations:
1.  **Network Latency:** Localhost testing cannot simulate the real-world latency of the Anthropic API (US-based servers). The 90-second timeout in the CI pipeline may be optimistic for high-latency production environments.
2.  **Concurrency:** Tests were executed in a sequential runner. Production environments will face concurrent hospital requests, potentially exposing race conditions in the path-planning services that are invisible in the current single-threaded test context.