# Test Planning Document

---

## 1. Priority and Prerequisites

This section identifies testing priorities and prerequisites for **four** requirements i've chosen to go into detail. As Per Y&P Ch3, we basically decompose these requirements to identify testable inputs, outputs, and invariants.

### FR1: Pathfinding Completeness (Integration Level, Critical Priority)
**Why Critical Priority:** This is the core function. Failure here renders the drones useless and risks safety (e.g., hitting No-Fly Zones). We allocate the highest resource testing here.

**Specification Decomposition:**
To apply the **Partition Principle** (Y&P Ch3), we decompose the pathfinder:
- **Inputs:** `Start_Coord`, `End_Coord`, `Grid_State` (including obstacles/no-fly zones).
- **Outputs:** `List<Position>` (Ordered sequence of nodes) OR `PathNotFoundException`.
- **Invariant:** The output path must be continuous (distance between steps ≤ step size) and strictly optimal (lowest cost).

**Testing Prerequisites:**
- Requires the `AStarPathfinder` algorithm implementation.
- Requires valid Geometry services (SR1) to calculate distances.
- **Approach:** Structural (White-box) testing targeting loop boundaries (0, 1, many iterations).

### FR2: Cost Calculation Accuracy (Unit Level, High Priority)
**Why High Priority:** Financial accuracy is essential for trust, though less safety-critical than FR1.

**Specification Decomposition:**
- **Inputs:** `Drone_Config` (Base Cost, Cost Per Move), `Path_Length` (Integer moves).
- **Outputs:** `Total_Cost` (BigDecimal).
- **Formula:** `Cost = Base + (Moves * Rate) + Landing_Fee`.
- **Invariant:** Cost must strictly increase with path length; cost cannot be negative.

**Testing Prerequisites:**
- Requires isolated component testing with mocked drone capabilities.
- Needs deterministic test data (known move counts).
- **Approach:** Functional Partition testing (Boundary values: 0 moves, 1000+ moves).

### FR10: Response Schema Compatibility (Integration Level, Medium Priority)
**Why Medium Priority:** Ensures the "Contract" between Backend (Java) and Frontend (TS) is valid. This is **Verification** (building the product right).

**Specification Decomposition:**
- **Inputs:** HTTP Request to `/api/v1/calculate-path` (Valid JSON Body).
- **Outputs:** HTTP Response (Status 200 OK + JSON Body).
- **Invariant:** The JSON keys and value types in the response must strictly match the TypeScript `DeliveryResponse` interface (e.g., camelCase `droneId`, not snake_case `drone_id`).

**Testing Prerequisites:**
- Requires both frontend TypeScript types and backend Java implementation.
- Real HTTP integration testing (mocks assume contract correctness).
- **Approach:** Automated Integration testing via custom harness.

### QA1: API Key Security (System Level, Critical Priority)
**Why Critical Priority:** Safety/Security property. Regulatory requirement to prevent data/credential leakage.

**Specification Decomposition:**
- **Inputs:** Production Build Artifacts (Minified JavaScript files in `.next/static/`).
- **Outputs:** Boolean Verification Result (Pass/Fail).
- **Invariant:** For all files in Artifacts, no string literal may match the Anthropic API key pattern (`sk-ant-\w+`).

**Testing Prerequisites:**
- Requires production build artifacts (`npm run build`).
- **Approach:** Static Analysis (scanning compiled code for regex patterns).

---

## 2. Scaffolding and Instrumentation

### FR1 Instrumentation (Pathfinding)
**Scaffolding Required:**
- **Graph Mocks:** Although we test integration, we need `AStarPathfinder` to run against a known grid (Graph) to verify it finds the *optimal* path, not just *any* path.
- **Visualization:** Debug output enabled in `PathServiceImpl` to print ASCII representations of the grid during failing tests.

**Instrumentation:** The `AStarPathfinder` class is instrumented with branch counters during JaCoCo execution to ensure we cover all edge relaxation cases (e.g., finding a better path to an already visited node).

**Adequacy:** White-box instrumentation is required here because functional tests alone cannot prove the algorithm is efficient, only that it arrives.

### FR2 Instrumentation (Cost)
**Scaffolding Required:**
- Mock factories for Drone objects with configurable costs.
- Mock geometry service returning predetermined path lengths.

**Instrumentation:** `PathServiceImpl` logs cost calculations during development.

**Adequacy:** Sufficient for unit testing. Integration testing (covered by FR1) validates cost calculations with real pathfinding.

### FR10 Instrumentation (Schema)
**Scaffolding Required:**
- **Auto-starting backend:** Node.js spawn process launching Maven Spring Boot.
- **Health check polling:** Fetch loop waiting for backend readiness.
- **BackendClient wrapper:** Provides fetch abstraction for TypeScript tests.

**Instrumentation:** `BackendClient` logs all HTTP requests/responses during testing to debug schema mismatches by inspecting actual API traffic.

**Adequacy:** Auto-starting backend is heavyweight (~6-7s startup) but necessary. Mocks would test our assumptions, not the real contract.

### QA1 Instrumentation (Security)
**Scaffolding Required:**
- Build process integration: Tests run `npm run build`.
- File system scanning: Recursive directory traversal.

**Instrumentation:** Tests instrument the build artifacts themselves, treating compiled JavaScript as the system under test.

---

## 3. Process and Lifecycle Integration

**Chosen Lifecycle:** Iterative development with continuous integration (Ch20).

### Early Testing (During Development)
**FR2 (Cost) & FR1 (Pathfinding Logic):** Execute on every file save via IDE.
- **FR2:** TDD workflow (write failing cost test, fix formula).
- **FR1:** Structural logic tests (e.g., ensuring A* handles a U-shaped obstacle) run quickly before full integration.

### Integration Testing (After Component Development)
**FR10 Schema Tests:** Execute after both frontend and backend components exist.
- Requires Backend API routes and Frontend types.
- Run on pre-commit hooks and CI. Slower (~6-7s).

### System Testing (Pre-Deployment)
**QA1 Security Tests:** Execute only on production builds.
- Gate preventing releases with exposed keys.

### Risk Analysis
**FR1 Risk (Critical):** Infinite loops in pathfinding if the heuristic is non-admissible (overestimates distance).
- *Mitigation:* Structural testing targets loop boundaries (0, 1, many iterations) per Y&P Ch12 to ensure termination.

**FR2 Risk:** Floating-point precision may cause flakiness.
- *Mitigation:* Use tolerance-based assertions (within £0.01).

**FR10 Risk:** Backend startup failure causes all tests to fail (false negatives).
- *Mitigation:* 90s timeout and distinct error messaging.

### Coverage Targets and Measurement Strategy

**Coverage Tools:** JaCoCo (Java), Istanbul (TypeScript).

**Target Metrics:**

| Component | Target | Rationale |
|-----------|--------|-----------|
| **FR1 (Pathfinding)** | **≥90% Instruction Coverage** | **Core Algorithm.** Logic errors here (e.g., wrong heuristic) are subtle. High structural coverage is required to ensure correctness. |
| FR2 (Cost calculation) | ≥70% Instruction Coverage | Standard business logic. |
| FR10 (Schema) | 100% Endpoint Coverage | Must verify all 3 endpoints (calculate, query, details). |
| QA1 (Security) | 100% Artifact Coverage | Must scan all production bundles. |

**Justification for Variation:** FR1 is complex algorithmic code requiring high white-box coverage (90%). FR2 is linear arithmetic, so 70% is sufficient. FR10 is interface testing, so "Lines of Code" is less relevant than "Endpoints Hit".

---

## 4. Omissions and Future Work

**Not Tested: FR4 (Conversational Parsing):** Requires real Claude API calls. Non-deterministic and expensive. Deferred to manual testing.

**Validation vs Verification:** All tests currently verify implementation correctness (Verification). User validation (Validation) of the conversational interface requires real user trials.

**Conscious Trade-offs:**
- **Mocking FR2** (Speed) vs **Real FR10** (Accuracy).
- **Static Security Scan** (Fast) vs **Runtime Penetration Testing** (Comprehensive).