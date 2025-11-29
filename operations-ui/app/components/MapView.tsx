'use client';

import React, { useEffect, useRef, useState, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDeliveryStore, Delivery } from '@/lib/store';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const servicePoint = { lat: 55.94468, lng: -3.18636 }; //Appleton
const oceanTerminal = { lat: 55.98119, lng: -3.17733 }; // Ocean Terminal


// ⭐ More distinct drone colors
const droneColors: { [key: string]: string } = {
  '1': '#EF4444', // Red
  '2': '#10B981', // Green  
  '3': '#3B82F6', // Blue
  '4': '#F59E0B', // Orange
  '5': '#8B5CF6', // Purple
  '6': '#EC4899', // Pink
  '7': '#14B8A6', // Teal
  '8': '#F97316', // Dark Orange
  '9': '#6366F1', // Indigo
};

// ⭐ Create colored drone SVG icon
const getDroneIcon = (droneId: string = '1') => {
  const color = droneColors[droneId] || '#3B82F6';
  
  const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${droneId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="20" cy="20" r="8" fill="${color}" filter="url(#shadow-${droneId})"/>
      <circle cx="12" cy="12" r="4" fill="${color}" opacity="0.7"/>
      <circle cx="28" cy="12" r="4" fill="${color}" opacity="0.7"/>
      <circle cx="12" cy="28" r="4" fill="${color}" opacity="0.7"/>
      <circle cx="28" cy="28" r="4" fill="${color}" opacity="0.7"/>
      <circle cx="20" cy="20" r="3" fill="white"/>
    </svg>
  `;
  
  return new L.DivIcon({
    html: svgIcon,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'drone-icon-custom',
  });
};

const hospitalIcon = new L.DivIcon({
  html: '<div style="font-size: 32px;">🏥</div>',
  iconSize: [32, 32],
  className: 'hospital-icon',
});

const deliveryIcon = new L.DivIcon({
  html: '<div style="font-size: 32px;">📦</div>',
  iconSize: [32, 32],
  className: 'delivery-icon',
});

interface AnimatedDeliveryProps {
  delivery: Delivery;
}

function calculatePathLength(path: any[]): number {
  let totalMoves = 0;
  path.forEach((segment: any) => {
    if (segment.flightPath) {
      totalMoves += segment.flightPath.length;
    }
  });
  return totalMoves;
}

// ⭐ Memoized drone animation component with persistent state
const AnimatedDelivery = memo(({ delivery }: AnimatedDeliveryProps) => {
  const [progress, setProgress] = useState(0);
  const [dronePosition, setDronePosition] = useState(servicePoint);
  const animationRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  
  const pathLength = calculatePathLength(delivery.path || []);
  // ⭐ Faster speed: 2 moves per second instead of 1
  const duration = (pathLength / 2) * 1000;
  
  const updateDeliveryProgress = useDeliveryStore((state) => state.updateDeliveryProgress);

  useEffect(() => {
    isMountedRef.current = true;
    
    console.log(`✅ Starting animation for delivery ${delivery.id} (Drone ${delivery.assignedDrone})`);
    console.log(`   Path length: ${pathLength} moves, Duration: ${duration/1000}s`);
    
    // ⭐ Calculate progress based on flight start time
    const animate = () => {
      if (!isMountedRef.current) {
        return;
      }

      if (!delivery.flightStartTime) {
        // No start time set yet
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - delivery.flightStartTime;
      const newProgress = Math.min(elapsed / duration, 1);
      
      setProgress(newProgress);

      if (newProgress < 1) {
        const position = getPositionAlongPath(delivery.path || [], newProgress);
        setDronePosition(position);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        console.log(`✅ Animation complete for delivery ${delivery.id}`);
        setProgress(1);
        setDronePosition(servicePoint);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      console.log(`🧹 Cleanup for delivery ${delivery.id}`);
      isMountedRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [delivery.id, delivery.path, delivery.assignedDrone, delivery.flightStartTime, duration, pathLength]);

  useEffect(() => {
    updateDeliveryProgress(delivery.id, Math.round(progress * 100));
  }, [progress, delivery.id, updateDeliveryProgress]);

  function getPositionAlongPath(path: any[], progress: number) {
    const allPoints: { lat: number; lng: number }[] = [];
    
    path.forEach((segment) => {
      if (segment.flightPath) {
        segment.flightPath.forEach((point: any) => {
          allPoints.push({ lat: point.lat, lng: point.lng });
        });
      }
    });

    if (allPoints.length === 0) return servicePoint;

    const totalPoints = allPoints.length;
    const currentIndex = Math.min(
      Math.floor(progress * (totalPoints - 1)),
      totalPoints - 2
    );
    const localProgress = progress * (totalPoints - 1) - currentIndex;

    const start = allPoints[currentIndex];
    const end = allPoints[currentIndex + 1];

    return {
      lat: start.lat + (end.lat - start.lat) * localProgress,
      lng: start.lng + (end.lng - start.lng) * localProgress,
    };
  }

  const fullPath: [number, number][] = [];
  (delivery.path || []).forEach((segment: any) => {
    if (segment.flightPath && segment.flightPath.length > 0) {
      segment.flightPath.forEach((point: any) => {
        fullPath.push([point.lat, point.lng]);
      });
    }
  });

  const deliveryEndpoints: { lat: number; lng: number; deliveryId: number }[] = [];
  (delivery.path || []).forEach((segment: any) => {
    if (segment.deliveryId && segment.flightPath && segment.flightPath.length > 0) {
      const flightPath = segment.flightPath;
      
      let maxDist = 0;
      let deliveryPoint = flightPath[0];
      
      flightPath.forEach((point: any) => {
        const dist = Math.sqrt(
          Math.pow(point.lat - servicePoint.lat, 2) + 
          Math.pow(point.lng - servicePoint.lng, 2)
        );
        if (dist > maxDist) {
          maxDist = dist;
          deliveryPoint = point;
        }
      });
      
      const isServicePoint = Math.abs(deliveryPoint.lat - servicePoint.lat) < 0.001 && 
                            Math.abs(deliveryPoint.lng - servicePoint.lng) < 0.001;
      
      if (!isServicePoint) {
        const alreadyExists = deliveryEndpoints.some(
          (ep) => Math.abs(ep.lat - deliveryPoint.lat) < 0.001 && 
                  Math.abs(ep.lng - deliveryPoint.lng) < 0.001
        );
        
        if (!alreadyExists) {
          deliveryEndpoints.push({
            lat: deliveryPoint.lat,
            lng: deliveryPoint.lng,
            deliveryId: segment.deliveryId,
          });
        }
      }
    }
  });

  const droneColor = droneColors[delivery.assignedDrone || '1'] || '#3B82F6';

  return (
    <>
      <Polyline
        positions={fullPath}
        color={droneColor}
        weight={4}
        opacity={0.8}
        dashArray="10, 5"
      />

      {deliveryEndpoints.map((endpoint, idx) => (
        <Marker
          key={`delivery-${delivery.id}-${idx}`}
          position={[endpoint.lat, endpoint.lng]}
          icon={deliveryIcon}
        >
          <Popup>
            📦 Delivery {endpoint.deliveryId}
            <br />
            Drone {delivery.assignedDrone}
          </Popup>
        </Marker>
      ))}

      <Marker 
        position={[dronePosition.lat, dronePosition.lng]} 
        icon={getDroneIcon(delivery.assignedDrone)}
        eventHandlers={{
          add: (e) => {
            const element = e.target.getElement();
            if (element) {
              element.style.pointerEvents = 'none';
            }
          }
        }}
      >
        <Popup>
          <div style={{ color: droneColor, fontWeight: 'bold' }}>
            🚁 Drone {delivery.assignedDrone}
          </div>
          <div>Progress: {Math.round(progress * 100)}%</div>
          <div>{delivery.location}</div>
          <div className="text-xs text-gray-500 mt-1">
            Path: {pathLength} moves
          </div>
        </Popup>
      </Marker>
    </>
  );
}, (prevProps, nextProps) => {
  return prevProps.delivery.id === nextProps.delivery.id && 
         prevProps.delivery.progress === nextProps.delivery.progress;
});

AnimatedDelivery.displayName = 'AnimatedDelivery';

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (!hasInitialized.current) {
      map.setView(center, 13);
      hasInitialized.current = true;
    }
  }, [center, map]);
  
  return null;
}

interface MapViewProps {
  deliveries: Delivery[];
  onClose: () => void;
}

export default function MapView({ deliveries, onClose }: MapViewProps) {
  const deliveriesWithPaths = deliveries.filter(
    d => d.path && d.path.length > 0
  );

  if (deliveriesWithPaths.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <h2 className="text-xl font-bold mb-4">No Flight Paths Available</h2>
          <p className="mb-4">No active deliveries have path data yet.</p>
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/*  Header with better contrast */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Live Flight Map</h2>
            <p className="text-sm text-gray-300">
              Tracking {deliveriesWithPaths.length} active flight{deliveriesWithPaths.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 relative">
          <MapContainer
            center={[servicePoint.lat, servicePoint.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={[servicePoint.lat, servicePoint.lng]} />
            
            <Marker position={[servicePoint.lat, servicePoint.lng]} icon={hospitalIcon}>
              <Popup>🏥 Service Point (Appleton Tower)</Popup>
            </Marker>

            <Marker position={[oceanTerminal.lat, oceanTerminal.lng]} icon={hospitalIcon}>
              <Popup>🏥 Service Point (Ocean Terminal)</Popup>
            </Marker>
            
            {deliveriesWithPaths.map((delivery) => (
              <AnimatedDelivery 
                key={`animated-${delivery.id}`}
                delivery={delivery} 
              />
            ))}
          </MapContainer>
        </div>

        {/* ⭐ Legend with better contrast */}
        <div className="p-4 border-t bg-gray-800">
          <div className="flex gap-6 text-sm mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏥</span>
              <span className="text-white font-medium">Service Point</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ 
                width: '24px', 
                height: '24px', 
                backgroundColor: '#3B82F6',
                borderRadius: '50%',
              }}/>
              <span className="text-white font-medium">Drone</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📦</span>
              <span className="text-white font-medium">Delivery Location</span>
            </div>
          </div>
          
          <div className="border-t border-gray-600 pt-3">
            <p className="text-xs font-semibold text-gray-300 mb-2">Active Flights:</p>
            <div className="flex flex-wrap gap-2">
              {deliveriesWithPaths.map((delivery) => {
                const color = droneColors[delivery.assignedDrone || '1'] || '#3B82F6';
                const pathLength = calculatePathLength(delivery.path || []);
                
                // ⭐ Get a short display name
                let displayName = delivery.location;
                if (displayName === 'Delivery location') {
                  // Fallback to showing first segment endpoint coords
                  const firstSegment = delivery.path?.[0];
                  if (firstSegment?.to) {
                    displayName = `${firstSegment.to.lat.toFixed(3)}, ${firstSegment.to.lng.toFixed(3)}`;
                  }
                }
                
                return (
                  <div
                    key={delivery.id}
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ 
                      backgroundColor: color,
                      color: 'white',
                    }}
                  >
                    <span className="font-bold">Drone {delivery.assignedDrone}</span>
                    {' → '}
                    {displayName}
                    {delivery.progress !== undefined && ` (${delivery.progress}%)`}
                    <span className="text-xs ml-1 opacity-80"> • {pathLength} moves</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}