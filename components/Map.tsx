import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// REPLACE WITH YOUR TOMTOM API KEY
const TOMTOM_API_KEY = 'TadNELv6Zo5VRjQYZLh6IiwcsFXqdp5d';

// Custom Icons
const createIncidentIcon = (type: string) => {
  const iconHtml = renderToStaticMarkup(
    <div className="marker-pin">
      <AlertTriangle size={20} color="white" />
    </div>
  );

  return L.divIcon({
    className: 'custom-div-icon',
    html: iconHtml,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

const userLocationIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="user-location-marker">
      <div class="user-location-pulse"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const otherUserIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="user-location-marker" style="background-color: #94a3b8;">
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const LocationMarker = ({ position, followUser, setFollowUser }: { position: [number, number] | null, followUser: boolean, setFollowUser: (follow: boolean) => void }) => {
  const map = useMap();

  useEffect(() => {
    if (position && followUser) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, followUser, map]);

  useMapEvents({
    dragstart: () => {
      setFollowUser(false);
    },
    click: () => {
      // Optional: stop following on click too?
    }
  });

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
};

const MapComponent: React.FC = () => {
  const { theme, incidents, fetchIncidents, userLocation, setUserLocation, filters, socket, selectIncident } = useStore();
  const [otherUsers, setOtherUsers] = useState<Record<string, { latitude: number; longitude: number }>>({});
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState(true);

  useEffect(() => {
    // Fetch initial incidents
    fetchIncidents();

    if (!socket) return;

    socket.on('locationUpdate', (data: { id: string; latitude: number; longitude: number }) => {
      setOtherUsers((prev) => ({
        ...prev,
        [data.id]: { latitude: data.latitude, longitude: data.longitude }
      }));
    });

    socket.on('userDisconnected', (id: string) => {
      setOtherUsers((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    });

    return () => {
      socket.off('locationUpdate');
      socket.off('userDisconnected');
    };
  }, [socket]);

  // We rely on App.tsx for the global geolocation watcher.
  // However, we can still provide a manual "Locate Me" button that forces a high-accuracy read and re-centers.
  const handleLocate = () => {
    setLoadingLocation(true);
    setLocationError(null);
    setFollowUser(true); // Re-enable following

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        setLoadingLocation(false);
        if (socket) {
          socket.emit('updateLocation', { latitude, longitude });
        }
      },
      (err) => {
        console.error('Error getting location', err);
        let msg = 'Unable to retrieve your location';
        if (err.code === 1) msg = 'Location permission denied.';
        if (err.code === 2) msg = 'Location unavailable.';
        if (err.code === 3) msg = 'Location request timed out.';
        setLocationError(msg);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReportTestIncident = () => {
    if (!userLocation) return;
    const types = ['theft', 'assault', 'harassment', 'accident', 'suspicious'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)];
    const { addIncident } = useStore.getState(); // Access action directly if not destructured

    addIncident({
      id: Date.now().toString(),
      type: randomType,
      latitude: userLocation[0] + (Math.random() - 0.5) * 0.01,
      longitude: userLocation[1] + (Math.random() - 0.5) * 0.01,
      description: `Reported ${randomType} near you`,
      timestamp: new Date().toISOString(),
      verified: false,
      reporterId: 'me',
      upvotes: 0
    });
  };

  // Default center (NYC) if no location yet
  const center: [number, number] = userLocation || [40.7128, -74.0060];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.tomtom.com">TomTom</a>'
          url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`}
        />

        <LocationMarker position={userLocation} followUser={followUser} setFollowUser={setFollowUser} />

        {/* Render other users */}
        {Object.entries(otherUsers).map(([id, loc]: [string, { latitude: number; longitude: number }]) => (
          <Marker key={id} position={[loc.latitude, loc.longitude]} icon={otherUserIcon}>
            <Popup>User: {id.slice(0, 5)}</Popup>
          </Marker>
        ))}

        {/* Render Incidents */}
        {incidents.filter(inc => filters[inc.type]).map((incident) => (
          <Marker key={incident.id} position={[incident.latitude, incident.longitude]} icon={createIncidentIcon(incident.type)}>
            <Popup>
              <div className="min-w-[150px]">
                <strong className="capitalize text-lg">{incident.type}</strong>
                <p className="text-sm my-1">{incident.description}</p>
                <button
                  onClick={() => selectIncident(incident.id)}
                  className="mt-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded w-full hover:bg-primary/90"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Controls */}
      <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleReportTestIncident}
          className="bg-red-600 text-white shadow-lg rounded-full p-3 hover:bg-red-700 transition-colors"
          title="Report Test Incident"
        >
          <AlertTriangle size={24} />
        </button>

        <button
          onClick={handleLocate}
          className={`bg-background border border-input shadow-lg rounded-full p-3 hover:bg-muted transition-colors ${followUser && userLocation ? 'text-primary border-primary' : 'text-muted-foreground'}`}
          title="Locate Me"
        >
          {loadingLocation ? (
            <Loader2 className="animate-spin text-primary" size={24} />
          ) : (
            <Navigation size={24} className={followUser && userLocation ? "fill-current" : ""} />
          )}
        </button>
      </div>

      {locationError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-destructive text-destructive-foreground px-4 py-2 rounded shadow-lg text-sm">
          {locationError}
        </div>
      )}
    </div>
  );
};

export default MapComponent;
