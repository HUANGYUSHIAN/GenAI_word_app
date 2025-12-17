import { NextResponse } from "next/server";

// GET - 檢查 OpenAI API key 是否存在
export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const hasKey = !!apiKey && apiKey.trim() !== "";
    
    return NextResponse.json({ hasKey });
  } catch (error: any) {
    return NextResponse.json({ hasKey: false });
  }
}

