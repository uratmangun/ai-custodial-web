import OpenAI from "openai";
import { NextResponse } from "next/server"; // Import NextResponse for error handling

export async function POST(request: Request) {
  try {
    // Extract messages and the requested modelName from the request body
    const { messages, modelName: requestedModelName } = await request.json();

    // Validate if modelName was provided
    if (!requestedModelName) {
      return NextResponse.json({ error: "modelName is required in the request body" }, { status: 400 });
    }

    const aiModels = {
      "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free": {
        baseUrl: "https://api.together.xyz/v1",
        apiKey: process.env.TOGETHER_API_KEY
      }
    };

    // Select the configuration based on the requested model name
    const selectedModelConfig = aiModels[requestedModelName as keyof typeof aiModels];

    // Validate if the requested model configuration exists
    if (!selectedModelConfig) {
      return NextResponse.json({ error: `Model '${requestedModelName}' not found or configured.` }, { status: 400 });
    }

    // Use the selected configuration
    const openai = new OpenAI({
      baseURL: selectedModelConfig.baseUrl,
      apiKey: selectedModelConfig.apiKey,
    });

    const tools: OpenAI.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "switch_chain",
          description: "Switch between Ethereum blockchains. Default is baseSepolia.",
          parameters: {
            type: "object",
            properties: {
              chain: {
                type: "string",
                description: "The chain to switch to: base or baseSepolia",
                enum: ["base", "baseSepolia"],
                default: "baseSepolia",
              },
            },
            required: ["chain"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "current_chain",
          description: "Get the current active blockchain chain.",
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
          name: "check_address",
          description: "Get the connected wallet address.",
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
          name: "get_coin_top_gainers",
          description: "Get the top gaining coins on zora coins. Optional pagination parameter next_page.",
          parameters: {
            type: "object",
            properties: {
              next_page: {
                type: "string",
                description: "Optional pagination token for the next page.",
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
          name: "get_coin_comment",
          description: "Get comments for a single coin by address. Optionally specify chain (base or baseSepolia, default is base) and next_page for pagination.",
          parameters: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description: "Coin contract address.",
              },
              chain: {
                type: "string",
                enum: ["base", "baseSepolia"],
                description: "Chain to query. Optional, defaults to base.",
              },
              next_page: {
                type: "string",
                description: "Optional pagination token for the next page.",
              },
            },
            required: ["address"],
            additionalProperties: false,
          },
        },
      },
    ];
    const systemMessage = {
      role: "system",
      content: `This chatbot is intended solely for interacting with the Base Ethereum and Base Sepolia networks.
Available tool calls:
  - switch_chain: Switch between Ethereum blockchains. Default is baseSepolia.
  - current_chain: Get the current active blockchain chain.
  - check_address: Get the connected wallet address.
  - check_balance: Get the balance of the connected wallet or specified token.
  - get_coin_top_gainers: Get the top gaining coins on Base networks. Optional pagination parameter next_page.
  - check_coin: Get details for a single coin by address. Optionally specify chainId (base or baseSepolia, default is base).
  - get_coin_comment: Get comments for a single coin by address. Optionally specify chain (base or baseSepolia, default is base) and next_page for pagination.

If a question falls outside these tools, respond "I cannot answer that question. Available tool calls: switch_chain, current_chain, check_address, check_balance, get_coin_top_gainers, check_coin, get_coin_comment"`,
    };
    const payloadMessages = [systemMessage, ...messages];
    const response = await openai.chat.completions.create({
      model: requestedModelName, // Use the requested model name
      messages: payloadMessages,
      tools,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("No message choices returned from AI");
    }

    const message = response.choices[0].message;
    const content = message.content;
    const tool_calls = message.tool_calls;
    return new Response(JSON.stringify({ content, tool_calls }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}