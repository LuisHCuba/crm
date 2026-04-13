# Mapa de telas do sistema

Documento para geração de interface. Cada tela descreve: layout, elementos visíveis, campos, ações, navegação e conexões com outras telas.

Referências visuais: Notion (sidebar, workspace), HubSpot (fichas, timeline, kanban), OMIE (tabelas com filtros dinâmicos).

---

## Layout global (presente em todas as telas)

### Sidebar (menu lateral esquerdo)

- Colapsável: dois estados
  - **Expandida**: ícone + texto do item
  - **Minimizada**: só ícone; ao passar o mouse sobre um grupo, exibe popover/flyout com os itens daquele grupo
- Estado salvo por usuário (persiste entre sessões)
- Logo no topo
- Grupos e itens:

```
CRM
  - Dashboard
  - Empresas
  - Contatos
  - Negócios
  - Produtos
  - Lembretes

Projetos
  - Lista de projetos
  - Todas as tarefas
  - Kanban geral
  - Timeline geral
  - Minhas tarefas

Financeiro
  - Contas a receber
  - Contas a pagar
  - Contas bancárias

Configurações
  - Pipelines
  - Categorias financeiras
  - Log de atividades
```

### Topbar (barra superior)

- **Busca global** (campo com atalho Ctrl+K / Cmd+K): abre command palette; resultados agrupados por tipo de objeto (Empresas, Contatos, Negócios, Produtos, Projetos, Tarefas, Contas a receber, Contas a pagar)
- **Toggle de tema** (dark/light)
- **Avatar do usuário** com dropdown: nome, e-mail, sair

### Área principal

- Ocupa o restante da tela à direita da sidebar e abaixo da topbar
- O conteúdo muda conforme a tela ativa

---

## Tela 01 — Login

- **Rota**: `/login`
- **Quando aparece**: usuário não autenticado
- **Elementos**:
  - Logo centralizado
  - Campo: E-mail (input texto, obrigatório)
  - Campo: Senha (input password, obrigatório)
  - Botão: "Entrar"
  - Link: "Esqueci minha senha" → abre tela de recuperação
  - Separador: "ou"
  - Botão: "Entrar com Google" (OAuth)
- **Ações**:
  - Entrar → valida credenciais → redireciona para Dashboard
  - Google → OAuth flow → redireciona para Dashboard
- **Sem sidebar nem topbar** (tela isolada)

---

## Tela 02 — Recuperação de senha

- **Rota**: `/recuperar-senha`
- **Elementos**:
  - Campo: E-mail
  - Botão: "Enviar link de recuperação"
  - Mensagem de sucesso: "E-mail enviado, verifique sua caixa"
  - Link: "Voltar para o login"
- **Sem sidebar nem topbar**

---

## Tela 03 — Dashboard

- **Rota**: `/`
- **Título da página**: "Dashboard"
- **Widgets (grid responsivo, 3 colunas em desktop, 1 em mobile)**:

| Widget | Conteúdo | Clique |
|--------|----------|--------|
| Funil de negócios | Quantidade + valor total por estágio do pipeline ativo (mini barras horizontais) | Vai para /negocios (kanban) |
| Contas a receber vencendo | Total pendente vencendo nos próximos 7 dias + total atrasado em vermelho | Vai para /contas-receber?status=pendente |
| Contas a pagar vencendo | Total pendente vencendo nos próximos 7 dias + total atrasado | Vai para /contas-pagar?status=pendente |
| Lembretes pendentes | Contagem (hoje + atrasados) + lista curta dos 3 mais urgentes | Vai para /lembretes |
| Saldo das contas bancárias | Nome de cada conta + saldo atual; total consolidado no rodapé | Vai para /contas-bancarias |
| Projetos em andamento | Quantidade de projetos ativos + atrasados; barra de progresso dos 3 mais recentes | Vai para /projetos |

---

## Tela 04 — Lista de Empresas

- **Rota**: `/empresas`
- **Título**: "Empresas"
- **Barra de ações (topo)**:
  - Filtros dinâmicos (estilo OMIE): chips/pills ativos acima da tabela
    - Filtro por Tipo (Cliente / Fornecedor / Ambos)
    - Filtro por Responsável (dropdown com busca)
    - Busca por texto (Razão social, Nome fantasia, CNPJ)
  - Botão: "Salvar visão" (salva combinação de filtros como visão reutilizável)
  - Botão: "+ Nova empresa" (abre formulário de criação)
  - Toggle: "Mostrar arquivados"
- **Tabela (DataTable)**:
  - Colunas: Razão social, Nome fantasia, CNPJ, Tipo (badge), Telefone, Responsável
  - Cada header de coluna clicável para ordenar (asc/desc) e abrir filtro específico da coluna
  - Paginação no rodapé
  - Clique na linha → vai para Ficha da Empresa

---

## Tela 05 — Ficha da Empresa

- **Rota**: `/empresas/:id`
- **Cabeçalho**:
  - Razão social (título grande)
  - Badge de tipo (Cliente / Fornecedor / Ambos)
  - CNPJ
  - Botão: "Editar" (abre formulário preenchido)
  - Botão: "Arquivar" (soft delete com confirmação)
- **Sidebar direita (painel lateral de dados)**:
  - Responsável (nome clicável)
  - Telefone
  - E-mail
  - Endereço
  - Resumo financeiro: total a receber (pendente), total a pagar (pendente), saldo líquido
- **Abas no corpo principal**:
  1. **Atividades** (padrão): timeline cronológica reversa (mais recente no topo). Cada item mostra tipo (lembrete/nota/ligação/reunião/e-mail), quem criou, data/hora, conteúdo. Botão "+ Atividade" no topo com dropdown: Lembrete, Nota, Ligação, Reunião, E-mail
  2. **Contatos**: lista dos contatos vinculados (nome, cargo, e-mail, telefone). Botão "+ Vincular contato" (combobox com busca) e "+ Novo contato"
  3. **Negócios**: tabela com negócios da empresa (título, valor, estágio/badge, responsável). Clique vai para ficha do negócio
  4. **Projetos**: projetos derivados dos negócios da empresa (título, progresso/barra, status/badge, responsáveis). Clique vai para ficha do projeto
  5. **Financeiro**: duas sub-tabelas — Contas a receber + Contas a pagar. Cada uma com colunas: descrição, valor, parcela, vencimento, status/badge. Totais no rodapé de cada tabela
  6. **Histórico**: log de todas as alterações deste registro (data, usuário, ação, campo, valor anterior → novo)

---

## Tela 06 — Formulário: Nova/Editar Empresa

- **Aparece como**: drawer lateral (painel que desliza da direita) ou modal grande
- **Campos**:
  - Razão social (texto, obrigatório)
  - Nome fantasia (texto)
  - CNPJ / documento (texto, obrigatório, validação de formato, unicidade)
  - Telefone (input telefone)
  - E-mail (input e-mail)
  - Endereço (textarea)
  - Tipo (select: Cliente, Fornecedor, Ambos — obrigatório)
  - Responsável (combobox com busca de usuários)
- **Botões**: "Salvar" / "Cancelar"
- **Na edição**: campos preenchidos com dados atuais

---

## Tela 07 — Lista de Contatos

- **Rota**: `/contatos`
- **Título**: "Contatos"
- **Barra de ações**: mesma estrutura das Empresas
  - Filtros: Estágio (Novo / Qualificado / Cliente ativo / Inativo), Empresa, Responsável, Origem
  - Busca por nome ou e-mail
  - Botão: "+ Novo contato"
  - Toggle: "Mostrar arquivados"
- **Tabela**:
  - Colunas: Nome completo, E-mail, Telefone, Empresa(s), Cargo, Estágio (badge), Responsável
  - Clique → Ficha do Contato

---

## Tela 08 — Ficha do Contato

- **Rota**: `/contatos/:id`
- **Cabeçalho**: Nome completo, badge de estágio, cargo
- **Sidebar direita**: Telefone, E-mail, Origem, Responsável
- **Abas**:
  1. **Atividades**: timeline (mesmo padrão da empresa)
  2. **Empresas**: lista de empresas vinculadas (N:N). Botão "+ Vincular empresa"
  3. **Negócios**: negócios onde este contato está vinculado
  4. **Histórico**: log de alterações

---

## Tela 09 — Formulário: Novo/Editar Contato

- **Drawer lateral**
- **Campos**: Nome completo, E-mail, Telefone/WhatsApp, Cargo, Empresas (combobox multi-select com busca), Origem (select), Estágio (select), Responsável (combobox)
- **Botões**: "Salvar" / "Cancelar"

---

## Tela 10 — Lista de Produtos

- **Rota**: `/produtos`
- **Título**: "Produtos"
- **Barra de ações**: Busca por nome, filtro Ativo/Inativo, botão "+ Novo produto"
- **Tabela**: Nome, SKU, Preço de tabela, Unidade, Ativo (badge)
- **Clique** → Ficha do Produto

---

## Tela 11 — Ficha do Produto

- **Rota**: `/produtos/:id`
- **Cabeçalho**: Nome, SKU, badge ativo/inativo
- **Dados**: Descrição, Preço de tabela, Unidade
- **Abas**:
  1. **Negócios**: lista de negócios que usam este produto (via itens de linha)
  2. **Histórico**

---

## Tela 12 — Formulário: Novo/Editar Produto

- **Drawer lateral**
- **Campos**: Nome, SKU, Descrição (textarea), Preço de tabela (input moeda), Unidade (select), Ativo (toggle)

---

## Tela 13 — Negócios: Kanban

- **Rota**: `/negocios`
- **Título**: "Negócios"
- **Seletor de pipeline** no topo (dropdown): escolhe qual pipeline visualizar
- **Seletor de visão**: toggle Kanban / Tabela
- **Kanban**:
  - Cada coluna = uma etapa do pipeline selecionado
  - Header da coluna: nome da etapa, quantidade de cards, valor total (ex.: "Proposta 3 · R$ 24.000")
  - Cards arrastáveis (drag-and-drop entre colunas):
    - Título do negócio
    - Nome da empresa
    - Valor total
    - Avatar do responsável (miniatura)
    - Data de previsão (se tiver)
  - Ao arrastar para coluna tipo "Ganho" → abre popup de geração de contas a receber
  - Ao arrastar para coluna tipo "Perdido" → abre modal pedindo "Motivo de perda" (select obrigatório)
- **Botão**: "+ Novo negócio" (abre formulário)

---

## Tela 14 — Negócios: Tabela

- **Rota**: `/negocios?view=tabela`
- **Mesmos dados do kanban em formato tabela**
- **Colunas**: Título, Empresa, Valor total, Pipeline, Estágio (badge), Responsável, Data previsão
- **Filtros dinâmicos**: Pipeline, Estágio, Empresa, Responsável, Faixa de valor
- **Clique** → Ficha do Negócio

---

## Tela 15 — Ficha do Negócio

- **Rota**: `/negocios/:id`
- **Cabeçalho**: Título, badge do estágio atual, valor total, pipeline
- **Sidebar direita**: Empresa (link), Responsável, Data previsão, Contatos vinculados (links)
- **Abas**:
  1. **Itens de linha**: tabela editável inline — Produto (combobox), Quantidade, Preço unitário, Desconto, Subtotal. Botão "+ Adicionar item". Total no rodapé
  2. **Atividades**: timeline
  3. **Projetos**: projetos vinculados a este negócio (título, progresso, status). Botão "+ Criar projeto a partir deste negócio"
  4. **Contas a receber**: contas geradas deste negócio (se houver)
  5. **Histórico**

---

## Tela 16 — Formulário: Novo/Editar Negócio

- **Drawer lateral**
- **Campos**: Título, Empresa (combobox com busca), Contatos (combobox multi-select, filtrado pela empresa selecionada), Pipeline (select), Estágio (select, dependente do pipeline), Data de previsão, Responsável (combobox)
- **Seção "Itens de linha"**: tabela com Produto (combobox), Quantidade, Preço unitário, Desconto. Botão "+ Adicionar linha"

---

## Tela 17 — Modal: Gerar contas a receber

- **Quando aparece**: negócio arrastado para etapa tipo "Ganho" no kanban, ou ao mudar estágio manualmente na ficha
- **Toggle no topo**: "Por item" (padrão) / "Consolidado"
- **Modo "Por item"**: tabela com uma linha por item de linha do negócio. Colunas: Produto, Valor (editável), Parcelas (editável), 1o vencimento (editável), Conta bancária (select), Categoria (select — só categorias tipo Receita)
- **Modo "Consolidado"**: campos gerais (Valor total, Parcelas, 1o vencimento, Conta bancária) + prévia da tabela de parcelas com rateio proporcional por produto
- **Rodapé**: texto "Serão criadas X contas a receber". Botões: "Confirmar e gerar" / "Cancelar"
- **Ao confirmar**: cria as contas, fecha o modal, toast de sucesso

---

## Tela 18 — Modal: Motivo de perda

- **Quando aparece**: negócio arrastado para etapa tipo "Perdido"
- **Campos**: Motivo de perda (select obrigatório: Preço, Concorrência, Timing, Sem resposta, Outro)
- **Botões**: "Confirmar" / "Cancelar"

---

## Tela 19 — Modal: Proteção de negócio com contas

- **Quando aparece**: negócio que já tem contas a receber é movido de volta (ex.: Ganho → Negociação)
- **Aviso**: "Este negócio possui X contas a receber vinculadas"
- **Tabela**: lista das contas existentes (descrição, valor, parcela, vencimento, status). Cada linha editável individualmente. Checkbox para "Cancelar" conta
- **Botões**: "Confirmar alterações" / "Voltar sem alterar"

---

## Tela 20 — Lembretes

- **Rota**: `/lembretes`
- **Título**: "Meus lembretes"
- **Filtros**: Data (hoje, atrasados, próximos 7 dias, todos), Responsável
- **Tabela**: Título, Registro vinculado (link para a ficha), Data de vencimento, Status (badge pendente/concluído)
- **Ação inline**: checkbox para marcar como concluído
- **Botão**: "+ Novo lembrete" (abre formulário com campos: Título, Data vencimento, Responsável, Vincular a: select de tipo + combobox de registro)

---

## Tela 21 — Lista de Projetos

- **Rota**: `/projetos`
- **Título**: "Projetos"
- **Barra de ações**: Filtros (status por grupo macro, responsáveis), botão "+ Novo projeto"
- **Tabela**:
  - Colunas: Título, Negócio de origem (link ou "—"), Responsáveis, Progresso (barra visual + %), Prazo previsto, Status (badge: Não iniciado / Em andamento / Concluído / Atrasado / Pausado)
  - Clique → Ficha do Projeto

---

## Tela 22 — Ficha do Projeto

- **Rota**: `/projetos/:id`
- **Cabeçalho**:
  - Título do projeto
  - Badge de status (automático)
  - Barra de progresso com percentual
  - Datas: início previsto, término previsto, início real, término real
  - Responsáveis (avatares)
  - Negócio de origem (link, se houver)
  - Botão: "Editar projeto" / "Pausar" / "Arquivar"
  - Botão: "Configurar etapas" (abre painel para editar a lista de etapas do projeto)
- **Abas (visões das tarefas)**:
  1. **Kanban**: colunas = etapas do projeto (com % no header). Cards = tarefas (título, responsável, prioridade/badge, contagem de subtarefas). Drag-and-drop entre etapas muda o progresso da tarefa. Botão "+ Nova tarefa" na primeira coluna
  2. **Lista**: tabela com todas as tarefas. Colunas: Título, Responsável, Etapa atual (badge + %), Prioridade (badge), Prazo previsto. Linhas expandíveis (▶) para ver subtarefas como sub-linhas indentadas (↳). Cada subtarefa mostra título, responsável, etapa atual
  3. **Timeline**: barras horizontais por tarefa (início previsto → término previsto), eixo X = meses. Se tiver dependência entre tarefas, seta de conexão entre barras. Cor da barra indica etapa/status
  4. **Atividades**: timeline (lembretes, notas vinculados ao projeto)
  5. **Histórico**: log de alterações

---

## Tela 23 — Formulário: Novo/Editar Projeto

- **Drawer lateral**
- **Campos**: Título, Descrição (textarea), Negócio de origem (combobox, opcional), Responsáveis (combobox multi-select), Data início prevista, Data término prevista
- **Seção "Etapas"**: lista editável de etapas. Cada linha: Nome, Percentual (%), Grupo macro (select). Drag-and-drop para reordenar. Botão "+ Adicionar etapa". Pré-preenchido com etapas padrão se projeto novo

---

## Tela 24 — Formulário: Nova/Editar Tarefa de projeto

- **Drawer lateral** (aberto a partir do kanban ou lista do projeto)
- **Campos**: Título, Descrição (textarea), Responsável (combobox), Etapa atual (select das etapas do projeto), Prioridade (select: Baixa/Média/Alta), Data início prevista, Data término prevista, Dependência (combobox de outras tarefas do projeto, opcional)
- **Seção "Subtarefas"**: lista inline. Cada subtarefa: Título (input texto), Responsável (combobox), Etapa atual (select). Botão "+ Adicionar subtarefa"

---

## Tela 25 — Projetos: Todas as tarefas

- **Rota**: `/projetos/tarefas`
- **Título**: "Todas as tarefas"
- **O que é**: visão global de todas as tarefas de todos os projetos, em uma única tabela. Permite ver o trabalho de toda a equipe sem entrar projeto por projeto.
- **Barra de ações**:
  - Filtros dinâmicos: Projeto (select), Responsável (select), Etapa / Grupo macro (select), Prioridade (select), Prazo (date range)
  - Botão: "Salvar visão"
- **Tabela**:
  - Colunas: Projeto (link), Título da tarefa, Responsável, Etapa atual (badge + %), Prioridade (badge), Prazo previsto, Subtarefas (contagem)
  - Linhas expandíveis (▶) para ver subtarefas
  - Clique na tarefa → abre drawer da Ficha da Tarefa (Tela 31)
  - Clique no projeto → vai para Ficha do Projeto (Tela 22)
- **Totalização no rodapé**: X tarefas, Y em andamento, Z atrasadas

---

## Tela 26 — Projetos: Kanban geral

- **Rota**: `/projetos/kanban`
- **Título**: "Kanban geral"
- **O que é**: kanban com tarefas de todos os projetos, organizadas por grupo macro (Não iniciado, Em andamento, Concluído, Pausado, Cancelado). Visão cross-project.
- **Seletor de agrupamento no topo**: "Agrupar por: Grupo macro" (padrão) / "Agrupar por: Projeto"
- **Modo "Grupo macro"** (padrão):
  - 5 colunas fixas: Não iniciado, Em andamento, Concluído, Pausado, Cancelado
  - Header da coluna: nome do grupo + quantidade de cards
  - Cards: título da tarefa, nome do projeto (texto menor), responsável (avatar), prioridade (badge)
  - Drag-and-drop entre colunas muda o grupo macro (e a etapa é ajustada para a primeira etapa daquele grupo no projeto correspondente)
- **Modo "Por projeto"**:
  - Uma seção/swimlane por projeto (nome do projeto + barra de progresso)
  - Dentro de cada seção: colunas = etapas daquele projeto
  - Cards = tarefas daquele projeto
- **Filtros**: Projeto, Responsável, Prioridade

---

## Tela 27 — Projetos: Timeline geral

- **Rota**: `/projetos/timeline`
- **Título**: "Timeline geral"
- **O que é**: visão de barras horizontais (Gantt simplificado) com tarefas de todos os projetos em um único eixo temporal.
- **Eixo X**: meses (scroll horizontal para navegar)
- **Eixo Y**: agrupado por projeto. Cada projeto tem um header (nome + barra de progresso), abaixo as tarefas como barras horizontais (início previsto → término previsto)
- **Barras**:
  - Cor indica grupo macro (azul = em andamento, verde = concluído, vermelho = atrasado, cinza = não iniciado)
  - Hover mostra tooltip: título, responsável, etapa, datas
  - Se tiver dependência entre tarefas, seta de conexão entre barras
- **Filtros**: Projeto (multi-select), Responsável, Período (zoom: semana/mês/trimestre)
- **Clique na barra** → abre drawer da Ficha da Tarefa

---

## Tela 28 — Projetos: Minhas tarefas

- **Rota**: `/projetos/minhas-tarefas`
- **Título**: "Minhas tarefas"
- **O que é**: lista filtrada automaticamente para o usuário logado. Mostra só as tarefas e subtarefas onde ele é responsável, de todos os projetos.
- **Agrupamento padrão**: por Projeto (seções colapsáveis)
- **Dentro de cada seção**:
  - Tarefas em lista: Título, Etapa atual (badge), Prioridade (badge), Prazo previsto
  - Subtarefas aparecem indentadas abaixo da tarefa pai
- **Filtros**: Grupo macro (Não iniciado / Em andamento / Atrasado), Prioridade, Prazo
- **Indicadores no topo**: cards resumo — "X pendentes", "Y em andamento", "Z atrasadas"
- **Clique** → abre drawer da Ficha da Tarefa

---

## Tela 29 — Ficha da Tarefa de projeto

- **Rota**: `/projetos/:projectId/tarefas/:taskId`
- **Aparece como**: drawer lateral grande (aberto a partir do kanban, lista ou timeline do projeto)
- **Cabeçalho**:
  - Título da tarefa
  - Badge de etapa atual (nome + %)
  - Badge de prioridade (Baixa/Média/Alta)
  - Responsável (avatar + nome)
  - Botão: "Editar" / "Arquivar"
- **Dados**:
  - Descrição (texto longo, editável inline)
  - Datas: início prevista, término prevista, início real, término real
  - Dependência: link para outra tarefa (se tiver), ou "Nenhuma"
  - Projeto (link para a ficha do projeto)
- **Seção "Subtarefas"**:
  - Lista com cada subtarefa: checkbox de etapa, título, responsável, etapa atual (badge)
  - Drag-and-drop para reordenar
  - Botão: "+ Adicionar subtarefa" (input inline: título, responsável, etapa)
  - Progresso da tarefa calculado a partir das subtarefas (se houver)
- **Seção "Atividades"**: timeline curta (lembretes, notas vinculados a esta tarefa). Botão "+ Atividade"
- **Seção "Histórico"**: log de alterações desta tarefa

---

## Tela 30 — Painel: Configurar etapas do projeto

- **Aparece como**: drawer lateral (aberto pelo botão "Configurar etapas" na ficha do projeto)
- **Título**: "Etapas do projeto — [Nome do projeto]"
- **Lista de etapas** (drag-and-drop para reordenar):
  - Cada linha: Nome (input editável), Percentual (input número + %), Grupo macro (select: Não iniciado / Em andamento / Concluído / Pausado / Cancelado), botão remover (com confirmação se há tarefas nessa etapa)
  - Indicador: quantidade de tarefas/subtarefas nesta etapa
- **Botão**: "+ Adicionar etapa"
- **Rodapé**: "Salvar" / "Cancelar"
- **Validação**: percentuais devem ter pelo menos uma etapa com 0% (Não iniciado) e uma com 100% (Concluído)

---

## Tela 31 — Formulário de Atividade

- **Aparece como**: drawer lateral pequeno ou popover, aberto pelo botão "+ Atividade" em qualquer ficha
- **Passo 1**: escolher tipo (Lembrete / Nota / Ligação / Reunião / E-mail)
- **Campos por tipo**:

| Tipo | Campos |
|------|--------|
| Lembrete | Título, Data de vencimento, Responsável (combobox) |
| Nota | Texto (textarea rico) |
| Ligação | Duração (input minutos), Resultado (select: Atendeu / Não atendeu / Recado), Anotação (textarea) |
| Reunião | Data/hora, Participantes (combobox multi-select de contatos/usuários), Pauta (textarea), Anotação (textarea) |
| E-mail | Assunto, Corpo (textarea) |

- **Vínculo**: automaticamente vinculado ao registro de onde o botão foi clicado (Empresa, Contato, Negócio, Projeto)
- **Botões**: "Salvar" / "Cancelar"

---

## Tela 32 — Modal: Registrar recebimento

- **Quando aparece**: botão "Registrar recebimento" na ficha da conta a receber (status Pendente ou Atrasado)
- **Campos**:
  - Data de pagamento (date picker, pré-preenche com hoje)
  - Valor recebido (input moeda, pré-preenche com valor original da conta)
  - Conta bancária (select — lista de contas ativas)
- **Botões**: "Confirmar recebimento" / "Cancelar"
- **Ao confirmar**: status muda para "Pago", saldo da conta bancária atualiza, toast de sucesso

---

## Tela 33 — Modal: Registrar pagamento

- **Quando aparece**: botão "Registrar pagamento" na ficha da conta a pagar (status Pendente ou Atrasado)
- **Campos**:
  - Data de pagamento (date picker, pré-preenche com hoje)
  - Valor pago (input moeda, pré-preenche com valor original da conta)
  - Conta bancária (select — lista de contas ativas, de onde sai o dinheiro)
- **Botões**: "Confirmar pagamento" / "Cancelar"
- **Ao confirmar**: status muda para "Pago", saldo da conta bancária atualiza, toast de sucesso

---

## Tela 34 — Perfil do usuário

- **Rota**: `/perfil` (ou dropdown do avatar na topbar → "Meu perfil")
- **Campos editáveis**:
  - Nome completo
  - E-mail (somente leitura se login por Google)
  - Avatar (upload de imagem)
  - Senha atual + Nova senha + Confirmar nova senha (só para login e-mail/senha)
  - Preferência de tema (Light / Dark / Sistema)
  - Preferência de sidebar (Expandida / Minimizada)
- **Botão**: "Salvar alterações"

---

## Tela 35 — Contas a Receber: Lista


- **Rota**: `/contas-receber`
- **Título**: "Contas a receber"
- **Barra de ações**:
  - Filtros dinâmicos (estilo OMIE): Status (Pendente/Atrasado/Pago/Cancelado), Empresa, Categoria, Faixa de vencimento, Grupo de parcelas
  - Botão: "Salvar visão"
  - Botão: "+ Nova conta" (criação manual)
  - Toggle: "Mostrar arquivados"
- **Tabela**:
  - Colunas: Descrição, Empresa (link), Produto, Valor, Parcela, Vencimento, Status (badge — Pendente amarelo, Pago verde, Atrasado vermelho, Cancelado cinza)
  - Clique → Ficha da Conta a receber
- **Totalização no rodapé**: Total pendente, Total atrasado, Total pago (no período filtrado)

---

## Tela 36 — Ficha da Conta a Receber

- **Rota**: `/contas-receber/:id`
- **Cabeçalho**: Descrição, badge de status, valor, parcela (ex.: "2/3")
- **Dados**: Empresa (link), Negócio de origem (link), Produto, Vencimento, Categoria, Conta bancária, Grupo de parcelas
- **Ação "Registrar recebimento"** (botão, aparece quando status = Pendente ou Atrasado):
  - Abre seção/modal com: Data de pagamento, Valor recebido (pré-preenche com valor original), Conta bancária (select)
  - Ao confirmar, status muda para "Pago", saldo da conta bancária atualiza
- **Ação "Cancelar"**: muda status para Cancelado (com confirmação)
- **Aba Histórico**: log de alterações

---

## Tela 37 — Formulário: Nova Conta a Receber (manual)

- **Drawer lateral**
- **Campos**: Descrição, Empresa (combobox), Produto (combobox, opcional), Valor, Vencimento, Categoria (select — só tipo Receita), Conta bancária (select), Repetir (select: Não repetir / Mensal / Bimestral / Trimestral / Semestral / Anual), Quantidade de repetições (número, aparece se Repetir != "Não repetir")
- **Se tiver repetição**: ao clicar "Salvar", abre modal de prévia (tabela com todas as parcelas que serão criadas, cada linha editável). Botões: "Confirmar e gerar" / "Cancelar"

---

## Tela 38 — Contas a Pagar: Lista

- **Rota**: `/contas-pagar`
- **Título**: "Contas a pagar"
- **Mesma estrutura da lista de Contas a receber**
- **Filtros**: Status, Empresa (fornecedor), Categoria, Vencimento
- **Tabela**: Descrição, Empresa, Valor, Parcela, Vencimento, Status (badge)
- **Totalização no rodapé**

---

## Tela 39 — Ficha da Conta a Pagar

- **Rota**: `/contas-pagar/:id`
- **Mesma estrutura da ficha de Conta a receber**
- **Ação "Registrar pagamento"**: Data, Valor pago, Conta bancária (de onde saiu)

---

## Tela 40 — Formulário: Nova Conta a Pagar

- **Drawer lateral**
- **Campos**: Descrição, Empresa/fornecedor (combobox, opcional), Valor, Vencimento, Categoria (select — só tipo Despesa), Conta bancária (select), Repetir, Quantidade de repetições
- **Mesmo modal de prévia de parcelas que a conta a receber**

---

## Tela 41 — Contas Bancárias: Lista

- **Rota**: `/contas-bancarias`
- **Título**: "Contas bancárias"
- **Tabela**: Nome, Banco, Agência/Conta, Saldo atual (destaque), Ativa (badge)
- **Total consolidado no rodapé**: soma dos saldos de contas ativas
- **Botão**: "+ Nova conta bancária"
- **Clique** → Ficha da Conta bancária

---

## Tela 42 — Ficha da Conta Bancária

- **Rota**: `/contas-bancarias/:id`
- **Cabeçalho**: Nome, Banco, Agência/Conta, Saldo atual (destaque grande)
- **Extrato**: lista de lançamentos (contas a receber pagas + contas a pagar pagas) que apontam para esta conta, em ordem cronológica reversa. Colunas: Data, Descrição, Tipo (Entrada/Saída com cor), Valor, Saldo após
- **Filtros do extrato**: Período (data início / data fim), Tipo (Entrada / Saída / Todos)

---

## Tela 43 — Formulário: Nova/Editar Conta Bancária

- **Drawer lateral**
- **Campos**: Nome, Banco, Agência/Conta, Saldo inicial (moeda), Ativa (toggle)

---

## Tela 44 — Configurações: Pipelines

- **Rota**: `/config/pipelines`
- **Título**: "Pipelines"
- **Lista de pipelines** (cards ou tabela): Nome, Ativo (badge), Quantidade de etapas
- **Ao clicar em um pipeline**: abre painel/drawer com:
  - Campo: Nome do pipeline (editável)
  - Toggle: Ativo
  - Lista de etapas (drag-and-drop para reordenar):
    - Cada etapa: Nome (input), Tipo (select: Aberto/Ganho/Perdido), botão remover
    - Botão: "+ Adicionar etapa"
  - Botão: "Salvar"
- **Botão**: "+ Novo pipeline"

---

## Tela 45 — Configurações: Categorias Financeiras

- **Rota**: `/config/categorias`
- **Título**: "Categorias financeiras"
- **Tabela**: Nome, Tipo (Receita/Despesa — badge), Ativa (badge)
- **Edição inline** ou drawer: Nome, Tipo (select), Ativa (toggle)
- **Botão**: "+ Nova categoria"

---

## Tela 46 — Configurações: Log de Atividades

- **Rota**: `/config/log`
- **Título**: "Log de atividades"
- **Filtros**: Usuário (select), Tipo de objeto (select: Empresa, Negócio, Conta a receber...), Período (date range), Tipo de ação (Criação/Edição/Exclusão/Mudança de estágio)
- **Tabela**: Data/hora, Usuário, Objeto, Registro (link para a ficha), Ação, Campo alterado, Valor anterior, Valor novo
- **Paginação**
- **Somente leitura**: ninguém edita nem exclui entradas

---

## Tela 47 — Busca Global (Command Palette)

- **Atalho**: Ctrl+K / Cmd+K (ou clicar no campo de busca na topbar)
- **Overlay**: modal centralizado com campo de texto no topo
- **Comportamento**:
  - Ao digitar, resultados aparecem agrupados por tipo de objeto
  - Cada resultado mostra: ícone do tipo, nome/título, informação secundária (ex.: CNPJ para empresa, valor para negócio)
  - Setas para navegar, Enter para abrir
  - Esc para fechar
- **Sem resultados**: mensagem "Nenhum resultado para 'X'"

---

## Tela 48 — Modal: Prévia de parcelas (recorrência)

- **Quando aparece**: ao salvar conta a pagar ou conta a receber manual com Repetir != "Não repetir"
- **Título**: "Parcelas que serão criadas"
- **Tabela editável**: cada linha é uma parcela. Colunas: Parcela (ex.: "1/12"), Descrição (editável), Valor (editável), Vencimento (editável), Conta bancária (select), Categoria (select)
- **Rodapé**: "Serão criadas X contas". Botões: "Confirmar e gerar" / "Cancelar"

---

## Componentes reutilizáveis (padrão em todas as telas)

### Timeline de atividades
- Lista vertical cronológica reversa
- Cada item: dot colorido (azul=lembrete, verde=concluído, cinza=nota, roxo=ligação, laranja=reunião), título em negrito, "Quem — data/hora", corpo do texto
- Botão "+ Atividade" com dropdown dos tipos

### DataTable (tabelas de lista)
- Header com nome da coluna + ícone de ordenação + filtro por coluna ao clicar
- Filtros ativos como chips/pills acima da tabela (removíveis com X)
- Busca textual
- Paginação no rodapé (registros por página: 25/50/100)
- Possibilidade de salvar combinação de filtros como "visão" nomeada

### Drawer lateral (formulários)
- Abre da direita, overlay escurece o fundo
- Header com título ("Novo negócio" / "Editar empresa")
- Corpo com campos do formulário
- Rodapé fixo com botões "Salvar" / "Cancelar"
- Validação em tempo real (borda vermelha + mensagem abaixo do campo)

### Toast (notificações)
- Aparece no canto inferior direito
- Tipos: sucesso (verde), erro (vermelho), aviso (amarelo), info (azul)
- Auto-dismiss após 5 segundos
- Exemplos: "Empresa criada com sucesso", "Erro ao salvar", "3 contas a receber geradas"

### Confirmação de ação destrutiva
- Modal pequeno centralizado
- Texto: "Tem certeza que deseja arquivar este registro?"
- Botões: "Confirmar" (vermelho) / "Cancelar"
