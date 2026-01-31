//api/addChat

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chatId, userId, title} = body;
        
        
    }
    catch (error) {
        console.error("Error : ", error);
    }
}