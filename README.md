# AI custodial web

An AI-powered chat interface built with Next.js that lets you query and interact with the Base and Base Sepolia blockchains. It leverages the Zora Coins SDK to fetch on-chain data (balances, top gainers, coin details, and comments) and defines tool functions (switch_chain, current_chain, check_address, check_balance, get_coin_top_gainers, check_coin, get_coin_comment). Responses are formatted with human-readable ETH units, markdown previews, and paginated comments with user handles and timestamps. The application runs in Docker using pnpm and is publicly accessible via a Cloudflare Tunnel.

# Web demo
https://zora-coin.uratmangun.ovh/

# Video demo
https://youtu.be/XgQppscv380

# List of tools
 - `switch_chain`: Switch between Ethereum blockchains. Default is `baseSepolia`.
 - `current_chain`: Get the current active blockchain chain.
 - `check_address`: Get the connected wallet address.
 - `check_balance`: Get the balance of the connected wallet or specified ERC-20 token. Optional parameters:
   - `address` (string): user or token contract address.
   - `next_page` (string): pagination cursor.
 - `get_coin_top_gainers`: Get the top gaining coins on Zora. Optional parameter:
   - `next_page` (string): pagination cursor.
 - `check_coin`: Get details for a single coin by its address. Optional parameter:
   - `chainId` ("base" | "baseSepolia"): chain to query (default is `base`).
 - `get_coin_comment`: Get comments for a single coin by its address. Optional parameters:
   - `chain` ("base" | "baseSepolia"): chain to query (default is `base`).
   - `next_page` (string): pagination cursor.
# How to run with docker

## Prerequisites
- Copy `.env.example` to `.env` and fill in your API keys.

## Build and Start with docker
docker run -d --restart always --env-file .env --name ai-custodial-web --network my-net ai-custodial-web
