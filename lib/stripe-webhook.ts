// Helper pour parser le body du webhook Stripe
import { IncomingMessage } from "http";
import { Readable } from "stream";

export async function getRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    
    req.on("error", reject);
  });
}

