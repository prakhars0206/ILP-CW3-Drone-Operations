package ILP.coursework.ILP.coursework1.dto;

import java.util.List;

public record DroneForServicePoint(
        Long servicePointId,
        List<DroneAvailability> drones
) {
    public record DroneAvailability(
            String id,
            List<Availability> availability
    ) {}

    public record Availability(
            String dayOfWeek,
            String from,
            String until
    ) {}
}