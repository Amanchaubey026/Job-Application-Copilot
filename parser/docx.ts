import mammoth from "mammoth";
import { parseFailedError } from "./errors";

export async function extractTextFromDocx(data: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: data });
    return (result.value ?? "").replace(/\r\n/g, "\n").trim();
  } catch (error) {
    throw parseFailedError(error);
  }
}
