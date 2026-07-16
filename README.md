# PromptBoost AI ⚡

**PromptBoost AI** is a lightweight, full-stack browser extension and backend API designed to optimize AI prompts in real-time. By injecting an "Optimize" action directly into popular AI platform interfaces (ChatGPT, Claude, Gemini), users can instantly improve, structure, and refine their prompts using Groq-powered LLMs.

---

## 🚀 Key Features

*   **⚡ In-Context Optimization:** Injects a clean "⚡ Optimize Prompt" button directly beneath the input boxes of ChatGPT, Claude, and Gemini.
*   **🎨 6 Context-Aware Modes:** Refine your prompt to fit your specific needs:
    *   `✨ Default` – General, balanced prompt improvement.
    *   `🎨 Creative` – Vivid, imaginative, and expressive phrasing.
    *   `⚙️ Technical` – Precise, structured, and technically rigorous.
    *   `✂️ Concise` – Short, punchy, and minimal fluff.
    *   `📋 Detailed` – Thorough, adding necessary constraints and context.
    *   `👶 ELI5` – Extremely simple language.
*   **📋 Rich Preview & Copy Modal:** Review the optimized prompt in a premium glassmorphic overlay, edit it on the fly, copy it to your clipboard with one click, or insert it directly back into the input box.
*   **🖱️ Right-Click context menu:** Highlight any text on any webpage, right-click, and select "⚡ Optimize with PromptBoost".
*   **⌨️ Keyboard Shortcut:** Press `Alt + Shift + O` to instantly optimize the current prompt inside the active text box.
*   **📜 History Log:** Tracks your last 20 optimized prompts locally in `chrome.storage.local` with quick preview logs, relative timestamps, and mode tags.
*   **🔐 JWT Authentication:** Standard registration and login flows securing user status.
*   **🟢 Backend Status Check:** Real-time health monitoring of the API directly from the extension badge.

---

## 🛠️ Technology Stack

*   **Frontend (Chrome Extension):**
    *   Manifest V3 Architecture (Content Scripts, Background Service Worker)
    *   Vanilla JavaScript
    *   Premium Dark CSS with Glassmorphism & Custom Micro-animations
*   **Backend (API Service):**
    *   Python / FastAPI
    *   SQLAlchemy ORM + PostgreSQL Database
    *   Groq SDK (`llama-3.1-8b-instant`)
    *   JWT Authentication (`python-jose`, `bcrypt`)

---

## 💻 Local Setup & Installation

### Prerequisites
Ensure you have **Python 3.8+** and **PostgreSQL** installed and running on your local machine.

---

### Part 1: Backend API Setup

1.  **Clone the repository & navigate to the backend:**
    ```bash
    git clone https://github.com/Priyanshurajanand/promptboost-ai.git
    cd promptboost-ai/backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On Linux/macOS:
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    pip install groq
    ```

4.  **Create a PostgreSQL Database:**
    *   Open your PostgreSQL tool (pgAdmin, psql, etc.).
    *   Create a database named `promptBoost`.
    ```sql
    CREATE DATABASE "promptBoost";
    ```

5.  **Configure environment variables:**
    *   Rename or create a `.env` file inside the `backend` directory.
    *   Add your credentials:
    ```env
    DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/promptBoost
    SECRET_KEY=generate_some_secure_secret_key_string
    GROQ_API_KEY=your_actual_groq_api_key
    ```
    *(Get your free Groq API key at [console.groq.com/keys](https://console.groq.com/keys))*

6.  **Run the Backend server:**
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    *Verify the API is running by visiting [http://localhost:8000/](http://localhost:8000/) in your browser. You should see a JSON health check response listing the API version and supported modes.*

---

### Part 2: Chrome Extension Installation

1.  Open Google Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer Mode** by toggling the switch in the top-right corner.
3.  Click **Load unpacked** in the top-left corner.
4.  Select the **`extension`** folder inside the cloned project directory.
5.  Pin the **PromptBoost AI** extension to your Chrome toolbar.

---

## 🎯 How to Use

1.  Click the PromptBoost AI icon in your browser toolbar.
2.  The extension status badge will read **Online** (in green) if your local FastAPI server is running.
3.  Go to the **Register** panel, create a test account, and log in.
4.  Navigate to [ChatGPT](https://chat.openai.com), [Claude](https://claude.ai), or [Gemini](https://gemini.google.com).
5.  Type out a basic, unrefined prompt in the chat input.
6.  Select your desired **Mode** pill from the injected panel, then click **⚡ Optimize Prompt** (or press `Alt + Shift + O`).
7.  Verify, tweak, copy, or click **✓ Use This Prompt** to overwrite the input text box!
