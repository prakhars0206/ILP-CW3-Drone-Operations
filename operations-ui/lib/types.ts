

export interface PathSegment {
    deliveryId?: number;
    flightPath?: Array<{ lat: number; lng: number }>;
    to?: { lat: number; lng: number };
    from?: { lat: number; lng: number };
    capacity?: number;
    weight?: number;
  }
  
  export interface Delivery {
    id: number;
    weight: number;
    location: string;
    date: string;
    time: string;
    cooling: boolean;
    heating: boolean;
    status: 'pending' | 'assigned' | 'in-flight' | 'delivered';
    assignedDrone?: string;
    cost?: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
    // ⭐ NEW: Store the actual path from backend
    path?: PathSegment[];
  }
  
  
  export interface Drone {
    id: string;
    name: string;
    status: 'available' | 'in-flight' | 'maintenance';
    capability: {
      cooling: boolean;
      heating: boolean;
      capacity: number;
      maxMoves: number;
      costPerMove: number;
    };
    currentDelivery?: number;
  }
  
  export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: Array<{
      name: string;
      status: 'running' | 'completed' | 'error';
    }>;
    timestamp: Date;
  }
  
  export interface MedDispatchRec {
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