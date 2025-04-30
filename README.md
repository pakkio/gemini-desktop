

# Electron MCP Client

**Electron MCP** is a desktop client built with Electron, Vite, React, and TypeScript, designed to interact with various [Model Context Protocol (MCP) servers](https://github.com/modelcontextprotocol/servers).  
It also integrates Google's Gemini API to provide a powerful LLM chat experience.

---

## Features

- ⚡ **Fast and Modern Stack**: Built with Electron, React, Vite, and TypeScript.
- 🔌 **MCP Server Integration**: Connects to multiple MCP servers for diverse data operations.
- 🤖 **LLM Chat Support**: Uses [Gemini API](https://ai.google.dev/gemini-api/docs) for LLM-based chatting.
- 🖥️ **Cross-Platform**: Packages for Windows (NSIS installer) and macOS (DMG).
- 🎨 **Beautiful UI**: Built with MUI, Emotion, Framer Motion, and other modern libraries.
- 📚 **Markdown Rendering**: Supports rich markdown with syntax highlighting.
- 🛠️ **Developer Friendly**: Full TypeScript support, ESLint, and Vite HMR.

---

## Installation

```bash
git clone https://github.com/yourusername/electron-mcp.git
cd electron-mcp
npm install
```

---

## Development

To start the app in development mode:

```bash
npm run dev
```

This will start Vite and Electron in watch mode for live-reloading.

---

## Build

To create a production build:

```bash
npm run build
```

This will:

- Compile the TypeScript code
- Build the Vite frontend
- Package the Electron app using `electron-builder`

Output will be available inside the `dist/` and `dist-electron/` folders.

---

## Scripts

| Script | Description |
| :----- | :---------- |
| `npm run dev` | Start the app in development mode (Vite + Electron) |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production Vite build |
| `npm run lint` | Run ESLint on the codebase |

---

## Tech Stack

- **Electron** - Desktop application framework
- **Vite** - Frontend tooling and development server
- **React** - UI library
- **TypeScript** - Static typing
- **@modelcontextprotocol/sdk** - MCP Server interaction
- **@google/generative-ai** - Gemini LLM API integration
- **MUI** - Material UI components
- **Emotion** - CSS-in-JS styling
- **Framer Motion** - Animations
- **Express** - Local API server within the app
- **Zod** - Runtime validation
- **React Router** - Routing inside the app

---

## MCP Servers

This client is designed to interact with various MCP servers listed at:  
👉 [Model Context Protocol - Servers](https://github.com/modelcontextprotocol/servers)

You can configure which server to connect to from within the app settings.

---

## Gemini API

This app uses [Gemini](https://ai.google.dev/gemini-api/docs) to provide LLM-based chat inside the app.

Make sure you have your API key to configure app

---

## Packaging Targets

- **macOS**: DMG installer
- **Windows**: NSIS installer (x64 architecture)

---

## Folder Structure

```
/
├── dist/               # Vite frontend build output
├── dist-electron/      # Electron main process build output
├── static/             # Static assets
├── src/                # Source code (React + Electron)
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

## Notes

- Make sure to have Node.js and npm installed.
- The app is under active development — contributions and feedback are welcome!

