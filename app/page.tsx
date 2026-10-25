
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between px-6 py-5 md:px-16">
        <h1 className="text-2xl font-bold text-cyan-400">
          NextSpace
        </h1>
        <a
          href="#features"
          className="rounded-full border border-slate-600 px-5 py-2"
        >
          Explore
        </a>
      </nav>

      <section className="flex min-h-[75vh] flex-col items-center justify-center px-6 text-center">
        <p className="mb-5 rounded-full border border-cyan-500/40 px-4 py-2 text-sm text-cyan-300">
          Welcome to the future
        </p>

        <h2 className="max-w-3xl text-5xl font-extrabold leading-tight md:text-7xl">
          Build Your
          <span className="text-cyan-400"> Next Idea.</span>
        </h2>

        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
          A new digital experience starts here.
          Discover what you can create with NextSpace.
        </p>

        <a
          href="#features"
          className="mt-8 rounded-full bg-cyan-400 px-8 py-4 font-bold text-slate-950 transition hover:bg-cyan-300"
        >
          Get Started →
        </a>
      </section>

      <section
        id="features"
        className="grid gap-5 px-6 pb-20 md:grid-cols-3 md:px-16"
      >
        {[
          {
            title: "⚡ Fast",
            text: "A modern experience built for speed.",
          },
          {
            title: "🎨 Modern",
            text: "Clean design that looks great on mobile.",
          },
          {
            title: "🔒 Reliable",
            text: "Ready to grow with your next project.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-7"
          >
            <h3 className="text-xl font-bold">{item.title}</h3>
            <p className="mt-3 leading-7 text-slate-400">
              {item.text}
            </p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
        © 2026 NextSpace. All rights reserved.
      </footer>
    </main>
  );
}
