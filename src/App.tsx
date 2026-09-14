const logo1 = "/logo.jpeg";
const logo2 = "/logo.jpeg";
const logoImg = "/logo.jpeg";
import React, { useState, useEffect, useMemo, useRef } from "react";
const logoImg = "/logo.jpeg";
import { ShoppingBag, Search, X, Plus, Edit2, Trash2, Check, AlertCircle, Image as ImageIcon, LogOut, Save, Eye, EyeOff } from "lucide-react";

// ---------- SAFE STORAGE ----------
function safeParseJSON<T>(str: string | null, fallback: T): T {
  try {
    if (!str) return fallback;
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function safeGetLS(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetLS(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    try {
      if (e?.name === "QuotaExceededError" || e?.code === 22 || e?.message?.includes("quota")) {
        // try to clear oldest
        localStorage.removeItem(key);
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
  }
}

// ---------- SUPABASE SAFE ----------
type CloudStatus = "local" | "cloud" | "checking";
function getEnvVar(name: string): string {
  try {
    // @ts-ignore
    const env = (import.meta as any)?.env;
    if (env && env[name]) return String(env[name]);
  } catch {}
  try {
    // @ts-ignore
    if (typeof process !== "undefined" && (process as any).env && (process as any).env[name]) {
      // @ts-ignore
      return String((process as any).env[name]);
    }
  } catch {}
  try {
    if (name === "VITE_SUPABASE_URL") return safeParseJSON(safeGetLS("zaya_supabase_url"), "") as any || (safeGetLS("zaya_supabase_url_raw") || "");
    if (name === "VITE_SUPABASE_ANON_KEY") return safeParseJSON(safeGetLS("zaya_supabase_key"), "") as any || (safeGetLS("zaya_supabase_key_raw") || "");
    // raw storage (string not json)
    if (name === "VITE_SUPABASE_URL") { const v = safeGetLS("zaya_supabase_url"); if(v){ try{return JSON.parse(v)}catch{return v} } }
    if (name === "VITE_SUPABASE_ANON_KEY") { const v = safeGetLS("zaya_supabase_key"); if(v){ try{return JSON.parse(v)}catch{return v} } }
  } catch {}
  return "";
}
function getRawLS(key:string): string {
  try {
    const v = localStorage.getItem(key);
    if (!v) return "";
    try { const parsed = JSON.parse(v); if (typeof parsed === 'string') return parsed; return v; } catch { return v; }
  } catch { return ""; }
}
function isValidSupabaseUrl(url: string): boolean {
  try {
    if (!url) return false;
    const u = url.trim();
    if (!u.startsWith("https://")) return false;
    if (u.includes("seuprojeto") || u.includes("placeholder") || u.includes("example.com") || u.length < 20) return false;
    const parsed = new URL(u);
    return parsed.hostname.includes("supabase.co") || parsed.hostname.length > 5;
  } catch { return false; }
}
async function getSupabase(): Promise<any | null> {
  try {
    const url = (getRawLS("zaya_supabase_url") || getEnvVar("VITE_SUPABASE_URL") || "").trim();
    const key = (getRawLS("zaya_supabase_key") || getEnvVar("VITE_SUPABASE_ANON_KEY") || "").trim();
    if (!url || !key) return null;
    if (!isValidSupabaseUrl(url)) return null;
    if (key.includes("placeholder") || key.length < 20) return null;
    try {
      const mod = await import("@supabase/supabase-js");
      if (!mod?.createClient) return null;
      const client = mod.createClient(url, key);
      return client;
    } catch {
      return null;
    }
  } catch { return null; }
}

// ---------- IMAGE COMPRESS FIX TELA PRETA ----------
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read fail"));
      reader.onload = () => {
        try {
          const img = new Image();
          img.onerror = () => reject(new Error("img load fail"));
          img.onload = () => {
            try {
              const max = 800;
              let w = img.width;
              let h = img.height;
              if (w > max || h > max) {
                const ratio = Math.min(max / w, max / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
              }
              const canvas = document.createElement("canvas");
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              if (!ctx) { reject(new Error("ctx fail")); return; }
              // FIX TELA PRETA: fill white background
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
              resolve(dataUrl);
            } catch (e) { reject(e); }
          };
          img.src = reader.result as string;
        } catch (e) { reject(e); }
      };
      reader.readAsDataURL(file);
    } catch (e) { reject(e); }
  });
}

// ---------- TYPES ----------
type ColorOpt = { id: string; name: string; hex: string; stock: number };
type SizeOpt = { id: string; name: string; stock: number };
type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  images: string[];
  colors: ColorOpt[];
  sizes: SizeOpt[];
};
type Category = { id: string; name: string; image?: string };
type Banner = { id: string; title: string; subtitle: string; desktopImage: string; mobileImage: string; };
type Order = { id: string; date: string; customer: string; whatsapp: string; cpf?: string; payment: string; items: { productId: string; name: string; price: number; qty: number; color?: string; size?: string }[]; total: number; };
type CartItem = { productId: string; name: string; price: number; qty: number; color?: ColorOpt; size?: SizeOpt; image?: string; };

// ---------- MOCK DATA ----------
const mockCategories: Category[] = [
  { id: "1", name: "Todos" },
  { id: "2", name: "Vestidos" },
  { id: "3", name: "Conjuntos" },
  { id: "4", name: "Blusas" },
  { id: "5", name: "Saias" },
];
const mockBanners: Banner[] = [
  {
    id: "b1",
    title: "Coleção Essencial",
    subtitle: "Leveza, sofisticação e atemporalidade em cada detalhe",
    desktopImage: "",
    mobileImage: "",
  }
];
const mockProducts: Product[] = [
  {
    id: "p1",
    name: "Vestido Longo Seda Champagne",
    price: 389.9,
    category: "Vestidos",
    description: "Vestido longo em seda premium com caimento fluido. Modelagem atemporal ZAYA.",
    images: [],
    colors: [
      { id: "c1", name: "Champagne", hex: "#D4BC8E", stock: 5 },
      { id: "c2", name: "Preto", hex: "#111111", stock: 2 },
      { id: "c3", name: "Areia", hex: "#E8DCC6", stock: 0 },
    ],
    sizes: [
      { id: "s1", name: "P", stock: 3 },
      { id: "s2", name: "M", stock: 5 },
      { id: "s3", name: "G", stock: 0 },
      { id: "s4", name: "GG", stock: 2 },
      { id: "s5", name: "TU", stock: 4 },
    ],
  },
  {
    id: "p2",
    name: "Conjunto Linho Cru",
    price: 429.0,
    category: "Conjuntos",
    description: "Conjunto em linho puro com blusa cropped e calça pantalona.",
    images: [],
    colors: [
      { id: "c1", name: "Cru", hex: "#F5EFE6", stock: 4 },
      { id: "c2", name: "Terracota", hex: "#C07A5A", stock: 3 },
    ],
    sizes: [
      { id: "s1", name: "P", stock: 2 },
      { id: "s2", name: "M", stock: 0 },
      { id: "s3", name: "G", stock: 6 },
      { id: "s4", name: "TU", stock: 3 },
    ],
  },
  {
    id: "p3",
    name: "Blusa Laço Ivory",
    price: 189.9,
    category: "Blusas",
    description: "Blusa em viscose com detalhe laço frontal e manga bufante.",
    images: [],
    colors: [
      { id: "c1", name: "Ivory", hex: "#F9F5F0", stock: 10 },
      { id: "c2", name: "Gold", hex: "#B89B6A", stock: 0 },
    ],
    sizes: [
      { id: "s1", name: "P", stock: 5 },
      { id: "s2", name: "M", stock: 5 },
      { id: "s3", name: "G", stock: 5 },
      { id: "s4", name: "PS", stock: 1 },
    ],
  },
  {
    id: "p4",
    name: "Saia Midi Plissada",
    price: 259.9,
    category: "Saias",
    description: "Saia midi plissada em tecido acetinado com cintura alta.",
    images: [],
    colors: [
      { id: "c1", name: "Dourado", hex: "#B89B6A", stock: 2 },
      { id: "c2", name: "Preto", hex: "#000", stock: 4 },
    ],
    sizes: [
      { id: "s1", name: "P", stock: 0 },
      { id: "s2", name: "M", stock: 3 },
      { id: "s3", name: "G", stock: 3 },
    ],
  },
];

// ---------- ERROR BOUNDARY ----------
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props:any){ super(props); this.state={hasError:false}; }
  static getDerivedStateFromError(){ return {hasError:true}; }
  componentDidCatch(e:any){ console.error("ZAYA error boundary", e); }
  render(){
    if(this.state.hasError){
      return (
        <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F9F5F0", fontFamily:"Inter, sans-serif", padding:20}}>
          <div style={{background:"white", padding:32, borderRadius:16, maxWidth:420, textAlign:"center", border:"1px solid #E8DCC6"}}>
            <h2 style={{fontFamily:"Cormorant Garamond, serif", fontSize:28, marginBottom:8}}>ZAYA STORE</h2>
            <p style={{color:"#666", marginBottom:16}}>Ocorreu um erro inesperado, mas a loja foi restaurada.</p>
            <button onClick={()=>{ try{localStorage.clear();}catch{} location.reload(); }} style={{background:"#B89B6A", color:"white", border:"none", padding:"10px 20px", borderRadius:999, cursor:"pointer"}}>Recarregar loja</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- MAIN APP ----------
function AppInner(){
  // core states always initialized with mocks - never undefined
  const [products, setProducts] = useState<Product[]>(() => [...mockProducts]);
  const [categories, setCategories] = useState<Category[]>(() => [...mockCategories]);
  const [banners, setBanners] = useState<Banner[]>(() => [...mockBanners]);
  const [orders, setOrders] = useState<Order[]>(() => []);
  const [cart, setCart] = useState<CartItem[]>(() => []);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("local");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("Vestidos");
  const [chipPulse, setChipPulse] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selColor, setSelColor] = useState<ColorOpt | null>(null);
  const [selSize, setSelSize] = useState<SizeOpt | null>(null);
  const [mainImgIdx, setMainImgIdx] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<"produtos"|"categorias"|"banners"|"pedidos"|"acesso"|"config">("produtos");
  const [adminCode, setAdminCode] = useState("1234");
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [storeName, setStoreName] = useState("ZAYA STORE");
  const [supabaseUrlInput, setSupabaseUrlInput] = useState("");
  const [supabaseKeyInput, setSupabaseKeyInput] = useState("");
  const [checkoutForm, setCheckoutForm] = useState({ nome:"", whatsapp:"", cpf:"", pagamento:"PIX" });
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [newColorDraft, setNewColorDraft] = useState<{name:string, hex:string, stock:number}>({name:"", hex:"#B89B6A", stock:5});
  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  // refs for file inputs
  const prodGalleryInputRef = useRef<HTMLInputElement>(null);
  const catImageInputRef = useRef<HTMLInputElement>(null);
  const bannerDesktopRef = useRef<HTMLInputElement>(null);
  const bannerMobileRef = useRef<HTMLInputElement>(null);

  // Load from localStorage safely - never throws
  useEffect(()=>{
    try {
      const p = safeParseJSON<Product[] | null>(safeGetLS("zaya_products"), null);
      if (p && Array.isArray(p) && p.length>0) setProducts(p);
      const c = safeParseJSON<Category[] | null>(safeGetLS("zaya_categories"), null);
      if (c && Array.isArray(c) && c.length>0) setCategories(c);
      const b = safeParseJSON<Banner[] | null>(safeGetLS("zaya_banners"), null);
      if (b && Array.isArray(b) && b.length>0) setBanners(b);
      const o = safeParseJSON<Order[] | null>(safeGetLS("zaya_orders"), null);
      if (o && Array.isArray(o)) setOrders(o);
      const cartLS = safeParseJSON<CartItem[] | null>(safeGetLS("zaya_cart"), null);
      if (cartLS && Array.isArray(cartLS)) setCart(cartLS);
      const code = getRawLS("zaya_admin_code") || safeParseJSON(safeGetLS("zaya_admin_code"), "1234") as any;
      if (code) setAdminCode(typeof code === 'string' ? code.replace(/"/g,'') : "1234");
      const sName = safeParseJSON(safeGetLS("zaya_store_name"), null);
      if (sName) setStoreName(sName as any);
      setSupabaseUrlInput(getRawLS("zaya_supabase_url"));
      setSupabaseKeyInput(getRawLS("zaya_supabase_key"));
    } catch {}
  },[]);

  // Persist safely
  useEffect(()=>{ try{ safeSetLS("zaya_products", products); }catch{} }, [products]);
  useEffect(()=>{ try{ safeSetLS("zaya_categories", categories); }catch{} }, [categories]);
  useEffect(()=>{ try{ safeSetLS("zaya_banners", banners); }catch{} }, [banners]);
  useEffect(()=>{ try{ safeSetLS("zaya_orders", orders); }catch{} }, [orders]);
  useEffect(()=>{ try{ safeSetLS("zaya_cart", cart); }catch{} }, [cart]);
  useEffect(()=>{ try{ safeSetLS("zaya_admin_code", adminCode); try{localStorage.setItem("zaya_admin_code_raw", adminCode);}catch{} }catch{} }, [adminCode]);
  useEffect(()=>{ try{ safeSetLS("zaya_store_name", storeName); }catch{} }, [storeName]);

  // Supabase checking
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try{
        setCloudStatus("checking");
        const client = await getSupabase();
        if (cancelled) return;
        if (client) {
          try {
            // try load
            const { data: prodData, error: prodErr } = await client.from("products").select("*").limit(1);
            if (!prodErr) {
              setCloudStatus("cloud");
              // attempt full load
              try {
                const { data: p } = await client.from("products").select("*");
                if (p && Array.isArray(p) && p.length>0) {
                  // map if needed - assume same shape else ignore
                  // only if has fields
                  if (p[0].name) setProducts(p as any);
                }
                const { data: c } = await client.from("categories").select("*");
                if (c && c.length>0 && c[0].name) setCategories(c as any);
                const { data: b } = await client.from("banners").select("*");
                if (b && b.length>0) setBanners(b as any);
                const { data: o } = await client.from("orders").select("*");
                if (o && o.length>0) setOrders(o as any);
              } catch {}
            } else {
              setCloudStatus("local");
            }
          } catch { if(!cancelled) setCloudStatus("local"); }
        } else {
          if(!cancelled) setCloudStatus("local");
        }
      } catch {
        if(!cancelled) setCloudStatus("local");
      }
    })();
    return ()=>{ cancelled = true; };
  },[]);

  async function saveToCloud(table: string, data: any){
    try{
      const client = await getSupabase();
      if(!client) return;
      if(table==="products") await client.from("products").upsert(data);
      else if(table==="categories") await client.from("categories").upsert(data);
      else if(table==="banners") await client.from("banners").upsert(data);
      else if(table==="orders") await client.from("orders").insert(data);
    }catch{}
  }

  // Filter products
  const filteredProducts = useMemo(()=>{
    try{
      let list = [...products];
      if(selectedCat && selectedCat!=="Todos") list = list.filter(p=>p.category===selectedCat);
      if(search.trim()){
        const q = search.toLowerCase();
        list = list.filter(p=>p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
      }
      return list;
    }catch{ return products; }
  },[products, selectedCat, search]);

  // Product helpers
  function isColorDisabled(color: ColorOpt): boolean {
    try { return (color.stock ?? 0) <= 0; } catch { return false; }
  }
  function isSizeDisabled(size: SizeOpt): boolean {
    try { return (size.stock ?? 0) <= 0; } catch { return false; }
  }

  function openProduct(p: Product){
    try{
      setSelectedProduct(p);
      setSelColor(p.colors?.[0] || null);
      setSelSize(p.sizes?.[0] || null);
      setMainImgIdx(0);
      window.scrollTo({top:0, behavior:"smooth"});
    }catch{}
  }

  function addToCart(){
    try{
      if(!selectedProduct) return;
      // check stock disabled
      if(selColor && isColorDisabled(selColor)) return;
      if(selSize && isSizeDisabled(selSize)) return;
      const item: CartItem = {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        qty: 1,
        color: selColor || undefined,
        size: selSize || undefined,
        image: selectedProduct.images?.[0] || "",
      };
      setCart(prev=>{
        const idx = prev.findIndex(x=>x.productId===item.productId && x.color?.id===item.color?.id && x.size?.id===item.size?.id);
        if(idx>=0){
          const copy = [...prev];
          copy[idx].qty +=1;
          return copy;
        }
        return [...prev, item];
      });
      setShowCart(true);
    }catch{}
  }

  function cartTotal(){
    try{ return cart.reduce((s,i)=>s+i.price*i.qty,0); }catch{ return 0; }
  }

  function handleCheckoutSubmit(){
    try{
      if(!checkoutForm.nome.trim() || !checkoutForm.whatsapp.trim()){ alert("Preencha Nome e WhatsApp"); return; }
      const newOrder: Order = {
        id: "ORD"+Date.now(),
        date: new Date().toISOString(),
        customer: checkoutForm.nome,
        whatsapp: checkoutForm.whatsapp,
        cpf: checkoutForm.cpf,
        payment: checkoutForm.pagamento,
        items: cart.map(c=>({productId:c.productId, name:c.name, price:c.price, qty:c.qty, color:c.color?.name, size:c.size?.name})),
        total: cartTotal(),
      };
      setOrders(prev=>[newOrder, ...prev]);
      try{ saveToCloud("orders", newOrder); }catch{}
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
      alert(`Pedido ${newOrder.id} criado! Entraremos em contato via WhatsApp.`);
      setCheckoutForm({nome:"", whatsapp:"", cpf:"", pagamento:"PIX"});
    }catch{}
  }

  // Admin product save
  function saveProduct(product: Product){
    try{
      if(products.find(p=>p.id===product.id)){
        setProducts(prev=>prev.map(p=>p.id===product.id?product:p));
      }else{
        setProducts(prev=>[product, ...prev]);
      }
      try{ saveToCloud("products", product); }catch{}
      setEditingProduct(null);
    }catch{}
  }

  // Compress handlers
  async function handleProductImagesUpload(files: FileList | null, targetProduct: Product, setter: (p:Product)=>void){
    try{
      if(!files) return;
      const compressed: string[] = [];
      for(let i=0;i<files.length;i++){
        try{
          const c = await compressImage(files[i]);
          compressed.push(c);
        }catch{}
      }
      setter({...targetProduct, images:[...targetProduct.images, ...compressed]});
    }catch{}
  }

  // UI
  const banner = banners[0];

  return (
    <div className="min-h-screen bg-[#F9F5F0] text-[#2B2B2B] selection:bg-[#D4BC8E]/30 overflow-x-hidden" style={{fontFamily:"Inter, sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#F9F5F0]/90 backdrop-blur-md border-b border-[#E8DCC6]/60">
        <div className="max-w-[1320px] mx-auto px-4 md:px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="ZAYA" className="h-[44px] w-[44px] object-cover rounded-full border border-[#E8DCC6] shadow-sm" />
            <div className="leading-none">
              <h1 className="font-semibold tracking-[0.22em] text-[16px] md:text-[18px]" style={{fontFamily:"Cormorant Garamond, serif"}}>{storeName}</h1>
              <p className="text-[10px] tracking-[0.28em] text-[#B89B6A] -mt-0.5">STORE</p>
            </div>
            {isAdmin && (
              <span className={`ml-3 text-[11px] px-2.5 py-1 rounded-full border font-medium ${cloudStatus==="cloud" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : cloudStatus==="checking" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                {cloudStatus==="cloud" ? "☁️ Nuvem" : cloudStatus==="checking" ? "⏳ Verificando" : "💾 Local"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center bg-white border border-[#E8DCC6] rounded-full px-3 h-9 w-[280px] focus-within:border-[#B89B6A] transition">
              <Search className="w-4 h-4 text-[#B89B6A]" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." className="ml-2 flex-1 outline-none text-sm bg-transparent placeholder:text-zinc-400" />
              {search && <button onClick={()=>setSearch("")}><X className="w-4 h-4 text-zinc-400" /></button>}
            </div>
            <button onClick={()=>setShowCart(true)} className="relative w-10 h-10 rounded-full bg-white border border-[#E8DCC6] flex items-center justify-center hover:border-[#B89B6A] transition">
              {/* ícone sacola shopping-bag SVG real */}
              <ShoppingBag className="w-[18px] h-[18px] text-[#2B2B2B]" strokeWidth={1.7} />
              {cart.length>0 && <span className="absolute -top-1 -right-1 bg-[#B89B6A] text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-semibold">{cart.reduce((s,i)=>s+i.qty,0)}</span>}
            </button>
            {isAdmin && (
              <button onClick={()=>setIsAdmin(false)} className="hidden md:flex items-center gap-1 text-[12px] px-3 h-9 rounded-full border border-[#E8DCC6] bg-white hover:bg-zinc-50"><LogOut className="w-4 h-4" /> Sair</button>
            )}
          </div>
        </div>
        {/* mobile search */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center bg-white border border-[#E8DCC6] rounded-full px-3 h-10 focus-within:border-[#B89B6A]">
            <Search className="w-4 h-4 text-[#B89B6A]" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar produtos..." className="ml-2 flex-1 outline-none text-sm bg-transparent" />
          </div>
        </div>
      </header>

      {/* BANNER - sem botões Shop Now / Explore Collection, só texto ou só imagem se textos vazios */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 mt-6">
        <div className="relative overflow-hidden rounded-[18px] md:rounded-[28px] bg-white border border-[#E8DCC6]/70 min-h-[320px] md:min-h-[480px] flex items-center">
          {/* background */}
          {banner?.desktopImage || banner?.mobileImage ? (
            <>
              {banner.desktopImage && <img src={banner.desktopImage} alt="banner" className="hidden md:block absolute inset-0 w-full h-full object-cover" />}
              {banner.mobileImage && <img src={banner.mobileImage} alt="banner mobile" className="md:hidden absolute inset-0 w-full h-full object-cover" />}
              {(!banner.desktopImage && banner.mobileImage) && <img src={banner.mobileImage} alt="banner" className="hidden md:block absolute inset-0 w-full h-full object-cover" />}
              {(!banner.mobileImage && banner.desktopImage) && <img src={banner.desktopImage} alt="banner mobile" className="md:hidden absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/45 to-transparent md:from-white/85 md:via-white/30" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#F9F5F0] via-[#F5EFE6] to-[#E8DCC6]/60" />
          )}
          {/* only text if not empty */}
          {(banner?.title || banner?.subtitle) && (
            <div className="relative z-10 p-6 md:p-14 max-w-[560px]">
              {banner?.title && <h2 className="text-[32px] md:text-[54px] leading-[0.95] tracking-[-0.02em]" style={{fontFamily:"Cormorant Garamond, serif", fontWeight:600}}>{banner.title}</h2>}
              {banner?.subtitle && <p className="mt-4 text-[14px] md:text-[16px] leading-[1.5] text-[#5A5A5A] max-w-[420px]">{banner.subtitle}</p>}
              <div className="mt-6 flex items-center gap-3">
                <span className="h-px w-12 bg-[#B89B6A]" />
                <span className="text-[11px] tracking-[0.25em] text-[#B89B6A] font-medium">ATEMPORAL • ESSENCIAL • ZAYA</span>
              </div>
            </div>
          )}
          {/* decorative logo watermark */}
          <img src={logoImg} alt="" className="pointer-events-none absolute right-6 md:right-10 bottom-6 md:bottom-10 w-[84px] h-[84px] md:w-[120px] md:h-[120px] object-cover rounded-full opacity-[0.08] grayscale" />
        </div>
      </section>

      {/* SEARCH CHIPS - Todos Vestidos Conjuntos Blusas */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 mt-8">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-0.5">
          {categories.map(cat=>{
            const active = selectedCat===cat.name;
            return (
              <button key={cat.id} onClick={()=>{ setSelectedCat(cat.name); setChipPulse(v=>v+1); }} aria-pressed={active} data-active={active ? "true":"false"} className={`whitespace-nowrap px-5 h-9 rounded-full text-[13px] border transition ${active ? "bg-[#2B2B2B] text-white border-[#2B2B2B]" : "bg-white border-[#E8DCC6] text-[#5A5A5A] hover:border-[#B89B6A] hover:text-[#2B2B2B]"}`}>
                {cat.name}
              </button>
            );
          })}
        </div>
        <span className="sr-only" aria-live="polite">Filtro {selectedCat} aplicado {chipPulse}</span>
      </section>

      {/* PRODUCTS GRID */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 mt-6 pb-20">
        {filteredProducts.length===0 ? (
          <div className="py-20 text-center bg-white rounded-[20px] border border-[#E8DCC6] mt-4">
            <p className="text-[#8A8A8A]">Nenhum produto encontrado para "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-7">
            {filteredProducts.map(product=>{
              const firstImg = product.images[0];
              return (
                <article key={product.id} className="group cursor-pointer" onClick={()=>openProduct(product)}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[16px] md:rounded-[20px] bg-white border border-[#E8DCC6]/70">
                    {firstImg ? (
                      <img src={firstImg} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-700" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F9F5F0] to-[#E8DCC6]/40 p-6">
                        <img src={logoImg} alt="" className="w-14 h-14 rounded-full opacity-20 object-cover mb-3" />
                        <span className="text-[11px] tracking-widest text-[#B89B6A]">ZAYA</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1">
                      {product.colors.slice(0,3).map(c=>(
                        <span key={c.id} title={c.name} className="w-5 h-5 rounded-full border border-white shadow-sm" style={{background:c.hex, opacity: isColorDisabled(c) ? 0.25 : 1}} />
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 px-1">
                    <h3 className="text-[13px] md:text-[14px] leading-[1.3] line-clamp-2" style={{fontFamily:"Inter, sans-serif", fontWeight:500}}>{product.name}</h3>
                    <p className="mt-1 text-[13px] font-semibold tracking-wide">R$ {product.price.toFixed(2).replace(".",",")}</p>
                    <p className="mt-1 text-[11px] text-[#8A8A8A]">{product.category}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* PRODUCT DETAIL MODAL / PAGE */}
      {selectedProduct && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#F9F5F0]">
          <div className="sticky top-0 z-10 bg-[#F9F5F0]/90 backdrop-blur border-b border-[#E8DCC6]/60 h-[64px] flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="ZAYA" className="w-8 h-8 rounded-full object-cover border border-[#E8DCC6]" />
              <span className="text-[13px] tracking-[0.2em]" style={{fontFamily:"Cormorant Garamond, serif"}}>ZAYA STORE</span>
            </div>
            <button onClick={()=>setSelectedProduct(null)} className="w-9 h-9 rounded-full bg-white border border-[#E8DCC6] flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          <div className="max-w-[1320px] mx-auto px-4 md:px-8 py-6 md:py-10 grid md:grid-cols-[1.1fr_0.9fr] gap-8">
            {/* gallery */}
            <div>
              <div className="aspect-[4/5] md:aspect-[4/5] rounded-[20px] overflow-hidden bg-white border border-[#E8DCC6]/70">
                {selectedProduct.images[mainImgIdx] ? (
                  <img src={selectedProduct.images[mainImgIdx]} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F9F5F0] to-[#E8DCC6]/30">
                    <img src={logoImg} alt="" className="w-20 h-20 rounded-full opacity-30 object-cover" />
                  </div>
                )}
              </div>
              {selectedProduct.images.length>1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {selectedProduct.images.map((img,i)=>(
                    <button key={i} onClick={()=>setMainImgIdx(i)} className={`w-20 h-24 rounded-[12px] overflow-hidden border ${mainImgIdx===i ? "border-[#B89B6A]" : "border-[#E8DCC6]"} flex-shrink-0`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* info */}
            <div className="md:pl-6">
              <p className="text-[11px] tracking-[0.25em] text-[#B89B6A]">{selectedProduct.category.toUpperCase()}</p>
              <h1 className="mt-2 text-[28px] md:text-[38px] leading-[1.05]" style={{fontFamily:"Cormorant Garamond, serif", fontWeight:600}}>{selectedProduct.name}</h1>
              <p className="mt-3 text-[22px] font-semibold tracking-wide">R$ {selectedProduct.price.toFixed(2).replace(".",",")}</p>
              <p className="mt-5 text-[14px] leading-[1.6] text-[#5A5A5A]">{selectedProduct.description}</p>

              {/* colors with edição lápis e lixeira + bolinha + hex */}
              <div className="mt-8">
                <h4 className="text-[12px] tracking-[0.2em] font-medium mb-3">COR</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.colors.map(color=>{
                    const disabled = isColorDisabled(color);
                    const selected = selColor?.id===color.id;
                    return (
                      <button key={color.id} onClick={()=>!disabled && setSelColor(color)} className={`group relative flex items-center gap-2 px-3 h-9 rounded-full border text-[12px] transition ${selected ? "bg-[#2B2B2B] text-white border-[#2B2B2B]" : "bg-white border-[#E8DCC6] hover:border-[#B89B6A]"} ${disabled ? "opacity-25 pointer-events-none line-through" : ""}`}>
                        <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{background:color.hex}} />
                        <span>{color.name}</span>
                        <span className="text-[10px] opacity-60">{color.hex}</span>
                        {disabled && <span className="ml-1 text-[10px]">• esgotado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* sizes P M G GG TU PS with trava */}
              <div className="mt-6">
                <h4 className="text-[12px] tracking-[0.2em] font-medium mb-3">TAMANHO</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes.map(size=>{
                    const disabled = isSizeDisabled(size);
                    const selected = selSize?.id===size.id;
                    return (
                      <button key={size.id} onClick={()=>!disabled && setSelSize(size)} className={`min-w-[44px] h-9 px-3 rounded-full border text-[12px] font-medium transition ${selected ? "bg-[#2B2B2B] text-white border-[#2B2B2B]" : "bg-white border-[#E8DCC6] hover:border-[#B89B6A]"} ${disabled ? "opacity-25 pointer-events-none line-through" : ""}`}>
                        {size.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">Tamanhos disponíveis: P M G GG TU PS • Esgotados ficam riscados</p>
              </div>

              <button onClick={addToCart} disabled={!!(selColor && isColorDisabled(selColor)) || !!(selSize && isSizeDisabled(selSize))} className="mt-8 w-full h-[48px] rounded-full bg-[#2B2B2B] text-white text-[13px] tracking-[0.18em] font-medium hover:bg-black transition disabled:opacity-30 flex items-center justify-center gap-2">
                <ShoppingBag className="w-4 h-4" /> ADICIONAR À SACOLA
              </button>

              <div className="mt-8 border-t border-[#E8DCC6]/60 pt-6">
                <div className="flex items-center gap-2 text-[12px] text-[#5A5A5A]">
                  <span className="w-6 h-6 rounded-full bg-white border border-[#E8DCC6] flex items-center justify-center">✦</span>
                  <span>Peça atemporal • Produção consciente • Troca em 7 dias</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={()=>setShowCart(false)} />
          <div className="relative w-full max-w-[420px] h-full bg-[#FFFEFD] border-l border-[#E8DCC6] shadow-2xl flex flex-col">
            <div className="h-[64px] px-6 flex items-center justify-between border-b border-[#E8DCC6]/60">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="text-[15px] tracking-[0.15em] font-medium" style={{fontFamily:"Cormorant Garamond, serif"}}>SACOLA ({cart.reduce((s,i)=>s+i.qty,0)})</h2>
              </div>
              <button onClick={()=>setShowCart(false)} className="w-8 h-8 rounded-full bg-white border border-[#E8DCC6] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {cart.length===0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#F9F5F0] border border-[#E8DCC6] flex items-center justify-center mb-4"><ShoppingBag className="w-6 h-6 text-[#B89B6A]" /></div>
                  <p className="text-sm text-zinc-500">Sua sacola está vazia</p>
                </div>
              ) : cart.map((item, idx)=>(
                <div key={idx} className="flex gap-4">
                  <div className="w-20 h-24 rounded-[12px] bg-[#F9F5F0] border border-[#E8DCC6] overflow-hidden flex-shrink-0">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <img src={logoImg} alt="" className="w-full h-full object-cover opacity-30" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[13px] font-medium leading-tight">{item.name}</h4>
                    <p className="text-[11px] text-zinc-500 mt-1">{item.color?.name && `Cor: ${item.color.name}`} {item.size?.name && `• Tam: ${item.size.name}`}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>setCart(prev=>prev.map((c,i)=>i===idx?{...c, qty:Math.max(1,c.qty-1)}:c))} className="w-7 h-7 rounded-full border border-[#E8DCC6] flex items-center justify-center text-sm">-</button>
                        <span className="text-[13px] w-5 text-center">{item.qty}</span>
                        <button onClick={()=>setCart(prev=>prev.map((c,i)=>i===idx?{...c, qty:c.qty+1}:c))} className="w-7 h-7 rounded-full border border-[#E8DCC6] flex items-center justify-center text-sm">+</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold">R$ {(item.price*item.qty).toFixed(2).replace(".",",")}</span>
                        <button onClick={()=>setCart(prev=>prev.filter((_,i)=>i!==idx))} className="w-7 h-7 rounded-full bg-[#F9F5F0] border border-[#E8DCC6] flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length>0 && (
              <div className="p-6 border-t border-[#E8DCC6]/60 bg-white">
                <div className="flex justify-between text-[14px] mb-4"><span className="text-zinc-500">Subtotal</span><span className="font-semibold">R$ {cartTotal().toFixed(2).replace(".",",")}</span></div>
                <button onClick={()=>{ setShowCart(false); setShowCheckout(true); }} className="w-full h-12 rounded-full bg-[#2B2B2B] text-white text-[13px] tracking-[0.18em] font-medium">FINALIZAR COMPRA</button>
                <p className="mt-3 text-[11px] text-center text-zinc-400">Sem frete • Pagamento seguro</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT - Só Nome completo, WhatsApp, CPF opcional, pagamento PIX, Cartão de crédito, Dinheiro, sem frete sem endereço sem e-mail */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F9F5F0]">
          <div className="sticky top-0 z-10 bg-[#F9F5F0]/90 backdrop-blur border-b border-[#E8DCC6]/60 h-[64px] flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="" className="w-8 h-8 rounded-full object-cover border border-[#E8DCC6]" />
              <span className="text-[13px] tracking-[0.2em]" style={{fontFamily:"Cormorant Garamond, serif"}}>CHECKOUT ZAYA</span>
            </div>
            <button onClick={()=>setShowCheckout(false)} className="w-9 h-9 rounded-full bg-white border border-[#E8DCC6] flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          <div className="max-w-[760px] mx-auto px-4 md:px-8 py-8 grid md:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="bg-white rounded-[20px] border border-[#E8DCC6]/70 p-6 md:p-8">
              <h2 className="text-[20px] font-medium" style={{fontFamily:"Cormorant Garamond, serif"}}>Seus dados</h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-[11px] tracking-[0.15em] text-zinc-500">NOME COMPLETO *</label>
                  <input value={checkoutForm.nome} onChange={e=>setCheckoutForm({...checkoutForm, nome:e.target.value})} placeholder="Ex: Maria Silva" className="mt-1 w-full h-11 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] bg-[#F9F5F0]/50 text-[14px]" />
                </div>
                <div>
                  <label className="text-[11px] tracking-[0.15em] text-zinc-500">WHATSAPP *</label>
                  <input value={checkoutForm.whatsapp} onChange={e=>setCheckoutForm({...checkoutForm, whatsapp:e.target.value})} placeholder="(11) 99999-9999" className="mt-1 w-full h-11 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] bg-[#F9F5F0]/50 text-[14px]" />
                </div>
                <div>
                  <label className="text-[11px] tracking-[0.15em] text-zinc-500">CPF (OPCIONAL)</label>
                  <input value={checkoutForm.cpf} onChange={e=>setCheckoutForm({...checkoutForm, cpf:e.target.value})} placeholder="000.000.000-00" className="mt-1 w-full h-11 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] bg-[#F9F5F0]/50 text-[14px]" />
                </div>
                <div className="pt-2">
                  <label className="text-[11px] tracking-[0.15em] text-zinc-500">FORMA DE PAGAMENTO</label>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {[
                      {id:"PIX", label:"PIX • Aprovação imediata"},
                      {id:"CARTAO", label:"Cartão de crédito"},
                      {id:"DINHEIRO", label:"Dinheiro"},
                    ].map(opt=>(
                      <button key={opt.id} onClick={()=>setCheckoutForm({...checkoutForm, pagamento:opt.id})} className={`h-11 px-4 rounded-full border text-[13px] text-left flex items-center justify-between ${checkoutForm.pagamento===opt.id ? "bg-[#2B2B2B] text-white border-[#2B2B2B]" : "bg-white border-[#E8DCC6] hover:border-[#B89B6A]"}`}>
                        <span>{opt.label}</span>
                        {checkoutForm.pagamento===opt.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleCheckoutSubmit} className="mt-8 w-full h-12 rounded-full bg-[#2B2B2B] text-white text-[13px] tracking-[0.18em] font-medium hover:bg-black">CONFIRMAR PEDIDO • R$ {cartTotal().toFixed(2).replace(".",",")}</button>
              <p className="mt-3 text-[11px] text-center text-zinc-400">Sem frete • Sem endereço • Atendimento via WhatsApp</p>
            </div>
            <div className="bg-white rounded-[20px] border border-[#E8DCC6]/70 p-6">
              <h3 className="text-[13px] tracking-[0.15em] font-medium">RESUMO</h3>
              <div className="mt-4 space-y-3">
                {cart.map((i,idx)=><div key={idx} className="flex justify-between text-[13px]"><span className="text-zinc-600">{i.name} x{i.qty}</span><span className="font-medium">R$ {(i.price*i.qty).toFixed(2).replace(".",",")}</span></div>)}
                <div className="border-t border-[#E8DCC6]/60 pt-3 flex justify-between font-semibold"><span>Total</span><span>R$ {cartTotal().toFixed(2).replace(".",",")}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN LOGIN */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[360px] bg-white rounded-[20px] border border-[#E8DCC6] p-7 shadow-2xl">
            <h3 className="text-[18px] font-medium" style={{fontFamily:"Cormorant Garamond, serif"}}>Acesso Admin</h3>
            <p className="text-[12px] text-zinc-500 mt-1">Digite o código de acesso (padrão 1234)</p>
            <div className="mt-5 relative">
              <input type={showCode ? "text" : "password"} value={adminCodeInput} onChange={e=>setAdminCodeInput(e.target.value)} placeholder="Código" className="w-full h-11 px-4 pr-10 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[14px]" />
              <button onClick={()=>setShowCode(!showCode)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#F9F5F0] border border-[#E8DCC6] flex items-center justify-center">{showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={()=>setShowAdminLogin(false)} className="flex-1 h-10 rounded-full border border-[#E8DCC6] text-[13px]">Cancelar</button>
              <button onClick={()=>{
                try{
                  if(adminCodeInput===adminCode){ setIsAdmin(true); setShowAdminLogin(false); setAdminCodeInput(""); }
                  else alert("Código incorreto");
                }catch{}
              }} className="flex-1 h-10 rounded-full bg-[#2B2B2B] text-white text-[13px]">Entrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PANEL */}
      {isAdmin && (
        <div className="fixed inset-0 z-[55] overflow-y-auto bg-[#F9F5F0]">
          <div className="sticky top-0 z-10 bg-white border-b border-[#E8DCC6] h-[64px] flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
              <img src={logoImg} alt="" className="w-8 h-8 rounded-full object-cover border border-[#E8DCC6]" />
              <span className="text-[14px] tracking-[0.2em] font-medium" style={{fontFamily:"Cormorant Garamond, serif"}}>PAINEL ZAYA</span>
              <span className={`hidden md:inline-flex text-[11px] px-2.5 py-1 rounded-full border font-medium ${cloudStatus==="cloud" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : cloudStatus==="checking" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>{cloudStatus==="cloud" ? "☁️ Nuvem conectada" : cloudStatus==="checking" ? "⏳ Verificando nuvem" : "💾 Local"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{ setIsAdmin(false); }} className="h-9 px-4 rounded-full border border-[#E8DCC6] bg-white text-[12px] flex items-center gap-1"><LogOut className="w-4 h-4" /> Sair</button>
            </div>
          </div>

          <div className="max-w-[1320px] mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row gap-6">
            {/* tabs */}
            <div className="md:w-[200px] flex md:flex-col gap-2 overflow-x-auto">
              {[
                {id:"produtos", label:"Produtos"},
                {id:"categorias", label:"Categorias"},
                {id:"banners", label:"Banners Outdoor"},
                {id:"pedidos", label:"Pedidos"},
                {id:"acesso", label:"Acesso"},
                {id:"config", label:"Configurações"},
              ].map(tab=>(
                <button key={tab.id} onClick={()=>setAdminTab(tab.id as any)} className={`whitespace-nowrap text-left px-4 h-10 rounded-full border text-[13px] transition ${adminTab===tab.id ? "bg-[#2B2B2B] text-white border-[#2B2B2B]" : "bg-white border-[#E8DCC6] hover:border-[#B89B6A]"}`}>{tab.label}</button>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              {/* PRODUTOS */}
              {adminTab==="produtos" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[18px] font-medium">Produtos • {products.length}</h2>
                    <button onClick={()=>{
                      const newP: Product = { id:"p"+Date.now(), name:"Novo Produto", price:199.9, category:categories[1]?.name || "Vestidos", description:"Descrição", images:[], colors:[{id:"c"+Date.now(), name:"Nova", hex:"#B89B6A", stock:5}], sizes:[{id:"s1", name:"P", stock:5},{id:"s2", name:"M", stock:5},{id:"s3", name:"G", stock:5},{id:"s4", name:"GG", stock:0},{id:"s5", name:"TU", stock:5},{id:"s6", name:"PS", stock:0}] };
                      setEditingProduct(newP);
                    }} className="h-9 px-4 rounded-full bg-[#2B2B2B] text-white text-[12px] flex items-center gap-1"><Plus className="w-4 h-4" /> Novo</button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {products.map(p=>(
                      <div key={p.id} className="bg-white rounded-[16px] border border-[#E8DCC6] p-4 flex gap-4">
                        <div className="w-20 h-24 rounded-[10px] bg-[#F9F5F0] border border-[#E8DCC6] overflow-hidden flex-shrink-0">{p.images[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-zinc-400" /></div>}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-medium truncate">{p.name}</h4>
                          <p className="text-[12px] text-zinc-500">{p.category} • R$ {p.price.toFixed(2)}</p>
                          <div className="mt-2 flex gap-2">
                            <button onClick={()=>setEditingProduct(p)} className="h-7 px-3 rounded-full border border-[#E8DCC6] text-[11px] flex items-center gap-1"><Edit2 className="w-3 h-3" /> Editar</button>
                            <button onClick={()=>{ if(confirm("Excluir produto?")) setProducts(prev=>prev.filter(x=>x.id!==p.id)); }} className="h-7 px-3 rounded-full border border-red-200 text-red-600 text-[11px] flex items-center gap-1"><Trash2 className="w-3 h-3" /> Excluir</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CATEGORIAS */}
              {adminTab==="categorias" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[18px] font-medium">Categorias com imagem</h2>
                    <button onClick={()=>setEditingCategory({id:"c"+Date.now(), name:"Nova Categoria"})} className="h-9 px-4 rounded-full bg-[#2B2B2B] text-white text-[12px] flex items-center gap-1"><Plus className="w-4 h-4" /> Nova</button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {categories.map(cat=>(
                      <div key={cat.id} className="bg-white rounded-[16px] border border-[#E8DCC6] p-4 flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-[#F9F5F0] border border-[#E8DCC6] overflow-hidden flex-shrink-0">{cat.image ? <img src={cat.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400">IMG</div>}</div>
                        <div className="flex-1"><p className="text-[13px] font-medium">{cat.name}</p></div>
                        <button onClick={()=>setEditingCategory(cat)} className="w-8 h-8 rounded-full border border-[#E8DCC6] flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                        {cat.name!=="Todos" && <button onClick={()=>{ if(confirm("Excluir categoria?")) setCategories(prev=>prev.filter(x=>x.id!==cat.id)); }} className="w-8 h-8 rounded-full border border-red-200 flex items-center justify-center text-red-600"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BANNERS */}
              {adminTab==="banners" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between"><h2 className="text-[18px] font-medium">Banners Outdoor com desktop/mobile imagem</h2><button onClick={()=>setEditingBanner({id:"b"+Date.now(), title:"", subtitle:"", desktopImage:"", mobileImage:""})} className="h-9 px-4 rounded-full bg-[#2B2B2B] text-white text-[12px] flex items-center gap-1"><Plus className="w-4 h-4" /> Novo</button></div>
                  <div className="space-y-4">
                    {banners.map(b=>(
                      <div key={b.id} className="bg-white rounded-[16px] border border-[#E8DCC6] p-4">
                        <div className="flex gap-4">
                          <div className="w-32 h-20 rounded-[10px] bg-[#F9F5F0] border border-[#E8DCC6] overflow-hidden">{b.desktopImage ? <img src={b.desktopImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-zinc-400" /></div>}</div>
                          <div className="flex-1">
                            <p className="text-[13px] font-medium">{b.title || "(sem título - só imagem)"}</p>
                            <p className="text-[12px] text-zinc-500">{b.subtitle}</p>
                            <div className="mt-2 flex gap-2">
                              <button onClick={()=>setEditingBanner(b)} className="h-7 px-3 rounded-full border border-[#E8DCC6] text-[11px] flex items-center gap-1"><Edit2 className="w-3 h-3" /> Editar</button>
                              <button onClick={()=>{ if(confirm("Excluir banner?")) setBanners(prev=>prev.filter(x=>x.id!==b.id)); }} className="h-7 px-3 rounded-full border border-red-200 text-red-600 text-[11px]"><Trash2 className="w-3 h-3 inline" /> Excluir</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PEDIDOS */}
              {adminTab==="pedidos" && (
                <div className="space-y-4">
                  <h2 className="text-[18px] font-medium">Pedidos com busca período exclusão confirmação</h2>
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex-1 flex items-center bg-white border border-[#E8DCC6] rounded-full px-4 h-10">
                      <Search className="w-4 h-4 text-zinc-400" />
                      <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="Buscar por nome, whatsapp, id..." className="ml-2 flex-1 outline-none text-[13px] bg-transparent" />
                    </div>
                    <input type="date" value={orderDateFilter} onChange={e=>setOrderDateFilter(e.target.value)} className="h-10 px-4 rounded-full border border-[#E8DCC6] bg-white text-[13px]" />
                    {orderDateFilter && <button onClick={()=>setOrderDateFilter("")} className="h-10 px-4 rounded-full border border-[#E8DCC6] bg-white text-[12px]">Limpar data</button>}
                  </div>
                  <div className="space-y-3">
                    {orders.filter(o=>{
                      try{
                        if(orderSearch){
                          const q = orderSearch.toLowerCase();
                          if(!(o.customer.toLowerCase().includes(q) || o.whatsapp.includes(q) || o.id.toLowerCase().includes(q))) return false;
                        }
                        if(orderDateFilter){
                          const d = new Date(o.date).toISOString().slice(0,10);
                          if(d!==orderDateFilter) return false;
                        }
                        return true;
                      }catch{ return true; }
                    }).map(order=>(
                      <div key={order.id} className="bg-white rounded-[16px] border border-[#E8DCC6] p-4">
                        <div className="flex justify-between">
                          <div><p className="text-[13px] font-medium">{order.id} • {order.customer}</p><p className="text-[11px] text-zinc-500">{new Date(order.date).toLocaleString()} • {order.whatsapp} • {order.payment} • R$ {order.total.toFixed(2)}</p></div>
                          <button onClick={()=>{ if(confirm(`Excluir pedido ${order.id}?`)) setOrders(prev=>prev.filter(x=>x.id!==order.id)); }} className="h-8 px-3 rounded-full border border-red-200 text-red-600 text-[11px] flex items-center gap-1"><Trash2 className="w-3 h-3" /> Excluir</button>
                        </div>
                        <div className="mt-2 text-[11px] text-zinc-600">{order.items.map(i=>`${i.name} x${i.qty}`).join(", ")}</div>
                      </div>
                    ))}
                    {orders.length===0 && <p className="text-[13px] text-zinc-500 bg-white rounded-[16px] border border-[#E8DCC6] p-6 text-center">Nenhum pedido ainda</p>}
                  </div>
                </div>
              )}

              {/* ACESSO */}
              {adminTab==="acesso" && (
                <div className="bg-white rounded-[20px] border border-[#E8DCC6] p-6 max-w-[520px]">
                  <h2 className="text-[16px] font-medium">Acesso admin 1234 editável</h2>
                  <p className="text-[12px] text-zinc-500 mt-1">Altere o código de acesso ao painel. Código atual é usado para login.</p>
                  <div className="mt-5">
                    <label className="text-[11px] tracking-[0.15em] text-zinc-500">CÓDIGO ATUAL</label>
                    <div className="mt-1 flex gap-2">
                      <input type={showCode ? "text" : "password"} value={adminCode} onChange={e=>setAdminCode(e.target.value)} className="flex-1 h-11 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[14px]" />
                      <button onClick={()=>setShowCode(!showCode)} className="w-11 h-11 rounded-full border border-[#E8DCC6] flex items-center justify-center">{showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <button onClick={()=>{ safeSetLS("zaya_admin_code", adminCode); alert("Código salvo!"); }} className="mt-4 h-10 px-6 rounded-full bg-[#2B2B2B] text-white text-[12px] flex items-center gap-1"><Save className="w-4 h-4" /> Salvar código</button>
                </div>
              )}

              {/* CONFIG */}
              {adminTab==="config" && (
                <div className="space-y-6 max-w-[640px]">
                  <div className="bg-white rounded-[20px] border border-[#E8DCC6] p-6">
                    <h2 className="text-[16px] font-medium">Configurações loja</h2>
                    <div className="mt-4">
                      <label className="text-[11px] tracking-[0.15em] text-zinc-500">NOME DA LOJA</label>
                      <input value={storeName} onChange={e=>setStoreName(e.target.value)} className="mt-1 w-full h-11 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[14px]" />
                    </div>
                  </div>

                  <div className="bg-white rounded-[20px] border border-[#E8DCC6] p-6">
                    <h2 className="text-[16px] font-medium flex items-center gap-2"><span>☁️</span> Conexão Nuvem Supabase</h2>
                    <p className="text-[12px] text-zinc-500 mt-1">Se VITE_SUPABASE_URL e ANON KEY existirem e válidos, tenta carregar da nuvem. Badge header admin "☁️ Nuvem" verde se conectado, "💾 Local" cinza se não.</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-[11px] tracking-[0.15em] text-zinc-500">SUPABASE URL</label>
                        <input value={supabaseUrlInput} onChange={e=>setSupabaseUrlInput(e.target.value)} placeholder="https://seuprojeto.supabase.co" className="mt-1 w-full h-11 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[13px] font-mono" />
                      </div>
                      <div>
                        <label className="text-[11px] tracking-[0.15em] text-zinc-500">SUPABASE ANON KEY</label>
                        <input type={showCode ? "text" : "password"} value={supabaseKeyInput} onChange={e=>setSupabaseKeyInput(e.target.value)} placeholder="eyJ..." className="mt-1 w-full h-11 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[13px] font-mono" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={()=>{
                          try{
                            localStorage.setItem("zaya_supabase_url", supabaseUrlInput);
                            localStorage.setItem("zaya_supabase_key", supabaseKeyInput);
                            safeSetLS("zaya_supabase_url", supabaseUrlInput);
                            safeSetLS("zaya_supabase_key", supabaseKeyInput);
                            alert("Credenciais salvas localmente. Recarregue para testar conexão.");
                            location.reload();
                          }catch{}
                        }} className="h-10 px-5 rounded-full bg-[#2B2B2B] text-white text-[12px] flex items-center gap-1"><Save className="w-4 h-4" /> Salvar conexão</button>
                        <button onClick={async()=>{
                          try{
                            setCloudStatus("checking");
                            const client = await getSupabase();
                            if(client){
                              const { error } = await client.from("products").select("id").limit(1);
                              if(!error){ setCloudStatus("cloud"); alert("☁️ Conectado com sucesso à Nuvem!"); } else { setCloudStatus("local"); alert("💾 Local - erro: "+error.message); }
                            } else {
                              setCloudStatus("local");
                              alert("💾 Local - URL ou KEY inválidas ou ausentes. Verifique se começa com https:// e não contém placeholder seuprojeto");
                            }
                          }catch(e:any){ setCloudStatus("local"); alert("Erro: "+(e?.message||"desconhecido")); }
                        }} className="h-10 px-5 rounded-full border border-[#E8DCC6] bg-white text-[12px]">Testar conexão</button>
                      </div>
                      <div className="pt-2 text-[11px] text-zinc-500 flex items-center gap-2">
                        Status atual: <span className={`px-2 py-1 rounded-full border text-[11px] ${cloudStatus==="cloud" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>{cloudStatus==="cloud" ? "☁️ Nuvem" : "💾 Local"}</span>
                      </div>
                      <div className="mt-3 p-3 rounded-[12px] bg-[#F9F5F0] border border-[#E8DCC6]/60 text-[11px] text-zinc-600 leading-relaxed">
                        <p className="font-medium text-[11px] mb-1">Como criar tabelas no Supabase:</p>
                        <p>SQL: products (id text primary key, name text, price float8, category text, description text, images jsonb, colors jsonb, sizes jsonb), categories (id text, name text, image text), banners (id text, title text, subtitle text, desktopImage text, mobileImage text), orders (id text, date text, customer text, whatsapp text, cpf text, payment text, items jsonb, total float8)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDITING PRODUCT MODAL - with galeria compressão canvas 800px qualidade 0.7 */}
      {editingProduct && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm p-4 flex justify-center">
          <div className="w-full max-w-[760px] my-6 bg-white rounded-[20px] border border-[#E8DCC6] shadow-2xl">
            <div className="h-[56px] px-6 flex items-center justify-between border-b border-[#E8DCC6]/60">
              <h3 className="text-[14px] font-medium tracking-wide">{products.find(p=>p.id===editingProduct.id) ? "Editar Produto" : "Novo Produto"}</h3>
              <button onClick={()=>setEditingProduct(null)} className="w-8 h-8 rounded-full bg-[#F9F5F0] border border-[#E8DCC6] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-[11px] text-zinc-500 tracking-wide">NOME</label><input value={editingProduct.name} onChange={e=>setEditingProduct({...editingProduct, name:e.target.value})} className="mt-1 w-full h-10 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[13px]" /></div>
                <div><label className="text-[11px] text-zinc-500 tracking-wide">PREÇO</label><input type="number" step="0.01" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price: parseFloat(e.target.value)||0})} className="mt-1 w-full h-10 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[13px]" /></div>
                <div><label className="text-[11px] text-zinc-500 tracking-wide">CATEGORIA</label><select value={editingProduct.category} onChange={e=>setEditingProduct({...editingProduct, category:e.target.value})} className="mt-1 w-full h-10 px-4 rounded-full border border-[#E8DCC6] outline-none bg-white text-[13px]">{categories.filter(c=>c.name!=="Todos").map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><label className="text-[11px] text-zinc-500 tracking-wide">DESCRIÇÃO</label><input value={editingProduct.description} onChange={e=>setEditingProduct({...editingProduct, description:e.target.value})} className="mt-1 w-full h-10 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[13px]" /></div>
              </div>

              {/* Galeria com compressão automática */}
              <div>
                <label className="text-[11px] text-zinc-500 tracking-wide">GALERIA - Upload fotos com compressão automática canvas 800px qualidade 0.7 fix tela preta</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {editingProduct.images.map((img, i)=>(
                    <div key={i} className="relative w-24 h-28 rounded-[12px] overflow-hidden border border-[#E8DCC6] bg-[#F9F5F0]">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={()=>setEditingProduct({...editingProduct, images: editingProduct.images.filter((_,idx)=>idx!==i)})} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={()=>prodGalleryInputRef.current?.click()} className="w-24 h-28 rounded-[12px] border border-dashed border-[#B89B6A] bg-[#F9F5F0] flex flex-col items-center justify-center gap-1 text-[11px] text-[#B89B6A]"><Plus className="w-5 h-5" /> Adicionar</button>
                </div>
                <input ref={prodGalleryInputRef} type="file" multiple accept="image/*" className="hidden" onChange={async e=>{
                  const files = e.target.files;
                  if(!files) return;
                  try{
                    const compressed: string[] = [];
                    for(let i=0;i<files.length;i++){
                      try{ const c = await compressImage(files[i]); compressed.push(c); }catch{}
                    }
                    setEditingProduct(prev=>prev ? {...prev, images:[...prev.images, ...compressed]} : prev);
                  }catch{}
                  e.target.value="";
                }} />
              </div>

              {/* Cores com edição lápis e lixeira + bolinha + hex + adicionar nova cor com color picker */}
              <div>
                <label className="text-[11px] text-zinc-500 tracking-wide">CORES - edição lápis e lixeira + bolinha + hex + adicionar nova cor com color picker</label>
                <div className="mt-2 space-y-2">
                  {editingProduct.colors.map(color=>{
                    const isEditing = editingColorId===color.id;
                    return (
                      <div key={color.id} className="flex items-center gap-2 bg-[#F9F5F0] border border-[#E8DCC6] rounded-full px-3 h-11">
                        <span className="w-5 h-5 rounded-full border border-white shadow-sm flex-shrink-0" style={{background:color.hex}} />
                        {isEditing ? (
                          <>
                            <input value={color.name} onChange={e=>{
                              const newColors = editingProduct.colors.map(c=>c.id===color.id ? {...c, name:e.target.value} : c);
                              setEditingProduct({...editingProduct, colors:newColors});
                            }} className="flex-1 bg-white border border-[#E8DCC6] rounded-full px-3 h-7 text-[12px] outline-none" placeholder="Nome cor" />
                            <input type="color" value={color.hex} onChange={e=>{
                              const newColors = editingProduct.colors.map(c=>c.id===color.id ? {...c, hex:e.target.value} : c);
                              setEditingProduct({...editingProduct, colors:newColors});
                            }} className="w-8 h-7 rounded-full border-0 p-0 overflow-hidden" />
                            <input type="number" value={color.stock} onChange={e=>{
                              const newColors = editingProduct.colors.map(c=>c.id===color.id ? {...c, stock: parseInt(e.target.value)||0} : c);
                              setEditingProduct({...editingProduct, colors:newColors});
                            }} className="w-14 bg-white border border-[#E8DCC6] rounded-full px-2 h-7 text-[11px] outline-none" placeholder="Estoque" />
                            <button onClick={()=>setEditingColorId(null)} className="w-7 h-7 rounded-full bg-[#2B2B2B] text-white flex items-center justify-center"><Check className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="text-[12px] font-medium flex-1 truncate">{color.name}</span>
                            <span className="text-[11px] font-mono text-zinc-500">{color.hex}</span>
                            <span className="text-[11px] text-zinc-500">est:{color.stock}</span>
                            <button onClick={()=>setEditingColorId(color.id)} className="w-7 h-7 rounded-full bg-white border border-[#E8DCC6] flex items-center justify-center"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={()=>setEditingProduct({...editingProduct, colors: editingProduct.colors.filter(c=>c.id!==color.id)})} className="w-7 h-7 rounded-full bg-white border border-red-200 text-red-600 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 bg-white border border-[#E8DCC6] rounded-full px-3 h-11">
                    <span className="w-5 h-5 rounded-full border border-white shadow-sm" style={{background:newColorDraft.hex}} />
                    <input value={newColorDraft.name} onChange={e=>setNewColorDraft({...newColorDraft, name:e.target.value})} placeholder="Nome nova cor" className="flex-1 outline-none text-[12px]" />
                    <input type="color" value={newColorDraft.hex} onChange={e=>setNewColorDraft({...newColorDraft, hex:e.target.value})} className="w-8 h-7 rounded-full border-0 p-0 overflow-hidden" />
                    <input type="number" value={newColorDraft.stock} onChange={e=>setNewColorDraft({...newColorDraft, stock: parseInt(e.target.value)||0})} className="w-14 border border-[#E8DCC6] rounded-full px-2 h-7 text-[11px]" placeholder="Est" />
                    <button onClick={()=>{
                      if(!newColorDraft.name.trim()) return;
                      const newColor: ColorOpt = { id:"c"+Date.now(), name:newColorDraft.name, hex:newColorDraft.hex, stock:newColorDraft.stock };
                      setEditingProduct({...editingProduct, colors:[...editingProduct.colors, newColor]});
                      setNewColorDraft({name:"", hex:"#B89B6A", stock:5});
                    }} className="w-7 h-7 rounded-full bg-[#B89B6A] text-white flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {/* Tamanhos P M G GG TU PS */}
              <div>
                <label className="text-[11px] text-zinc-500 tracking-wide">TAMANHOS P M G GG TU PS com estoque</label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {editingProduct.sizes.map(size=>{
                    const disabled = size.stock<=0;
                    return (
                      <div key={size.id} className={`flex items-center gap-2 border rounded-full px-3 h-10 ${disabled ? "border-zinc-200 bg-zinc-50 opacity-60" : "border-[#E8DCC6] bg-white"}`}>
                        <span className={`text-[12px] font-medium min-w-[28px] ${disabled ? "line-through" : ""}`}>{size.name}</span>
                        <input type="number" value={size.stock} onChange={e=>{
                          const newSizes = editingProduct.sizes.map(s=>s.id===size.id ? {...s, stock: parseInt(e.target.value)||0} : s);
                          setEditingProduct({...editingProduct, sizes:newSizes});
                        }} className="flex-1 h-7 px-2 rounded-full border border-[#E8DCC6] text-[11px] outline-none" />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(["P","M","G","GG","TU","PS"] as const).filter(n=>!editingProduct.sizes.find(s=>s.name===n)).map(n=>(
                    <button key={n} onClick={()=>setEditingProduct({...editingProduct, sizes:[...editingProduct.sizes, {id:"s"+Date.now()+n, name:n, stock:5}]})} className="text-[11px] px-3 h-7 rounded-full border border-[#E8DCC6] bg-white">+ {n}</button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">Trava estoque zerado: opacity 0.25 pointer-events-none line-through quando stock 0 no front</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={()=>setEditingProduct(null)} className="flex-1 h-11 rounded-full border border-[#E8DCC6] bg-white text-[13px]">Cancelar</button>
                <button onClick={()=>saveProduct(editingProduct)} className="flex-1 h-11 rounded-full bg-[#2B2B2B] text-white text-[13px] flex items-center justify-center gap-1"><Save className="w-4 h-4" /> Salvar produto</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY */}
      {editingCategory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white rounded-[20px] border border-[#E8DCC6] p-6 shadow-2xl">
            <h3 className="text-[14px] font-medium">Editar Categoria</h3>
            <div className="mt-4 space-y-3">
              <input value={editingCategory.name} onChange={e=>setEditingCategory({...editingCategory, name:e.target.value})} placeholder="Nome categoria" className="w-full h-11 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[13px]" />
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#F9F5F0] border border-[#E8DCC6] overflow-hidden flex items-center justify-center">{editingCategory.image ? <img src={editingCategory.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-zinc-400" />}</div>
                <button onClick={()=>catImageInputRef.current?.click()} className="h-9 px-4 rounded-full border border-[#E8DCC6] bg-white text-[12px]">Upload imagem</button>
                <input ref={catImageInputRef} type="file" accept="image/*" className="hidden" onChange={async e=>{
                  const f = e.target.files?.[0];
                  if(!f) return;
                  try{ const c = await compressImage(f); setEditingCategory(prev=>prev ? {...prev, image:c} : prev); }catch{}
                  e.target.value="";
                }} />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={()=>setEditingCategory(null)} className="flex-1 h-10 rounded-full border border-[#E8DCC6] text-[13px]">Cancelar</button>
              <button onClick={()=>{
                if(!editingCategory.name.trim()) return;
                if(categories.find(c=>c.id===editingCategory.id)){
                  setCategories(prev=>prev.map(c=>c.id===editingCategory.id ? editingCategory : c));
                }else{
                  setCategories(prev=>[...prev, editingCategory]);
                }
                setEditingCategory(null);
              }} className="flex-1 h-10 rounded-full bg-[#2B2B2B] text-white text-[13px]">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BANNER */}
      {editingBanner && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-[560px] my-6 bg-white rounded-[20px] border border-[#E8DCC6] p-6 shadow-2xl">
            <h3 className="text-[14px] font-medium">Editar Banner Outdoor</h3>
            <p className="text-[11px] text-zinc-500 mt-1">Banner sem botões Shop Now / Explore Collection, só texto ou só imagem se textos vazios</p>
            <div className="mt-4 space-y-4">
              <div><label className="text-[11px] text-zinc-500">TÍTULO (deixe vazio para só imagem)</label><input value={editingBanner.title} onChange={e=>setEditingBanner({...editingBanner, title:e.target.value})} className="mt-1 w-full h-10 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[13px]" /></div>
              <div><label className="text-[11px] text-zinc-500">SUBTÍTULO (deixe vazio para só imagem)</label><input value={editingBanner.subtitle} onChange={e=>setEditingBanner({...editingBanner, subtitle:e.target.value})} className="mt-1 w-full h-10 px-4 rounded-full border border-[#E8DCC6] outline-none focus:border-[#B89B6A] text-[13px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-zinc-500">IMAGEM DESKTOP</label>
                  <div className="mt-1 w-full h-28 rounded-[12px] border border-[#E8DCC6] bg-[#F9F5F0] overflow-hidden flex items-center justify-center">{editingBanner.desktopImage ? <img src={editingBanner.desktopImage} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-zinc-400" />}</div>
                  <button onClick={()=>bannerDesktopRef.current?.click()} className="mt-2 w-full h-8 rounded-full border border-[#E8DCC6] bg-white text-[11px]">Upload desktop</button>
                  <input ref={bannerDesktopRef} type="file" accept="image/*" className="hidden" onChange={async e=>{
                    const f = e.target.files?.[0]; if(!f) return; try{ const c = await compressImage(f); setEditingBanner(prev=>prev ? {...prev, desktopImage:c} : prev); }catch{} e.target.value="";
                  }} />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500">IMAGEM MOBILE</label>
                  <div className="mt-1 w-full h-28 rounded-[12px] border border-[#E8DCC6] bg-[#F9F5F0] overflow-hidden flex items-center justify-center">{editingBanner.mobileImage ? <img src={editingBanner.mobileImage} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-zinc-400" />}</div>
                  <button onClick={()=>bannerMobileRef.current?.click()} className="mt-2 w-full h-8 rounded-full border border-[#E8DCC6] bg-white text-[11px]">Upload mobile</button>
                  <input ref={bannerMobileRef} type="file" accept="image/*" className="hidden" onChange={async e=>{
                    const f = e.target.files?.[0]; if(!f) return; try{ const c = await compressImage(f); setEditingBanner(prev=>prev ? {...prev, mobileImage:c} : prev); }catch{} e.target.value="";
                  }} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={()=>setEditingBanner(null)} className="flex-1 h-10 rounded-full border border-[#E8DCC6] text-[13px]">Cancelar</button>
              <button onClick={()=>{
                if(banners.find(b=>b.id===editingBanner.id)){
                  setBanners(prev=>prev.map(b=>b.id===editingBanner.id ? editingBanner : b));
                }else{
                  setBanners(prev=>[editingBanner, ...prev]);
                }
                setEditingBanner(null);
              }} className="flex-1 h-10 rounded-full bg-[#2B2B2B] text-white text-[13px]">Salvar banner</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER with discrete ADMIN button opacity 0.18 */}
      <footer className="border-t border-[#E8DCC6]/60 bg-white/60">
        <div className="max-w-[1320px] mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="ZAYA" className="w-10 h-10 rounded-full object-cover border border-[#E8DCC6]" />
            <div>
              <p className="text-[13px] tracking-[0.2em] font-medium" style={{fontFamily:"Cormorant Garamond, serif"}}>{storeName}</p>
              <p className="text-[11px] text-zinc-500">Atemporal • Essencial • Feito para durar</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[11px] text-zinc-500">
            <span>© {new Date().getFullYear()} ZAYA</span>
            <span className="hidden md:inline">•</span>
            <span>Todos os direitos reservados</span>
            <button onClick={()=>{ if(isAdmin) setIsAdmin(false); else setShowAdminLogin(true); }} className="ml-2 opacity-[0.18] hover:opacity-60 transition text-[11px] tracking-[0.2em] border border-[#2B2B2B] rounded-full px-3 h-7">ADMIN</button>
          </div>
        </div>
      </footer>

      {/* Global notice for white screen safety */}
      <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-[5] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-[#E8DCC6] shadow-sm text-[10px] text-zinc-500 backdrop-blur">
        <span className={`w-2 h-2 rounded-full ${cloudStatus==="cloud" ? "bg-emerald-500" : cloudStatus==="checking" ? "bg-amber-400" : "bg-zinc-400"}`} />
        {cloudStatus==="cloud" ? "☁️ Nuvem • v13 definitiva" : cloudStatus==="checking" ? "⏳ Verificando..." : "💾 Local • v13 definitiva • sem tela branca"}
      </div>
    </div>
  );
}

export default function App(){
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
