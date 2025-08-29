import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate, Link, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button.jsx";
import { Input } from "./components/ui/input.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card.jsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/ui/accordion.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./components/ui/dialog.jsx";
import { Label } from "./components/ui/label.jsx";
import { Textarea } from "./components/ui/textarea.jsx";
import { Toaster } from "./components/ui/sonner.jsx";
import { toast } from "sonner";
import { Plus, Eye, LogOut, Users, FilePlus2, Save, Send, Copy, Trash2, Shuffle, FileStack } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select.jsx";
import { Badge } from "./components/ui/badge.jsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip.jsx";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

function useAuth() {
  const [user, setUser] = useState(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  useEffect(() => {
    if (!token) return;
    api.get("/me").then((r) => setUser(r.data)).catch(() => setUser(null));
  }, [token]);
  return { user, setUser };
}

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("pro@dinutri.app");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      const { data } = await api.post("/auth/login", form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      localStorage.setItem("token", data.access_token);
      const me = await api.get("/me");
  toast.success("Login realizado");
      if (me.data.role === "nutritionist") nav("/n");
      else if (me.data.role === "patient" && me.data.patientId) nav(`/p/${me.data.patientId}`);
      else nav("/n");
    } catch (e) {
      console.error("Login error:", e);
  const errorMessage = e.response?.data?.detail || e.response?.statusText || "Credenciais inválidas";
  toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="max-w-md mx-auto pt-24 px-6">
        <Card className="rounded-2xl shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">DiNutri</CardTitle>
            <CardDescription>Login seguro para nutricionistas e pacientes</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>E-mail</Label>
                <Input aria-label="Endereço de e-mail" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seuemail@dinutri.app" required />
              </div>
              <div>
                <Label>Senha</Label>
                <Input aria-label="Senha" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
              </div>
              <Button disabled={loading} className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}

function Topbar({ onLogout }) {
  return (
    <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b no-print">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/n" className="font-semibold text-slate-900">DiNutri</Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onLogout}><LogOut className="mr-2" />Sair</Button>
        </div>
      </div>
    </div>
  );
}

function InviteManager({ open, onOpenChange }) {
  const [email, setEmail] = useState("");
  const [preset, setPreset] = useState("7d");
  const [customHours, setCustomHours] = useState("");
  const [invites, setInvites] = useState([]);

  const loadInvites = async () => {
    try { const { data } = await api.get("/invites"); setInvites(data); } catch {}
  };
  useEffect(() => { if (open) loadInvites(); }, [open]);

  const hoursForPreset = (p) => {
    if (p === "custom") return Number(customHours || 0);
    if (p === "7d") return 7 * 24; if (p === "14d") return 14 * 24; if (p === "30d") return 30 * 24; return 72;
  };

  const createInvite = async (e) => {
    e.preventDefault();
    try {
      const hrs = hoursForPreset(preset);
      const { data } = await api.post("/invites", { email, expiresInHours: hrs });
      toast.success("Invite created");
      setEmail(""); setCustomHours(""); setPreset("7d");
      setInvites([data, ...invites]);
    } catch { toast.error("Failed"); }
  };

  const revokeInvite = async (id) => {
    try { await api.post(`/invites/${id}/revoke`); toast.success("Revoked"); loadInvites(); } catch { toast.error("Failed"); }
  };

  const copyLink = async (token) => {
    const link = `${window.location.origin}/invite/${token}`;
    try { await navigator.clipboard.writeText(link); toast.success("Invite link copied"); } catch { toast.message("Link: " + link); }
  };

  const fmt = (s) => s ? new Date(s).toLocaleString() : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="invite-desc">
        <DialogHeader>
          <DialogTitle>Convites</DialogTitle>
          <DialogDescription id="invite-desc">Crie e gerencie convites para auto cadastro de pacientes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={createInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Label>E-mail</Label>
            <Input aria-label="E-mail do convite" value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required />
          </div>
          <div>
            <Label>Expiração</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="14d">14 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="custom">Personalizado (horas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Horas personalizadas</Label>
            <Input aria-label="Expiração personalizada em horas" value={customHours} onChange={(e)=>setCustomHours(e.target.value)} type="number" min="1" placeholder="ex: 48" disabled={preset!=="custom"} />
          </div>
          <div className="sm:col-span-4">
            <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white">Criar convite</Button>
          </div>
        </form>

        <div className="mt-2">
          <h4 className="text-sm font-medium mb-2">Convites existentes</h4>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {invites.map((inv)=> (
              <Card key={inv.id} className="rounded-xl">
                <CardContent className="py-3 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                  <div className="truncate"><div className="text-slate-900 font-medium">{inv.email}</div>
                    <div className="text-xs text-slate-500">Criado por você • {fmt(inv.createdAt)}</div></div>
                  <div className="text-xs text-slate-600">Expira: {fmt(inv.expiresAt)}</div>
                  <div>
                    <Badge variant="secondary" className="capitalize">{inv.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" aria-label="Copy invite link" className="rounded-full" onClick={()=>copyLink(inv.token)}><Copy /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar link</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button size="sm" variant="outline" className="rounded-full" disabled={inv.status!=="active"} onClick={()=>revokeInvite(inv.id)}><Trash2 className="mr-1"/> Revogar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VersionsDialog({ patient, open, onOpenChange }) { /* unchanged from A */ }

function NutritionistDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [versionsFor, setVersionsFor] = useState(null);

  useEffect(() => {
    api.get("/patients").then((r) => setPatients(r.data)).catch(() => {});
  }, []);

  const logout = () => { localStorage.removeItem("token"); nav("/login"); };

  const createPatient = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    for (const k of Object.keys(payload)) { if (payload[k] === "") delete payload[k]; }
    if (payload.heightCm !== undefined) payload.heightCm = Number(payload.heightCm);
    if (payload.weightKg !== undefined) payload.weightKg = Number(payload.weightKg);
    try {
      const { data } = await api.post("/patients", payload);
      toast.success("Patient created");
      setPatients([data, ...patients]);
      setShowCreate(false);
    } catch { toast.error("Failed to create"); }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar onLogout={logout} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2"><Users /> Pacientes</h2>
          <div className="flex gap-2">
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"><Plus /> Novo paciente</Button>
              </DialogTrigger>
              <DialogContent aria-describedby="addpatient-desc" className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar paciente</DialogTitle>
                  <DialogDescription id="addpatient-desc">Crie um registro de paciente vinculado à sua conta.</DialogDescription>
                </DialogHeader>
                <form onSubmit={createPatient} className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Nome</Label>
                    <Input name="name" required />
                  </div>
                  <div className="col-span-2">
                    <Label>E-mail</Label>
                    <Input name="email" type="email" required />
                  </div>
                  <div>
                    <Label>Data de nascimento</Label>
                    <Input name="birthDate" placeholder="AAAA-MM-DD" />
                  </div>
                  <div>
                    <Label>Sexo</Label>
                    <Input name="sex" placeholder="F/M" />
                  </div>
                  <div>
                    <Label>Altura (cm)</Label>
                    <Input name="heightCm" type="number" step="0.1" />
                  </div>
                  <div>
                    <Label>Peso (kg)</Label>
                    <Input name="weightKg" type="number" step="0.1" />
                  </div>
                  <div className="col-span-2">
                    <Label>Telefone</Label>
                    <Input name="phone" />
                  </div>
                  <div className="col-span-2">
                    <Label>Observações</Label>
                    <Textarea name="notes" />
                  </div>
                  <div className="col-span-2 mt-2">
                    <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="rounded-full" onClick={()=>setShowInvite(true)}>Convites</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {patients.map((p) => (
            <Card key={p.id} className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">{p.name}</CardTitle>
                <CardDescription>{p.email}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Link to={`/n/prescribe/${p.id}`}><Button size="sm" variant="secondary" className="rounded-full"><FilePlus2 className="mr-1" /> Nova prescrição</Button></Link>
                <Link to={`/p/${p.id}`}><Button size="sm" variant="outline" className="rounded-full"><Eye className="mr-1" /> Visualizar paciente</Button></Link>
                <Button size="sm" variant="outline" className="rounded-full" onClick={()=> setVersionsFor(p)}>Versões</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <InviteManager open={showInvite} onOpenChange={setShowInvite} />
      {versionsFor && <VersionsDialog open={!!versionsFor} onOpenChange={()=> setVersionsFor(null)} patient={versionsFor} />}
      <Toaster />
    </div>
  );
}

function PrescriptionEditor() { /* unchanged from A */ }

function PatientView() {
  const { patientId } = useParams();
  const [presc, setPresc] = useState(null);
  const [showSubs, setShowSubs] = useState(null);
  const [expanded, setExpanded] = useState(() => sessionStorage.getItem(`acc-${patientId}`) || undefined);
  const triggersRef = useRef([]);

  useEffect(() => {
    api.get(`/patients/${patientId}/latest`).then((r)=>setPresc(r.data)).catch(()=>{});
  }, [patientId]);

  const onAccChange = (val) => { setExpanded(val); sessionStorage.setItem(`acc-${patientId}`, val || ""); };

  const onKeyNav = (e, idx, id) => {
    const triggers = triggersRef.current.filter(Boolean);
    if (!triggers.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); triggers[Math.min(idx+1, triggers.length-1)].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); triggers[Math.max(idx-1, 0)].focus(); }
    if (e.key === "ArrowRight") { e.preventDefault(); setExpanded(id); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setExpanded(undefined); }
  };

  if (!presc) return <div className="min-h-screen flex items-center justify-center">Nenhum plano publicado ainda.</div>;

  const pubDate = presc.publishedAt ? new Date(presc.publishedAt).toLocaleDateString() : new Date(presc.updatedAt || presc.createdAt).toLocaleDateString();

  return (
    <div className="min-h-screen bg-white print-compact">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{presc.title}</h1>
            <div className="text-sm text-slate-500">Publicado: {pubDate}</div>
          </div>
          <Button onClick={()=>window.print()} variant="outline" className="rounded-full">Imprimir / PDF</Button>
        </div>
        <Accordion type="single" collapsible value={expanded} onValueChange={onAccChange} className="w-full">
          {presc.meals.map((m, idx) => (
            <AccordionItem key={m.id} value={m.id}>
              <AccordionTrigger
                ref={(el)=> triggersRef.current[idx] = el}
                onKeyDown={(e)=> onKeyNav(e, idx, m.id)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-md">
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-sm text-slate-500">{m.items.length} itens</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card className="rounded-xl meal-section">
                  <CardContent className="space-y-2">
                    {m.items.map((it) => (
                      <div key={it.id} className="flex items-start justify-between gap-3 border-b pb-2">
                        <div>
                          <div className="font-medium text-slate-800">{it.description} <span className="text-slate-500 font-normal">{it.amount}</span></div>
                          {m.notes && <div className="text-xs text-slate-500 mt-1">{m.notes}</div>}
                        </div>
                        {(it.substitutions && it.substitutions.length > 0) && (
                          <Dialog open={showSubs===it.id} onOpenChange={(o)=> setShowSubs(o?it.id:null)}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" aria-label="View substitutions" className="rounded-full"><Shuffle /></Button>
                                  </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Substituições</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DialogContent aria-describedby={`subs-desc-${it.id}`}>
                              <DialogHeader>
                                <DialogTitle>Substituições</DialogTitle>
                                <DialogDescription id={`subs-desc-${it.id}`}>Lista de itens da dieta que você pode substituir por este alimento.</DialogDescription>
                              </DialogHeader>
                              <ul className="list-disc pl-6 space-y-1">
                                {it.substitutions.map((s, idx) => <li key={idx}>{s}</li>)}
                              </ul>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {presc.generalNotes && (
          <Card className="mt-6 meal-section">
            <CardHeader>
              <CardTitle>Observações gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">{presc.generalNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  );
}

function InviteAccept() { /* unchanged from previous C */ }

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/invite/:token" element={<InviteAccept />} />
      <Route path="/n" element={<NutritionistDashboard />} />
      <Route path="/n/prescribe/:patientId" element={<PrescriptionEditor />} />
      <Route path="/n/prescribe/:patientId/:prescriptionId" element={<PrescriptionEditor />} />
      <Route path="/p/:patientId" element={<PatientView />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="font-[Figtree]">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}

export default App;