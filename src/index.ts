import { AwsClient } from 'aws4fetch';

export interface Env {
	R2_ACCESS_TOKEN: string;
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
	S3_CLIENT_ACCOUNT_ENDPOINT: string;
	R2_ACCOUNT_ID: string;
	R2_BUCKET: string;
	R2_AUTH_SECRET: string;
	CATALOG_URI: string;
	WAREHOUSE: string;
}

export default {
	async fetch(request, env, ctx) {
		try {
			if (request.method !== 'POST') {
				return new Response('Method not allowed', { status: 405 });
			}

			const formData = await request.formData();
			const file = formData.get('video');

			if (!file) {
				return new Response('Missing video file', { status: 400 });
			}

			const bucketName = env.R2_BUCKET;
			const accountId = env.R2_ACCOUNT_ID;
			const accessKeyId = env.R2_ACCESS_KEY_ID;
			const secretAccessKey = env.R2_SECRET_ACCESS_KEY;

			const key = `videos/${crypto.randomUUID()}-${file.name}`;

			const client = new AwsClient({
				accessKeyId,
				secretAccessKey,
			});

			let putUrl = new URL(`https://${bucketName}.${accountId}.r2.cloudflarestorage.com`);

			putUrl.searchParams.set('X-Amz-Expires', '3600');

			const signedUpload = await client.sign(new Request(putUrl, { method: 'PUT' }), { aws: { signQuery: true } });

			// === 4. Generar URL privada firmada para descarga (GET) ===
			let getUrl = new URL(`https://${bucketName}.${accountId}.r2.cloudflarestorage.com`);

			getUrl.searchParams.set('X-Amz-Expires', '3600');

			const signedDownload = await client.sign(new Request(getUrl, { method: 'GET' }), { aws: { signQuery: true } });

			return Response.json({
				ok: true,
				uploadUrl: signedUpload.url,
				downloadUrl: signedDownload.url,
				objectKey: key,
			});
		} catch (error) {
			return Response.json(
				{
					ok: false,
					error: (error as Error).message,
				},
				{ status: 500 }
			);
		}
	},
} satisfies ExportedHandler;
