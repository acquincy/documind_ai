import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const model = "gemini-3.1-pro-preview"; // Good for reading and reasoning over PDFs

export type ChatMessage = {
  id: string;
  role: "user" | "model";
  text: string;
};

/**
 * Ask questions about the PDF with chat history
 */
export async function* askQuestionStream(
  base64Data: string,
  history: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const contents: Content[] = [];

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    const parts: any[] = [];
    
    // Attach the PDF only to the very first user message
    if (i === 0 && msg.role === "user") {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data,
        },
      });
    }
    
    parts.push({ text: msg.text });
    
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts,
    });
  }

  const responseStream = await ai.models.generateContentStream({
    model,
    contents,
  });

  for await (const chunk of responseStream) {
    const genChunk = chunk as GenerateContentResponse;
    if (genChunk.text) {
      yield genChunk.text;
    }
  }
}
