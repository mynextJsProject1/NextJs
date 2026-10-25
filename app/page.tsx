
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  let message = "Supabase configuration is missing.";

  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      throw new Error("Supabase environment variables are missing.");
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("connection_test")
      .select("*")
      .limit(1);

    message = error
      ? `Supabase response: ${error.message}`
      : "Supabase connected successfully!";
  } catch (error) {
    message =
      error instanceof Error
        ? error.message
        : "Something went wrong.";
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold">
        Next.js + Supabase
      </h1>
      <p className="mt-4 break-words">
        {message}
      </p>
    </main>
  );
}
