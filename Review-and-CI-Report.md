# Review and CI/CD Report
**Project:** ILP CW3 - Drone Operations Dashboard
**Student:** Prakhar Sangal (s2479386)

## 1. Code Review Strategy (LO 5.1)

### Review Checklist
I designed a specific checklist for Pull Request (PR) reviews, targeting the specific risks identified in the Test Plan (Cost Accuracy & API Security).

**General Criteria:**
- [ ] **Readability:** Variables use domain terms (e.g., `costPerMove`, not `cpm`).
- [ ] **Tests:** Every new feature includes at least one positive and one negative test case.
- [ ] **Security:** No secrets committed (checked via `git diff`).

**Specific Criteria (Risk-Based):**
- [ ] **Floating Point Math:** Any currency calculation must use `BigDecimal` or documented rounding logic.
- [ ] **API Contracts:** Any change to a Java DTO must have a corresponding change in the TypeScript Interface.
- [ ] **Defensive Coding:** Parsers must handle `null` or malformed inputs without crashing the thread.

### Sample Review Outcome
**Artifact:** Pull Request #12 "Fix Cost Precision"
**Issue Identified:** Original code used `double` for accumulation.
**Review Comment:** *"This implementation accumulates rounding errors on long paths. Please switch to BigDecimal or enforce rounding at the service boundary."*
**Resolution:** Developer (Self) refactored to use `Math.round()` on final output.

## 2. CI Pipeline Design (LO 5.2 & 5.3)

The pipeline is implemented using **GitHub Actions**. It is triggered on `push` to `main` and all `pull_request` events.

### Pipeline Stages
1.  **Build & Unit Test (Parallel):**
    *   **Backend:** Runs `mvn test` (JUnit).
    *   **Frontend:** Runs `npm test` (Jest).
2.  **Integration Test (Blocking):**
    *   Launches Spring Boot Backend.
    *   Waits for Health Check (`/api/v1/health`).
    *   Executes `backend-schema.test.ts` against the live local server.
3.  **Security Gate (Blocking):**
    *   Runs `security.test.ts` (Static Analysis).
    *   Scans for `sk-ant-` key patterns in build artifacts.
4.  **Report Generation:**
    *   Uploads Coverage Reports (JaCoCo + Istanbul) as artifacts.

## 3. Pipeline Demonstration (LO 5.4)

### Scenario A: The "Happy Path"
**Input:** Commit `7f3a2b` (Clean build).
**Result:** All jobs pass.
**Evidence:**
-   `Backend Unit Tests`: 2.1s, 22 passed.
-   `Frontend Schema Tests`: 18s, 21 passed.
-   **Status:** Green Checkmark.

### Scenario B: The "Broken Contract" (Interface Fault)
**Input:** Changed Java DTO field `cost` to `totalCost` without updating TypeScript.
**Pipeline Behavior:**
1.  **Unit Tests:** PASS (Java tests passed, TS unit tests passed).
2.  **Integration Step:** FAIL. `backend-schema.test.ts` failed: `Property 'cost' missing in response`.
3.  **Outcome:** PR blocked. Deployment prevented.
**Analysis:** This demonstrates the pipeline correctly identifies cross-component integration faults that unit tests miss.