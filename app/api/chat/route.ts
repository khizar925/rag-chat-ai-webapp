//api/chat

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new Response("Unauthorized", { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('chats')
            .select('title')
            .eq("user_id",userId);

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