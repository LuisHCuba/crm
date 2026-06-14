# Design System — MeuCRM Web

Contrato de UI para todos os agentes/páginas. **Leia antes de criar telas.**

Stack: React 19 + Vite + **Tailwind CSS v4 (CSS-first)** + Radix UI + lucide-react.
Não há `tailwind.config.js`. Tokens vivem em `src/index.css` como CSS variables.
Dark mode: classe `.dark` no `<html>` (variant `dark:` funciona normalmente).

## Princípios

1. **Sempre via tokens.** Use `var(--color-*)`, `var(--radius-*)`, `var(--shadow-*)`.
   Nunca hardcode hex/rgb soltos em componentes (ex.: nada de `#1877f2`, `bg-white`,
   `text-black`, `bg-black/40`). A única exceção são overlays de modal/drawer (já
   tratados nos primitivos).
2. **Reuse os primitivos** de `src/components/ui/`. Só estilize "na mão" quando não
   houver primitivo. Ao estilizar, copie os padrões abaixo.
3. **Densidade de CRM.** Altura padrão de controles = 40px (`h-10`). Texto base 14px.
   Espaçamentos de página: `p-4 md:p-6`. Gaps entre cards: `gap-4`.
4. **Acessibilidade.** Todo elemento interativo precisa de foco visível
   (`focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]`), `aria-label` em
   botões só com ícone, contraste AA.

---

## 1. Tokens de cor

Consuma com `bg-[var(--color-…)]`, `text-[var(--color-…)]`, `border-[var(--color-…)]`.

### Superfícies (do fundo para o topo)

| Token                    | Uso                                                        |
| ------------------------ | ---------------------------------------------------------- |
| `--color-bg`             | Fundo da página/canvas. (já aplicado no `body`)            |
| `--color-surface`        | Superfície padrão: cards, painéis, inputs, tabelas.        |
| `--color-surface-2`      | Área rebaixada/aninhada: cabeçalho de tabela, wells, track de Tabs, rodapé de modal. |
| `--color-surface-hover`  | Fundo de hover de linhas/itens neutros.                    |
| `--color-elevated`       | Conteúdo flutuante: popovers, menus, modais, dropdowns. **Sempre com sombra.** |

### Bordas

| Token                   | Uso                                               |
| ----------------------- | ------------------------------------------------- |
| `--color-border`        | Hairline padrão (divisórias, contorno de card/tabela). |
| `--color-border-strong` | Borda enfatizada: inputs, selects, botão secundário. |

### Texto

| Token            | Uso                                                |
| ---------------- | -------------------------------------------------- |
| `--color-text`   | Texto primário.                                    |
| `--color-muted`  | Texto secundário, labels, helper, ícones discretos. |
| `--color-faint`  | Texto terciário, placeholders, estados desabilitados. |

### Marca / accent

| Token                     | Uso                                                       |
| ------------------------- | --------------------------------------------------------- |
| `--color-accent`          | Cor de marca (índigo): links, ícones ativos, estados ativos, foco. |
| `--color-accent-hover`    | Hover de elementos accent-fill.                           |
| `--color-accent-active`   | Pressed de elementos accent-fill.                         |
| `--color-accent-soft`     | Fundo tingido de accent (hover de itens, chips, highlight de menu). |
| `--color-accent-contrast` | Texto/ícone **sobre** fundo accent (use no lugar de `text-white`). |
| `--color-ring`            | Cor do anel de foco.                                      |

### Semânticas (cada uma com base + `-soft`)

| Base               | Soft                    | Uso                          |
| ------------------ | ----------------------- | ---------------------------- |
| `--color-success`  | `--color-success-soft`  | Sucesso, "ganho", positivo.  |
| `--color-danger`   | `--color-danger-soft`   | Erro, exclusão, "perdido".   |
| `--color-warning`  | `--color-warning-soft`  | Atenção, pendência.          |
| `--color-info`     | `--color-info-soft`     | Informativo/neutro azul.     |

Base = texto/ícone/preenchimento sólido. Soft = fundo tingido (use base como texto em cima).

> **Aliases legados** (mantidos por compat, NÃO use em código novo):
> `--color-green` → success, `--color-red` → danger, `--color-yellow` → warning.

### Sidebar (rail escuro nos dois temas)

Só relevante para o shell (`AppLayout`). Não use em páginas:
`--color-sidebar`, `--color-sidebar-border`, `--color-sidebar-text`,
`--color-sidebar-muted`, `--color-sidebar-faint`, `--color-sidebar-hover`,
`--color-sidebar-active`, `--color-sidebar-active-text`, `--color-sidebar-elevated`.

---

## 2. Raio, sombra, espaçamento, tipografia

### Raios — `rounded-[var(--radius-…)]`

| Token            | px   | Uso típico                          |
| ---------------- | ---- | ----------------------------------- |
| `--radius-xs`    | 4    | Detalhes mínimos.                   |
| `--radius-sm`    | 6    | Chips pequenos.                     |
| `--radius-md`    | 8    | Itens de menu, botões internos.     |
| `--radius-lg`    | 10   | Botões, inputs, selects (padrão).   |
| `--radius-xl`    | 14   | Cards, tabelas, popovers.           |
| `--radius-2xl`   | 18   | Modais.                             |
| `--radius-full`  | 9999 | Pills, badges, avatares, barras.    |

### Sombras (elevation) — `shadow-[var(--shadow-…)]`

`--shadow-xs` (controles em repouso) · `--shadow-sm` · `--shadow-md` ·
`--shadow-lg` (popovers/menus/dropdowns) · `--shadow-xl` (modais/drawers).
As sombras já se ajustam ao dark mode automaticamente.

### Espaçamento (escala Tailwind padrão)

Controles `h-10`. Padding de página `p-4 md:p-6`. Card interno `p-4`/`p-5`.
Gap entre campos de formulário `gap-4`. Gap entre cards `gap-4`/`gap-6`.

### Tipografia

Fonte: `var(--font-sans)` (Inter + system-ui fallback), aplicada no `body`.
Base 14px / line-height 1.5. Escala sugerida:

- Título de página: `text-xl font-semibold` (ou `text-2xl` em telas grandes).
- Título de seção/card: `text-lg font-semibold`.
- Corpo: `text-sm`.
- Label/eyebrow: `text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]`.
- Auxiliar: `text-xs text-[var(--color-muted)]`.

### Foco (padrão de A11y)

```
outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]
focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
```

Para inputs (anel suave sem offset):

```
focus-visible:border-[var(--color-accent)]
focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]
```

---

## 3. Catálogo de primitivos (`src/components/ui/`)

> **APIs estáveis.** As props abaixo não mudam. Variantes/sizes novos foram
> adicionados de forma opcional e retrocompatível.

### Button — `@/components/ui/Button`

```tsx
import { Button } from "@/components/ui/Button";

<Button>Salvar</Button>                          // primary (default)
<Button variant="secondary">Cancelar</Button>
<Button variant="danger" loading>Excluir</Button>
<Button variant="ghost" size="sm">Editar</Button>
<Button variant="outline">Filtrar</Button>       // novo
<Button variant="success">Aprovar</Button>       // novo
<Button size="icon" aria-label="Fechar"><X className="size-4" /></Button> // novo
```

- `variant`: `primary` | `secondary` | `danger` | `ghost` | `outline` | `success`.
- `size`: `sm` (h-8) | `md` (h-10) | `lg` (h-11) | `icon` (size-10 quadrado).
- `loading`: mostra spinner e desabilita (seta `aria-busy`).
- Aceita todas as props de `<button>`. `type` default = `"button"`.

### Input — `@/components/ui/Input`

```tsx
<Input label="Nome" placeholder="Digite…" />
<Input variant="search" placeholder="Buscar…" />
<Input label="Email" error="Email inválido" />
```

- `label?`, `error?` (mostra mensagem + estado vermelho + `aria-invalid`).
- `variant`: `default` | `search` (ícone de lupa à esquerda).
- Altura `h-10`. `id`/`name` geram associação `label`↔`input` automática.
- Para checkbox/textarea use `<input>`/`<textarea>` nativos com as classes de input abaixo.

### Select — `@/components/ui/Select` (Radix)

```tsx
<Select
  label="Status"
  value={status}
  onChange={setStatus}
  options={[{ value: "open", label: "Aberto" }]}
  placeholder="Selecione…"
/>
```

- Controlado. `value=""` representa "nada selecionado"; o item placeholder limpa a seleção.
- Props: `options`, `value`, `onChange`, `placeholder?`, `label?`, `disabled?`, `id?`.

### AsyncCombobox — `@/components/ui/AsyncCombobox`

Busca assíncrona com debounce (300ms). Props: `value`, `onChange`, `searchFn(query) => Promise<{value,label}[]>`, `label?`, `placeholder?`, `disabled?`.

### Badge — `@/components/ui/Badge`

```tsx
<Badge variant="success">Ativo</Badge>
<Badge variant="accent">Novo</Badge>   // novo
```

- `variant`: `success` | `warning` | `danger` | `info` | `neutral` (default) | `accent`.
- Pill com fundo soft + ring sutil. Aceita props de `<span>`.

### DataTable — `@/components/ui/DataTable`

```tsx
<DataTable
  columns={[{ key: "name", header: "Nome", render: (r) => r.name }]}
  data={rows}
  loading={isLoading}
  onRowClick={(r) => navigate(`/x/${r.id}`)}
  getRowKey={(r) => r.id}
  emptyMessage="Nenhum registro."
/>
```

- Cabeçalho em `surface-2`, uppercase muted. Linhas com hover; clicáveis viram `role=button` + teclado (Enter/Espaço).
- `columns[].render` opcional; sem ele, mostra o valor da chave (ou `—`).

### Tabs — `@/components/ui/Tabs`

```tsx
<Tabs
  tabs={[{ id: "info", label: "Info" }]}
  activeTab={tab}
  onChange={setTab}
/>
```

- Controle segmentado (track `surface-2`, pill ativo em `surface` + accent). Controlado.

### Modal — `@/components/ui/Modal` (Radix Dialog)

```tsx
<Modal open={open} onOpenChange={setOpen} title="Editar" footer={<Button>Salvar</Button>}>
  …conteúdo…
</Modal>
```

- Overlay com blur, conteúdo elevado/`shadow-xl`, rodapé em `surface-2`.
- O `footer` é renderizado como está; aplique seu próprio `flex justify-end gap-2` se quiser alinhar botões à direita.

### Drawer — `@/components/ui/Drawer`

Painel lateral direito. Props: `open`, `onClose`, `title`, `children`, `footer?`. Mesma anatomia visual do Modal.

### Toaster / toasts — `@/components/ui/Toast` + `sonner`

`<Toaster />` já montado no app (tema via tokens, `richColors`, `closeButton`).
Para disparar: `import { toast } from "sonner"` e `toast.success("…")`.

### ProgressBar — `@/components/ui/ProgressBar`

```tsx
<ProgressBar value={72} color="green" />
```

- `value` 0–100 (clamped). `color`: `accent` (default) | `green` | `red` | `warning` | `info` (os 2 últimos são novos).

### PipelineTracker — `@/components/ui/PipelineTracker`

Barras por estágio + nome do estágio atual. Props: `stages: {id,name,type}[]`, `currentStageId`. `type` `won`→verde, `lost`→vermelho, demais→accent; futuros em cinza.

### PropertyField — `@/components/ui/PropertyField`

Label (eyebrow) + valor (read-only), com link opcional. Props: `label`, `value?`, `href?`, `children?`. Use em painéis de detalhe.

### EditableField — `@/components/ui/EditableField`

Campo inline editável (click para editar). `type`: `text` | `date` | `email` | `select` | `search` | `readonly`. Ver tipos no arquivo para o shape de cada variante (`onSave`, `options`, `searchFn`, `displayValue`).

### AssociationCard — `@/components/ui/AssociationCard`

Card colapsável com título, contador e ação/rodapé. Props: `title`, `count?`, `action?: {label, icon?, onClick}`, `footer?`, `defaultOpen?`, `children`.

### QueryErrorState — `@/components/ui/QueryErrorState`

Estado de erro de query (ícone + mensagem + retry). Props: `message?`, `onRetry?`.

---

## 4. Receitas (copie/cole)

**Card de conteúdo**

```tsx
<div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
  …
</div>
```

**Título de página + ação**

```tsx
<div className="mb-6 flex items-center justify-between gap-4">
  <h1 className="text-xl font-semibold text-[var(--color-text)]">Empresas</h1>
  <Button>Nova empresa</Button>
</div>
```

**Eyebrow + valor (manual)**

```tsx
<div className="flex flex-col gap-0.5">
  <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">Label</span>
  <span className="text-sm text-[var(--color-text)]">Valor</span>
</div>
```

**Link**

```tsx
<a className="font-medium text-[var(--color-accent)] hover:underline">Abrir</a>
```

**Empty state**

```tsx
<div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center text-sm text-[var(--color-muted)]">
  Nenhum item ainda.
</div>
```

## 5. Não faça

- ❌ `bg-white` / `bg-black` / `text-black` / hex soltos → use tokens.
- ❌ `text-white` sobre accent → use `text-[var(--color-accent-contrast)]`.
- ❌ Reimplementar botão/input/modal do zero → use os primitivos.
- ❌ Esquecer o anel de foco em elementos interativos custom.
- ❌ Alterar arquivos de `src/components/ui/`, `AppLayout.tsx` ou `index.css`
  (são propriedade do agente de fundação do design system).
