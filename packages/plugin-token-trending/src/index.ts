import { Plugin } from "@ai16z/eliza";
import {
    findTrendingTokens,
    getGlobalData,
    getExchanges,
    getSimplePrice,
    checkTokenSecurity,
    getTrendingTokensOnChain,
} from "./actions/findTrending";

export const tokenTrendingPlugin: Plugin = {
    name: "token-trending",
    description:
        "Plugin for finding trending tokens and pools across different chains",
    actions: [
        findTrendingTokens,
        getGlobalData,
        getExchanges,
        getSimplePrice,
        checkTokenSecurity,
        getTrendingTokensOnChain,
    ],
    evaluators: [],
    providers: [],
};

export default tokenTrendingPlugin;
