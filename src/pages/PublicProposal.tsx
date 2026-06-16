import { useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock, FileWarning, Loader2 } from "lucide-react";
import { gqlClient } from "../lib/graphql";
import { PUBLIC_PROPOSAL_BY_ID } from "../lib/queries/proposals";
import { proposalToSrcDoc } from "../lib/proposal-render";

interface PublicProposal {
  id: string;
  title: string;
  content: string;
  password: string | null;
  archived: boolean;
}

export default function PublicProposal() {
  const { id } = useParams<{ id: string }>();
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-proposal", id],
    queryFn: () =>
      gqlClient.request<{ proposals_by_pk: PublicProposal | null }>(
        PUBLIC_PROPOSAL_BY_ID,
        { id }
      ),
    enabled: !!id,
    retry: false,
  });

  const proposal = data?.proposals_by_pk ?? null;
  const needsPassword = !!proposal?.password;
  const canShow = !!proposal && (!needsPassword || unlocked);

  const srcDoc = useMemo(
    () => (proposal ? proposalToSrcDoc(proposal.content, proposal.title) : ""),
    [proposal]
  );

  const handleUnlock = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (proposal && input === proposal.password) {
      setUnlocked(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} /> Carregando proposta...
      </div>
    );
  }

  if (error || !proposal || proposal.archived) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-500">
          <FileWarning size={26} />
        </div>
        <h1 className="text-lg font-bold text-slate-800">
          Proposta indisponível
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          O link pode estar incorreto ou a proposta foi removida.
        </p>
      </div>
    );
  }

  if (!canShow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="mb-5 flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Lock size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {proposal.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Esta proposta é protegida. Informe a senha para visualizar.
              </p>
            </div>
          </div>
          <input
            type="password"
            value={input}
            autoFocus
            onChange={(e) => {
              setInput(e.target.value);
              setAuthError(false);
            }}
            placeholder="Senha de acesso"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          {authError && (
            <p className="mt-2 text-sm text-red-600">Senha incorreta.</p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Acessar proposta
          </button>
        </form>
      </div>
    );
  }

  return (
    <iframe
      title={proposal.title}
      srcDoc={srcDoc}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      className="h-screen w-screen border-0"
    />
  );
}
