
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { error } = await supabase
    .from("connection_test")
    .select("*")
    .limit(1);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold">
        Next.js + Supabase
      </h1>

      <p className="mt-4">
        {error
          ? `Supabase response: ${error.message}`
          : "Supabase connected successfully!"}
      </p>
    </main>
  );
}
