package ILP.coursework.ILP.coursework1.Controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A simple controller to handle requests to the root path ("/") of the server.
 * This prevents "NoResourceFoundException" errors from automated health checks or browsers.
 */
@RestController
public class RootController {

    // This method is NOT prefixed with /api/v1 because there is no @RequestMapping on the class.
    @GetMapping("/")
    public ResponseEntity<String> getRoot() {
        String welcomeMessage = "Welcome to the Drone Medication Delivery API. API endpoints are available under /api/v1.";
        return ResponseEntity.ok(welcomeMessage);
    }
}