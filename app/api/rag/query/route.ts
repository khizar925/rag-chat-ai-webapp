// api/rag/query/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
    runtime: 'edge', // Edge runtime supports streaming better than serverless
};

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        const user_id = searchParams.get('user_id');
        const chat_id = searchParams.get('chat_id');

        const backendUrl = process.env.RAG_API_URL;
        if (!backendUrl) {
            console.error('[RAG] RAG_API_URL is not set');
            return NextResponse.json({ error: 'RAG_API_URL not configured' }, { status: 500 });
        }

        const backendParams = new URLSearchParams();
        if (q) backendParams.append('q', q);
        if (user_id) backendParams.append('user_id', user_id);
        if (chat_id) backendParams.append('chat_id', chat_id);

        const fullUrl = `${backendUrl}/query?${backendParams.toString()}`;
        console.log('[RAG] Fetching:', fullUrl);

        const response = await fetch(fullUrl, {
            method: 'POST',
            signal: AbortSignal.timeout(60000), // 60 second timeout
        });

        console.log('[RAG] Backend status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[RAG] Backend error:', response.status, errorText);
            return NextResponse.json(
                { error: `Backend error: ${response.status}`, detail: errorText },
                { status: response.status }
            );
        }

        // Stream the response body directly back to the client
        return new NextResponse(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        });

    } catch (error: any) {
        console.error('[RAG] Fetch failed:', error.message);
        return NextResponse.json(
            { error: 'Failed to query RAG backend', detail: error.message },
            { status: 500 }
        );
    }
}