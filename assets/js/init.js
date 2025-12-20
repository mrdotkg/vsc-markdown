import { openLink, hotKeys, getToolbar, onToolbarClick, imageParser, scrollEditor } from "./util.js";

let state;

/**
 * Load configurations from the 'configs' element.
 * @returns {Object} The loaded configuration state.
 */
function loadConfigs() {
  const elem = document.getElementById("configs");
  try {
    state = JSON.parse(elem.getAttribute("data-config"));
    const { platform } = state;
    document.getElementById("editor").classList.add(platform);
    if (state.scrollBeyondLastLine) {
      document.body.classList.add("scrollBeyondLastLine");
    }
  } catch (error) {
    console.log("loadConfigFail");
  }
  return state;
}

loadConfigs();

/**
 * Wait for the handler to be defined.
 * @param {Function} callback The callback function to execute when the handler is defined.
 */
function waitForHandler(callback) {
  if (typeof vscodeEvent !== "undefined") {
    callback();
  } else {
    setTimeout(() => waitForHandler(callback), 10);
  }
}

/**
 * Wait for Editor to be defined.
 * @param {Function} callback The callback function to execute when Editor is defined.
 */
function waitForVditor(callback) {
  if (typeof Vditor !== "undefined") {
    callback();
  } else {
    setTimeout(() => waitForVditor(callback), 10);
  }
}

waitForHandler(() => {
  waitForVditor(() => {
    vscodeEvent
      .on("open", async (md) => {
        const { config, language } = md;
        // addAutoTheme(md.rootPath, config.editorTheme);
        // vscodeEvent.on("theme", (theme) => {
        //   loadTheme(md.rootPath, theme);
        // });

        window.vditor = new Vditor("editor", {
          customWysiwygToolbar: () => {},
          value: md.content,
          height: document.documentElement.clientHeight,
          outline: {
            enable: false,
            position: "right",
          },
          toolbarConfig: {
            tipPosition: "south",
            hide: config.hideToolbar,
          },
          cache: {
            enable: false,
          },
          mode: "ir",
          lang: config.editorLanguage || "en_US",
          // icon: "ant",
          tab: "\t",
          preview: {
            theme: { current: "none" },
            markdown: {
              toc: false,
              codeBlockPreview: true,
              mark: false,
            },
            hljs: {
              enable: true,
              style: document.body.classList.contains("vscode-dark")
                ? "vs2015"
                : "vs",
              lineNumber: config.previewCodeHighlight.showLineNumber,
            },
            extPath: md.rootPath,
            math: {
              engine: "KaTeX",
              inlineDigit: true,
            },
            actions: [],
            mode: "editor",
          },
          toolbar: await getToolbar(md.rootPath),
          extPath: md.rootPath,
          input(content) {
            vscodeEvent.emit("save", content);
          },
          upload: {
            url: "/image",
            accept: "image/*",
            handler(files) {
              let reader = new FileReader();
              reader.readAsBinaryString(files[0]);
              reader.onloadend = () => {
                vscodeEvent.emit("img", reader.result);
              };
            },
          },
          hint: {
            emoji: {},
            extend: hotKeys,
          },
          after() {
            vscodeEvent.on("update", (content) => {
              window.vditor.setValue(content);
            });
            vscodeEvent.on("restoreScrollPosition", (scrollTop) => {
              console.log('Restoring scroll position to:', scrollTop);
              scrollEditor(scrollTop);
            });
            
            openLink();
            
            // Add debug function to window for manual testing
            window.debugScrollSetup = () => {
              console.log('=== Scroll Setup Debug ===');
              const selectors = [
                ".vditor-reset",
                ".vditor-ir .vditor-reset", 
                ".vditor-wysiwyg .vditor-reset",
                ".vditor-ir__preview",
                ".vditor-ir",
                ".vditor"
              ];
              
              selectors.forEach(selector => {
                const element = document.querySelector(selector);
                console.log(`${selector}:`, element ? 'FOUND' : 'NOT FOUND', element);
                if (element) {
                  console.log(`  - scrollHeight: ${element.scrollHeight}, clientHeight: ${element.clientHeight}`);
                  console.log(`  - overflow: ${getComputedStyle(element).overflow}`);
                  console.log(`  - overflowY: ${getComputedStyle(element).overflowY}`);
                }
              });
              
              console.log('VscodeEvent available:', typeof vscodeEvent !== 'undefined');
              console.log('Handler available:', typeof handler !== 'undefined');
              console.log('Window.vditor:', window.vditor);
            };
            
            // Add universal scroll detector to find which element is actually scrolling
            window.findScrollingElement = () => {
              console.log('=== Finding Scrolling Element ===');
              const elements = document.querySelectorAll('*');
              elements.forEach((el, index) => {
                if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
                  const computedStyle = getComputedStyle(el);
                  if (computedStyle.overflow !== 'visible' || computedStyle.overflowY !== 'visible') {
                    console.log(`Scrollable element ${index}:`, el);
                    console.log(`  - Tag: ${el.tagName}, Classes: ${el.className}`);
                    console.log(`  - scrollHeight: ${el.scrollHeight}, clientHeight: ${el.clientHeight}`);
                    console.log(`  - overflowY: ${computedStyle.overflowY}`);
                    
                    // Add test scroll listener to this element
                    el.addEventListener('scroll', (e) => {
                      console.log(`SCROLL DETECTED on ${el.tagName}.${el.className}:`, e.target.scrollTop);
                    }, { once: false });
                  }
                }
              });
            };
            
            // Call debug function to log initial state
            window.debugScrollSetup();
            
            // Auto-detect scrolling elements after a delay
            setTimeout(() => {
              window.findScrollingElement();
            }, 1000);
            
            // Add manual scroll test function
            window.testScrollEvent = (scrollTop = 100) => {
              console.log('=== Testing Manual Scroll Event ===');
              console.log('Emitting test scroll event with scrollTop:', scrollTop);
              if (typeof vscodeEvent !== 'undefined') {
                vscodeEvent.emit("scroll", { scrollTop });
                console.log('Test scroll event emitted successfully');
              } else {
                console.error('vscodeEvent not available for testing');
              }
            };
            
            // Add manual scroll restoration test
            window.testScrollRestore = (scrollTop = 1200) => {
              console.log('=== Testing Manual Scroll Restoration ===');
              console.log('Testing scroll restoration to position:', scrollTop);
              scrollEditor(scrollTop);
            };
            
            // Simplified backup - just verify window scroll is working
            setTimeout(() => {
              console.log('Backup check: Window scroll available:', typeof window.scrollTo === 'function');
              const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
              console.log('Current window scroll position:', currentScroll);
            }, 500);
            
            console.log('Initial scroll position:', md.scrollTop);
            scrollEditor(md.scrollTop)
          },
        });
        imageParser(true);
      })
      .emit("init");
  });
});

/**
 * Add auto theme to the editor.
 * @param {String} rootPath The root path of the editor.
 * @param {String} theme The theme to add.
 */
function addAutoTheme(rootPath, theme) {
  // loadCSS(rootPath, 'css/base.css');
  // loadTheme(rootPath, theme);
}

/**
 * Load theme to the editor.
 * @param {String} rootPath The root path of the editor.
 * @param {String} theme The theme to load.
 */
function loadTheme(rootPath, theme) {
  loadCSS(rootPath, `css/theme/${theme}.css`);
  document.getElementById("editor").setAttribute("data-editor-theme", theme);
}

/**
 * Load CSS to the editor.
 * @param {String} rootPath The root path of the editor.
 * @param {String} path The path of the CSS file.
 */
function loadCSS(rootPath, path) {
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.type = "text/css";
  style.href = `${rootPath}/${path}`;
  document.documentElement.appendChild(style);
}
