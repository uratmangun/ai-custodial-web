import OpenAI from "openai";

export async function POST(request: Request) {
  const { base64Image } = await request.json();
  
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  
  const response = await openai.chat.completions.create({
    model: "google/gemma-3-27b-it:free",
    messages: [
      {
        role: "system",
        content: "You are a ERC-20 token creator only response in json format in the following format: {name: string, description: string, symbol: string}",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Create a token based on this image, i want you to describe the image as a fighter robot making it unique" },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 500,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "description",
        strict: true,
        schema: {
          type: "object",
          properties: {
            name: {
            "type": "string",
            "description": "Name of the token"
          },
          "description": {
            "type": "string",
            "description": "Description of the token"
          },
          "symbol": {
            "type": "string",
            "description": "Symbol of the token"
          }
        },
        "required": ["name", "description", "symbol"],
        "additionalProperties": false
      }
    }
  }
  });

  return new Response(JSON.stringify(response.choices[0].message.content), {
    headers: { 'Content-Type': 'application/json' }
  });
}