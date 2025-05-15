import OpenAI from "openai";
import { NextResponse } from "next/server"; // Import NextResponse for error handling
import { systemMessage } from "@/lib/chat-tools";

export async function POST(request: Request) {
  try {
    // Extract messages and the requested modelName from the request body
    const { messages } = await request.json();

   

    // Use the selected configuration
    const openai = new OpenAI({
      baseURL: "https://llama70b.gaia.domains/v1",
      apiKey: process.env.GAIA_API_KEY,
    });

    const payloadMessages = [systemMessage, ...messages];
    const response = await openai.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", // Use the requested model name
      messages: payloadMessages,
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