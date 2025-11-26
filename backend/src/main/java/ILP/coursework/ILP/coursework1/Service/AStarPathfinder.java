package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.dto.JsonDtos;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Region;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AStarPathfinder {

    private final GeometryService geometryService;
    private static final Logger logger = LoggerFactory.getLogger(AStarPathfinder.class);
    private static final double[] ANGLES = {0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5};
    private static final double MOVE_DISTANCE = 0.00015;
    private static final double HEURISTIC_WEIGHT = 1.5;

    public AStarPathfinder(GeometryService geometryService) {
        this.geometryService = geometryService;
    }

    public List<Position> findPath(Position start, Position end, List<JsonDtos.Region> noFlyZones) {
        logger.info("A* starting path from {} to {}", start, end);
        Node startNode = new Node(start);
        Node endNode = new Node(end);

        Map<Position, Node> openSetMap = new HashMap<>();
        PriorityQueue<Node> openSetQueue = new PriorityQueue<>();
        HashSet<Position> closedSet = new HashSet<>();

        startNode.gCost = 0;
        startNode.hCost = geometryService.calculateDistance(start, end) * HEURISTIC_WEIGHT;
        startNode.fCost = startNode.hCost;

        openSetQueue.add(startNode);
        openSetMap.put(startNode.position, startNode);

        int iterations = 0;
        final int MAX_ITERATIONS = 100000;

        while (!openSetQueue.isEmpty() && iterations < MAX_ITERATIONS) {
            iterations++;

            if (iterations % 10000 == 0) {
                logger.info("A* iteration {}, open set size: {}, closed set size: {}",
                        iterations, openSetQueue.size(), closedSet.size());
            }

            Node currentNode = openSetQueue.poll();
            openSetMap.remove(currentNode.position);

            if (geometryService.checkPointsClose(currentNode.position, endNode.position)) {
                logger.info("A* found path in {} iterations", iterations);
                return reconstructPath(currentNode);
            }

            closedSet.add(currentNode.position);

            for (double angle : ANGLES) {
                Position neighborPos = geometryService.calculateNextPosition(currentNode.position, angle);

                if (closedSet.contains(neighborPos)) {
                    continue;
                }

                // check both the point an the line segment
                if (isInvalidMove(currentNode.position, neighborPos, noFlyZones)) {
                    continue;
                }

                double tentativeGCost = currentNode.gCost + MOVE_DISTANCE;
                Node neighborNode = openSetMap.get(neighborPos);

                if (neighborNode == null) {
                    neighborNode = new Node(neighborPos);
                    neighborNode.parent = currentNode;
                    neighborNode.gCost = tentativeGCost;
                    neighborNode.hCost = geometryService.calculateDistance(neighborPos, end) * HEURISTIC_WEIGHT;
                    neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
                    openSetQueue.add(neighborNode);
                    openSetMap.put(neighborPos, neighborNode);
                } else if (tentativeGCost < neighborNode.gCost) {
                    neighborNode.parent = currentNode;
                    neighborNode.gCost = tentativeGCost;
                    neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
                    openSetQueue.remove(neighborNode);
                    openSetQueue.add(neighborNode);
                }
            }
        }

        if (iterations >= MAX_ITERATIONS) {
            logger.warn("A* exceeded max iterations ({}) from {} to {}", MAX_ITERATIONS, start, end);
        } else {
            logger.warn("A* could not find path from {} to {} (exhausted search space after {} iterations)",
                    start, end, iterations);
        }
        return Collections.emptyList();
    }

    /**
     * Checks if a move from 'from' to 'to' is invalid.
     * A move is invalid if:
     * 1. The destination point is inside a no-fly zone, OR
     * 2. The line segment from 'from' to 'to' crosses a no-fly zone boundary
     */
    private boolean isInvalidMove(Position from, Position to, List<Region> noFlyZones) {
        for (Region zone : noFlyZones) {
            // check if the destination point inside the zone
            if (geometryService.isPointInRegion(to, zone)) {
                return true;
            }

            // Check if  the line segment cross the zone boundary
            if (geometryService.checkLineIntersectsRegion(from, to, zone)) {
                return true;
            }
        }
        return false;
    }

    private List<Position> reconstructPath(Node endNode) {
        List<Position> path = new ArrayList<>();
        Node current = endNode;
        while (current != null) {
            path.add(current.position);
            current = current.parent;
        }
        Collections.reverse(path);
        return path;
    }
}