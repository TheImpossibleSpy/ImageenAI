# ImageenAI Proxy Server

This is an optional Node.js/Express proxy server for ImageenAI. It allows you to use your AI Horde API key without exposing it to the client-side browser (which is insecure if you are hosting the app publicly).

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Configure API Key:**
    Copy `.env.example` to `.env` and add your key.
    ```bash
    cp .env.example .env
    ```
    Edit `.env`:
    ```
    AIHORDE_API_KEY=your_actual_api_key_here
    ```
    **WARNING:** Never commit your `.env` file to version control.

3.  **Run Server:**
    ```bash
    npm start
    ```
    The server runs on `http://localhost:3000` by default.

## Usage

In the ImageenAI web interface:
1.  Check the "Use Proxy" checkbox.
2.  The API key input will be disabled (the server handles it).
3.  Requests will be sent to `http://localhost:3000/proxy/...` instead of directly to AI Horde.
