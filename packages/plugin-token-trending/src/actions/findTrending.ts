import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    composeContext,
    // generateObject,
    ModelClass,
    generateObjectDeprecated,
} from "@ai16z/eliza";
import { CoinGeckoClient } from "coingecko-api-v3";
import axios from "axios";
import { elizaLogger } from "@ai16z/eliza";
interface TrendingTokenParams {
    chain?: string;
    timeframe?: string;
    limit?: number;
    source?: "coingecko" | "dexscreener" | "all";
}

interface TrendingToken {
    symbol?: string;
    name?: string;
    chain: string;
    price_change_24h?: string;
    volume_24h?: string;
    market_cap?: string;
    tokenAddress?: string;
    description?: string;
    boost_amount?: number;
    links?: {
        type?: string;
        label?: string;
        url: string;
    }[];
}

interface DexScreenerBoost {
    url: string;
    chainId: string;
    tokenAddress: string;
    amount: number;
    totalAmount: number;
    icon?: string;
    header?: string;
    description?: string;
    links?: {
        type?: string;
        label?: string;
        url: string;
    }[];
}

interface GlobalCryptoData {
    active_cryptocurrencies: number;
    markets: number;
    total_market_cap: { [key: string]: number };
    total_volume: { [key: string]: number };
    market_cap_percentage: { [key: string]: number };
    market_cap_change_percentage_24h_usd: number;
}

interface ExchangeData {
    id: string;
    name: string;
    year_established?: number;
    country?: string;
    trust_score?: number;
    trade_volume_24h_btc?: number;
}

interface PriceParams {
    coins: string[];
    vs_currencies?: string[];
}

const trendingTemplate = `Extract trending token search parameters from the recent messages:

Example response:
\`\`\`json
{
    "chain": "ethereum",
    "timeframe": "24h",
    "limit": 5,
    "source": "all"
}
\`\`\`

{{recentMessages}}

Extract or infer:
- Chain name (ethereum, solana, etc.)
- Timeframe (1h, 24h, 7d)
- Number of tokens to return (limit)
- Source (coingecko, dexscreener, or all)

Respond with a JSON markdown block containing only the extracted values.`;

async function getDexScreenerTrending(): Promise<TrendingToken[]> {
    try {
        const response = await axios.get(
            "https://api.dexscreener.com/token-boosts/latest/v1"
        );
        const boosts: DexScreenerBoost[] = response.data;

        return boosts.map((boost) => ({
            chain: boost.chainId,
            tokenAddress: boost.tokenAddress,
            description: boost.description,
            boost_amount: boost.amount,
            links: boost.links,
        }));
    } catch (error) {
        console.error("Error fetching DexScreener data:", error);
        return [];
    }
}

async function getCoinGeckoTrending(limit: number): Promise<TrendingToken[]> {
    const client = new CoinGeckoClient();
    const trendingData = await client.trending();

    return await Promise.all(
        trendingData.coins.slice(0, limit).map(async (coin) => {
            const details = await client.coinId({ id: coin.item.id });
            return {
                symbol: coin.item.symbol.toUpperCase(),
                name: coin.item.name,
                chain: "multi-chain",
                price_change_24h:
                    `${details.market_data?.price_change_percentage_24h?.toFixed(2)}%` ||
                    "N/A",
                volume_24h: `$${(details.market_data?.total_volume?.usd || 0).toLocaleString()}`,
                market_cap: `$${(details.market_data?.market_cap?.usd || 0).toLocaleString()}`,
            };
        })
    );
}

export const findTrendingTokens: Action = {
    name: "FIND_TRENDING_TOKENS",
    description: "Find trending tokens across different blockchain networks",
    similes: [
        "GET_TRENDING_TOKENS",
        "TRENDING_TOKENS",
        "HOT_TOKENS",
        "POPULAR_TOKENS",
        "TOKEN_TRENDS",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        // if (callback) {
        //     callback({
        //         text: "🔍 Searching for trending tokens...",
        //         type: "processing",
        //     });
        // }
        const userId = runtime.agentId;
        console.log("User ID:", userId);
        elizaLogger.log("User ID:", userId);
        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Generate parameters from user input
        const context = composeContext({
            state,
            template: trendingTemplate,
        });
        // TODO: use generateObject with zod schema
        const params = await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
        //  as TrendingTokenParams;

        try {
            let trendingTokens: TrendingToken[] = [];

            // Fetch data based on source parameter
            if (params.source === "all" || params.source === "coingecko") {
                const cgTokens = await getCoinGeckoTrending(params.limit || 5);
                trendingTokens = [...trendingTokens, ...cgTokens];
            }

            if (params.source === "all" || params.source === "dexscreener") {
                const dexTokens = await getDexScreenerTrending();
                const filteredDexTokens = dexTokens
                    .filter(
                        (token) =>
                            !params.chain ||
                            token.chain.toLowerCase() ===
                                params.chain.toLowerCase()
                    )
                    .slice(0, params.limit || 5);
                trendingTokens = [...trendingTokens, ...filteredDexTokens];
            }

            if (callback) {
                callback({
                    text: formatTrendingTokensResponse(trendingTokens, params),
                    type: "success",
                    data: trendingTokens,
                });
            }

            return true;
        } catch (error: any) {
            if (callback) {
                callback({
                    text: `Error finding trending tokens: ${error.message}`,
                    type: "error",
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: "Show me trending tokens on Ethereum",
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here are the trending tokens on Ethereum...",
                    action: "FIND_TRENDING_TOKENS",
                },
            },
        ],
        // ... other examples
    ] as ActionExample[][],
};

function formatTrendingTokensResponse(
    tokens: TrendingToken[],
    params: TrendingTokenParams
): string {
    const header = `📈 Trending tokens${params.chain ? ` on ${params.chain}` : ""}:\n\n`;

    return (
        header +
        tokens
            .map((token) => {
                let details = "";

                // CoinGecko style token
                if (token.symbol && token.price_change_24h) {
                    details =
                        `${token.symbol} (${token.name})\n` +
                        `Price Change: ${token.price_change_24h}\n` +
                        `Volume: ${token.volume_24h}\n` +
                        `Market Cap: ${token.market_cap}`;
                }
                // DexScreener style token
                else {
                    details =
                        `Chain: ${token.chain}\n` +
                        `Address: ${token.tokenAddress}\n` +
                        `Boost Amount: ${token.boost_amount}\n` +
                        (token.description
                            ? `Description: ${token.description}\n`
                            : "") +
                        (token.links?.length
                            ? `Links: ${token.links.map((l) => l.url).join(", ")}\n`
                            : "");
                }

                return details;
            })
            .join("\n\n")
    );
}

export const getGlobalData: Action = {
    name: "GET_GLOBAL_DATA",
    description: "Get global cryptocurrency market data",
    similes: ["GLOBAL_CRYPTO_DATA", "MARKET_OVERVIEW", "CRYPTO_STATS"],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        if (callback) {
            callback({
                text: "📊 Fetching global cryptocurrency data...",
                type: "processing",
            });
        }

        try {
            const client = new CoinGeckoClient();
            const globalData = await client.global();

            if (callback) {
                callback({
                    text: formatGlobalDataResponse(globalData.data),
                    type: "success",
                    data: globalData.data,
                });
            }

            return true;
        } catch (error: any) {
            if (callback) {
                callback({
                    text: `Error fetching global data: ${error.message}`,
                    type: "error",
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: "Show me global crypto market data",
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here's the current global cryptocurrency market data...",
                    action: "GET_GLOBAL_DATA",
                },
            },
        ],
    ] as ActionExample[][],
};

export const getExchanges: Action = {
    name: "GET_EXCHANGES",
    description: "Get data for all supported cryptocurrency exchanges",
    similes: ["LIST_EXCHANGES", "EXCHANGE_DATA", "TRADING_PLATFORMS"],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        if (callback) {
            callback({
                text: "🏢 Fetching exchange data...",
                type: "processing",
            });
        }

        try {
            const client = new CoinGeckoClient();
            const exchangesData = await client.exchanges({});

            if (callback) {
                callback({
                    text: formatExchangesResponse(exchangesData),
                    type: "success",
                    data: exchangesData,
                });
            }

            return true;
        } catch (error: any) {
            if (callback) {
                callback({
                    text: `Error fetching exchanges data: ${error.message}`,
                    type: "error",
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: "List all cryptocurrency exchanges",
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here are the supported cryptocurrency exchanges...",
                    action: "GET_EXCHANGES",
                },
            },
        ],
    ] as ActionExample[][],
};

export const getSimplePrice: Action = {
    name: "GET_SIMPLE_PRICE",
    description: "Get current prices for specified cryptocurrencies",
    similes: ["CHECK_PRICES", "COIN_PRICES", "TOKEN_PRICES"],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        if (callback) {
            callback({
                text: "💰 Fetching coin prices...",
                type: "processing",
            });
        }

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const context = composeContext({
            state,
            template: `Extract coin IDs and vs_currencies from the message:
Example response:
\`\`\`json
{
    "coins": ["bitcoin", "ethereum"],
    "vs_currencies": ["usd", "eur"]
}
\`\`\`
{{recentMessages}}
Extract:
- Coin IDs (lowercase)
- VS currencies (lowercase)
`,
        });

        const params = await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
        // as unknown as PriceParams;

        try {
            console.log("getSimplePrice params", params);
            const client = new CoinGeckoClient();
            const priceData = await client.simplePrice({
                ids: params.coins.join(","),
                vs_currencies:"usd"
            });
            console.log("getSimplePrice priceData", priceData);

            if (callback) {
                callback({
                    text: formatPriceResponse(priceData),
                    type: "success",
                    data: priceData,
                });
            }

            return true;
        } catch (error: any) {
            if (callback) {
                callback({
                    text: `Error fetching price data: ${error.message}`,
                    type: "error",
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: "What's the price of Bitcoin and Ethereum in USD?",
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here are the current prices...",
                    action: "GET_SIMPLE_PRICE",
                },
            },
        ],
    ] as ActionExample[][],
};

function formatGlobalDataResponse(data: GlobalCryptoData): string {
    return (
        `🌍 Global Cryptocurrency Market Data:\n\n` +
        `Active Cryptocurrencies: ${data.active_cryptocurrencies.toLocaleString()}\n` +
        `Active Markets: ${data.markets.toLocaleString()}\n` +
        `Total Market Cap (USD): $${data.total_market_cap.usd.toLocaleString()}\n` +
        `24h Total Volume (USD): $${data.total_volume.usd.toLocaleString()}\n` +
        `BTC Dominance: ${data.market_cap_percentage.btc.toFixed(2)}%\n` +
        `24h Market Cap Change: ${data.market_cap_change_percentage_24h_usd.toFixed(2)}%`
    );
}

function formatExchangesResponse(exchanges: ExchangeData[]): string {
    return (
        `📊 Top Cryptocurrency Exchanges:\n\n` +
        exchanges
            .slice(0, 10)
            .map(
                (exchange) =>
                    `${exchange.name}${exchange.country ? ` (${exchange.country})` : ""}\n` +
                    `Trust Score: ${exchange.trust_score || "N/A"}\n` +
                    `24h Volume (BTC): ${exchange.trade_volume_24h_btc?.toLocaleString() || "N/A"}`
            )
            .join("\n\n")
    );
}

function formatPriceResponse(prices: {
    [key: string]: { [key: string]: number };
}): string {
    return (
        `💰 Current Price:\n\n` +
        Object.entries(prices)
            .map(
                ([coin, data]) =>
                    `${coin.toUpperCase()}:\n` +
                    Object.entries(data)
                        .map(
                            ([currency, price]) =>
                                `${currency.toUpperCase()}: $${price.toLocaleString(
                                    undefined,
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 8,
                                    }
                                )}`
                        )
                        .join("\n")
            )
            .join("\n\n")
    );
}
