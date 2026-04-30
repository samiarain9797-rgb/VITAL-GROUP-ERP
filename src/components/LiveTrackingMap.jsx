import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for a truck
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png', // A free truck icon
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export default function LiveTrackingMap({ shipments = [] }) {
  // Filter shipments that have coordinates
  const liveShipments = useMemo(() => {
    if (!Array.isArray(shipments)) return [];
    return shipments.filter(
      (s) =>
        s.liveLocation &&
        typeof s.liveLocation.lat === 'number' &&
        typeof s.liveLocation.lng === 'number'
    );
  }, [shipments]);

  // Determine center based on shipments
  const center = useMemo(() => {
    if (liveShipments.length === 0) {
      return [20, 0]; // Default center (roughly Africa/Europe)
    }
    // Calculate average lat/lng (simple center)
    const totalLat = liveShipments.reduce((sum, s) => sum + s.liveLocation.lat, 0);
    const totalLng = liveShipments.reduce((sum, s) => sum + s.liveLocation.lng, 0);
    return [totalLat / liveShipments.length, totalLng / liveShipments.length];
  }, [liveShipments]);

  const zoom = liveShipments.length > 0 ? 3 : 2;

  return (
    <div
      className="w-full relative rounded-2xl overflow-hidden mb-8 border border-zinc-200 shadow-sm bg-[#030712] z-0"
      style={{ height: '450px' }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {liveShipments.map((shipment) => (
          <Marker
            key={shipment.id}
            position={[shipment.liveLocation.lat, shipment.liveLocation.lng]}
            icon={truckIcon}
          >
            <Popup className="custom-popup">
              <div className="flex flex-col gap-1 min-w-[150px]">
                <h4 className="font-bold text-xs text-blue-600 uppercase tracking-wider border-b pb-1 mb-1">
                  Live Tracking
                </h4>
                <span className="font-mono text-zinc-600 font-semibold text-sm">
                  #{shipment.trackingId || shipment.id.slice(0, 8)}
                </span>
                {shipment.vehicleNumber && (
                  <span className="font-medium text-xs text-zinc-800">
                    Vehicle: {shipment.vehicleNumber}
                  </span>
                )}
                {shipment.liveLocation?.address && (
                  <span
                    className="text-xs text-zinc-500 leading-tight mt-1 inline-block max-w-[200px]"
                    title={shipment.liveLocation.address}
                  >
                    {shipment.liveLocation.address}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay Information */}
      <div className="absolute top-4 left-4 p-4 bg-white/90 rounded-xl backdrop-blur-md border border-zinc-200 shadow-lg pointer-events-none" style={{ zIndex: 1000}}>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h3 className="text-sm font-black tracking-widest text-zinc-800 uppercase">
            Global Live Tracking
          </h3>
        </div>
        <p className="text-xs text-zinc-500 font-medium tracking-wide">
          2D Map Synchronization
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-700 font-bold uppercase">
              {liveShipments.length} Active Trackers
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
