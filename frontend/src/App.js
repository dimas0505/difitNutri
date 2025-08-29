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
      toast.success("Logged in");
      if (me.data.role === "nutritionist") nav("/n");
      else if (me.data.role === "patient" && me.data.patientId) nav(`/p/${me.data.patientId}`);
      else nav("/n");
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
                <Input aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@dinutri.app" required />
              </div>
              <div>
                <Label>Password</Label>
                <Input aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
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
    <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b no-print">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/n" className="font-semibold text-slate-900">DiNutri</Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onLogout}><LogOut className="mr-2" />Logout</Button>
        </div>
      </div>
    </div>
  );
}

function InviteManager({ open, onOpenChange }) { /* unchanged from previous C */ }
function VersionsDialog({ patient, open, onOpenChange }) { /* unchanged from A */ }
function NutritionistDashboard() { /* unchanged from A */ }
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

  if (!presc) return <div className="min-h-screen flex items-center justify-center">No published plan yet.</div>;

  const pubDate = presc.publishedAt ? new Date(presc.publishedAt).toLocaleDateString() : new Date(presc.updatedAt || presc.createdAt).toLocaleDateString();

  return (
    <div className="min-h-screen bg-white print-compact">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{presc.title}</h1>
            <div className="text-sm text-slate-500">Published: {pubDate}</div>
          </div>
          <Button onClick={()=>window.print()} variant="outline" className="rounded-full">Print / PDF</Button>
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
                  <span className="text-sm text-slate-500">{m.items.length} items</span>
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
                                <TooltipContent>Substitutions</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DialogContent aria-describedby={`subs-desc-${it.id}`}>
                              <DialogHeader>
                                <DialogTitle>Substitutions</DialogTitle>
                                <DialogDescription id={`subs-desc-${it.id}`}>List of diet items you can substitute for this food.</DialogDescription>
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