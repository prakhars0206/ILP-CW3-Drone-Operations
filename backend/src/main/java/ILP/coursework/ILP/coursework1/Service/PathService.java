package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.dto.DeliveryPathResponse;
import ILP.coursework.ILP.coursework1.dto.GeoJsonResponse;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.MedDispatchRec;
import java.util.List;

public interface PathService {
    DeliveryPathResponse calculateDeliveryPath(List<MedDispatchRec> dispatches);
    GeoJsonResponse calculateDeliveryPathAsGeoJson(List<MedDispatchRec> dispatches);
}