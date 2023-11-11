const { promises: fs } = require('fs');

const BASE_PATH = './uploads';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const SUPPORTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif']);
const API_KEY = process.env.API_KEY || 'your-api-key'; // Set your API_KEY in the environment variables
const HOSTNAME = process.env.API_HOSTNAME || 'http://localhost:3000'; // Set your API_HOSTNAME in the environment variables

// Function to generate UUID for file names
function uuid() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
}

// Function to handle file uploads
async function handleFileUpload(req) {
    try {
        if (!req.headers.get('Authorization') || req.headers.get('Authorization') !== `Bearer ${API_KEY}`) {
            console.log('Unauthorized');
            return new Response('Unauthorized, missing Bearer API_KEY or incorrect value', {
                status: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        if (req.headers.get('Content-Length') > MAX_FILE_SIZE) {
            console.log('File too large');
            return new Response('File too large, max file size is 20MB', {
                status: 413,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        const formData = await req.formData();
        const file = formData.get('image');

        if (!file || !SUPPORTED_TYPES.has(file.type)) {
            console.log('Unsupported file type:', file.type);
            return new Response('Unsupported file type, must be png, jpg, jpeg, or gif', {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // newFilename is uuid + file extension
        const newFileName = `${uuid()}${file.name.substring(file.name.lastIndexOf('.'))}`;
        const filePath = `${BASE_PATH}/${newFileName}`;
        await Bun.write(filePath, new Uint8Array(await file.arrayBuffer()));

        console.log('File uploaded successfully:', newFileName);

        return new Response(
            JSON.stringify({
                url: `${HOSTNAME}/uploads/${newFileName}`,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            }
        );
    } catch (error) {
        console.log('error', error);
        return new Response('Something went wrong', { status: 500 });
    }
}

Bun.serve({
    port: process.env.PORT || 3000,
    async fetch(req) {
        // Handle file upload requests
        if (req.method === 'POST' && new URL(req.url).pathname === '/upload') {
            return handleFileUpload(req);
        }

        // Serve static files from /uploads
        if (req.method === 'GET' && new URL(req.url).pathname.startsWith('/uploads')) {
            const filePath = `.${new URL(req.url).pathname}`;

            const fileData = await fs.stat(filePath);

            if (!fileData) {
                return new Response(null, {
                    status: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                    },
                });
            }

            const file = Bun.file(filePath);
            return new Response(file, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }
    },
    error() {
        // Error handling logic
        return new Response(null, { status: 404 });
    },
});
