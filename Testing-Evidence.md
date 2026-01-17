# Testing Evidence and Results
**Project:** ILP CW3 - Drone Operations Dashboard
**Student:** Prakhar Sangal (s2479386)

## 1. Execution Summary
Testing was conducted against the `main` branch (commit `7f3a2b`) on January 16, 2026.

| Test Level | Tool | Requirements Covered | Tests Executed | Pass | Fail | Execution Time |
|------------|------|----------------------|----------------|------|------|----------------|
| **Unit** | JUnit 5 / Jest | FR2, SR1, QA4, QA5 | 49 | 49 | 0 | 4.2s |
| **Integration** | SpringBootTest / Custom | FR1, FR5, FR10, SR2 | 20 | 20 | 0 | 18.5s |
| **System** | Static Analysis (Script) | QA1 | 17 | 17 | 0 | 2.1s |
| **Total** | | **10 Requirements** | **86** | **86** | **0** | **~25s** |

---

## 2. Structural Coverage Results (Code Coverage)
Coverage was measured using **JaCoCo** (Backend) and **Jest/Istanbul** (Frontend).

### 2.1 Critical Backend Components (Algorithm Logic)
We targeted high structural coverage for complex logic per **Y&P Ch12**, specifically focusing on the A* Pathfinding and Geometry services.

| Class | Element | Coverage | Complexity (Cxty) | Analysis |
|-------|---------|----------|-------------------|----------|
| `AStarPathfinder` | **Instructions** | **95%** | 19 | **Excellent.** High coverage achieved on complex pathfinding logic. |
| `AStarPathfinder` | Branches | 92% | | Missed branches relate to theoretical `null` nodes that cannot occur in valid grids. |
| `GeometryServiceImpl` | Instructions | 98% | 43 | **Excellent.** 67/67 lines covered. Validates SR1 geometry calculations. |
| `PathServiceImpl` | Instructions | 73% | 57 | **Good.** Logic (Greedy sort) is 100%, but JSON transformation boilerplate (`calculateDeliveryPathAsGeoJson`) was skipped (0%). |

### 2.2 Peripheral Components (Gaps)
| Class | Element | Coverage | Analysis |
|-------|---------|----------|----------|
| `AvailabilityService` | Instructions | **1%** | 51 | **Fail.** Component was mocked in PathService tests but never tested in isolation. Gap identified for future work. |
| `DroneServiceImpl` | Instructions | 60% | 77 | **Fair.** Basic CRUD operations covered; edge cases in update logic missed. |

### 2.3 Frontend Integration Scaffolding
| File | Statements | Branches | Analysis |
|------|------------|----------|----------|
| `backend-launcher.ts` | 80% | 50% | **High.** Validates the custom test harness works reliably. |
| `backend-client.ts` | 54% | 57% | **Moderate.** Error handling branches (network timeouts) proved difficult to simulate in CI. |

---

## 3. Technique Application & Yield
We applied three distinct techniques to different parts of the system.

### Technique A: Functional Partition Testing (FR2 - Cost Calculation)
**Approach:** Applied **Y&P Ch10 Partitioning**. We identified input variables (moves, base cost) and partitioned them into 'Nominal', 'Boundary', and 'Error' classes.
**Yield:** Identified 1 defect (Defect #1).

### Technique B: Flowgraph/Path Testing (FR1 - Pathfinding)
**Approach:** Applied **Y&P Ch14** principles. The grid is a graph; we tested paths to force loop iterations (0, 1, many loops).
**Yield:** Verified A* optimality. No functional defects found, but performance overhead noted.

### Technique C: Automated Integration (FR10 - Schema)
**Approach:** Used the `backend-launcher` to enforce contract compliance between TS types and Java Records.
**Yield:** Identified 1 critical blocking defect (Defect #2).

---

## 4. Defect Reports (Sample)
The following issues were identified and resolved during the testing phase.

### Defect #1: Floating Point Accumulation Error
*   **Requirement:** FR2 (Cost Calculation)
*   **Technique:** Unit / Boundary Value Analysis
*   **Description:** When calculating costs for paths > 100 moves, `float` addition resulted in `£104.00000004`.
*   **Fix:** Changed cost variables from `double` to `BigDecimal` (Java) and applied `Math.round` logic in Frontend.
*   **Verification:** Added Unit Test `testLongPathCostPrecision()`.

### Defect #2: JSON Field Mismatch Crash
*   **Requirement:** FR10 (Schema Compatibility)
*   **Technique:** Integration (Auto-starting backend)
*   **Description:** Backend sent `drone_id` (snake_case) but Frontend expected `droneId` (camelCase). Caused frontend crash on startup.
*   **Fix:** Added `@JsonProperty("droneId")` annotation to Java DTOs.
*   **Verification:** `backend-schema.test.ts` now passes.

---

## 5. Evaluation against Targets
| Metric | Target | Achieved | Status | Justification |
|--------|--------|----------|--------|---------------|
| **Statement Coverage (Core)** | ≥70% | 95% | **Exceeded** | Critical pathfinding logic is fully verified. |
| **Statement Coverage (Overall)**| ≥70% | 65% | **Missed** | Dragged down by `AvailabilityService` (1%). |
| **Endpoint Coverage** | 100% | 100% | **Met** | All 3 endpoints tested via `backend-client`. |
| **Security Artifact Scan** | 100% | 100% | **Met** | All build chunks scanned. |