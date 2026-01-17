package ILP.coursework.ILP.coursework1.dto;

import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DeliveryPathResponse(
        @JsonProperty("cost") double totalCost,
        int totalMoves,
        List<DronePath> dronePaths
) {
    public record DronePath(
            String droneId, // Drone ID is a String
            List<Delivery> deliveries
    ) {}

    public record Delivery(
            Long deliveryId, // MedDispatchRec ID is a Long
            List<Position> flightPath
    ) {}
}