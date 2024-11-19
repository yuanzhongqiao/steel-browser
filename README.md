<br /><br />

<p align="center">
<a href="https://steel.dev">
  <img src="images/steel_header_logo.png" alt="Steel Logo" width="100">
</a>
</p>

<h3 align="center"><b>Steel</b></h3>
<p align="center">
    <b>the open-source browser API for AI agents & apps</b>. <br />
    The best way to build live web agents and browser automation tools.
</p>

<p align="center">
  <a href="https://github.com/steel-dev/steel-browser/commits/main" target="_blank">
      <img src="https://img.shields.io/github/commit-activity/m/steel-dev/steel-browser?color=yellow" alt="Commit Activity">
  </a>
  <a href="https://github.com/steel-dev/steel-browser/blob/main/LICENSE" target="_blank">
      <img src="https://img.shields.io/github/license/steel-dev/steel-browser?color=yellow" alt="License">
  </a>
  <a href="https://discord.gg/gPpvhNvc5R" target="_blank">
      <img src="https://discordapp.com/api/guilds/1285696350117167226/widget.png?style=shield" alt="Discord">
  </a>
  <a href="https://twitter.com/steel_dev" target="_blank">
      <img src="https://img.shields.io/twitter/follow/steeldotdev?style=social" alt="Twitter Follow">
  </a>
  <a href="https://github.com/steel-dev/steel-browser" target="_blank">
      <img src="https://img.shields.io/github/stars/steel-dev/steel-browser?style=social" alt="GitHub stars">
  </a>
</p>

<h4 align="center">
    <a href="https://app.steel.dev/sign-up" target="_blank">
      Get Started
  </a>  ·
    <a href="https://docs.steel.dev/" target="_blank">
      Documentation
  </a>  ·
  <a href="https://steel.dev/" target="_blank">
      Website
  </a> ·
  <a href="https://docs.steel.dev/" target="_blank">
      Cookbook
  </a>
</h4>

<p align="center">
  <img src="images/demo.gif" alt="Steel Demo" width="600">
</p>

[Steel](https://steel.dev) is an open-source browser API. We make it easy for AI devs to programmatically control browser that work with your favorite frameworks.

> Steel is in public beta and evolving every day. Your suggestions, ideas, and reported bugs help us immensely. Do not hesitate to join in the conversation on [Discord](https://discord.gg/gPpvhNvc5R) or raise a GitHub issue. We read everything and respond to most.



## ⚡ Installation

The easiest way to get started with Steel is by creating a [Steel Cloud](https://app.steel.dev) account.

If you would like to self-host Steel, please see our [deployment guide](https://docs.plane.so/docker-compose).

| Installation methods | Link                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Run locally with GHCR | [![Deploy with Github Container Redistry](https://img.shields.io/badge/GHCR-478CFF?style=for-the-badge&labelColor=478CFF&logo=github&logoColor=white)](https://github.com/steel-dev/steel-browser/pkgs/container/steel-browser) |
| 1-click deploy to Railway | [![Deploy on Railway](https://img.shields.io/badge/Railway-B039CB?style=for-the-badge&labelColor=B039CB&logo=railway&logoColor=white)](https://railway.app/template/oPvZmg?referralCode=Jwc4kg) |
| 1-click deploy to Render | [![Deploy to Render](https://img.shields.io/badge/Render-8A05FF?style=for-the-badge&labelColor=8A05FF&logo=render&logoColor=white)](https://render.com/deploy) |




`Instance admins` can configure instance settings with [God-mode](https://docs.plane.so/instance-admin).

## ✨ Highlights 

The Steel browser provides a REST API to control a headless browser powered by Puppeteer. Under the hood, it manages browser instances, sessions, and pages, allowing you to perform complex browsing tasks programmatically without any of the headaches:

- **Full Browser Control**: Uses Puppeteer and CDP for complete control over Chrome instances -- allowing you to connect using Puppeteer, Playwright, or Selenium.
- **Session Management**: Maintains browser state, cookies, and local storage across requests
- **Proxy Support**: Built-in proxy chain management for IP rotation
- **Extension Support**: Load custom Chrome extensions for enhanced functionality
- **Debugging Tools**: Built-in request logging and session recording capabilities
- **Anti-Detection**: Includes stealth plugins and fingerprint management
- **Resource Management**: Automatic cleanup and browser lifecycle management


For detailed API documentation and examples, check out our [API reference](https://steel.dev/api) or explore the Swagger UI directly at `http://localhost:3000/documentation`.



## Getting Started

The fastest way to get started is to build and run the Docker image:

```bash
# Clone and build the Docker image
git clone https://github.com/steel-dev/steel-browser
cd steel-browser
docker build -t steel .

# On an M chip Mac, you may need to run `docker build --platform linux/amd64 .`

# Run the server
docker run -p 3000:3000 steel
```

Alternatively, if you have Node.js and Chrome installed, you can run the server directly:

```bash
npm install
npm run dev
```

This will start the Steel server on port 3000.

Make sure you have the Chrome executable installed and in one of these paths:


- **Linux**:
  `/usr/bin/google-chrome`

- **MacOS**:
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

- **Windows**:
  - `C:\Program Files\Google\Chrome\Application\chrome.exe` OR
  - `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

For more details on where this is checked look at [`src/server/utils/browser.ts`](./src/server/utils/browser.ts).

## How It Works
The Steel browser provides a REST API to control a headless browser powered by Puppeteer. Under the hood, it manages browser instances, sessions, and pages, allowing you to perform complex browsing tasks programmatically.

Steel provides three main ways to let your agents do browser automation:

### Quick Actions API
The `/scrape`, `/screenshot`, and `/pdf` endpoints let you quickly extract clean, well-formatted data from any webpage using the running Steel server. Ideal for simple, read-only, on-demand jobs:

#### Scrape a Web Page
Extract the HTML content of a web page.
```bash
# Example using the Actions API
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "waitFor": 1000
  }'
```

### Take a Screenshot
Take a screenshot of a web page.
```bash
# Example using the Actions API
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "fullPage": true
  }' --output screenshot.png
```

### Browser Sessions API
The Browser Sessions API lets you relaunch the browser with custom options or extensions (e.g. with a custom proxy) and also reset the browser state. Perfect for complex, stateful workflows that need fine-grained control:

```bash
# Launch a new browser session
curl -X POST http://localhost:3000/launch-browser \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "proxy": "user:pass@host:port",
      // Custom launch options
    }
  }'
```

### Selenium Integration
>**Note:** This integration does not support all the features of the CDP-based browser sessions API.

For teams with existing Selenium workflows, the Steel browser provides a drop-in replacement that adds enhanced features while maintaining compatibility:

```bash
# Launch a Selenium session
curl -X POST http://localhost:3000/selenium/launch \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      // Selenium-compatible options
    }
  }'
```

The Selenium API is fully compatible with Selenium's WebDriver protocol, so you can use any existing Selenium clients to connect to the Steel browser.

```typescript
// Example using the Selenium API
const builder = new Builder()
      .forBrowser("chrome")
      .usingServer(
        `http://localhost:3000/selenium`
      );

const driver = await builder.build();

console.log("Navigating to Google");
await driver.get("https://www.google.com");

// The rest of your Selenium code here...
```

## Use Case: LLMs Interacting with the Web

The browser is designed for AI agents that need to interact with the web. Whether you're building an AI that gathers information, automates tasks, or analyzes web content, Steel provides the tools to navigate and manipulate web pages programmatically.


### Example: AI-Powered Web Scraping

An AI agent can use the Steel browser to scrape dynamic content from web pages, even those requiring JavaScript execution. With Steel's simple API, the agent can:

- Navigate to a target URL
- Execute arbitrary JavaScript to interact with page elements
- Extract information from the page in a variety of formats (HTML, JSON, PDF, etc.)


### Example: Automated Form Submission


1. **Launch a Browser Session**: Start a new browser session to maintain state.
2. **Navigate to the Form Page**: Using Puppeteer or Playwright, navigate to the form page.
3. **Fill Out the Form**: Programmatically interact with form elements.
4. **Submit the Form**: Trigger form submission and handle the response.

## Get involved
The Steel browser is an open-source project, and we welcome contributions!
- [Join the conversation on Discord](https://discord.gg/gPpvhNvc5R) - `#contributing` channel
- [Review the 🛣️ Roadmap and contribute your ideas](https://steel.dev/roadmap)
- [Grab an issue and open a PR](https://github.com/steel-dev/browser) - [`Good first issue tag`](https://github.com/steel-dev/browser/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- [Read our contributing guide](https://steel.dev/contributing)

## License
[Apache 2.0](./LICENSE)
