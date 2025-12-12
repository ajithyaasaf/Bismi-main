import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const envVars = {
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? '✅ SET' : '❌ MISSING',
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? '✅ SET' : '❌ MISSING',
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? '✅ SET (length: ' + process.env.FIREBASE_PRIVATE_KEY?.length + ')' : '❌ MISSING',
        FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? '✅ SET' : '❌ MISSING',

        // Show first 50 chars of private key to verify format
        PRIVATE_KEY_START: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50) || 'N/A',

        // Check for newlines
        HAS_NEWLINES: process.env.FIREBASE_PRIVATE_KEY?.includes('\n') ? '✅ YES' : '❌ NO',
        HAS_ESCAPED_NEWLINES: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n') ? '⚠️ YES (BAD!)' : '✅ NO (GOOD)',
    };

    res.json({
        success: true,
        environment: 'Vercel Serverless',
        timestamp: new Date().toISOString(),
        envVars
    });
}
