# Sistema de Design: A Autoridade Silenciosa
 
## 1. Overview & North Star Criativa: "O Arquiteto de Dados"
 
O ERP X-DO não é apenas uma ferramenta de gestão; é um ambiente de clareza em meio ao caos corporativo. Nossa estrela guia é o conceito de **"O Arquiteto de Dados"**. Fugimos da estética saturada e claustrofóbica dos softwares de gestão tradicionais para abraçar uma experiência editorial de luxo.
 
O sistema rompe com o "look de template" através de uma **Assimetria Intencional**. Enquanto os dados residem em grades precisas, a navegação e as áreas de cabeçalho utilizam espaços negativos generosos e pesos tipográficos contrastantes para guiar o olhar. O objetivo é que o usuário sinta que está navegando em uma revista de negócios premium, onde cada KPI tem importância e cada ação é deliberada.
 
---
 
## 2. Cores e Profundidade Tonal
 
Nossa paleta evita o preto puro e o branco clínico, optando por tons que evocam confiança e sofisticação técnica.
 
### A Regra do "Sem Linhas" (No-Line Rule)
Proibimos terminantemente o uso de bordas sólidas de 1px para seccionamento de conteúdo. A separação entre módulos deve ser alcançada exclusivamente através de:
- **Mudanças de Tom:** Um módulo `surface-container-low` sobre um fundo `surface`.
- **Espaçamento Negativo:** O uso do vácuo como delimitador estrutural.
 
### Hierarquia de Superfície e Camadas
Tratamos a interface como camadas de vidro fosco sobrepostas. A profundidade é definida pelos tokens de `surface-container`:
- **Base:** `surface` (#f7f9fb)
- **Nível 1 (Seções):** `surface-container-low` (#f2f4f6)
- **Nível 2 (Cards):** `surface-container-lowest` (#ffffff)
- **Nível 3 (Destaques/Popovers):** `surface-container-high` (#e6e8ea)
 
### Texturas de Assinatura
Para CTAs principais e estados de destaque, utilize o **Gradiente de Autoridade**: uma transição sutil de `primary` (#00328a) para `primary_container` (#0047bb) em um ângulo de 135º. Isso injeta "alma" e profundidade onde cores sólidas pareceriam genéricas.
 
---
 
## 3. Tipografia Editorial
 
Utilizamos a família **Inter** não apenas pela legibilidade, mas como uma ferramenta de design.
 
- **Display & Headline:** Devem ser usados com tracking (espaçamento entre letras) levemente negativo (-0.02em) para um visual mais autoritário e denso.
- **Body & Labels:** Onde a clareza é vital. O `body-md` (0.875rem) é nosso cavalo de batalha, sempre respeitando a cor `on_surface_variant` (#434653) para reduzir o cansaço visual.
- **Contraste de Peso:** Use `title-lg` em negrito (Bold) adjacente a `body-sm` em cinza médio para criar uma hierarquia visual clara, permitindo que o usuário faça o escaneamento dos dados em segundos.
 
---
 
## 4. Elevação e Profundidade Tonal
 
O X-DO abandona sombras pesadas em favor do **Layering Tonal**.
 
- **Sombras Ambiente:** Se um elemento precisar flutuar (como um menu suspenso), a sombra deve ser extra-difundida. Utilize um Blur de 24px a 40px com uma opacidade máxima de 6% usando o tom `on_surface`.
- **Ghost Borders (A Exceção):** Se uma borda for indispensável para acessibilidade, utilize o token `outline_variant` com **20% de opacidade**. Nunca utilize bordas 100% opacas.
- **Glassmorphism:** Para modais e sidebars de contexto, aplique `surface_container_lowest` com opacidade de 80% e um `backdrop-filter: blur(12px)`. Isso integra o componente ao layout em vez de parecer um "adesivo" colado por cima.
 
---
 
## 5. Componentes
 
### Botões
- **Primário:** Gradiente de Autoridade, cantos `DEFAULT` (8px). Sem bordas.
- **Secundário:** Fundo `secondary_container`, texto `on_secondary_container`.
- **Terciário:** Apenas texto com ícone, usando `primary` para a cor da fonte.
 
### Inputs e Campos de Dados
- **Estado Repouso:** Fundo `surface_container_low`, sem borda, apenas um leve contraste de tom.
- **Foco:** Uma "Ghost Border" de 2px usando `primary` e um leve brilho externo (Glow) de 4px com 10% de opacidade da cor primária.
 
### Cards e Listas
- **Proibição de Divisores:** É proibido o uso de linhas horizontais para separar itens de lista. Use o espaçamento `md` (12px) a `lg` (16px) ou alternância sutil de cores de fundo (`surface` vs `surface-container-low`).
- **Data Tables:** Cabeçalhos em `label-sm` (Caps Lock) com tom `on_surface_variant`. As linhas não devem ter bordas; o hover deve disparar uma mudança suave para `surface-container-highest`.
 
### Componentes de Contexto ERP
- **Status Badges:** Use `tertiary_container` para estados de alerta e `primary_fixed` para estados informativos, sempre com texto em `on_tertiary_container` para garantir legibilidade.
- **Indicadores de Tendência:** Micro-gráficos (sparklines) integrados às células das tabelas para visualização imediata de performance sem poluição visual.
 
---
 
## 6. Do’s and Don’ts
 
### Do’s
- **Respire:** Use margens largas (mínimo de 32px nas laterais da tela). O espaço vazio é um sinal de luxo e eficiência.
- **Ícones Funcionais:** Use Material Symbols na variante "Rounded" com peso `300` para manter a elegância.
- **Hierarquia de Cor:** Use o `Deep Corporate Blue` apenas para ações críticas ou branding. O resto da interface deve ser governado pela paleta de cinzas e tons de superfície.
 
### Don’ts
- **Não use 100% Black:** Nunca use #000000. Utilize `on_surface` (#191c1e) para manter o tom premium.
- **Evite o Cramping:** Nunca sacrifique o espaçamento para "colocar mais dados na tela". Se houver muitos dados, use a hierarquia de camadas para priorizar o que é vital.
- **Sem Bordas Oitocentistas:** Evite qualquer elemento que pareça um "quadrado desenhado". Se o olho consegue ver onde uma seção termina pela mudança de cor, a borda é redundante.
 
---
 
*Este sistema de design é um compromisso com a clareza. Ao desenhar para o X-DO, lembre-se: você não está apenas criando um ERP, você está construindo o cockpit de decisão de um executivo.*