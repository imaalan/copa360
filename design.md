# Copa360 — Design System

## Brand Vision

> "A visão completa da Copa do Mundo."

Copa360 é uma plataforma moderna e premium focada na Copa do Mundo de 2026.

A marca deve transmitir:

- cobertura global
- profundidade editorial
- exploração
- tecnologia
- storytelling
- estatísticas
- experiência cinematográfica

---

# Brand Positioning

## Archetype

Mistura entre:

- Explorer
- Sage
- Creator

---

# Brand Personality

| Atributo | Intensidade |
|---|---|
| Premium | Alta |
| Editorial | Alta |
| Tecnológica | Média |
| Minimalista | Alta |
| Esportiva | Média |
| Futurista | Média |

---

# Visual Direction

## Inspirações

- Apple Sports
- FIFA+
- Formula 1
- UEFA Champions League
- OneFootball
- Netflix Sports Docs
- The Athletic

---

# Core Concept

O diferencial da marca é o “360”.

A identidade deve representar:

- visão completa
- radar
- perspectiva global
- descoberta
- movimento
- cobertura mundial

Evitar elementos clichês como:

- bola de futebol tradicional
- escudos
- gramado
- estética gamer
- visual de casa de aposta

---

# Color Palette

## Primary Colors

| Nome | HEX | Uso |
|---|---|---|
| Graphite Black | `#111315` | Fundo principal |
| Deep Midnight | `#0B1020` | Background alternativo |
| Soft Gold | `#C8A96B` | Destaques premium |
| Editorial Blue | `#5068A9` | Links e elementos secundários |
| Ice White | `#F3F4F6` | Texto principal |
| Slate Gray | `#6B7280` | Texto secundário |

---

# Design Tokens

```css
:root {
  --bg-primary: #111315;
  --bg-secondary: #0B1020;

  --text-primary: #F3F4F6;
  --text-secondary: #9CA3AF;

  --accent-gold: #C8A96B;
  --accent-blue: #5068A9;

  --border-subtle: rgba(255,255,255,0.08);

  --card-bg: rgba(255,255,255,0.03);

  --shadow-soft:
    0 10px 30px rgba(0,0,0,0.25);

  --radius-lg: 20px;
  --radius-xl: 28px;
}
```

---

# Typography

## Primary Font

# Sora

## Font Weights

| Uso | Peso |
|---|---|
| Hero | 700 |
| Títulos | 600 |
| Corpo | 400 |
| Labels | 300 |

---

# Typography Scale

```css
h1 {
  font-size: 72px;
  line-height: 0.95;
  letter-spacing: -0.04em;
}

h2 {
  font-size: 48px;
}

h3 {
  font-size: 32px;
}

body {
  font-size: 16px;
  line-height: 1.7;
}
```

---

# Logo System

## Estrutura da Marca

A logo deve possuir:

- tipografia limpa
- construção minimalista
- orbital/radar circular
- destaque visual no “360”
- aparência editorial e premium

## NÃO usar

- bolas de futebol tradicionais
- escudos
- mascotes
- elementos exageradamente esportivos

---

# Logo Meaning

## Orbital Ring

Representa:

- visão 360°
- radar
- cobertura mundial
- exploração
- movimento

## COPA

Representa o lado editorial e institucional.

## 360

Representa tecnologia, profundidade e interatividade.

---

# Logo Spacing

```txt
x = altura do “C”

Margem mínima:
1x em todos os lados
```

---

# Layout System

## Grid

```txt
12-column grid
1440px max-width
```

---

# Spacing System

| Token | Valor |
|---|---|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 40px |
| 2xl | 64px |

---

# UI Direction

A interface deve parecer:

- cinematográfica
- editorial
- tecnológica
- elegante
- limpa
- moderna

Mistura entre:

- streaming platform
- sports intelligence platform
- premium football app

---

# Surface Styles

## Cards

```css
.card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(20px);

  border-radius: 24px;
}
```

---

# Buttons

## Primary Button

```css
.button-primary {
  background: #C8A96B;
  color: #111315;

  padding: 14px 24px;
  border-radius: 999px;

  font-weight: 600;
}
```

## Secondary Button

```css
.button-secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);

  color: #F3F4F6;
}
```

---

# Inputs

```css
.input {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);

  height: 52px;
  border-radius: 16px;

  color: white;
}
```

---

# Navigation

## Navbar Style

- transparente inicialmente
- blur ao scroll
- minimalista
- elegante
- discreta

---

# Hero Section

## Hero Copy

### Headline

```txt
A Copa do Mundo
como você nunca viu.
```

### Subheadline

```txt
Explore jogadores, seleções,
estatísticas e histórias da Copa de 2026.
```

---

# Component System

## Homepage Sections

1. Hero
2. Featured Players
3. Seleções
4. Estatísticas
5. História das Copas
6. Jogos
7. Notícias
8. Curiosidades

---

# Player Card

## Estrutura

- foto grande
- nacionalidade
- posição
- clube
- estatísticas
- botão “explorar”

---

# Motion Design

## Estilo de animação

Utilizar:

- fade suave
- motion elegante
- hover sutil
- glow discreto
- transições lentas
- parallax leve

## Evitar

- animações exageradas
- visual gamer
- neon excessivo
- partículas exageradas
- glitch effects

---

# Iconography

## Estilo ideal

- outline
- geométrico
- minimalista
- fino

## Bibliotecas recomendadas

- Lucide
- Heroicons
- Phosphor

---

# Photography Direction

## Estilo de imagens

- cinematográficas
- documentais
- contrastadas
- emocionais
- modernas

## Evitar

- thumbnails genéricas
- imagens ultra saturadas
- estética FIFA antiga
- visual de esports

---

# Mobile Experience

## Direção

- cards verticais
- navegação fluida
- interface cinematográfica
- foco em descoberta
- scroll elegante

---

# Tailwind Theme

```js
colors: {
  background: "#111315",
  surface: "#171A1F",
  gold: "#C8A96B",
  blue: "#5068A9",
  text: "#F3F4F6",
}
```

---

# Recommended Stack

## Frontend

- Next.js
- TailwindCSS
- Framer Motion
- shadcn/ui

---

# Brand Keywords

```txt
Global
Premium
Editorial
Modern
Football Intelligence
Discovery
Storytelling
World Cup
360 Experience
Cinematic
```

---

# Brand Mission

> Transformar a experiência de explorar a Copa do Mundo em algo moderno, inteligente e cinematográfico.

