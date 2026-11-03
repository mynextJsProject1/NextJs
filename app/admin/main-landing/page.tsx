/* app/admin/main-landing/page.tsx */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function AdminMainLandingPage() {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<any[]>([]);
  
  // Form States
  const [sectionType, setSectionType] = useState("recommended");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [routePath, setRoutePath] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const loadData = async () => {
    const { data } = await supabase.from("landing_page_items").select("*").order("sort_order");
    if (data) setItems(data);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoute = routePath.replace(/^\//, ""); 
    
    await supabase.from("landing_page_items").insert({
      section_type: sectionType,
      title,
      subtitle,
      image_url: imageUrl,
      route_path: cleanRoute,
      sort_order: Number(sortOrder)
    });
    
    setTitle(""); setSubtitle(""); setImageUrl(""); setRoutePath(""); setSortOrder("0");
    void loadData();
    alert("Item Added Successfully!");
  };

  const deleteItem = async (id: string) => {
    if(confirm("Delete this item?")) {
      await supabase.from("landing_page_items").delete().eq("id", id);
      void loadData();
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff", backgroundColor: "#18221E", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>Main Landing Manager</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* অ্যাড ফর্ম */}
        <div style={{ background: "#1B2A23", padding: "16px", borderRadius: "8px", border: "1px solid #263C32" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "#00E701" }}>Add New Card</h2>
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            
            <select value={sectionType} onChange={e => setSectionType(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }}>
              <option value="recommended">Recommended Section</option>
              <option value="category">Categories Section</option>
              <option value="trending">Trending Section (Future)</option>
            </select>

            <input required placeholder="Title (e.g. Watah Master)" value={title} onChange={e => setTitle(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input placeholder="Subtitle (e.g. Provider Name - Optional)" value={subtitle} onChange={e => setSubtitle(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required placeholder="Image URL (e.g. https://...)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required placeholder="Route (e.g. original/limbo)" value={routePath} onChange={e => setRoutePath(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <input required type="number" placeholder="Order" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #263C32", background: "#121816", color: "#fff" }} />
            
            <button type="submit" style={{ padding: "10px", background: "#00E701", color: "#000", fontWeight: "bold", border: "none", borderRadius: "4px", marginTop: "10px" }}>Add Item</button>
          </form>
        </div>

        {/* লিস্ট */}
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>Existing Items</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map(item => (
              <div key={item.id} style={{ background: "#1B2A23", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #263C32" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", background: "#121816", padding: "2px 6px", borderRadius: "4px", color: "#00E701", textTransform: "uppercase" }}>{item.section_type}</span>
                  <h3 style={{ margin: "4px 0", fontSize: "1rem" }}>{item.title}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#A0ADB0" }}>Route: /{item.route_path} | Order: {item.sort_order}</p>
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
