package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.dto.JsonDtos;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GeometryServiceImplTest {

    private GeometryService geometryService;

    @BeforeEach
    void setUp() {
        // Create a new instance of the service before each test
        geometryService = new GeometryServiceImpl();
    }

    @Test
    @DisplayName("CalculateDistance should return correct Euclidean distance")
    void calculateDistance() {
        Position p1 = new Position(-3.0, 55.0);
        Position p2 = new Position(-4.0, 56.0);
        double expectedDistance = Math.sqrt(2);

        double actualDistance = geometryService.calculateDistance(p1, p2);

        assertThat(actualDistance).isEqualTo(expectedDistance);
    }

    @Test
    @DisplayName("CalculateDistance should return 0 for the same point")
    void calculateDistanceForSamePoint() {
        Position p1 = new Position(-3.0, 55.0);
        assertThat(geometryService.calculateDistance(p1, p1)).isEqualTo(0.0);
    }

    @Test
    @DisplayName("IsCloseTo should return true for points within tolerance")
    void isCloseToShouldReturnTrue() {
        Position p1 = new Position(-3.0, 55.0);
        Position p2 = new Position(-3.0, 55.0001); // Distance is 0.0001, which is < 0.00015
        assertThat(geometryService.checkPointsClose(p1, p2)).isTrue();
    }

    @Test
    @DisplayName("IsCloseTo should return false for points outside tolerance")
    void isCloseToShouldReturnFalse() {
        Position p1 = new Position(-3.0, 55.0);
        Position p2 = new Position(-3.0, 55.0002); // Distance is 0.0002, which is > 0.00015
        assertThat(geometryService.checkPointsClose(p1, p2)).isFalse();
    }

    @Test
    @DisplayName("CalculateNextPosition should work for a valid angle")
    void calculateNextPositionWithValidAngle() {
        Position start = new Position(-3.0, 55.0);
        double angle = 90.0;
        Position result = geometryService.calculateNextPosition(start, angle);

        assertThat(result.lng()).isCloseTo(-3.0, org.assertj.core.api.Assertions.offset(1e-9));
        assertThat(result.lat()).isCloseTo(55.00015, org.assertj.core.api.Assertions.offset(1e-9));
    }

    @Test
    @DisplayName("CalculateNextPosition should work for a zero angle (East)")
    void calculateNextPositionWithZeroAngle() {
        Position start = new Position(-3.0, 55.0);
        Position result = geometryService.calculateNextPosition(start, 0.0);
        assertThat(result.lng()).isCloseTo(-2.99985, org.assertj.core.api.Assertions.offset(1e-9));
        assertThat(result.lat()).isCloseTo(55.0, org.assertj.core.api.Assertions.offset(1e-9));
    }

    @Test
    @DisplayName("CalculateNextPosition should throw exception for invalid angle")
    void calculateNextPositionWithInvalidAngle() {
        Position start = new Position(-3.0, 55.0);
        double invalidAngle = 46.0;

        // Assert that executing this method throws the specified exception
        assertThrows(IllegalArgumentException.class, () -> {
            geometryService.calculateNextPosition(start, invalidAngle);
        });
    }

    @Test
    @DisplayName("IsPointInRegion should return true for a point clearly inside a simple polygon")
    void isPointInRegion_shouldReturnTrue_forPointInside() {
        JsonDtos.Region square = new JsonDtos.Region("square", List.of(
                new Position(-1.0, -1.0), new Position(1.0, -1.0),
                new Position(1.0, 1.0), new Position(-1.0, 1.0),
                new Position(-1.0, -1.0)
        ));
        assertThat(geometryService.isPointInRegion(new Position(0.0, 0.0), square)).isTrue();
    }

    @Test
    @DisplayName("IsPointInRegion should return false for a point clearly outside a simple polygon")
    void isPointInRegion_shouldReturnFalse_forPointOutside() {
        JsonDtos.Region square = new JsonDtos.Region("square", List.of(
                new Position(-1.0, -1.0), new Position(1.0, -1.0),
                new Position(1.0, 1.0), new Position(-1.0, 1.0),
                new Position(-1.0, -1.0)
        ));
        assertThat(geometryService.isPointInRegion(new Position(2.0, 2.0), square)).isFalse();
    }

    @Test
    @DisplayName("IsPointInRegion should return true for a point on the border of a polygon")
    void isPointInRegion_shouldReturnTrue_forPointOnBorder() {
        JsonDtos.Region square = new JsonDtos.Region("square", List.of(
                new Position(-1.0, -1.0), new Position(1.0, -1.0),
                new Position(1.0, 1.0), new Position(-1.0, 1.0),
                new Position(-1.0, -1.0)
        ));
        assertThat(geometryService.isPointInRegion(new Position(1.0, 0.0), square)).isTrue();
    }

    @Test
    @DisplayName("IsPointInRegion should return true for a point on a vertex of a polygon")
    void isPointInRegion_shouldReturnTrue_forPointOnVertex() {
        JsonDtos.Region square = new JsonDtos.Region("square", List.of(
                new Position(-1.0, -1.0), new Position(1.0, -1.0),
                new Position(1.0, 1.0), new Position(-1.0, 1.0),
                new Position(-1.0, -1.0)
        ));
        assertThat(geometryService.isPointInRegion(new Position(1.0, 1.0), square)).isTrue();
    }

    @Test
    @DisplayName("IsPointInRegion should throw exception for unclosed region")
    void isPointInRegion_shouldThrowException_forUnclosedRegion() {
        JsonDtos.Region unclosedRegion = new JsonDtos.Region("unclosed", List.of(
                new Position(-1.0, -1.0), new Position(1.0, -1.0),
                new Position(1.0, 1.0), new Position(-1.0, 1.0)
        ));
        assertThrows(IllegalArgumentException.class, () -> {
            geometryService.isPointInRegion(new Position(0.0, 0.0), unclosedRegion);
        });
    }

    @Test
    @DisplayName("IsPointInRegion should throw exception for region with too few vertices")
    void isPointInRegion_shouldThrowException_forRegionWithTooFewVertices() {
        JsonDtos.Region lineRegion = new JsonDtos.Region("line", List.of(
                new Position(-1.0, -1.0), new Position(1.0, 1.0), new Position(-1.0, -1.0)
        ));
        assertThrows(IllegalArgumentException.class, () -> {
            geometryService.isPointInRegion(new Position(0.0, 0.0), lineRegion);
        });

    }
}