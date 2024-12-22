# Token Trending Plugin

A comprehensive plugin for tracking and analyzing cryptocurrency trends using multiple data sources.

## Features

- Multi-source token trending data (CoinGecko + DexScreener)
- Global cryptocurrency market statistics
- Exchange information and rankings
- Real-time token price checking
- Rate-limit compliant API calls

## Installation

```bash
npm install @ai16z/plugin-token-trending
# or
yarn add @ai16z/plugin-token-trending
```

## Usage

```typescript
import { tokenTrendingPlugin } from "@ai16z/plugin-token-trending";

// Add to your agent's plugins
const agent = new AgentRuntime({
    // ... other config
    plugins: [tokenTrendingPlugin],
});
```

## Available Actions

### 1. Find Trending Tokens

```typescript
// Get trending tokens across different chains
"Show me trending tokens on Ethereum";
"What are the top trending tokens on Solana?";
```

### 2. Get Global Market Data

```typescript
// Get overall crypto market statistics
"Show me the current state of the crypto market";
"What's the global crypto market cap?";
```

### 3. List Exchanges

```typescript
// Get information about cryptocurrency exchanges
"List the top cryptocurrency exchanges";
"Show me exchanges sorted by trading volume";
```

### 4. Check Token Prices

```typescript
// Get current prices for specific tokens
"What's the price of Bitcoin and Ethereum in USD?";
"Show me the price of SOL in EUR";
```

## Data Sources

### CoinGecko

- Trending tokens
- Global market data
- Exchange information
- Token prices

### DexScreener

- Latest boosted tokens
- Chain-specific trending data
- Token metadata and links

## Rate Limits

- CoinGecko: Standard API rate limits apply
- DexScreener: 60 requests per minute

## Dependencies

- `@ai16z/eliza`: Core framework
- `axios`: HTTP client
- `coingecko-api-v3`: CoinGecko API client

## Development

```bash
# Install dependencies
yarn install

# Build the plugin
yarn build

# Run in development mode
yarn dev

# Clean build artifacts
yarn clean
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

For support, please open an issue in the repository or contact the maintainers.
