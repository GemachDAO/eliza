import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    composeContext,
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

interface TokenSecurityInfo {
    // Basic Token Info
    token_name: string;
    token_symbol: string;
    total_supply: string;

    // Contract Security
    is_open_source: string;
    is_proxy: string;
    is_mintable: string;
    creator_address: string;
    creator_balance: string;
    creator_percent: string;

    // Risk Factors
    is_honeypot: string;
    honeypot_with_same_creator: string;
    hidden_owner: string;
    can_take_back_ownership: string;
    owner_change_balance: string;
    selfdestruct: string;
    external_call: string;

    // Trading Features
    buy_tax: string;
    sell_tax: string;
    slippage_modifiable: string;
    personal_slippage_modifiable: string;
    transfer_pausable: string;
    anti_whale_modifiable: string;
    trading_cooldown: string;

    // Access Control
    is_blacklisted: string;
    is_whitelisted: string;
    is_anti_whale: string;
    cannot_buy: string;
    cannot_sell_all: string;

    // DEX Information
    is_in_dex: string;
    dex?: {
        name: string;
        liquidity_type: string;
        liquidity: string;
        pair: string;
    }[];

    // Holder Information
    holder_count: string;
    holders?: {
        address: string;
        tag?: string;
        is_contract: number;
        balance: string;
        percent: string;
        is_locked: number;
    }[];

    // LP Information
    lp_holder_count: string;
    lp_total_supply: string;
    lp_holders?: {
        address: string;
        tag?: string;
        is_contract: number;
        balance: string;
        percent: string;
        is_locked: number;
    }[];
}

// Add new axios instances
const axiosYieldInstance = axios.create({
    baseURL: `https://yields.llama.fi`,
    timeout: 65000,
    headers: {
        "content-type": "application/json ",
    },
});

// Add new interfaces
interface PoolData {
    chain?: string;
    project?: string;
    tvlUsd?: number;
    symbol?: string;
    network?: string;
    apyBase?: number;
    apyReward?: number | null;
    apy?: number;
    ilRisk?: string;
    exposure?: string;
    predictions?: {
        predictedClass?: string;
        predictedProbability?: number;
        binnedConfidence?: number;
    };
    stablecoin?: boolean;
    poolMeta?: string | null;
    underlyingTokens?: string[];
}

const supportedChains = [
    "Ethereum",
    "Solana",
    "Base",
    "BSC",
    "Arbitrum",
    "Hyperliquid",
    "Sui",
    "Tron",
    "Avalanche",
    "Polygon",
    "Optimism",
    "Thorchain",
    "PulseChain",
    "Mantle",
    "Aptos",
    "Dexalot",
    "Linea",
    "Blast",
    "Scroll",
    "Sei",
    "BOB",
    "Fantom",
    "ZKsync Era",
    "Gnosis",
    "Osmosis",
    "Kaia",
    "TON",
    "Near",
    "Starknet",
    "Cronos",
    "Hedera",
    "CORE",
    "Injective",
    "Ronin",
    "Cardano",
    "Algorand",
    "Metis",
    "Kava",
    "Chainflip",
    "WEMIX3.0",
    "Flare",
    "Fraxtal",
    "Stellar",
    "ApeChain",
    "Polygon zkEVM",
    "Eclipse",
    "IOTA EVM",
    "MultiversX",
    "Manta",
    "Hydration",
    "Rootstock",
    "Horizen EON",
    "ICP",
    "Fuel Ignition",
    "Radix",
    "Merlin",
    "Flow",
    "Mode",
    "Morph",
    "IoTeX",
    "Vana",
    "Neutron",
    "Cronos zkEVM",
    "Moonbeam",
    "Oraichain",
    "Icon",
    "Filecoin",
    "Lisk",
    "ZetaChain",
    "EOS",
    "Fuse",
    "Taiko",
    "smartBCH",
    "Heco",
    "Canto",
    "Aurora",
    "Celo",
    "Bitlayer",
    "re.al",
    "UNIT0",
    "EOS EVM",
    "Boba",
    "FunctionX",
    "Venom",
    "Telos",
    "Terra2",
    "Sora",
    "Massa",
    "opBNB",
    "Alephium",
    "Gravity",
    "Mint",
    "Wanchain",
    "KCC",
    "Sanko",
    "DefiChain",
    "Harmony",
    "GodwokenV1",
    "Rollux",
    "Stacks",
    "Tombchain",
    "Godwoken",
    "Rangers",
    "Energi",
    "Zilliqa",
    "KARURA",
    "Moonriver",
    "Persistence One",
    "ENULS",
    "Waves",
    "Tezos",
    "Taraxa",
    "Shido",
    "Astar",
    "X Layer",
    "Hydra",
    "Elastos",
    "Oasis Sapphire",
    "Carbon",
    "Astar zkEVM",
    "Meter",
    "Rari",
    "ShimmerEVM",
    "Arbitrum Nova",
    "VeChain",
    "Obyte",
    "Bitcoincash",
    "MAP Protocol",
    "Corn",
    "DeFiChain EVM",
    "EnergyWeb",
    "Endurance",
    "HeLa",
    "Oasys",
    "Wax",
    "ThunderCore",
    "VinuChain",
    "Reya Network",
    "Immutable zkEVM",
    "Neon",
    "ZKsync Lite",
    "Planq",
    "Zora",
    "Polkadex",
    "Kardia",
    "Bittorrent",
    "MEER",
    "Syscoin",
    "NEO",
    "OKTChain",
    "Terra Classic",
    "SXnetwork",
    "OntologyEVM",
    "Ultron",
    "Cube",
    "Omax",
    "Concordium",
    "Bitcoin",
    "Asset Chain",
];

const chainExtractionTemplate = `Extract chain name from the message:
Example response:
\`\`\`json
{
    "chain": "Ethereum"
}
\`\`\`

Supported chains:
${supportedChains.join(", ")}

{{recentMessages}}

Extract:
- Chain name (must be one from the supported list, case-sensitive)
- If no exact match is found, try to find the closest match
- If still no match, default to "Ethereum"
`;

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

async function getTokenSecurity(
    chainId: string,
    tokenAddress: string
): Promise<TokenSecurityInfo | null> {
    try {
        const response = await axios.get(
            `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${tokenAddress}`
        );

        if (response.data?.result?.[tokenAddress.toLowerCase()]) {
            return response.data.result[tokenAddress.toLowerCase()];
        }
        return null;
    } catch (error) {
        console.error("Error fetching token security data:", error);
        return null;
    }
}

export const findTrendingTokens: Action = {
    name: "GET_GLOBAL_TRENDING_TOKENS",
    description:
        "Find globally trending tokens across all chains using CoinGecko and DexScreener",
    similes: [
        "GLOBAL_TRENDING_TOKENS",
        "WORLDWIDE_HOT_TOKENS",
        "ALL_CHAINS_TRENDING",
        "CROSS_CHAIN_TRENDING",
        "GLOBAL_TOKEN_TRENDS",
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
        console.log("Message ", message);
        console.log("State ", state);
        // Initialize or update state
        // if (!state) {
        //     state = (await runtime.composeState(message)) as State;
        // } else {
        //     state = await runtime.updateRecentMessageState(state);
        // }
        // TODO: handle the case where the agent doesnt know the coin ids
        const context = `Extract coin IDs from the last user message:
Example response:
\`\`\`json
{
    "coins": ["bitcoin", "ethereum"],
    "vs_currencies": ["usd", "eur"]
}
\`\`\`
${message.content.text}
Extract:
- Coin IDs (lowercase)
- VS currencies (lowercase)
`;

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
                vs_currencies: "usd",
            });
            console.log("getSimplePrice priceData", priceData);

            if (callback) {
                callback({
                    text: formatPriceResponse(priceData),
                    type: "success",
                    data: priceData,
                });
            }

            return priceData;
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

export const checkTokenSecurity: Action = {
    name: "CHECK_TOKEN_SECURITY",
    description: "Check token security-safety information using GoPlus Security API",
    similes: [
        "TOKEN_SECURITY",
        "SECURITY_CHECK",
        "VERIFY_TOKEN",
        "TOKEN_AUDIT",
        "CHECK_TOKEN_SAFETY",
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
        if (callback) {
            callback({
                text: "🔒 Analyzing token security...",
                type: "processing",
            });
        }

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const context = `Extract chain ID and token address from the message:
Example response:
\`\`\`json
{
    "chainId": "1",
    "tokenAddress": "0x1234..."
}
\`\`\`
Chain IDs:
1:Ethereum
56:BSC
42161:Arbitrum
137:Polygon
solana:Solana
204:opBNB
324:zkSync Era
59144:Linea Mainnet
8453:Base
5000:Mantle
534352:Scroll
10:Optimism
43114:Avalanche
250:Fantom
25:Cronos
128:HECO
100:Gnosis
tron:Tron
321:KCC
201022:FON
42766:ZKFair
81457:Blast
169:Manta Pacific
80085:Berachain Artio Testnet
4200:Merlin
200901:Bitlayer Mainnet
810180:zkLink Nova
196:X Layer Mainnet
48899:Zircuit
185:Mint

${message.content.text}
Extract:
- Chain ID (number as string) if not mentioned, return "missing"
- Token address (full address)
`;
        const params = await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
        if (params.chainId === "missing") {
            if (callback) {
                callback({
                    text: "❌ Chain ID is missing. Please provide a valid chain ID.",
                    type: "error",
                });
            }
            return false;
        }

        try {
            const securityInfo = await getTokenSecurity(
                params.chainId,
                params.tokenAddress
            );

            if (!securityInfo) {
                if (callback) {
                    callback({
                        text: "❌ Could not fetch security information for this token.",
                        type: "error",
                    });
                }
                return false;
            }

            if (callback) {
                callback({
                    text: formatSecurityResponse(securityInfo),
                    type: "success",
                    data: securityInfo,
                });
            }

            return true;
        } catch (error: any) {
            if (callback) {
                callback({
                    text: `Error checking token security: ${error.message}`,
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
                content: "Check security for token 0x1234... on Ethereum",
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Analyzing token security...",
                    action: "CHECK_TOKEN_SECURITY",
                },
            },
        ],
    ] as ActionExample[][],
};

function getSecurityRiskEmoji(riskLevel: string): string {
    switch (riskLevel) {
        case "CRITICAL":
            return "🚨";
        case "HIGH":
            return "⚠️";
        case "MEDIUM":
            return "⚡";
        case "LOW":
            return "📊";
        case "SAFE":
            return "✅";
        default:
            return "❓";
    }
}

function formatSecurityResponse(info: TokenSecurityInfo): string {
    const riskLevel = calculateRiskLevel(info);
    const riskEmoji = getSecurityRiskEmoji(riskLevel);

    return (
        `${riskEmoji} *Token Security Analysis*\n\n` +
        `*Token Information:*\n` +
        `• Name: ${info.token_name} (${info.token_symbol})\n` +
        `• Total Supply: ${formatNumber(info.total_supply)}\n` +
        `• Creator: ${shortenAddress(info.creator_address)}\n` +
        `• Creator Balance: ${formatNumber(info.creator_balance)} (${formatNumber(info.creator_percent)}%)\n\n` +
        `*Contract Security:*\n` +
        `• Open Source: ${formatBool(info.is_open_source)}\n` +
        `• Proxy Contract: ${formatBool(info.is_proxy)}\n` +
        `• Mintable: ${formatBool(info.is_mintable)}\n\n` +
        `*Risk Factors:*\n` +
        `• Honeypot Risk: ${formatBool(info.is_honeypot, true)}\n` +
        `• Similar Honeypots: ${formatBool(info.honeypot_with_same_creator, true)}\n` +
        `• Hidden Owner: ${formatBool(info.hidden_owner, true)}\n` +
        `• Can Take Back Ownership: ${formatBool(info.can_take_back_ownership, true)}\n` +
        `• Self Destruct: ${formatBool(info.selfdestruct, true)}\n\n` +
        `*Trading Information:*\n` +
        `• Buy Tax: ${info.buy_tax}%\n` +
        `• Sell Tax: ${info.sell_tax}%\n` +
        `• Transfer Pausable: ${formatBool(info.transfer_pausable)}\n` +
        `• Anti-Whale: ${formatBool(info.is_anti_whale)}\n` +
        `• Trading Cooldown: ${formatBool(info.trading_cooldown)}\n\n` +
        `*DEX Presence:*\n` +
        formatDexInfo(info) +
        "\n\n" +
        `*Holder Distribution:*\n` +
        formatHolderInfo(info) +
        "\n\n" +
        `*Overall Risk Level: ${riskLevel}*\n` +
        getRecommendation(riskLevel)
    );
}

function formatBool(value: string, isRisk: boolean = false): string {
    const boolValue = value === "1";
    if (isRisk) {
        return boolValue ? "🚨 YES" : "✅ No";
    }
    return boolValue ? "✅ Yes" : "❌ No";
}

function formatNumber(value: string | number): string {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString(undefined, {
        maximumFractionDigits: 2,
    });
}

function shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDexInfo(info: TokenSecurityInfo): string {
    if (info.is_in_dex !== "1" || !info.dex?.length) {
        return "• Not listed on any DEX";
    }

    return info.dex
        .map(
            (dex) =>
                `• ${dex.name} (${dex.liquidity_type})\n` +
                `  Liquidity: $${formatNumber(dex.liquidity)}\n` +
                `  Pair: ${shortenAddress(dex.pair)}`
        )
        .join("\n");
}

function formatHolderInfo(info: TokenSecurityInfo): string {
    const holderCount = `• Total Holders: ${info.holder_count}\n`;

    if (!info.holders?.length) {
        return holderCount;
    }

    const topHolders = info.holders
        .slice(0, 5)
        .map((holder) => {
            const tag = holder.tag ? ` (${holder.tag})` : "";
            return `• ${shortenAddress(holder.address)}${tag}: ${formatNumber(holder.percent)}%`;
        })
        .join("\n");

    return holderCount + "Top 5 Holders:\n" + topHolders;
}

function calculateRiskLevel(info: TokenSecurityInfo): string {
    let riskScore = 0;

    // Critical risks
    if (info.is_honeypot === "1") riskScore += 100;
    if (info.hidden_owner === "1") riskScore += 90;
    if (info.selfdestruct === "1") riskScore += 80;
    if (info.honeypot_with_same_creator === "1") riskScore += 100;

    // High risks
    if (info.can_take_back_ownership === "1") riskScore += 70;
    if (info.is_open_source === "0") riskScore += 60;
    if (parseFloat(info.buy_tax) > 10 || parseFloat(info.sell_tax) > 10)
        riskScore += 70;

    // Medium risks
    if (info.is_mintable === "1") riskScore += 40;
    if (info.transfer_pausable === "1") riskScore += 30;
    if (info.is_proxy === "1") riskScore += 20;
    if (info.trading_cooldown === "1") riskScore += 30;

    // Determine risk level
    if (riskScore >= 100) return "CRITICAL";
    if (riskScore >= 70) return "HIGH";
    if (riskScore >= 40) return "MEDIUM";
    if (riskScore >= 20) return "LOW";
    return "SAFE";
}

function getRecommendation(riskLevel: string): string {
    switch (riskLevel) {
        case "CRITICAL":
            return "🚫 *RECOMMENDATION:* Do not interact with this token. Multiple critical security risks detected.";
        case "HIGH":
            return "⚠️ *RECOMMENDATION:* Extreme caution advised. High-risk security issues present.";
        case "MEDIUM":
            return "⚡ *RECOMMENDATION:* Proceed with caution. Some security concerns identified.";
        case "LOW":
            return "📊 *RECOMMENDATION:* Generally safe, but always conduct your own research.";
        case "SAFE":
            return "✅ *RECOMMENDATION:* Token appears safe based on security analysis.";
        default:
            return "❓ *RECOMMENDATION:* Insufficient data to make a recommendation.";
    }
}

async function getTopPoolsByTVL(chain: string): Promise<PoolData[]> {
    try {
        const response = await axiosYieldInstance.get(`/pools`);
        const data = response.data.data;
        const result = data.filter((pool: any) => pool.chain === chain);
        return result
            .sort((a: any, b: any) => b.tvlUsd - a.tvlUsd)
            .slice(0, 100);
    } catch (error) {
        console.error("Error fetching top pools by TVL:", error);
        return [];
    }
}

export const getTrendingTokensOnChain: Action = {
    name: "GET_NETWORK_TRENDING_TOKENS",
    description:
        "Find trending tokens and their pools on a specific blockchain network",
    similes: [
        "NETWORK_TOKEN_TRENDS",
        "CHAIN_SPECIFIC_TOKENS",
        "BLOCKCHAIN_HOT_TOKENS",
        "NETWORK_POPULAR_TOKENS",
        "CHAIN_TRENDING_TOKENS",
        "GET_CHAIN_TOKEN_TRENDING",
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
        if (callback) {
            callback({
                text: "🆕 Fetching trending tokens on network...",
                type: "processing",
            });
        }

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const context = composeContext({
            state,
            template: chainExtractionTemplate,
        });

        const params = await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        // Validate chain
        if (!supportedChains.includes(params.chain)) {
            if (callback) {
                callback({
                    text: `❌ Unsupported chain: ${params.chain}. Please choose from the supported chains list.`,
                    type: "error",
                });
            }
            return false;
        }

        try {
            const poolsData = await getToPoolByTVL({ chain: params.chain });

            if (!poolsData || poolsData.length === 0) {
                if (callback) {
                    callback({
                        text: `No trending tokens found for ${params.chain}`,
                        type: "success",
                        data: [],
                    });
                }
                return true;
            }

            if (callback) {
                callback({
                    text: formatTVLPoolsResponse(poolsData),
                    type: "success",
                    data: poolsData,
                });
            }

            return true;
        } catch (error: any) {
            if (callback) {
                callback({
                    text: `Error fetching trending tokens: ${error.message}`,
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
                content: {
                    text: "Show me trending tokens on Ethereum",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here are the trending tokens by TVL...",
                    action: "GET_NETWORK_TRENDING_TOKENS",
                },
            },
        ],
    ],
};

function getILRiskEmoji(risk: string): string {
    switch (risk.toLowerCase()) {
        case "no":
            return "✅";
        case "low":
            return "📊";
        case "medium":
            return "⚡";
        case "high":
            return "⚠️";
        case "very high":
            return "🚨";
        default:
            return "❓";
    }
}

function formatTVLPoolsResponse(pools: PoolData[]): string {
    if (!pools.length) {
        return "❌ No pool data available";
    }

    return (
        ` Top Pools by TVL:\n\n` +
        pools
            .slice(0, 10)
            .map((pool, index) => {
                const riskEmoji = getILRiskEmoji(pool.ilRisk || "unknown");
                const apyFormatted = pool.apy
                    ? `${pool.apy.toFixed(2)}%`
                    : "N/A";
                const baseApyFormatted = pool.apyBase
                    ? `${pool.apyBase.toFixed(2)}%`
                    : "N/A";
                const rewardApyFormatted = pool.apyReward
                    ? `${pool.apyReward.toFixed(2)}%`
                    : "N/A";

                let predictionInfo = "";
                if (pool.predictions?.predictedClass) {
                    const confidence =
                        pool.predictions.predictedProbability?.toFixed(1) ||
                        "N/A";
                    predictionInfo = `\n   • Prediction: ${pool.predictions.predictedClass} (${confidence}% confidence)`;
                }

                return (
                    `${index + 1}. ${pool.project} (${pool.symbol})\n` +
                    `   • Chain: ${pool.chain}\n` +
                    `   • TVL: $${formatNumber(pool.tvlUsd || 0)}\n` +
                    `   • Total APY: ${apyFormatted}\n` +
                    `   • Base APY: ${baseApyFormatted}\n` +
                    `   • Reward APY: ${rewardApyFormatted}\n` +
                    `   • IL Risk: ${riskEmoji} ${pool.ilRisk}\n` +
                    `   • Exposure: ${pool.exposure || "Unknown"}` +
                    `${predictionInfo}` +
                    (pool.poolMeta ? `\n   • Note: ${pool.poolMeta}` : "")
                );
            })
            .join("\n\n")
    );
}

async function getToPoolByTVL(args: { chain: string }): Promise<PoolData[]> {
    try {
        const response = await axiosYieldInstance.get(`/pools`);
        const data = response.data.data;
        const result = data.filter((pool: any) => pool.chain === args.chain);
        const top50Pools = result
            .sort((a: any, b: any) => b.tvlUsd - a.tvlUsd)
            .slice(0, 100);
        return top50Pools;
    } catch (error) {
        console.error("Error calling Api:", error);
        return [];
    }
}
