package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.client.IlpRestClient;
import ILP.coursework.ILP.coursework1.dto.*;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PathServiceImpl Unit Tests")
class PathServiceImplUnitTest {

    @Mock
    private DroneService droneService;
    
    @Mock
    private GeometryService geometryService;
    
    @Mock
    private IlpRestClient ilpRestClient;
    
    @Mock
    private AStarPathfinder pathfinder;
    
    @InjectMocks
    private PathServiceImpl pathService;
    
    // Test data
    private Drone testDrone;
    private Drone precisionDrone;
    private Drone expensiveDrone;
    private ServicePoint testServicePoint;
    private DroneForServicePoint[] droneAvailability;

    @BeforeEach
    void setUp() {
        // Create test drones
        testDrone = new Drone(
            "test-drone-1",
            "Test Drone",
            new Drone.Capability(
                false, false, 10.0, 1000, 
                0.05,  // 5p per move
                1.00,  // £1 initial
                2.00   // £2 final
            )
        );
        
        precisionDrone = new Drone(
            "precision-drone",
            "Precision Test",
            new Drone.Capability(false, false, 10.0, 1000, 
                0.03,  // 3p per move
                1.00, 2.00)
        );
        
        expensiveDrone = new Drone(
            "expensive-drone",
            "Expensive Drone",
            new Drone.Capability(false, false, 10.0, 1000,
                0.10,  // 10p per move
                2.00,  // £2 initial
                3.00)  // £3 final
        );
        
        testServicePoint = new ServicePoint(
            1L,
            "Appleton Tower",
            new Position(-3.186874, 55.944494)
        );
        
        // Setup drone availability - THIS IS CRITICAL
        droneAvailability = new DroneForServicePoint[]{
            new DroneForServicePoint(
                1L,  // Service point ID
                List.of(
                    new DroneForServicePoint.DroneAvailability(
                        "test-drone-1",
                        List.of(new DroneForServicePoint.Availability(
                            "FRIDAY", "09:00", "17:00"
                        ))
                    ),
                    new DroneForServicePoint.DroneAvailability(
                        "precision-drone",
                        List.of(new DroneForServicePoint.Availability(
                            "FRIDAY", "09:00", "17:00"
                        ))
                    ),
                    new DroneForServicePoint.DroneAvailability(
                        "expensive-drone",
                        List.of(new DroneForServicePoint.Availability(
                            "FRIDAY", "09:00", "17:00"
                        ))
                    )
                )
            )
        };
        
        // Mock ILP client - ALWAYS return these
        when(ilpRestClient.getRestrictedAreas()).thenReturn(new RestrictedArea[0]);
        when(ilpRestClient.getServicePoints()).thenReturn(new ServicePoint[]{testServicePoint});
        when(ilpRestClient.getDronesForServicePoints()).thenReturn(droneAvailability);
    }

    @Nested
    @DisplayName("FR2: Cost Calculation (Unit Level)")
    class CostCalculationUnitTests {
        
        @Test
        @DisplayName("TC-FR2-UNIT-01: Cost formula with small number of moves")
        void testCostFormula_SmallPath() {
            Position start = testServicePoint.location();
            Position delivery = new Position(-3.19, 55.945);
            
            // Setup mocks for THIS test
            setupMocksForDrone("test-drone-1", testDrone, start, delivery, 5, 4);
            
            // Execute test
            JsonDtos.MedDispatchRec dispatch = createDispatch(1L, 2.0, delivery);
            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );
            
            // Verify: 5 + 1 (hover) + 3 = 9 positions = 8 moves
            // Cost = 1.00 + (8 * 0.05) + 2.00 = 3.40
            assertThat(response.totalMoves()).isEqualTo(8);
            assertThat(response.totalCost()).isCloseTo(3.40, 
                org.assertj.core.api.Assertions.offset(0.01));
        }
        
        @Test
        @DisplayName("TC-FR2-UNIT-02: Cost formula with medium path")
        void testCostFormula_MediumPath() {
            Position start = testServicePoint.location();
            Position delivery = new Position(-3.20, 55.946);
            
            setupMocksForDrone("test-drone-1", testDrone, start, delivery, 25, 25);
            
            JsonDtos.MedDispatchRec dispatch = createDispatch(1L, 3.0, delivery);
            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );
            
            // 25 + 1 + 24 = 50 positions = 49 moves
            // Cost = 1.00 + (49 * 0.05) + 2.00 = 5.45
            assertThat(response.totalMoves()).isEqualTo(49);
            assertThat(response.totalCost()).isCloseTo(5.45, 
                org.assertj.core.api.Assertions.offset(0.01));
        }
        
        @Test
        @DisplayName("TC-FR2-UNIT-03: Floating-point precision validation")
        void testCostFormula_FloatingPointPrecision() {
            Position start = testServicePoint.location();
            Position delivery = new Position(-3.21, 55.947);
            
            setupMocksForDrone("precision-drone", precisionDrone, start, delivery, 50, 50);
            
            JsonDtos.MedDispatchRec dispatch = createDispatch(1L, 2.0, delivery);
            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );
            
            // 50 + 1 + 49 = 100 positions = 99 moves
            // Cost = 1.00 + (99 * 0.03) + 2.00 = 5.97
            assertThat(response.totalMoves()).isEqualTo(99);
            assertThat(response.totalCost()).isCloseTo(5.97, 
                org.assertj.core.api.Assertions.offset(0.01));
            
            // Verify proper rounding
            double roundedCost = Math.round(response.totalCost() * 100.0) / 100.0;
            assertThat(response.totalCost()).isCloseTo(roundedCost, 
                org.assertj.core.api.Assertions.offset(0.001));
        }
        
        @Test
        @DisplayName("TC-FR2-UNIT-04: Cost calculation with expensive drone")
        void testCostFormula_DifferentDrone() {
            Position start = testServicePoint.location();
            Position delivery = new Position(-3.22, 55.948);
            
            setupMocksForDrone("expensive-drone", expensiveDrone, start, delivery, 10, 10);
            
            JsonDtos.MedDispatchRec dispatch = createDispatch(1L, 1.0, delivery);
            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );
            
            // 10 + 1 + 9 = 20 positions = 19 moves
            // Cost = 2.00 + (19 * 0.10) + 3.00 = 6.90
            assertThat(response.totalMoves()).isEqualTo(19);
            assertThat(response.totalCost()).isCloseTo(6.90, 
                org.assertj.core.api.Assertions.offset(0.01));
        }
        
        @Test
        @DisplayName("TC-FR2-UNIT-05: Minimal path cost calculation")
        void testCostFormula_MinimalPath() {
            Position start = testServicePoint.location();
            Position delivery = new Position(start.lng() + 0.0001, start.lat() + 0.0001);
            
            setupMocksForDrone("test-drone-1", testDrone, start, delivery, 2, 2);
            
            JsonDtos.MedDispatchRec dispatch = createDispatch(1L, 1.0, delivery);
            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );
            
            // 2 + 1 + 1 = 4 positions = 3 moves
            // Cost = 1.00 + (3 * 0.05) + 2.00 = 3.15
            assertThat(response.totalMoves()).isEqualTo(3);
            assertThat(response.totalCost()).isCloseTo(3.15, 
                org.assertj.core.api.Assertions.offset(0.01));
        }

        @Test
        @DisplayName("TC-FR1-UNIT-06: Verifies cost calculation for U-shaped obstacle detour")
        void testCostCalculation_UShapedObstacle() {
            Position start = testServicePoint.location();
            // A destination close by "as the crow flies", but behind a wall
            Position delivery = new Position(start.lng() + 0.00015, start.lat()); 
            
            //  Define a "Detour" Path (U-Shape)
            // Instead of a direct line (1 move), the drone must go:
            // Down (3), Right (3), Up (3) -> Total 9 moves
            List<Position> uShapedPath = new ArrayList<>();
            uShapedPath.add(start);
            
            // Leg 1: Go South (away from target) to avoid wall
            uShapedPath.add(new Position(start.lng(), start.lat() - 0.00015));
            uShapedPath.add(new Position(start.lng(), start.lat() - 0.00030));
            uShapedPath.add(new Position(start.lng(), start.lat() - 0.00045));
            
            // Leg 2: Go East (under the wall)
            uShapedPath.add(new Position(start.lng() + 0.00015, start.lat() - 0.00045));
            
            // Leg 3: Go North (back towards target)
            uShapedPath.add(new Position(start.lng() + 0.00015, start.lat() - 0.00030));
            uShapedPath.add(new Position(start.lng() + 0.00015, start.lat() - 0.00015));
            uShapedPath.add(delivery); // Arrived
            
            // 2. Mock the Pathfinder to return this specific U-shape
            when(droneService.findAvailableDronesForDispatches(anyList()))
                .thenReturn(List.of("test-drone-1"));
            when(droneService.findDroneDetailsById("test-drone-1"))
                .thenReturn(Optional.of(testDrone));
                
            when(pathfinder.findPath(any(Position.class), any(Position.class), anyList()))
                .thenReturn(uShapedPath) // There
                .thenReturn(uShapedPath); // Back (assume same path for simplicity)

            // 3. Execute
            JsonDtos.MedDispatchRec dispatch = createDispatch(1L, 1.0, delivery);
            DeliveryPathResponse response = pathService.calculateDeliveryPath(
                Collections.singletonList(dispatch)
            );

            // 4. Verify
            // The path size is 8 points (Start + 7 steps) -> 7 moves.
            // Total moves = 7 (There) + 1 (Hover) + 7 (Back) = 15.
            // Cost = 1.00 + (15 * 0.05) + 2.00 = 3.75
            assertThat(response.totalMoves()).isEqualTo(15); // Changed from 14 to 15
            assertThat(response.totalCost()).isCloseTo(3.75, org.assertj.core.api.Assertions.offset(0.01)); // Changed from 3.70 to 3.75
        }
    }
    
    // ==== HELPER METHODS ====
    
    /**
     * Setup all mocks needed for a successful path calculation
     */
    private void setupMocksForDrone(String droneId, Drone drone, 
                                     Position start, Position delivery, 
                                     int pathThereSize, int pathBackSize) {
        // Mock drone service to return this drone as available
        when(droneService.findAvailableDronesForDispatches(anyList()))
            .thenReturn(List.of(droneId));
        
        when(droneService.findDroneDetailsById(droneId))
            .thenReturn(Optional.of(drone));
        
        // Mock pathfinder to return paths of specified size
        List<Position> pathThere = createPath(start, pathThereSize);
        List<Position> pathBack = createPath(delivery, pathBackSize);
        
        when(pathfinder.findPath(any(Position.class), any(Position.class), anyList()))
            .thenReturn(pathThere)
            .thenReturn(pathBack);
    }
    
    /**
     * Create a test dispatch
     */
    private JsonDtos.MedDispatchRec createDispatch(Long id, double capacity, Position delivery) {
        return new JsonDtos.MedDispatchRec(
            id,
            "2025-12-12",
            "14:30",
            new JsonDtos.MedDispatchRec.Requirements(capacity, null, null, null),
            delivery
        );
    }
    
    /**
     * Create a path with N positions
     */
    private List<Position> createPath(Position start, int numPositions) {
        List<Position> path = new ArrayList<>();
        path.add(start);
        for (int i = 1; i < numPositions; i++) {
            path.add(new Position(
                start.lng() + (i * 0.00015),
                start.lat() + (i * 0.00015)
            ));
        }
        return path;
    }
}