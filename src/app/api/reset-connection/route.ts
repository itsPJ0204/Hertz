import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = await createClient();
    const userA = "984a2a19-6330-4f7c-8439-122b414df2fb";
    const userB = "ccebc7b2-5855-4aae-9ba2-f0dd0a14f445";

    const { error } = await supabase
        .from('connections')
        .delete()
        .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`);

    return NextResponse.json({ success: !error, error });
}
