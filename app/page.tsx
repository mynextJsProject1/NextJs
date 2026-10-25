
import { createClient } from "../lib/supabase/server";

export default async function Home() {
  let message = "Supabase connected successfully!";

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("connection_test")
      .select("*")
      .limit(1);

    if (error) {
      message = "Supabase response: " + error.message;
    }
  } catch {
    message = "Supabase connection failed.";
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold">
        Next.js + Supabase
      </h1>
      <p className="mt-4 break-words">{message}</p>
    </main>
  );
}
