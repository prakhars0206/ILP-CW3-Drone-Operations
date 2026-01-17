# Test Planning Document
**Project:** ILP CW3 - Drone Operations Dashboard  
**Student:** Prakhar Sangal (s2479386)  
**Date:** January 2026

---

## 1. Priority and Prerequisites

This section identifies testing priorities and prerequisites for three requirements demonstrating diverse testing needs.

### FR2: Cost Calculation Accuracy (Unit Level, High Priority)

**Why High Priority:** Financial accuracy is essential for budget planning. Incorrect costs erode trust and may cause hospital budget overruns. However, this is lower priority than safety-critical pathfinding since cost errors don't endanger patients.

**Testing Prerequisites:**
- Requires isolated component testing with mocked drone capabilities
- Needs deterministic test data (known move counts, known cost parameters)
- Fast feedback essential for TDD workflow during development
- Multiple test approaches: boundary value analysis (0 moves, 1000+ moves), floating-point precision testing

**Early Detection Strategy:** Unit tests run on every code change via IDE integration, catching errors within seconds rather than waiting for integration testing.

### FR10: Response Schema Compatibility (Integration Level, Medium Priority)

**Why Medium Priority:** Schema mismatches cause runtime crashes, but errors are caught early in development. This is verification (does backend match our interface?) rather than validation (does it meet user needs?).

**Testing Prerequisites:**
- Requires both frontend TypeScript types and backend Java implementation
- Real HTTP integration testing (mocks assume contract correctness)
- Backend must be running and accessible
- Multiple test approaches: type validation, structural testing, error response testing

**Risk:** Schema tests cannot detect semantic errors (e.g., cost calculation returning wrong value but valid type). This is accepted since FR2 unit tests cover semantic correctness.

### QA1: API Key Security (System Level, Critical Priority)

**Why Critical Priority:** Exposed API keys enable unauthorized usage costing thousands in API fees and violating service terms. This is a safety property with regulatory implications.

**Testing Prerequisites:**
- Requires production build artifacts (.next/static/ directory)
- Build process must complete successfully
- Pattern matching for key formats (sk-ant-api03-...)
- Multiple test approaches: static analysis, base64 detection, source map scanning

**Redundancy:** Both development practices (environment variables only) and automated detection provide independent assurance per Ch3 redundancy principle.

---

## 2. Scaffolding and Instrumentation

### FR2 Instrumentation

**Scaffolding Required:**
- Mock factories for Drone objects with configurable costs (initial, per-move, final)
- Mock geometry service returning predetermined path lengths
- Test data builders for creating delivery requests with known parameters

**Instrumentation:** PathServiceImpl logs cost calculations during development, allowing manual verification during debugging. This temporary instrumentation is removed before production.

**Adequacy:** Sufficient for unit testing. Integration testing (covered by FR1) validates cost calculations with real pathfinding.

### FR10 Instrumentation

**Scaffolding Required:**
- Auto-starting backend: Node.js spawn process launching Maven Spring Boot
- Health check polling: Fetch loop waiting for backend readiness (60s timeout)
- Cleanup handlers: Process.on('exit') ensuring backend shutdown
- BackendClient wrapper providing fetch abstraction

**Instrumentation:** BackendClient logs all HTTP requests/responses during testing:
```typescript
console.log(`🌐 Calling: ${url}`);
console.log(`📦 With data:`, JSON.stringify(data));
console.log(`📥 Response status: ${response.status}`);
```

This visibility (Ch3) allows debugging schema mismatches by inspecting actual API traffic.

**Adequacy Assessment:** Auto-starting backend is heavyweight (~6-7s startup) but necessary. Mocks would test our assumptions, not the real contract. Could be improved with Docker containers for faster startup, but current approach balances automation with simplicity.

### QA1 Instrumentation

**Scaffolding Required:**
- Build process integration: Tests run `npm run build` programmatically
- File system scanning: Recursive directory traversal of .next/static/
- Pattern matching: Regex for API key formats and base64 encoding

**Instrumentation:** Static analysis has no runtime instrumentation. Instead, tests instrument the build artifacts themselves, treating compiled JavaScript as the system under test.

**Adequacy:** Cannot detect obfuscated keys or keys split across chunks. Risk accepted since Anthropic keys have consistent format and are unlikely to be intentionally obfuscated.

---

## 3. Process and Lifecycle Integration

**Chosen Lifecycle:** Iterative development with continuous integration (Ch20). Requirements evolved through multiple iterations rather than waterfall specification.

### Early Testing (During Development)

**FR2 Unit Tests:** Execute on every file save via Jest watch mode. TDD workflow:
1. Write failing test for new cost formula edge case
2. Implement formula update
3. Verify all unit tests pass (<1s feedback)
4. Commit

**Timing:** Unit tests run continuously during coding phase. No dependencies on other components.

### Integration Testing (After Component Development)

**FR10 Schema Tests:** Execute after both frontend and backend components exist. Requires:
- Backend API routes implemented
- Frontend types defined
- Maven build working

**Timing:** Integration tests run on pre-commit hooks and in CI pipeline. Slower (~6-7s) than unit tests but catch interface evolution.

### System Testing (Pre-Deployment)

**QA1 Security Tests:** Execute only on production builds. Cannot run during development since Next.js dev mode doesn't generate .next/static/.

**Timing:** System tests run in CI pipeline before deployment. Gate preventing releases with exposed keys.

### Risk Analysis

**FR2 Risk:** Floating-point precision may cause flakiness. Mitigation: Use tolerance-based assertions (within £0.01) rather than exact equality.

**FR10 Risk:** Backend startup failure causes all tests to fail. Mitigation: Health check with clear error messages distinguishing "backend didn't start" from "schema mismatch".

**QA1 Risk:** Pattern matching may miss novel obfuscation techniques. Mitigation: Manual code review as redundant check. Accept risk since intentional key exposure is unlikely.

**Process Risk:** Auto-starting backend requires Maven on test machine. Mitigation: CI pipeline documents this dependency explicitly.

---

## 4. Omissions and Future Work

**Not Tested:** FR4 (conversational parsing) requires real Claude API calls with non-deterministic responses. No scaffolding can simulate LLM behavior. Deferred to manual testing due to cost and non-determinism.

**Improvement Opportunity:** FR10 could use contract testing (e.g., Pact) to generate schemas from backend, eliminating manual type synchronization. Current approach accepts manual maintenance overhead.

**Validation vs Verification:** All tests verify implementation correctness. User validation (does conversational interface meet needs?) requires usability testing with hospital staff, which is out of scope.