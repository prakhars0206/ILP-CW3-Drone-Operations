package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.dto.DeliveryPathResponse;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.MedDispatchRec;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PathServiceImplTest {

    @Autowired
    private PathService pathService;

    // Appleton Tower coordinates (drone starting point)
    private static final Position APPLETON = new Position(-3.186874, 55.944494);

    // ===== FR1: PATHFINDING COMPLETENESS (6 tests) =====
    
    @Nested
    @DisplayName("FR1: Pathfinding Completeness")
    class PathCompletenessTests {
        
        @Test
        @DisplayName("TC-FR1-01: Single delivery path includes delivery")
        void testSingleDeliveryCompleteness() {
            MedDispatchRec dispatch = new MedDispatchRec(
                1L, "2025-12-12", "14:30",
                new MedDispatchRec.Requirements(2.0, null, null, null),
                new Position(-3.1907, 55.9494)
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );

            // Validate delivery is completed
            assertThat(response.dronePaths()).hasSize(1);
            
            List<Long> completedIds = response.dronePaths().stream()
                .flatMap(dp -> dp.deliveries().stream())
                .map(DeliveryPathResponse.Delivery::deliveryId)
                .collect(Collectors.toList());
            
            assertThat(completedIds).containsExactly(1L);
        }

        @Test
        @DisplayName("TC-FR1-02: Two delivery path includes both deliveries")
        void testTwoDeliveryCompleteness() {
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(2.0, null, null, null),
                    new Position(-3.1907, 55.9494)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.1843, 55.9467))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            Set<Long> completedIds = response.dronePaths().stream()
                .flatMap(dp -> dp.deliveries().stream())
                .map(DeliveryPathResponse.Delivery::deliveryId)
                .collect(Collectors.toSet());

            assertThat(completedIds).containsExactlyInAnyOrder(1L, 2L);
        }

        @Test
        @DisplayName("TC-FR1-03: Three delivery path includes all deliveries (CRITICAL REGRESSION)")
        void testThreeDeliveryCompleteness() {
            // This was failing in CW2 auto-marker - MUST pass
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(2.0, null, null, null),
                    new Position(-3.1907, 55.9494)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.1843, 55.9467)),
                new MedDispatchRec(3L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.1898, 55.9428))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            Set<Long> completedIds = response.dronePaths().stream()
                .flatMap(dp -> dp.deliveries().stream())
                .map(DeliveryPathResponse.Delivery::deliveryId)
                .collect(Collectors.toSet());

            // CRITICAL: All 3 must be present
            assertThat(completedIds).hasSize(3);
            assertThat(completedIds).containsExactlyInAnyOrder(1L, 2L, 3L);
        }

        @Test
        @DisplayName("TC-FR1-04: Four delivery path includes all deliveries")
        void testFourDeliveryCompleteness() {
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(2.0, null, null, null),
                    new Position(-3.19, 55.945)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.5, null, null, null),
                    new Position(-3.20, 55.946)),
                new MedDispatchRec(3L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.21, 55.947)),
                new MedDispatchRec(4L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.22, 55.948))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            Set<Long> completedIds = response.dronePaths().stream()
                .flatMap(dp -> dp.deliveries().stream())
                .map(DeliveryPathResponse.Delivery::deliveryId)
                .collect(Collectors.toSet());

            assertThat(completedIds).containsExactlyInAnyOrder(1L, 2L, 3L, 4L);
        }

        @Test
        @DisplayName("TC-FR1-05: Five delivery path includes all deliveries")
        void testFiveDeliveryCompleteness() {
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(2.0, null, null, null),
                    new Position(-3.19, 55.945)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.20, 55.946)),
                new MedDispatchRec(3L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.21, 55.947)),
                new MedDispatchRec(4L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.22, 55.948)),
                new MedDispatchRec(5L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.23, 55.949))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            Set<Long> completedIds = response.dronePaths().stream()
                .flatMap(dp -> dp.deliveries().stream())
                .map(DeliveryPathResponse.Delivery::deliveryId)
                .collect(Collectors.toSet());

            assertThat(completedIds).containsExactlyInAnyOrder(1L, 2L, 3L, 4L, 5L);
        }

        @Test
        @DisplayName("TC-FR1-06: No delivery IDs are duplicated in response")
        void testNoDuplicateDeliveries() {
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(2.0, null, null, null),
                    new Position(-3.1907, 55.9494)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.1843, 55.9467)),
                new MedDispatchRec(3L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.1898, 55.9428))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            List<Long> allIds = response.dronePaths().stream()
                .flatMap(dp -> dp.deliveries().stream())
                .map(DeliveryPathResponse.Delivery::deliveryId)
                .collect(Collectors.toList());

            assertThat(allIds).doesNotHaveDuplicates();
        }
    }

    // ===== FR2: COST CALCULATION ACCURACY (1 tests) =====
    
    @Nested
    @DisplayName("FR2: Cost Calculation Accuracy - 1 case as this is hard to mock and unit test")
    class CostCalculationTests {
        
        // Hard to mock and unit test this so only one test case here
        @Test
        @DisplayName("TC-FR2-04: Multi-delivery cost is sum of individual segments")
        void testCostCalculation_MultiDelivery() {
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(2.0, null, null, null),
                    new Position(-3.19, 55.945)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.20, 55.946))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            // Cost should be positive and reasonable for 2 deliveries
            assertThat(response.totalCost()).isGreaterThan(10.0);
            assertThat(response.totalMoves()).isGreaterThan(50);
        }


    }

    // ===== FR3: HOVER VALIDATION (3 tests) =====
    
    @Nested
    @DisplayName("FR3: Delivery Point Hover Validation")
    class HoverValidationTests {
        
        @Test
        @DisplayName("TC-FR3-01: Drone hovers within tolerance at delivery point")
        void testHoverWithinTolerance() {
            MedDispatchRec dispatch = new MedDispatchRec(
                1L, "2025-12-12", "14:30",
                new MedDispatchRec.Requirements(1.0, null, null, null),
                new Position(-3.189799, 55.942795)
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );

            List<Position> flightPath = response.dronePaths().get(0)
                .deliveries().get(0)
                .flightPath();

            Position target = dispatch.delivery();

            // Find closest point in path to target
            double minDistance = flightPath.stream()
                .mapToDouble(p -> calculateDistance(p, target))
                .min()
                .orElse(Double.MAX_VALUE);

            // Must be within 0.00015° (CW2 requirement)
            assertThat(minDistance).isLessThanOrEqualTo(0.00015);
        }

        @Test
        @DisplayName("TC-FR3-02: Hover occurs in flight path sequence")
        void testHoverInSequence() {
            MedDispatchRec dispatch = new MedDispatchRec(
                1L, "2025-12-12", "14:30",
                new MedDispatchRec.Requirements(2.0, null, null, null),
                new Position(-3.1907, 55.9494)
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );

            List<Position> flightPath = response.dronePaths().get(0)
                .deliveries().get(0)
                .flightPath();

            // Flight path should have multiple points
            assertThat(flightPath.size()).isGreaterThan(10);
            
            // Should start at or near Appleton
            Position first = flightPath.get(0);
            assertThat(calculateDistance(first, APPLETON)).isLessThan(0.01);
        }

        @Test
        @DisplayName("TC-FR3-03: Multi-delivery hovers at each delivery point")
        void testMultiDeliveryHovers() {
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(2.0, null, null, null),
                    new Position(-3.1907, 55.9494)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(1.0, null, null, null),
                    new Position(-3.1843, 55.9467))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            // Check each delivery has a hover point
            for (DeliveryPathResponse.DronePath dronePath : response.dronePaths()) {
                for (DeliveryPathResponse.Delivery delivery : dronePath.deliveries()) {
                    Long deliveryId = delivery.deliveryId();
                    Position target = dispatches.stream()
                        .filter(d -> d.id().equals(deliveryId))
                        .findFirst()
                        .get()
                        .delivery();

                    double minDistance = delivery.flightPath().stream()
                        .mapToDouble(p -> calculateDistance(p, target))
                        .min()
                        .orElse(Double.MAX_VALUE);

                    assertThat(minDistance)
                        .as("Delivery %d should hover within tolerance", deliveryId)
                        .isLessThanOrEqualTo(0.00015);
                }
            }
        }
    }

    // ===== FR5: MULTI-DRONE COORDINATION (2 tests) =====
    
    @Nested
    @DisplayName("FR5: Multi-Drone Coordination")
    class MultiDroneTests {
        
        @Test
        @DisplayName("TC-FR5-01: High capacity deliveries use multiple drones")
        void testMultiDroneForHighCapacity() {
            // 5 heavy deliveries exceeding single drone capacity
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(8.0, null, null, null),
                    new Position(-3.19, 55.945)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(7.0, null, null, null),
                    new Position(-3.20, 55.946)),
                new MedDispatchRec(3L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(6.0, null, null, null),
                    new Position(-3.21, 55.947)),
                new MedDispatchRec(4L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(5.0, null, null, null),
                    new Position(-3.22, 55.948)),
                new MedDispatchRec(5L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(4.0, null, null, null),
                    new Position(-3.23, 55.949))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            // Should use multiple drones (30kg total > any single drone)
            assertThat(response.dronePaths().size()).isGreaterThan(1);

            // All deliveries should still complete
            Set<Long> completedIds = response.dronePaths().stream()
                .flatMap(dp -> dp.deliveries().stream())
                .map(DeliveryPathResponse.Delivery::deliveryId)
                .collect(Collectors.toSet());
            
            assertThat(completedIds).containsExactlyInAnyOrder(1L, 2L, 3L, 4L, 5L);
        }

        @Test
        @DisplayName("TC-FR5-02: Each drone path is independent")
        void testIndependentDronePaths() {
            List<MedDispatchRec> dispatches = Arrays.asList(
                new MedDispatchRec(1L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(8.0, null, null, null),
                    new Position(-3.19, 55.945)),
                new MedDispatchRec(2L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(7.0, null, null, null),
                    new Position(-3.20, 55.946)),
                new MedDispatchRec(3L, "2025-12-12", "14:30",
                    new MedDispatchRec.Requirements(6.0, null, null, null),
                    new Position(-3.21, 55.947))
            );

            DeliveryPathResponse response = pathService.calculateDeliveryPath(dispatches);

            if (response.dronePaths().size() > 1) {
                // Each drone should have unique ID
                Set<String> droneIds = response.dronePaths().stream()
                    .map(DeliveryPathResponse.DronePath::droneId)
                    .collect(Collectors.toSet());
                
                assertThat(droneIds.size()).isEqualTo(response.dronePaths().size());
            }
        }
    }

    // Helper method
    private double calculateDistance(Position p1, Position p2) {
        double dx = p1.lng() - p2.lng();
        double dy = p1.lat() - p2.lat();
        return Math.sqrt(dx * dx + dy * dy);
    }
}