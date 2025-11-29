// app/components/DeliveryQueue.tsx
'use client';

import { Clock, Package, Thermometer, Calendar } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export function DeliveryQueue() {
  const { deliveries } = useDashboard();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Package className="w-5 h-5 mr-2 text-blue-600" />
          Delivery Queue
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {deliveries.filter(d => d.status === 'pending').length} pending deliveries
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Weight
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cost
                </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requirements
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deliveries.map((delivery) => (
              <tr key={delivery.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{delivery.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {delivery.weight}kg
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {delivery.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                    {delivery.date}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                    {delivery.time}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    £{delivery.cost?.toFixed(2) || '0.00'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-1">
                    {delivery.cooling && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Thermometer className="w-3 h-3 mr-1" />
                        Cooling
                      </span>
                    )}
                    {delivery.heating && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Thermometer className="w-3 h-3 mr-1" />
                        Heating
                      </span>
                    )}
                    {!delivery.cooling && !delivery.heating && (
                      <span className="text-gray-400 text-xs">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    delivery.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : delivery.status === 'assigned'
                      ? 'bg-blue-100 text-blue-800'
                      : delivery.status === 'in-flight'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {delivery.status}
                    {delivery.assignedDrone && ` (${delivery.assignedDrone})`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}