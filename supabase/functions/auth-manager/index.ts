
import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_URL = Deno.env.get("PROJECT_URL")!;
const SERVICE_KEY = Deno.env.get("PROJECT_ANON_KEY")!;
const ANON_KEY = Deno.env.get("PROJECT_ANON_KEY")!;

const admin = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const authClient = createClient(PROJECT_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeMobile(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("880")) {
    digits = "0" + digits.slice(3);
  }

  return digits;
}

function makeGameId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "NS" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function internalEmail(mobile: string): string {
  return `user-${mobile}@login.nextspace.invalid`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return reply({ error: "Method not allowed" }, 405);
  }

  if (!PROJECT_URL || !SERVICE_KEY || !ANON_KEY) {
    return reply({ error: "Server configuration is incomplete" }, 500);
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "signup") {
      const fullName =
        typeof body.full_name === "string" ? body.full_name.trim() : "";
      const mobile =
        typeof body.mobile === "string" ? normalizeMobile(body.mobile) : "";
      const password =
        typeof body.password === "string" ? body.password : "";
      const confirmPassword =
        typeof body.confirm_password === "string"
          ? body.confirm_password
          : "";

      if (
        fullName.length < 2 ||
        fullName.length > 100 ||
        !/^01[3-9]\d{8}$/.test(mobile) ||
        password.length < 8 ||
        password.length > 128 ||
        password !== confirmPassword
      ) {
        return reply({
          error: "Check your name, Bangladesh mobile number and password.",
        }, 400);
      }

      // Read the client IP from the edge proxy headers.
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = req.headers.get("cf-connecting-ip") ||
        forwarded?.split(",")[0]?.trim();

      if (!ip) {
        return reply({ error: "Could not verify connection IP." }, 400);
      }

      const mobileKey = await hash(mobile);
      const ipKey = await hash(ip);

      const { data: recent, error: limitError } = await admin
        .from("registration_limits")
        .select("id")
        .or(`mobile_key.eq.${mobileKey},ip_key.eq.${ipKey}`)
        .gte(
          "created_at",
          new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        )
        .limit(1);

      if (limitError) {
        console.error("Registration limit check failed", limitError);
        return reply({ error: "Could not verify registration limit." }, 500);
      }

      if (recent && recent.length > 0) {
        return reply({
          error: "Only one account per mobile number or IP per hour is allowed.",
        }, 429);
      }

      const { data: limitRow, error: insertLimitError } = await admin
        .from("registration_limits")
        .insert({ mobile_key: mobileKey, ip_key: ipKey })
        .select("id")
        .single();

      if (insertLimitError) {
        console.error("Registration limit insert failed", insertLimitError);
        return reply({ error: "Could not reserve registration attempt." }, 500);
      }

      const email = internalEmail(mobile);

      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (createError || !created.user) {
        await admin
          .from("registration_limits")
          .delete()
          .eq("id", limitRow.id);

        return reply({
          error: "Account could not be created. Check the details or try later.",
        }, 400);
      }

      let profileCreated = false;
      let gameId = "";

      try {
        for (let attempt = 0; attempt < 5; attempt++) {
          gameId = makeGameId();

          const { error: profileError } = await admin
            .from("profiles")
            .insert({
              id: created.user.id,
              full_name: fullName,
              mobile,
              game_id: gameId,
              balance: 0,
            });

          if (!profileError) {
            profileCreated = true;
            break;
          }

          if (
            !profileError.message.toLowerCase().includes("duplicate") &&
            !profileError.code?.startsWith("23")
          ) {
            throw profileError;
          }
        }

        if (!profileCreated) {
          throw new Error("Could not allocate a unique Game ID.");
        }
      } catch (error) {
        console.error("Profile creation failed", error);

        await admin.auth.admin.deleteUser(created.user.id);
        await admin
          .from("registration_limits")
          .delete()
          .eq("id", limitRow.id);

        return reply({ error: "Profile setup failed. Please try again." }, 500);
      }

      const { data: login, error: loginError } =
        await authClient.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError || !login.session) {
        return reply({
          error: "Account created, but automatic login failed. Please log in.",
          game_id: gameId,
        }, 201);
      }

      return reply({
        message: "Account created successfully.",
        game_id: gameId,
        balance: 0,
        session: login.session,
        user: {
          id: created.user.id,
          full_name: fullName,
          mobile,
          game_id: gameId,
          balance: 0,
        },
      }, 201);
    }

    if (action === "login") {
      const identifier =
        typeof body.identifier === "string" ? body.identifier.trim() : "";
      const password =
        typeof body.password === "string" ? body.password : "";

      if (!identifier || !password || password.length > 128) {
        return reply({ error: "Enter your login ID and password." }, 400);
      }

      let mobile: string;

      if (/^NS[A-HJ-NP-Z2-9]{10}$/i.test(identifier)) {
        const { data: profile, error } = await admin
          .from("profiles")
          .select("mobile")
          .eq("game_id", identifier.toUpperCase())
          .maybeSingle();

        if (error || !profile) {
          return reply({ error: "Invalid login details." }, 401);
        }

        mobile = profile.mobile;
      } else {
        mobile = normalizeMobile(identifier);

        if (!/^01[3-9]\d{8}$/.test(mobile)) {
          return reply({ error: "Invalid login details." }, 401);
        }
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id, full_name, mobile, game_id, balance")
        .eq("mobile", mobile)
        .maybeSingle();

      if (profileError || !profile) {
        return reply({ error: "Invalid login details." }, 401);
      }

      const { data: login, error: loginError } =
        await authClient.auth.signInWithPassword({
          email: internalEmail(mobile),
          password,
        });

      if (loginError || !login.session) {
        return reply({ error: "Invalid login details." }, 401);
      }

      return reply({
        message: "Login successful.",
        session: login.session,
        user: profile,
      });
    }

    return reply({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("Auth function error", error);
    return reply({ error: "Unexpected server error." }, 500);
  }
});
