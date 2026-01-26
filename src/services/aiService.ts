// AI Service - Abstraction layer for AI responses
import type { CollectedData, WidgetType } from '../types/message';
import { getMockFlights, getMockTrains, getMockHotels, getMockAttractions } from './mockResponses';

// Response types
export interface AIResponse {
    type: 'text' | 'widget';
    content?: string;
    widgetType?: WidgetType;
    widgetPayload?: Record<string, unknown>;
}

// Intent detection
export type UserIntent =
    | 'travel_start'
    | 'ask_origin'
    | 'ask_dates'
    | 'ask_transport'
    | 'search_flights'
    | 'search_trains'
    | 'search_hotels'
    | 'recommend_places'
    | 'unknown';

// Simple intent detection (to be replaced with real AI)
export function detectIntent(input: string, _collectedData: CollectedData): UserIntent {
    const lower = input.toLowerCase();

    // Travel-related keywords
    if (lower.includes('旅游') || lower.includes('旅行') || lower.includes('想去')) {
        return 'travel_start';
    }

    // Transport search
    if (lower.includes('航班') || lower.includes('机票')) {
        return 'search_flights';
    }
    if (lower.includes('高铁') || lower.includes('火车')) {
        return 'search_trains';
    }

    // Hotels
    if (lower.includes('酒店') || lower.includes('住宿')) {
        return 'search_hotels';
    }

    // Places
    if (lower.includes('景点') || lower.includes('推荐') || lower.includes('玩什么')) {
        return 'recommend_places';
    }

    return 'unknown';
}

// Extract destination from text
export function extractDestination(input: string): string | null {
    const destinations = [
        '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆',
        '南京', '武汉', '苏州', '三亚', '厦门', '青岛', '大连', '丽江',
        '东京', '巴黎', '纽约', '伦敦', '新加坡', '曼谷', '首尔', '迪拜'
    ];

    return destinations.find(d => input.includes(d)) || null;
}

// Generate AI response based on intent and collected data
export async function generateResponse(
    input: string,
    collectedData: CollectedData
): Promise<AIResponse[]> {
    const intent = detectIntent(input, collectedData);
    const responses: AIResponse[] = [];

    switch (intent) {
        case 'travel_start': {
            const destination = extractDestination(input);
            if (destination) {
                responses.push({
                    type: 'text',
                    content: `太棒了！${destination} 是个令人向往的目的地。请告诉我，您将从哪里出发？`,
                });
                responses.push({
                    type: 'widget',
                    widgetType: 'text_input',
                    widgetPayload: {
                        placeholder: '例如：上海、北京...',
                        label: '出发城市',
                        icon: 'location',
                    },
                });
            } else {
                responses.push({
                    type: 'text',
                    content: '世界很大，你想从哪里开始探索？比如北京的历史，上海的繁华，或者巴黎的浪漫？',
                });
            }
            break;
        }

        case 'search_flights': {
            if (collectedData.origin && collectedData.destination) {
                const flights = getMockFlights(collectedData.origin, collectedData.destination);
                responses.push({
                    type: 'text',
                    content: `为您找到 ${flights.length} 个航班选项：`,
                });
                // TODO: Add flight_search widget with flights data
            } else {
                responses.push({
                    type: 'text',
                    content: '请先告诉我您的出发地和目的地，我再为您搜索航班。',
                });
            }
            break;
        }

        case 'search_trains': {
            if (collectedData.origin && collectedData.destination) {
                const trains = getMockTrains(collectedData.origin, collectedData.destination);
                responses.push({
                    type: 'text',
                    content: `为您找到 ${trains.length} 趟高铁：`,
                });
                // TODO: Add train_search widget with trains data
            } else {
                responses.push({
                    type: 'text',
                    content: '请先告诉我您的出发地和目的地，我再为您搜索高铁。',
                });
            }
            break;
        }

        case 'search_hotels': {
            if (collectedData.destination) {
                const hotels = getMockHotels(collectedData.destination);
                responses.push({
                    type: 'text',
                    content: `在 ${collectedData.destination} 为您推荐 ${hotels.length} 家精选酒店：`,
                });
                // TODO: Add hotel_cards widget with hotels data
            } else {
                responses.push({
                    type: 'text',
                    content: '请先告诉我您要去哪座城市，我再为您推荐酒店。',
                });
            }
            break;
        }

        case 'recommend_places': {
            if (collectedData.destination) {
                getMockAttractions(collectedData.destination); // Future: pass to widget
                responses.push({
                    type: 'text',
                    content: `${collectedData.destination} 有这些必去的地方：`,
                });
                // TODO: Add attraction_cards widget
            } else {
                responses.push({
                    type: 'text',
                    content: '请先告诉我您要去哪座城市，我来推荐当地的精彩去处。',
                });
            }
            break;
        }

        default:
            responses.push({
                type: 'text',
                content: '无论是远方的旅行，还是特别的聚会，我都在这里为您规划。告诉我您的想法，例如"我想去北京旅游"。',
            });
    }

    return responses;
}

// Simulate API delay
export function simulateDelay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
