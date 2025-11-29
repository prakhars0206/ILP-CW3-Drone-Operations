'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ClaudeChat from './components/ClaudeChat';
import { Delivery, useDeliveryStore } from '@/lib/store';
import { Plane, Package, Clock, DollarSign, MapIcon, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center">Loading map...</div>,
});

export default function Home() {
  const { deliveries, updateDeliveryStatus } = useDeliveryStore();
  const [showMap, setShowMap] = useState(false); // ⭐ Global map toggle

  const handleStatusChange = (id: number, newStatus: Delivery['status']) => {
    updateDeliveryStatus(id, newStatus);
  };

  const activeFlights = deliveries.filter(d => d.status === 'in-flight');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Plane className="text-blue-600" size={40} />
              Drone Delivery Operations
            </h1>
            <p className="text-gray-600 mt-2">
              Chat with Claude to schedule and manage deliveries
            </p>
          </div>
          
          {/* ⭐ Global Map Toggle */}
          {activeFlights.length > 0 && (
            <Button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-2 ${
                showMap 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {showMap ? (
                <>
                  <X size={20} />
                  Close Map
                </>
              ) : (
                <>
                  <MapIcon size={20} />
                  Live Flight Map ({activeFlights.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* ⭐ Map Overlay - Shows ALL in-flight deliveries */}
        {showMap && activeFlights.length > 0 && (
          <MapView
            deliveries={activeFlights}
            onClose={() => setShowMap(false)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="p-6 shadow-lg">
              <ClaudeChat />
            </Card>
          </div>

          {/* Right: Deliveries Dashboard */}
          <div className="space-y-6">
            {/* Stats */}
            <Card className="p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Package size={18} className="text-blue-600" />
                    Total Deliveries
                  </span>
                  <span className="font-semibold text-lg">{deliveries.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Plane size={18} className="text-green-600" />
                    In Flight
                  </span>
                  <span className="font-semibold text-lg text-green-600">
                    {activeFlights.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Clock size={18} className="text-yellow-600" />
                    Pending
                  </span>
                  <span className="font-semibold text-lg text-yellow-600">
                    {deliveries.filter(d => d.status === 'pending' || d.status === 'assigned').length}
                  </span>
                </div>
              </div>
            </Card>

            {/* Deliveries List */}
            <Card className="p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Deliveries</h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {deliveries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No deliveries yet. Chat with Claude to schedule one!
                  </p>
                ) : (
                  deliveries.map(delivery => (
                    <div
                      key={delivery.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{delivery.location}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {delivery.date} at {delivery.time}
                          </p>
                          {delivery.path && delivery.path.length > 1 && (
                            <p className="text-xs text-purple-600 font-medium mt-1">
                              ✈️ Multi-stop delivery ({delivery.path.length} segments)
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            delivery.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : delivery.status === 'in-flight'
                              ? 'bg-blue-100 text-blue-800'
                              : delivery.status === 'assigned'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {delivery.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Package size={14} />
                          {delivery.weight}kg
                        </div>
                        {delivery.assignedDrone && (
                          <div className="flex items-center gap-1">
                            <Plane size={14} />
                            {/* ⭐ Show just "Drone 5" not "Drone Drone 5" */}
                            Drone {delivery.assignedDrone}
                          </div>
                        )}
                        {delivery.cost && (
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} />
                            £{delivery.cost.toFixed(2)}
                          </div>
                        )}
                        {delivery.progress !== undefined && delivery.status === 'in-flight' && (
                          <div className="flex items-center gap-1 text-blue-600 font-medium">
                            Progress: {delivery.progress}%
                          </div>
                        )}
                      </div>
                  
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {delivery.status === 'assigned' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(delivery.id, 'in-flight')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            Start Flight
                          </Button>
                        )}
                        {delivery.status === 'in-flight' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(delivery.id, 'delivered')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}