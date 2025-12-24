import {
  openLink,
  imageParser,
  scrollEditor,
  addScrollListener,
  preventBlurPropagation,
  setupFocusManagement,
} from "./util.js";

let state;
let editorContainerId = "editor";
let vditorReady = false; // Track when Vditor is fully initialized

function loadConfigs() {
  const elem = document.getElementById("configs");
  try {
    state = JSON.parse(elem.getAttribute("data-config"));
    const { platform } = state;
    document.getElementById("editor").classList.add(platform);
    if (state.scrollBeyondLastLine) {
      document.body.classList.add("scrollBeyondLastLine");
    }
  } catch (error) {}
  return state;
}

loadConfigs();

function waitForHandler(callback) {
  if (typeof vscodeEvent !== "undefined") {
    callback();
  } else {
    setTimeout(() => waitForHandler(callback), 10);
  }
}

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
        const { config } = md;

        window.vditor = new Vditor(editorContainerId, {
          customWysiwygToolbar: () => {},
          value: md.content,
          height: document.documentElement.clientHeight,
          toolbarConfig: {
            tipPosition: "south",
            hide: config.hideToolbar,
          },
          cache: {
            enable: false,
          },
          mode: "ir",
          lang: config.editorLanguage || "en_US",
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
          after() {
            vscodeEvent.on("update", (content) => {
              window.vditor.setValue(content);
            });

            openLink();
            setTimeout(preventBlurPropagation, 50);
            addScrollListener();
            scrollEditor(md.scrollTop);
            setupFocusManagement();
            imageParser(true);
            
            // Mark Vditor as fully ready
            vditorReady = true;
            window.vditorReady = true;
          },
        });
      })
      .emit("init");
  });
});
