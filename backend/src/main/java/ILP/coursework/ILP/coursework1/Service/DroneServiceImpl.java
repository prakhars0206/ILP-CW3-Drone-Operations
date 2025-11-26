package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.client.IlpRestClient;
import ILP.coursework.ILP.coursework1.dto.Drone;
import ILP.coursework.ILP.coursework1.dto.DroneForServicePoint;
import ILP.coursework.ILP.coursework1.dto.JsonDtos;
import ILP.coursework.ILP.coursework1.dto.ServicePoint;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DroneServiceImpl implements DroneService {

    private final IlpRestClient ilpRestClient;
    private final GeometryService geometryService;

    public DroneServiceImpl(IlpRestClient ilpRestClient, GeometryService geometryService) {
        this.ilpRestClient = ilpRestClient;
        this.geometryService = geometryService;
    }

    @Override
    public List<String> findDronesWithCooling(boolean state) {
        // fetching data fresh everytime
        Drone[] allDrones = ilpRestClient.getDrones();

        // process
        return Arrays.stream(allDrones).filter(drone -> drone.capability().cooling() == state)
                .map(Drone::id).collect(Collectors.toList());
    }

    @Override
    public Optional<Drone> findDroneDetailsById(String id) {
        //convert to json object???
        Drone[] allDrones = ilpRestClient.getDrones();

        //find specific drone
        return Arrays.stream(allDrones).filter(drone -> drone.id().equals(id)).findFirst();
    }

    @Override
    public List<String> findDronesByAttribute(String attributeName, String attributeValue) {
        Drone[] allDrones = ilpRestClient.getDrones();
        return Arrays.stream(allDrones).filter(drone -> droneMatches(drone, attributeName, "=", attributeValue))
                .map(Drone::id).collect(Collectors.toList());
    }

    @Override
    public List<String> findDronesByQuery(List<JsonDtos.Query> queries) {
        Drone[] allDrones = ilpRestClient.getDrones();
        return Arrays.stream(allDrones).filter(drone -> queries.stream()
                        .allMatch(query -> droneMatches(drone, query.attribute(), query.operator(), query.value())))
                .map(Drone::id).collect(Collectors.toList());
    }

    /**
     * private helper to check if a single drone matches a single query criteriaa
     */
    private boolean droneMatches(Drone drone, String attribute, String operator, String value) {
        try {
            switch (attribute.toLowerCase()) {
                // Boolean attributes
                case "cooling":
                    return drone.capability().cooling() == Boolean.parseBoolean(value);
                case "heating":
                    return drone.capability().heating() == Boolean.parseBoolean(value);

                // Numeric attributes
                case "capacity":
                case "maxmoves":
                case "costpermove":
                case "costinitial":
                case "costfinal":
                    double numericValue = Double.parseDouble(value);
                    double droneValue = getNumericDroneValue(drone, attribute);
                    switch (operator) {
                        case "=": return droneValue == numericValue;
                        case "!=": return droneValue != numericValue;
                        case "<": return droneValue < numericValue;
                        case ">": return droneValue > numericValue;
                        case ">=": return droneValue >= numericValue;
                        case "<=": return droneValue <= numericValue;
                        default: return false;
                    }
                default:
                    return false;
            }
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Helper to get a numeric value from a drone by attribute name.
     */
    private double getNumericDroneValue(Drone drone, String attribute) {
        switch (attribute.toLowerCase()) {
            case "capacity": return drone.capability().capacity();
            case "maxmoves": return drone.capability().maxMoves();
            case "costpermove": return drone.capability().costPerMove();
            case "costinitial": return drone.capability().costInitial();
            case "costfinal": return drone.capability().costFinal();
            default: return -1;
        }
    }


    @Override
    public List<String> findAvailableDronesForDispatches(List<JsonDtos.MedDispatchRec> dispatches) {
        if (dispatches == null || dispatches.isEmpty()) {
            return List.of();
        }

        Drone[] allDrones = ilpRestClient.getDrones();
        ServicePoint[] servicePoints = ilpRestClient.getServicePoints();
        DroneForServicePoint[] availabilities = ilpRestClient.getDronesForServicePoints();

        // aggregate requirements
        double totalCapacity = dispatches.stream().mapToDouble(d -> d.requirements().capacity()).sum();
        boolean needsCooling = dispatches.stream().anyMatch(d -> d.requirements().cooling() != null && d.requirements().cooling());
        boolean needsHeating = dispatches.stream().anyMatch(d -> d.requirements().heating() != null && d.requirements().heating());

        // grouping by date to handle multi-day req
        Map<LocalDate, List<JsonDtos.MedDispatchRec>> dispatchesByDate = dispatches.stream()
                .collect(Collectors.groupingBy(d -> LocalDate.parse(d.date())));

        return Arrays.stream(allDrones)
                // filter by capacity
                .filter(drone -> drone.capability().capacity() >= totalCapacity)
                .filter(drone -> !needsCooling || drone.capability().cooling())
                .filter(drone -> !needsHeating || drone.capability().heating())

                // filter by availability
                .filter(drone -> dispatches.stream().allMatch(dispatch ->
                        isDroneAvailable(
                                drone.id(),
                                LocalDate.parse(dispatch.date()).getDayOfWeek(),
                                LocalTime.parse(dispatch.time()),
                                availabilities
                        )
                ))

                // filtering by max cost (approxx)
                .filter(drone -> {
                    Optional<ServicePoint> sp = findServicePointForDrone(drone.id(), availabilities, servicePoints);
                    if (sp.isEmpty()) return false;

                    // Approximate tour distance using greedy nearest-neighbor (matches actual path planning)
                    double totalDistance = 0;
                    JsonDtos.Position current = sp.get().location();
                    List<JsonDtos.MedDispatchRec> remaining = new ArrayList<>(dispatches);

                    while (!remaining.isEmpty()) {
                        // Find nearest delivery
                        JsonDtos.Position finalCurrent = current;
                        JsonDtos.MedDispatchRec nearest = remaining.stream()
                                .min(Comparator.comparingDouble(d ->
                                        geometryService.calculateDistance(finalCurrent, d.delivery()))).orElseThrow();

                        totalDistance += geometryService.calculateDistance(current, nearest.delivery());
                        current = nearest.delivery();
                        remaining.remove(nearest);
                    }
                    // Add return to service point
                    totalDistance += geometryService.calculateDistance(current, sp.get().location());

                    double approxMoves = totalDistance / 0.00015;
                    double approxCost = drone.capability().costInitial() + drone.capability().costFinal()
                            + (approxMoves * drone.capability().costPerMove());

                    double proRataCost = approxCost / dispatches.size();
                    return dispatches.stream().allMatch(d ->
                            d.requirements().maxCost() == null || proRataCost <= d.requirements().maxCost()
                    );
                })
                .map(Drone::id).collect(Collectors.toList());
    }


    private Optional<ServicePoint> findServicePointForDrone(String droneId, DroneForServicePoint[] availabilities, ServicePoint[] servicePoints) {
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

    private boolean isDroneAvailable(String droneId, DayOfWeek day, LocalTime time, DroneForServicePoint[] allAvailabilities) {
        for (DroneForServicePoint spAvail : allAvailabilities) {
            for (DroneForServicePoint.DroneAvailability droneAvail : spAvail.drones()) {
                if (droneAvail.id().equals(droneId)) {
                    // This is the drone we're checking, now check its schedule.
                    for (DroneForServicePoint.Availability schedule : droneAvail.availability()) {
                        DayOfWeek scheduleDay = DayOfWeek.valueOf(schedule.dayOfWeek().toUpperCase());
                        if (scheduleDay.equals(day)) {
                            LocalTime from = LocalTime.parse(schedule.from());
                            LocalTime until = LocalTime.parse(schedule.until());
                            // Check if delivery time is within the [from, until) interval
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
}