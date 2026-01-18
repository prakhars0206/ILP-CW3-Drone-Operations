# Testing Requirements

---

## Purpose

This document identifies testable requirements for systematic test planning. 
Requirements are selected to demonstrate diversity across:
- **Types:** Functional correctness, security, robustness, performance
- **Levels:** System, integration, unit
- **Test approaches:** Automated testing, static analysis, integration testing

---

## Stakeholder Context

**Primary Users:** Hospital logistics coordinators  
**Key Needs:** Plan deliveries conversationally, verify costs, understand errors

**Secondary Users:** System administrators  
**Key Needs:** Secure deployment, system monitoring

---

## Requirements Overview
| ID | Requirement | Description | Type | Level | Priority | **Testing Status** |
|----|-------------|-------------|------|-------|----------|-------------------|
| FR1 | Pathfinding completeness | Calculate valid, optimal flight paths for all orders using A*. | Functional | Integration | Critical | **Selected** |
| FR2 | Cost calculation accuracy | Calculate delivery costs with £0.01 precision using defined formula. | Functional | Unit | High | **Selected** |
| FR3 | Hover validation | Drone flight path must include a hover step within 150m of target. | Functional | Integration | Medium | **Selected** |
| FR4 | Conversational parsing | Parse natural language user commands into structured JSON intent. | Functional | System | Medium | Deferred* |
| FR5 | Multi-drone coordination | Coordinate multiple drones to handle high-capacity delivery batches. | Functional | Integration | Medium | **Selected** |
| FR8 | No-fly zone avoidance | Flight paths must never intersect with defined restricted zones. | Functional | Integration | Low | Deferred |
| FR9 | Time window calculation | Calculate flight duration to ensure delivery occurs within time slots. | Functional | Unit | Medium | Deferred |
| FR10 | Response schema compatibility | Backend JSON responses must strictly match Frontend TypeScript interfaces. | Functional | Integration | Medium | **Selected** |
| QA1 | API key security | Prevent exposure of Anthropic/ILP API keys in client-side bundles. | Security | System | Critical | **Selected** |
| QA2 | Animation performance | Map animations must maintain smooth framerate (60fps) under load. | Performance | System | Low | Deferred |
| QA3 | API retry reliability | System must retry failed API calls with exponential backoff. | Reliability | Integration | Medium | Deferred |
| QA4 | Location parser robustness | Accurately extract coordinates from text with spatial tolerance. | Robustness | Unit | Medium | **Selected** |
| QA5 | Cost parser robustness | Extract price and drone IDs correctly from AI textual responses. | Robustness | Unit | Medium | **Selected** |
| SR1 | Geometry calculations | Provide accurate Haversine distance and next-position calculations. | Supporting | Unit | Medium | **Selected** |
| SR2 | REST API compliance | API endpoints must return standard HTTP status codes (200, 404, 500). | Supporting | Unit | Medium | **Selected** |

*\*FR4 end-to-end testing with Claude is deferred; internal parser logic is covered under QA4/QA5.*

---

## Selection Rationale: Why i chose these 10 Requirements?

**Risk-Based Prioritization:** From 18 identified requirements, 10 were selected for testing based on risk assessment combining **severty** (impact of failure) and the **feasibility** (can we test this effectively?) .

**Selected for Testing (10):**
- **Critical risk, high feasibility:** FR1 (patient safety), QA1 (financial/security)
- **High risk, high feasibility:** FR2 (financial accuracy), FR10 (runtime crashes)
- **Medium risk, demonstrates diversity:** FR3, FR5 (integration level), QA4, QA5 (robustness), SR1, SR2 (supporting)

**Deferred (8):**
- **High cost/infeasibility:** FR4 (requires real Claude API calls which costs money to do effectively, non-deterministic)
- **Low priority given time constraints:** FR8 (complex geometry), FR9 (not implemented), QA2 (instrumentation overhead), QA3 (network fault injection)

**Diversity Goal:** Selected requirements span all test types (unit/integration/system), all requirement types (functional/security/robustness), ensuring portfolio demonstrates breadth as per the LO1 criteria.

**Time Budget:** 10 requirements chosen due to the50 hour coursework constraint


---

## Detailed Requirements

### FR1: Pathfinding Completeness (Integration, Critical)

**Description:** System must generate complete flight paths for all requested deliveries.

**Why Critical:** Incomplete paths means undelivered medication = patient safety risk

**Test Approach:**
- Integration tests calling real backend pathfinding service
- Verify output delivery count matches input request count
- Test with 1-5 deliveries per request

**Limitations:**
- Cannot test real drone hardware constraints
- Assumes backend A* algorithm is correct (tested separately)
- Performance testing limited to localhost (not production load)

**Tests:** PathServiceImplTest.java (integration tests)

---

### FR2: Cost Calculation Accuracy (Unit, High)

**Description:** Delivery costs must be accurate to £0.01 using formula:  
`Cost = Initial + (Moves × CostPerMove) + Final`

**Why Important:** Financial accuracy required for budget planning

**Test Approach:**
- Unit tests with isolated cost calculation logic
- Mock drone capabilities and path lengths
- Boundary value analysis (0 moves, 1000+ moves)

**Limitations:**
- Floating-point precision may cause rounding (tested to £0.01 tolerance)
- Does not test currency conversion or tax calculations

**Tests:** PathServiceImplUnitTest.java ( unit tests)

---

### FR3 & FR5: Advanced Flight Logic (Integration, Medium)

**FR3 - Hover Validation:**
- **Description:** Flight paths must include a hover step within 150m of the target.
- **Test Approach:** Integration test verifying the geometric distance between the last flight point and the delivery target.

**FR5 - Multi-drone Coordination:**
- **Description:** Requests exceeding single drone capacity (e.g., >5kg) must be split across multiple drones.
- **Test Approach:** Integration test submitting a heavy payload and asserting that `dronePaths` list size > 1.

**Tests:** PathServiceImplTest.java (Covered in existing integration suite).

---

### FR10: Response Schema Compatibility (Integration, Medium)

**Description:** Backend API responses must match frontend TypeScript schemas

**Why Important:** Schema mismatches cause runtime errors and crashes

**Test Approach:**
- **Auto-starting backend** - Tests launch Spring Boot, verify schemas, cleanup
- Real HTTP integration testing (not mocks)
- Validate response structure against TypeScript types

**Limitations:**
- Tests schema structure, not backend business logic
- Requires backend to be buildable (Maven dependency)
- Slower than unit tests (~6-7 seconds)

**Tests:** backend-schema.test.ts (integration tests using the real backend)

---

### QA1: API Key Security (System, Critical)

**Description:** Anthropic API keys must never appear in client-side JavaScript

**Why Critical:** Exposed keys = unauthorized usage = $1000s in API costs

**Test Approach:**
- System tests scanning production build artifacts
- Regex pattern matching for key formats
- Base64 encoding detection
- Source map analysis

**Limitations:**
- Cannot detect obfuscated or encrypted keys
- Assumes key format remains `sk-ant-api03-...`
- Does not test network request inspection

**Tests:** security.test.ts ( system tests)

---

### QA4 & QA5: Parser Robustness (Unit, Medium)

**QA4 - Location Parser:**
- Handles coordinates within/outside tolerance (220m)
- Edge cases: invalid input, out-of-range coordinates

**QA5 - Cost Parser:**
- Extracts costs from conversational responses
- Handles singular/plural drone references
- Missing data returns null (not crash)

**Test Approach:**
- Pure unit tests (isolated functions, no I/O)
- Boundary value analysis
- Invalid input handling

**Limitations:**
- Cannot test Claude API's actual conversational output
- Regex patterns may not cover future phrasing changes
- Assumes response formats remain consistent

**Tests:** parsers.test.ts (comprehensive unit tests)

---

### Supporting Requirements (SR1, SR2)

**SR1: Geometry Service** - Distance calculations, coordinate validation  
**SR2: REST API Compliance** - HTTP status codes, JSON schema validation

These support the functional requirements above and are tested via:
- GeometryServiceImplTest.java (12 unit tests)
- ServiceControllerTest.java (6 unit tests)

---

## Requirements NOT Tested (Deferred)

| ID | Requirement | Why Deferred |
|----|-------------|--------------|
| FR4 | Conversational parsing | Requires real Claude API calls ($$ cost) |
| FR8 | No-fly zone avoidance | Complex geometry, low priority |
| FR9 | Time window calculation | Not implemented yet |
| QA2 | Animation performance | Complex instrumentation, time constraint |
| QA3 | API retry reliability | Would require network fault injection |

**Rationale:** Time-boxed project focused on demonstrating test diversity and critical paths

---

## Test Approach Summary

### Unit Tests
- **Technique:** Isolated function testing with mocks
- **Tools:** JUnit + Mockito (backend), Jest (frontend)
- **Coverage:** Cost calculation, geometry, parsers
- **Ch3 Principles Applied:**
  - **Partition:** Isolated components test independently (FR2, QA4, QA5)
  - **Visibility:** Fast feedback (<1s) enables immediate error detection
- **Strengths:** Fast (<1s), deterministic, easy to debug
- **Limitations:** Don't test integration between components

### Integration Tests
- **Technique:** Multi-component testing with real dependencies
- **Tools:** @SpringBootTest (backend), auto-starting backend (frontend)
- **Coverage:** Pathfinding, hover validation, schema compatibility
- **Ch3 Principles Applied:**
  - **Redundancy:** FR10 tests real HTTP contract (not mock assumptions)
  - **Sensitivity:** FR1 fails consistently if pathfinding broken
- **Strengths:** Tests real component interactions
- **Limitations:** Slower (~6-7s), requires backend running

### System Tests
- **Technique:** End-to-end production artifact testing
- **Tools:** Static analysis, file scanning
- **Coverage:** Security (API key exposure)
- **Ch3 Principles Applied:**
  - **Redundancy:** QA1 combines development practices (env vars) + automated detection
  - **Restriction:** Tests production builds only (simpler scope than runtime)
- **Strengths:** Tests actual deployment artifacts
- **Limitations:** Cannot test runtime behavior

---

## Limitations & Trade-offs

### Cannot Test Without Real Infrastructure:
- **Claude API behavior** - Costs actual money per test, non-deterministic LLM
- **Production load** - No access to real hospital traffic data
- **Real drones** - Hardware constraints not modeled

### Conscious Trade-offs:
- **Mocking over real backend** for unit tests (speed vs realism)
- **Auto-starting backend** for integration tests (completeness vs complexity)
- **Static analysis** for security (fast vs comprehensive)

### Risk Acceptance:
- Some schema drift may occur between backend updates
- LLM parsing quality cannot be automatically tested