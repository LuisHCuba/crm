import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  Landmark,
  Scale,
  Tags,
} from "lucide-react";
import Overview from "./Overview";
import Payables from "./Payables";
import ReceivablesFin from "./Receivables";
import Recurrences from "./Recurrences";
import BankAccounts from "./BankAccounts";
import Reconciliation from "./Reconciliation";
import Settings from "./Settings";

// Caminhos ABSOLUTOS sob /financeiro para evitar acúmulo de segmentos: como o
// módulo é montado numa rota splat (financeiro/*), links relativos resolveriam
// a partir do segmento já capturado pelo "*", concatenando a URL.
const tabs = [
  { to: "/financeiro", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/financeiro/pagar", label: "Contas a pagar", icon: ArrowUpCircle, end: false },
  { to: "/financeiro/receber", label: "Contas a receber", icon: ArrowDownCircle, end: false },
  { to: "/financeiro/recorrencias", label: "Recorrências", icon: Repeat, end: false },
  { to: "/financeiro/contas", label: "Contas correntes", icon: Landmark, end: false },
  { to: "/financeiro/conciliacao", label: "Conciliação", icon: Scale, end: false },
  { to: "/financeiro/cadastros", label: "Cadastros", icon: Tags, end: false },
];

export default function Financeiro() {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="px-8 pt-5">
          <h1 className="text-xl font-bold text-slate-900">Financeiro</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Gestão de contas a pagar, a receber, bancos e conciliação
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-6 pt-3">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`
              }
            >
              <t.icon size={16} />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-8">
        <Routes>
          <Route index element={<Overview />} />
          {/* Unificada com a Visão geral — redirect para links antigos. */}
          <Route path="linha-do-tempo" element={<Navigate to="/financeiro" replace />} />
          <Route path="pagar" element={<Payables />} />
          <Route path="receber" element={<ReceivablesFin />} />
          <Route path="recorrencias" element={<Recurrences />} />
          <Route path="contas" element={<BankAccounts />} />
          <Route path="conciliacao" element={<Reconciliation />} />
          <Route path="cadastros" element={<Settings />} />
          <Route path="*" element={<Navigate to="/financeiro" replace />} />
        </Routes>
      </div>
    </div>
  );
}
