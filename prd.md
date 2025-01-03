OSTRACA - AI TEXT EDITOR

Product Requirements Document (PRD)
This PRD outlines the requirements and specifications for a minimal, modern HTML text editor desktop application built with Tauri. It uses shadcn components for a sleek UI, Tiptap for rich text editing, and allows users to save files locally as a single HTML file.

Implementation Status:
✅ = Implemented
🚧 = In Progress
⏳ = Pending
🆕 = New Requirement

---

1. Overview
   Application Name: HTML AI Editor
   Platform: Mac desktop (Tauri-based, but can also run cross-platform)
   Tech Stack:
   ✅ Tauri (Rust + TypeScript bindings)
   ✅ React + TypeScript
   ✅ Tiptap for the editor
   ✅ shadcn UI components
   ✅ OpenAI for AI-based enhancements
   🆕 Vector Database for embeddings

   The goal is to deliver a modern, minimal design text editor that seamlessly edits and previews HTML content, uses AI features for suggested improvements, and keeps everything in a single local file if the user chooses.

---

2. Objectives & Goals
   ✅ Minimal & Modern Design
   ✅ Use shadcn components for a polished, cohesive look and feel
   ✅ Keep UI simple, focusing on the editor and preview
   ✅ All user content is stored in a single HTML file
   ✅ Users can load and save changes locally
   ✅ Rich-Text Editing with HTML
   ✅ Use Tiptap to provide formatting controls that map to HTML syntax
   ⏳ Provide inline preview
   ✅ AI Integration
   ⏳ Convert and save to Markdown/PDF/docx
   🆕 Semantic search across files
   🆕 Comprehensive edit history

---

3. Key Features
   3.1 File Handling
   ✅ Open HTML File
   ✅ Save Content
   🆕 File Indexing & Embeddings

   - Index files for semantic search
   - Store embeddings locally
   - Real-time index updates

     3.2 Editor & Preview
     ✅ Tiptap Editor
     ✅ Rich text editing, but behind the scenes it's HTML
     ✅ Tiptap's extension architecture to provide strong formatting options
     ⏳ Live Preview
     🆕 Enhanced History Features

   - Track all document changes
   - View change history with diffs
   - Restore previous versions
   - Filter history by type (AI vs manual)

     3.3 AI Enhancement
     ✅ AI Processing
     ✅ Text Enhancement
     ✅ Content Analysis
     ✅ Smart Deletion
     🆕 Advanced AI Features

   - Context-aware suggestions
   - Style matching
   - Document summarization
   - Semantic search across files
   - Chat with document context

     3.4 Modern & Minimal UI
     ✅ shadcn Components
     ✅ Use a minimal navigation or toolbar
     ✅ Keep spacing and styling consistent
     ✅ Provide a dark/light mode option
     🆕 Enhanced History UI

   - Timeline view of changes
   - Diff viewer
   - Change categorization
   - Filter and search capabilities

---

4. Technical Requirements
   4.1 Tauri Setup
   ✅ Rust Environment
   ✅ Node + React + TypeScript

   4.2 Tiptap Integration
   ✅ Install Tiptap
   ✅ Required packages
   ✅ Document Structure
   🆕 History Extension

   - Track all document changes
   - Store change metadata
   - Implement undo/redo stack
   - Version control integration

     4.3 AI & Embeddings
     ✅ OpenAI Integration
     🆕 Vector Database

   - Local vector storage
   - Efficient similarity search
   - Real-time indexing
   - Persistent storage
     🆕 Enhanced Chat Features
   - Document-aware context
   - Multi-file knowledge
   - Command parsing
   - Structured responses

     4.4 Data Management
     ✅ Local File Storage
     ✅ File parsing and writing
     🆕 History Storage

   - Efficient change tracking
   - Metadata persistence
   - Version management
     🆕 Embeddings Storage
   - Vector database integration
   - Index management
   - Cache optimization

---

5. UX / UI Design
   5.1 Main Layout
   ✅ Contextual Formatting (Bubble Menu)
   ✅ Modern Sidebar
   ✅ Chat Interface
   🆕 History Panel

   - Timeline visualization
   - Change details
   - Restore points
   - Filter controls

     5.2 Editor Space
     ✅ Full-height editor layout
     ✅ Clean spacing
     ✅ Smooth transitions
     🆕 Change Indicators

   - Visual diff markers
   - AI enhancement highlights
   - Version comparison

     5.3 Chat & Search
     ✅ Chat interface
     ✅ Message history
     🆕 Semantic Search

   - File browser integration
   - Result previews
   - Relevance scoring
   - Cross-file search

---

6. Architecture Overview
   ✅ Frontend (React + Tiptap)
   ✅ HTML Processing
   ✅ Tauri APIs
   ✅ AI Service
   🆕 Vector Database
   🆕 History Management
   🆕 Search Engine

---

7. Implementation Priorities
   P0: Critical Features

   - File embeddings and indexing
   - Enhanced history tracking
   - Semantic search implementation

   P1: Important Features

   - History UI improvements
   - Version comparison
   - Cross-file search

   P2: Nice to Have

   - Advanced AI features
   - Timeline visualization
   - Cache optimization

---

8. Future Enhancements
   Multiple Tabs or Project Management
   Collaboration Features
   Plugin Ecosystem
   Version Control
   HTML Linting
   🆕 Advanced AI Features
   - Style transfer
   - Document structure analysis
   - Automated improvements
     🆕 Enhanced Search
   - Natural language queries
   - Advanced filtering
   - Custom embeddings models

---

9. Technical Considerations
   Performance

   - Efficient embedding generation
   - Optimized vector search
   - History storage optimization

   Security

   - Local data encryption
   - API key management
   - Safe file handling

   Scalability

   - Large file handling
   - Multiple file indexing
   - History size management

---

Conclusion
The project has evolved from a basic HTML editor to a sophisticated AI-enhanced writing tool with semantic search capabilities and comprehensive history tracking. The focus remains on maintaining a clean, efficient interface while adding powerful features that enhance the writing and editing experience.
