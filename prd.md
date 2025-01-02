OSTRACA - AI TEXT EDITOR

Product Requirements Document (PRD)
This PRD outlines the requirements and specifications for a minimal, modern HTML text editor desktop application built with Tauri. It uses shadcn components for a sleek UI, Tiptap for rich text editing, and allows users to save files locally as a single HTML file.

Implementation Status:
✅ = Implemented
🚧 = In Progress
⏳ = Pending

---

1. Overview
   Application Name: HTML AI Editor
   Platform: Mac desktop (Tauri-based, but can also run cross-platform)
   Tech Stack:
   ✅ Tauri (Rust + TypeScript bindings)
   ✅ React + TypeScript
   ✅ Tiptap for the editor
   ✅ shadcn UI components
   ⏳ OpenAI (or similar) for AI-based enhancements

   The goal is to deliver a modern, minimal design text editor that seamlessly edits and previews HTML content, uses AI features for suggested improvements, and keeps everything in a single local file if the user chooses.

---

2. Objectives & Goals
   ✅ Minimal & Modern Design
   ✅ Use shadcn components for a polished, cohesive look and feel
   ✅ Keep UI simple, focusing on the editor and preview
   ✅ All user content is stored in a single HTML file
   🚧 Users can load and save changes locally
   ✅ Rich-Text Editing with HTML
   ✅ Use Tiptap to provide formatting controls that map to HTML syntax
   ⏳ Provide inline preview
   ⏳ AI Integration
   ⏳ Convert and save to Markdown/PDF/docx

---

3. Key Features
   3.1 File Handling
   🚧 Open HTML File
   🚧 Save Content

   3.2 Editor & Preview
   ✅ Tiptap Editor
   ✅ Rich text editing, but behind the scenes it's HTML
   ✅ Tiptap's extension architecture to provide strong formatting options
   ⏳ Live Preview

   3.3 AI Enhancement
   ⏳ AI Processing
   ⏳ Use Cases

   3.4 Modern & Minimal UI
   ✅ shadcn Components
   ✅ Use a minimal navigation or toolbar
   ✅ Keep spacing and styling consistent
   ✅ Provide a dark/light mode option

---

4. Technical Requirements
   4.1 Tauri Setup
   ✅ Rust Environment
   ✅ Node + React + TypeScript

   4.2 Tiptap Integration
   ✅ Install Tiptap
   ✅ Required packages
   ✅ Document Structure

   4.3 shadcn UI Components
   ✅ Styling and Theming
   ✅ Minimalist UI with well-spaced, well-styled buttons and layout

   4.4 Single File Management
   🚧 Local File Storage
   🚧 File parsing and writing

   4.5 AI Integration
   ⏳ API Calls
   ⏳ Key Handling
   ⏳ Enhancement Flow

---

5. UX / UI Design
   CORE DESIGN PRINCIPLES:

   - Ultra-minimal, compact, and modern design
   - No traditional toolbars - contextual formatting only
   - Full-height editor with optimal spacing
   - Intuitive sidebar for file management

     5.1 Main Layout
     ✅ Contextual Formatting (Bubble Menu)
     🚧 Modern Sidebar

     - Recent files list with timestamps
     - Quick file search/filter
     - File tree navigation
     - Collapsible for full-width editing
     - Subtle hover states and animations
     - File metadata preview

       5.2 Editor Space
       🚧 Full-height editor layout

     - Remove default double spacing
     - Clean, single-line spacing
     - Optimal padding for content
     - Smooth transitions
     - Minimal scrollbars

       5.3 shadcn Styles
       ✅ Button
       ✅ Typography
       ✅ Spacing
       🚧 Modern Sidebar Components

     - Custom scroll area
     - Hover cards for file preview
     - Command menu for quick actions
     - Collapsible sections
     - File icons and status indicators

---

6. Architecture Overview
   ✅ Frontend (React + Tiptap)
   🚧 HTML Processing
   🚧 Tauri APIs
   ⏳ AI Service

---

7. Milestones & Timeline
   M1: Project Setup (1 Week)
   Initialize Tauri + React + TypeScript project.
   Configure shadcn library.
   Add Tiptap with basic editing.
   M2: File Handling (1-2 Weeks)
   Implement open/save dialogs with Tauri FS API.
   Validate reading/writing .md files.
   M3: Editor & Preview (1 Week)
   Create or enable a live preview panel.
   Ensure Tiptap's internal representation converts to HTML and vice versa.
   M4: AI Integration (2 Weeks)
   Integrate AI call with a simple "Enhance with AI" button.
   Provide user with newly generated text.
   M5: UI Polish (1-2 Weeks)
   Use shadcn components for final design.
   Add any final styling or theming tweaks.
   Address usability issues and QA testing.

---

8. Future Enhancements
   Multiple Tabs or Project Management
   Manage multiple documents at once.
   Collaboration Features
   Real-time collaboration via local network or cloud data.
   Plugin Ecosystem
   Additional Tiptap extensions for embedding images, tables, etc.
   Version Control
   Integration with Git for version history.
   HTML Linting
   Automated linting suggestions for better structure.

---

9. Constraints & Considerations
   Storage
   Currently storing all content in a single .md file; large files might cause performance issues.
   AI Costs & Key Management
   Using external AI providers means incurring usage costs.
   Must store API keys securely.
   Cross-Platform Differences
   Tauri can build for Windows, Linux, and macOS. However, testing is needed on each.
   Resource Usage
   Tauri is generally lightweight, but AI calls can slow performance.
   Security
   Ensuring the user's data remains local by default (unless explicitly connecting to the AI API).

---

Conclusion
This PRD describes a minimal, modern HTML editor built with Tauri, shadcn for UI, and Tiptap for rich-text editing. The focus is on a clean interface, robust file handling, optional AI enhancements, and a single-file approach for content management. Following this plan ensures a concise, intuitive desktop application that retains future flexibility for advanced features.
