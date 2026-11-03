/* app/admin/games/page.tsx */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function AdminGamesPage() {
  const [supabase] = useState(() => createClient());
  const [categories, setCategories] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  
  // ক্যাটাগরি ফর্মের জন্য
  const [catName, setCatName] = useState("");
  const [catOrder, setCatOrder] = useState("0");

  // গেম ফর্মের জন্য
  const [gameTitle, setGameTitle] = useState("");
  const [gameCategory, setGameCategory] = useState("");
  const [gameImage, setGameImage] = useState("");
  const [gameRoute, setGameRoute] = useState("");
  const [gameOrder, setGameOrder] = useState("0");

  const loadData = async () => {
    const { data: cats } = await supabase.from("game_categories").select("*").order("sort_order");
    const { data: gms } = await supabase.from("games").select("*").order("sort_order");
    if (cats) setCategories(cats);
    if (gms) setGames(gms);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("game_categories").insert({ name: catName, sort_order: Number(catOrder) });
    setCatName(""); setCatOrder("0");
    void loadData();
    alert("Category Added!");
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    // রাউটের শুরুতে স্ল্যাশ থাকলে তা সরিয়ে নেওয়া হচ্ছে
    const cleanRoute = gameRoute.replace(/^\//, ""); 
    
    await supabase.from("games").insert({
      title: gameTitle,
      category_id: gameCategory,
      image_url: gameImage,
      route_path: cleanRoute,
      sort_order: Number(gameOrder)
    });
    
    setGameTitle(""); setGameImage(""); setGameRoute(""); setGameOrder("0");
    void loadData();
    alert("Game Added!");
  };

  const deleteGame = async (id: string) => {
    if(confirm("Delete this game?")) {
      await supabase.from("games").delete().eq("id", id);
      void loadData();
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff", backgroundColor: "#18221E", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>Game Manager</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* ক্যাটাগরি যোগ করার ফর্ম */}
        <div style={{ background: "#1B2A23", padding: "16px", borderRadius: "8px", border: "1px solid #263C32" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "#00E701" }}>Add Category</h2>
          <form onSubmit={handleAddCategory} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input required placeholder="Category Name (e.g. Slots)" value={catName} onChange={e => setCatName(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff", flex: 1 }} />
            <input required type="number" placeholder="Order (e.g. 1)" value={catOrder} onChange={e => setCatOrder(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff", width: "100px" }} />
            <button type="submit" style={{ padding: "8px 16px", background: "#00E701", color: "#000", fontWeight: "bold", border: "none", borderRadius: "4px" }}>Add</button>
          </form>
        </div>

        {/* গেম যোগ করার ফর্ম */}
        <div style={{ background: "#1B2A23", padding: "16px", borderRadius: "8px", border: "1px solid #263C32" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "#00E701" }}>Add Game</h2>
          <form onSubmit={handleAddGame} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input required placeholder="Game Title (e.g. Lucky Slots)" value={gameTitle} onChange={e => setGameTitle(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <select required value={gameCategory} onChange={e => setGameCategory(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }}>
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <input required placeholder="Image URL or Path (e.g. /images/slots.jpg)" value={gameImage} onChange={e => setGameImage(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required placeholder="Route (e.g. original/limbo)" value={gameRoute} onChange={e => setGameRoute(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required type="number" placeholder="Order (e.g. 1)" value={gameOrder} onChange={e => setGameOrder(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <button type="submit" style={{ padding: "10px", background: "#00E701", color: "#000", fontWeight: "bold", border: "none", borderRadius: "4px", marginTop: "10px" }}>Add Game</button>
          </form>
        </div>

        {/* গেম লিস্ট */}
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>Existing Games</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {games.map(g => (
              <div key={g.id} style={{ background: "#1B2A23", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #263C32" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>{g.title}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#A0ADB0" }}>Route: /{g.route_path} | Order: {g.sort_order}</p>
                </div>
                <button onClick={() => deleteGame(g.id)} style={{ background: "#ff4d4d", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px" }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
