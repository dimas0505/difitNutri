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
import { Plus, Eye, LogOut, Users, FilePlus2, Save, Send, Copy, Trash2, Shuffle, FileStack, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select.jsx";
import { Badge } from "./components/ui/badge.jsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip.jsx";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
// Usar caminho relativo /api quando BACKEND_URL não estiver definido (usa proxy ou mesmo origin)
// Para HTTPS preview, isso evita Mixed Content
const API = BACKEND_URL ? `${BACKEND_URL}/api` : `/api`;

console.log('🔧 Configuração do API:');
console.log('  REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
console.log('  BACKEND_URL:', BACKEND_URL);
console.log('  API baseURL:', API);
console.log('  window.location:', window.location.href);
console.log('  Protocolo:', window.location.protocol);

// Detectar se estamos em ambiente HTTPS
const isHTTPS = window.location.protocol === 'https:';
console.log('  🔒 HTTPS detectado:', isHTTPS);
if (isHTTPS && BACKEND_URL && BACKEND_URL.startsWith('http:')) {
  console.warn('⚠️ MIXED CONTENT: Página HTTPS tentando acessar backend HTTP!');
  console.log('  💡 Usando proxy relativo /api para contornar');
}

const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  console.log('📤 Requisição API:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
    headers: Object.keys(config.headers || {})
  });
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('✅ Resposta API:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ Erro API:', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'N/A',
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'Sem resposta do servidor'
    });
    return Promise.reject(error);
  }
);

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
  const [email, setEmail] = useState("nutricionista@teste.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('🚀 Iniciando processo de login...');
    console.log('📋 Dados:', { email, senha: '***', API_URL: API });
    
    try {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      
      console.log('🔁 Enviando login para', API + '/auth/login');
      console.log('📦 Form data:', { username: email, password: '***' });
      
      const resp = await api.post("/auth/login", form, { 
        headers: { "Content-Type": "application/x-www-form-urlencoded" } 
      });
      
      console.log('✅ Login bem-sucedido:', resp.status, resp.data);
      const data = resp.data;
      localStorage.setItem("token", data.access_token);
      
      console.log('🔍 Verificando dados do usuário...');
      const me = await api.get("/me");
      console.log('👤 Dados do usuário:', me.data);
      
      toast.success("Login realizado");
      if (me.data.role === "nutritionist") nav("/n");
      else if (me.data.role === "patient" && me.data.patientId) nav(`/p/${me.data.patientId}`);
      else nav("/n");
    } catch (err) {
      console.error('❌ Erro no login:', err?.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.detail || err.response?.statusText || err.message || "Credenciais inválidas";
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

function VersionsDialog({ patient, open, onOpenChange }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !patient) return;
    setLoading(true);
    api.get(`/patients/${patient.id}/prescriptions`)
      .then((r) => setPrescriptions(r.data))
      .catch(() => toast.error("Erro ao carregar prescrições"))
      .finally(() => setLoading(false));
  }, [open, patient]);

  const duplicatePresc = async (prescId) => {
    try {
      await api.post(`/prescriptions/${prescId}/duplicate`);
      toast.success("Prescrição duplicada");
      // Recarregar lista
      const { data } = await api.get(`/patients/${patient.id}/prescriptions`);
      setPrescriptions(data);
    } catch {
      toast.error("Erro ao duplicar prescrição");
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" aria-describedby="versions-desc">
        <DialogHeader>
          <DialogTitle>Versões de prescrições - {patient.name}</DialogTitle>
          <DialogDescription id="versions-desc">
            Visualize e gerencie todas as versões de prescrições para este paciente.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center">Carregando...</div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-3">
            {prescriptions.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                Nenhuma prescrição encontrada para este paciente.
              </div>
            ) : (
              prescriptions.map((presc) => (
                <Card key={presc.id} className="rounded-xl">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{presc.title}</div>
                        <div className="text-sm text-slate-500">
                          {presc.status === 'published' ? (
                            <Badge variant="default" className="mr-2">Publicada</Badge>
                          ) : (
                            <Badge variant="secondary" className="mr-2">Rascunho</Badge>
                          )}
                          {presc.status === 'published' && presc.publishedAt 
                            ? `Publicada em ${new Date(presc.publishedAt).toLocaleDateString()}`
                            : `Criada em ${new Date(presc.createdAt).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/n/prescribe/${patient.id}/${presc.id}`}>
                          <Button size="sm" variant="outline" className="rounded-full">
                            <FilePlus2 className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-full"
                          onClick={() => duplicatePresc(presc.id)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Duplicar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
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

function PrescriptionEditor() {
  const { patientId, prescriptionId } = useParams();
  const nav = useNavigate();
  const [patient, setPatient] = useState(null);
  const [prescription, setPrescription] = useState({
    title: "",
    status: "draft",
    meals: [],
    generalNotes: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carregar dados do paciente
    api.get(`/patients/${patientId}`)
      .then((r) => setPatient(r.data))
      .catch(() => {
        toast.error("Paciente não encontrado");
        nav("/n");
      });

    // Se está editando uma prescrição existente
    if (prescriptionId) {
      api.get(`/prescriptions/${prescriptionId}`)
        .then((r) => setPrescription(r.data))
        .catch(() => toast.error("Prescrição não encontrada"));
    }
  }, [patientId, prescriptionId, nav]);

  const addMeal = () => {
    const newMeal = {
      id: `meal-${Date.now()}`,
      name: "",
      items: [],
      notes: ""
    };
    setPrescription(prev => ({
      ...prev,
      meals: [...prev.meals, newMeal]
    }));
  };

  const updateMeal = (mealId, field, value) => {
    setPrescription(prev => ({
      ...prev,
      meals: prev.meals.map(meal => 
        meal.id === mealId ? { ...meal, [field]: value } : meal
      )
    }));
  };

  const removeMeal = (mealId) => {
    setPrescription(prev => ({
      ...prev,
      meals: prev.meals.filter(meal => meal.id !== mealId)
    }));
  };

  const addItem = (mealId) => {
    const newItem = {
      id: `item-${Date.now()}`,
      description: "",
      amount: "",
      substitutions: []
    };
    setPrescription(prev => ({
      ...prev,
      meals: prev.meals.map(meal => 
        meal.id === mealId 
          ? { ...meal, items: [...meal.items, newItem] }
          : meal
      )
    }));
  };

  const updateItem = (mealId, itemId, field, value) => {
    setPrescription(prev => ({
      ...prev,
      meals: prev.meals.map(meal => 
        meal.id === mealId 
          ? {
              ...meal,
              items: meal.items.map(item => 
                item.id === itemId ? { ...item, [field]: value } : item
              )
            }
          : meal
      )
    }));
  };

  const removeItem = (mealId, itemId) => {
    setPrescription(prev => ({
      ...prev,
      meals: prev.meals.map(meal => 
        meal.id === mealId 
          ? { ...meal, items: meal.items.filter(item => item.id !== itemId) }
          : meal
      )
    }));
  };

  const updateSubstitutions = (mealId, itemId, substitutions) => {
    const subsArray = substitutions.split('\n').filter(s => s.trim()).map(s => s.trim());
    updateItem(mealId, itemId, 'substitutions', subsArray);
  };

  const saveDraft = async () => {
    if (!prescription.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...prescription,
        patientId,
        status: "draft"
      };

      if (prescriptionId) {
        await api.put(`/prescriptions/${prescriptionId}`, payload);
        toast.success("Rascunho salvo");
      } else {
        const { data } = await api.post("/prescriptions", payload);
        nav(`/n/prescribe/${patientId}/${data.id}`, { replace: true });
        toast.success("Rascunho criado");
      }
    } catch {
      toast.error("Erro ao salvar rascunho");
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!prescription.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (prescription.meals.length === 0) {
      toast.error("Adicione pelo menos uma refeição");
      return;
    }

    setLoading(true);
    try {
      let prescId = prescriptionId;
      
      // Se não existe, criar primeiro como rascunho
      if (!prescId) {
        const { data } = await api.post("/prescriptions", {
          ...prescription,
          patientId,
          status: "draft"
        });
        prescId = data.id;
      } else {
        // Atualizar rascunho existente
        await api.put(`/prescriptions/${prescId}`, {
          ...prescription,
          patientId,
          status: "draft"
        });
      }

      // Publicar
      await api.post(`/prescriptions/${prescId}/publish`);
      toast.success("Prescrição publicada");
      nav("/n");
    } catch {
      toast.error("Erro ao publicar prescrição");
    } finally {
      setLoading(false);
    }
  };

  const duplicate = async () => {
    if (!prescriptionId) {
      toast.error("Salve a prescrição primeiro");
      return;
    }

    try {
      const { data } = await api.post(`/prescriptions/${prescriptionId}/duplicate`);
      nav(`/n/prescribe/${patientId}/${data.id}`);
      toast.success("Prescrição duplicada");
    } catch {
      toast.error("Erro ao duplicar prescrição");
    }
  };

  if (!patient) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar onLogout={() => { localStorage.removeItem("token"); nav("/login"); }} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {prescriptionId ? "Editar prescrição" : "Nova prescrição"}
              </h1>
              <p className="text-slate-600">Paciente: {patient.name}</p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="rounded-full"
                onClick={() => nav("/n")}
              >
                Cancelar
              </Button>
              <Button 
                variant="outline" 
                className="rounded-full"
                onClick={saveDraft}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-1" />
                Salvar rascunho
              </Button>
              {prescriptionId && (
                <Button 
                  variant="outline" 
                  className="rounded-full"
                  onClick={duplicate}
                  disabled={loading}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Duplicar
                </Button>
              )}
              <Button 
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={publish}
                disabled={loading}
              >
                <Send className="w-4 h-4 mr-1" />
                Publicar
              </Button>
            </div>
          </div>

          <Card className="rounded-2xl">
            <CardContent className="py-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título da prescrição</Label>
                  <Input
                    id="title"
                    value={prescription.title}
                    onChange={(e) => setPrescription(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Plano nutricional - Semana 1"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {prescription.meals.map((meal, mealIndex) => (
            <Card key={meal.id} className="rounded-2xl">
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 mr-4">
                    <Label htmlFor={`meal-name-${meal.id}`}>Nome da refeição</Label>
                    <Input
                      id={`meal-name-${meal.id}`}
                      value={meal.name}
                      onChange={(e) => updateMeal(meal.id, 'name', e.target.value)}
                      placeholder="Ex: Café da manhã, Almoço, Jantar..."
                      className="mt-1"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMeal(meal.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {meal.items.map((item, itemIndex) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`item-desc-${item.id}`}>Descrição</Label>
                              <Input
                                id={`item-desc-${item.id}`}
                                value={item.description}
                                onChange={(e) => updateItem(meal.id, item.id, 'description', e.target.value)}
                                placeholder="Ex: Pão integral, Frango grelhado..."
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`item-amount-${item.id}`}>Quantidade</Label>
                              <Input
                                id={`item-amount-${item.id}`}
                                value={item.amount}
                                onChange={(e) => updateItem(meal.id, item.id, 'amount', e.target.value)}
                                placeholder="Ex: 2 fatias, 150g, 1 xícara..."
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`item-subs-${item.id}`}>Substituições (uma por linha)</Label>
                            <Textarea
                              id={`item-subs-${item.id}`}
                              value={item.substitutions.join('\n')}
                              onChange={(e) => updateSubstitutions(meal.id, item.id, e.target.value)}
                              placeholder="Ex:&#10;Pão de centeio&#10;Torrada integral&#10;Tapioca"
                              className="mt-1"
                              rows={3}
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(meal.id, item.id)}
                          className="ml-3 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-dashed"
                    onClick={() => addItem(meal.id)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar item
                  </Button>
                </div>

                <div className="mt-4">
                  <Label htmlFor={`meal-notes-${meal.id}`}>Observações da refeição</Label>
                  <Textarea
                    id={`meal-notes-${meal.id}`}
                    value={meal.notes}
                    onChange={(e) => updateMeal(meal.id, 'notes', e.target.value)}
                    placeholder="Observações específicas para esta refeição..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full rounded-full border-dashed py-8"
            onClick={addMeal}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar refeição
          </Button>

          <Card className="rounded-2xl">
            <CardContent className="py-6">
              <div>
                <Label htmlFor="general-notes">Observações gerais</Label>
                <Textarea
                  id="general-notes"
                  value={prescription.generalNotes}
                  onChange={(e) => setPrescription(prev => ({ ...prev, generalNotes: e.target.value }))}
                  placeholder="Observações gerais sobre a prescrição, orientações importantes..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

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
      {/* Print Header - visible only on print */}
      <div className="hidden print:block print-header">
        <div className="print-logo">DiNutri</div>
        <div className="print-nutritionist-info">
          <div>Sistema de Prescrições Nutricionais</div>
          <div>www.dinutri.com</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4 no-print">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 print-title">{presc.title}</h1>
            <div className="text-sm text-slate-500 print-small">Publicado: {pubDate}</div>
          </div>
          <Button onClick={()=>window.print()} variant="outline" className="rounded-full no-print">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / PDF
          </Button>
        </div>

        {/* Print-only title */}
        <div className="hidden print:block print-patient-info mb-6">
          <h1 className="print-title">{presc.title}</h1>
          <div className="print-small">Data de publicação: {pubDate}</div>
        </div>

        <Accordion type="single" collapsible value={expanded} onValueChange={onAccChange} className="w-full">
          {presc.meals.map((m, idx) => (
            <AccordionItem key={m.id} value={m.id}>
              <AccordionTrigger
                ref={(el)=> triggersRef.current[idx] = el}
                onKeyDown={(e)=> onKeyNav(e, idx, m.id)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-md no-print">
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-sm text-slate-500">{m.items.length} itens</span>
                </div>
              </AccordionTrigger>
              
              {/* Print-only meal header */}
              <div className="hidden print:block">
                <h2 className="print-subtitle">{m.name}</h2>
              </div>

              <AccordionContent className="print:!block">
                <Card className="rounded-xl meal-section">
                  <CardContent className="space-y-2">
                    {m.items.map((it) => (
                      <div key={it.id} className="flex items-start justify-between gap-3 border-b pb-2 food-item">
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 food-item-name">
                            {it.description} 
                            <span className="text-slate-500 font-normal food-item-details"> — {it.amount}</span>
                          </div>
                          {m.notes && <div className="text-xs text-slate-500 mt-1 food-item-details">{m.notes}</div>}
                          
                          {/* Print substitutions inline */}
                          {(it.substitutions && it.substitutions.length > 0) && (
                            <div className="hidden print:block substitutions mt-2">
                              <div className="text-xs font-medium text-slate-600">Substituições:</div>
                              <ul className="text-xs text-slate-500 list-disc ml-4">
                                {it.substitutions.map((s, idx) => <li key={idx}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {/* Interactive substitutions button - hidden on print */}
                        {(it.substitutions && it.substitutions.length > 0) && (
                          <Dialog open={showSubs===it.id} onOpenChange={(o)=> setShowSubs(o?it.id:null)}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" aria-label="View substitutions" className="rounded-full no-print">
                                      <Shuffle className="w-4 h-4" />
                                    </Button>
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
          <Card className="mt-6 meal-section prescription-notes">
            <CardHeader className="no-print">
              <CardTitle>Observações gerais</CardTitle>
            </CardHeader>
            <div className="hidden print:block">
              <h3 className="print-subtitle">Observações gerais</h3>
            </div>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap print-text">{presc.generalNotes}</p>
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
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    sex: "",
    heightCm: "",
    weightKg: "",
    phone: "",
    notes: ""
  });

  useEffect(() => {
    api.get(`/invites/${token}`)
      .then((r) => {
        setInvite(r.data);
        if (r.data.email) {
          setFormData(prev => ({ ...prev, email: r.data.email }));
        }
      })
      .catch(() => {
        toast.error("Convite inválido ou expirado");
        nav("/login");
      })
      .finally(() => setLoading(false));
  }, [token, nav]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        birthDate: formData.birthDate || null,
        sex: formData.sex || null,
        heightCm: formData.heightCm ? Number(formData.heightCm) : null,
        weightKg: formData.weightKg ? Number(formData.weightKg) : null,
        phone: formData.phone || null,
        notes: formData.notes || null
      };

      const { data } = await api.post(`/invites/${token}/accept`, payload);
      toast.success("Cadastro realizado com sucesso!");
      
      // Fazer login automático
      const loginForm = new URLSearchParams();
      loginForm.append("username", formData.email);
      loginForm.append("password", formData.password);
      
      const loginResp = await api.post("/auth/login", loginForm, { 
        headers: { "Content-Type": "application/x-www-form-urlencoded" } 
      });
      
      localStorage.setItem("token", loginResp.data.access_token);
      
      // Redirecionar para área do paciente
      if (data.patientId) {
        nav(`/p/${data.patientId}`);
      } else {
        nav("/login");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Erro ao processar cadastro";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (!invite || invite.status !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center">
        <Card className="rounded-2xl shadow-lg border-0 max-w-md mx-4">
          <CardContent className="py-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Convite Inválido</h2>
            <p className="text-slate-600 mb-4">
              Este convite não é válido ou já foi utilizado.
            </p>
            <Button 
              onClick={() => nav("/login")}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Card className="rounded-2xl shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">Bem-vindo ao DiNutri</CardTitle>
            <CardDescription>
              Complete seu cadastro para acessar suas prescrições nutricionais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900">Dados pessoais</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="seu@email.com"
                      disabled={!!invite.email}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      placeholder="Confirme sua senha"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Dados físicos */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900">Informações físicas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthDate">Data de nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => updateField('birthDate', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sex">Sexo</Label>
                    <Select value={formData.sex} onValueChange={(value) => updateField('sex', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="heightCm">Altura (cm)</Label>
                    <Input
                      id="heightCm"
                      type="number"
                      step="0.1"
                      value={formData.heightCm}
                      onChange={(e) => updateField('heightCm', e.target.value)}
                      placeholder="Ex: 170"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="weightKg">Peso (kg)</Label>
                    <Input
                      id="weightKg"
                      type="number"
                      step="0.1"
                      value={formData.weightKg}
                      onChange={(e) => updateField('weightKg', e.target.value)}
                      placeholder="Ex: 70.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900">Informações adicionais</h3>
                
                <div>
                  <Label htmlFor="notes">Observações, alergias, restrições alimentares</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Conte-nos sobre alergias, intolerâncias, preferências alimentares, objetivos..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit"
                  className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={submitting}
                >
                  {submitting ? "Criando conta..." : "Finalizar cadastro"}
                </Button>
              </div>
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