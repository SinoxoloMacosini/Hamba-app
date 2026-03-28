import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Waypoint, Hazard } from '../types';

// Fix for default marker icons in Leaflet with React
const markerIcon = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const markerShadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for hazards and waypoints
const hazardIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color: #ff4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;'></div>",
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const waypointIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color: #FFBF00; width: 16px; height: 16px; border-radius: 50%; border: 2px solid black;'></div>",
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const userIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color: #007bff; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);'></div>",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface MapComponentProps {
  center: [number, number];
  waypoints?: Waypoint[];
  hazards?: Hazard[];
  userLocation?: [number, number];
  showRouteLine?: boolean;
}

export default function MapComponent({ 
  center, 
  waypoints = [], 
  hazards = [], 
  userLocation,
  showRouteLine = false 
}: MapComponentProps) {
  const polylinePositions = waypoints.map(w => [w.lat, w.lng] as [number, number]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-amber-500 shadow-2xl">
      <MapContainer 
        center={center} 
        zoom={18} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon} />
            <Circle 
              center={userLocation} 
              radius={15} 
              pathOptions={{ color: '#007bff', fillColor: '#007bff', fillOpacity: 0.1 }} 
            />
          </>
        )}

        {waypoints.map((wp) => (
          <Marker 
            key={wp.id} 
            position={[wp.lat, wp.lng]} 
            icon={waypointIcon}
          />
        ))}

        {hazards.map((h) => {
          let color = '#ff4444'; // Default red
          if (h.type === 'Steps or Stairs') color = '#ff0000';
          if (h.type === 'No Ramp') color = '#ff8800';
          if (h.type === 'Path Too Narrow') color = '#ffcc00';
          if (h.type === 'Too Steep') color = '#cc00ff';
          if (h.type === 'Broken Pavement') color = '#888888';
          if (h.type === 'No Curb Cut') color = '#000000';

          const customHazardIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style='background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;'></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          return (
            <Marker 
              key={h.id} 
              position={[h.lat, h.lng]} 
              icon={customHazardIcon}
            />
          );
        })}

        {showRouteLine && polylinePositions.length > 1 && (
          <Polyline 
            positions={polylinePositions} 
            pathOptions={{ color: '#FFBF00', weight: 6, opacity: 0.8, dashArray: '10, 10' }} 
          />
        )}

        <ChangeView center={center} />
      </MapContainer>
    </div>
  );
}
