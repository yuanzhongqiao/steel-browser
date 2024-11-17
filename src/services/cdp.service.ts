import { Browser, Page, Target, BrowserContext, Protocol } from "puppeteer-core";
import { Duplex } from "stream";
import { EventEmitter } from "events";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteerExtra from "puppeteer-extra";
import { getChromeExecutablePath, installMouseHelper } from "../utils/browser";
import httpProxy from "http-proxy";
import { IncomingMessage } from "http";
import { env } from "../env";
const proxyChain = require("proxy-chain");
import { getExtensionPaths } from "../utils/extensions";
import { BrowserLauncherOptions, BrowserEvent, BrowserEventType } from "../types";
import fs from "fs";
import path from "path";
import { FingerprintInjector } from "fingerprint-injector";
import { BrowserFingerprintWithHeaders, FingerprintGenerator } from "fingerprint-generator";
import { FastifyBaseLogger } from "fastify";

const recordScript = fs.readFileSync(path.join(__dirname, "../scripts/record.umd.min.cjs"), "utf8");

puppeteerExtra.use(StealthPlugin());

export class CDPService extends EventEmitter {
  private logger: FastifyBaseLogger;
  private keepAlive: boolean;
  private isActive: boolean;
  private browserInstance: Browser | null;
  private wsEndpoint: string | null;
  private fingerprintData: BrowserFingerprintWithHeaders | null;
  private chromeExecPath: string;
  private wsProxyServer: httpProxy;
  private primaryPage: Page | null;
  private launchConfig?: BrowserLauncherOptions;
  private localStorageData: Record<string, Record<string, string>>;
  private defaultLaunchConfig: BrowserLauncherOptions;
  private currentSessionConfig: BrowserLauncherOptions | null;
  private shuttingDown: boolean;

  constructor(config: { keepAlive?: boolean }, logger: FastifyBaseLogger) {
    super();
    this.logger = logger;
    const { keepAlive = true } = config;
    this.isActive = false;
    this.keepAlive = keepAlive;
    this.browserInstance = null;
    this.wsEndpoint = null;
    this.fingerprintData = null;
    this.chromeExecPath = getChromeExecutablePath();
    this.wsProxyServer = httpProxy.createProxyServer();
    this.primaryPage = null;
    this.localStorageData = {};
    this.currentSessionConfig = null;
    this.shuttingDown = false;
    this.defaultLaunchConfig = {
      options: { headless: false },
    };
  }

  private removeAllHandlers() {
    this.browserInstance?.removeAllListeners();
    this.removeAllListeners();
  }

  public isRunning(): boolean {
    return this.browserInstance?.process() !== null;
  }

  public async getPrimaryPage(): Promise<Page> {
    if (!this.primaryPage || !this.browserInstance) {
      throw new Error("CDPService has not been launched yet!");
    }
    if (this.primaryPage.isClosed()) {
      this.primaryPage = await this.browserInstance.newPage();
    }
    return this.primaryPage;
  }

  public async refreshPrimaryPage() {
    if (!this.primaryPage) {
      throw new Error("CDPService has not been launched yet!");
    }
    const newPage = await this.createPage();
    await this.primaryPage.close();
    this.primaryPage = newPage;
  }

  private async handleTargetChange(target: Target) {
    if (target.type() !== "page") return;

    const page = await target.page().catch((e) => {
      this.logger.error(`Error handling target change in CDPService: ${e}`);
      return null;
    });

    if (page) {
      //@ts-ignore
      const pageId = page.target()._targetId;

      await page.setBypassCSP(true);

      try {
        if (page.isClosed()) return;

        if (this.launchConfig?.logSinkUrl) {
          await page.evaluate(recordScript);

          // Modify the page-side recording to dispatch events instead of making fetch calls
          await page.evaluate((pageId: string) => {
            //@ts-ignore
            if (typeof rrweb !== "undefined" && !window.__rrwebRecordingInitialized) {
              //@ts-ignore
              rrweb.record({
                emit(event) {
                  // Dispatch custom event instead of fetch
                  window.dispatchEvent(
                    new CustomEvent("steel-log-event", {
                      detail: {
                        type: "Recording",
                        text: JSON.stringify({ pageId, event }),
                        timestamp: new Date().toISOString(),
                      },
                    }),
                  );
                },
              });
              //@ts-ignore
              window.__rrwebRecordingInitialized = true;
            }
          }, pageId);

          await page.exposeFunction("handleSteelEvent", (detail: any) => {
            fetch(this.launchConfig!.logSinkUrl!, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(detail),
            }).catch((error) => {
              this.logger.error(`Error sending log event: ${error}`);
            });
          });

          // Connect the custom event to our exposed function
          await page.evaluate(() => {
            window.addEventListener("steel-log-event", (e: any) => {
              // @ts-ignore
              window.handleSteelEvent(e.detail);
            });
          });
        }
      } catch (error) {
        this.logger.error(`Error injecting script: ${error}`);
      }
    }
  }

  private async handleNewTarget(target: Target) {
    if (target.type() !== "page") return;

    const page = await target.page().catch((e) => {
      this.logger.error(`Error handling new target in CDPService: ${e}`);
      return null;
    });

    if (page) {
      //@ts-ignore
      const pageId = page.target()._targetId;

      if (this.launchConfig?.customHeaders) {
        await page.setExtraHTTPHeaders({
          ...env.DEFAULT_HEADERS,
          ...this.launchConfig.customHeaders,
        });
      } else if (env.DEFAULT_HEADERS) {
        await page.setExtraHTTPHeaders(env.DEFAULT_HEADERS);
      }

      if (this.launchConfig?.cookies?.length) {
        await page.setCookie(...this.launchConfig.cookies);
      }

      const fingerprintInjector = new FingerprintInjector();
      //@ts-ignore
      await fingerprintInjector.attachFingerprintToPuppeteer(page, this.fingerprintData!);

      page.on("error", (err) => {
        this.logger.error(`Page error: ${err}`);
        this.logEvent({
          type: BrowserEventType.Error,
          text: JSON.stringify({ pageId, message: err.message, name: err.name }),
          timestamp: new Date(),
        });
      });

      page.on("pageerror", (err) => {
        this.logEvent({
          type: BrowserEventType.PageError,
          text: JSON.stringify({ pageId, message: err.message, name: err.name }),
          timestamp: new Date(),
        });
      });

      page.on("framenavigated", (frame) => {
        if (!frame.parentFrame()) {
          this.logger.info(`Navigated to ${frame.url()}`);
          this.logEvent({
            type: BrowserEventType.Navigation,
            text: JSON.stringify({ pageId, url: frame.url() }),
            timestamp: new Date(),
          });
        }
      });

      page.on("console", (message) => {
        this.logger.info(`Console message: ${message.type()}: ${message.text()}`);
        this.logEvent({
          type: BrowserEventType.Console,
          text: JSON.stringify({ pageId, type: message.type(), text: message.text() }),
          timestamp: new Date(),
        });
      });

      page.on("requestfailed", (request) => {
        this.logger.warn(`Request failed: "${request.failure()?.errorText}": ${request.url()}`);
        this.logEvent({
          type: BrowserEventType.RequestFailed,
          text: JSON.stringify({ pageId, errorText: request.failure()?.errorText, url: request.url() }),
          timestamp: new Date(),
        });
      });

      await page.setRequestInterception(true);

      page.on("request", async (request) => {
        const headers = request.headers();
        delete headers["accept-language"]; // Patch to help with headless detection

        this.logEvent({
          type: BrowserEventType.Request,
          text: JSON.stringify({ pageId, method: request.method(), url: request.url() }),
          timestamp: new Date(),
        });

        if (request.url().startsWith("file://")) {
          this.logger.error(`Blocked request to file protocol: ${request.url()}`);
          page.close().catch(() => {});
          this.shutdown();
        } else {
          await request.continue({ headers });
        }
      });

      page.on("response", (response) => {
        this.logEvent({
          type: BrowserEventType.Response,
          text: JSON.stringify({ pageId, status: response.status(), url: response.url() }),
          timestamp: new Date(),
        });

        if (response.url().startsWith("file://")) {
          this.logger.error(`Blocked response from file protocol: ${response.url()}`);
          page.close().catch(() => {});
          this.shutdown();
        }
      });

      const cdpSession = await page.createCDPSession();

      const { width, height } = this.launchConfig?.dimensions || { width: 1920, height: 1080 };
      if (this.launchConfig?.dimensions) {
        this.logger.info("Setting viewport to", width, height);
        await page.setViewport({ width, height });
        await (
          await page.createCDPSession()
        ).send("Page.setDeviceMetricsOverride", {
          screenHeight: height,
          screenWidth: width,
          width,
          height,
          mobile: /phone|android|mobile/i.test(this.fingerprintData!.fingerprint.navigator.userAgent),
          screenOrientation:
            height > width ? { angle: 0, type: "portraitPrimary" } : { angle: 90, type: "landscapePrimary" },
          deviceScaleFactor: this.fingerprintData!.fingerprint.screen.devicePixelRatio,
        });
      }

      cdpSession.on("Page.screencastFrame", async (params: any) => {
        await cdpSession.send("Page.screencastFrameAck", { sessionId: params.sessionId });
        await this.logEvent({
          type: BrowserEventType.ScreencastFrame,
          text: JSON.stringify({ data: params.data, pageId }),
          timestamp: new Date(),
        });
      });

      await cdpSession.send("Page.startScreencast", {
        format: "jpeg",
        quality: 100,
        maxWidth: width,
        maxHeight: height,
        everyNthFrame: 1,
      });

      page.on("close", async () => {
        cdpSession.removeAllListeners();
      });

      await installMouseHelper(page);

      const updateLocalStorage = (host: string, storage: Record<string, string>) => {
        this.localStorageData[host] = { ...this.localStorageData[host], ...storage };
      };

      await page.exposeFunction("updateLocalStorage", updateLocalStorage);

      await page.evaluateOnNewDocument(() => {
        window.addEventListener("beforeunload", () => {
          updateLocalStorage(window.location.host, { ...window.localStorage });
        });
      });
    }
  }

  public async createPage(): Promise<Page> {
    if (!this.browserInstance) {
      throw new Error("Browser instance not initialized");
    }
    return this.browserInstance.newPage();
  }

  public async shutdown(): Promise<void> {
    if (this.browserInstance) {
      this.shuttingDown = true;
      this.logger.info(`Shutting down CDPService and cleaning up resources`);
      this.removeAllHandlers();
      await this.browserInstance.close();
      this.isActive = false;
      this.browserInstance = null;
      this.wsEndpoint = null;
      this.emit("close");
      this.shuttingDown = false;
    }
  }

  public getBrowserProcess() {
    return this.browserInstance?.process() || null;
  }

  public async createBrowserContext(proxyUrl: string): Promise<BrowserContext> {
    if (!this.browserInstance) {
      throw new Error("Browser instance not initialized");
    }
    return this.browserInstance.createBrowserContext({ proxyServer: proxyUrl });
  }

  public async launch(config?: BrowserLauncherOptions): Promise<Browser> {
    this.launchConfig = config || this.defaultLaunchConfig;

    if (this.browserInstance) {
      this.logger.info("Existing browser instance detected. Closing it before launching a new one.");
      await this.shutdown();
    }

    const { options, userAgent } = this.launchConfig;

    const extensions = this.launchConfig.extensions ? [...this.launchConfig.extensions] : [];

    const proxyUrl = this.launchConfig.options.proxyUrl
      ? await proxyChain.anonymizeProxy(this.launchConfig.options.proxyUrl)
      : null;

    const extensionPaths = getExtensionPaths(extensions);

    const fingerprintGen = new FingerprintGenerator({
      devices: ["desktop"],
      operatingSystems: ["linux"],
      browsers: [{ name: "chrome", minVersion: 128 }],
      locales: ["en-US", "en"],
    });

    this.fingerprintData = await fingerprintGen.getFingerprint();

    const extensionArgs = extensionPaths.length
      ? [`--load-extension=${extensionPaths.join(",")}`, `--disable-extensions-except=${extensionPaths.join(",")}`]
      : [];

    const timezone = "America/New_York"; // Default timezone, can be customized

    const launchArgs = [
      "--remote-allow-origins=*",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      this.launchConfig.dimensions ? "" : "--start-maximized",
      "--remote-debugging-port=9222",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-angle=disabled",
      "--disable-blink-features=AutomationControlled",
      "--disable-software-rasterizer",
      `--window-size=${this.launchConfig.dimensions?.width ?? 1920},${this.launchConfig.dimensions?.height ?? 1080}`,
      `--timezone=${timezone}`,
      userAgent ? `--user-agent=${userAgent}` : "",
      proxyUrl ? `--proxy-server=${proxyUrl}` : "",
      ...extensionArgs,
      ...(options.args || []),
    ].filter(Boolean);

    console.log("Launch args", launchArgs);

    const finalLaunchOptions = {
      ...options,
      defaultViewport: this.launchConfig.dimensions ? this.launchConfig.dimensions : undefined,
      args: launchArgs,
      executablePath: this.chromeExecPath,
      timeout: 0,
      // dumpio: true, //uncomment this line to see logs from chrome
    };

    this.logger.info(`Launch Options:`);
    this.logger.info(JSON.stringify(finalLaunchOptions, null, 2));
    this.browserInstance = (await puppeteerExtra.launch(finalLaunchOptions)) as unknown as Browser;

    this.browserInstance.on("error", (err) => {
      this.logger.error(`Browser error: ${err}`);
      this.logEvent({
        type: BrowserEventType.BrowserError,
        text: `BROWSER ERROR: ${err}`,
        timestamp: new Date(),
      });
    });

    this.browserInstance.on("targetcreated", this.handleNewTarget.bind(this));
    this.browserInstance.on("targetchanged", this.handleTargetChange.bind(this));
    this.browserInstance.on("disconnected", this.onDisconnect.bind(this));

    this.isActive = true;
    this.wsEndpoint = this.browserInstance.wsEndpoint();

    this.primaryPage = (await this.browserInstance.pages())[0];
    await this.handleNewTarget(this.primaryPage.target());
    await this.handleTargetChange(this.primaryPage.target());

    return this.browserInstance;
  }

  public async proxyWebSocket(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    if (!this.wsEndpoint) {
      throw new Error(`WebSocket endpoint not available. Ensure the browser is launched first.`);
    }

    const onDisconnect = async () => {
      this.browserInstance?.off("close", onDisconnect);
      this.browserInstance?.process()?.off("close", onDisconnect);
      socket.off("close", onDisconnect);
    };

    this.browserInstance?.once("close", onDisconnect);
    this.browserInstance?.process()?.once("close", onDisconnect);
    socket.once("close", onDisconnect);

    this.browserInstance?.once("disconnected", onDisconnect);

    this.wsProxyServer.ws(
      req,
      socket,
      head,
      {
        target: this.wsEndpoint,
      },
      (error) => {
        if (error) {
          this.logger.error(`WebSocket proxy error: ${error}`);
          this.shutdown();
          throw error;
        }
      },
    );
  }

  public getUserAgent() {
    return this.fingerprintData?.fingerprint.navigator.userAgent;
  }

  public async getBrowserState(): Promise<{
    cookies: Protocol.Network.Cookie[];
    localStorage: Record<string, Record<string, string>>;
  }> {
    if (!this.browserInstance || !this.primaryPage) {
      throw new Error("Browser or primary page not initialized");
    }

    const client = await this.primaryPage.createCDPSession();
    const { cookies } = await client.send("Network.getAllCookies");
    return { cookies, localStorage: this.localStorageData };
  }

  private async logEvent(event: BrowserEvent) {
    if (!this.launchConfig?.logSinkUrl) return;

    try {
      const response = await fetch(this.launchConfig.logSinkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!response.ok) {
        this.logger.error(`Error logging event from CDPService: ${event.type} ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error(`Error logging event from CDPService: ${error}`);
    }
  }

  public async getAllPages() {
    return this.browserInstance?.pages() || [];
  }

  public async startNewSession(sessionConfig: BrowserLauncherOptions): Promise<Browser> {
    if (this.browserInstance) {
      this.logger.info("Closing existing browser before starting a new session.");
      await this.shutdown();
    }
    this.currentSessionConfig = sessionConfig;
    return this.launch(sessionConfig);
  }

  public async endSession(): Promise<void> {
    this.logger.info("Ending current session and restarting with default configuration.");
    await this.shutdown();
    this.currentSessionConfig = null;
    await this.launch(this.defaultLaunchConfig);
  }

  private async onDisconnect(): Promise<void> {
    this.logger.info("Browser disconnected. Handling cleanup.");

    if (this.shuttingDown || this.browserInstance?.process()) {
      return;
    }

    if (this.currentSessionConfig) {
      this.logger.info("Restarting browser with current session configuration.");
      await this.launch(this.currentSessionConfig);
    } else if (this.keepAlive) {
      this.logger.info("Restarting browser with default configuration.");
      await this.launch(this.defaultLaunchConfig);
    } else {
      this.logger.info("Shutting down browser.");
      await this.shutdown();
    }
  }
}
