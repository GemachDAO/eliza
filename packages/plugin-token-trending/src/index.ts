import { Plugin } from "@ai16z/eliza";
import {
    findTrendingTokens,
    getGlobalData,
    getExchanges,
    getSimplePrice,
} from "./actions/findTrending";

export const tokenTrendingPlugin: Plugin = {
    name: "token-trending",
    description: "Plugin for finding trending tokens across different chains",
    actions: [findTrendingTokens, getGlobalData, getExchanges, getSimplePrice],
    evaluators: [],
    providers: [],
};

export default tokenTrendingPlugin;
