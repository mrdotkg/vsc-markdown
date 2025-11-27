import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, onToolbarClick, createContextMenu, scrollEditor } from "./util.js";

let state;

/**
 * Load configurations from the 'configs' element.
 * @returns {Object} The loaded configuration state.
 */
function loadConfigs() {
  const elem = document.getElementById('configs');
  try {
    state = JSON.parse(elem.getAttribute('data-config'));
    const { platform } = state;
    document.getElementById('vditor').classList.add(platform);
    if (state.scrollBeyondLastLine) {
      document.body.classList.add('scrollBeyondLastLine');
    }
  } catch (error) {
    console.log('loadConfigFail');
  }
  return state;
}

loadConfigs();

/**
 * Wait for the handler to be defined.
 * @param {Function} callback The callback function to execute when the handler is defined.
 */
function waitForHandler(callback) {
  if (typeof handler !== 'undefined') {
    callback();
  } else {
    setTimeout(() => waitForHandler(callback), 10);
  }
}

/**
 * Wait for Vditor to be defined.
 * @param {Function} callback The callback function to execute when Vditor is defined.
 */
function waitForVditor(callback) {
  if (typeof Vditor !== 'undefined') {
    callback();
  } else {
    setTimeout(() => waitForVditor(callback), 10);
  }
}

waitForHandler(() => {
  waitForVditor(() => {
    handler.on("open", async (md) => {
      const { config, language } = md;
      addAutoTheme(md.rootPath, config.editorTheme);
      handler.on('theme', (theme) => {
        loadTheme(md.rootPath, theme);
      });
      
      const editor = new Vditor('vditor', {
        customWysiwygToolbar: () => {},
        value: md.content,
        height: document.documentElement.clientHeight,
        outline: {
          enable: config.openOutline,
          position: 'right',
        },
        toolbarConfig: {
          tipPosition: 'south',
          hide: config.hideToolbar,
        },
        cache: {
          enable: false,
        },
        mode: 'ir',
        lang: (config.editorLanguage || 'en_US'),
        // icon: "ant",
        tab: '\t',
        preview: {
          theme: {current: 'none'},
          markdown: {
            toc: false,
            codeBlockPreview: true,
            mark: false,
          },
          hljs: {
            enable: true,
            style: 'vs',
            lineNumber: config.previewCodeHighlight.showLineNumber,
          },
          extPath: md.rootPath,
          math: {
            engine: 'KaTeX',
            inlineDigit: true,
          },
          actions: [],
          mode: 'editor',
        },
        toolbar: await getToolbar(md.rootPath),
        extPath: md.rootPath,
        input(content) {
          handler.emit("save", content);
        },
        upload: {
          url: '/image',
          accept: 'image/*',
          handler(files) {
            let reader = new FileReader();
            reader.readAsBinaryString(files[0]);
            reader.onloadend = () => {
              handler.emit("img", reader.result);
            };
          },
        },
        hint: {
          emoji: {},
          extend: hotKeys,
        },
        after() {
          handler.on("update", (content) => {
            editor.setValue(content);
          });
          openLink();
          onToolbarClick(editor);
        },
      });

      // autoSymbol(handler, editor, config);
      // createContextMenu(editor);
      // imageParser(config.viewAbsoluteLocal);
      // scrollEditor(md.scrollTop);
      // zoomElement('.vditor-content');
    }).emit("init");
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
  document.getElementById('vditor').setAttribute('data-editor-theme', theme);
}

/**
 * Load CSS to the editor.
 * @param {String} rootPath The root path of the editor.
 * @param {String} path The path of the CSS file.
 */
function loadCSS(rootPath, path) {
  const style = document.createElement('link');
  style.rel = "stylesheet";
  style.type = "text/css";
  style.href = `${rootPath}/${path}`;
  document.documentElement.appendChild(style);
}

