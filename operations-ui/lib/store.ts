import { create } from 'zustand';
import { PathSegment } from './types';


export type DeliveryStatus = 'pending' | 'assigned' | 'in-flight' | 'delivered';

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
    path?: PathSegment[];
    progress?: number;
    flightStartTime?: number; // ⭐ Track when flight actually started
  }

interface DeliveryStore {
  deliveries: Delivery[];
  addDelivery: (delivery: Delivery) => void;
  updateDeliveryStatus: (id: number, status: DeliveryStatus) => void;
  updateDeliveryProgress: (id: number, progress: number) => void; // ⭐ Add this
}

export const useDeliveryStore = create<DeliveryStore>((set) => ({
    deliveries: [],
    addDelivery: (delivery) =>
      set((state) => ({
        deliveries: [...state.deliveries, delivery],
      })),
    updateDeliveryStatus: (id, status) =>
      set((state) => ({
        deliveries: state.deliveries.map((d) =>
          d.id === id 
            ? { 
                ...d, 
                status,
                // ⭐ Set flight start time when status changes to in-flight
                flightStartTime: status === 'in-flight' ? Date.now() : d.flightStartTime,
              } 
            : d
        ),
      })),
    updateDeliveryProgress: (id, progress) =>
      set((state) => ({
        deliveries: state.deliveries.map((d) =>
          d.id === id ? { ...d, progress } : d
        ),
      })),
  }));