import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // 1. Define the protected routes logic
    // We allow public access to:
    // - / (Landing Page)
    // - /login (Login Page)
    // - /auth/* (Auth endpoints)
    // - /_next/* (Next.js internals)
    // - /favicon.ico, images, etc. (handled by matcher in src/middleware.ts, but good to be safe)

    const path = request.nextUrl.pathname;
    const isPublic =
        path === '/' ||
        path.startsWith('/login') ||
        path.startsWith('/auth') ||
        path.startsWith('/_next') ||
        path.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/);

    if (isPublic) {
        return NextResponse.next();
    }

    // 2. Check for Supabase session cookies
    // We do NOT use createServerClient or getUser() here to avoid:
    // - Infinite refresh loops
    // - "Invalid Refresh Token" crashes
    // - Unnecessary latency on every request

    // Attempt to derive the cookie name from the URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let projectRef = '';
    if (supabaseUrl) {
        try {
            const url = new URL(supabaseUrl);
            // standardized supabase url is https://<project-ref>.supabase.co
            projectRef = url.hostname.split('.')[0];
        } catch (e) {
            // fallback generic
        }
    }

    // Common Supabase cookie patterns
    const cookieName = `sb-${projectRef}-auth-token`;

    // Check for session cookies (including chunked ones like ...-token.0)
    const allCookies = request.cookies.getAll();
    const hasSessionCookie = allCookies.some(c =>
        c.name.startsWith(cookieName) ||
        c.name.startsWith('sb-access-token') ||
        c.name.startsWith('sb-refresh-token')
    );

    // 3. Redirect if no session found on protected route
    if (!hasSessionCookie) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', path); // Useful for redirecting back after login
        return NextResponse.redirect(url);
    }

    // 4. Session cookie exists -> Allow request to proceed
    // Verification of the token will happen in Server Components / API routes via getUser()
    return NextResponse.next();
}
