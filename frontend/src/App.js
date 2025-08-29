import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate, Link, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button.jsx";
import { Input } from "./components/ui/input.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card.jsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/ui/accordion.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog.jsx";
import { Label } from "./components/ui/label.jsx";
import { Textarea } from "./components/ui/textarea.jsx";
import { Toaster } from "./components/ui/sonner.jsx";
import { toast } from "sonner";
import { Plus, Eye, LogOut, Users, FilePlus2, Save, Send } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios instance with auth
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
      toast.success("Logged in");
      nav("/n");
    } catch (e) {
      toast.error("Invalid credentials");
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
            <CardDescription>Secure login for nutritionists and patients</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@dinutri.app" required />
              </div>
              <div>
                <Label>Password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
              </div>
              <Button disabled={loading} className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white">Sign in</Button>
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
    <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/n" className="font-semibold text-slate-900">DiNutri</Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onLogout}><LogOut className="mr-2" />Logout</Button>
        </div>
      </div>
    </div>
  );
}

function NutritionistDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    api.get("/patients").then((r) => setPatients(r.data)).catch(() => {});
  }, []);

  const logout = () => { localStorage.removeItem("token"); nav("/login"); };

  const createPatient = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    // Sanitize: remove empty strings and cast numbers
    for (const k of Object.keys(payload)) {
      if (payload[k] === "") delete payload[k];
    }
    if (payload.heightCm !== undefined) payload.heightCm = Number(payload.heightCm);
    if (payload.weightKg !== undefined) payload.weightKg = Number(payload.weightKg);
    try {
      const { data } = await api.post("/patients", payload);
      toast.success("Patient created");
      setPatients([data, ...patients]);
      setShowCreate(false);
    } catch {
      toast.error("Failed to create");
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    try {
      const { data } = await api.post("/invites", { email: inviteEmail, expiresInHours: 72 });
      const inviteLink = `${window.location.origin}/invite/${data.token}`;
      navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard");
      setInviteEmail("");
    } catch { toast.error("Invite failed"); }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar onLogout={logout} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2"><Users /> Patients</h2>
          <div className="flex gap-2">
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"><Plus /> New Patient</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Patient</DialogTitle>
                </DialogHeader>
                <form onSubmit={createPatient} className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Name</Label>
                    <Input name="name" required />
                  </div>
                  <div className="col-span-2">
                    <Label>Email</Label>
                    <Input name="email" type="email" required />
                  </div>
                  <div>
                    <Label>Birth date</Label>
                    <Input name="birthDate" placeholder="YYYY-MM-DD" />
                  </div>
                  <div>
                    <Label>Sex</Label>
                    <Input name="sex" placeholder="F/M" />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input name="heightCm" type="number" step="0.1" />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input name="weightKg" type="number" step="0.1" />
                  </div>
                  <div className="col-span-2">
                    <Label>Phone</Label>
                    <Input name="phone" />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea name="notes" />
                  </div>
                  <div className="col-span-2 mt-2">
                    <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <div className="flex items-center gap-2">
              <Input value={inviteEmail} onChange={(e)=>setInviteEmail(e.target.value)} placeholder="Invite email" />
              <Button onClick={sendInvite} className="rounded-full" variant="outline">Send invite</Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {patients.map((p) => (
            <Card key={p.id} className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">{p.name}</CardTitle>
                <CardDescription>{p.email}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Link to={`/n/prescribe/${p.id}`}><Button size="sm" variant="secondary" className="rounded-full"><FilePlus2 className="mr-1" /> Prescribe</Button></Link>
                <Link to={`/p/${p.id}`}><Button size="sm" variant="outline" className="rounded-full"><Eye className="mr-1" /> Patient view</Button></Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Toaster />
    </div>
  );
}

function PrescriptionEditor() {
  const nav = useNavigate();
  const { patientId } = useParams();
  const [title, setTitle] = useState("");
  const [meals, setMeals] = useState([ { id: crypto.randomUUID(), name: "Café da Manhã", items: [], notes: "" } ]);
  const [general, setGeneral] = useState("");

  const addMeal = () => setMeals([...meals, { id: crypto.randomUUID(), name: "", items: [], notes: "" }]);
  const addItem = (mi) => {
    const copy = meals.map((m, idx) => idx === mi ? { ...m, items: [...m.items, { id: crypto.randomUUID(), description: "", amount: "", substitutions: [] }] } : m);
    setMeals(copy);
  };

  const updateMeal = (mi, patch) => {
    const copy = [...meals];
    copy[mi] = { ...copy[mi], ...patch };
    setMeals(copy);
  };
  const updateItem = (mi, ii, patch) => {
    const copy = [...meals];
    copy[mi].items[ii] = { ...copy[mi].items[ii], ...patch };
    setMeals(copy);
  };

  const save = async (status = "draft") => {
    try {
      const payload = { patientId, title, status, meals, generalNotes: general };
      const { data } = await api.post("/prescriptions", payload);
      toast.success(status === "published" ? "Published" : "Saved draft");
      if (status === "published") nav(`/p/${patientId}`);
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">New Prescription</h2>
          <div className="flex gap-2">
            <Button onClick={() => save("draft")} className="rounded-full" variant="secondary"><Save className="mr-1" /> Save Draft</Button>
            <Button onClick={() => save("published")} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"><Send className="mr-1" /> Publish</Button>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="E.g. Plano Semanal" />
            </div>

            <div className="space-y-4">
              {meals.map((m, mi) => (
                <Card key={m.id} className="rounded-xl">
                  <CardContent className="pt-6 space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <Label>Meal name</Label>
                        <Input value={m.name} onChange={(e)=>updateMeal(mi,{name:e.target.value})} placeholder="Almoço, Jantar..." />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Input value={m.notes} onChange={(e)=>updateMeal(mi,{notes:e.target.value})} placeholder="Observações" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Items</h4>
                        <Button size="sm" onClick={()=>addItem(mi)} className="rounded-full" variant="outline"><Plus className="mr-1" /> Add Item</Button>
                      </div>
                      {m.items.map((it, ii) => (
                        <div key={it.id} className="grid md:grid-cols-3 gap-3">
                          <Input value={it.description} onChange={(e)=>updateItem(mi,ii,{description:e.target.value})} placeholder="Food description" />
                          <Input value={it.amount} onChange={(e)=>updateItem(mi,ii,{amount:e.target.value})} placeholder="Amount" />
                          <Input value={(it.substitutions||[]).join(", ")} onChange={(e)=>updateItem(mi,ii,{substitutions:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} placeholder="Substitutions (comma)" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button onClick={addMeal} variant="outline" className="rounded-full"><Plus className="mr-1" /> Add Meal</Button>

            <div>
              <Label>General Notes</Label>
              <Textarea value={general} onChange={(e)=>setGeneral(e.target.value)} placeholder="Instruções gerais" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}

function PatientView() {
  const { patientId } = useParams();
  const [presc, setPresc] = useState(null);
  const [showSubs, setShowSubs] = useState(null);

  useEffect(() => {
    api.get(`/patients/${patientId}/latest`).then((r)=>setPresc(r.data)).catch(()=>{});
  }, [patientId]);

  if (!presc) return <div className="min-h-screen flex items-center justify-center">No published plan yet.</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">{presc.title}</h1>
          <Button onClick={()=>window.print()} variant="outline" className="rounded-full">Print / PDF</Button>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {presc.meals.map((m) => (
            <AccordionItem key={m.id} value={m.id}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-sm text-slate-500">{m.items.length} items</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {m.items.map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-3 border-b pb-2">
                      <div>
                        <div className="font-medium text-slate-800">{it.description} <span className="text-slate-500 font-normal">{it.amount}</span></div>
                        {m.notes && <div className="text-xs text-slate-500 mt-1">{m.notes}</div>}
                      </div>
                      {(it.substitutions && it.substitutions.length > 0) && (
                        <Dialog open={showSubs===it.id} onOpenChange={(o)=> setShowSubs(o?it.id:null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="rounded-full">Substitutions</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Substitutions</DialogTitle>
                            </DialogHeader>
                            <ul className="list-disc pl-6 space-y-1">
                              {it.substitutions.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {presc.generalNotes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>General Notes</CardTitle>
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

function InviteAccept() {
  const { token } = useParams();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    api.get(`/invites/${token}`).then((r)=>{ setInvite(r.data); setEmail(r.data.email); }).catch(()=> toast.error("Invalid invite"));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/invites/${token}/accept`, { name, password });
      toast.success("Registration complete");
      nav("/login");
    } catch { toast.error("Could not accept invite"); }
  };

  if (!invite) return <div className="min-h-screen flex items-center justify-center">Loading invite...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto pt-20 px-6">
        <Card className="rounded-2xl shadow-lg border-0">
          <CardHeader>
            <CardTitle>Complete registration</CardTitle>
            <CardDescription>for {email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e)=>setName(e.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white">Create account</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/invite/:token" element={<InviteAccept />} />
      <Route path="/n" element={<NutritionistDashboard />} />
      <Route path="/n/prescribe/:patientId" element={<PrescriptionEditor />} />
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