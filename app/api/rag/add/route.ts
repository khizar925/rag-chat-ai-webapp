import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, chat_id, user_id } = body;

        const backendUrl = process.env.RAG_API_URL;
        if (!backendUrl) {
            return NextResponse.json({ error: 'RAG_API_URL not configured' }, { status: 500 });
        }

        // Forward to Python backend as query parameters to match the backend signature.
        const response = await axios.post(`${backendUrl}/add`, null, {
            params: {
                text,
                chat_id,
                user_id
            }
        });

        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('Error forwarding to RAG backend:', error.message);
        return NextResponse.json(
            { error: 'Failed to process document' },
            { status: error.response?.status || 500 }
        );
    }
}
