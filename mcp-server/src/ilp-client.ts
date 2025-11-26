// src/ilp-client.ts

interface DroneAvailabilityCheck {
    droneId: string;
    droneName: string;
    available: boolean;
    reasons: string[];
  }
  
  interface AvailabilityExplanation {
    droneChecks: DroneAvailabilityCheck[];
    suggestions: string[];
  }
interface Drone {
    id: string;
    name: string;
    capability: {
      cooling: boolean;
      heating: boolean;
      capacity: number;
      maxMoves: number;
      costPerMove: number;
      costInitial: number;
      costFinal: number;
    };
  }
  
  interface MedDispatchRec {
    id: number;
    date: string;
    time: string;
    requirements: {
      capacity: number;
      cooling?: boolean;
      heating?: boolean;
      maxCost?: number;
    };
    delivery: {
      lng: number;
      lat: number;
    };
  }
  
  interface DeliveryPathResponse {
    totalCost: number;
    totalMoves: number;
    dronePaths: Array<{
      droneId: string;
      deliveries: Array<{
        deliveryId: number;
        flightPath: Array<{
          lng: number;
          lat: number;
        }>;
      }>;
    }>;
  }
  
  export class ILPClient {
    private baseUrl: string;
  
    constructor(baseUrl: string) {
      this.baseUrl = baseUrl;
    }
  
    async getDrones(): Promise<Drone[]> {
      const response = await fetch(`${this.baseUrl}/api/v1/dronesWithCooling/true`);
      if (!response.ok) {
        throw new Error(`Failed to get drones: ${response.status}`);
      }
      // This endpoint returns drone IDs, but we'll use a different approach
      // For now, let's call the external API to get all drones
      const externalResponse = await fetch(
        "https://ilp-rest-2025-bvh6e9hschfagrgy.ukwest-01.azurewebsites.net/drones"
      );
      return externalResponse.json();
    }
  
    async getDroneDetails(droneId: string): Promise<Drone | null> {
      const response = await fetch(`${this.baseUrl}/api/v1/droneDetails/${droneId}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to get drone details: ${response.status}`);
      }
      return response.json();
    }
  
    async queryAvailableDrones(dispatches: MedDispatchRec[]): Promise<string[]> {
      const response = await fetch(`${this.baseUrl}/api/v1/queryAvailableDrones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dispatches),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to query available drones: ${response.status}`);
      }
  
      return response.json();
    }
  
    async calculateDeliveryPath(dispatches: MedDispatchRec[]): Promise<DeliveryPathResponse> {
      const response = await fetch(`${this.baseUrl}/api/v1/calcDeliveryPath`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dispatches),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to calculate delivery path: ${response.status}`);
      }
  
      return response.json();
    }
  
    async getDronesWithCooling(hasCooling: boolean): Promise<string[]> {
      const response = await fetch(
        `${this.baseUrl}/api/v1/dronesWithCooling/${hasCooling}`
      );
  
      if (!response.ok) {
        throw new Error(`Failed to get drones with cooling: ${response.status}`);
      }
  
      return response.json();
    }

    async explainAvailability(dispatch: MedDispatchRec): Promise<AvailabilityExplanation> {
        const response = await fetch(`${this.baseUrl}/api/v1/explainAvailability`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dispatch),
        });
      
        if (!response.ok) {
          throw new Error(`Failed to explain availability: ${response.status}`);
        }
      
        return response.json();
      }
      
  }