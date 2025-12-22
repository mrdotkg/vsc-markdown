import { openLink, hotKeys, getToolbar, onToolbarClick, imageParser, scrollEditor } from "./util.js";

let state;
let editorContainerId = "editor";
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

        window.vditor = new Vditor(editorContainerId, {
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
            // Prevent blur event from reaching Vditor to preserve markers
            const preventBlurPropagation = () => {
              document.getElementById(editorContainerId).addEventListener('blur', (event) => {
                  event.stopPropagation();
                  event.preventDefault();

                // Optional: Still handle cursor position tracking manually if needed
                if (window.vditor && window.vditor.currentMode === 'ir') {
                  const selection = window.getSelection();
                  if (selection.rangeCount > 0) {
                    window.vditor.ir.range = selection.getRangeAt(0);
                    console.log('Manually saved cursor position');
                  }
                }

                console.log('Blur event stopped - markers preserved');
                
                return false; // Additional prevention
              }, true); // Use capture phase to intercept before Vditor's handler
              
              console.log('Blur event prevention installed');
            };

            // Install after Vditor completes initialization
            setTimeout(preventBlurPropagation, 50);
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

            // Auto-detect scrolling elements after a delay - TEMPORARILY DISABLED
            // setTimeout(() => {
            //   window.findScrollingElement();
            // }, 1000);

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
            
            // Setup focus management for cursor persistence
            setupFocusManagement();
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

/**
 * Setup focus management for vditor to maintain cursor position during window focus changes
 */
function setupFocusManagement() {
  let editorState = {
    cursorPosition: null,
    selection: null,
    hasFocus: false,
    savedRange: null,
    wasEditing: false
  };

  /**
   * Get current selection range for IR mode
   */
  function getIRSelection() {
    if (window.vditor && window.vditor.currentMode === 'ir') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const irElement = document.querySelector('.vditor-ir .vditor-reset');
        
        // Ensure range is within IR editor
        if (irElement && (irElement.contains(range.startContainer) || 
            irElement.contains(range.endContainer))) {
          return {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset,
            collapsed: range.collapsed
          };
        }
      }
    }
    return null;
  }

  /**
   * Restore selection range for IR mode
   */
  function setIRSelection(rangeData) {
    if (rangeData && window.vditor && window.vditor.currentMode === 'ir') {
      try {
        const range = document.createRange();
        range.setStart(rangeData.startContainer, rangeData.startOffset);
        range.setEnd(rangeData.endContainer, rangeData.endOffset);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Store in vditor's range tracking
        if (window.vditor.ir) {
          window.vditor.ir.range = range;
        }
        
        return true;
      } catch (e) {
        console.log('Failed to restore IR selection:', e);
        return false;
      }
    }
    return false;
  }

  /**
   * Save current editor state before losing focus
   */
  function saveState() {
    if (!window.vditor) return;
    
    try {
      editorState.cursorPosition = window.vditor.getCursorPosition();
      editorState.selection = getIRSelection();
      editorState.hasFocus = document.activeElement?.closest('.vditor-ir') !== null;
      
      // Also save the current range if available
      if (window.vditor.ir && window.vditor.ir.range) {
        editorState.savedRange = window.vditor.ir.range.cloneRange();
      }
      
      console.log('Saved editor state:', editorState);
    } catch (e) {
      console.log('Failed to save editor state:', e);
    }
  }

  /**
   * Restore editor state after gaining focus
   */
  function restoreState() {
    if (!window.vditor) return;
    
    try {
      // Always focus first
      window.vditor.focus();
      
      // For IR mode, try to restore selection
      if (window.vditor.currentMode === 'ir') {
        setTimeout(() => {
          let restored = false;
          
          // Try to restore saved selection
          if (editorState.selection) {
            restored = setIRSelection(editorState.selection);
          }
          
          // Fallback to saved range
          if (!restored && editorState.savedRange) {
            try {
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(editorState.savedRange);
              if (window.vditor.ir) {
                window.vditor.ir.range = editorState.savedRange;
              }
              restored = true;
            } catch (e) {
              console.log('Failed to restore saved range:', e);
            }
          }
          
          // Final fallback: ensure IR element has focus
          if (!restored) {
            window.vditor.focus();
          }
        }, 10);
      }
      
      console.log('Restored editor state');// Critical: Maintain proper focus after restoration\n      setTimeout(() => {\n        if (window.vditor && window.vditor.currentMode === 'ir') {\n          const irElement = document.querySelector('.vditor-ir .vditor-reset');\n          if (irElement) {\n            // Aggressive focus maintenance\n            window.vditor.focus();\n            irElement.focus();\n            \n            // Verify and force focus if needed\n            setTimeout(() => {\n              if (document.activeElement !== irElement) {\n                console.log('Focus lost - forcing with click');\n                irElement.click();\n                irElement.focus();\n              } else {\n                console.log('Focus maintained successfully');\n              }\n            }, 20);\n          }\n        }\n      }, 100);
      
      // Additional: Trigger edit mode activation to show markdown markers
      if (window.vditor && window.vditor.currentMode === 'ir') {
        setTimeout(() => {
          const irElement = document.querySelector('.vditor-ir .vditor-reset');
          if (irElement) {
            try {
              // Dispatch click event to trigger edit mode
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              irElement.dispatchEvent(clickEvent);
              
              // Trigger input event to activate edit state  
              const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
              });
              irElement.dispatchEvent(inputEvent);
              
              // Force contenteditable focus for edit mode
              if (irElement.contentEditable) {
                irElement.setAttribute('contenteditable', 'true');
                irElement.focus();
              }
              
              console.log('Triggered edit mode for markdown markers');
            } catch (e) {
              console.log('Failed to trigger edit mode:', e);
            }
          }
        }, 80);
      }
    } catch (e) {
      console.log('Failed to restore editor state:', e);
    }
  }

  // Window-level focus/blur handling
  window.addEventListener('blur', () => {
    console.log('Window lost focus - saving editor state');
    saveState();
  });
  
  window.addEventListener('focus', () => {
    console.log('Window gained focus - restoring editor state');
    setTimeout(restoreState, 50);
  });
  
  console.log('Focus management setup complete');
}
