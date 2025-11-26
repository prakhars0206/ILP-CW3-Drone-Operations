package ILP.coursework.ILP.coursework1.Controllers;

import ILP.coursework.ILP.coursework1.Service.AvailabilityService;
import ILP.coursework.ILP.coursework1.Service.DroneService;
import ILP.coursework.ILP.coursework1.Service.PathService;
import ILP.coursework.ILP.coursework1.dto.DeliveryPathResponse;
import ILP.coursework.ILP.coursework1.dto.Drone;
import ILP.coursework.ILP.coursework1.dto.GeoJsonResponse;
import jakarta.validation.Valid;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.*;
import ILP.coursework.ILP.coursework1.Service.GeometryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RequestMapping("/api/v1")
@RestController()
public class ServiceController {

    private final GeometryService geometryService;
    private final DroneService droneService;
    private final PathService pathService;
    private final AvailabilityService availabilityService;


    public ServiceController(GeometryService geometryService, DroneService droneService, PathService pathService, AvailabilityService availabilityService) {

        this.geometryService = geometryService;

        this.droneService = droneService;
        this.pathService = pathService;

        this.availabilityService = availabilityService;
    }


    @GetMapping("/uid")
    public String uid() {

        return "s2479386";
    }

    @PostMapping("/distanceTo")
    public ResponseEntity<?> distanceTo(@Valid @RequestBody TwoPositionRequest request) {
        double distance = geometryService.calculateDistance(request.position1(), request.position2());
        return ResponseEntity.ok(distance);
    }

    @PostMapping("/isCloseTo")
    public ResponseEntity<?> isCloseTo(@Valid @RequestBody TwoPositionRequest request){
        boolean isClose = geometryService.checkPointsClose(request.position1(), request.position2());
        return ResponseEntity.ok(isClose);
    }

    @PostMapping("/nextPosition")
    public ResponseEntity<?> nextPosition(@Valid @RequestBody NextPositionRequest request) {
        Position nextPos = geometryService.calculateNextPosition(request.start(), request.angle());
        return ResponseEntity.ok(nextPos);
    }

    @PostMapping("/isInRegion")
    public ResponseEntity<?> isInRegion(@Valid @RequestBody IsInRegionRequest request) {
        boolean isIn = geometryService.isPointInRegion(request.position(), request.region());
        return ResponseEntity.ok(isIn);
    }

    //CW2 stuff

    @GetMapping("/dronesWithCooling/{state}")
    public ResponseEntity<List<String>> getDronesWithCooling(@PathVariable boolean state) {
        List<String> droneIds = droneService.findDronesWithCooling(state);
        return ResponseEntity.ok(droneIds);
    }

    @GetMapping("/droneDetails/{id}")
    public ResponseEntity<Drone> getDroneDetails(@PathVariable String id) {
        Optional<Drone> drone = droneService.findDroneDetailsById(id);

        // This is the one CW2 endpoint that uses a 404 res
        return drone.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/queryAsPath/{attribute-name}/{attribute-value}")
    public ResponseEntity<List<String>> queryAsPath(@PathVariable("attribute-name") String attributeName, @PathVariable("attribute-value") String attributeValue) {
        List<String> droneIds = droneService.findDronesByAttribute(attributeName, attributeValue);
        return ResponseEntity.ok(droneIds);
    }

    @PostMapping("/query")
    public ResponseEntity<List<String>> queryByBody(@RequestBody List<Query> queries) {
        List<String > droneIds = droneService.findDronesByQuery(queries);
        return ResponseEntity.ok(droneIds);
    }

    @PostMapping("/queryAvailableDrones")
    public ResponseEntity<List<String>> queryAvailableDrones(@RequestBody List<MedDispatchRec> dispatches) {
        List<String> droneIds = droneService.findAvailableDronesForDispatches(dispatches);
        return ResponseEntity.ok(droneIds);
    }

    @PostMapping("/calcDeliveryPath")
    public ResponseEntity<DeliveryPathResponse> calcDeliveryPath(@RequestBody List<MedDispatchRec> dispatches) {
        return ResponseEntity.ok(pathService.calculateDeliveryPath(dispatches));
    }

    @PostMapping("/calcDeliveryPathAsGeoJson")
    public ResponseEntity<GeoJsonResponse> calcDeliveryPathAsGeoJson(@RequestBody List<MedDispatchRec> dispatches) {
        return ResponseEntity.ok(pathService.calculateDeliveryPathAsGeoJson(dispatches));
    }

    // CW3 stuff - Constraint Explanation
    @PostMapping("/explainAvailability")
    public ResponseEntity<AvailabilityService.AvailabilityExplanation> explainAvailability(
            @RequestBody MedDispatchRec dispatch) {
        return ResponseEntity.ok(availabilityService.explainAvailability(dispatch));
    }

}
