package ILP.coursework.ILP.coursework1.Service;
import ILP.coursework.ILP.coursework1.dto.JsonDtos;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Implements the core business logic for geometric calculations as defined by the GeometryService interface.
 * This includes distance calculations, proximity checks, and point-in-polygon tests.
 */
@Service
public class GeometryServiceImpl implements GeometryService {

    private static final double DISTANCE_TOLERANCE = 0.00015;
    private static final double MOVE_DISTANCE = 0.00015;

    /**
     * Calculates the Pythagorean (Euclidean) distance between two points on a 2D plane.
     * @param p1 The first position.
     * @param p2 The second position.
     * @return The distance between the two points in degrees.
     */
    @Override
    public double calculateDistance(Position p1, Position p2) {
        double deltaLat = p2.lat() - p1.lat();
        double deltaLng = p2.lng() - p1.lng();

        double latDifferenceSquared = deltaLat * deltaLat;
        double lngDifferenceSquared = deltaLng * deltaLng;

        return Math.sqrt(latDifferenceSquared + lngDifferenceSquared);
    }

    /**
     * Checks if the distance between two points is strictly less than the defined DISTANCE_TOLERANCE.
     * @param p1 The first position.
     * @param p2 The second position.
     * @return true if the points are considered "close", otherwise false.
     */
    @Override
    public boolean checkPointsClose(Position p1, Position p2) {
        return calculateDistance(p1, p2) < DISTANCE_TOLERANCE;
    }

    /**
     * Calculates the next position from a starting point, given an angle of movement.
     * The move distance is a fixed constant defined in the spec.
     * @param start The starting position of the drone.
     * @param angle The angle of movement in degrees, which has to be a multiple of 22.5.
     * @return The new calculated position.
     * @throws IllegalArgumentException if the provided angle is not a multiple of 22.5.
     */
    @Override
    public Position calculateNextPosition(Position start, double angle) {
        final double COMPASS_DIRECTION_DEGREES = 22.5;
        final double EPSILON = 1e-9;

        // valid angle when divided by 22.5, must be very close to an integer.
        double quotient = angle / COMPASS_DIRECTION_DEGREES;

        // Check if the difference between the quotient and its nearest whole number is larger than our tolerance.
        if (Math.abs(quotient - Math.round(quotient)) > EPSILON) {
            // If the angle is invalid, throw an exception. The ControllerAdvice will handle it.
            throw new IllegalArgumentException();
        }

        double angleInRad = Math.toRadians(angle);

        // Calculate the change in longitude (dx) and latitude (dy)
        double deltaLng = MOVE_DISTANCE * Math.cos(angleInRad);
        double deltaLat = MOVE_DISTANCE * Math.sin(angleInRad);

        double newLng = start.lng() + deltaLng;
        double newLat = start.lat() + deltaLat;

        return new Position(newLng, newLat);

    }

    /**
     * Determines if a given point is inside or on the border of a polygon region.
     * @param point The position to check.
     * @param region The region defined by a list of vertices.
     * @return true if the point is inside or on the border, otherwise false.
     * @throws IllegalArgumentException if the region is not a valid, closed polygon with at least 4 vertices.
     */
    @Override
    public boolean isPointInRegion(Position point, JsonDtos.Region region) {
        List<Position> vertices = region.vertices();

        // A valid region must be closed (first and last vertex are the same).
        if (vertices.size() < 4 || !vertices.get(0).equals(vertices.get(vertices.size() - 1))) {

            // throw exception in this case as per spec
            throw new IllegalArgumentException();
        }

        // Check if the point is on any of the region's edges first.
        for (int i = 0; i < vertices.size() - 1; i++) {
            if (isPointOnLineSegment(point, vertices.get(i), vertices.get(i + 1))) {
                return true;
            }
        }

        return isInsidePolygon(point, vertices);
    }

    @Override
    public boolean checkLineIntersectsRegion(Position from, Position to, JsonDtos.Region region) {
        List<Position> vertices = region.vertices();

        for (int i = 0; i < vertices.size() - 1; i++) {
            Position edgeStart = vertices.get(i);
            Position edgeEnd = vertices.get(i + 1);

            if (doLineSegmentsIntersect(from, to, edgeStart, edgeEnd)) {
                return true;
            }
        }

        return false;
    }

    private boolean doLineSegmentsIntersect(Position p1, Position q1, Position p2, Position q2) {
        int o1 = orientation(p1, q1, p2);
        int o2 = orientation(p1, q1, q2);
        int o3 = orientation(p2, q2, p1);
        int o4 = orientation(p2, q2, q1);

        if (o1 != o2 && o3 != o4) {
            return true;
        }

        if (o1 == 0 && onSegment(p1, p2, q1)) return true;
        if (o2 == 0 && onSegment(p1, q2, q1)) return true;
        if (o3 == 0 && onSegment(p2, p1, q2)) return true;
        if (o4 == 0 && onSegment(p2, q1, q2)) return true;

        return false;
    }

    private int orientation(Position p, Position q, Position r) {
        double val = (q.lat() - p.lat()) * (r.lng() - q.lng()) -
                (q.lng() - p.lng()) * (r.lat() - q.lat());

        if (Math.abs(val) < 1e-9) return 0;
        return (val > 0) ? 1 : 2;
    }

    private boolean onSegment(Position p, Position q, Position r) {
        return q.lng() <= Math.max(p.lng(), r.lng()) &&
                q.lng() >= Math.min(p.lng(), r.lng()) &&
                q.lat() <= Math.max(p.lat(), r.lat()) &&
                q.lat() >= Math.min(p.lat(), r.lat());
    }

    /**
     * helper to determine if a point is inside a polygon using the Ray-Casting algorithm.
     * This algorithm counts the number of times a ray cast eastward from the point intersects with the polygon's edges.
     * An odd number of intersections means the point is inside.
     * @param point The point to check.
     * @param vertices The list of vertices forming the closed polygon.
     * @return true if the point is inside the polygon, otherwise false.
     */
    private static boolean isInsidePolygon(Position point, List<Position> vertices) {
        // Using the Ray-Casting algorithm to check if the point is inside, as this works for most  polygons
        boolean isInside = false;
        double pointX = point.lng();
        double pointY = point.lat();

        for (int i = 0, j = vertices.size() - 1; i < vertices.size(); j = i++) {
            double vertexXi = vertices.get(i).lng();
            double vertexYi = vertices.get(i).lat();
            double vertexXj = vertices.get(j).lng();
            double vertexYj = vertices.get(j).lat();

            boolean intersect = ((vertexYi > pointY) != (vertexYj > pointY))
                    && (pointX < (vertexXj - vertexXi) * (pointY - vertexYi) / (vertexYj - vertexYi) + vertexXi);
            if (intersect) {
                isInside = !isInside;
            }
        }
        return isInside;
    }

    /**
     * Private helper to check if a point lies exactly on a line segment.
     * It works by checking if the distance from the point to each endpoint sums up to the total length of the segment.
     * @param point The point to check.
     * @param lineStart The starting position of the line segment.
     * @param lineEnd The ending position of the line segment.
     * @return true if the point is on the line segment, otherwise false.
     */
    private boolean isPointOnLineSegment(Position point, Position lineStart, Position lineEnd) {
        double distPointStart = calculateDistance(point, lineStart);
        double distPointEnd = calculateDistance(point, lineEnd);
        double distLine = calculateDistance(lineStart, lineEnd);

        // The point is on the segment if the sum of the distances from the point to the endpoints
        // is approx equal to the length of the segment itself.
        return Math.abs((distPointStart + distPointEnd) - distLine) < 1e-9;
    }


}
