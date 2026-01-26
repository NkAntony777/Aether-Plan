import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, type LatLngExpression } from 'leaflet';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import { isAmapConfigured } from '../../services/amapService';

// Fix for default marker icons in Leaflet with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error - Leaflet type issue
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

interface MapLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type?: string;
}

interface MapWidgetProps {
    payload: {
        center?: { lat: number; lng: number };
        zoom?: number;
        locations?: MapLocation[];
        title?: string;
    };
    onSubmit?: (response: unknown) => void;
}

// Component to update map view when center changes
function MapViewUpdater({ center }: { center: LatLngExpression }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [map, center]);
    return null;
}

// Map tile configurations
const TILE_CONFIGS = {
    amap: {
        // 高德地图瓦片服务
        url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        attribution: '&copy; <a href="https://amap.com">高德地图</a>',
        subdomains: ['1', '2', '3', '4'],
    },
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: ['a', 'b', 'c'],
    },
};

const MapWidget: React.FC<MapWidgetProps> = ({ payload, onSubmit: _onSubmit }) => {
    const {
        center = { lat: 39.9042, lng: 116.4074 }, // Beijing default
        zoom = 12,
        locations = [],
        title
    } = payload;

    const mapCenter: LatLngExpression = [center.lat, center.lng];

    // Determine which tile provider to use
    const tileConfig = useMemo(() => {
        if (isAmapConfigured()) {
            return TILE_CONFIGS.amap;
        }
        return TILE_CONFIGS.osm;
    }, []);

    const mapProvider = isAmapConfigured() ? '高德地图' : 'OpenStreetMap';

    // Default locations for Beijing if none provided
    const defaultLocations: MapLocation[] = locations.length > 0 ? locations : [
        { id: '1', name: '故宫博物院', lat: 39.9163, lng: 116.3972, type: 'attraction' },
        { id: '2', name: '天安门广场', lat: 39.9054, lng: 116.3976, type: 'attraction' },
        { id: '3', name: '颐和园', lat: 39.9999, lng: 116.2755, type: 'attraction' },
        { id: '4', name: '北京首都国际机场', lat: 40.0799, lng: 116.6031, type: 'transport' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl"
        >
            {title && (
                <p className="text-sm font-serif text-stone-500 mb-3 tracking-wider italic">-- {title} --</p>
            )}

            <div className="rounded-2xl overflow-hidden border border-stone-100 shadow-elevated">
                <MapContainer
                    center={mapCenter}
                    zoom={zoom}
                    style={{ height: '320px', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution={tileConfig.attribution}
                        url={tileConfig.url}
                        subdomains={tileConfig.subdomains}
                    />
                    <MapViewUpdater center={mapCenter} />

                    {defaultLocations.map((loc) => (
                        <Marker key={loc.id} position={[loc.lat, loc.lng]}>
                            <Popup>
                                <div className="text-sm">
                                    <strong>{loc.name}</strong>
                                    {loc.type && (
                                        <span className="block text-xs text-gray-500 capitalize">{loc.type}</span>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <p className="text-xs text-stone-400 mt-2 text-center">
                {mapProvider} · 点击标记查看详情 · 滚动缩放地图
            </p>
        </motion.div>
    );
};

export default MapWidget;
