# MCP Chart-Image UI/UX Design Plan

**Version**: 1.1
**Last Updated**: 2025-11-17
**Design Inspiration**: Claude.ai Chat Interface
**Component Library**: shadcn/ui + Radix UI + Tailwind CSS
**Target Platforms**: Web (Desktop, Tablet, Mobile)

---

## Table of Contents

1. [Overview](#overview)
2. [shadcn/ui Integration](#shadcnui-integration)
3. [Design Philosophy](#design-philosophy)
4. [Color Palette](#color-palette)
5. [Typography](#typography)
6. [Layout Structure](#layout-structure)
7. [Component Library](#component-library)
8. [Page Specifications](#page-specifications)
9. [User Flows](#user-flows)
10. [Responsive Design](#responsive-design)
11. [Accessibility](#accessibility)
12. [Animation & Transitions](#animation--transitions)
13. [shadcn/ui Implementation Guide](#shadcnui-implementation-guide)

---

## Overview

### Purpose
Design a conversational AI-powered trading chart platform with a Claude.ai-inspired chat interface, enabling users to generate and analyze trading charts through natural language.

### Key Features
- Natural language chart generation
- AI-powered chart analysis with trading signals
- Real-time chart preview and editing
- Chat-based interaction model
- Chart history and organization
- Export and sharing capabilities

### Design Goals
- **Conversational**: Chat-first interface for intuitive interaction
- **Professional**: Finance/trading industry credibility
- **Clean**: Minimal, distraction-free design
- **Fast**: Responsive, snappy interactions
- **Accessible**: WCAG 2.1 AA compliant

---

## shadcn/ui Integration

### Why shadcn/ui?

shadcn/ui is a collection of re-usable components built with **Radix UI** and **Tailwind CSS**. It provides:

- ✅ **Copy-paste components** - Not an npm package, you own the code
- ✅ **Accessibility built-in** - Radix UI primitives are WCAG 2.1 AA compliant
- ✅ **Customizable** - Full control over component styling
- ✅ **TypeScript** - Fully typed components
- ✅ **Tailwind CSS** - Utility-first styling
- ✅ **Dark mode support** - Built-in theme system
- ✅ **Composable** - Build complex UIs from simple components

### Component Architecture

```
shadcn/ui Component Stack:
┌────────────────────────────────────┐
│  Your Custom Components            │  ← Business logic, custom variants
├────────────────────────────────────┤
│  shadcn/ui Components              │  ← Button, Dialog, Toast, etc.
├────────────────────────────────────┤
│  Radix UI Primitives               │  ← Unstyled, accessible primitives
├────────────────────────────────────┤
│  Tailwind CSS                      │  ← Utility-first styling
├────────────────────────────────────┤
│  React / Next.js                   │  ← UI framework
└────────────────────────────────────┘
```

### Component Mapping

This design uses shadcn/ui components as the foundation. Here's how our custom components map to shadcn/ui:

| Our Component          | shadcn/ui Component | Radix Primitive        | Notes                          |
|------------------------|---------------------|------------------------|--------------------------------|
| **Buttons**            |                     |                        |                                |
| Primary Button         | `Button`            | `button`               | variant="default"              |
| Secondary Button       | `Button`            | `button`               | variant="outline"              |
| Icon Button            | `Button`            | `button`               | variant="ghost", size="icon"   |
| **Inputs**             |                     |                        |                                |
| Chat Input             | `Textarea`          | `textarea`             | Auto-resize, multiline         |
| Text Input             | `Input`             | `input`                | Standard form input            |
| Select Dropdown        | `Select`            | `Select`               | Radix Select primitive         |
| Checkbox               | `Checkbox`          | `Checkbox`             | Radix Checkbox primitive       |
| **Feedback**           |                     |                        |                                |
| Toast Notification     | `Toast`             | `Toast`                | Radix Toast primitive          |
| Modal/Dialog           | `Dialog`            | `Dialog`               | Radix Dialog primitive         |
| Loading Spinner        | Custom (Lucide)     | `svg`                  | Loader2 icon from Lucide       |
| Progress Bar           | `Progress`          | `Progress`             | Radix Progress primitive       |
| **Navigation**         |                     |                        |                                |
| Tabs                   | `Tabs`              | `Tabs`                 | Radix Tabs primitive           |
| Sidebar                | `Sheet`             | `Dialog`               | Mobile: Sheet, Desktop: static |
| Breadcrumbs            | Custom              | `nav`                  | Custom component               |
| **Display**            |                     |                        |                                |
| Chart Artifact Card    | `Card`              | `div`                  | Card + CardHeader + CardContent|
| Analysis Result Card   | `Card`              | `div`                  | Card with Alert variant        |
| Separator              | `Separator`         | `Separator`            | Radix Separator primitive      |
| **Forms**              |                     |                        |                                |
| Form Field             | `Form`              | `form`                 | react-hook-form + zod          |
| Label                  | `Label`             | `label`                | Radix Label primitive          |

### shadcn/ui Components to Install

For this project, you'll need the following shadcn/ui components:

```bash
# Core UI Components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add label

# Layout & Navigation
npx shadcn-ui@latest add card
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add separator

# Feedback & Overlays
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add skeleton

# Form Components
npx shadcn-ui@latest add form
npx shadcn-ui@latest add scroll-area

# Additional Utilities
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add tooltip
```

### Design Token Alignment

shadcn/ui uses **CSS variables** for theming, which aligns perfectly with our design system:

**Our Design Tokens → Tailwind/shadcn Variables:**

| Our Token              | Tailwind Class      | CSS Variable           |
|------------------------|---------------------|------------------------|
| Background (App)       | `bg-background`     | `--background`         |
| Background (Surface)   | `bg-card`           | `--card`               |
| Text Primary           | `text-foreground`   | `--foreground`         |
| Text Secondary         | `text-muted-foreground` | `--muted-foreground` |
| Primary                | `bg-primary`        | `--primary`            |
| Accent                 | `bg-accent`         | `--accent`             |
| Border Default         | `border-border`     | `--border`             |
| Border Focus           | `ring-ring`         | `--ring`               |
| Success                | `bg-green-500`      | N/A (Tailwind color)   |
| Error                  | `bg-destructive`    | `--destructive`        |

### Figma + shadcn/ui Workflow

**Recommended approach:**

1. **Design in Figma** using this specification
2. **Install shadcn/ui components** as base
3. **Customize components** to match Figma designs
4. **Use Figma Tokens** (plugin) to export design tokens
5. **Map tokens to Tailwind config** (colors, spacing, typography)

**Figma Resources:**
- shadcn/ui Figma Kit (community): Search "shadcn ui" in Figma Community
- Tailwind CSS Figma Kit: Official Tailwind design system
- Radix UI Figma Kit: For understanding primitive behaviors

---

## Design Philosophy

### Principles

1. **Conversation Over Configuration**
   - Natural language first, advanced options second
   - Progressive disclosure of complexity
   - Chat history as the primary navigation

2. **Clarity & Focus**
   - Clear hierarchy of information
   - Trading signals and analysis prominently displayed
   - Minimal visual noise

3. **Trust & Reliability**
   - Professional color scheme (dark green finance theme)
   - Consistent, predictable interactions
   - Clear error states and guidance

4. **Speed & Efficiency**
   - Keyboard shortcuts for power users
   - Quick actions for common tasks
   - Optimized loading states

---

## Color Palette

### Dark Mode (Primary Theme)

#### Base Colors
```
Background (App)      : #0D1F17  (Very Dark Green)
Background (Surface)  : #1A2F27  (Dark Green-Gray)
Background (Elevated) : #243D35  (Medium Dark Green)
Background (Overlay)  : rgba(13, 31, 23, 0.95)
```

#### Text Colors
```
Text Primary          : #E8F5F0  (Off-White with green tint)
Text Secondary        : #A8C5B8  (Light Gray-Green)
Text Tertiary         : #6B8078  (Medium Gray-Green)
Text Disabled         : #4A5850  (Dark Gray-Green)
```

#### Brand Colors
```
Primary               : #00A86B  (Medium Green)
Primary Hover         : #00C97A  (Bright Green)
Primary Active        : #008F5C  (Dark Green)
Accent                : #00D97E  (Vibrant Green)
```

#### Semantic Colors
```
Bullish/Long          : #00D97E  (Green)
Bearish/Short         : #EF4444  (Red)
Neutral               : #F59E0B  (Amber)
Success               : #10B981  (Emerald)
Warning               : #F97316  (Orange)
Error                 : #DC2626  (Red)
Info                  : #3B82F6  (Blue)
```

#### UI Elements
```
Border Default        : #2F4A42  (Dark Green Border)
Border Subtle         : #1F3630  (Very Dark Green Border)
Border Focus          : #00D97E  (Accent Green)
Divider               : #243D35  (Same as elevated bg)
```

### Light Mode

#### Base Colors
```
Background (App)      : #F8FAF9  (Off-White with green tint)
Background (Surface)  : #FFFFFF  (White)
Background (Elevated) : #F0F9F5  (Light Green-Tint)
Background (Overlay)  : rgba(255, 255, 255, 0.95)
```

#### Text Colors
```
Text Primary          : #1A1A1A  (Nearly Black)
Text Secondary        : #6B7280  (Medium Gray)
Text Tertiary         : #9CA3AF  (Light Gray)
Text Disabled         : #D1D5DB  (Very Light Gray)
```

#### Brand Colors
```
Primary               : #00A86B  (Medium Green)
Primary Hover         : #008F5C  (Dark Green)
Primary Active        : #007549  (Darker Green)
Accent                : #00D97E  (Vibrant Green)
```

#### Semantic Colors
```
Bullish/Long          : #059669  (Emerald 600)
Bearish/Short         : #DC2626  (Red 600)
Neutral               : #D97706  (Amber 600)
Success               : #10B981  (Emerald 500)
Warning               : #F97316  (Orange 500)
Error                 : #DC2626  (Red 600)
Info                  : #3B82F6  (Blue 500)
```

#### UI Elements
```
Border Default        : #E5E7EB  (Gray 200)
Border Subtle         : #F3F4F6  (Gray 100)
Border Focus          : #00A86B  (Primary Green)
Divider               : #E5E7EB  (Gray 200)
```

### Color Usage Guidelines

**Backgrounds:**
- Use `Background (App)` for the main canvas
- Use `Background (Surface)` for cards, panels, modals
- Use `Background (Elevated)` for raised elements (dropdowns, tooltips)

**Text:**
- Use `Text Primary` for headings and important content
- Use `Text Secondary` for body text and descriptions
- Use `Text Tertiary` for meta information (dates, labels)

**Interactions:**
- Use `Primary` for main CTAs (Generate Chart, Analyze, Save)
- Use `Accent` for highlights, badges, active states
- Use semantic colors for trading signals and feedback

---

## Typography

### Font Families

```
Primary (UI)          : Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Monospace (Code)      : "JetBrains Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace
Data/Numbers          : "Inter", "SF Pro Display", system-ui
```

### Type Scale

#### Desktop

```
Display (H1)          : 36px / 44px (2.25rem / 2.75rem) | Bold | -0.02em
Heading 1 (H2)        : 30px / 38px (1.875rem / 2.375rem) | Semibold | -0.01em
Heading 2 (H3)        : 24px / 32px (1.5rem / 2rem) | Semibold | -0.01em
Heading 3 (H4)        : 20px / 28px (1.25rem / 1.75rem) | Semibold | 0em
Heading 4 (H5)        : 18px / 26px (1.125rem / 1.625rem) | Semibold | 0em
Body Large            : 16px / 24px (1rem / 1.5rem) | Regular | 0em
Body                  : 14px / 22px (0.875rem / 1.375rem) | Regular | 0em
Body Small            : 13px / 20px (0.8125rem / 1.25rem) | Regular | 0em
Caption               : 12px / 18px (0.75rem / 1.125rem) | Medium | 0.01em
Overline              : 11px / 16px (0.6875rem / 1rem) | Semibold | 0.06em uppercase
```

#### Mobile

```
Display (H1)          : 28px / 36px (1.75rem / 2.25rem) | Bold | -0.02em
Heading 1 (H2)        : 24px / 32px (1.5rem / 2rem) | Semibold | -0.01em
Heading 2 (H3)        : 20px / 28px (1.25rem / 1.75rem) | Semibold | 0em
Heading 3 (H4)        : 18px / 26px (1.125rem / 1.625rem) | Semibold | 0em
Body Large            : 16px / 24px (1rem / 1.5rem) | Regular | 0em
Body                  : 14px / 22px (0.875rem / 1.375rem) | Regular | 0em
Body Small            : 13px / 20px (0.8125rem / 1.25rem) | Regular | 0em
Caption               : 12px / 18px (0.75rem / 1.125rem) | Medium | 0em
```

### Font Weights

```
Regular               : 400
Medium                : 500
Semibold              : 600
Bold                  : 700
```

### Usage Guidelines

- **Headings**: Use semibold or bold weights
- **Body Text**: Use regular weight for readability
- **Labels/Captions**: Use medium weight for emphasis
- **Numbers/Data**: Use tabular-nums feature for alignment
- **Code**: Use monospace font with syntax highlighting

---

## Layout Structure

### Grid System

**Base Unit**: 8px (0.5rem)

**Spacing Scale**:
```
xs   : 4px   (0.25rem)  | 0.5x base
sm   : 8px   (0.5rem)   | 1x base
md   : 16px  (1rem)     | 2x base
lg   : 24px  (1.5rem)   | 3x base
xl   : 32px  (2rem)     | 4x base
2xl  : 48px  (3rem)     | 6x base
3xl  : 64px  (4rem)     | 8x base
```

**Container Widths**:
```
Max Width (Desktop)   : 1920px
Content Max Width     : 1440px
Chat Max Width        : 800px
Sidebar Width         : 280px
Right Panel Width     : 480px
```

### Main Layout (Claude.ai-inspired)

```
┌─────────────────────────────────────────────────────────────┐
│  Header / App Bar (Optional)                                │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                  │               │
│  Left    │       Main Chat Area             │  Right Panel  │
│  Sidebar │       (Message Stream)           │  (Artifacts)  │
│          │                                  │               │
│  280px   │                                  │  480px        │
│          │                                  │  (Optional)   │
│          │                                  │               │
│          ├──────────────────────────────────┤               │
│          │  Input Bar                       │               │
│          │  (Prompt Input + Actions)        │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

### Layout Breakdown

#### 1. Left Sidebar (280px fixed)
- **New Chat Button** (top)
- **Chat History** (scrollable list)
  - Grouped by date (Today, Yesterday, Last 7 days, etc.)
  - Each item shows conversation title + preview
- **User Profile** (bottom)
- **Settings** (bottom)

#### 2. Main Chat Area (fluid)
- **Message Stream** (scrollable)
  - User messages (right-aligned)
  - AI responses (left-aligned)
  - Charts displayed inline as artifacts
  - Analysis results in formatted cards
- **Input Bar** (bottom, fixed)
  - Text input (natural language prompt)
  - Attachment button (upload chart image)
  - Submit button
  - Character count / model selector

#### 3. Right Panel (480px, collapsible)
- **Artifact Viewer** (when chart is generated)
  - Large chart preview
  - Chart metadata (symbol, interval, indicators)
  - Action buttons (Download, Share, Edit, Analyze)
- **Analysis Details** (when analysis is shown)
  - Trading signal visualization
  - Support/resistance levels
  - Risk/reward breakdown
  - Confidence score

---

## Component Library

### 1. Navigation Components

#### Sidebar Item (Chat History)
```
Component: SidebarChatItem
States: Default, Hover, Active, Focus

Layout:
┌─────────────────────────────────┐
│ 📊 Bitcoin Analysis             │  ← Title (truncated)
│ Show me BTC with RSI...         │  ← Preview (2 lines max)
│ 2 hours ago                     │  ← Timestamp
└─────────────────────────────────┘

Specs:
- Padding: 12px (md + sm)
- Border-radius: 8px
- Gap: 4px (xs)
- Hover: Background (Elevated)
- Active: Border-left: 3px solid Accent
```

#### New Chat Button
```
Component: NewChatButton
Type: Primary CTA

Layout:
┌─────────────────────────────────┐
│  ✨ New Chat                    │
└─────────────────────────────────┘

Specs:
- Width: 100%
- Height: 44px
- Padding: 12px 16px
- Border-radius: 8px
- Background: Primary
- Text: Body Medium
- Icon: 16px
```

### 2. Message Components

#### User Message Bubble
```
Component: UserMessage
Alignment: Right

Layout:
                 ┌──────────────────────────┐
                 │ Show me Bitcoin chart    │
                 │ with RSI for last 7 days │
                 └──────────────────────────┘
                 10:30 AM

Specs:
- Max-width: 70%
- Padding: 12px 16px
- Border-radius: 16px 16px 4px 16px
- Background: Primary
- Text: Text Primary (on dark bg)
- Shadow: sm (subtle)
```

#### AI Response Bubble
```
Component: AIMessage
Alignment: Left

Layout:
┌──────────────────────────────────────┐
│ 🤖 I'll generate a Bitcoin chart     │
│ with RSI indicator for the last      │
│ 7 days. One moment...                │
└──────────────────────────────────────┘
10:30 AM

Specs:
- Max-width: 100% (can span full width)
- Padding: 16px
- Border-radius: 16px 16px 16px 4px
- Background: Surface
- Border: 1px solid Border Subtle
- Text: Text Primary
```

#### Chart Artifact Card
```
Component: ChartArtifactCard

Layout:
┌────────────────────────────────────────┐
│  📊 BINANCE:BTCUSDT                    │
│  ┌──────────────────────────────────┐ │
│  │                                  │ │
│  │      [Chart Image Preview]       │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Interval: 4h  |  Range: 1M            │
│  Indicators: RSI (14)                  │
│                                        │
│  [🔍 Analyze] [⬇ Download] [🔗 Share] │
└────────────────────────────────────────┘

Specs:
- Width: 100% (max 700px)
- Padding: 16px
- Border-radius: 12px
- Background: Surface
- Border: 1px solid Border Default
- Shadow: md
- Gap: 12px between elements
```

#### Analysis Result Card
```
Component: AnalysisResultCard

Layout:
┌────────────────────────────────────────┐
│  📈 Chart Analysis                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                        │
│  Trend: ● Bullish                      │
│  Confidence: 78%  ██████████░░░        │
│                                        │
│  📍 Key Levels                         │
│  ├─ Support: $94,000 | $92,000        │
│  └─ Resistance: $97,500 | $100,000    │
│                                        │
│  🎯 Trading Signal: LONG               │
│  ┌──────────────────────────────────┐ │
│  │ Entry:  $94,100                  │ │
│  │ Stop:   $93,500  (-0.64%)        │ │
│  │ Target: $97,500  (+3.61%)        │ │
│  │ R:R:    5.67:1   ✅              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  💡 Analysis                           │
│  Strong support at $94K level with    │
│  bullish RSI divergence...            │
│                                        │
│  [📋 Copy Signal] [📊 View Chart]     │
└────────────────────────────────────────┘

Specs:
- Width: 100%
- Padding: 20px
- Border-radius: 12px
- Background: Surface
- Border: 2px solid Accent (for important signals)
- Gap: 16px between sections
- Use semantic colors for signal types
```

### 3. Input Components

#### Chat Input Bar
```
Component: ChatInput

Layout:
┌────────────────────────────────────────────┐
│  📎  Type your message...          [Send]  │
└────────────────────────────────────────────┘

Specs:
- Height: 56px (desktop), 48px (mobile)
- Padding: 8px 16px
- Border-radius: 28px (pill shape)
- Background: Surface (elevated)
- Border: 1px solid Border Default
- Focus: Border-color: Primary, Shadow: focus ring
- Max-height: 200px (expandable for multiline)
```

#### Attachment Button
```
Component: AttachmentButton
Type: Icon Button

Icon: 📎 (paperclip)
Size: 20px
Padding: 8px
Border-radius: 50%
Background: Transparent
Hover: Background (Elevated)
```

#### Send Button
```
Component: SendButton
Type: Primary Icon Button

Icon: ➤ (arrow)
Size: 40px
Padding: 10px
Border-radius: 50%
Background: Primary
Disabled: Opacity 0.5
```

### 4. Action Buttons

#### Primary Button
```
Component: Button
Variant: Primary

Specs:
- Height: 40px (default), 44px (large), 36px (small)
- Padding: 10px 20px
- Border-radius: 8px
- Background: Primary
- Text: Text Primary (on dark)
- Font: Body Medium

States:
- Default: Background Primary
- Hover: Background Primary Hover, Shadow sm
- Active: Background Primary Active
- Focus: Focus ring (2px, Primary, offset 2px)
- Disabled: Opacity 0.5, cursor not-allowed
```

#### Secondary Button
```
Component: Button
Variant: Secondary

Specs:
- Same sizing as Primary
- Background: Transparent
- Border: 1px solid Border Default
- Text: Text Primary

States:
- Hover: Background Surface (Elevated), Border Primary
- Active: Background Primary (10% opacity)
```

#### Icon Button
```
Component: IconButton

Specs:
- Size: 36px × 36px
- Padding: 8px
- Border-radius: 8px
- Background: Transparent

States:
- Hover: Background Surface (Elevated)
- Active: Background Primary (10% opacity)
```

### 5. Form Components

#### Text Input
```
Component: TextInput

Specs:
- Height: 44px
- Padding: 10px 14px
- Border-radius: 8px
- Background: Surface
- Border: 1px solid Border Default
- Text: Body
- Placeholder: Text Tertiary

States:
- Focus: Border Primary, Shadow focus ring
- Error: Border Error, helper text in Error color
- Disabled: Opacity 0.5, cursor not-allowed
```

#### Select Dropdown
```
Component: Select

Specs:
- Height: 44px
- Padding: 10px 14px
- Border-radius: 8px
- Background: Surface
- Border: 1px solid Border Default
- Icon: Chevron down (16px)

States:
- Open: Border Primary, dropdown overlay with shadow lg
- Hover: Background Surface (Elevated)
```

#### Checkbox
```
Component: Checkbox

Specs:
- Size: 20px × 20px
- Border-radius: 4px
- Border: 2px solid Border Default
- Checkmark: Primary color

States:
- Checked: Background Primary, white checkmark
- Indeterminate: Background Primary, white dash
- Focus: Focus ring
```

### 6. Feedback Components

#### Toast Notification
```
Component: Toast
Position: Bottom-right (desktop), Top (mobile)

Layout:
┌────────────────────────────────────┐
│ ✅ Chart saved successfully!       │
│ Your chart is ready to share.      │
└────────────────────────────────────┘

Specs:
- Width: 360px (max)
- Padding: 16px
- Border-radius: 12px
- Background: Surface (Elevated)
- Border-left: 4px solid Success/Error/Warning/Info
- Shadow: lg
- Duration: 4s (auto-dismiss)
```

#### Loading Spinner
```
Component: LoadingSpinner

Specs:
- Size: 24px (default), 16px (small), 32px (large)
- Color: Primary
- Animation: Spin (1s linear infinite)
```

#### Progress Bar
```
Component: ProgressBar

Specs:
- Height: 4px
- Width: 100%
- Border-radius: 2px
- Background: Border Subtle
- Fill: Primary (animated)
```

### 7. Navigation Components

#### Tabs
```
Component: Tabs

Layout:
┌────────┬────────┬────────┐
│ Charts │ Trades │ History│
└────────┴────────┴────────┘
  ━━━━━━  (active indicator)

Specs:
- Height: 44px
- Padding: 12px 16px (each tab)
- Gap: 4px
- Border-bottom: 2px solid Border Subtle (container)
- Active: Border-bottom: 2px solid Primary
- Text: Body Medium
```

#### Breadcrumbs
```
Component: Breadcrumbs

Layout:
Home / Charts / Bitcoin Analysis

Specs:
- Font: Body Small
- Color: Text Secondary
- Separator: "/" or "›"
- Active: Text Primary, Bold
```

---

## Page Specifications

### 1. Landing Page

**Purpose**: Marketing page to introduce the platform and drive signups

#### Hero Section
```
Layout:
┌─────────────────────────────────────────────────┐
│                                                 │
│        Generate Trading Charts with AI         │  ← Display (H1)
│                                                 │
│   Natural language to professional charts in   │  ← Body Large
│   seconds. Powered by GPT-4 Vision.            │
│                                                 │
│   [Try "Show me Bitcoin with RSI"] ➤           │  ← Interactive demo input
│                                                 │
│   [Get Started Free] [View Demo]               │  ← CTAs
│                                                 │
└─────────────────────────────────────────────────┘
```

Specs:
- Max-width: 800px (centered)
- Padding: 80px 24px (desktop), 48px 16px (mobile)
- Background: Gradient (Dark Green to Black)
- Text: Center-aligned
- Demo input: Same as ChatInput component

#### Features Section
```
┌──────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ 📊      │  │ 🤖      │  │ ⚡      │         │
│  │ Natural │  │ AI      │  │ Real-   │         │
│  │ Language│  │ Analysis│  │ time    │         │
│  └─────────┘  └─────────┘  └─────────┘         │
└──────────────────────────────────────────────────┘

3 columns on desktop, 1 column on mobile
Each card: 360px wide, 240px tall, padding 24px
```

#### Pricing Section
```
┌───────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Free     │  │ Pro      │  │ Enterprise││
│  │ $0/mo    │  │ $29/mo   │  │ Custom    ││
│  │          │  │          │  │           ││
│  │ Features │  │ Features │  │ Features  ││
│  │ ...      │  │ ...      │  │ ...       ││
│  │          │  │          │  │           ││
│  │ [Start]  │  │ [Start]  │  │ [Contact] ││
│  └──────────┘  └──────────┘  └──────────┘│
└───────────────────────────────────────────┘

Pricing cards: 360px wide, 520px tall
Highlighted card (Pro): Border 2px Primary, Shadow lg
```

### 2. Main Chat Interface

**Purpose**: Primary application interface for chart generation and analysis

#### Desktop Layout (≥1280px)
```
┌────────────────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌────────────────────────────┐ ┌──────────────┐│
│  │          │ │ User: Show me BTC          │ │              ││
│  │  Chat    │ │                            │ │   Chart      ││
│  │  History │ │ ┌────────────────────────┐ │ │   Preview    ││
│  │          │ │ │  AI: Chart generated   │ │ │              ││
│  │ ● Today  │ │ │  [Chart Preview]       │ │ │  [Image]     ││
│  │ BTC RSI  │ │ └────────────────────────┘ │ │              ││
│  │ ETH MACD │ │                            │ │   Metadata   ││
│  │          │ │ User: Analyze this         │ │   Symbol:    ││
│  │ ● Yest.. │ │                            │ │   BINANCE:   ││
│  │ ...      │ │ ┌────────────────────────┐ │ │   BTCUSDT    ││
│  │          │ │ │  AI: Analysis Results  │ │ │              ││
│  │          │ │ │  [Analysis Card]       │ │ │   Actions    ││
│  │          │ │ └────────────────────────┘ │ │   [Download] ││
│  │          │ ├────────────────────────────┤ │   [Share]    ││
│  │          │ │  📎 Type message...   [➤] │ │   [Analyze]  ││
│  └──────────┘ └────────────────────────────┘ └──────────────┘│
└────────────────────────────────────────────────────────────────┘
   280px           Fluid (min 400px)            480px
```

#### Tablet Layout (768px - 1279px)
```
┌────────────────────────────────────────────┐
│ ☰ Chat History (drawer)                   │
├────────────────────────────────────────────┤
│                                            │
│  User: Show me BTC                         │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  AI: Chart generated                 │ │
│  │  [Chart Preview - Inline]            │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  User: Analyze this                        │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  AI: Analysis Results                │ │
│  │  [Analysis Card - Inline]            │ │
│  └──────────────────────────────────────┘ │
│                                            │
├────────────────────────────────────────────┤
│  📎 Type message...                   [➤] │
└────────────────────────────────────────────┘

Sidebar: Collapsible drawer (slide from left)
Right panel: Merged into chat stream
```

#### Mobile Layout (≤767px)
```
┌─────────────────────────────┐
│ ☰  Chart AI          [⚙]   │
├─────────────────────────────┤
│                             │
│ User:                       │
│ Show me BTC with RSI        │
│                       10:30 │
│                             │
│ ┌─────────────────────────┐ │
│ │ AI:                     │ │
│ │ [Chart Preview]         │ │
│ │ Tap to expand           │ │
│ └─────────────────────────┘ │
│                       10:31 │
│                             │
│ User:                       │
│ Analyze this chart          │
│                       10:32 │
│                             │
│ ┌─────────────────────────┐ │
│ │ AI:                     │ │
│ │ Trend: Bullish 📈       │ │
│ │ Entry: $94,100          │ │
│ │ [View Details]          │ │
│ └─────────────────────────┘ │
│                       10:33 │
│                             │
├─────────────────────────────┤
│ 📎 Message...          [➤] │
└─────────────────────────────┘

Full-width messages
Charts tap to expand (modal/fullscreen)
Sidebar: Hamburger menu (drawer)
```

### 3. Chart Gallery / History

**Purpose**: Browse and manage saved charts

#### Layout
```
┌────────────────────────────────────────────────┐
│  📊 Chart Gallery                              │
│                                                │
│  [🔍 Search] [Filter ▾] [Sort: Recent ▾]      │
│                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ [Chart]  │ │ [Chart]  │ │ [Chart]  │      │
│  │ BTC 4H   │ │ ETH 1D   │ │ SOL 15M  │      │
│  │ 2h ago   │ │ 1d ago   │ │ 3d ago   │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ [Chart]  │ │ [Chart]  │ │ [Chart]  │      │
│  │ AAPL 1D  │ │ EUR/USD  │ │ BTC 1H   │      │
│  │ 5d ago   │ │ 1w ago   │ │ 2w ago   │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                                │
│  [Load More]                                   │
└────────────────────────────────────────────────┘
```

Specs:
- Grid: 3 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Card size: 360px × 240px
- Gap: 24px
- Chart preview: Cover image, aspect ratio 16:9
- Hover: Overlay with actions (View, Download, Delete)

### 4. Settings Page

**Purpose**: User preferences, API keys, plan management

#### Layout
```
┌────────────────────────────────────────────────┐
│  ⚙ Settings                                    │
│                                                │
│  ┌─────────────────┐                          │
│  │ General         │ ← Active tab             │
│  │ API Keys        │                          │
│  │ Appearance      │                          │
│  │ Billing         │                          │
│  └─────────────────┘                          │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  General Settings                        │ │
│  │                                          │ │
│  │  Default Model                           │ │
│  │  [GPT-4o-mini ▾]                         │ │
│  │                                          │ │
│  │  Default Trading Style                   │ │
│  │  [Swing Trading ▾]                       │ │
│  │                                          │ │
│  │  Auto-analyze charts                     │ │
│  │  [✓] Analyze after generation            │ │
│  │                                          │ │
│  │  [Save Changes]                          │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

Specs:
- Sidebar: 200px wide
- Content: 600px max-width
- Form fields: Full-width (within content area)
- Submit button: Bottom-right

---

## User Flows

### Flow 1: Quick Chart Generation (Happy Path)

```
1. User lands on chat interface
   ↓
2. User types: "Show me Bitcoin with RSI for last 7 days"
   ↓
3. User presses Enter or clicks Send
   ↓
4. AI shows "Generating chart..." (loading state)
   ↓
5. Chart appears inline in chat (artifact card)
   ↓
6. Right panel shows large preview + metadata
   ↓
7. User can:
   - Download chart
   - Analyze chart (AI analysis)
   - Share chart (copy URL)
   - Edit configuration
```

**Key Interactions:**
- Input validation (prevent empty submit)
- Loading state (spinner + progress message)
- Success state (chart preview + actions)
- Error state (show error message + retry option)

### Flow 2: Advanced Chart Configuration

```
1. User clicks "Advanced Options" in chat input
   ↓
2. Modal opens with configuration form:
   - Symbol selection (exchange + symbol dropdowns)
   - Interval (dropdown: 1m, 5m, 15m, 1h, 4h, 1D, 1W)
   - Range (dropdown: 1D, 7D, 1M, 3M, 1Y)
   - Indicators (multi-select: RSI, MACD, BB, etc.)
   - Theme (toggle: Dark/Light)
   - Resolution (dropdown)
   ↓
3. User fills form and clicks "Generate Chart"
   ↓
4. Same as Flow 1 step 4-7
```

**Key Interactions:**
- Form validation (required fields)
- Indicator limits based on plan (show badge: "3/5 indicators")
- Preview configuration before generating
- Save configuration as template (optional)

### Flow 3: Chart Analysis

```
1. Chart is generated (from Flow 1 or 2)
   ↓
2. User clicks "Analyze" button
   ↓
3. AI shows "Analyzing chart..." (loading state)
   ↓
4. Analysis result card appears in chat:
   - Trend (Bullish/Bearish/Neutral)
   - Confidence score
   - Support/resistance levels
   - Trading signal (LONG/SHORT/NEUTRAL)
   - Entry, Stop, Target prices
   - Risk/Reward ratio
   - Analysis text
   ↓
5. User can:
   - Copy trading signal
   - View chart with signal overlay
   - Ask follow-up questions ("Why is it bullish?")
   - Generate new analysis with different focus
```

**Key Interactions:**
- Analysis loading (can take 5-10 seconds)
- Result visualization (color-coded signals)
- Copy to clipboard (one-click copy signal)
- Conversational follow-up (AI remembers context)

### Flow 4: Iterative Refinement

```
1. Chart is generated
   ↓
2. User types: "Add MACD indicator"
   ↓
3. AI regenerates chart with MACD added
   ↓
4. User types: "Change to 1H timeframe"
   ↓
5. AI updates chart with new timeframe
   ↓
6. User types: "Make it light theme"
   ↓
7. AI updates chart theme
```

**Key Interactions:**
- AI understands context (doesn't need to repeat symbol)
- Fast regeneration (show loading state)
- Preserve conversation history
- Undo/redo support (optional)

### Flow 5: Symbol Discovery

```
1. User types: "What Bitcoin pairs are on Binance?"
   ↓
2. AI calls get_symbols API
   ↓
3. AI shows list of symbols:
   - BTCUSDT
   - BTCBUSD
   - BTCEUR
   - etc.
   ↓
4. User clicks a symbol or types: "Show me BTCEUR"
   ↓
5. Chart generation flow starts (Flow 1)
```

**Key Interactions:**
- Symbol list formatting (table or cards)
- Click-to-generate (one-click chart creation)
- Search within results
- Filter by quote currency

### Flow 6: Export & Share

```
1. Chart is generated
   ↓
2. User clicks "Share" button
   ↓
3. Modal opens with options:
   - Copy image URL (7-day expiration)
   - Upload to S3 (permanent URL)
   - Download PNG
   - Download JSON config
   ↓
4. User selects option
   ↓
5. Success toast: "Link copied to clipboard!"
```

**Key Interactions:**
- Copy to clipboard (with visual feedback)
- Show URL expiration warning (7 days vs permanent)
- Download progress indicator
- Share to social media (Twitter, LinkedIn, etc.)

---

## Responsive Design

### Breakpoints

```
xs   : 0px - 479px      (Mobile portrait)
sm   : 480px - 767px    (Mobile landscape)
md   : 768px - 1023px   (Tablet)
lg   : 1024px - 1279px  (Tablet landscape / Small desktop)
xl   : 1280px - 1919px  (Desktop)
2xl  : 1920px+          (Large desktop)
```

### Responsive Patterns

#### 1. Sidebar (Left)
- **Desktop (≥1024px)**: Fixed 280px width, always visible
- **Tablet (768px-1023px)**: Collapsible drawer, overlay on content
- **Mobile (≤767px)**: Hamburger menu, full-screen drawer

#### 2. Chat Area (Main)
- **Desktop**: Fluid width (min 400px)
- **Tablet**: Full width minus padding
- **Mobile**: Full width

#### 3. Right Panel (Artifacts)
- **Desktop (≥1280px)**: Fixed 480px width, always visible
- **Tablet/Mobile**: Merged into chat stream, inline display

#### 4. Message Bubbles
- **Desktop**: Max-width 70% (user), 100% (AI)
- **Tablet**: Max-width 80%
- **Mobile**: Max-width 90%

#### 5. Chart Preview Cards
- **Desktop**: 700px max-width
- **Tablet**: 100% width
- **Mobile**: 100% width, tap to expand fullscreen

### Touch Interactions (Mobile/Tablet)

- **Tap**: Select, activate
- **Long-press**: Context menu (delete, share, etc.)
- **Swipe-left** (chat history item): Delete
- **Swipe-right** (chat history item): Pin
- **Pinch-zoom**: Zoom chart image
- **Pull-to-refresh**: Refresh chat (optional)

### Mobile-Specific Optimizations

- Larger touch targets (min 44×44px)
- Bottom navigation bar (optional)
- Floating action button for "New Chat" (bottom-right)
- Sticky input bar (always visible at bottom)
- Reduced animations (respect prefers-reduced-motion)
- Optimized images (WebP, lazy loading)

---

## Accessibility

### WCAG 2.1 AA Compliance

#### Color Contrast
- **Text Primary on Background**: 7:1 (AAA)
- **Text Secondary on Background**: 4.5:1 (AA)
- **UI Elements**: 3:1 (AA)
- **Interactive Elements**: 4.5:1 (AA)

#### Keyboard Navigation
- **Tab order**: Logical, top-to-bottom, left-to-right
- **Focus indicators**: Visible 2px outline, 2px offset
- **Keyboard shortcuts**:
  - `Cmd/Ctrl + K`: New chat
  - `Cmd/Ctrl + /`: Focus input
  - `Cmd/Ctrl + Enter`: Send message
  - `Esc`: Close modal/drawer
  - `↑/↓`: Navigate chat history
  - `Cmd/Ctrl + B`: Toggle sidebar

#### Screen Reader Support
- **ARIA labels**: All interactive elements
- **ARIA landmarks**: navigation, main, complementary, contentinfo
- **ARIA live regions**: Chat messages, loading states, toasts
- **Alt text**: All images, charts (describe content)
- **Semantic HTML**: Use native elements (button, input, etc.)

#### Focus Management
- **Modal open**: Focus first focusable element
- **Modal close**: Return focus to trigger element
- **Form submission**: Focus error message (if any)
- **Page load**: Focus skip-to-content link (optional)

#### Motion & Animation
- **Respect prefers-reduced-motion**: Disable non-essential animations
- **Essential animations**: Keep, but reduce speed/intensity
- **Loading spinners**: Keep (provide feedback)

---

## Animation & Transitions

### Timing Functions

```
Ease Out (Default)    : cubic-bezier(0.16, 1, 0.3, 1)
Ease In               : cubic-bezier(0.4, 0, 1, 1)
Ease In Out           : cubic-bezier(0.4, 0, 0.2, 1)
Spring                : cubic-bezier(0.34, 1.56, 0.64, 1)
```

### Duration Scale

```
Fast    : 150ms   (Hover, active states)
Base    : 200ms   (Default transitions)
Medium  : 300ms   (Modals, drawers)
Slow    : 500ms   (Page transitions)
```

### Component Animations

#### Message Appear (Chat)
```
Animation: Fade + Slide Up
Duration: 300ms
Easing: Ease Out
Keyframes:
  0%   : opacity: 0, transform: translateY(20px)
  100% : opacity: 1, transform: translateY(0)
```

#### Chart Loading (Skeleton)
```
Animation: Shimmer
Duration: 1500ms
Easing: Linear
Infinite loop
```

#### Button Hover
```
Transition: background-color, box-shadow
Duration: 150ms
Easing: Ease Out
```

#### Modal Enter/Exit
```
Enter:
  Backdrop: Fade in (200ms)
  Modal: Fade + Scale (300ms, Spring easing)
    0%   : opacity: 0, transform: scale(0.95)
    100% : opacity: 1, transform: scale(1)

Exit:
  Backdrop: Fade out (200ms)
  Modal: Fade + Scale (200ms, Ease In)
    0%   : opacity: 1, transform: scale(1)
    100% : opacity: 0, transform: scale(0.95)
```

#### Sidebar Drawer (Mobile)
```
Animation: Slide from left
Duration: 300ms
Easing: Ease Out
Keyframes:
  0%   : transform: translateX(-100%)
  100% : transform: translateX(0)
```

#### Toast Notification
```
Enter: Slide up + Fade in (300ms, Spring)
Exit: Fade out (200ms, Ease In)
```

### Loading States

#### Skeleton Screen
```
Use for: Chart preview, analysis results
Pattern: Animated gradient shimmer
Colors: Border Subtle → Border Default → Border Subtle
Duration: 1500ms linear infinite
```

#### Spinner
```
Use for: Button loading, inline loading
Pattern: Rotating circle
Size: 16px (small), 24px (default), 32px (large)
Color: Primary
Duration: 1000ms linear infinite
```

#### Progress Bar
```
Use for: Long operations (chart generation)
Pattern: Indeterminate (sliding)
Height: 4px
Color: Primary
Duration: 2000ms ease-in-out infinite
```

---

## Figma File Structure

### Recommended Organization

```
📁 MCP Chart-Image Design System
├── 📄 Cover (Project overview, design principles, shadcn/ui stack)
├── 📁 1. Foundation
│   ├── 📄 1.1 Color Palette (Tailwind/shadcn color tokens)
│   ├── 📄 1.2 Typography (Type scale, font styles, Tailwind classes)
│   ├── 📄 1.3 Spacing & Grid (8px grid, Tailwind spacing)
│   ├── 📄 1.4 Icons (Lucide icons, sizes)
│   ├── 📄 1.5 Shadows & Elevation (Tailwind shadow utilities)
│   └── 📄 1.6 shadcn/ui Component Reference (Component mapping table)
├── 📁 2. Components (shadcn/ui based)
│   ├── 📄 2.1 Buttons (shadcn Button variants + custom trading variants)
│   ├── 📄 2.2 Inputs (shadcn Input, Textarea, Select, Checkbox)
│   ├── 📄 2.3 Messages (Custom chat components using shadcn Card)
│   ├── 📄 2.4 Navigation (shadcn Sheet, Tabs, custom Sidebar)
│   ├── 📄 2.5 Feedback (shadcn Toast, Dialog, Progress, Skeleton)
│   ├── 📄 2.6 Charts (shadcn Card + custom trading signal cards)
│   └── 📄 2.7 Custom Components (ChatInput, AnalysisCard, etc.)
├── 📁 3. Layouts
│   ├── 📄 3.1 Desktop Layout (1920px, 1440px, 1280px)
│   ├── 📄 3.2 Tablet Layout (768px)
│   └── 📄 3.3 Mobile Layout (375px)
├── 📁 4. Pages (Wireframes)
│   ├── 📄 4.1 Landing Page
│   ├── 📄 4.2 Chat Interface
│   ├── 📄 4.3 Chart Gallery
│   └── 📄 4.4 Settings
├── 📁 5. Pages (High-Fidelity)
│   ├── 📄 5.1 Landing Page (Light + Dark)
│   ├── 📄 5.2 Chat Interface (Light + Dark)
│   ├── 📄 5.3 Chart Gallery (Light + Dark)
│   └── 📄 5.4 Settings (Light + Dark)
├── 📁 6. User Flows
│   ├── 📄 6.1 Quick Chart Generation
│   ├── 📄 6.2 Chart Analysis
│   └── 📄 6.3 Export & Share
├── 📁 7. Prototypes
│   ├── 📄 7.1 Desktop Prototype
│   ├── 📄 7.2 Tablet Prototype
│   └── 📄 7.3 Mobile Prototype
└── 📁 8. Dev Handoff
    ├── 📄 8.1 Tailwind Config (Custom theme configuration)
    ├── 📄 8.2 shadcn/ui Setup Instructions
    └── 📄 8.3 Component Code Examples
```

### Design Tokens (Variables)

Use Figma's **Variables** feature for:
- Colors (semantic tokens)
- Spacing (8px scale)
- Border-radius (4px, 8px, 12px, 16px)
- Typography (text styles)
- Shadows (elevation)

This enables:
- Dark/light mode switching
- Consistent updates across all pages
- Easy handoff to developers

---

## Developer Handoff

### Design Specs Export

- **Figma Inspect Mode**: Developers can inspect spacing, colors, fonts
- **Style Guide**: Provide link to this markdown file
- **Component Specs**: Export as PDF or Notion doc
- **Assets**: Export icons as SVG, images as PNG/WebP

### Code Implementation Notes

#### CSS Variables (Design Tokens)
```css
:root {
  /* Colors - Dark Mode */
  --color-bg-app: #0D1F17;
  --color-bg-surface: #1A2F27;
  --color-text-primary: #E8F5F0;
  --color-primary: #00A86B;
  --color-accent: #00D97E;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Typography */
  --font-family-primary: Inter, sans-serif;
  --font-size-body: 14px;
  --line-height-body: 22px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.2);
}

/* Light mode overrides */
[data-theme="light"] {
  --color-bg-app: #F8FAF9;
  --color-bg-surface: #FFFFFF;
  --color-text-primary: #1A1A1A;
  /* ... */
}
```

#### Component Props (React/Vue)
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost'
  size: 'small' | 'default' | 'large'
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  children: ReactNode
}
```

---

## shadcn/ui Implementation Guide

### Installation & Setup

#### 1. Initialize shadcn/ui in Your Next.js Project

```bash
# Navigate to your project
cd /path/to/mcp-chart-image

# Initialize shadcn/ui
npx shadcn-ui@latest init
```

**Configuration prompts:**
```
Would you like to use TypeScript? › Yes
Which style would you like to use? › Default
Which color would you like to use as base color? › Slate
Where is your global CSS file? › src/app/globals.css
Would you like to use CSS variables for colors? › Yes
Where is your tailwind.config.js located? › tailwind.config.ts
Configure the import alias for components? › @/components
Configure the import alias for utils? › @/lib/utils
```

#### 2. Install Required Components

```bash
# Install all required components at once
npx shadcn-ui@latest add button input textarea select checkbox label card sheet tabs separator dialog toast progress skeleton form scroll-area badge avatar tooltip
```

### Custom Theme Configuration

#### tailwind.config.ts

Update your Tailwind configuration to include our custom dark green theme:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Custom semantic colors for trading
        bullish: {
          DEFAULT: '#00D97E',
          foreground: '#FFFFFF',
        },
        bearish: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        neutral: {
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

#### globals.css (Dark Green Theme)

Update `src/app/globals.css` with our custom dark green color palette:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light Mode Colors */
    --background: 210 20% 98%;          /* #F8FAF9 */
    --foreground: 0 0% 10%;             /* #1A1A1A */

    --card: 0 0% 100%;                  /* #FFFFFF */
    --card-foreground: 0 0% 10%;        /* #1A1A1A */

    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 10%;

    --primary: 158 100% 33%;            /* #00A86B (Medium Green) */
    --primary-foreground: 0 0% 100%;    /* #FFFFFF */

    --secondary: 150 10% 95%;           /* #F0F9F5 (Light Green-Tint) */
    --secondary-foreground: 0 0% 10%;

    --muted: 150 10% 95%;
    --muted-foreground: 0 0% 42%;       /* #6B7280 */

    --accent: 158 100% 43%;             /* #00D97E (Vibrant Green) */
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;           /* #DC2626 (Red) */
    --destructive-foreground: 0 0% 100%;

    --border: 220 13% 91%;              /* #E5E7EB */
    --input: 220 13% 91%;
    --ring: 158 100% 33%;               /* Primary Green */

    --radius: 0.5rem;
  }

  .dark {
    /* Dark Mode Colors (Dark Green Theme) */
    --background: 160 45% 8%;           /* #0D1F17 (Very Dark Green) */
    --foreground: 150 30% 92%;          /* #E8F5F0 (Off-White with green tint) */

    --card: 160 35% 15%;                /* #1A2F27 (Dark Green-Gray) */
    --card-foreground: 150 30% 92%;

    --popover: 160 35% 15%;
    --popover-foreground: 150 30% 92%;

    --primary: 158 100% 33%;            /* #00A86B (Medium Green) */
    --primary-foreground: 150 30% 92%;

    --secondary: 160 25% 18%;           /* #243D35 (Medium Dark Green) */
    --secondary-foreground: 150 30% 92%;

    --muted: 160 25% 18%;
    --muted-foreground: 150 20% 70%;    /* #A8C5B8 (Light Gray-Green) */

    --accent: 158 100% 43%;             /* #00D97E (Vibrant Green) */
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 160 30% 23%;              /* #2F4A42 (Dark Green Border) */
    --input: 160 30% 23%;
    --ring: 158 100% 43%;               /* Accent Green */
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Custom scrollbar for dark green theme */
@layer utilities {
  .scrollbar-custom::-webkit-scrollbar {
    width: 8px;
  }

  .scrollbar-custom::-webkit-scrollbar-track {
    @apply bg-muted;
  }

  .scrollbar-custom::-webkit-scrollbar-thumb {
    @apply bg-border rounded-full;
  }

  .scrollbar-custom::-webkit-scrollbar-thumb:hover {
    @apply bg-accent;
  }
}
```

### Component Usage Examples

#### Button Component

```tsx
import { Button } from '@/components/ui/button'
import { Loader2, Send } from 'lucide-react'

// Primary button (Generate Chart, Analyze, etc.)
<Button>
  Generate Chart
</Button>

// Secondary button (Cancel, Close)
<Button variant="outline">
  Cancel
</Button>

// Icon button (Attachment, Send)
<Button variant="ghost" size="icon">
  <Send className="h-4 w-4" />
</Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Generating...
</Button>

// With custom colors (Bullish/Bearish signals)
<Button className="bg-bullish hover:bg-bullish/90">
  LONG Signal
</Button>

<Button className="bg-bearish hover:bg-bearish/90">
  SHORT Signal
</Button>
```

#### Card Component (Chart Artifact)

```tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Share, BarChart3 } from 'lucide-react'

<Card className="w-full max-w-[700px]">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <BarChart3 className="h-5 w-5" />
      BINANCE:BTCUSDT
    </CardTitle>
    <CardDescription>
      4h interval • 1M range • RSI (14)
    </CardDescription>
  </CardHeader>

  <CardContent>
    <img
      src="/chart-preview.png"
      alt="Bitcoin chart with RSI"
      className="rounded-lg w-full"
    />
  </CardContent>

  <CardFooter className="flex gap-2">
    <Button variant="outline" size="sm">
      <Download className="mr-2 h-4 w-4" />
      Download
    </Button>
    <Button variant="outline" size="sm">
      <Share className="mr-2 h-4 w-4" />
      Share
    </Button>
    <Button size="sm">
      Analyze
    </Button>
  </CardFooter>
</Card>
```

#### Dialog Component (Advanced Options Modal)

```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Advanced Options</Button>
  </DialogTrigger>

  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Advanced Chart Configuration</DialogTitle>
      <DialogDescription>
        Configure chart parameters manually
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="symbol">Symbol</Label>
        <Input id="symbol" placeholder="BINANCE:BTCUSDT" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="interval">Interval</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select interval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">1 minute</SelectItem>
            <SelectItem value="5m">5 minutes</SelectItem>
            <SelectItem value="15m">15 minutes</SelectItem>
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="4h">4 hours</SelectItem>
            <SelectItem value="1D">1 day</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <DialogFooter>
      <Button type="submit">Generate Chart</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Toast Component (Notifications)

```tsx
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'

function ChartComponent() {
  const { toast } = useToast()

  const handleSave = () => {
    toast({
      title: "Chart saved successfully!",
      description: "Your chart is ready to share.",
      duration: 4000,
    })
  }

  const handleError = () => {
    toast({
      variant: "destructive",
      title: "Uh oh! Something went wrong.",
      description: "Failed to generate chart. Please try again.",
      duration: 5000,
    })
  }

  return (
    <>
      <Button onClick={handleSave}>Save Chart</Button>
      <Button onClick={handleError} variant="outline">Trigger Error</Button>
    </>
  )
}
```

#### Sheet Component (Mobile Sidebar)

```tsx
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="md:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>

  <SheetContent side="left" className="w-[280px]">
    <SheetHeader>
      <SheetTitle>Chat History</SheetTitle>
      <SheetDescription>
        Your recent conversations
      </SheetDescription>
    </SheetHeader>

    <div className="mt-4 space-y-2">
      {/* Chat history items */}
      <div className="p-3 rounded-lg hover:bg-accent cursor-pointer">
        <p className="font-medium">Bitcoin Analysis</p>
        <p className="text-sm text-muted-foreground">2 hours ago</p>
      </div>
    </div>
  </SheetContent>
</Sheet>
```

### Custom Component Examples

#### Chat Input with Auto-resize Textarea

```tsx
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, Paperclip } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

function ChatInput() {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [message])

  const handleSubmit = () => {
    if (!message.trim()) return
    // Handle send logic
    setMessage('')
  }

  return (
    <div className="flex items-end gap-2 p-4 border-t">
      <Button variant="ghost" size="icon">
        <Paperclip className="h-5 w-5" />
      </Button>

      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Type your message..."
        className="min-h-[56px] max-h-[200px] resize-none rounded-3xl"
        rows={1}
      />

      <Button
        onClick={handleSubmit}
        size="icon"
        className="rounded-full h-12 w-12"
        disabled={!message.trim()}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  )
}
```

#### Analysis Result Card with Trading Signal

```tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { TrendingUp, Copy, Eye } from 'lucide-react'

function AnalysisCard() {
  return (
    <Card className="border-2 border-accent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-bullish" />
            Chart Analysis
          </CardTitle>
          <Badge className="bg-bullish">Bullish</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">78%</span>
          </div>
          <Progress value={78} className="h-2" />
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">📍 Key Levels</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Support</p>
              <p className="font-mono">$94,000</p>
              <p className="font-mono">$92,000</p>
            </div>
            <div>
              <p className="text-muted-foreground">Resistance</p>
              <p className="font-mono">$97,500</p>
              <p className="font-mono">$100,000</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border-2 border-bullish/20 bg-bullish/5 p-4 space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            🎯 Trading Signal: <span className="text-bullish">LONG</span>
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm font-mono">
            <div>
              <p className="text-muted-foreground">Entry</p>
              <p className="font-semibold">$94,100</p>
            </div>
            <div>
              <p className="text-muted-foreground">Stop</p>
              <p className="font-semibold text-bearish">$93,500 (-0.64%)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target</p>
              <p className="font-semibold text-bullish">$97,500 (+3.61%)</p>
            </div>
            <div>
              <p className="text-muted-foreground">R:R</p>
              <p className="font-semibold">5.67:1 ✅</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">💡 Analysis</h4>
          <p className="text-sm text-muted-foreground">
            Strong support at $94K level with bullish RSI divergence.
            Price bouncing off major support with volume confirmation.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm">
          <Copy className="mr-2 h-4 w-4" />
          Copy Signal
        </Button>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          View Chart
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### Theme Switcher Component

```tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

### Directory Structure

After installing shadcn/ui, your project structure will look like this:

```
src/
├── app/
│   ├── globals.css                  # Tailwind + shadcn theme
│   └── layout.tsx                   # Theme provider setup
├── components/
│   └── ui/                          # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── toast.tsx
│       └── ...
├── lib/
│   └── utils.ts                     # cn() utility function
└── ...
```

### Best Practices

1. **Use the `cn()` utility** for conditional class names:
   ```tsx
   import { cn } from '@/lib/utils'

   <Button className={cn(
     "w-full",
     isActive && "bg-accent",
     isDisabled && "opacity-50"
   )}>
     Click me
   </Button>
   ```

2. **Extend components** for custom variants:
   ```tsx
   // components/ui/button.tsx
   const buttonVariants = cva(
     "inline-flex items-center justify-center rounded-md text-sm font-medium",
     {
       variants: {
         variant: {
           default: "bg-primary text-primary-foreground",
           // Add custom variant for trading signals
           bullish: "bg-bullish text-bullish-foreground hover:bg-bullish/90",
           bearish: "bg-bearish text-bearish-foreground hover:bg-bearish/90",
         },
       },
     }
   )
   ```

3. **Compose complex components** from primitives:
   ```tsx
   // Combine Card + Badge + Progress for rich UIs
   <Card>
     <CardHeader>
       <Badge>New</Badge>
     </CardHeader>
     <CardContent>
       <Progress value={75} />
     </CardContent>
   </Card>
   ```

4. **Use Radix UI documentation** for advanced customization:
   - [Radix UI Primitives](https://www.radix-ui.com/primitives)
   - shadcn/ui wraps Radix primitives with Tailwind styling

---

## Version History

| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| 1.0     | 2025-11-17 | Initial design plan created                  |
| 1.1     | 2025-11-17 | Added shadcn/ui integration guide, component mappings, Tailwind config, custom dark green theme, implementation examples |

---

## Next Steps

### For Designers

1. **Create Figma file** using this specification
2. **Design component library** (all components with variants and states)
3. **Create high-fidelity mockups** for all pages (dark + light mode)
4. **Build interactive prototype** for user testing
5. **Conduct usability testing** with target users
6. **Iterate based on feedback**

### For Developers

1. **Review design specification** and ask questions
2. **Set up design tokens** (CSS variables or theme system)
3. **Implement component library** (Storybook recommended)
4. **Build pages** using components
5. **Integrate with API** (use existing REST endpoints)
6. **Test on all breakpoints** and browsers
7. **Accessibility audit** (WCAG 2.1 AA compliance)

### For Product Team

1. **Define user personas** and use cases
2. **Prioritize features** for MVP
3. **Plan user testing** sessions
4. **Gather feedback** from beta users
5. **Iterate on design** based on data

---

## Resources

### Design Resources
- **Figma Community**: Search for "Chat UI", "AI interface", "shadcn ui" for inspiration
- **shadcn/ui Figma Kit**: [Community file](https://www.figma.com/community/search?resource_type=mixed&sort_by=relevancy&query=shadcn&editor_type=all&price=all&creators=all)
- **Tailwind CSS Figma Kit**: Official Tailwind design system
- **Claude.ai**: Study the actual interface for UX patterns
- **Trading UI Examples**: TradingView, Binance, Coinbase

### Component Libraries
- **shadcn/ui**: [https://ui.shadcn.com](https://ui.shadcn.com) - Main documentation
- **Radix UI**: [https://www.radix-ui.com/primitives](https://www.radix-ui.com/primitives) - Unstyled primitives
- **Tailwind CSS**: [https://tailwindcss.com](https://tailwindcss.com) - Utility-first CSS framework
- **Lucide Icons**: [https://lucide.dev](https://lucide.dev) - Icon library (used with shadcn/ui)

### Accessibility
- **WebAIM**: [https://webaim.org](https://webaim.org) - Accessibility resources
- **WCAG 2.1 Guidelines**: [https://www.w3.org/WAI/WCAG21/quickref/](https://www.w3.org/WAI/WCAG21/quickref/)
- **Radix UI Accessibility**: Built-in ARIA attributes and keyboard navigation

### Tools & Plugins
- **Figma Tokens**: Design token management plugin
- **Tailwind CSS IntelliSense**: VSCode extension for Tailwind
- **Headless UI**: Additional unstyled components
- **class-variance-authority (cva)**: For component variants (used in shadcn/ui)

---

**Questions or feedback?** Contact the design team or open an issue in the repository.

**Happy designing!** 🎨✨
