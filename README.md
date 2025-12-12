# ImageenAI

ImageenAI is a lightweight, vanilla HTML/JS web application for generating images using the **AI Horde** distributed network. It features a modern, responsive UI, local gallery storage using IndexedDB, and ZIP export functionality.

## Features

-   **Vanilla Stack**: No build steps, frameworks, or complex dependencies. Just HTML, CSS, and JS.
-   **AI Horde Integration**: Generates images asynchronously using the distributed AI Horde network.
-   **IndexedDB Gallery**: Automatically saves generated images and their full metadata (prompt, seed, model, settings) to your browser's local storage.
-   **Offline-Ready Gallery**: View your history even without internet (images are stored locally).
-   **ZIP Export**: Download your entire collection with a single click. Filenames include seed and timestamp for easy organization.
-   **Responsive UI**: Card-based layout that adapts to mobile and desktop screens.
-   **Dark/Light Mode**: Toggles based on preference.
-   **Secure Proxy (Optional)**: Includes a Node.js server to proxy requests and keep your API key hidden from the client.

## Getting Started

### 1. Run Locally (Client-Only)

You can run the frontend using any static file server.

**Using Python:**
```bash
python3 -m http.server
# Open http://localhost:8000
```

**Using Node:**
```bash
npx http-server
# Open http://127.0.0.1:8080
```

**Usage:**
1.  Open the web app.
2.  Paste your **AI Horde API Key** in the top right. (Get one at [aihorde.net](https://aihorde.net/register) or use `0000000000` for anonymous/slow access).
3.  Enter a prompt and click **Generate**.
4.  Images will appear in the gallery below.

### 2. Run with Proxy (Optional)

If you want to host this app or don't want to paste your key into the browser every time, use the included proxy server.

1.  Navigate to `server/`:
    ```bash
    cd server
    npm install
    ```
2.  Create `.env` file:
    ```bash
    cp .env.example .env
    # Edit .env and set AIHORDE_API_KEY
    ```
3.  Start the server:
    ```bash
    npm start
    ```
4.  In the web app, check **"Use Proxy"**. The API key input will be disabled, and requests will go through your local server.

## API Integration Details

The app interacts with the AI Horde API v2:

1.  **Submission**:
    -   `POST https://aihorde.net/api/v2/generate/async`
    -   Payload includes prompt, params (steps, cfg, width, height, seed), and model choice.
    -   Header `apikey` is sent for authentication.
    -   Returns a UUID `id` for the request.

2.  **Polling**:
    -   `GET https://aihorde.net/api/v2/generate/status/{id}`
    -   Checks status every 2 seconds.
    -   Returns progress (queue position, wait time) and eventually `generations` array with base64 images.

3.  **Storage**:
    -   Images are converted from Base64 to **Blobs** and stored in **IndexedDB** (`imageenai_db`).
    -   This avoids local storage size limits and keeps data persistent.

## License

This project is licensed under the **CC BY 4.0** license.

**Attribution**: If you use or modify ImageenAI, please include attribution to the original repository and author.

See [LICENSE](LICENSE) for full text.
