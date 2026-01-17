# Evaluation and Limitations Report
**Project:** ILP CW3 - Drone Operations Dashboard
**Student:** Prakhar Sangal (s2479386)

## 1. Gap Analysis (Omissions)

### Gap A: The "Oracle Problem" in AI Testing (FR4)
**Requirement:** FR4 (Conversational Parsing).
**Omission:** No automated tests verify that Claude AI correctly parses natural language into JSON.
**Why:**
1.  **Non-Determinism:** Large Language Models (LLMs) are non-deterministic. The input "Send meds to sudden valley" might return valid JSON once and slightly different phrasing the next time. Standard unit assertions (`assertEquals`) fail here.
2.  **Cost:** Automated testing against the Anthropic API incurs financial cost per run.
**Impact:** We rely entirely on manual acceptance testing for the core UI features. This is a significant regression risk.

### Gap B: Availability Service Coverage
**Requirement:** FR5 (Multi-drone coordination).
**Omission:** The `AvailabilityService` has 1% coverage.
**Why:** Time constraints forced a prioritization of the Pathfinding algorithm (Critical) over the Availability logic (High).
**Impact:** Logic errors in drone scheduling (e.g., double-booking a drone) will not be caught until integration or production.

## 2. Statistical Evaluation: Fault Injection (Mutation Analysis)
To evaluate the **adequacy** of the FR2 (Cost) test suite beyond simple code coverage (Y&P Ch9), I performed a manual **Fault Injection** experiment (Y&P Ch16).

**Method:** I introduced 5 deliberate syntax mutations (bugs) into `PathServiceImpl.java` and checked if the existing test suite detected (killed) them.

| ID | Mutation Type | Code Change | Expected Result | Actual Result | Status |
|----|---------------|-------------|-----------------|---------------|--------|
| M1 | Arithmetic | `total + cost` $\to$ `total - cost` | Test Fail | Test Failed | **Killed** |
| M2 | Boundary | `moves > 0` $\to$ `moves >= 0` | Test Fail | Test Failed | **Killed** |
| M3 | Constant | `baseCost = 1.0` $\to$ `baseCost = 0.0` | Test Fail | Test Failed | **Killed** |
| M4 | Logic | `if(cooling)` $\to$ `if(!cooling)` | Test Fail | Test Failed | **Killed** |
| M5 | Precision | `Math.round` $\to$ `(removed)` | Test Fail | Test Failed | **Killed** |

**Outcome:** The Mutation Score is **100% (5/5)**.
**Conclusion:** The FR2 test suite is robust. It is sensitive enough to detect small logic errors, validating that the 70% coverage target is effectively finding faults.

## 3. Adequacy of Targets vs. Actuals

| Component | Metric | Target | Actual | Deviation Analysis |
|-----------|--------|--------|--------|--------------------|
| **FR1 (Pathfinding)** | Instruction Cov | 90% | 95% | **+5%**: Exceeded target. High confidence in safety-critical logic. |
| **FR2 (Cost)** | Instruction Cov | 70% | 73% | **+3%**: Met target. Validated via Mutation Analysis (above). |
| **System Wide** | Instruction Cov | 70% | 65% | **-5%**: Missed target. Caused by the `AvailabilityService` omission. |
| **FR10 (API)** | Endpoint Cov | 100% | 100% | **Met**: All endpoints respond correctly to valid/invalid inputs. |

## 4. Environment Limitations
All testing was performed in a **Localhost** environment (Y&P Ch22).
1.  **Network Latency:** Localhost does not simulate real-world API delays from Anthropic (California servers).
2.  **Concurrency:** Tests ran sequentially. Production will face concurrent requests, potentially exposing thread-safety issues in `PathServiceImpl` that current tests miss.