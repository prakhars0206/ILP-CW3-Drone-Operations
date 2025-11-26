package ILP.coursework.ILP.coursework1.dto;

import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record GeoJsonResponse(
        String type,
        List<Feature> features
) {
    public record Feature(
            String type,
            Geometry geometry,
            Map<String, Object> properties
    ) {}

    public record Geometry(
            String type,
            List<List<Double>> coordinates
    ) {}

    public static GeoJsonResponse fromPaths(List<List<Position>> paths) {
        List<Feature> features = paths.stream()
                .map(path -> {
                    List<List<Double>> coords = path.stream()
                            .map(pos -> List.of(pos.lng(), pos.lat()))
                            .collect(Collectors.toList());

                    Geometry geometry = new Geometry("LineString", coords);
                    return new Feature("Feature", geometry, Map.of());
                })
                .collect(Collectors.toList());

        return new GeoJsonResponse("FeatureCollection", features);
    }

    // For empty case
    public static GeoJsonResponse empty() {
        return new GeoJsonResponse("FeatureCollection", List.of());
    }
}