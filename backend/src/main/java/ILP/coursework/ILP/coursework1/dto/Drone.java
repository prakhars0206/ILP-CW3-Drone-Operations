package ILP.coursework.ILP.coursework1.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// ignore any field in the JSON that aren't in  record
@JsonIgnoreProperties(ignoreUnknown = true)
public record Drone(
        String id,
        String name,
        Capability capability
) {
    public record Capability(
            boolean cooling,
            boolean heating,
            double capacity,
            int maxMoves,
            double costPerMove,
            double costInitial,
            double costFinal
    ) {}
}