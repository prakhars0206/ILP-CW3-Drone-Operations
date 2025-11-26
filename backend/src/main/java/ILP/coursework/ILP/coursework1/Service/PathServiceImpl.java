package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.client.IlpRestClient;
import ILP.coursework.ILP.coursework1.dto.*;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.MedDispatchRec;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Region;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PathServiceImpl implements PathService {

    private static final Logger logger = LoggerFactory.getLogger(PathServiceImpl.class);

    private final DroneService droneService;
    private final GeometryService geometryService;
    private final IlpRestClient ilpRestClient;
    private final AStarPathfinder pathfinder;

    public PathServiceImpl(DroneService droneService, GeometryService geometryService, IlpRestClient ilpRestClient, AStarPathfinder pathfinder) {
        this.droneService = droneService;
        this.geometryService = geometryService;
        this.ilpRestClient = ilpRestClient;
        this.pathfinder = pathfinder;
    }

    // A helper record for the path cache.
    private record PathSegment(Position start, Position end) {}

    private record Trip(String droneId, ServicePoint startPoint, Object deliveryData, double totalCost, int totalMoves) {
        public DeliveryPathResponse.DronePath toDronePath() {
            if (deliveryData instanceof DeliveryPathResponse.Delivery single) {
                return new DeliveryPathResponse.DronePath(droneId, List.of(single));
            } else if (deliveryData instanceof DeliveryPathResponse.DronePath multi) {
                return multi;
            }
            throw new IllegalStateException("Invalid delivery data type");
        }
    }

    @Override
    public DeliveryPathResponse calculateDeliveryPath(List<MedDispatchRec> allDispatches) {
        logger.info("Starting path calculation for {} dispatches.", allDispatches.size());
        List<Region> noFlyZones = Arrays.stream(ilpRestClient.getRestrictedAreas())
                .map(ra -> new Region(ra.name(), ra.vertices())).collect(Collectors.toList());
        Map<PathSegment, List<Position>> pathCache = new HashMap<>();

        Map<LocalDate, List<MedDispatchRec>> dispatchesByDate = allDispatches.stream()
                .collect(Collectors.groupingBy(d -> LocalDate.parse(d.date())));

        List<DeliveryPathResponse.DronePath> allDronePaths = new ArrayList<>();
        double totalCost = 0;
        int totalMoves = 0;

        for (Map.Entry<LocalDate, List<MedDispatchRec>> entry : dispatchesByDate.entrySet()) {
            logger.info("Processing {} dispatches for date: {}", entry.getValue().size(), entry.getKey());
            List<MedDispatchRec> remainingDispatches = new ArrayList<>(entry.getValue());

            while (!remainingDispatches.isEmpty()) {
                boolean deliveryHandled = false;

                // Try multi-delivery with progressively fewer dispatches
                for (int numDispatches = remainingDispatches.size(); numDispatches >= 2; numDispatches--) {
                    List<MedDispatchRec> subset = remainingDispatches.subList(0, numDispatches);
                    List<String> availableDrones = droneService.findAvailableDronesForDispatches(subset);

                    if (!availableDrones.isEmpty()) {
                        String droneId = availableDrones.get(0);
                        Optional<Trip> tripOpt = planMultiDeliveryTrip(droneId, subset, noFlyZones, pathCache);

                        if (tripOpt.isPresent()) {
                            Trip trip = tripOpt.get();
                            allDronePaths.add(trip.toDronePath());
                            totalCost += trip.totalCost;
                            totalMoves += trip.totalMoves;

                            // Remove only the deliveries that were actually completed
                            DeliveryPathResponse.DronePath dronePath = trip.toDronePath();
                            Set<Long> completedIds = dronePath.deliveries().stream()
                                    .map(DeliveryPathResponse.Delivery::deliveryId)
                                    .collect(Collectors.toSet());
                            remainingDispatches.removeIf(d -> completedIds.contains(d.id()));

                            deliveryHandled = true;
                            break; //  Move to next iteration of while loop if successful
                        }
                    }
                }

                // If multi-delivery didn't work, fall back to single delivery
                if (!deliveryHandled) {
                    MedDispatchRec dispatch = remainingDispatches.get(0);
                    List<String> dronesForSingle = droneService.findAvailableDronesForDispatches(List.of(dispatch));

                    if (dronesForSingle.isEmpty()) {
                        logger.error("No drone available for dispatch {}. Skipping.", dispatch.id());
                        remainingDispatches.remove(0);
                        continue;
                    }

                    String droneId = dronesForSingle.get(0);
                    Optional<Trip> tripOpt = planSingleDeliveryTrip(droneId, dispatch, noFlyZones, pathCache);

                    if (tripOpt.isPresent()) {
                        Trip trip = tripOpt.get();
                        allDronePaths.add(trip.toDronePath());
                        totalCost += trip.totalCost;
                        totalMoves += trip.totalMoves;
                    } else {
                        logger.error("Could not plan trip for dispatch {}. Skipping.", dispatch.id());
                    }

                    remainingDispatches.remove(0);
                }
            }
        }

        logger.info("Path calculation finished. Total Moves: {}, Total Cost: {}", totalMoves, totalCost);
        return new DeliveryPathResponse(totalCost, totalMoves, allDronePaths);
    }

    /**
     * Plans a simple, single-delivery trip: Service Point -> Delivery -> Service Point.
     */
    private Optional<Trip> planSingleDeliveryTrip(String droneId, MedDispatchRec dispatch, List<Region> noFlyZones, Map<PathSegment, List<Position>> pathCache) {
        Drone drone = droneService.findDroneDetailsById(droneId).orElse(null);
        ServicePoint startPoint = findServicePointForDrone(droneId).orElse(null);
        if (drone == null || startPoint == null) return Optional.empty();

        logger.debug("Planning single delivery trip for Drone ID '{}' to dispatch {}", droneId, dispatch.id());

        List<Position> pathThere = getOrCalculatePath(startPoint.location(), dispatch.delivery(), noFlyZones, pathCache);
        if (pathThere.isEmpty()) {
            logger.error("A* could not find path to delivery {}.", dispatch.id());
            return Optional.empty();
        }

        Position actualDeliveryPosition = pathThere.get(pathThere.size() - 1);
        List<Position> pathBack = getOrCalculatePath(actualDeliveryPosition, startPoint.location(), noFlyZones, pathCache);
        if (pathBack.isEmpty()) {
            logger.error("A* could not find return path from delivery {}.", dispatch.id());
            return Optional.empty();
        }

        // build path
        List<Position> fullFlightPath = new ArrayList<>(pathThere);
        fullFlightPath.add(actualDeliveryPosition); // Hover
        fullFlightPath.addAll(pathBack.stream().skip(1).toList());

        int totalTripMoves = fullFlightPath.size() - 1;

        if (totalTripMoves > drone.capability().maxMoves()) {
            logger.warn("Trip for dispatch {} exceeds maxMoves for drone {}. ({} > {})", dispatch.id(), droneId, totalTripMoves, drone.capability().maxMoves());
            return Optional.empty();
        }

        DeliveryPathResponse.Delivery deliverySegment = new DeliveryPathResponse.Delivery(dispatch.id(), fullFlightPath);
        double totalTripCost = drone.capability().costInitial() + drone.capability().costFinal() + (totalTripMoves * drone.capability().costPerMove());


        if (dispatch.requirements().maxCost() != null && totalTripCost > dispatch.requirements().maxCost()) {
            logger.warn("Trip for dispatch {} exceeds maxCost: {} > {}",
                    dispatch.id(), totalTripCost, dispatch.requirements().maxCost());
            return Optional.empty();
        }


        Trip trip = new Trip(droneId, startPoint, deliverySegment, totalTripCost, totalTripMoves);
        return Optional.of(trip);
    }

    private Optional<Trip> planMultiDeliveryTrip(String droneId, List<MedDispatchRec> dispatches,
                                                 List<Region> noFlyZones, Map<PathSegment, List<Position>> pathCache) {
        Drone drone = droneService.findDroneDetailsById(droneId).orElse(null);
        ServicePoint startPoint = findServicePointForDrone(droneId).orElse(null);
        if (drone == null || startPoint == null) return Optional.empty();

        logger.debug("Planning multi-delivery trip for Drone ID '{}' with {} dispatches", droneId, dispatches.size());

        // Order deliveries using nearest-neighbor greedy approach
        List<MedDispatchRec> orderedDispatches = orderDeliveriesGreedy(startPoint.location(), dispatches);

        logger.info("=== MULTI-DELIVERY TRIP START ===");
        logger.info("Service Point: {}", startPoint.location());
        logger.info("Ordered deliveries: {}", orderedDispatches.stream()
                .map(d -> String.format("D%d@(%f,%f)", d.id(), d.delivery().lng(), d.delivery().lat()))
                .collect(Collectors.joining(", ")));

        List<DeliveryPathResponse.Delivery> deliverySegments = new ArrayList<>();
        Position currentPosition = startPoint.location();
        int totalMoves = 0;

        // Build path through all deliveries
        for (int i = 0; i < orderedDispatches.size(); i++) {
            MedDispatchRec dispatch = orderedDispatches.get(i);

            logger.info("\n--- Processing Delivery {} (#{} of {}) ---", dispatch.id(), i + 1, orderedDispatches.size());
            logger.info("Current position BEFORE pathfinding: lng={}, lat={}",
                    currentPosition.lng(), currentPosition.lat());
            logger.info("Target delivery location: lng={}, lat={}",
                    dispatch.delivery().lng(), dispatch.delivery().lat());

            logger.info("Finding path from {} to {}", currentPosition, dispatch.delivery());
            // Path to this delivery
            List<Position> pathToDelivery = getOrCalculatePath(currentPosition, dispatch.delivery(), noFlyZones, pathCache);
            if (pathToDelivery.isEmpty()) {
                logger.error("Cannot find path to delivery {}", dispatch.id());
                return Optional.empty();
            }

            logger.info("A* returned path with {} positions", pathToDelivery.size());
            logger.info("Path STARTS at: lng={}, lat={}",
                    pathToDelivery.get(0).lng(), pathToDelivery.get(0).lat());
            logger.info("Path ENDS at: lng={}, lat={}",
                    pathToDelivery.get(pathToDelivery.size() - 1).lng(),
                    pathToDelivery.get(pathToDelivery.size() - 1).lat());

            // keep this check
            if (!pathToDelivery.get(0).equals(currentPosition)) {
                logger.error("❌ PATH MISMATCH! Path doesn't start at current position!");
                logger.error("Expected: lng={}, lat={}", currentPosition.lng(), currentPosition.lat());
                logger.error("Got:      lng={}, lat={}", pathToDelivery.get(0).lng(), pathToDelivery.get(0).lat());
                logger.error("Distance difference: {} meters",
                        geometryService.calculateDistance(currentPosition, pathToDelivery.get(0)) * 111000);
            } else {
                logger.info("✅ Path starts at correct position");
            }

            Position actualDeliveryPos = pathToDelivery.get(pathToDelivery.size() - 1);

            // Build the delivery segment based on position in sequence
            List<Position> deliveryFlightPath = new ArrayList<>();

            if (i == 0) {
                logger.info("Building FIRST delivery segment");
                // for first delivery, starts from service point
                deliveryFlightPath.addAll(pathToDelivery);
                deliveryFlightPath.add(actualDeliveryPos); // Hover at end

                logger.info("Added {} positions from path + 1 hover", pathToDelivery.size());

                // if this is also the last delivery (single delivery case), return to S.P
                if (orderedDispatches.size() == 1) {
                    logger.info("This is the ONLY delivery, adding return path");
                    List<Position> returnPath = getOrCalculatePath(actualDeliveryPos, startPoint.location(), noFlyZones, pathCache);
                    if (returnPath.isEmpty()) {
                        logger.error("Cannot find return path from delivery {}", dispatch.id());
                        return Optional.empty();
                    }
                    deliveryFlightPath.addAll(returnPath.stream().skip(1).toList());


                }
            } else {
                logger.info("Building SUBSEQUENT delivery segment");


                deliveryFlightPath.addAll(pathToDelivery);  // Include full path

                deliveryFlightPath.add(actualDeliveryPos); // Hover

                logger.info("Added {} positions (skipped first) + 1 hover", pathToDelivery.size() - 1);

                // If this is the last delivery, add return path to service point
                if (i == orderedDispatches.size() - 1) {
                    logger.info("This is the LAST delivery, adding return path");
                    List<Position> returnPath = getOrCalculatePath(actualDeliveryPos, startPoint.location(), noFlyZones, pathCache);
                    if (returnPath.isEmpty()) {
                        logger.error("Cannot find return path from delivery {}", dispatch.id());
                        return Optional.empty();
                    }
                    deliveryFlightPath.addAll(returnPath.stream().skip(1).toList());


                }
            }

            logger.info("Final delivery segment has {} positions", deliveryFlightPath.size());
            logger.info("Segment STARTS at: lng={}, lat={}",
                    deliveryFlightPath.get(0).lng(), deliveryFlightPath.get(0).lat());
            logger.info("Segment ENDS at: lng={}, lat={}",
                    deliveryFlightPath.get(deliveryFlightPath.size() - 1).lng(),
                    deliveryFlightPath.get(deliveryFlightPath.size() - 1).lat());

            deliverySegments.add(new DeliveryPathResponse.Delivery(dispatch.id(), deliveryFlightPath));
            totalMoves += deliveryFlightPath.size() - 1;

            logger.info("Updating currentPosition to actualDeliveryPos");
            logger.info("OLD currentPosition: lng={}, lat={}", currentPosition.lng(), currentPosition.lat());
            currentPosition = actualDeliveryPos;
            logger.info("NEW currentPosition: lng={}, lat={}", currentPosition.lng(), currentPosition.lat());
            logger.info("Total moves so far: {}", totalMoves);
        }

        logger.info("\n=== MULTI-DELIVERY TRIP SUMMARY ===");
        logger.info("Total deliveries: {}", deliverySegments.size());
        logger.info("Total moves: {}", totalMoves);
        logger.info("Total cost: {}", drone.capability().costInitial() + drone.capability().costFinal()
                + (totalMoves * drone.capability().costPerMove()));

        // Check if total moves exceeds drone capacity
        if (totalMoves > drone.capability().maxMoves()) {
            logger.warn("Multi-delivery trip exceeds maxMoves: {} > {}", totalMoves, drone.capability().maxMoves());
            return Optional.empty();
        }

        double totalCost = drone.capability().costInitial() + drone.capability().costFinal()
                + (totalMoves * drone.capability().costPerMove());


        //Re-check maxCost with actual path cost (pro-rata)
        double proRataCost = totalCost / dispatches.size();
        for (MedDispatchRec dispatch : dispatches) {
            if (dispatch.requirements().maxCost() != null && proRataCost > dispatch.requirements().maxCost()) {
                logger.warn("Trip exceeds maxCost for dispatch {}: pro-rata cost {} > max {}",
                        dispatch.id(), proRataCost, dispatch.requirements().maxCost());
                return Optional.empty();
            }
        }

        // Return as a single DronePath with multiple deliveries
        DeliveryPathResponse.DronePath dronePath = new DeliveryPathResponse.DronePath(droneId, deliverySegments);
        return Optional.of(new Trip(droneId, startPoint, dronePath, totalCost, totalMoves));
    }

    private List<MedDispatchRec> orderDeliveriesGreedy(Position start, List<MedDispatchRec> dispatches) {
        List<MedDispatchRec> ordered = new ArrayList<>();
        List<MedDispatchRec> remaining = new ArrayList<>(dispatches);
        Position current = start;

        while (!remaining.isEmpty()) {
            // Find nearest delivery
            Position finalCurrent = current;
            MedDispatchRec nearest = remaining.stream()
                    .min(Comparator.comparingDouble(d -> geometryService.calculateDistance(finalCurrent, d.delivery())))
                    .orElseThrow();

            ordered.add(nearest);
            current = nearest.delivery();
            remaining.remove(nearest);
        }

        return ordered;
    }

    @Override
    public GeoJsonResponse calculateDeliveryPathAsGeoJson(List<MedDispatchRec> dispatches) {
        logger.info("Starting GeoJSON path calculation for {} dispatches.", dispatches.size());

        // Check if all dispatches are on the same date
        Set<LocalDate> uniqueDates = dispatches.stream()
                .map(d -> LocalDate.parse(d.date()))
                .collect(Collectors.toSet());

        if (uniqueDates.size() > 1) {
            logger.error("GeoJSON endpoint cannot handle dispatches on multiple dates. Found dates: {}", uniqueDates);
            return GeoJsonResponse.fromPaths(List.of());
        }

        // Call the existing calcDeliveryPath
        DeliveryPathResponse pathResponse = calculateDeliveryPath(dispatches);

        // Check if we got a valid response
        if (pathResponse.dronePaths().isEmpty()) {
            logger.warn("No valid path found for GeoJSON request");
            return GeoJsonResponse.fromPaths(List.of());
        }

        // Check it's a single drone (required for GeoJSON visualization)
        Set<String> droneIds = pathResponse.dronePaths().stream()
                .map(DeliveryPathResponse.DronePath::droneId)
                .collect(Collectors.toSet());

        if (droneIds.size() > 1) {
            logger.error("GeoJSON requires single drone, got multiple: {}", droneIds);
            return GeoJsonResponse.fromPaths(List.of());
        }

        // Transform to GeoJSON
        return transformToGeoJson(pathResponse);
    }

    private GeoJsonResponse transformToGeoJson(DeliveryPathResponse response) {
        List<List<Position>> trips = new ArrayList<>();

        for (DeliveryPathResponse.DronePath dronePath : response.dronePaths()) {
            // Each dronePath is a separate trip
            List<Position> tripPath = new ArrayList<>();

            for (DeliveryPathResponse.Delivery delivery : dronePath.deliveries()) {
                if (tripPath.isEmpty()) {
                    tripPath.addAll(delivery.flightPath());
                } else {
                    tripPath.addAll(delivery.flightPath().stream().skip(1).toList());
                }
            }

            trips.add(tripPath);
        }

        return GeoJsonResponse.fromPaths(trips);
    }

    private List<Position> getOrCalculatePath(Position start, Position end, List<Region> noFlyZones, Map<PathSegment, List<Position>> cache) {
        PathSegment segment = new PathSegment(start, end);
        return cache.computeIfAbsent(segment, s -> pathfinder.findPath(s.start(), s.end(), noFlyZones));
    }

    private Optional<ServicePoint> findServicePointForDrone(String droneId) {
        DroneForServicePoint[] availabilities = ilpRestClient.getDronesForServicePoints();
        ServicePoint[] servicePoints = ilpRestClient.getServicePoints();
        for (DroneForServicePoint spAvail : availabilities) {
            if (spAvail.drones().stream().anyMatch(d -> d.id().equals(droneId))) {
                return Arrays.stream(servicePoints).filter(sp -> sp.id().equals(spAvail.servicePointId())).findFirst();
            }
        }
        return Optional.empty();
    }
}