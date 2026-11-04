/* app/admin/suggested-games/page.tsx */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";

type SuggestedGame = {
  id: string;
  game_name: string;
  game_image: string;
  game_link: string;
  border_color: string;
  ribbon_color: string;
  ribbon_text: string;
  sort_order: number;
  show_border: boolean;
  show_ribbon: boolean;
  show_title: boolean;
};

export default function AdminSuggestedGamesPage() {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<SuggestedGame[]>([]);
  
  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gameName, setGameName] = useState("");
  const [gameImage, setGameImage] = useState("");
  const [gameLink, setGameLink] = useState("");
  const [borderColor, setBorderColor] = useState("#00E701");
  const [showBorder, setShowBorder] = useState(true);
  const [ribbonColor, setRibbonColor] = useState("#00E701");
  const [ribbonText, setRibbonText] = useState("SHUFFLE");
  const [showRibbon, setShowRibbon] = useState(true);
  const [showTitle, setShowTitle] = useState(false); // ✅ নতুন স্টেট
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
    
    const payload = {
      game_name: gameName,
      game_image: gameImage,
      game_link: cleanLink,
      border_color: borderColor,
      show_border: showBorder,
      ribbon_color: ribbonColor,
      show_ribbon: showRibbon,
      ribbon_text: ribbonText,
      show_title: showTitle,
      sort_order: Number(sortOrder)
    };

    if (editingId) {
      await supabase.from("suggested_game").update(payload).eq("id", editingId);
      alert("Game Updated Successfully!");
    } else {
      await supabase.from("suggested_game").insert(payload);
      alert("Game Added Successfully!");
    }
    
    resetForm();
    void loadData();
  };

  const resetForm = () => {
    setEditingId(null);
    setGameName(""); setGameImage(""); setGameLink(""); setSortOrder("0");
    setBorderColor("#00E701"); setShowBorder(true);
    setRibbonColor("#00E701"); setRibbonText("SHUFFLE"); setShowRibbon(true);
    setShowTitle(false); // ✅ রিসেট
  };

  const handleEditClick = (item: SuggestedGame) => {
    setEditingId(item.id);
    setGameName(item.game_name);
    setGameImage(item.game_image);
    setGameLink(item.game_link);
    setBorderColor(item.border_color);
    setShowBorder(item.show_border !== false); 
    setRibbonColor(item.ribbon_color);
    setRibbonText(item.ribbon_text);
    setShowRibbon(item.show_ribbon !== false);
    setShowTitle(item.show_title === true); // ✅ এডিট
    setSortOrder(item.sort_order.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteItem = async (id: string) => {
    if(confirm("Delete this suggested game?")) {
      await supabase.from("suggested_game").delete().eq("id", id);
      void loadData();
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff", backgroundColor: "#18221E", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>
        {editingId ? "Edit Suggested Game" : "Suggested Games Manager"}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        <div style={{ background: "#1B2A23", padding: "16px", borderRadius: "8px", border: "1px solid #263C32" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0, color: "#00E701" }}>{editingId ? "Update Game" : "Add New Game"}</h2>
            {editingId && (
              <button onClick={resetForm} style={{ background: "transparent", color: "#ff4d4d", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Cancel Edit</button>
            )}
          </div>

          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            
            <input required placeholder="Game Name (e.g. Mines)" value={gameName} onChange={e => setGameName(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required placeholder="Image URL" value={gameImage} onChange={e => setGameImage(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required placeholder="Route (e.g. original/mines)" value={gameLink} onChange={e => setGameLink(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />

            {/* Title Settings */}
            <div style={{ background: "#121816", padding: "10px", borderRadius: "6px", border: "1px solid #263C32" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "13px", color: "#A0ADB0" }}>Show Title / Game Name</label>
                <input type="checkbox" checked={showTitle} onChange={e => setShowTitle(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: "#00E701" }} />
              </div>
            </div>

            {/* Border Settings */}
            <div style={{ background: "#121816", padding: "10px", borderRadius: "6px", border: "1px solid #263C32" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "13px", color: "#A0ADB0" }}>Show Border</label>
                <input type="checkbox" checked={showBorder} onChange={e => setShowBorder(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: "#00E701" }} />
              </div>
              {showBorder && (
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} style={{ width: "40px", height: "35px", padding: 0, border: "none", borderRadius: "4px" }} />
                  <input type="text" placeholder="#HexCode" value={borderColor} onChange={e => setBorderColor(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#1B2A23", color: "#fff" }} />
                </div>
              )}
            </div>

            {/* Ribbon Settings */}
            <div style={{ background: "#121816", padding: "10px", borderRadius: "6px", border: "1px solid #263C32" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "13px", color: "#A0ADB0" }}>Show Ribbon</label>
                <input type="checkbox" checked={showRibbon} onChange={e => setShowRibbon(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: "#00E701" }} />
              </div>
              {showRibbon && (
                <>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                    <input type="color" value={ribbonColor} onChange={e => setRibbonColor(e.target.value)} style={{ width: "40px", height: "35px", padding: 0, border: "none", borderRadius: "4px" }} />
                    <input type="text" placeholder="#HexCode" value={ribbonColor} onChange={e => setRibbonColor(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#1B2A23", color: "#fff" }} />
                  </div>
                  <input placeholder="Ribbon Text (e.g. SHUFFLE)" value={ribbonText} onChange={e => setRibbonText(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#1B2A23", color: "#fff", boxSizing: "border-box" }} />
                </>
              )}
            </div>

            <input required type="number" placeholder="Order" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <button type="submit" style={{ padding: "10px", background: "#00E701", color: "#000", fontWeight: "bold", border: "none", borderRadius: "4px", marginTop: "10px" }}>
              {editingId ? "Update Game" : "Add Game"}
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>Existing Suggested Games</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map(item => (
              <div key={item.id} style={{ background: "#1B2A23", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #263C32" }}>
                <div>
                  <h3 style={{ margin: "4px 0", fontSize: "1rem" }}>{item.game_name}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#A0ADB0" }}>Route: /{item.game_link} | Order: {item.sort_order}</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleEditClick(item)} style={{ background: "#00E701", color: "#000", border: "none", padding: "6px 12px", borderRadius: "4px", fontWeight: "bold" }}>Edit</button>
                  <button onClick={() => deleteItem(item.id)} style={{ background: "#ff4d4d", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
