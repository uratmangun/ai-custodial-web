import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
  
    const openai = new OpenAI({
      baseURL: 'https://api.together.xyz/v1',
      apiKey: process.env.TOGETHER_API_KEY,
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

If a question falls outside these tools, respond "I cannot answer that question. Available tool calls: switch_chain, current_chain, check_address, check_balance, get_coin_top_gainers"`,
    };
    const payloadMessages = [systemMessage, ...messages];
    const response = await openai.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
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
    console.error(error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}