package ILP.coursework.ILP.coursework1.Service;

import ILP.coursework.ILP.coursework1.dto.JsonDtos;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import org.springframework.stereotype.Service;

@Service
public interface GeometryService {

    double calculateDistance(Position p1, Position p2);

    boolean checkPointsClose(Position p1, Position p2);

    Position calculateNextPosition(Position start, double angle);

    boolean isPointInRegion(Position point, JsonDtos.Region region);

    boolean checkLineIntersectsRegion(Position from, Position to, JsonDtos.Region region);

}
