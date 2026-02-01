import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chat_id, role, content } = body;

        if (!chat_id || !role || !content) {
            return NextResponse.json(
                { error: 'Missing required fields: chat_id, role, content' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('messages')
            .insert({ chat_id, role, content })
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
