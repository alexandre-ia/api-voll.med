# Design System — Voll.med Frontend

Estilo: **Neutral Warm** — tons quentes, não cansa com uso prolongado, fora do padrão médico convencional (sem azul clínico, sem branco puro).

---

## Paleta de Cores

### Fundos e Superfícies

| Token | Hex | Uso |
|-------|-----|-----|
| `background` | `#F5F0EB` | Fundo principal da aplicação |
| `surface` | `#EDE8E3` | Sidebar, cards, painéis |
| `surface-hover` | `#E5DED7` | Hover de itens, row hover em tabelas |
| `white` | `#FDFCFB` | Superfícies elevadas (modais, dropdowns) |
| `border` | `#D4CCC4` | Divisórias, bordas de input |

### Texto

| Token | Hex | Uso |
|-------|-----|-----|
| `text-primary` | `#1C1917` | Títulos, texto principal |
| `text-secondary` | `#78716C` | Labels, subtextos, descrições |
| `text-muted` | `#A8A29E` | Placeholders, texto desabilitado |

### Cores de Ação

| Token | Hex | Uso |
|-------|-----|-----|
| `accent` | `#6B7F6A` | Botões primários, links, item ativo na nav |
| `accent-hover` | `#5A6E59` | Hover de accent |
| `danger` | `#C4714F` | Erros, cancelamentos, exclusões (terracota) |
| `danger-hover` | `#B0623F` | Hover de danger |
| `success` | `#4A7C59` | Confirmações, status ativo |
| `warning` | `#C4964F` | Alertas, status pendente |

### Uso em Tailwind

```tsx
// Correto — usar tokens definidos em src/index.css (TailwindCSS v4)
<button className="bg-accent hover:bg-accent-hover text-white">
<p className="text-text-secondary">
<div className="bg-surface border border-border">

// Errado — nunca usar classes padrão do Tailwind para cores principais
<button className="bg-blue-500">   // ❌
<div className="bg-gray-100">      // ❌
```

---

## Tipografia

**Fonte:** Plus Jakarta Sans (Google Fonts)

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
```

| Escala | Classe Tailwind | Uso |
|--------|----------------|-----|
| `text-2xl font-bold` | 24px / 700 | Títulos de página |
| `text-xl font-semibold` | 20px / 600 | Títulos de seção |
| `text-lg font-semibold` | 18px / 600 | Subtítulos, headers de card |
| `text-sm` | 14px / 400 | Corpo de texto, labels |
| `text-xs` | 12px / 400 | Metadados, badges, rodapés |

**Line height:** sempre `leading-relaxed` (1.6) para parágrafos.

---

## Espaçamento

Base unit: 4px. Usar múltiplos do sistema Tailwind.

| Contexto | Valor |
|----------|-------|
| Padding interno de card | `p-6` (24px) |
| Gap entre elementos de form | `gap-4` (16px) |
| Padding de página | `p-8` (32px) |
| Margem entre seções | `mb-8` (32px) |
| Padding de botão | `px-4 py-2` |
| Padding de input | `px-3 py-2.5` |

---

## Bordas e Raios

```ts
borderRadius: {
  sm: '6px',   // badges, tags
  md: '10px',  // inputs, botões, cards pequenos
  lg: '16px',  // cards principais, modais
  xl: '24px',  // elementos de destaque
}
```

Borda padrão: `border border-border` → `1px solid #D4CCC4`

---

## Sombras

| Token | Uso |
|-------|-----|
| `shadow-sm` | Cards em repouso |
| `shadow-md` | Cards em hover, dropdowns |
| `shadow-lg` | Modais, painéis flutuantes |

```ts
// src/index.css / tokens CSS
boxShadow: {
  sm: '0 1px 3px rgba(28,25,23,0.06)',
  md: '0 4px 12px rgba(28,25,23,0.08)',
  lg: '0 8px 24px rgba(28,25,23,0.10)',
}
```

---

## Ícones

**Biblioteca:** Lucide React — `npm install lucide-react`

```tsx
import { Stethoscope, Users, Calendar, FileText } from 'lucide-react'

// Tamanho padrão na sidebar: size={18}
// Tamanho em botões: size={16}
// Tamanho em headings: size={20}
```

Nunca usar emoji como ícone.

---

## Componentes Base

### Button

```tsx
// Variantes
variant="primary"   → bg-accent text-white hover:bg-accent-hover
variant="secondary" → bg-surface text-text-primary border border-border hover:bg-surface-hover
variant="danger"    → bg-danger text-white hover:bg-danger-hover
variant="ghost"     → transparent text-text-secondary hover:bg-surface-hover

// Tamanhos
size="sm"  → px-3 py-1.5 text-xs
size="md"  → px-4 py-2 text-sm      (padrão)
size="lg"  → px-5 py-2.5 text-base

// Loading state: spinner Lucide (Loader2 com animate-spin) substituindo texto
```

### Input

```tsx
// Estrutura
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-text-primary">Label</label>
  <input className="
    w-full px-3 py-2.5 rounded-md
    bg-white border border-border
    text-text-primary text-sm
    placeholder:text-text-muted
    focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
    transition-colors
  " />
  <span className="text-xs text-danger">mensagem de erro</span>
</div>
```

### Badge

```tsx
// Status de consulta
variant="success"  → bg-success/10 text-success
variant="danger"   → bg-danger/10 text-danger
variant="warning"  → bg-warning/10 text-warning
variant="neutral"  → bg-surface text-text-secondary
```

### Card

```tsx
<div className="bg-white rounded-lg shadow-sm border border-border p-6">
  {/* conteúdo */}
</div>
```

---

## Layout

### Estrutura geral

```
┌─────────────┬──────────────────────────────────┐
│   Sidebar   │         Main Content              │
│   240px     │         flex-1                    │
│   surface   │         background                │
│   fixed     │         overflow-y-auto           │
└─────────────┴──────────────────────────────────┘
```

### Sidebar

- Fundo: `bg-surface` (`#EDE8E3`)
- Largura fixa: `w-60` (240px)
- Altura: `h-screen` com `sticky top-0`
- Divisão: logo (topo) + nav (meio, flex-1) + perfil (rodapé)
- Sem shadow na sidebar — separação visual via diferença de cor com o fundo

### Item de navegação ativo

```tsx
// Ativo
className="flex items-center gap-3 px-3 py-2 rounded-md
           bg-surface-hover text-text-primary font-medium
           border-l-2 border-accent"

// Inativo
className="flex items-center gap-3 px-3 py-2 rounded-md
           text-text-secondary hover:bg-surface-hover hover:text-text-primary
           transition-colors"
```

### Página (main)

```tsx
<main className="flex-1 p-8 bg-background overflow-y-auto">
  <div className="max-w-5xl mx-auto">
    {/* conteúdo */}
  </div>
</main>
```

---

## Animações e Transições

Mínimo e proposital. Nunca animação por animação.

```css
/* Transições de estado (hover, focus) */
transition-colors duration-150

/* Entrada de modal/dropdown */
transition-opacity duration-200

/* Nunca usar */
animate-bounce, animate-ping  /* ❌ chama atenção desnecessária */
```

---

## O que NUNCA fazer

- Usar `bg-blue-*`, `bg-gray-*`, `text-gray-*` — quebra a identidade visual
- Colocar sombra em tudo — reservar para elementos elevados
- Usar mais de 2 fontes
- Colocar border-radius muito grande em inputs (`rounded-full`) — parece brinquedo
- Misturar ícones de bibliotecas diferentes
- Texto branco em fundo `accent` sem testar contraste (mínimo 4.5:1)
