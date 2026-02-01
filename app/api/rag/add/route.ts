// /api/rag/add/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
    runtime: 'edge',
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, chat_id, user_id } = body;

        const backendUrl = process.env.RAG_API_URL;
        if (!backendUrl) {
            return NextResponse.json({ error: 'RAG_API_URL not configured' }, { status: 500 });
        }

        const params = new URLSearchParams();
        if (text) params.append('text', text);
        if (chat_id) params.append('chat_id', chat_id);
        if (user_id) params.append('user_id', user_id);

        const response = await fetch(`${backendUrl}/add?${params.toString()}`, {
            method: 'POST',
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[RAG/add] Backend error:', response.status, errorText);
            return NextResponse.json(
                { error: 'Failed to add document', detail: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[RAG/add] Fetch failed:', error.message);
        return NextResponse.json(
            { error: 'Failed to process document', detail: error.message },
            { status: 500 }
        );
    }
}