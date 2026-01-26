// Mock data for travel planning
import type { FlightResult, TrainResult, PlaceInfo } from '../types/message';

// Mock flight data
export const mockFlights: FlightResult[] = [
    {
        id: 'CA1234',
        airline: '中国国航',
        airlineLogo: '/airlines/ca.png',
        flightNumber: 'CA1234',
        departure: { time: '08:00', airport: 'PVG', city: '上海' },
        arrival: { time: '10:30', airport: 'PEK', city: '北京' },
        duration: '2h30m',
        stops: 0,
        price: { amount: 980, currency: 'CNY' },
    },
    {
        id: 'MU5678',
        airline: '东方航空',
        airlineLogo: '/airlines/mu.png',
        flightNumber: 'MU5678',
        departure: { time: '09:30', airport: 'PVG', city: '上海' },
        arrival: { time: '12:00', airport: 'PEK', city: '北京' },
        duration: '2h30m',
        stops: 0,
        price: { amount: 850, currency: 'CNY' },
    },
    {
        id: 'CZ9012',
        airline: '南方航空',
        airlineLogo: '/airlines/cz.png',
        flightNumber: 'CZ9012',
        departure: { time: '14:00', airport: 'SHA', city: '上海' },
        arrival: { time: '16:30', airport: 'PEK', city: '北京' },
        duration: '2h30m',
        stops: 0,
        price: { amount: 1120, currency: 'CNY' },
    },
];

// Mock train data
export const mockTrains: TrainResult[] = [
    {
        id: 'G2',
        trainNumber: 'G2',
        trainType: '高铁',
        departure: { time: '07:00', station: '上海虹桥' },
        arrival: { time: '11:36', station: '北京南' },
        duration: '4h36m',
        seats: [
            { type: '二等座', price: 553, available: 120 },
            { type: '一等座', price: 933, available: 45 },
            { type: '商务座', price: 1748, available: 12 },
        ],
    },
    {
        id: 'G10',
        trainNumber: 'G10',
        trainType: '高铁',
        departure: { time: '09:00', station: '上海虹桥' },
        arrival: { time: '13:28', station: '北京南' },
        duration: '4h28m',
        seats: [
            { type: '二等座', price: 553, available: 85 },
            { type: '一等座', price: 933, available: 30 },
            { type: '商务座', price: 1748, available: 8 },
        ],
    },
    {
        id: 'G14',
        trainNumber: 'G14',
        trainType: '高铁',
        departure: { time: '12:00', station: '上海虹桥' },
        arrival: { time: '16:28', station: '北京南' },
        duration: '4h28m',
        seats: [
            { type: '二等座', price: 553, available: 200 },
            { type: '一等座', price: 933, available: 60 },
            { type: '商务座', price: 1748, available: 15 },
        ],
    },
];

// Mock hotel data
export const mockHotels: PlaceInfo[] = [
    {
        id: 'hotel-1',
        name: '北京国贸大酒店',
        category: 'hotel',
        rating: 4.8,
        priceLevel: 4,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
        address: '北京市朝阳区建国门外大街1号',
        tags: ['五星级', '商务', '市中心'],
    },
    {
        id: 'hotel-2',
        name: '王府井文华东方酒店',
        category: 'hotel',
        rating: 4.9,
        priceLevel: 5,
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400',
        address: '北京市东城区金鱼胡同甲8号',
        tags: ['奢华', '文化地标', '王府井'],
    },
    {
        id: 'hotel-3',
        name: '北京亚朵酒店',
        category: 'hotel',
        rating: 4.5,
        priceLevel: 2,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
        address: '北京市海淀区中关村大街59号',
        tags: ['性价比', '设计感', '中关村'],
    },
];

// Mock attractions
export const mockAttractions: PlaceInfo[] = [
    {
        id: 'attr-1',
        name: '故宫博物院',
        category: 'attraction',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1584467735867-4297ae2ebcee?w=400',
        address: '北京市东城区景山前街4号',
        tags: ['世界遗产', '历史', '必打卡'],
    },
    {
        id: 'attr-2',
        name: '长城 (八达岭)',
        category: 'attraction',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400',
        address: '北京市延庆区八达岭镇',
        tags: ['世界奇迹', '户外', '一日游'],
    },
    {
        id: 'attr-3',
        name: '颐和园',
        category: 'attraction',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=400',
        address: '北京市海淀区新建宫门路19号',
        tags: ['皇家园林', '世界遗产', '湖景'],
    },
];

// Mock restaurants
export const mockRestaurants: PlaceInfo[] = [
    {
        id: 'rest-1',
        name: '全聚德烤鸭店',
        category: 'restaurant',
        rating: 4.6,
        priceLevel: 3,
        image: 'https://images.unsplash.com/photo-1623689046576-e8e6a53ffced?w=400',
        address: '北京市东城区前门大街32号',
        tags: ['北京烤鸭', '老字号', '必吃'],
    },
    {
        id: 'rest-2',
        name: '局气',
        category: 'restaurant',
        rating: 4.4,
        priceLevel: 2,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
        address: '北京市朝阳区工体东路',
        tags: ['京味', '网红', '创意菜'],
    },
    {
        id: 'rest-3',
        name: '大董烤鸭店',
        category: 'restaurant',
        rating: 4.7,
        priceLevel: 4,
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        address: '北京市朝阳区东四环中路',
        tags: ['米其林', '创意烤鸭', '高端'],
    },
];

// Helper function to get mock data based on search params
export const getMockFlights = (origin: string, destination: string): FlightResult[] => {
    // In real app, this would filter based on origin/destination
    return mockFlights.map(f => ({
        ...f,
        departure: { ...f.departure, city: origin },
        arrival: { ...f.arrival, city: destination },
    }));
};

export const getMockTrains = (origin: string, destination: string): TrainResult[] => {
    return mockTrains.map(t => ({
        ...t,
        departure: { ...t.departure, station: `${origin}站` },
        arrival: { ...t.arrival, station: `${destination}站` },
    }));
};

export const getMockHotels = (destination: string): PlaceInfo[] => {
    return mockHotels.map(h => ({
        ...h,
        address: h.address?.replace('北京', destination) ?? h.address,
    }));
};

export const getMockAttractions = (_destination: string): PlaceInfo[] => {
    return mockAttractions;
};

export const getMockRestaurants = (_destination: string): PlaceInfo[] => {
    return mockRestaurants;
};
