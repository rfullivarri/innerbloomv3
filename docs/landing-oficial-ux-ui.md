# Innerbloom Landing Oficial (innerbloom.org) — Documento UX/UI para IA

> **Scope exacto:** este documento describe la landing oficial que se renderiza en la ruta `/` (`Landing.tsx`). **No cubre** `/landing-v2`.

## 1) Identificación de pantalla y routing

- La landing oficial está montada en la ruta raíz `/` y apunta al componente `LandingPage`.
- Existe una landing alternativa en `/landing-v2`, pero es otro componente (`LandingV2Page`) y debe ignorarse para este análisis.

## 2) Objetivo de producto (UX intent)

La landing tiene un objetivo de conversión claro: llevar usuarios anónimos a **iniciar su journey** (`/intro-journey`) o a autenticarse (`/login`, `/sign-up`), y a usuarios autenticados a entrar directo al dashboard.

### Propuesta de valor principal
- “Convertir experiencia en hábitos” + “convertir hábitos en camino”.
- Marco conceptual Body / Mind / Soul.
- Personalización con IA en menos de 3 minutos.
- Tono de “self-improvement gamificado” con lenguaje emocional y de progreso (XP, rachas, misiones, recompensas).

## 3) Arquitectura de información (IA) de la landing

La estructura visual y narrativa sigue este orden:

1. **Header sticky** con branding + selector de idioma + CTAs de auth.
2. **Hero** (mensaje principal, subtítulo, CTA primario, nota de confianza y visual protagonista).
3. **Pilares** (Body/Mind/Soul).
4. **Modos de juego** (Low, Chill, Flow, Evolve).
5. **Cómo funciona** (4 pasos).
6. **Feature showcase** (6 tarjetas con mini-previews de producto).
7. **Testimonios** (carousel automático + controles manuales).
8. **FAQ** (acordeón con `<details>`).
9. **CTA final** para comenzar journey.
10. **Footer** con navegación secundaria.

## 4) Sistema de contenidos y localización

- Idiomas soportados: `es` y `en`.
- El idioma se controla por estado local (`useState`) y se cambia vía dropdown custom.
- El contenido está centralizado en objetos `content` (hero, pilares, modos, how, testimonials, faq, next, auth, footer) y `FEATURE_CONTENT` para el bloque de features.
- `navLinks` existe en el modelo pero hoy está vacío en ambos idiomas (no hay links de navegación interna visibles).

## 5) Comportamiento por estado de autenticación

- **Usuario no autenticado:** muestra botones de `Crear cuenta` + `Iniciar sesión` en header, y CTA principal a `Comenzar mi Journey`.
- **Usuario autenticado:** reemplaza CTAs por `Ir al dashboard` (header + hero + CTA final).

## 6) Diseño visual global

## 6.1 Dirección estética

- Estética **dark premium / glassmorphism suave**.
- Fondo profundo con capas de gradientes radiales (azules, cian, violeta) para dar atmósfera “energía/aurora”.
- Superficies con blur, bordes translúcidos y sombras largas para sensación de profundidad.
- Uso consistente de esquinas redondeadas (12–18 px aprox.) y pills.

## 6.2 Tipografía

- Heading: `Sora`.
- Body/UI: `Manrope`.
- Tracking ajustado en títulos (ligeramente negativo) para look moderno.

## 6.3 Grid y espaciado

- Contenedor principal: `max-width: 1080px` (narrow: `900px`).
- Padding lateral base: `18px`.
- Separación vertical de secciones: `64px`.
- Hero desktop: grid 2 columnas (`copy` + visual cuadrado).
- Mobile/tablet: colapsa progresivamente a 1 columna.

## 7) Paleta de colores (tokens y uso)

## 7.1 Tokens base del tema (dark)

| Token | Valor | Uso principal |
|---|---:|---|
| `--color-surface` | `#0f172a` | Fondo base de app |
| `--color-surface-muted` | `#111c33` | Superficies secundarias |
| `--color-surface-elevated` | `#182640` | Tarjetas elevadas |
| `--color-text` | `#f8fafc` | Texto principal |
| `--color-text-muted` | `#cbd5f5` | Texto secundario |
| `--color-text-subtle` | `#94a3b8` | Texto tenue |
| `--color-accent-primary` | `#38bdf8` | Cian de acento |
| `--color-accent-secondary` | `#8b5cf6` | Violeta de acento |

## 7.2 Variables específicas de landing

| Variable landing | Valor | Rol |
|---|---:|---|
| `--bg` | `#0b1220` | Fondo raíz landing |
| `--bg-2` | `#0f1a2e` | Mezcla de fondo |
| `--card` | `#111f35` | Base de cards |
| `--ink` | `#eaf1ff` | Texto principal landing |
| `--fluid-c1` | `#38bdf8` | Halo atmosférico |
| `--fluid-c2` | `#8b5cf6` | Halo atmosférico |
| `--fluid-c3` | `#22d3ee` | Halo atmosférico |
| `--fluid-c4` | `#a5b4fc` | Halo atmosférico |
| `--low` | `#fb7185` | Modo LOW |
| `--chill` | `#34d399` | Modo CHILL |
| `--flow` | `#38bdf8` | Modo FLOW |
| `--evolve` | `#8b5cf6` | Modo EVOLVE |

## 7.3 Colores de mini-previews (feature cards)

### Emotion heatmap (leyenda)
- Calm: `#2ECC71`
- Happiness: `#F1C40F`
- Motivation: `#9B59B6`
- Sadness: `#3498DB`
- Anxiety: `#E74C3C`
- Frustration: `#8D6E63`
- Fatigue: `#16A085`

### Estados y chips
- “done” en quests: verde (`#34d399`)
- Pills por pilar:
  - Focus: azul/cian translúcido
  - Health: verde translúcido
  - Mind: violeta translúcido
  - Soul: rosado translúcido

## 8) Componentización UX por sección

## 8.1 Header

- Sticky con blur (`backdrop-filter`) y borde inferior translúcido.
- Branding “Innerbloom” + logo circular color.
- Selector de idioma minimal (`EN/ES`) con menú desplegable.
- Botones de auth con dos variantes:
  - **Primary:** fondo acento, texto blanco, glow.
  - **Ghost:** transparente, hover suave.

## 8.2 Hero

- H1 en dos fragmentos: lead + texto gradiente.
- Subtítulo descriptivo de valor y contexto.
- CTA central de alta prominencia (`journey-cta`) con borde cónico animado.
- Nota de confianza/velocidad: “<3 min con IA”.
- Imagen hero cuadrada con recorte `object-position` superior, borde y sombra flotante.

## 8.3 Pilares

- 3 tarjetas (Body/Mind/Soul), cada una con emoji + título + copy.
- Cierre con bloque “highlight” para reforzar propuesta de introspección.

## 8.4 Modos de juego

- 4 cards (Low/Chill/Flow/Evolve).
- Señalización cromática por modo con **borde izquierdo + dot**.
- Microestructura textual constante: Estado + Objetivo.

## 8.5 Cómo funciona

- Lista ordenada de 4 pasos.
- Badge numérico por paso con gradiente violeta/cian.
- Flujo: definir camino → activar base → quest/emociones → XP/rachas/recompensas.

## 8.6 Feature showcase

Sección de 6 feature cards, cada una con título/descripcion y preview visual simulado:

1. **Daily Quest**: anillo de progreso al 72% + lista de tareas con estado.
2. **XP & Nivel**: barra al 64%, metadata de XP semanal y objetivo.
3. **Constancia semanal**: barras de 8 semanas con highlight de racha activa.
4. **Misiones & Rewards**: progreso de misión al 40% + badges de racha/bonus.
5. **Emotion Heatmap**: grilla 6x18 con glow dinámico de celdas.
6. **App & Recordatorios**: mock de teléfono con toasts cíclicos.

## 8.7 Testimonios (carousel)

- Auto-rotación cada 4s.
- Pausa en hover/focus para mejorar lectura.
- Navegación por flechas + dots + teclado (`ArrowLeft` / `ArrowRight`).
- Buen patrón de accesibilidad con `aria-roledescription`, `role=group`, `tablist`.

## 8.8 FAQ

- Implementación con `<details>/<summary>` (nativo, simple y accesible).
- 4 preguntas orientadas a fricción de entrada y continuidad.

## 8.9 CTA final + Footer

- Repite CTA primario para cierre de conversión.
- Footer con links de auth/dashboard + ancla a FAQ.

## 9) Motion & microinteracciones

- Reveal on scroll por secciones (`IntersectionObserver`) con fade/translate.
- Stagger interno por items (`--delay`).
- Hero visual con flotación lenta.
- CTA principal con animación `conic-spin` continua.
- En previews: shimmer, pulse, sweep, glow, toast cycle.
- Respeta `prefers-reduced-motion`: desactiva animaciones y revela contenido estático.

## 10) Accesibilidad y semántica

- Navegación y controles con labels ARIA en slider e idioma.
- Soporte de teclado en carrusel (flechas).
- Elementos semánticos de sección (`header`, `main`, `section`, `footer`, `figure`, `blockquote`, `details`).
- Clase `visually-hidden` para texto accesible en dots del slider.
- Menú de idioma ocultado con atributo `[hidden]`.

## 11) Responsive behavior (breakpoints)

- `<=1024px`: hero pasa a una columna y centra contenido.
- `<=768px`: grilla de 3 columnas pasa a 2; pasos apilan.
- `<=640px`:
  - grillas (`grid-3`, `grid-2`) pasan a 1 columna,
  - ajustes de tipografía/tamaños en nav,
  - se oculta `brand-text` (queda logomark),
  - slider reduce paddings,
  - features Daily Quest / feature-grid también apilan.

## 12) SEO/meta

La landing carga metadatos de página (title, description, OG/Twitter image, canonical URL) con `usePageMeta`, orientado a compartir preview visual y mantener identidad de marca.

## 13) Prompt-ready: especificación resumida para otra IA

Usa esta especificación cuando quieras recrear o analizar esta landing:

- **Tipo de página:** Landing de conversión para producto de hábitos gamificados.
- **Tema visual:** dark premium con acentos cian/violeta, gradientes atmosféricos y cards glassmorphism.
- **Tipografía:** Sora (headings) + Manrope (body).
- **Secciones obligatorias (orden):** Header, Hero, Pilares, Modos, Cómo funciona, Features (6), Testimonios carousel, FAQ, CTA final, Footer.
- **CTAs:** primario redondeado con glow; versión ghost secundaria.
- **Estados auth:** si está logueado → botón a dashboard; si no → login/sign-up/journey.
- **Animación:** reveal-on-scroll + microanimaciones en previews; pausar carrusel en hover/focus; respetar reduced motion.
- **Paleta base:** fondo `#0b1220/#0f1a2e`, texto claro `#eaf1ff`, acentos `#38bdf8` y `#8b5cf6`, modos `#fb7185/#34d399/#38bdf8/#8b5cf6`.
- **Tono de copy:** motivacional, claro, orientado a progreso medible sin culpa.

## 14) Nota de implementación

Este documento describe el estado actual de código de la landing oficial de `innerbloom.org` dentro de este repo, y está pensado para que una IA (ChatGPT u otra) pueda reconstruir fielmente su UX/UI y sistema visual sin mezclarlo con `/landing-v2`.
