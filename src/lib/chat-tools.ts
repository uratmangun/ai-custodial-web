import OpenAI from "openai";

// System message describing the available tool calls
export const systemMessage = {
  role: "system",
  content: `This chatbot is intended solely for interacting with the Base Ethereum and Base Sepolia networks.
Available tool calls:
  - check_balance: Get the balance of the connected wallet or specified token.
  - check_coin: Get details for a single coin by address. Optionally specify chainId (base or baseSepolia, default is base).
  - create_coin: Create a new coin with name, symbol, description, and image URL.
  - check_coin_address: Check a coin by its transaction address.
  - trade: Execute a trade (buy or sell) for a specified coin address and amount.
  - create_delegation_account: Create a new delegation account.
  - list_delegation_accounts: List all delegation accounts.
  - transfer: Transfer tokens to a specified address.

If a question falls outside these tools, respond "Available tool calls: check_balance, check_coin, create_coin, check_coin_address, trade, create_delegation_account, list_delegation_accounts, transfer"`,
};

// Tools array for OpenAI API
export const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_balance",
      description: "Get the balance of the connected wallet or an ERC-20 token if address is provided.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Optional user address.",
          },
          next_page: {
            type: "string",
            description: "Optional pagination cursor for next page of balances.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_coin",
      description: "Get details for a single coin by address. Optionally specify chainId (base or baseSepolia, default is base).",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Coin contract address.",
          },
          chainId: {
            type: "string",
            enum: ["base", "baseSepolia"],
            description: "Chain to query. Optional, defaults to base.",
          },
        },
        required: ["address"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_coin",
      description: "Create a new coin with name, symbol, description, and image URL.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the coin.",
          },
          symbol: {
            type: "string",
            description: "Symbol of the coin.",
          },
          description: {
            type: "string",
            description: "Description of the coin.",
          },
          imageUrl: {
            type: "string",
            description: "Image URL for the coin.",
          },
        },
        required: ["name", "symbol"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_coin_address",
      description: "Check a coin by its transaction address.",
      parameters: {
        type: "object",
        properties: {
          transaction: {
            type: "string",
            description: "Transaction string for the coin address.",
          },
        },
        required: ["transaction"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trade",
      description: "Execute a trade (buy or sell) for a specified coin address and amount.",
      parameters: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            description: "The direction of the trade.",
            enum: ["buy", "sell"],
          },
          address: {
            type: "string",
            description: "The address of the coin to trade.",
          },
          amount: {
            type: "number",
            description: "The amount to trade.",
          },
        },
        required: ["direction", "address", "amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_delegation_account",
      description: "Create a new delegation account.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_delegation_accounts",
      description: "List all delegation accounts.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer",
      description: "Transfer tokens to a specified address.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The recipient address for the transfer.",
          },
          amount: {
            type: "string",
            description: "The amount to transfer.",
          },
          token: {
            type: "string",
            description: "Optional token address. If not provided, transfers native tokens.",
          },
        },
        required: ["address", "amount"],
        additionalProperties: false,
      },
    },
  },
]; 