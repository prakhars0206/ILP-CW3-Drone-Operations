/**
 * @jest-environment node
 */

import { BackendClient } from '@/lib/backend-client';
import { startBackend, stopBackend } from './helpers/backend-launcher';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

describe('FR10: Backend Response Schema Compatibility (Integration Level)', () => {
  
  let backendClient: BackendClient;
  
  // Start backend before ALL tests in this file
  beforeAll(async () => {
    console.log('📋 Setting up integration tests...');
    await startBackend();
    console.log('🔗 Backend ready at:', BACKEND_URL);
  }, 90000); // 90 second timeout for backend startup
  
  // Stop backend after ALL tests complete
  afterAll(async () => {
    console.log('🧹 Cleaning up...');
    await stopBackend();
  }, 10000); // 10 second timeout for shutdown
  
  beforeEach(() => {
    backendClient = new BackendClient(BACKEND_URL);
  });

  describe('TC-FR10-01: DeliveryPathResponse schema validation', () => {
    
    test('should return valid schema for single delivery', async () => {
      const deliveryInput = [{
        id: 1,
        date: '2025-12-15',
        time: '14:00',
        requirements: { capacity: 2.0 },
        delivery: { lng: -3.2351, lat: 55.9623 },
      }];
      
      const response = await backendClient.calculateDeliveryPath(deliveryInput);
      
      // Validate schema
      expect(response).toHaveProperty('totalCost');
      expect(response).toHaveProperty('totalMoves');
      expect(response).toHaveProperty('dronePaths');
      
      expect(typeof response.totalCost).toBe('number');
      expect(typeof response.totalMoves).toBe('number');
      expect(Array.isArray(response.dronePaths)).toBe(true);
      
      expect(response.totalCost).toBeGreaterThan(0);
      
      if (response.dronePaths.length > 0) {
        const path = response.dronePaths[0];
        expect(path).toHaveProperty('droneId');
        expect(path).toHaveProperty('deliveries');
        expect(typeof path.droneId).toBe('string');
        expect(Array.isArray(path.deliveries)).toBe(true);
      }
    });
    
    test('should handle impossible delivery gracefully', async () => {
      const impossibleDelivery = [{
        id: 1,
        date: '2025-12-15',
        time: '14:00',
        requirements: { capacity: 2.0 },
        delivery: { lng: -10, lat: 50 }, // Far outside range
      }];
      
      const response = await backendClient.calculateDeliveryPath(impossibleDelivery);
      
      expect(response).toHaveProperty('totalCost');
      expect(response).toHaveProperty('dronePaths');
      expect(response.dronePaths.length).toBe(0);
    });
    
    test('should validate flight path coordinates', async () => {
      const deliveryInput = [{
        id: 1,
        date: '2025-12-15',
        time: '14:00',
        requirements: { capacity: 1.0 },
        delivery: { lng: -3.1365, lat: 55.9215 },
      }];
      
      const response = await backendClient.calculateDeliveryPath(deliveryInput);
      
      expect(response.dronePaths.length).toBeGreaterThan(0);
      
      const flightPath = response.dronePaths[0].deliveries[0].flightPath;
      
      expect(Array.isArray(flightPath)).toBe(true);
      expect(flightPath.length).toBeGreaterThan(0);
      
      flightPath.forEach((pos: { lng: number; lat: number }) => {
        expect(pos).toHaveProperty('lng');
        expect(pos).toHaveProperty('lat');
        expect(typeof pos.lng).toBe('number');
        expect(typeof pos.lat).toBe('number');
        expect(pos.lng).toBeGreaterThanOrEqual(-180);
        expect(pos.lng).toBeLessThanOrEqual(180);
        expect(pos.lat).toBeGreaterThanOrEqual(-90);
        expect(pos.lat).toBeLessThanOrEqual(90);
      });
    });
  });

  describe('TC-FR10-02: QueryAvailableDrones schema validation', () => {
    
    test('should return string array of drone IDs', async () => {
      const deliveryInput = [{
        id: 1,
        date: '2025-12-15',
        time: '14:00',
        requirements: { capacity: 2.0, cooling: true },
        delivery: { lng: -3.2351, lat: 55.9623 },
      }];
      
      const response = await backendClient.queryAvailableDrones(deliveryInput);
      
      expect(Array.isArray(response)).toBe(true);
      response.forEach(droneId => {
        expect(typeof droneId).toBe('string');
      });
      expect(response.length).toBeGreaterThan(0);
    });
    
    test('should return empty array for impossible requirements', async () => {
      const heavyDelivery = [{
        id: 1,
        date: '2025-12-15',
        time: '14:00',
        requirements: { capacity: 100.0 },
        delivery: { lng: -3.2351, lat: 55.9623 },
      }];
      
      const response = await backendClient.queryAvailableDrones(heavyDelivery);
      
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBe(0);
    });
  });

  describe('TC-FR10-03: DroneDetails schema validation', () => {
    
    test('should return valid Drone schema', async () => {
      const response = await backendClient.getDroneDetails('1');
      
      expect(response).not.toBeNull();
      
      if (response) {
        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('name');
        expect(response).toHaveProperty('capability');
        
        const cap = response.capability;
        expect(cap).toHaveProperty('cooling');
        expect(cap).toHaveProperty('heating');
        expect(cap).toHaveProperty('capacity');
        expect(cap).toHaveProperty('maxMoves');
        expect(cap).toHaveProperty('costPerMove');
        expect(cap).toHaveProperty('costInitial');
        expect(cap).toHaveProperty('costFinal');
        
        expect(typeof cap.cooling).toBe('boolean');
        expect(typeof cap.heating).toBe('boolean');
        expect(typeof cap.capacity).toBe('number');
        expect(typeof cap.maxMoves).toBe('number');
        expect(typeof cap.costPerMove).toBe('number');
      }
    });
    
    test('should return null for non-existent drone', async () => {
      const response = await backendClient.getDroneDetails('999');
      expect(response).toBeNull();
    });
  });

  describe('TC-FR10-04: Multi-delivery response schema', () => {
    
    test('should handle multiple deliveries', async () => {
      const multiDeliveryInput = [
        {
          id: 1,
          date: '2025-12-15',
          time: '14:00',
          requirements: { capacity: 2.0 },
          delivery: { lng: -3.2351, lat: 55.9623 },
        },
        {
          id: 2,
          date: '2025-12-15',
          time: '15:00',
          requirements: { capacity: 1.0 },
          delivery: { lng: -3.1365, lat: 55.9215 },
        },
      ];
      
      const response = await backendClient.calculateDeliveryPath(multiDeliveryInput);
      
      expect(response.dronePaths.length).toBeGreaterThan(0);
      
      const totalDeliveries = response.dronePaths.reduce(
        (sum: number, dp: any) => sum + dp.deliveries.length,
        0
      );
      
      expect(totalDeliveries).toBeGreaterThan(0);
      expect(totalDeliveries).toBeLessThanOrEqual(2);
    });
  });
});