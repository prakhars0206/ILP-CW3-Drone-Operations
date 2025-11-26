package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.client.IlpRestClient;
import ILP.coursework.ILP.coursework1.dto.*;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.MedDispatchRec;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AvailabilityService {

    private final IlpRestClient ilpRestClient;
    private final GeometryService geometryService;

    public AvailabilityService(IlpRestClient ilpRestClient, GeometryService geometryService) {
        this.ilpRestClient = ilpRestClient;
        this.geometryService = geometryService;
    }

    public AvailabilityExplanation explainAvailability(MedDispatchRec dispatch) {
        Drone[] allDrones = ilpRestClient.getDrones();
        ServicePoint[] servicePoints = ilpRestClient.getServicePoints();
        DroneForServicePoint[] availabilities = ilpRestClient.getDronesForServicePoints();

        List<DroneAvailabilityCheck> checks = new ArrayList<>();

        for (Drone drone : allDrones) {
            List<String> reasons = new ArrayList<>();
            boolean available = true;

            // Check cooling requirement
            if (dispatch.requirements().cooling() != null &&
                    dispatch.requirements().cooling() &&
                    !drone.capability().cooling()) {
                available = false;
                reasons.add("❌ Missing cooling capability (delivery requires refrigeration)");
            }

            // Check heating requirement
            if (dispatch.requirements().heating() != null &&
                    dispatch.requirements().heating() &&
                    !drone.capability().heating()) {
                available = false;
                reasons.add("❌ Missing heating capability (delivery requires heating)");
            }

            // Check capacity
            if (dispatch.requirements().capacity() > drone.capability().capacity()) {
                available = false;
                reasons.add("❌ Insufficient capacity: " +
                        drone.capability().capacity() + "kg max, need " +
                        dispatch.requirements().capacity() + "kg");
            }

            // Check time availability
            DayOfWeek dayOfWeek = LocalDate.parse(dispatch.date()).getDayOfWeek();
            LocalTime deliveryTime = LocalTime.parse(dispatch.time());

            if (!isDroneAvailableAtTime(drone.id(), dayOfWeek, deliveryTime, availabilities)) {
                available = false;
                reasons.add("❌ Not available on " + dayOfWeek + " at " + deliveryTime);
            }

            // Check if drone has a service point
            Optional<ServicePoint> sp = findServicePointForDrone(drone.id(), availabilities, servicePoints);
            if (sp.isEmpty()) {
                available = false;
                reasons.add("❌ No service point assigned to this drone");
            }

            // Check max cost constraint (rough estimate)
            if (available && dispatch.requirements().maxCost() != null && sp.isPresent()) {
                double estimatedDistance = geometryService.calculateDistance(
                        sp.get().location(),
                        dispatch.delivery()
                ) * 2; // Round trip

                double estimatedMoves = estimatedDistance / 0.00015;
                double estimatedCost = drone.capability().costInitial() +
                        drone.capability().costFinal() +
                        (estimatedMoves * drone.capability().costPerMove());

                if (estimatedCost > dispatch.requirements().maxCost()) {
                    available = false;
                    reasons.add("❌ Estimated cost £" +
                            String.format("%.2f", estimatedCost) +
                            " exceeds max budget £" +
                            String.format("%.2f", dispatch.requirements().maxCost()));
                }
            }

            // If still available, mark as such
            if (available) {
                reasons.add("✅ Available - meets all requirements");
            }

            checks.add(new DroneAvailabilityCheck(
                    drone.id(),
                    drone.name(),
                    available,
                    reasons
            ));
        }

        // Generate suggestions
        List<String> suggestions = generateSuggestions(checks, dispatch);

        return new AvailabilityExplanation(checks, suggestions);
    }

    private boolean isDroneAvailableAtTime(
            String droneId,
            DayOfWeek day,
            LocalTime time,
            DroneForServicePoint[] availabilities) {

        for (DroneForServicePoint spAvail : availabilities) {
            for (DroneForServicePoint.DroneAvailability droneAvail : spAvail.drones()) {
                if (droneAvail.id().equals(droneId)) {
                    for (DroneForServicePoint.Availability schedule : droneAvail.availability()) {
                        DayOfWeek scheduleDay = DayOfWeek.valueOf(schedule.dayOfWeek().toUpperCase());
                        if (scheduleDay.equals(day)) {
                            LocalTime from = LocalTime.parse(schedule.from());
                            LocalTime until = LocalTime.parse(schedule.until());
                            if (!time.isBefore(from) && time.isBefore(until)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    private Optional<ServicePoint> findServicePointForDrone(
            String droneId,
            DroneForServicePoint[] availabilities,
            ServicePoint[] servicePoints) {

        for (DroneForServicePoint spAvail : availabilities) {
            if (spAvail.drones().stream().anyMatch(d -> d.id().equals(droneId))) {
                for (ServicePoint sp : servicePoints) {
                    if (sp.id().equals(spAvail.servicePointId())) {
                        return Optional.of(sp);
                    }
                }
            }
        }
        return Optional.empty();
    }

    private List<String> generateSuggestions(List<DroneAvailabilityCheck> checks, MedDispatchRec dispatch) {
        List<String> suggestions = new ArrayList<>();

        // Check if any drones are available
        boolean anyAvailable = checks.stream().anyMatch(DroneAvailabilityCheck::available);
        if (anyAvailable) {
            return suggestions; // No suggestions needed if drones are available
        }

        // Analyze common failure reasons
        boolean allFailCapacity = checks.stream()
                .allMatch(c -> c.reasons().stream()
                        .anyMatch(r -> r.contains("Insufficient capacity")));

        if (allFailCapacity) {
            suggestions.add("💡 Consider splitting the delivery into multiple smaller shipments");

            // Find largest drone capacity
            double maxCapacity = checks.stream()
                    .map(c -> c.reasons().stream()
                            .filter(r -> r.contains("max"))
                            .findFirst()
                            .map(r -> {
                                try {
                                    String cap = r.split("max, need")[0].split(": ")[1].replace("kg", "").trim();
                                    return Double.parseDouble(cap);
                                } catch (Exception e) {
                                    return 0.0;
                                }
                            })
                            .orElse(0.0))
                    .max(Double::compare)
                    .orElse(0.0);

            if (maxCapacity > 0) {
                int numDeliveries = (int) Math.ceil(dispatch.requirements().capacity() / maxCapacity);
                suggestions.add("💡 Split into " + numDeliveries + " deliveries of ~" +
                        String.format("%.1f", dispatch.requirements().capacity() / numDeliveries) + "kg each");
            }
        }

        boolean someFailTime = checks.stream()
                .anyMatch(c -> c.reasons().stream()
                        .anyMatch(r -> r.contains("Not available")));

        if (someFailTime) {
            suggestions.add("💡 Try scheduling at a different time (some drones have limited availability)");
        }

        boolean someFailCooling = checks.stream()
                .anyMatch(c -> c.reasons().stream()
                        .anyMatch(r -> r.contains("cooling")));

        if (someFailCooling && dispatch.requirements().cooling() != null && !dispatch.requirements().cooling()) {
            suggestions.add("💡 Consider if this delivery actually needs cooling - some medicines don't require it");
        }

        boolean someFailCost = checks.stream()
                .anyMatch(c -> c.reasons().stream()
                        .anyMatch(r -> r.contains("cost")));

        if (someFailCost) {
            suggestions.add("💡 Increase the budget, or choose a delivery location closer to a service point");
        }

        return suggestions;
    }

    // DTOs
    public record DroneAvailabilityCheck(
            String droneId,
            String droneName,
            boolean available,
            List<String> reasons
    ) {}

    public record AvailabilityExplanation(
            List<DroneAvailabilityCheck> droneChecks,
            List<String> suggestions
    ) {}
}