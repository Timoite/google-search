import { chromium, devices, BrowserContextOptions, Browser } from "playwright";
import { SearchResponse, SearchResult, CommandOptions, HtmlResponse } from "./types.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import logger from "./logger.js";

// 指纹配置接口
interface FingerprintConfig {
  deviceName: string;
  locale: string;
  timezoneId: string;
  colorScheme: "dark" | "light";
  reducedMotion: "reduce" | "no-preference";
  forcedColors: "active" | "none";
}

// 保存的状态文件接口
interface SavedState {
  fingerprint?: FingerprintConfig;
  kagiToken?: string;
}

/**
 * 获取宿主机器的实际配置
 * @param userLocale 用户指定的区域设置（如果有）
 * @returns 基于宿主机器的指纹配置
 */
function getHostMachineConfig(userLocale?: string): FingerprintConfig {
  // 获取系统区域设置
  const systemLocale = userLocale || process.env.LANG || "zh-CN";

  // 获取系统时区
  const timezoneOffset = new Date().getTimezoneOffset();
  let timezoneId = "Asia/Shanghai"; // 默认使用上海时区

  // 根据时区偏移量粗略推断时区
  if (timezoneOffset <= -480 && timezoneOffset > -600) {
    timezoneId = "Asia/Shanghai";
  } else if (timezoneOffset <= -540) {
    timezoneId = "Asia/Tokyo";
  } else if (timezoneOffset <= -420 && timezoneOffset > -480) {
    timezoneId = "Asia/Bangkok";
  } else if (timezoneOffset <= 0 && timezoneOffset > -60) {
    timezoneId = "Europe/London";
  } else if (timezoneOffset <= 60 && timezoneOffset > 0) {
    timezoneId = "Europe/Berlin";
  } else if (timezoneOffset <= 300 && timezoneOffset > 240) {
    timezoneId = "America/New_York";
  }

  // 检测系统颜色方案
  const hour = new Date().getHours();
  const colorScheme = hour >= 19 || hour < 7 ? ("dark" as const) : ("light" as const);

  const reducedMotion = "no-preference" as const;
  const forcedColors = "none" as const;

  // 根据操作系统选择合适的设备
  const platform = os.platform();
  let deviceName = "Desktop Chrome";

  if (platform === "darwin") {
    deviceName = "Desktop Safari";
  } else if (platform === "win32") {
    deviceName = "Desktop Edge";
  } else if (platform === "linux") {
    deviceName = "Desktop Firefox";
  }

  // 统一使用Chrome以保持一致性
  deviceName = "Desktop Chrome";

  return {
    deviceName,
    locale: systemLocale,
    timezoneId,
    colorScheme,
    reducedMotion,
    forcedColors,
  };
}

/**
 * 执行Kagi搜索并返回结果
 * @param query 搜索关键词
 * @param options 搜索选项
 * @returns 搜索结果
 */
export async function kagiSearch(
  query: string,
  options: CommandOptions = {},
  existingBrowser?: Browser
): Promise<SearchResponse> {
  // 设置默认选项
  const {
    limit = 10,
    timeout = 60000,
    stateFile = "./browser-state.json",
    noSaveState = false,
    locale = "zh-CN",
  } = options;

  // 检查环境变量中的 Kagi token
  const kagiToken = process.env.KAGI_TOKEN;
  if (!kagiToken) {
    throw new Error("KAGI_TOKEN 环境变量未设置。请在 .env 文件中设置你的 Kagi token。");
  }

  let useHeadless = true;
  logger.info({ options }, "正在初始化浏览器...");

  // 检查是否存在状态文件
  let storageState: string | undefined = undefined;
  let savedState: SavedState = {};

  const fingerprintFile = stateFile.replace(".json", "-fingerprint.json");

  if (fs.existsSync(stateFile)) {
    logger.info({ stateFile }, "发现浏览器状态文件，将使用保存的浏览器状态");
    storageState = stateFile;

    if (fs.existsSync(fingerprintFile)) {
      try {
        const fingerprintData = fs.readFileSync(fingerprintFile, "utf8");
        savedState = JSON.parse(fingerprintData);
        logger.info("已加载保存的浏览器指纹配置");
      } catch (e) {
        logger.warn({ error: e }, "无法加载指纹配置文件，将创建新的指纹");
      }
    }
  } else {
    logger.info({ stateFile }, "未找到浏览器状态文件，将创建新的浏览器会话和指纹");
  }

  const deviceList = ["Desktop Chrome", "Desktop Edge", "Desktop Firefox", "Desktop Safari"];

  // 获取随机设备配置或使用保存的配置
  const getDeviceConfig = (): [string, any] => {
    if (savedState.fingerprint?.deviceName && devices[savedState.fingerprint.deviceName]) {
      return [savedState.fingerprint.deviceName, devices[savedState.fingerprint.deviceName]];
    } else {
      const randomDevice = deviceList[Math.floor(Math.random() * deviceList.length)];
      return [randomDevice, devices[randomDevice]];
    }
  };

  // 获取随机延迟时间
  const getRandomDelay = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // 定义一个函数来执行搜索
  async function performSearch(headless: boolean): Promise<SearchResponse> {
    let browser: Browser;
    let browserWasProvided = false;

    if (existingBrowser) {
      browser = existingBrowser;
      browserWasProvided = true;
      logger.info("使用已存在的浏览器实例");
    } else {
      logger.info({ headless }, `准备以${headless ? "无头" : "有头"}模式启动浏览器...`);

      browser = await chromium.launch({
        headless,
        timeout: timeout * 2,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
          "--disable-site-isolation-trials",
          "--disable-web-security",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--hide-scrollbars",
          "--mute-audio",
          "--disable-background-networking",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-breakpad",
          "--disable-component-extensions-with-background-pages",
          "--disable-extensions",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          "--disable-renderer-backgrounding",
          "--enable-features=NetworkService,NetworkServiceInProcess",
          "--force-color-profile=srgb",
          "--metrics-recording-only",
        ],
        ignoreDefaultArgs: ["--enable-automation"],
      });

      logger.info("浏览器已成功启动!");
    }

    // 获取设备配置
    const [deviceName, deviceConfig] = getDeviceConfig();

    let contextOptions: BrowserContextOptions = {
      ...deviceConfig,
    };

    // 使用保存的指纹配置或创建新的
    if (savedState.fingerprint) {
      contextOptions = {
        ...contextOptions,
        locale: savedState.fingerprint.locale,
        timezoneId: savedState.fingerprint.timezoneId,
        colorScheme: savedState.fingerprint.colorScheme,
        reducedMotion: savedState.fingerprint.reducedMotion,
        forcedColors: savedState.fingerprint.forcedColors,
      };
      logger.info("使用保存的浏览器指纹配置");
    } else {
      const hostConfig = getHostMachineConfig(locale);

      if (hostConfig.deviceName !== deviceName) {
        logger.info({ deviceType: hostConfig.deviceName }, "根据宿主机器设置使用设备类型");
        contextOptions = { ...devices[hostConfig.deviceName] };
      }

      contextOptions = {
        ...contextOptions,
        locale: hostConfig.locale,
        timezoneId: hostConfig.timezoneId,
        colorScheme: hostConfig.colorScheme,
        reducedMotion: hostConfig.reducedMotion,
        forcedColors: hostConfig.forcedColors,
      };

      savedState.fingerprint = hostConfig;
      logger.info({
        locale: hostConfig.locale,
        timezone: hostConfig.timezoneId,
        colorScheme: hostConfig.colorScheme,
        deviceType: hostConfig.deviceName,
      }, "已根据宿主机器生成新的浏览器指纹配置");
    }

    // 添加通用选项
    contextOptions = {
      ...contextOptions,
      permissions: ["geolocation", "notifications"],
      acceptDownloads: true,
      isMobile: false,
      hasTouch: false,
      javaScriptEnabled: true,
    };

    if (storageState) {
      logger.info("正在加载保存的浏览器状态...");
    }

    const context = await browser.newContext(
      storageState ? { ...contextOptions, storageState } : contextOptions
    );

    // 设置额外的浏览器属性以避免检测
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en", "zh-CN"] });

      // @ts-ignore
      window.chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };
    });

    const page = await context.newPage();

    // 设置页面额外属性
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, "width", { get: () => 1920 });
      Object.defineProperty(window.screen, "height", { get: () => 1080 });
      Object.defineProperty(window.screen, "colorDepth", { get: () => 24 });
      Object.defineProperty(window.screen, "pixelDepth", { get: () => 24 });
    });

    try {
      // 首先访问带 token 的 Kagi 页面进行认证
      logger.info("正在访问 Kagi 认证页面...");
      const authUrl = `https://kagi.com/search?token=${kagiToken}`;
      
      const authResponse = await page.goto(authUrl, {
        timeout,
        waitUntil: "networkidle",
      });

      if (!authResponse || !authResponse.ok()) {
        throw new Error(`无法访问 Kagi 认证页面: ${authResponse?.status()}`);
      }

      // 等待页面加载完成
      await page.waitForLoadState("networkidle", { timeout });

      logger.info({ query }, "正在执行 Kagi 搜索...");

      // 构建搜索 URL
      const searchUrl = `https://kagi.com/search?q=${encodeURIComponent(query)}`;
      
      // 直接访问搜索 URL
      const searchResponse = await page.goto(searchUrl, {
        timeout,
        waitUntil: "networkidle",
      });

      if (!searchResponse || !searchResponse.ok()) {
        throw new Error(`搜索请求失败: ${searchResponse?.status()}`);
      }

      logger.info({ url: page.url() }, "正在等待搜索结果加载...");

      // 等待搜索结果加载
      const searchResultSelectors = [
        ".search-result",
        ".result",
        "[data-testid='search-result']",
        ".sri-group",
        "main"
      ];

      let resultsFound = false;
      for (const selector of searchResultSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: timeout / 2 });
          logger.info({ selector }, "找到搜索结果");
          resultsFound = true;
          break;
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }

      if (!resultsFound) {
        logger.error("无法找到搜索结果元素");
        throw new Error("无法找到搜索结果元素");
      }

      await page.waitForTimeout(getRandomDelay(200, 500));

      logger.info("正在提取搜索结果...");

      // 提取 Kagi 搜索结果
      const results = await page.evaluate((maxResults: number): SearchResult[] => {
        const results: { title: string; link: string; snippet: string }[] = [];
        const seenUrls = new Set<string>();

        // Kagi 特定的选择器
        const selectorSets = [
          { 
            container: '.search-result', 
            title: 'h3 a, .result-title a', 
            snippet: '.result-snippet, .snippet' 
          },
          { 
            container: '.sri-group .sri-item', 
            title: 'h3 a', 
            snippet: '.sri-snippet' 
          },
          { 
            container: '[data-testid="search-result"]', 
            title: 'h3 a', 
            snippet: '.snippet' 
          },
          { 
            container: '.result', 
            title: 'h3 a, .title a', 
            snippet: '.description, .snippet' 
          }
        ];

        for (const selectorSet of selectorSets) {
          const containers = document.querySelectorAll(selectorSet.container);
          
          for (const container of containers) {
            if (results.length >= maxResults) break;
            
            try {
              // 提取标题和链接
              const titleElement = container.querySelector(selectorSet.title) as HTMLAnchorElement;
              if (!titleElement) continue;
              
              const title = titleElement.textContent?.trim() || '';
              const link = titleElement.href || '';
              
              // 提取摘要
              const snippetElement = container.querySelector(selectorSet.snippet);
              const snippet = snippetElement?.textContent?.trim() || '';
              
              // 验证结果有效性
              if (title && link && !seenUrls.has(link)) {
                // 过滤掉 Kagi 内部链接
                if (!link.includes('kagi.com') || link.includes('search?q=')) {
                  seenUrls.add(link);
                  results.push({ title, link, snippet });
                }
              }
            } catch (error) {
              console.error('提取搜索结果时出错:', error);
            }
          }
          
          if (results.length >= maxResults) break;
        }

        return results;
      }, limit);

      logger.info({ count: results.length }, "成功提取搜索结果");

      // 保存浏览器状态（如果启用）
      if (!noSaveState) {
        try {
          const state = await context.storageState({ path: stateFile });
          
          // 保存指纹配置
          if (!fs.existsSync(fingerprintFile)) {
            fs.writeFileSync(fingerprintFile, JSON.stringify(savedState, null, 2));
            logger.info({ file: fingerprintFile }, "已保存浏览器指纹配置");
          }
          
          logger.info({ file: stateFile }, "已保存浏览器状态");
        } catch (error) {
          logger.warn({ error }, "保存浏览器状态失败");
        }
      }

      // 关闭浏览器（如果不是外部提供的）
      if (!browserWasProvided) {
        await context.close();
        await browser.close();
      } else {
        await page.close();
        await context.close();
      }

      return {
        query,
        results,
      };

    } catch (error) {
      // 确保清理资源
      try {
        if (!browserWasProvided) {
          await context.close();
          await browser.close();
        } else {
          await page.close();
          await context.close();
        }
      } catch (cleanupError) {
        logger.warn({ error: cleanupError }, "清理浏览器资源时出错");
      }
      
      throw error;
    }
  }

  // 尝试无头模式，如果失败则切换到有头模式
  try {
    return await performSearch(useHeadless);
  } catch (error) {
    if (useHeadless) {
      logger.warn({ error }, "无头模式搜索失败，正在切换到有头模式...");
      try {
        return await performSearch(false);
      } catch (headedError) {
        logger.error({ error: headedError }, "有头模式搜索也失败了");
        throw headedError;
      }
    } else {
      throw error;
    }
  }
}

/**
 * 获取Kagi搜索页面的原始HTML
 * @param query 搜索关键词
 * @param options 搜索选项
 * @param saveToFile 是否保存HTML到文件
 * @param outputPath 输出文件路径
 * @returns HTML响应
 */
export async function getKagiSearchPageHtml(
  query: string,
  options: CommandOptions = {},
  saveToFile: boolean = false,
  outputPath?: string
): Promise<HtmlResponse> {
  const {
    timeout = 60000,
    stateFile = "./browser-state.json",
    locale = "zh-CN",
  } = options;

  // 检查环境变量中的 Kagi token
  const kagiToken = process.env.KAGI_TOKEN;
  if (!kagiToken) {
    throw new Error("KAGI_TOKEN 环境变量未设置。请在 .env 文件中设置你的 Kagi token。");
  }

  logger.info({ options }, "正在获取Kagi搜索页面HTML...");

  const browser = await chromium.launch({
    headless: true,
    timeout: timeout * 2,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const deviceConfig = devices["Desktop Chrome"];
  const context = await browser.newContext({
    ...deviceConfig,
    locale,
    storageState: fs.existsSync(stateFile) ? stateFile : undefined,
  });

  const page = await context.newPage();

  try {
    // 首先访问带 token 的 Kagi 页面进行认证
    logger.info("正在访问 Kagi 认证页面...");
    const authUrl = `https://kagi.com/search?token=${kagiToken}`;
    await page.goto(authUrl, { timeout, waitUntil: "networkidle" });

    // 构建搜索 URL 并访问
    const searchUrl = `https://kagi.com/search?q=${encodeURIComponent(query)}`;
    logger.info({ query, url: searchUrl }, "正在获取搜索页面HTML...");
    
    await page.goto(searchUrl, { timeout, waitUntil: "networkidle" });

    // 等待页面完全加载
    await page.waitForLoadState("networkidle", { timeout });

    // 获取页面HTML
    const originalHtml = await page.content();
    
    // 清理HTML - 移除script和style标签
    const cleanedHtml = originalHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const url = page.url();
    
    let savedPath: string | undefined;
    let screenshotPath: string | undefined;

    // 保存HTML到文件（如果需要）
    if (saveToFile) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = `kagi-search-${timestamp}.html`;
      savedPath = outputPath || defaultPath;
      
      try {
        fs.writeFileSync(savedPath, originalHtml, 'utf8');
        logger.info({ path: savedPath }, "HTML已保存到文件");
      } catch (error) {
        logger.error({ error, path: savedPath }, "保存HTML文件失败");
      }

      // 同时保存截图
      try {
        screenshotPath = savedPath.replace('.html', '.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        logger.info({ path: screenshotPath }, "页面截图已保存");
      } catch (error) {
        logger.warn({ error }, "保存页面截图失败");
      }
    }

    await context.close();
    await browser.close();

    return {
      query,
      html: cleanedHtml,
      url,
      savedPath,
      screenshotPath,
      originalHtmlLength: originalHtml.length,
    };

  } catch (error) {
    await context.close();
    await browser.close();
    throw error;
  }
}

// 为了向后兼容，导出旧的函数名（但使用新的实现）
export const googleSearch = kagiSearch;
export const getGoogleSearchPageHtml = getKagiSearchPageHtml;
