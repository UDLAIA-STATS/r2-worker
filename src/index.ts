import { AwsClient } from 'aws4fetch';

export interface Env {
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET: string;
}

export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      const { filename } = await request.json();
      
      if (!filename || typeof filename !== "string") {
        return new Response("Missing video name", { status: 400 });
      }

      const bucket = env.R2_BUCKET;
      const accountId = env.R2_ACCOUNT_ID;

      // Tomamos extensión y nombre real sin quemar nada
      const originalName = filename;
	  const regex = /[^a-zA-Z0-9.\-_]/g;
      let key = `${crypto.randomUUID()}-${originalName}`.replace(regex, "_");
      if (key.length > 100) {
        const extension = originalName.includes(".")
          ? originalName.substring(originalName.lastIndexOf("."))
          : "";
        key = key.substring(0, 100 - extension.length) + extension;
      }

      const client = new AwsClient({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      });
      const url = new URL(
        `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`
      )

      // === Firmamos URL===
      // Añadimos expiración de 2 horas
      url.searchParams.set("X-Amz-Expires", "7200");

      const signedUpload = await client.sign(
        new Request(url, { method: "PUT" }),
        { 
          aws: { signQuery: true }
        },
      );

      

      return Response.json({
        ok: true,
        objectKey: key,
        uploadUrl: signedUpload.url
      });
    } catch (error) {
      return Response.json(
        { ok: false, error: (error as Error).message },
        { status: 500 }
      );
    }
  }
};
