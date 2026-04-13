import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Toaster } from "@/components/ui/Toast";
import LoginPage from "@/pages/auth/LoginPage";
import RecoverPasswordPage from "@/pages/auth/RecoverPasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import { ProjetosPage } from "@/pages/projetos/ProjetosPage";
import { ProjetoDetailPage } from "@/pages/projetos/ProjetoDetailPage";
import { TodasTarefasPage } from "@/pages/projetos/TodasTarefasPage";
import { MinhasTarefasPage } from "@/pages/projetos/MinhasTarefasPage";
import { KanbanGeralPage } from "@/pages/projetos/KanbanGeralPage";
import { TimelineGeralPage } from "@/pages/projetos/TimelineGeralPage";
import { PipelinesPage } from "@/pages/config/PipelinesPage";
import { CategoriasPage } from "@/pages/config/CategoriasPage";
import { LogPage } from "@/pages/config/LogPage";
import { LembretesPage } from "@/pages/lembretes/LembretesPage";
import { PerfilPage } from "@/pages/perfil/PerfilPage";
import { UsuariosPage } from "@/pages/usuarios/UsuariosPage";
import { NegociosPage } from "@/pages/negocios/NegociosPage";
import { NegocioDetailPage } from "@/pages/negocios/NegocioDetailPage";
import { ContasReceberPage } from "@/pages/financeiro/ContasReceberPage";
import { ContaReceberDetailPage } from "@/pages/financeiro/ContaReceberDetailPage";
import { ContasPagarPage } from "@/pages/financeiro/ContasPagarPage";
import { ContaPagarDetailPage } from "@/pages/financeiro/ContaPagarDetailPage";
import { ContasBancariasPage } from "@/pages/financeiro/ContasBancariasPage";
import { ContaBancariaDetailPage } from "@/pages/financeiro/ContaBancariaDetailPage";
import { EmpresasPage } from "@/pages/empresas/EmpresasPage";
import { EmpresaDetailPage } from "@/pages/empresas/EmpresaDetailPage";
import { ContatosPage } from "@/pages/contatos/ContatosPage";
import { ContatoDetailPage } from "@/pages/contatos/ContatoDetailPage";
import { ProdutosPage } from "@/pages/produtos/ProdutosPage";
import { ProdutoDetailPage } from "@/pages/produtos/ProdutoDetailPage";

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="empresas" element={<EmpresasPage />} />
          <Route path="empresas/:id" element={<EmpresaDetailPage />} />
          <Route path="contatos" element={<ContatosPage />} />
          <Route path="contatos/:id" element={<ContatoDetailPage />} />
          <Route path="produtos" element={<ProdutosPage />} />
          <Route path="produtos/:id" element={<ProdutoDetailPage />} />
          <Route path="negocios" element={<NegociosPage />} />
          <Route path="negocios/:id" element={<NegocioDetailPage />} />
          <Route path="projetos" element={<ProjetosPage />} />
          <Route path="projetos/tarefas" element={<TodasTarefasPage />} />
          <Route path="projetos/minhas-tarefas" element={<MinhasTarefasPage />} />
          <Route path="projetos/kanban" element={<KanbanGeralPage />} />
          <Route path="projetos/timeline" element={<TimelineGeralPage />} />
          <Route path="projetos/:id" element={<ProjetoDetailPage />} />
          <Route path="lembretes" element={<LembretesPage />} />
          <Route path="contas-receber" element={<ContasReceberPage />} />
          <Route path="contas-receber/:id" element={<ContaReceberDetailPage />} />
          <Route path="contas-pagar" element={<ContasPagarPage />} />
          <Route path="contas-pagar/:id" element={<ContaPagarDetailPage />} />
          <Route path="contas-bancarias" element={<ContasBancariasPage />} />
          <Route path="contas-bancarias/:id" element={<ContaBancariaDetailPage />} />
          <Route path="config/pipelines" element={<PipelinesPage />} />
          <Route path="config/categorias" element={<CategoriasPage />} />
          <Route path="config/log" element={<LogPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="config/usuarios" element={<UsuariosPage />} />
        </Route>
      </Route>
    </Routes>
    <Toaster richColors closeButton />
    </>
  );
}
