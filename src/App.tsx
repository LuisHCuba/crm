import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Deals from "./pages/Deals";
import DealDetail from "./pages/DealDetail";
import Products from "./pages/Products";
import Propostas from "./pages/Propostas";
import PublicProposal from "./pages/PublicProposal";
import Forms from "./pages/Forms";
import { FormDetailLayout } from "./pages/FormDetailLayout";
import FormOverview from "./pages/FormOverview";
import FormSubmissions from "./pages/FormSubmissions";
import FormBuilder from "./pages/FormBuilder";
import PublicForm from "./pages/PublicForm";
import Financeiro from "./pages/financeiro/Financeiro";
import Profile from "./pages/Profile";
import Users from "./pages/Users";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Página pública da proposta — fora do Layout e sem login. */}
      <Route path="/p/:id" element={<PublicProposal />} />
      {/* Formulário público (conversacional) — fora do Layout e sem login. */}
      <Route path="/f/:id" element={<PublicForm />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="contatos" element={<Contacts />} />
        <Route path="contatos/:id" element={<ContactDetail />} />
        <Route path="empresas" element={<Companies />} />
        <Route path="empresas/:id" element={<CompanyDetail />} />
        <Route path="negocios" element={<Deals />} />
        <Route path="negocios/:id" element={<DealDetail />} />
        <Route path="produtos" element={<Products />} />
        <Route path="propostas" element={<Propostas />} />
        <Route path="formularios" element={<Forms />} />
        <Route path="formularios/:id" element={<FormDetailLayout />}>
          <Route index element={<FormOverview />} />
          <Route path="respostas" element={<FormSubmissions />} />
          <Route path="editar" element={<FormBuilder />} />
        </Route>
        <Route path="financeiro/*" element={<Financeiro />} />
        <Route path="usuarios" element={<Users />} />
        <Route path="perfil" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
