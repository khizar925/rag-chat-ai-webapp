import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        const user_id = searchParams.get('user_id');
        const chat_id = searchParams.get('chat_id');

        const backendUrl = process.env.RAG_API_URL;
        if (!backendUrl) {
            return NextResponse.json({ error: 'RAG_API_URL not configured' }, { status: 500 });
        }

        // Construct the URL with query parameters for the backend
        const backendParams = new URLSearchParams();
        if (q) backendParams.append('q', q);
        if (user_id) backendParams.append('user_id', user_id);
        if (chat_id) backendParams.append('chat_id', chat_id);

        const response = await fetch(`${backendUrl}/query?${backendParams.toString()}`, {
            method: 'POST',
            // Forward headers if necessary, or just minimal ones
        });

        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        // Return the stream directly
        return new NextResponse(response.body, {
            status: response.status,
            headers: {
                'Content-Type': 'text/plain',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('Error forwarding to RAG backend:', error);
        return NextResponse.json(
            { error: 'Failed to query RAG backend' },
            { status: 500 }
        );
    }
}
