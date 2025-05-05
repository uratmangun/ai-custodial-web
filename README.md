# AI custodial web

An AI-powered chat interface built with Next.js that lets you query and interact with the Base and Base Sepolia blockchains. It leverages the Zora Coins SDK to fetch on-chain data (balances, top gainers, coin details, and comments) and defines tool functions (switch_chain, current_chain, check_address, check_balance, get_coin_top_gainers, check_coin, get_coin_comment). Responses are formatted with human-readable ETH units, markdown previews, and paginated comments with user handles and timestamps. The application runs in Docker using pnpm and is publicly accessible via a Cloudflare Tunnel.

# Web demo
https://zora-coin.uratmangun.ovh/

# Video demo
https://www.youtube.com/watch?v=MsGDmadUUA4

# List of tools
- `switch_chain`: Switch between Ethereum blockchains. Default is baseSepolia. Parameters:
  - `chain` ("base" | "baseSepolia"): The chain to switch to (required).
- `current_chain`: Get the current active blockchain chain.
- `check_address`: Get the connected wallet address.
- `check_balance`: Get the balance of the connected wallet or an ERC-20 token if address is provided. Optional parameters:
  - `address` (string): Optional user or token contract address.
  - `next_page` (string): Optional pagination cursor.
- `get_coin_top_gainers`: Get the top gaining coins on zora coins. Optional parameter:
  - `next_page` (string): Optional pagination cursor.
- `check_coin`: Get details for a single coin by address. Optionally specify chainId (base or baseSepolia, default is base). Parameters:
  - `address` (string): Coin contract address (required).
  - `chainId` ("base" | "baseSepolia"): Chain to query (optional, defaults to base).
- `get_coin_comment`: Get comments for a single coin by address. Optionally specify chain (base or baseSepolia, default is base) and next_page for pagination. Parameters:
  - `address` (string): Coin contract address (required).
  - `chain` ("base" | "baseSepolia"): Chain to query (optional, defaults to base).
  - `next_page` (string): Optional pagination cursor.
- `create_coin`: Create a new coin with name, symbol, description, and image URL. Parameters:
  - `name` (string): Name of the coin (required).
  - `symbol` (string): Symbol of the coin (required).
  - `description` (string): Description of the coin.
  - `imageUrl` (string): Image URL for the coin.
- `check_coin_address`: Check a coin by its transaction address. Parameters:
  - `transaction` (string): Transaction string for the coin address (required).
- `trade`: Execute a trade (buy or sell) for a specified coin address and amount. Parameters:
  - `direction` ("buy" | "sell"): The direction of the trade (required).
  - `address` (string): The address of the coin to trade (required).
  - `amount` (number): The amount to trade (required).

# How to run with docker and forward to cloudflare tunnel hosted domain

## Prerequisites
- Copy `.env.example` to `.env` and fill in your API keys.

# Build the Docker image
docker build -t ai-custodial-web .
# Create a Docker network
docker network create my-net
# Run Cloudflare tunnel container
docker run -d --restart always --name cloudflared \
  --network my-net \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --token YOUR_CLOUDFLARE_TUNNEL_TOKEN
# Configure Cloudflare Tunnel in Zero Trust Dashboard

1. Log in to the [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Access > Tunnels**
3. Select your tunnel or create a new one
4. In the **Public Hostname** tab, click **Add a public hostname**
5. Configure the following:
   - **Domain**: your-domain.com
   - **Path**: / (or specific path)
   - **Service**: Select HTTP
   - **URL**: http://ai-custodial-web:3000
6. Click **Save hostname**

The tunnel will route traffic from your domain to the containerized application running on port 3000.

# Run the container

docker run -d --restart always --env-file .env -v /home/uratmangun/CascadeProjects/ai-custodial-web/data:/app/data --name ai-custodial-web --network my-net ai-custodial-web

# Stop the container
docker stop ai-custodial-web

# Remove the container
docker rm ai-custodial-web

# Remove the image
docker rmi ai-custodial-web

