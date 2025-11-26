package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;

/**
 * represents node for the A* search space
 * Implements Comparable for us in PriorityQueue
 */
public class Node implements Comparable<Node> {
    public final Position position;
    public double gCost; // Cost from the start node
    public double hCost; // Heuristic cost to the end node
    public double fCost; // gCost + hCost
    public Node parent;

    public Node(Position position) {
        this.position = position;
    }

    @Override
    public int compareTo(Node other) {
        return Double.compare(this.fCost, other.fCost);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Node node = (Node) obj;
        return position.equals(node.position);
    }

    @Override
    public int hashCode() {
        return position.hashCode();
    }
}