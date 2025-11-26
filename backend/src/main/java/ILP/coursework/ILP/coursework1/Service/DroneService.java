package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.dto.Drone;
import ILP.coursework.ILP.coursework1.dto.JsonDtos;

import java.util.List;
import java.util.Optional;

public interface DroneService {
    List<String> findDronesWithCooling(boolean state);
    Optional<Drone> findDroneDetailsById(String id);

    List<String> findDronesByAttribute(String attributeName, String attributeValue);
    List<String> findDronesByQuery(List<JsonDtos.Query> queries);

    List<String> findAvailableDronesForDispatches(List<JsonDtos.MedDispatchRec> dispatches);

}