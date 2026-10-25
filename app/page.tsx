
import { createClient } from "../lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("connection_test")
    .select("id, message")
    .limit(5);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold">
        Next.js + Supabase
      </h1>

      {error ? (
        <p className="mt-4 break-words">
          Error: {error.message}
        </p>
      ) : (
        <div className="mt-4">
          <p>Supabase connected successfully!</p>
          {data?.map((item) => (
            <p key={item.id}>{item.message}</p>
          ))}
        </div>
      )}
    </main>
  );
}
