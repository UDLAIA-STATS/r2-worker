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

      const formData = await request.formData();
      const fileName = formData.get("name");

      if (!fileName || typeof fileName !== "string") {
        return new Response("Missing video name", { status: 400 });
      }

      const bucket = env.R2_BUCKET;
      const accountId = env.R2_ACCOUNT_ID;

      // Tomamos extensión y nombre real sin quemar nada
      const originalName = fileName;
      const key = `${crypto.randomUUID()}-${originalName}`;

      const client = new AwsClient({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      });

      // === Firmamos URL de subida (PUT) ===
      const putUrl = new URL(
        `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`
      );
      putUrl.searchParams.set("X-Amz-Expires", "3600");

      const signedUpload = await client.sign(
        new Request(putUrl, { method: "PUT" }),
        { aws: { signQuery: true } }
      );

      // === Firmamos URL de descarga (GET) ===
      const getUrl = new URL(
        `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`
      );
      getUrl.searchParams.set("X-Amz-Expires", "3600");

      const signedDownload = await client.sign(
        new Request(getUrl, { method: "GET" }),
        { aws: { signQuery: true } }
      );

      return Response.json({
        ok: true,
        objectKey: key,
        uploadUrl: signedUpload.url,
        downloadUrl: signedDownload.url
      });
    } catch (error) {
      return Response.json(
        { ok: false, error: (error as Error).message },
        { status: 500 }
      );
    }
  }
};
