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

function Login() { /* ... unchanged (omitted for brevity) ... */ }

function Topbar({ onLogout }) { /* ... unchanged (omitted for brevity) ... */ }

function InviteManager({ open, onOpenChange }) { /* ... unchanged (omitted for brevity) ... */ }

function VersionsDialog({ patient, open, onOpenChange }) {
  const [list, setList] = useState([]);
  const nav = useNavigate();

  const load = async () => {
    try { const { data } = await api.get(`/patients/${patient.id}/prescriptions`); setList(data); } catch {}
  };
  useEffect(() => { if (open && patient) load(); }, [open, patient?.id]);

  const drafts = useMemo(() => list.filter(x => x.status === 'draft').sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt)), [list]);

  const label = (p) => {
    if (p.status === 'draft') {
      const idx = drafts.findIndex(d => d.id === p.id);
      return `Draft v${idx + 1}`;
    }
    const when = p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '';
    return `Published (${when})`;
  };

  const duplicate = async (id) => {
    try { const { data } = await api.post(`/prescriptions/${id}/duplicate`); toast.success('Duplicated'); nav(`/n/prescribe/${patient.id}/${data.id}`); } catch { toast.error('Failed'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="versions-desc">
        <DialogHeader>
          <DialogTitle>Prescriptions</DialogTitle>
          <DialogDescription id="versions-desc">Drafts and published plans for {patient.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {list.map(p => (
            <Card key={p.id} className="rounded-xl">
              <CardContent className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-900">{label(p)}</div>
                  <div className="text-xs text-slate-500">{p.title}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={()=> nav(`/n/prescribe/${patient.id}/${p.id}`)}>Edit</Button>
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={()=> duplicate(p.id)}><FileStack className="mr-1"/> Duplicate</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {list.length === 0 && <div className="text-sm text-slate-500">No prescriptions yet.</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

  const createPatient = async (e) => { /* unchanged create sanitize and post */ };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar onLogout={logout} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2"><Users /> Patients</h2>
          <div className="flex gap-2">
            {/* New Patient dialog omitted for brevity (unchanged) */}
            <Button variant="outline" className="rounded-full" onClick={()=>setShowInvite(true)}>Invites</Button>
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
                <Link to={`/n/prescribe/${p.id}`}><Button size="sm" variant="secondary" className="rounded-full"><FilePlus2 className="mr-1" /> New Prescription</Button></Link>
                <Link to={`/p/${p.id}`}><Button size="sm" variant="outline" className="rounded-full"><Eye className="mr-1" /> Patient view</Button></Link>
                <Button size="sm" variant="outline" className="rounded-full" onClick={()=> setVersionsFor(p)}>Versions</Button>
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

function PrescriptionEditor() {
  const nav = useNavigate();
  const { patientId, prescriptionId } = useParams();
  const [title, setTitle] = useState("");
  const [meals, setMeals] = useState([ { id: crypto.randomUUID(), name: "Café da Manhã", items: [], notes: "" } ]);
  const [general, setGeneral] = useState("");
  const [current, setCurrent] = useState(null); // loaded prescription

  useEffect(() => {
    if (prescriptionId) {
      api.get(`/prescriptions/${prescriptionId}`).then(({data}) => {
        setCurrent(data);
        setTitle(data.title || "");
        setMeals(data.meals || []);
        setGeneral(data.generalNotes || "");
      }).catch(()=>{});
    }
  }, [prescriptionId]);

  const addMeal = () => setMeals([...meals, { id: crypto.randomUUID(), name: "", items: [], notes: "" }]);
  const addItem = (mi) => { const copy = meals.map((m, idx) => idx === mi ? { ...m, items: [...m.items, { id: crypto.randomUUID(), description: "", amount: "", substitutions: [] }] } : m); setMeals(copy); };
  const updateMeal = (mi, patch) => { const copy = [...meals]; copy[mi] = { ...copy[mi], ...patch }; setMeals(copy); };
  const updateItem = (mi, ii, patch) => { const copy = [...meals]; copy[mi].items[ii] = { ...copy[mi].items[ii], ...patch }; setMeals(copy); };

  const doDuplicate = async () => {
    try { const id = prescriptionId || current?.id; if (!id) return; const { data } = await api.post(`/prescriptions/${id}/duplicate`); toast.success('Duplicated as draft'); nav(`/n/prescribe/${patientId}/${data.id}`); } catch { toast.error('Failed'); }
  };

  const save = async (status = "draft") => {
    try {
      const payload = { patientId, title, status, meals, generalNotes: general };
      if (prescriptionId) {
        if (current && current.status === 'draft') {
          const { data } = await api.put(`/prescriptions/${prescriptionId}`, payload);
          toast.success(status === "published" ? "Published" : "Saved draft");
          if (status === "published") nav(`/p/${patientId}`);
        } else {
          // editing a published one -> always create a new record to keep history
          const { data } = await api.post("/prescriptions", payload);
          toast.success(status === "published" ? "Published" : "Draft created");
          if (status === "published") nav(`/p/${patientId}`); else nav(`/n/prescribe/${patientId}/${data.id}`);
        }
      } else {
        const { data } = await api.post("/prescriptions", payload);
        toast.success(status === "published" ? "Published" : "Saved draft");
        if (status === "published") nav(`/p/${patientId}`); else nav(`/n/prescribe/${patientId}/${data.id}`);
      }
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 no-print">
          <h2 className="text-xl font-semibold">{prescriptionId ? (current?.status === 'draft' ? 'Edit Draft' : 'Edit Published (creating new)') : 'New Prescription'}</h2>
          <div className="flex gap-2">
            {prescriptionId && <Button onClick={doDuplicate} className="rounded-full" variant="outline"><FileStack className="mr-1" /> Duplicate</Button>}
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

function PatientView() { /* ... unchanged from previous C, includes keyboard nav & substitutions icon ... */ }

function InviteAccept() { /* ... unchanged from previous C ... */ }

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