const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export class BackendClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
    console.log('BackendClient initialized with baseUrl:', this.baseUrl);
  }

  async queryAvailableDrones(dispatches: any[]): Promise<string[]> {
    const url = `${this.baseUrl}/api/v1/queryAvailableDrones`;
    console.log('🌐 Calling:', url);
    console.log('📦 With data:', JSON.stringify(dispatches, null, 2));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatches),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Backend result:', result);
      return result;
    } catch (error) {
      console.error('❌ Fetch failed:', error);
      throw error;
    }
  }

  async calculateDeliveryPath(dispatches: any[]): Promise<any> {
    const url = `${this.baseUrl}/api/v1/calcDeliveryPath`;
    console.log('🌐 Calling:', url);
    console.log('📦 With data:', JSON.stringify(dispatches, null, 2));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatches),
      });
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Backend result:', result);
      
      // ⭐ ADD THIS VALIDATION
      const plannedCount = result.dronePaths?.reduce((sum: number, path: any) => 
        sum + (path.deliveries?.length || 0), 0) || 0;
      
      if (plannedCount < dispatches.length) {
        const warning = `⚠️ Only ${plannedCount} of ${dispatches.length} deliveries could be planned. Some locations may be out of range.`;
        console.warn(warning);
        result.warning = warning;
        result.deliveriesPlanned = plannedCount;
        result.deliveriesRequested = dispatches.length;
      }
      
      return result;
    } catch (error) {
      console.error('❌ Fetch failed:', error);
      throw error;
    }
  }

  async getDroneDetails(droneId: string): Promise<any> {
    const url = `${this.baseUrl}/api/v1/droneDetails/${droneId}`;
    console.log(`🌐 Calling: ${url}`);
    
    try {
      const response = await fetch(url);
      console.log('📥 Response status:', response.status);
  
      // Handle 404 as "not found"  - return null (not an error)
      if (response.status === 404) {
        console.log('ℹ️  Drone not found (404) - returning null');
        return null;
      }
  
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
  
      const result = await response.json();
      console.log('✅ Drone details:', result);
      return result;
    } catch (error) {
      console.error('❌ Fetch failed:', error);
      throw error;
    }
  }

  async getDronesWithCooling(hasCooling: boolean): Promise<string[]> {
    const url = `${this.baseUrl}/api/v1/dronesWithCooling/${hasCooling}`;
    console.log('🌐 Calling:', url);
    
    try {
      const response = await fetch(url);
      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Drones with cooling:', result);
      return result;
    } catch (error) {
      console.error('❌ Fetch failed:', error);
      throw error;
    }
  }

  async explainAvailability(dispatch: any): Promise<any> {
    const url = `${this.baseUrl}/api/v1/explainAvailability`;
    console.log('🌐 Calling:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatch),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Availability explanation:', result);
      return result;
    } catch (error) {
      console.error('❌ Fetch failed:', error);
      throw error;
    }
  }

  
}