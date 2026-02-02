# AskYourDocs - RAG Chat AI App

**AskYourDocs** is a Next.js-based chat application that enables users to upload documents and interact with them using Retrieval-Augmented Generation (RAG). It provides a seamless interface for chatting with your PDF, DOCX, and Markdown files, leveraging the power of AI to extract and synthesize information.

## 🚀 Features

-   **Document-Based Chat (RAG):** Upload documents (.pdf, .docx, .md) and ask questions based on their content.
-   **Real-time Streaming:** AI responses are streamed in real-time for a conversational experience.
-   **Chat History:** Persists chat sessions and message history using Supabase.
-   **Secure Authentication:** Integrated with Clerk for robust user authentication and management.
-   **File Processing:** Client-side text extraction for quick previews and server-side processing for RAG indexing.
-   **Modern UI/UX:** Built with Tailwind CSS v4 and Lucide icons, featuring a responsive sidebar, tooltips, and a clean chat interface.
-   **File Support:**
    -   **PDF:** Parsed using `pdfjs-dist`.
    -   **Word (DOCX):** Parsed using `mammoth`.
    -   **Markdown:** Native support.

## 🛠️ Tech Stack

-   **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
-   **Authentication:** [Clerk](https://clerk.com/)
-   **Database:** [Supabase](https://supabase.com/)
-   **HTTP Client:** [Axios](https://axios-http.com/)
-   **Icons:** [Lucide React](https://lucide.dev/)
-   **File Parsing:** `mammoth`, `pdfjs-dist`

## 📋 Prerequisites

Before running the project, ensure you have the following:

-   **Node.js** (v18 or higher recommended)
-   **npm** or **yarn** or **pnpm**
-   **Supabase Account:** For the database.
-   **Clerk Account:** For authentication.
-   **External RAG API:** A running backend service that handles the actual embedding and LLM query processing (The app expects endpoints at `RAG_API_URL/add` and `RAG_API_URL/query`).

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory and configure the following environment variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key...
SUPABASE_SERVICE_ROLE_KEY=service-role-key...

# External RAG Backend
RAG_API_URL=http://localhost:8000 # or your deployed RAG backend URL
```

## 📦 Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd rag-chat-ai-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the app:**
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
├── app/
│   ├── api/             # Next.js API Routes (Backend)
│   │   ├── addChat/     # Create new chat session
│   │   ├── addMessage/  # Store messages in DB
│   │   ├── chat/        # Fetch user's chats
│   │   ├── getMessages/ # Fetch messages for a chat
│   │   └── rag/         # Proxy routes to RAG backend
│   ├── globals.css      # Global styles & Tailwind
│   ├── layout.tsx       # Root layout with Clerk provider
│   └── page.tsx         # Main chat UI logic
├── components/          # Reusable UI components
├── lib/                 # Utility functions
│   ├── fileToText.ts    # File parsing logic (PDF, DOCX)
│   ├── supabase.ts      # Supabase client setup
│   └── utils.ts         # CN utility
├── public/              # Static assets
└── ...config files
```

## 🔌 API Endpoints

The application exposes several internal API endpoints to manage chats and interface with the RAG system:

### Chat Management
-   **`POST /api/addChat`**: Creates a new chat session.
    -   Body: `{ id, user_id, title }`
-   **`GET /api/chat`**: Fetches all chats for the authenticated user.
-   **`POST /api/addMessage`**: Adds a message to the Supabase database.
    -   Body: `{ chat_id, role, content }`
-   **`GET /api/getMessages`**: Retrieves message history for a specific chat.
    -   Query Param: `?chatId=...`

### RAG Integration
-   **`POST /api/rag/add`**: Sends extracted text to the RAG backend for indexing.
    -   Body: `{ text, chat_id, user_id }`
    -   Proxies to: `$RAG_API_URL/add`
-   **`POST /api/rag/query`**: Sends a query to the RAG backend and streams the response.
    -   Query Params: `?q=...&user_id=...&chat_id=...`
    -   Proxies to: `$RAG_API_URL/query`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request