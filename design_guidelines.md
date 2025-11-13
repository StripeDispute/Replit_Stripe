# Stripe Dispute Assistant - Design Guidelines

## Design Approach

**Selected System**: Stripe-inspired fintech design system with Material Design principles for data-dense interfaces

**Justification**: This is a utility-focused, information-dense application where clarity, efficiency, and trust are paramount. The spec explicitly requests a "Stripe-like design," making their design language the perfect reference point.

---

## Core Design Elements

### A. Typography

**Font Family**: 
- Primary: Inter (Google Fonts) - clean, highly legible for data display
- Monospace: JetBrains Mono - for IDs, amounts, technical data

**Hierarchy**:
- Hero Headlines: `text-5xl font-bold` (60px)
- Page Titles: `text-3xl font-semibold` (30px)
- Section Headers: `text-xl font-semibold` (20px)
- Body Text: `text-base font-normal` (16px)
- Captions/Meta: `text-sm font-medium` (14px)
- Data Labels: `text-xs font-medium uppercase tracking-wide` (12px)

### B. Layout System

**Spacing Units**: Tailwind primitives of `2, 4, 6, 8, 12, 16, 20`
- Component padding: `p-6` to `p-8`
- Section spacing: `mb-12` to `mb-16`
- Card spacing: `gap-6`
- Form field spacing: `space-y-4`

**Container Widths**:
- Dashboard content: `max-w-7xl mx-auto px-6`
- Forms: `max-w-2xl`
- Full-width tables: `w-full`

### C. Component Library

#### Navigation
- **Top Navigation Bar**: Fixed height (`h-16`), horizontal layout with logo left, actions right
- **Sidebar** (Dashboard): `w-64` fixed width, hierarchical menu structure with icons

#### Cards & Containers
- **Dispute Cards**: Rounded corners (`rounded-lg`), subtle shadow (`shadow-sm`), border (`border`), padding `p-6`
- **Stat Cards**: Minimalist design with large numbers, small labels, icon accent
- **Evidence File Cards**: Compact horizontal layout with file icon, name, metadata, actions

#### Data Display
- **Tables**: Stripe-style with header row (`font-medium text-xs uppercase`), alternating row background for readability, right-aligned numerical data
- **Status Badges**: Pill-shaped (`rounded-full px-3 py-1 text-xs font-medium`), semantic variants for needs_response (yellow), under_review (blue), won (green), lost (red)
- **Metrics Dashboard**: Grid layout (`grid-cols-1 md:grid-cols-4`) with KPI cards

#### Forms & Inputs
- **Input Fields**: Border style (`border rounded-md`), focus ring, padding `px-4 py-2.5`, label above (`text-sm font-medium mb-2`)
- **File Upload Zone**: Dashed border (`border-2 border-dashed`), drag-and-drop area with centered icon and text
- **Buttons**: Primary (solid), Secondary (outline), sizes `px-6 py-2.5` for standard, `px-8 py-3` for hero CTAs

#### Overlays
- **Modals**: Centered overlay with backdrop blur, max-width `max-w-2xl`, padding `p-8`
- **Toast Notifications**: Fixed position top-right, slide-in animation

---

## Page-Specific Layouts

### Home Page (Dark Hero)
- **Hero Section**: Full viewport height (`min-h-screen`), dark treatment, centered content
- **Content**: Large headline, descriptive subheading, prominent "Connect Stripe" CTA button, trust indicators (e.g., "Secure connection via Stripe")
- **Visual**: Abstract gradient background or subtle pattern

### Dashboard (Analytics Style)
- **Layout**: Sidebar navigation + main content area
- **Top Section**: Metrics cards in horizontal grid showing total disputes, active disputes, response needed, win rate
- **Middle Section**: Recent disputes table with sortable columns
- **Bottom Section**: Activity timeline or quick actions

### Disputes List
- **Header**: Page title, filter controls (status dropdown, date range), search bar
- **List View**: Table format with columns: Dispute ID (monospace), Amount, Reason, Status (badge), Due Date, Actions
- **Responsive**: Cards on mobile, table on desktop

### Dispute Detail
- **Two-Column Layout**: 
  - Left (60%): Dispute summary card, charge details, customer info, timeline
  - Right (40%): Evidence management section with upload zone, evidence file list
- **Bottom Section**: PDF packet generation with preview/download button

### Settings
- **Single Column**: `max-w-3xl` centered, sections for API configuration, preferences

---

## Visual Treatment Notes

**Hero Home Page**: Dark, sophisticated with subtle gradients. Think deep navy/charcoal with accent highlights.

**Dashboard/App Pages**: Clean white backgrounds, subtle grays for cards and borders, maintaining Stripe's minimal aesthetic.

**Elevation**: Use sparingly - `shadow-sm` for cards, `shadow-md` for dropdowns/modals, `shadow-lg` for overlays.

**Borders**: Prefer subtle borders (`border-gray-200`) over heavy shadows for separation.

---

## Images

**Hero Section**: Abstract fintech imagery - data visualization, secure payment iconography, or dashboard mockup screenshot. Place as background with overlay for text legibility. No large promotional images elsewhere - this is a utility application focused on data and functionality.

---

## Animations

Minimal, purposeful motion only:
- Page transitions: Simple fade
- Button states: Scale on press (0.98)
- Loading states: Spinner or skeleton screens for data fetching
- Toast notifications: Slide-in from top-right