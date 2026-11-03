/* app/admin/suggested-games/page.tsx */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function AdminSuggestedGamesPage() {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<any[]>([]);
  
  // Form States
  const [gameName, setGameName] = useState("");
  const [gameImage, setGameImage] = useState("");
  const [gameLink, setGameLink] = useState("");
  const [borderColor, setBorderColor] = useState("#00E701");
  const [ribbonColor, setRibbonColor] = useState("#00E701");
  const [ribbonText, setRibbonText] = useState("SHUFFLE");
  const [sortOrder, setSortOrder] = useState("0");

  const loadData = async () => {
    const { data } = await supabase.from("suggested_game").select("*").order("sort_order");
    if (data) setItems(data);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLink = gameLink.replace(/^\//, ""); 
    
    await supabase.from("suggested_game").insert({
      game_name: gameName,
      game_image: gameImage,
      game_link: cleanLink,
      border_color: borderColor,
      ribbon_color: ribbonColor,
      ribbon_text: ribbonText,
      sort_order: Number(sortOrder)
    });
    
    setGameName(""); setGameImage(""); setGameLink(""); setSortOrder("0");
    void loadData();
    alert("Suggested Game Added Successfully!");
  };

  const deleteItem = async (id: string) => {
    if(confirm("Delete this suggested game?")) {
      await supabase.from("suggested_game").delete().eq("id", id);
      void loadData();
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff", backgroundColor: "#18221E", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>Suggested Games Manager</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* অ্যাড ফর্ম */}
        <div style={{ background: "#1B2A23", padding: "16px", borderRadius: "8px", border: "1px solid #263C32" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "#00E701" }}>Add New Game</h2>
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            
            <input required placeholder="Game Name (e.g. Mines)" value={gameName} onChange={e => setGameName(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required placeholder="Image URL" value={gameImage} onChange={e => setGameImage(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required placeholder="Route (e.g. original/mines)" value={gameLink} onChange={e => setGameLink(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", color: "#A0ADB0" }}>Border Color</label>
                <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} style={{ width: "100%", height: "40px", padding: "2px", background: "#121816", borderRadius: "4px", border: "1px solid #263C32" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", color: "#A0ADB0" }}>Ribbon Color</label>
                <input type="color" value={ribbonColor} onChange={e => setRibbonColor(e.target.value)} style={{ width: "100%", height: "40px", padding: "2px", background: "#121816", borderRadius: "4px", border: "1px solid #263C32" }} />
              </div>
            </div>

            <input placeholder="Ribbon Text (e.g. SHUFFLE)" value={ribbonText} onChange={e => setRibbonText(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />

            <input required type="number" placeholder="Order" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <button type="submit" style={{ padding: "10px", background: "#00E701", color: "#000", fontWeight: "bold", border: "none", borderRadius: "4px", marginTop: "10px" }}>Add Game</button>
          </form>
        </div>

        {/* লিস্ট */}
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>Existing Suggested Games</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map(item => (
              <div key={item.id} style={{ background: "#1B2A23", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #263C32" }}>
                <div>
                  <h3 style={{ margin: "4px 0", fontSize: "1rem" }}>{item.game_name}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#A0ADB0" }}>Route: /{item.game_link} | Order: {item.sort_order}</p>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: "#ff4d4d", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px" }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
