import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './marker.css';

export interface MapRef {
  locateUser: () => void;
}

interface UserLocation {
  id: string;
  lat: number;
  lng: number;
  thumbnail?: string;
  accuracy?: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  thumbnail?: string;
  label?: string;
}

interface MapProps {
  location: LatLng;
  address: string;
  scrollWheelZoom: boolean;
  dragging: boolean;
  touchZoom: boolean;
  showUserLocation: boolean;
  userThumbnail?: string;
  projectThumbnail?: string;
  isEditable?: boolean;
  onLocationChange?: (loc: LatLng) => void;
  otherUsers?: UserLocation[];
  onUserLocation?: (loc: { lat: number; lng: number; accuracy: number }) => void;
  markers?: MapMarker[];
  onMarkerSelect?: (markerId: string) => void;
  activeMarkerId?: string | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createTaskMarkerIcon = ({
  thumbnail,
  active,
}: {
  thumbnail?: string;
  active?: boolean;
}) => {
  const size = active ? 40 : 32;
  const border = active ? 4 : 3;
  const background = thumbnail
    ? `background-image:url('${thumbnail}');background-size:cover;background-position:center;`
    : `background:linear-gradient(135deg, #fa3356, #fb7185);`;
  const ring = active
    ? 'box-shadow:0 0 0 4px rgba(250, 51, 86, 0.32), 0 16px 36px rgba(3, 7, 18, 0.55);'
    : 'box-shadow:0 12px 28px rgba(3, 7, 18, 0.45);';
  const borderColor = active ? '#ffffff' : 'rgba(255, 255, 255, 0.78)';

  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;border:${border}px solid ${borderColor};${background}${ring}"></div>`;

  return L.divIcon({
    html,
    className: 'task-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - clamp(border * 1.5, 6, 14)],
    popupAnchor: [0, -size / 2],
  });
};

const Map = forwardRef<MapRef, MapProps>(
  (
    {
      location,
      address,
      scrollWheelZoom,
      dragging,
      touchZoom,
      showUserLocation,
      userThumbnail,
      projectThumbnail,
      isEditable = false,
      onLocationChange,
      otherUsers = [],
      onUserLocation,
      markers = [],
      onMarkerSelect,
      activeMarkerId = null,
    },
    ref,
  ) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const accuracyCircleRef = useRef<L.Circle | null>(null);
    const projectMarkerRef = useRef<L.Marker | null>(null);
    const otherUsersMarkersRef = useRef<Record<string, L.Marker>>({});
    const otherUsersAccuracyRef = useRef<Record<string, L.Circle>>({});
    const interactiveMarkersRef = useRef<Record<string, L.Marker>>({});
    const interactiveMarkerMetaRef = useRef<Record<string, MapMarker>>({});

    useEffect(() => {
      if (!mapRef.current || mapInstance.current) return;

      mapInstance.current = L.map(mapRef.current, {
        center: [location.lat, location.lng],
        zoom: 13,
        scrollWheelZoom,
        dragging,
        touchZoom,
        attributionControl: false,
      });

      const apiKey = 'YOUR_API_KEY';
      const attribution =
        'Map tiles by <a href="https://stamen.com">Stamen Design</a>, ' +
        'hosted by <a href="https://stadiamaps.com">Stadia Maps</a> — ' +
        'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';

      L.tileLayer(
        `https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png?api_key=${apiKey}`,
        {
          attribution,
          maxZoom: 20,
          tileSize: 256,
          zoomOffset: 0,
        },
      ).addTo(mapInstance.current);

      mapInstance.current.whenReady(() => mapInstance.current?.invalidateSize());
    }, [location.lat, location.lng, scrollWheelZoom, dragging, touchZoom]);

    useEffect(() => {
      if (typeof ResizeObserver === 'undefined' || !mapRef.current || !mapInstance.current) return;
      const observer = new ResizeObserver(() => {
        mapInstance.current?.invalidateSize();
      });
      observer.observe(mapRef.current);
      return () => observer.disconnect();
    }, []);

    useImperativeHandle(ref, () => ({
      locateUser: () => {
        if (!mapInstance.current) return;
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            mapInstance.current?.setView([latitude, longitude], 13);
          });
        }
      },
    }));

    useEffect(() => {
      if (!mapInstance.current) return;

      if (scrollWheelZoom) mapInstance.current.scrollWheelZoom.enable();
      else mapInstance.current.scrollWheelZoom.disable();

      if (dragging) mapInstance.current.dragging.enable();
      else mapInstance.current.dragging.disable();

      if (touchZoom) mapInstance.current.touchZoom.enable();
      else mapInstance.current.touchZoom.disable();

      if (location.lat && location.lng) {
        const projectLatLng: [number, number] = [location.lat, location.lng];
        const projectIcon = L.icon({
          iconUrl: projectThumbnail || `${import.meta.env.BASE_URL}images/project-marker.svg`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
          className: projectThumbnail ? 'project-marker-icon' : '',
        });

        if (projectMarkerRef.current) {
          projectMarkerRef.current.setLatLng(projectLatLng);
          projectMarkerRef.current.setIcon(projectIcon);
          if (isEditable) {
            projectMarkerRef.current.dragging?.enable();
          } else {
            projectMarkerRef.current.dragging?.disable();
          }
        } else {
          projectMarkerRef.current = L.marker(projectLatLng, {
            icon: projectIcon,
            draggable: isEditable,
          }).addTo(mapInstance.current);

          if (isEditable) {
            projectMarkerRef.current.on('dragend', (e) => {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onLocationChange?.({ lat, lng });
            });
          }
        }

        projectMarkerRef.current.bindTooltip(address, { direction: 'top' });

        const latLngs: L.LatLngExpression[] = [projectMarkerRef.current.getLatLng()];
        if (userMarkerRef.current) {
          latLngs.push(userMarkerRef.current.getLatLng());
          if (accuracyCircleRef.current) {
            const b = accuracyCircleRef.current.getBounds();
            latLngs.push(b.getNorthEast(), b.getSouthWest());
          }
        }
        Object.values(otherUsersMarkersRef.current).forEach((m) => {
          latLngs.push(m.getLatLng());
        });
        Object.values(otherUsersAccuracyRef.current).forEach((c) => {
          const b = c.getBounds();
          latLngs.push(b.getNorthEast(), b.getSouthWest());
        });
        Object.values(interactiveMarkersRef.current).forEach((marker) => {
          latLngs.push(marker.getLatLng());
        });

        if (latLngs.length > 1) {
          mapInstance.current.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
        } else {
          mapInstance.current.setView(projectLatLng, 13);
        }
      }
    }, [
      scrollWheelZoom,
      dragging,
      touchZoom,
      location,
      address,
      projectThumbnail,
      isEditable,
      onLocationChange,
      otherUsers,
      markers,
    ]);

    useEffect(() => {
      if (!mapInstance.current) return;

      if (!showUserLocation) {
        if (userMarkerRef.current) {
          mapInstance.current.removeLayer(userMarkerRef.current);
          userMarkerRef.current = null;
        }
        if (accuracyCircleRef.current) {
          mapInstance.current.removeLayer(accuracyCircleRef.current);
          accuracyCircleRef.current = null;
        }
        if (projectMarkerRef.current) {
          mapInstance.current.setView(projectMarkerRef.current.getLatLng(), 13);
        }
        return;
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const userLatLng: [number, number] = [latitude, longitude];
            const iconHtml = userThumbnail
              ? `<img src="${userThumbnail}" style="width:32px;height:32px;border-radius:50%;border:2px solid white;" />`
              : `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#ff5722" stroke="white" stroke-width="2" d="M12 2C8.1 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="3" fill="white"/></svg>`;
            const iconSize: [number, number] = userThumbnail ? [32, 32] : [24, 24];
            const iconAnchor: [number, number] = userThumbnail ? [16, 16] : [12, 24];
            const icon = L.divIcon({ html: iconHtml, className: '', iconSize, iconAnchor });

            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng(userLatLng);
              userMarkerRef.current.setIcon(icon);
            } else {
              userMarkerRef.current = L.marker(userLatLng, { icon }).addTo(mapInstance.current!);
            }

            if (accuracyCircleRef.current) {
              accuracyCircleRef.current.setLatLng(userLatLng);
              accuracyCircleRef.current.setRadius(accuracy);
            } else {
              accuracyCircleRef.current = L.circle(userLatLng, {
                radius: accuracy,
                color: '#FA3356',
                fillColor: '#FA3356',
                fillOpacity: 0.2,
              }).addTo(mapInstance.current!);
            }

            onUserLocation?.({ lat: latitude, lng: longitude, accuracy });

            const latLngs: L.LatLngExpression[] = [];
            const userBounds = accuracyCircleRef.current.getBounds();
            latLngs.push(userBounds.getNorthEast(), userBounds.getSouthWest());
            if (projectMarkerRef.current) {
              latLngs.push(projectMarkerRef.current.getLatLng());
            }
            Object.values(otherUsersMarkersRef.current).forEach((m) => {
              latLngs.push(m.getLatLng());
            });
            Object.values(otherUsersAccuracyRef.current).forEach((c) => {
              const b = c.getBounds();
              latLngs.push(b.getNorthEast(), b.getSouthWest());
            });

            if (latLngs.length > 1) {
              mapInstance.current!.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
            } else {
              mapInstance.current!.fitBounds(userBounds, { padding: [50, 50] });
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
          },
        );
      }
    }, [showUserLocation, userThumbnail, onUserLocation, otherUsers]);

    useEffect(() => {
      if (!mapInstance.current) return;
      const markers = otherUsersMarkersRef.current;
      const circles = otherUsersAccuracyRef.current;
      const users = otherUsers || [];

      Object.keys(markers).forEach((id) => {
        if (!users.find((u) => u.id === id)) {
          mapInstance.current?.removeLayer(markers[id]);
          delete markers[id];
          if (circles[id]) {
            mapInstance.current?.removeLayer(circles[id]);
            delete circles[id];
          }
        }
      });

      users.forEach((u) => {
        const userLatLng: [number, number] = [u.lat, u.lng];
        const iconHtml = u.thumbnail
          ? `<img src="${u.thumbnail}" style="width:32px;height:32px;border-radius:50%;border:2px solid white;" />`
          : `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#ff5722" stroke="white" stroke-width="2" d="M12 2C8.1 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="3" fill="white"/></svg>`;
        const iconSize: [number, number] = u.thumbnail ? [32, 32] : [24, 24];
        const iconAnchor: [number, number] = u.thumbnail ? [16, 16] : [12, 24];
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize, iconAnchor });

        if (markers[u.id]) {
          markers[u.id].setLatLng(userLatLng);
          markers[u.id].setIcon(icon);
        } else {
          markers[u.id] = L.marker(userLatLng, { icon }).addTo(mapInstance.current!);
        }

        const radius = u.accuracy || 0;
        if (circles[u.id]) {
          circles[u.id].setLatLng(userLatLng);
          circles[u.id].setRadius(radius);
        } else {
          circles[u.id] = L.circle(userLatLng, {
            radius,
            color: '#FA3356',
            fillColor: '#FA3356',
            fillOpacity: 0.2,
          }).addTo(mapInstance.current!);
        }
      });

      const latLngs: L.LatLngExpression[] = [];
      if (projectMarkerRef.current) latLngs.push(projectMarkerRef.current.getLatLng());
      if (userMarkerRef.current) {
        latLngs.push(userMarkerRef.current.getLatLng());
        if (accuracyCircleRef.current) {
          const b = accuracyCircleRef.current.getBounds();
          latLngs.push(b.getNorthEast(), b.getSouthWest());
        }
      }
      Object.values(markers).forEach((m) => latLngs.push(m.getLatLng()));
      Object.values(circles).forEach((c) => {
        const b = c.getBounds();
        latLngs.push(b.getNorthEast(), b.getSouthWest());
      });
      Object.values(interactiveMarkersRef.current).forEach((marker) => {
        latLngs.push(marker.getLatLng());
      });
      if (latLngs.length > 1) {
        mapInstance.current!.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
      }
    }, [otherUsers]);

    useEffect(() => {
      if (!mapInstance.current || !isEditable) return;
      const handleClick = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationChange?.({ lat, lng });
      };
      mapInstance.current.on('click', handleClick);
      return () => {
        mapInstance.current?.off('click', handleClick);
      };
    }, [isEditable, onLocationChange]);

    useEffect(() => {
      if (!mapInstance.current) return;
      const currentMarkers = interactiveMarkersRef.current;
      const meta = interactiveMarkerMetaRef.current;
      const incoming = markers || [];

      Object.keys(currentMarkers).forEach((id) => {
        if (!incoming.find((marker) => marker.id === id)) {
          mapInstance.current?.removeLayer(currentMarkers[id]);
          currentMarkers[id].off('click');
          delete currentMarkers[id];
          delete meta[id];
        }
      });

      incoming.forEach((marker) => {
        const { id, lat, lng, thumbnail, label } = marker;
        const latLng: [number, number] = [lat, lng];
        meta[id] = marker;

        const icon = createTaskMarkerIcon({ thumbnail, active: id === activeMarkerId });

        if (currentMarkers[id]) {
          currentMarkers[id].setLatLng(latLng);
          currentMarkers[id].setIcon(icon);
          if (label) {
            currentMarkers[id].bindTooltip(label, { direction: 'top', offset: [0, -12] });
          }
          currentMarkers[id].off('click');
          currentMarkers[id].on('click', () => onMarkerSelect?.(id));
        } else {
          const leafletMarker = L.marker(latLng, { icon });
          if (label) {
            leafletMarker.bindTooltip(label, { direction: 'top', offset: [0, -12] });
          }
          if (onMarkerSelect) {
            leafletMarker.on('click', () => onMarkerSelect(id));
          }
          leafletMarker.addTo(mapInstance.current!);
          currentMarkers[id] = leafletMarker;
        }
      });

      return () => {
        Object.values(currentMarkers).forEach((markerInstance) => {
          markerInstance.closeTooltip();
        });
      };
    }, [markers, onMarkerSelect, activeMarkerId]);

    useEffect(() => {
      if (!mapInstance.current) return;
      const meta = interactiveMarkerMetaRef.current;
      const markersMap = interactiveMarkersRef.current;

      Object.entries(markersMap).forEach(([id, marker]) => {
        const details = meta[id];
        const icon = createTaskMarkerIcon({
          thumbnail: details?.thumbnail,
          active: id === activeMarkerId,
        });
        marker.setIcon(icon);
        if (id !== activeMarkerId) {
          marker.closeTooltip();
        }
      });

      if (activeMarkerId) {
        const activeMarker = markersMap[activeMarkerId];
        if (activeMarker) {
          const latLng = activeMarker.getLatLng();
          const zoom = mapInstance.current.getZoom();
          mapInstance.current.flyTo(latLng, Math.max(zoom, 15), { duration: 0.6 });
          activeMarker.openTooltip();
        }
      }
    }, [activeMarkerId, markers]);

    return <div id="map" style={{ height: '100%', width: '100%' }} ref={mapRef} />;
  },
);

export default React.memo(Map);









