// middleware.ts (প্রজেক্টের রুটে)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // অ্যাডমিন এবং লটারি-অ্যাডমিন প্যানেল প্রোটেকশন
  if (path.startsWith("/admin") || path.startsWith("/lottery-admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // ✅ admin এবং sub_admin উভয়েই ঢুকতে পারবে
    if (profile?.role !== "admin" && profile?.role !== "sub_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  // ✅ matcher-এ lottery-admin যোগ করা হলো
  matcher: ["/admin/:path*", "/lottery-admin/:path*"],
};
