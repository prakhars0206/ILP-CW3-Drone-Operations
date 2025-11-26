package ILP.coursework.ILP.coursework1.client;

import ILP.coursework.ILP.coursework1.dto.Drone;
import ILP.coursework.ILP.coursework1.dto.DroneForServicePoint;
import ILP.coursework.ILP.coursework1.dto.RestrictedArea;
import ILP.coursework.ILP.coursework1.dto.ServicePoint;

public interface IlpRestClient {
    Drone[] getDrones();
    ServicePoint[] getServicePoints();
    DroneForServicePoint[] getDronesForServicePoints();
    RestrictedArea[] getRestrictedAreas();
}