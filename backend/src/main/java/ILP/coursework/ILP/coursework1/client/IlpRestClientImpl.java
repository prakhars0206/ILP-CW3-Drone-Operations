package ILP.coursework.ILP.coursework1.client;

import ILP.coursework.ILP.coursework1.dto.Drone;
import ILP.coursework.ILP.coursework1.dto.DroneForServicePoint;
import ILP.coursework.ILP.coursework1.dto.RestrictedArea;
import ILP.coursework.ILP.coursework1.dto.ServicePoint;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class IlpRestClientImpl implements IlpRestClient {

    private final RestTemplate restTemplate;
    private static final String DEFAULT_BASE_URL = "https://ilp-rest-2025-bvh6e9hschfagrgy.ukwest-01.azurewebsites.net";

    public IlpRestClientImpl(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;  //Plain RestTemplate, no rootUri
    }

    //Read environment variable fresh on every call
    private String getBaseUrl() {
        String url = System.getenv("ILP_ENDPOINT");
        return (url != null && !url.isEmpty()) ? url : DEFAULT_BASE_URL;
    }

    @Override
    public Drone[] getDrones() {
        String url = getBaseUrl() + "/drones";  //Fresh URL each time
        return restTemplate.getForObject(url, Drone[].class);
    }

    @Override
    public ServicePoint[] getServicePoints() {
        String url = getBaseUrl() + "/service-points";
        return restTemplate.getForObject(url, ServicePoint[].class);
    }

    @Override
    public DroneForServicePoint[] getDronesForServicePoints() {
        String url = getBaseUrl() + "/drones-for-service-points";
        return restTemplate.getForObject(url, DroneForServicePoint[].class);
    }

    @Override
    public RestrictedArea[] getRestrictedAreas() {
        String url = getBaseUrl() + "/restricted-areas";
        return restTemplate.getForObject(url, RestrictedArea[].class);
    }
}