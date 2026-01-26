import React from 'react';
import { usePlanningStore, addUserMessage, addAssistantMessage, addWidgetMessage } from '../../stores/planningStore';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import MessageList from './MessageList';
import InputArea from './InputArea';
import SettingsModal from '../settings/SettingsModal';
import { Compass, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { mockAttractions, mockRestaurants } from '../../services/mockResponses';
import { callLLM, isLLMConfigured, detectIntentLocally, extractDestination, type ChatMessage } from '../../services/llmService';
import { searchFlights, isAmadeusConfigured, getAirportCode, type FlightOffer } from '../../services/flightService';
import { searchTickets, type TicketInfo } from '../../services/trainLogic';
import { geocodeCity } from '../../services/geocodingService';
import { searchAttractions, searchRestaurants, isAmapConfigured, poiToPlaceInfo, amapGeocode } from '../../services/amapService';
import { searchWeb } from '../../services/searchService';
import { fetchWebPage } from '../../services/webContentService';

const ChatContainer: React.FC = () => {
    const { messages, isLoading, collectedData, setLoading, completeWidget, updateCollectedData } = usePlanningStore();
    const { openConfig, config } = useAPIConfigStore();

    // Track conversation history for LLM
    const [conversationHistory, setConversationHistory] = React.useState<ChatMessage[]>([]);

    // Get coordinates for a city (prefers Amap if configured, fallback to OSM)
    const getCityCoordinates = async (cityName: string): Promise<{ lat: number; lng: number }> => {
        // Try Amap first if configured
        if (isAmapConfigured()) {
            const amapResult = await amapGeocode(cityName);
            if (amapResult.success && amapResult.location) {
                return amapResult.location;
            }
        }

        // Fallback to OpenStreetMap Nominatim
        const result = await geocodeCity(cityName);
        if (result.found) {
            return { lat: result.lat, lng: result.lng };
        }
        // Fallback to Beijing if all geocoding fails
        return { lat: 39.9042, lng: 116.4074 };
    };

    // Search for real flights using Amadeus API
    const searchRealFlights = async (origin: string, destination: string, date: string) => {
        if (!isAmadeusConfigured()) {
            return null;
        }

        const result = await searchFlights(origin, destination, date);
        if (result.success && result.flights && result.flights.length > 0) {
            return result.flights;
        }
        return null;
    };

    // Search for real attractions using Amap API
    const searchRealAttractions = async (city: string) => {
        if (!isAmapConfigured()) {
            return null;
        }

        const result = await searchAttractions(city);
        if (result.success && result.pois && result.pois.length > 0) {
            return result.pois.map(poi => poiToPlaceInfo(poi, 'attraction'));
        }
        return null;
    };

    const searchRealRestaurants = async (city: string) => {
        if (!isAmapConfigured()) {
            return null;
        }

        const result = await searchRestaurants(city);
        if (result.success && result.pois && result.pois.length > 0) {
            return result.pois.map(poi => poiToPlaceInfo(poi, 'restaurant'));
        }
        return null;
    };

    const askWebEnrich = async () => {
        addAssistantMessage('是否需要联网搜索，生成更详尽的攻略？');
        await new Promise(resolve => setTimeout(resolve, 300));
        addWidgetMessage('radio_cards', {
            title: '联网搜索',
            options: [
                { id: 'yes', label: '继续联网搜索', description: '补充真实攻略信息', icon: 'search' },
                { id: 'no', label: '暂时不用', description: '保持当前草案', icon: 'close' },
            ],
            context: 'web_enrich',
        });
    };

    // Process user input with LLM or fallback to local logic
    const processUserInput = async (input: string) => {
        addUserMessage(input);
        setLoading(true);

        // Add to conversation history
        const newHistory: ChatMessage[] = [...conversationHistory, { role: 'user', content: input }];
        setConversationHistory(newHistory);

        // 1. Analyze intent and extract entities first
        const { intent, extractedDates, extractedTransport, destination } = detectIntentLocally(input);

        // 2. Proactively capture context (Dates & Transport) from natural language
        // This ensures "August 15th flight" is saved even if we go to LLM later
        if (extractedDates) updateCollectedData('dates', extractedDates);
        if (extractedTransport) updateCollectedData('transportMode', extractedTransport);
        if (destination && intent === 'travel' && !collectedData.destination) {
            // Only auto-set destination for travel intent to avoid overwriting on general queries, 
            // but 'detectIntentLocally' logic already handles this somewhat. 
            // Let's be safe and only set if missing or explicit travel intent.
            updateCollectedData('destination', destination);
        }

        // 3. Decide strategy: Agent (Local) vs LLM (General)
        // We prioritize Local Logic for structural tasks to ensure state consistency and widget display
        const structuralIntents = ['plan_itinerary', 'hotel', 'flight', 'train', 'map', 'attraction'];
        const shouldRunLocalLogic = structuralIntents.includes(intent) || !isLLMConfigured();

        if (shouldRunLocalLogic) {
            // Use Smart Agent Logic
            await processWithLocalLogic(input);
        } else {
            // Use General LLM for open-ended conversation (e.g. "Tell me about history of Rome")
            const response = await callLLM(newHistory);

            if (response.success && response.message) {
                addAssistantMessage(response.message);
                setConversationHistory([...newHistory, { role: 'assistant', content: response.message }]);

                // Try to extract destination from LLM response if we still don't have one
                const extractedDest = extractDestination(input) || extractDestination(response.message || '');
                if (extractedDest && !collectedData.destination) {
                    updateCollectedData('destination', extractedDest);
                }

                // Add appropriate widgets based on context
                await addContextualWidgets(input, response.message);
            } else {
                // LLM failed, show error and fall back
                addAssistantMessage(`⚠️ ${response.error || 'AI 服务暂时不可用'}\n\n正在使用本地模式...`);
                await processWithLocalLogic(input);
            }
        }

        setLoading(false);
    };

    // Add widgets based on conversation context
    const addContextualWidgets = async (input: string, response: string) => {
        const lowerInput = input.toLowerCase();
        const lowerResponse = response.toLowerCase();

        // If asking about origin, add text input
        if (lowerResponse.includes('出发') || lowerResponse.includes('从哪')) {
            await new Promise(resolve => setTimeout(resolve, 600));
            addWidgetMessage('text_input', {
                placeholder: '输入任意城市，如：上海、东京、巴黎...',
                label: '出发城市',
                icon: 'location',
            });
        }
        // If asking about dates
        else if (lowerResponse.includes('日期') || lowerResponse.includes('时间') || lowerResponse.includes('什么时候')) {
            await new Promise(resolve => setTimeout(resolve, 600));
            addWidgetMessage('date_range', {
                minDate: new Date().toISOString().split('T')[0],
            });
        }
        // If asking about transport
        else if (lowerResponse.includes('交通') || lowerResponse.includes('怎么去') || lowerResponse.includes('出行方式')) {
            await new Promise(resolve => setTimeout(resolve, 600));
            addWidgetMessage('radio_cards', {
                title: '选择出行方式',
                options: [
                    { id: 'flight', label: '飞机', description: '跨越山海，云端漫步', icon: 'plane' },
                    { id: 'train', label: '高铁', description: '在大地飞驰，看风景倒退', icon: 'train' },
                    { id: 'car', label: '自驾', description: '自由掌控每一公里的风景', icon: 'car' },
                ],
                context: 'transport',
            });
        }
        // If mentioning hotels - use advanced hotel search
        else if (lowerInput.includes('酒店') || lowerResponse.includes('酒店')) {
            const city = collectedData.destination || '北京';
            await new Promise(resolve => setTimeout(resolve, 600));
            addWidgetMessage('hotel_search_advanced', { city });
        }
        // If mentioning attractions
        else if (lowerInput.includes('景点') || lowerResponse.includes('景点')) {
            const city = collectedData.destination || '北京';
            await new Promise(resolve => setTimeout(resolve, 600));

            // Try real API first
            const realAttractions = await searchRealAttractions(city);
            if (realAttractions) {
                addWidgetMessage('attraction_cards', {
                    places: realAttractions,
                    title: `${city} 景点 (高德数据)`,
                    selectable: false,
                });
            } else {
                addWidgetMessage('attraction_cards', {
                    places: mockAttractions,
                    title: '热门景点推荐',
                    selectable: false,
                });
            }
        }
    };

    // Local logic fallback when LLM is not configured
    const processWithLocalLogic = async (input: string, options?: { preserveDestination?: boolean }) => {
        const { intent, action, destination, extractedDates, extractedTransport } = detectIntentLocally(input);
        const inputDestination = options?.preserveDestination ? undefined : destination;

        // Proactively update context if entities are detected
        if (extractedDates) updateCollectedData('dates', extractedDates);
        if (extractedTransport) updateCollectedData('transportMode', extractedTransport);

        // 1. CONTEXT RECOVERY: Determine effective destination
        // Priority: 1. Current Input -> 2. Existing State -> 3. Conversation History
        let effectiveDest = inputDestination || collectedData.destination;

        if (!effectiveDest) {
            // Scan history backwards for missing context
            for (let i = conversationHistory.length - 1; i >= 0; i--) {
                const msg = conversationHistory[i];
                if (msg.role === 'user') {
                    const historicDest = extractDestination(msg.content);
                    if (historicDest) {
                        effectiveDest = historicDest;
                        updateCollectedData('destination', effectiveDest); // Persist recovered context
                        break;
                    }
                }
            }
        } else if (inputDestination && intent !== 'travel' && !options?.preserveDestination) {
            // If explicit destination found in non-travel intent (e.g. "Hotels in Beijing"), save it
            updateCollectedData('destination', inputDestination);
        }

        switch (intent) {
            case 'travel':
                if (action === 'modify' && inputDestination) {
                    updateCollectedData('destination', inputDestination);
                    addAssistantMessage(`没问题，我们换个目的地！\n\n**${inputDestination}** 确实是个不错的选择。🌍\n\n请告诉我，您将从哪里出发？`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    addWidgetMessage('text_input', {
                        placeholder: '输入任意城市，如：上海、东京、巴黎...',
                        label: '出发城市',
                        icon: 'location',
                    });
                } else if (effectiveDest) {
                    if (effectiveDest !== collectedData.destination) updateCollectedData('destination', effectiveDest);
                    addAssistantMessage(`太棒了！**${effectiveDest}** 是个令人向往的目的地。🌍\n\n请告诉我，您将从哪里出发？（支持全球任意城市）`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    addWidgetMessage('text_input', {
                        placeholder: '输入任意城市，如：上海、东京、巴黎...',
                        label: '出发城市',
                        icon: 'location',
                    });
                } else {
                    addAssistantMessage('🌍 世界很大，你想去哪里探索？\n\n你可以告诉我任何城市，比如：\n• 国内：北京、成都、丽江、拉萨...\n• 国际：东京、巴黎、纽约、悉尼...');
                }
                break;

            case 'hotel': {
                const hotelDest = effectiveDest;

                if (!hotelDest) {
                    addAssistantMessage('请问您想查询**哪个城市**的酒店？🏨');
                    return;
                }

                if (action === 'modify') {
                    addAssistantMessage(`没问题，我们重新选一家在 **${hotelDest}** 的酒店吧！🏨`);
                } else {
                    addAssistantMessage(`让我们为您在 **${hotelDest}** 找一家合适的酒店吧！`);
                }

                await new Promise(resolve => setTimeout(resolve, 600));
                addWidgetMessage('hotel_search_advanced', { city: hotelDest });
                break;
            }

            case 'attraction': {
                const attrDest = effectiveDest;

                if (!attrDest) {
                    addAssistantMessage('请问您想查看**哪个城市**的景点？🏞️');
                    return;
                }

                addAssistantMessage(`${attrDest} 有这些必去的地方：`);
                await new Promise(resolve => setTimeout(resolve, 600));

                // Try real API first
                const realAttractions = await searchRealAttractions(attrDest);
                if (realAttractions) {
                    addWidgetMessage('attraction_cards', {
                        places: realAttractions,
                        title: `${attrDest} 景点 (高德数据)`,
                        selectable: false,
                    });
                } else {
                    addWidgetMessage('attraction_cards', {
                        places: mockAttractions,
                        title: '热门景点推荐',
                        selectable: false,
                    });
                }
                break;
            }

            case 'map': {
                const mapDest = effectiveDest;

                if (!mapDest) {
                    addAssistantMessage('请问您想查看**哪个城市**的地图？🗺️');
                    return;
                }

                addAssistantMessage(`正在加载 ${mapDest} 的地图...`);

                // Get coordinates dynamically
                const coords = await getCityCoordinates(mapDest);

                await new Promise(resolve => setTimeout(resolve, 400));
                addWidgetMessage('map_view', {
                    center: coords,
                    zoom: 12,
                    title: `${mapDest} 地图`,
                });
                break;
            }

            case 'train': {
                const trainDest = effectiveDest;
                // Use input origin if available (from text intent), else stored origin
                const trainOrigin = collectedData.origin;

                if (!trainDest) {
                    addAssistantMessage('请问您想查询去**哪个城市**的火车票？🚄');
                    return;
                }

                // If origin is missing
                if (!trainOrigin) {
                    updateCollectedData('destination', trainDest);
                    addAssistantMessage(`没问题！去 **${trainDest}**。🚄\n\n请问您将**从哪里出发**？`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    addWidgetMessage('text_input', {
                        placeholder: '输入出发城市...',
                        label: '出发城市',
                        icon: 'location',
                    });
                    // Hint transport mode
                    updateCollectedData('transportMode', 'train');
                    return;
                }

                // If dates are missing
                if (!collectedData.dates) {
                    if (effectiveDest !== collectedData.destination) updateCollectedData('destination', trainDest);
                    addAssistantMessage(`了解，从 **${trainOrigin}** 去 **${trainDest}**。🗓️\n\n请选择您的**出行日期**。`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    addWidgetMessage('date_range', {
                        minDate: new Date().toISOString().split('T')[0],
                    });
                    updateCollectedData('transportMode', 'train');
                    return;
                }

                addAssistantMessage(`正在为您查询从 ${trainOrigin} 到 ${trainDest} 的列车... 🚄`);

                try {
                    const tickets = await searchTickets(trainOrigin, trainDest, collectedData.dates.start);

                    await new Promise(resolve => setTimeout(resolve, 1000));
                    addWidgetMessage('train_tickets', {
                        tickets: tickets.slice(0, 50), // Limit to 50
                        origin: trainOrigin,
                        destination: trainDest,
                        date: collectedData.dates.start,
                        title: `${trainOrigin} ➔ ${trainDest}`
                    });
                } catch (error) {
                    console.error('Train search failed:', error);
                    addAssistantMessage(`抱歉，查询车票时遇到问题：${error instanceof Error ? error.message : '未知错误'}`);
                }
                break;
            }

            case 'plan_itinerary': {
                // Smart Planning Agent Logic
                const dest = effectiveDest;

                if (!dest) {
                    addAssistantMessage('没问题！要开始规划行程，首先请告诉我**您想去哪里**？\n\n例如：\n• "去三亚度假"\n• "想去西安看兵马俑"');
                    return;
                }

                if (!collectedData.destination) updateCollectedData('destination', dest);

                // Check for missing information
                if (!collectedData.origin) {
                    addAssistantMessage(`收到！目的地是 **${dest}**。🚗\n\n请问您将**从哪里出发**？`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    addWidgetMessage('text_input', {
                        placeholder: '输入出发城市...',
                        label: '出发城市',
                        icon: 'location',
                    });
                    return;
                }

                if (!collectedData.dates) {
                    addAssistantMessage(`了解，从 **${collectedData.origin}** 去 **${dest}**。🗓️\n\n请选择您的**出行日期**，我好为您安排具体行程。`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    addWidgetMessage('date_range', {
                        minDate: new Date().toISOString().split('T')[0],
                    });
                    return;
                }

                if (!collectedData.transportMode) {
                    addAssistantMessage(`好的，${collectedData.dates?.start} 出发。🚄\n\n您更偏好哪种**交通方式**？`);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    addWidgetMessage('radio_cards', {
                        title: '选择出行方式',
                        options: [
                            { id: 'flight', label: '飞机', description: '跨越山海，云端漫步', icon: 'plane' },
                            { id: 'train', label: '高铁', description: '在大地飞驰，看风景倒退', icon: 'train' },
                            { id: 'car', label: '自驾', description: '自由掌控每一公里的风景', icon: 'car' },
                        ],
                        context: 'transport',
                    });
                    return;
                }

                const transportStr = collectedData.transportMode === 'flight' ? '飞机' : collectedData.transportMode === 'train' ? '高铁' : '自驾';
                const flightInfo = collectedData.selectedFlight ? ` (${collectedData.selectedFlight.flightNumber})` : '';
                const hotelInfo = collectedData.selectedHotel ? `\n🏨 **${collectedData.selectedHotel.name}**` : '';
                const dateStr = collectedData.dates ? `📅 **${collectedData.dates.start}** - **${collectedData.dates.end}**` : '';

                addAssistantMessage(`太棒了！信息都收集齐了：\n\n📍 **${collectedData.origin}** ➔ **${dest}**\n${dateStr}\n🚆 **${transportStr}**${flightInfo}${hotelInfo}\n\n正在为您生成更贴近真实数据的旅行计划... ✨`);

                await new Promise(resolve => setTimeout(resolve, 900));

                const formatCny = (amount: number) => `¥${Math.round(amount).toLocaleString('zh-CN')}`;
                const pad2 = (value: number) => String(value).padStart(2, '0');
                const buildTripTimeline = (dates?: { start: string; end: string }) => {
                    if (!dates?.start || !dates?.end) {
                        return { days: 3, nights: 2, dateList: [] as string[] };
                    }
                    const startDate = new Date(`${dates.start}T00:00:00`);
                    const endDate = new Date(`${dates.end}T00:00:00`);
                    const msPerDay = 24 * 60 * 60 * 1000;
                    const diff = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / msPerDay));
                    const days = diff + 1;
                    const nights = Math.max(0, days - 1);
                    const dateList: string[] = [];
                    for (let i = 0; i < days; i += 1) {
                        const d = new Date(startDate.getTime() + i * msPerDay);
                        dateList.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
                    }
                    return { days, nights, dateList };
                };

                const inferHotelTier = (selectedHotel?: { price?: number; priceLevel?: number }) => {
                    const price = selectedHotel?.price ?? 0;
                    let nightly = typeof price === 'number' && price > 0 ? price : 0;
                    const priceLevel = selectedHotel?.priceLevel;
                    if (!nightly && typeof priceLevel === 'number') {
                        const priceMap = [220, 320, 420, 620, 980];
                        nightly = priceMap[Math.min(4, Math.max(0, priceLevel - 1))];
                    }
                    if (!nightly) nightly = 420;
                    const tier = nightly <= 300 ? 'economy' : nightly <= 600 ? 'comfort' : 'luxury';
                    return { tier, nightly, estimated: !(price || priceLevel) };
                };

                const timeline = buildTripTimeline(collectedData.dates);
                const selectedHotel = collectedData.selectedHotel as { name?: string; price?: number; priceLevel?: number } | undefined;
                const { tier, nightly, estimated: hotelEstimated } = inferHotelTier(selectedHotel);
                const hotelNights = Math.max(1, timeline.nights || 1);
                const hotelTotal = nightly * hotelNights;

                const selectedFlightPrice = (collectedData.selectedFlight as { price?: { amount?: number } | number } | undefined)?.price;
                const outboundCost =
                    (typeof selectedFlightPrice === 'number' ? selectedFlightPrice : selectedFlightPrice?.amount) ||
                    (collectedData.selectedTrain && collectedData.selectedTrain.price) ||
                    0;
                const returnPlanned = collectedData.returnTransportMode && collectedData.returnTransportMode !== 'skip';
                const returnCost = returnPlanned && outboundCost ? Math.round(outboundCost * 0.9) : 0;
                const transportTotal = outboundCost + returnCost;

                const foodPerDay = tier === 'economy' ? 180 : tier === 'comfort' ? 280 : 450;
                const localPerDay = tier === 'economy' ? 50 : tier === 'comfort' ? 90 : 160;
                const ticketPerDay = tier === 'economy' ? 120 : tier === 'comfort' ? 200 : 350;
                const dailyTotal = (foodPerDay + localPerDay + ticketPerDay) * timeline.days;
                const totalBudget = transportTotal + hotelTotal + dailyTotal;

                const realAttractions = await searchRealAttractions(dest);
                const attractions = realAttractions && realAttractions.length > 0 ? realAttractions : mockAttractions;
                const realRestaurants = await searchRealRestaurants(dest);

                const restaurants = realRestaurants && realRestaurants.length > 0 ? realRestaurants : mockRestaurants;
                const safeAttractions = attractions.length > 0 ? attractions : [{ name: '城市地标' }];
                const safeRestaurants = restaurants.length > 0 ? restaurants : [{ name: '当地招牌餐厅' }];

                const dayLines: string[] = [];
                for (let i = 0; i < timeline.days; i += 1) {
                    const dateLabel = timeline.dateList[i] ? ` (${timeline.dateList[i]})` : '';
                    const a1 = safeAttractions[(i * 2) % safeAttractions.length]?.name || '城市地标';
                    const a2 = safeAttractions[(i * 2 + 1) % safeAttractions.length]?.name || '特色街区';
                    const food = safeRestaurants[i % safeRestaurants.length]?.name || '当地招牌餐厅';
                    const prefix = i === 0 ? '抵达/入住' : i === timeline.days - 1 ? '返程/自由活动' : '城市探索';
                    dayLines.push(`- Day ${i + 1}${dateLabel}：${prefix} → ${a1} → ${food} → ${a2}`);
                }

                const budgetLabel = '**\u9884\u7b97\u9884\u4f30\uff08\u4eba\u5747\uff09**';

                const planLines: string[] = [
                    `**${dest} ${timeline.days}日行程草案**`,
                    '',
                    '**每日安排**',
                    ...dayLines,
                    '',
                    '**精选景点**',
                    ...safeAttractions.slice(0, 6).map(place => `- ${place.name}${place.address ? `（${place.address}）` : ''}`),
                    '',
                    '**餐饮推荐**',
                    ...safeRestaurants.slice(0, 6).map(place => `- ${place.name}${place.address ? `（${place.address}）` : ''}`),
                    '',
                    budgetLabel,
                    `- 往返交通：${transportTotal ? formatCny(transportTotal) : '待定'}${returnPlanned ? '' : '（仅含去程或未规划返程）'}`,
                    `- 住宿（${hotelNights}晚）：${formatCny(hotelTotal)}${hotelEstimated ? '（估算）' : ''}`,
                    `- 餐饮：${formatCny(foodPerDay * timeline.days)}`,
                    `- 市内交通：${formatCny(localPerDay * timeline.days)}`,
                    `- 景点门票/体验：${formatCny(ticketPerDay * timeline.days)}`,
                    `- **合计**：${formatCny(totalBudget)}${transportTotal ? '' : '（不含大交通）'}`,
                ];

                if (!isAmapConfigured()) {
                    planLines.push('', '提示：当前未配置高德 API，景点与餐厅为示例推荐。');
                }

                const draftPlan = planLines.join('\n');
                addAssistantMessage(draftPlan);
                updateCollectedData('draftPlan', draftPlan);
                updateCollectedData('webEnrichedPlan', undefined);
                updateCollectedData('webSources', undefined);
                await askWebEnrich();
                break;
            }

            default:
                if (!config.llm.apiKey) {
                    addAssistantMessage('👋 欢迎使用 Aether Plan！\n\n请先点击右上角 ⚙️ 配置 AI API，体验智能对话。\n\n或者直接告诉我您想去哪里旅行，例如：\n• "我想去巴黎旅游"\n• "帮我规划去西安的行程"\n• "想去丽江看看"');
                } else {
                    addAssistantMessage('🌍 我可以帮您规划全球任意城市的旅行！\n\n试试说：\n• "我想去巴黎旅游"\n• "帮我规划去杭州的行程"\n• "有什么景点"');
                }
        }
    };

    // Handle widget submission
    const handleWidgetSubmit = async (widgetId: string, response: unknown) => {
        completeWidget(widgetId, response);
        setLoading(true);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const askOpenMap = async () => {
            addAssistantMessage('需要打开地图吗？');
            await new Promise(resolve => setTimeout(resolve, 300));
            addWidgetMessage('radio_cards', {
                title: '打开地图',
                options: [
                    { id: 'yes', label: '打开地图', description: '查看目的地地图', icon: 'map' },
                    { id: 'no', label: '暂不需要', description: '稍后再说', icon: 'close' },
                ],
                context: 'open_map',
            });
        };

        const askReturnTransport = async () => {
            addAssistantMessage('是否需要规划返程的交通方式？');
            await new Promise(resolve => setTimeout(resolve, 300));
            addWidgetMessage('radio_cards', {
                title: '选择返程方式',
                options: [
                    { id: 'flight', label: '飞机', description: '节省时间', icon: 'plane' },
                    { id: 'train', label: '高铁', description: '舒适便捷', icon: 'train' },
                    { id: 'car', label: '自驾', description: '自由出行', icon: 'car' },
                    { id: 'skip', label: '暂不规划', description: '稍后再说', icon: 'close' },
                ],
                context: 'return_transport',
            });
        };

        const showNextPlanOptions = async (options?: { skipReturnCheck?: boolean }) => {
            if (!options?.skipReturnCheck && collectedData.dates?.end && !collectedData.returnTransportMode) {
                await askReturnTransport();
                return;
            }
            addAssistantMessage('接下来我们可以继续安排：');
            await new Promise(resolve => setTimeout(resolve, 400));
            addWidgetMessage('radio_cards', {
                title: '下一步计划',
                options: [
                    { id: 'hotel', label: '查找酒店', description: '查看推荐住宿', icon: 'hotel' },
                    { id: 'attraction', label: '探索景点', description: '查看热门景点', icon: 'map' },
                    { id: 'plan', label: '生成行程', description: '直接生成行程草案', icon: 'calendar' },
                ],
                context: 'next_plan',
            });
        };

        const widget = messages.find(m => m.id === widgetId);

        if (widget?.type === 'widget') {
            // Handle text_input (origin collection)
            if (widget.widgetType === 'text_input') {
                const origin = String(response);
                updateCollectedData('origin', origin);

                const destination = collectedData.destination || '目的地';

                // Add to conversation
                setConversationHistory(prev => [
                    ...prev,
                    { role: 'user', content: `我从${origin}出发` },
                ]);

                addAssistantMessage(`从 **${origin}** 出发前往 **${destination}**，听起来是一段美妙的旅程！✨\n\n接下来，请选择您的出行日期。`);

                await new Promise(resolve => setTimeout(resolve, 600));

                addWidgetMessage('date_range', {
                    minDate: new Date().toISOString().split('T')[0],
                });
            }
            // Handle date_range
            else if (widget.widgetType === 'date_range') {
                const dateResponse = response as { start: string; end: string };
                updateCollectedData('dates', dateResponse);
                updateCollectedData('returnTransportMode', undefined);

                addAssistantMessage(`已为您预留 ${dateResponse.start} 至 ${dateResponse.end} 的时光。\n\n您希望以怎样的方式前往？`);

                await new Promise(resolve => setTimeout(resolve, 600));

                addWidgetMessage('radio_cards', {
                    title: '选择出行方式',
                    options: [
                        { id: 'flight', label: '飞机', description: '跨越山海，云端漫步', icon: 'plane' },
                        { id: 'train', label: '高铁', description: '在大地飞驰，看风景倒退', icon: 'train' },
                        { id: 'car', label: '自驾', description: '自由掌控每一公里的风景', icon: 'car' },
                    ],
                    context: 'transport',
                });
            } else if (widget.widgetType === 'flight_results') {
                const payloadContext = (widget.payload as { context?: string } | undefined)?.context;
                const isReturn = payloadContext === 'return';
                if (isReturn) {
                    updateCollectedData('returnTransportMode', 'flight');
                }
                if (typeof response === 'object' && response && 'kind' in (response as object)) {
                    const skip = response as { kind?: string };
                    if (skip.kind === 'skip') {
                        addAssistantMessage(isReturn ? '好的，暂不决定返程航班。' : '好的，暂不决定具体航班。');
                        if (isReturn) {
                            await showNextPlanOptions({ skipReturnCheck: true });
                        } else {
                            await askReturnTransport();
                        }
                        setLoading(false);
                        return;
                    }
                }

                const flight = response as FlightOffer;
                if (!isReturn) {
                    updateCollectedData('selectedFlight', flight as any);
                    updateCollectedData('transportMode', 'flight');
                }

                addAssistantMessage(`已为您选择${isReturn ? '返程' : ''}航班 **${flight.airlineCode}${flight.flightNumber}**。✈️`);
                if (isReturn) {
                    await showNextPlanOptions({ skipReturnCheck: true });
                } else {
                    await askReturnTransport();
                }
            } else if (widget.widgetType === 'train_tickets') {
                const payloadContext = (widget.payload as { context?: string } | undefined)?.context;
                const isReturn = payloadContext === 'return';
                if (isReturn) {
                    updateCollectedData('returnTransportMode', 'train');
                }
                if (typeof response === 'object' && response && 'kind' in (response as object)) {
                    const skip = response as { kind?: string };
                    if (skip.kind === 'skip') {
                        addAssistantMessage(isReturn ? '好的，暂不决定返程车次。' : '好的，暂不决定具体车次。');
                        if (isReturn) {
                            await showNextPlanOptions({ skipReturnCheck: true });
                        } else {
                            await askReturnTransport();
                        }
                        setLoading(false);
                        return;
                    }
                }

                const ticket = response as TicketInfo;
                const minPrice = ticket.prices.length > 0 ? Math.min(...ticket.prices.map(p => p.price)) : 0;

                if (!isReturn) {
                    updateCollectedData('selectedTrain', {
                        train_no: ticket.train_no,
                        start_train_code: ticket.start_train_code,
                        start_time: ticket.start_time,
                        arrive_time: ticket.arrive_time,
                        price: minPrice
                    });
                    updateCollectedData('transportMode', 'train');
                }

                addAssistantMessage(`已为您选择${isReturn ? '返程' : ''}车次 **${ticket.start_train_code}**。🚄`);
                if (isReturn) {
                    await showNextPlanOptions({ skipReturnCheck: true });
                } else {
                    await askReturnTransport();
                }
            }
                                    // Handle radio_cards (transport selection)
            else if (widget.widgetType === 'radio_cards') {
                const selection = String(response);
                const widgetPayload = widget.payload as { context?: string };
                const context = widgetPayload?.context;
                const origin = collectedData.origin || '出发地';
                const destination = collectedData.destination || '目的地';
                const dates = collectedData.dates;

                if (context === 'web_enrich' || context === 'web_enrich_retry') {
                    if (selection === 'no' || selection === 'skip' || selection === '\u6682\u4e0d\u9700\u8981') {
                        addAssistantMessage('好的，需要时告诉我即可。');
                        setLoading(false);
                        return;
                    }

                    const enrichDest = collectedData.destination;
                    if (!enrichDest) {
                        addAssistantMessage('还缺少目的地信息，无法进行联网搜索。');
                        setLoading(false);
                        return;
                    }
                    if (!isLLMConfigured()) {
                        addAssistantMessage('请先在右上角配置 AI 模型，再进行联网攻略生成。');
                        setLoading(false);
                        return;
                    }

                    addAssistantMessage('正在联网检索并整理更详尽的攻略，请稍候...');

                    const enrichQuery = `${enrichDest} 旅游 攻略 必去 景点 美食 交通 住宿`;
                    const searchResult = await searchWeb(enrichQuery, { count: 6 });
                    const searchItems = searchResult.success ? (searchResult.results || []) : [];
                    if (!searchResult.success || searchItems.length === 0) {
                        addAssistantMessage('联网搜索暂时不可用或没有结果，是否稍后重试？');
                        addWidgetMessage('radio_cards', {
                            title: '重试联网搜索',
                            options: [
                                { id: 'yes', label: '重试联网搜索', description: '再试一次', icon: 'search' },
                                { id: 'no', label: '暂不需要', description: '保持当前草案', icon: 'close' },
                            ],
                            context: 'web_enrich_retry',
                        });
                        setLoading(false);
                        return;
                    }

                    const sources = searchItems.slice(0, 4);
                    updateCollectedData('webSources', sources);

                    const pageResults = await Promise.all(
                        sources.map(async (item) => {
                            const page = await fetchWebPage(item.url);
                            if (!page.success || !page.content) return null;
                            const snippet = page.content.slice(0, 2000);
                            return {
                                title: item.title,
                                url: item.url,
                                content: snippet,
                            };
                        })
                    );

                    const validPages = pageResults.filter((item): item is { title: string; url: string; content: string } => Boolean(item));
                    const draftPlan = collectedData.draftPlan || '';
                    const dateRange = collectedData.dates ? `${collectedData.dates.start} - ${collectedData.dates.end}` : '未提供';
                    const transport = collectedData.transportMode === 'flight' ? '飞机' : collectedData.transportMode === 'train' ? '高铁' : collectedData.transportMode === 'drive' ? '自驾' : '未指定';
                    const hotelInfo = collectedData.selectedHotel ? `${collectedData.selectedHotel.name}` : '未选择';

                    const webContext = validPages.length > 0
                        ? validPages.map((item, index) => `【来源${index + 1}】${item.title}\n${item.content}`).join('\n\n')
                        : sources.map((item, index) => `【来源${index + 1}】${item.title}${item.description ? `：${item.description}` : ''}`).join('\n');

                    const prompt = [
                        '请基于以下信息生成一份详尽的旅行攻略。',
                        '要求：',
                        '1) 输出包含：行程安排、交通建议、餐饮推荐、娱乐/夜生活或体验建议、预算建议、注意事项。',
                        '2) 结合联网检索内容，但不要输出来源链接或网址。',
                        '3) 语言自然、分段清晰，适合直接给用户查看。',
                        '',
                        `目的地：${enrichDest}`,
                        `出发地：${collectedData.origin || '未提供'}`,
                        `出行日期：${dateRange}`,
                        `交通方式：${transport}`,
                        `酒店偏好/已选：${hotelInfo}`,
                        '',
                        '已有草案：',
                        draftPlan || '（暂无草案）',
                        '',
                        '联网资料摘要：',
                        webContext,
                    ].join('\n');

                    const llmResult = await callLLM([{ role: 'user', content: prompt }]);
                    if (!llmResult.success || !llmResult.message) {
                        addAssistantMessage('联网攻略生成失败，请稍后再试。');
                        setLoading(false);
                        return;
                    }

                    addAssistantMessage(llmResult.message);
                    updateCollectedData('webEnrichedPlan', llmResult.message);

                    addAssistantMessage('需要查看来源链接吗？');
                    addWidgetMessage('radio_cards', {
                        title: '查看来源链接',
                        options: [
                            { id: 'yes', label: '查看来源', description: '列出引用网页', icon: 'search' },
                            { id: 'no', label: '暂不需要', description: '保持当前内容', icon: 'close' },
                        ],
                        context: 'web_sources',
                    });

                    setLoading(false);
                    return;
                }

                if (context === 'web_sources') {
                    if (selection === 'yes' || selection === '查看来源') {
                        const sources = collectedData.webSources || [];
                        if (sources.length === 0) {
                            addAssistantMessage('暂未记录来源链接。');
                        } else {
                            const sourceLines = sources.map((item) => `- ${item.title} — ${item.url}`);
                            addAssistantMessage(['**来源链接**', ...sourceLines].join('\n'));
                        }
                    } else {
                        addAssistantMessage('好的，需要时告诉我即可。');
                    }
                    setLoading(false);
                    return;
                }

                if (context === 'open_map') {
                    if (selection === 'yes' || selection === '打开地图') {
                        const mapDest = collectedData.destination;
                        if (!mapDest) {
                            addAssistantMessage('请问您想查看哪个城市的地图？🗺️');
                            setLoading(false);
                            return;
                        }
                        addAssistantMessage(`正在加载 ${mapDest} 的地图...`);
                        const coords = await getCityCoordinates(mapDest);
                        await new Promise(resolve => setTimeout(resolve, 400));
                        addWidgetMessage('map_view', {
                            center: coords,
                            zoom: 12,
                            title: `${mapDest} 地图`,
                        });
                    } else {
                        addAssistantMessage('好的，需要时告诉我即可。');
                    }
                    setLoading(false);
                    return;
                }

                if (context === 'next_plan') {
                    const quickActionMap: Record<string, 'hotel' | 'attraction' | 'plan' | undefined> = {
                        hotel: 'hotel',
                        attraction: 'attraction',
                        plan: 'plan',
                        '酒店': 'hotel',
                        '景点': 'attraction',
                        '行程': 'plan',
                        '查找酒店': 'hotel',
                        '探索景点': 'attraction',
                        '生成行程': 'plan',
                    };
                    const action = quickActionMap[selection];
                    const destination = collectedData.destination || '目的地';

                    if (action === 'hotel') {
                        addAssistantMessage(`好的，先为您在 **${destination}** 挑选酒店：`);
                        await new Promise(resolve => setTimeout(resolve, 400));
                        addWidgetMessage('hotel_search_advanced', { city: destination });
                        setLoading(false);
                        return;
                    }
                    if (action === 'attraction') {
                        addAssistantMessage(`好的，先看看 **${destination}** 的热门景点：`);
                        await new Promise(resolve => setTimeout(resolve, 400));
                        const realAttractions = await searchRealAttractions(destination);
                        if (realAttractions) {
                            addWidgetMessage('attraction_cards', {
                                places: realAttractions,
                                title: `${destination} 景点 (高德数据)`,
                                selectable: false,
                            });
                        } else {
                            addWidgetMessage('attraction_cards', {
                                places: mockAttractions,
                                title: '热门景点推荐',
                                selectable: false,
                            });
                        }
                        await askOpenMap();
                        setLoading(false);
                        return;
                    }
                    if (action === 'plan') {
                        addAssistantMessage('好的，我来为您生成行程草案。');
                        await processWithLocalLogic('生成行程', { preserveDestination: true });
                        await askOpenMap();
                        setLoading(false);
                        return;
                    }

                    addAssistantMessage('已收到选择，如需继续请告诉我。');
                    setLoading(false);
                    return;
                }

                if (context === 'return_transport') {
                    const returnMap: Record<string, 'flight' | 'train' | 'drive' | 'skip'> = {
                        flight: 'flight',
                        train: 'train',
                        car: 'drive',
                        skip: 'skip',
                        '椋炴満': 'flight',
                        '楂橀搧': 'train',
                        '高铁': 'train',
                        '鑷┚': 'drive',
                        '自驾': 'drive',
                        '暂不规划': 'skip',
                        '不需要': 'skip',
                    };
                    const returnKey = returnMap[selection];

                    if (!returnKey) {
                        addAssistantMessage('已收到选择，如需继续请告诉我。');
                        setLoading(false);
                        return;
                    }

                    if (returnKey === 'skip') {
                        addAssistantMessage('好的，暂不规划返程。');
                        updateCollectedData('returnTransportMode', 'skip');
                        await showNextPlanOptions({ skipReturnCheck: true });
                        setLoading(false);
                        return;
                    }

                    const returnDate = dates?.end;
                    if (!returnDate) {
                        addAssistantMessage('还缺少返程日期，暂时无法规划返程交通。');
                        setLoading(false);
                        return;
                    }

                    updateCollectedData('returnTransportMode', returnKey);

                    if (returnKey === 'train') {
                        addAssistantMessage(`正在为您查询返程高铁 ${destination} → ${origin} 的车次... 🚄`);
                        try {
                            const tickets = await searchTickets(destination, origin, returnDate);
                            await new Promise(resolve => setTimeout(resolve, 800));
                            addWidgetMessage('train_tickets', {
                                tickets: tickets.slice(0, 50),
                                origin: destination,
                                destination: origin,
                                date: returnDate,
                                title: `返程 ${destination} → ${origin}`,
                                context: 'return',
                            });
                        } catch (error) {
                            console.error('Return train search failed:', error);
                            addAssistantMessage(`返程车票查询失败：${error instanceof Error ? error.message : '未知错误'}`);
                        }
                        setLoading(false);
                        return;
                    }

                    if (returnKey === 'flight') {
                        if (!isAmadeusConfigured()) {
                            addAssistantMessage('返程航班查询需要配置 API，请选择其他返程方式。');
                            await askReturnTransport();
                            setLoading(false);
                            return;
                        }

                        addAssistantMessage(`正在为您查询返程航班 ${destination} → ${origin} ... ✈️`);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        const flights = await searchRealFlights(destination, origin, returnDate);
                        if (flights && flights.length > 0) {
                            const originCode = getAirportCode(destination) || destination;
                            const destCode = getAirportCode(origin) || origin;
                            addWidgetMessage('flight_results', {
                                flights,
                                title: '返程航班',
                                origin: `${destination} (${originCode})`,
                                destination: `${origin} (${destCode})`,
                                context: 'return',
                            });
                        } else {
                            addWidgetMessage('flight_results', {
                                flights: [],
                                title: '未找到符合条件的返程航班',
                                origin: destination,
                                destination: origin,
                                context: 'return',
                            });
                        }
                        setLoading(false);
                        return;
                    }

                    addAssistantMessage('已记录返程方式为自驾。');
                    await showNextPlanOptions({ skipReturnCheck: true });
                    setLoading(false);
                    return;
                }

                const transportMap: Record<string, 'flight' | 'train' | 'drive'> = {
                    flight: 'flight',
                    train: 'train',
                    car: 'drive',
                    '椋炴満': 'flight',
                    '楂橀搧': 'train',
                    '高铁': 'train',
                    '鑷┚': 'drive',
                    '自驾': 'drive',
                };

                const transportKey = transportMap[selection];

                if (!transportKey) {
                    addAssistantMessage('已收到选择，如需继续请告诉我。');
                    setLoading(false);
                    return;
                }

                updateCollectedData('transportMode', transportKey as 'flight' | 'train' | 'drive');
                updateCollectedData('returnTransportMode', undefined);

                if (transportKey === 'flight') {
                    if (!isAmadeusConfigured() || !dates) {
                        addAssistantMessage('航班查询需要配置 API，或补充出行日期。');
                        setLoading(false);
                        return;
                    }

                    addAssistantMessage(`正在搜索 ${origin} → ${destination} 的航班...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const flights = await searchRealFlights(origin, destination, dates.start);
                    if (flights && flights.length > 0) {
                        const originCode = getAirportCode(origin) || origin;
                        const destCode = getAirportCode(destination) || destination;

                        addWidgetMessage('flight_results', {
                            flights,
                            title: '为您找到以下航班',
                            origin: `${origin} (${originCode})`,
                            destination: `${destination} (${destCode})`,
                        });
                    } else {
                        addWidgetMessage('flight_results', {
                            flights: [],
                            title: '未找到符合条件的航班',
                            origin,
                            destination,
                        });
                    }
                    setLoading(false);
                    return;
                }

                if (transportKey === 'train') {
                    if (!dates) {
                        addAssistantMessage('还缺少出行日期，暂时无法查询车次。');
                        setLoading(false);
                        return;
                    }

                    addAssistantMessage(`正在为您查询 ${origin} → ${destination} 的高铁车次... 🚄`);
                    try {
                        const tickets = await searchTickets(origin, destination, dates.start);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        addWidgetMessage('train_tickets', {
                            tickets: tickets.slice(0, 50),
                            origin,
                            destination,
                            date: dates.start,
                            title: `${origin} → ${destination}`
                        });
                    } catch (error) {
                        console.error('Train search failed:', error);
                        addAssistantMessage(`车票查询失败：${error instanceof Error ? error.message : '未知错误'}`);
                    }
                    setLoading(false);
                    return;
                }

                addAssistantMessage('已记录出行方式为自驾。');
                await askReturnTransport();
                setLoading(false);
            }
            // Handle advanced hotel selection
            else if (widget.widgetType === 'hotel_search_advanced') {
                const hotel = response as { name: string; price?: number };

                // Save selection to global state
                updateCollectedData('selectedHotel', { ...hotel, id: 'temp', category: 'hotel' } as any);

                addAssistantMessage(`太棒了！已为您选好 **${hotel.name}**${hotel.price ? ` (¥${hotel.price}起)` : ''}。\n\n您现在可以：\n• 输入 "景点" 查看热门景点\n• 输入 "地图" 查看目的地地图\n• 或者告诉我其他需求～`);
                await askOpenMap();
            }
            // Handle simple hotel selection
            else if (widget.widgetType === 'hotel_search') {
                const hotel = response as { name: string };

                // Save selection to global state
                updateCollectedData('selectedHotel', { ...hotel, id: 'temp', category: 'hotel' } as any);

                addAssistantMessage(`太棒了！已为您选好 **${hotel.name}**。\n\n您现在可以：\n• 输入 "景点" 查看热门景点\n• 输入 "地图" 查看目的地地图\n• 或者告诉我其他需求～`);
                await askOpenMap();
            }
        }

        setLoading(false);
    };

    return (
        <div className="flex flex-col h-screen bg-stone-50 relative overflow-hidden font-sans">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-sage-100/50 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-terracotta-100/40 blur-[120px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between p-6 pb-2">
                <div className="w-10" />
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-6 py-2.5 rounded-full shadow-sm border border-white/50"
                >
                    <Compass className="w-5 h-5 text-stone-800" />
                    <h1 className="text-xl font-serif font-medium text-stone-900 tracking-wide">Aether Plan</h1>
                    {config.llm.apiKey && (
                        <span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" title="AI 已连接" />
                    )}
                </motion.div>
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={openConfig}
                    className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-white transition-all shadow-sm border border-white/50"
                    title="API 设置"
                >
                    <Settings className="w-5 h-5" />
                </motion.button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 relative z-10 max-w-4xl mx-auto w-full px-4 md:px-6 py-4 flex flex-col min-h-0">
                <div className="flex-1 bg-white/40 backdrop-blur-sm rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden relative">

                    <MessageList
                        messages={messages}
                        isLoading={isLoading}
                        onWidgetSubmit={handleWidgetSubmit}
                    />

                    <div className="p-4 md:p-6 bg-gradient-to-t from-stone-50/90 via-stone-50/50 to-transparent">
                        <InputArea
                            onSend={processUserInput}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </main>

            <div className="h-4" />

            {/* Settings Modal */}
            <SettingsModal />
        </div>
    );
};

export default ChatContainer;




