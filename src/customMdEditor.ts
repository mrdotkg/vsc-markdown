import * as vscode from "vscode";
import { Handler } from "./common/handler";
import { MarkdownService } from "./editorServices";
import { Toolbar } from "./statusBarControls";
import { Holder } from "./common/holder";
import { adjustImgPath } from "@/common/fileUtil";
import { isAbsolute, parse } from "path";

export class Editor implements vscode.CustomTextEditorProvider {
  private scrollTimeout: NodeJS.Timeout;
  private toolbar: Toolbar;
  private markdownService: MarkdownService;
  private document: vscode.TextDocument;
  private handler: any;
  private webview: vscode.Webview;
  private folderPath: vscode.Uri;
  private content: string;
  private contextPath: string;
  private rootPath: string;
  private baseUrl: string;

  constructor(private context: vscode.ExtensionContext) {
    this.toolbar = new Toolbar();
    this.markdownService = new MarkdownService(context);
    this.contextPath = `${this.context.extensionPath}`;
  }

  private getFolders(): vscode.Uri[] {
    const data = [];
    for (let i = 65; i <= 90; i++) {
      data.push(vscode.Uri.file(`${String.fromCharCode(i)}:/`));
    }
    return data;
  }

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file("/"), ...this.getFolders()],
    };

    // Initialize class properties
    this.document = document;
    this.handler = Handler.bind(webviewPanel, document.uri);
    this.webview = this.handler.panel.webview;
    this.folderPath = vscode.Uri.joinPath(document.uri, "..");
    this.content = document.getText();

    this.initializeEditor();
  }

  private initializeEditor() {
    // Setup editor components
    this.setupWebviewPaths();
    this.setupEditorState();
    this.setupEditorEvents();
    this.setupWebviewContent();
    this.setupConfigurationWatcher();
  }

  private setupWebviewPaths() {
    this.rootPath = this.webview
      .asWebviewUri(vscode.Uri.file(`${this.contextPath}`))
      .toString();

    const { getWorkspacePath } = require("@/common/fileUtil");
    const { Global } = require("@/common/global");
    const basePath = Global.getConfig("workspacePathAsImageBasePath")
      ? vscode.Uri.file(getWorkspacePath(this.folderPath))
      : this.folderPath;

    this.baseUrl = this.webview
      .asWebviewUri(basePath)
      .toString()
      .replace(/\?.+$/, "")
      .replace("https://git", "https://file");
  }

  private setupEditorState() {
    Holder.activeDocument = this.document;
    MarkdownService.setActiveWebview(this.webview);
  }

  private postToWebview(type: string, value: any) {
    this.webview.postMessage({ type, value });
  }

  private setupViewStateHandler() {
    this.handler.panel.onDidChangeViewState((e: any) => {
      Holder.activeDocument = e.webviewPanel.visible
        ? this.document
        : Holder.activeDocument;
      if (e.webviewPanel.visible) {
        this.toolbar.updateCount(this.content);
        this.toolbar.show();
        MarkdownService.setActiveWebview(this.webview);
      } else {
        this.toolbar.hide();
        MarkdownService.setActiveWebview(null);
      }
    });

    vscode.window.onDidChangeActiveColorTheme((e) => {
      const themeValue =
        e.kind === vscode.ColorThemeKind.Dark ? "dark" : "light";
      this.postToWebview("updateActiveColorThemeKind", themeValue);
    });
  }

  private updateToolbarAndContent(content: string) {
    this.content = content;
    this.toolbar.updateCount(content);
  }

  private isRecentManualSave(lastManualSaveTime: number): boolean {
    return lastManualSaveTime && Date.now() - lastManualSaveTime < 800;
  }

  private setupEditorEvents() {
    let lastManualSaveTime: number;
    const config = vscode.workspace.getConfiguration("vsc-markdown");

    this.setupViewStateHandler();

    this.handler
      .on("init", () => {
        const scrollTop = this.context.workspaceState.get(
          `scrollTop_${this.document.uri.fsPath}`,
          0
        );
        this.handler.emit("open", {
          title: require("path").basename(this.document.uri.fsPath),
          config,
          scrollTop,
          language: vscode.env.language,
          rootPath: this.rootPath,
          content: this.content,
        });
        this.updateToolbarAndContent(this.content);
        this.toolbar.show();
      })
      .on("externalUpdate", (e: any) => {
        if (this.isRecentManualSave(lastManualSaveTime)) return;
        const updatedText = e.document.getText()?.replace(/\r/g, "");
        if (this.content == updatedText) return;
        this.updateToolbarAndContent(updatedText);
        this.handler.emit("update", updatedText);
      })
      .on("command", (command: string) => {
        vscode.commands.executeCommand(command);
      })
      .on("openLink", (uri: string) => {
        const resReg = /https:\/\/file.*\.net/i;
        if (uri.match(resReg)) {
          const localPath = uri.replace(resReg, "");
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse(localPath)
          );
        } else {
          vscode.env.openExternal(vscode.Uri.parse(uri));
        }
      })
      .on("scroll", ({ scrollTop }: { scrollTop: number }) => {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
          this.context.workspaceState.update(
            `scrollTop_${this.document.uri.fsPath}`,
            scrollTop
          );
        }, 150);
      })
      .on("img", async (img: string) => {
        const { relPath, fullPath } = adjustImgPath(this.document.uri);
        const imagePath = isAbsolute(fullPath)
          ? fullPath
          : `${require("path").resolve(
              this.document.uri.fsPath,
              ".."
            )}/{relPath}`.replace(/\\/g, "/");
        require("fs").writeFileSync(imagePath, Buffer.from(img, "binary"));
        const fileName = parse(relPath).name;
        const adjustRelPath = await this.markdownService.imgExtGuide(
          imagePath,
          relPath
        );
        vscode.env.clipboard.writeText(`![${fileName}](${adjustRelPath})`);
        vscode.commands.executeCommand("editor.action.clipboardPasteAction");
      })
      .on("editInVSCode", (full: boolean) => {
        const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
        vscode.commands.executeCommand(
          "vscode.openWith",
          this.document.uri,
          "default",
          side
        );
      })
      .on("save", (newContent: string) => {
        if (this.isRecentManualSave(lastManualSaveTime)) return;
        this.updateToolbarAndContent(newContent);
        this.updateTextDocument(this.document, newContent);
      })
      .on("doSave", async (content: string) => {
        lastManualSaveTime = Date.now();
        await this.updateTextDocument(this.document, content);
        this.updateToolbarAndContent(content);
        vscode.commands.executeCommand("workbench.action.files.save");
      });
  }

  private setupWebviewContent() {
    const configs = {
      platform: process.platform,
      scrollBeyondLastLine: vscode.workspace
        .getConfiguration("editor")
        .get("scrollBeyondLastLine"),
    };

    const { Util } = require("./common/util");
    this.webview.html = Util.buildPath(
      require("fs")
        .readFileSync(`${this.contextPath}/editor.html`, "utf8")
        .replace("{{rootPath}}", this.rootPath)
        .replace("{{baseUrl}}", this.baseUrl)
        .replace(`"{{configs}}"`, `'${JSON.stringify(configs)}'`),
      this.webview,
      this.contextPath
    );
  }

  private setupConfigurationWatcher() {
    const updateWebviewConfig = () => {
      const scrollBeyondLastLine = vscode.workspace
        .getConfiguration("editor")
        .get<boolean>("scrollBeyondLastLine");
      this.postToWebview("updateScrollBeyondLastLine", scrollBeyondLastLine);
    };

    updateWebviewConfig();

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("editor.scrollBeyondLastLine")) {
        updateWebviewConfig();
      }
    });
  }

  private updateTextDocument(document: vscode.TextDocument, content: any) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      content
    );
    return vscode.workspace.applyEdit(edit);
  }
}
