import { adjustImgPath, getWorkspacePath, writeFile } from '@/common/fileUtil';
import { readFileSync, writeFileSync } from 'fs';
import { basename, isAbsolute, parse, resolve } from 'path';
import * as vscode from 'vscode';
import { Handler } from './common/handler';
import { Util } from './common/util';
import { Holder } from './common/holder';
import { MarkdownService } from './service';
import { Global } from '@/common/global';
import { Output } from './common/output';

/**
 * support view and edit Markdown features in VS Code Ui.
 */
export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {

    private extensionPath: string;
    private countStatus: vscode.StatusBarItem;
    private state: vscode.Memento;
    private scrollTimeout: NodeJS.Timeout;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
        this.countStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.state = context.workspaceState
    }

    private getFolders(): vscode.Uri[] {
        const data = [];
        for (let i = 65; i <= 90; i++) {
            data.push(vscode.Uri.file(`${String.fromCharCode(i)}:/`))
        }
        return data;
    }

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        // console.log('schema', document.uri.scheme);
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(uri, '..')
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file("/"), ...this.getFolders()]
        }
        const handler = Handler.bind(webviewPanel, uri);
        this.handleMarkdown(document, handler, folderPath)
        handler.on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
    }

    private handleMarkdown(document: vscode.TextDocument, handler: Handler, folderPath: vscode.Uri) {

        const uri = document.uri;
        const webview = handler.panel.webview;

        let content = document.getText();
        const contextPath = `${this.extensionPath}`;
        const rootPath = webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)).toString();

        Holder.activeDocument = document;
        handler.panel.onDidChangeViewState(e => {
            Holder.activeDocument = e.webviewPanel.visible ? document : Holder.activeDocument
            if (e.webviewPanel.visible) {
                this.updateCount(content)
                this.countStatus.show()
                // Restore scroll position when webview becomes visible/focused with slight delay
                const scrollTop = this.state.get(`scrollTop_${document.uri.fsPath}`, 0);
                if (scrollTop > 0) {
                    setTimeout(() => {
                        handler.emit('restoreScrollPosition', scrollTop);
                    }, 100);
                }
            } else {
                this.countStatus.hide()
            }
        });
        // You can also listen for changes to the active color theme
        vscode.window.onDidChangeActiveColorTheme(e => {
            if (e.kind === vscode.ColorThemeKind.Dark) {
                webview.postMessage({ type: 'updateActiveColorThemeKind', value: 'dark' });
            } else if (e.kind === vscode.ColorThemeKind.Light) {
                webview.postMessage({ type: 'updateActiveColorThemeKind', value: 'light' });
            }
        });
        let lastManualSaveTime: number;
        const config = vscode.workspace.getConfiguration("vsc-markdown");
        handler.on("init", () => {
            const scrollTop = this.state.get(`scrollTop_${document.uri.fsPath}`, 0);
            Output.log(`Loading scroll position for ${document.uri.fsPath}: ${scrollTop}`);
            handler.emit("open", {
                title: basename(uri.fsPath),
                config, scrollTop,
                language: vscode.env.language,
                rootPath, content
            })
            this.updateCount(content)
            this.countStatus.show()
        }).on("externalUpdate", e => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            const updatedText = e.document.getText()?.replace(/\r/g, '');
            if (content == updatedText) return;
            content = updatedText;
            this.updateCount(content)
            handler.emit("update", updatedText)
        }).on("command", (command) => {
            vscode.commands.executeCommand(command)
        }).on("openLink", (uri: string) => {
            const resReg = /https:\/\/file.*\.net/i;
            if (uri.match(resReg)) {
                const localPath = uri.replace(resReg, '')
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(localPath));
            } else {
                vscode.env.openExternal(vscode.Uri.parse(uri));
            }
        }).on("scroll", ({ scrollTop }) => {
            Output.log(`Saving scroll position: ${scrollTop}`);
            // Debounce scroll position updates to avoid excessive state writes
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.state.update(`scrollTop_${document.uri.fsPath}`, scrollTop);
                Output.log(`Scroll position saved: ${scrollTop}`);
            }, 150);
        }).on("img", async (img) => {
            const { relPath, fullPath } = adjustImgPath(uri)
            const imagePath = isAbsolute(fullPath) ? fullPath : `${resolve(uri.fsPath, "..")}/${relPath}`.replace(/\\/g, "/");
            writeFileSync(imagePath, Buffer.from(img, 'binary'))
            const fileName = parse(relPath).name;
            const adjustRelPath = await MarkdownService.imgExtGuide(imagePath, relPath);
            vscode.env.clipboard.writeText(`![${fileName}](${adjustRelPath})`)
            vscode.commands.executeCommand("editor.action.clipboardPasteAction")
        }).on("quickOpen", () => {
            vscode.commands.executeCommand('workbench.action.quickOpen');
        }).on("editInVSCode", (full: boolean) => {
            const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
            vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
        }).on("save", (newContent) => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            content = newContent
            this.updateTextDocument(document, newContent)
            this.updateCount(content)
        }).on("doSave", async (content) => {
            lastManualSaveTime = Date.now();
            await this.updateTextDocument(document, content)
            this.updateCount(content)
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("export", (option) => {
            vscode.commands.executeCommand('workbench.action.files.save');
            vscode.window.showInformationMessage('Export functionality has been removed. Please use VSCode built-in export or external tools.')
        }).on("theme", async (theme) => {
            if (!theme) {
                const themes = [
                    "Auto", "|",
                    "Light", "Solarized", "Warm Light", "Dim Light", "|",
                    "One Dark", "Github Dark",
                    "Nord", "Monokai", "Dracula",
                ];
                const editorTheme = Global.getConfig('editorTheme');
                const themeItems: vscode.QuickPickItem[] = themes.map(theme => {
                    if (theme == '|') return { label: '|', kind: vscode.QuickPickItemKind.Separator }
                    return { label: theme, description: theme == editorTheme ? 'Current' : undefined }
                })
                theme = await vscode.window.showQuickPick(themeItems, { placeHolder: "Select Editor Theme" });
                if (!theme) return
            }
            handler.emit('theme', theme.label)
            Global.updateConfig('editorTheme', theme.label)
        }).on("saveOutline", (enable) => {
            config.update("openOutline", enable, true)
        }).on('developerTool', () => {
            vscode.commands.executeCommand('workbench.action.toggleDevTools')
        })

        // Decide what the base path should be for resources
        // If the config 'workspacePathAsImageBasePath' is enabled, use the workspace folder path as a file URI
        // Otherwise, just use the folderPath directly
        const basePath = Global.getConfig('workspacePathAsImageBasePath')
            ? vscode.Uri.file(getWorkspacePath(folderPath))   // Convert workspace folder path into a VS Code file URI
            : folderPath;                                     // Fallback: use the raw folder path

        const baseUrl = webview.asWebviewUri(basePath)
            .toString()
            .replace(/\?.+$/, '')        // strip query parameters
            .replace('https://git', 'https://file'); // adjust scheme for file access

        const configs = {
            platform: process.platform, // e.g. 'win32', 'darwin'
            scrollBeyondLastLine: vscode.workspace.getConfiguration('editor').get('scrollBeyondLastLine')};

        webview.html = Util.buildPath(
            readFileSync(`${this.extensionPath}/editor.html`, 'utf8')
                .replace("{{rootPath}}", rootPath)                 // inject rootPath
                .replace("{{baseUrl}}", baseUrl)                   // inject baseUrl
                .replace(
                    `"{{configs}}"`,
                    `'`+JSON.stringify({
                        platform: process.platform,
                        scrollBeyondLastLine: vscode.workspace
                        .getConfiguration("editor")
                        .get("scrollBeyondLastLine"),
                    })+`'`
                ),
            webview,
            contextPath
        );

        const configEd = vscode.workspace.getConfiguration('editor');
        updateWebviewConfig();

        vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('editor.scrollBeyondLastLine')) {
            updateWebviewConfig();
        }
        });

        function updateWebviewConfig() {
            const scrollBeyondLastLine = vscode.workspace.getConfiguration('editor').get<boolean>('scrollBeyondLastLine');
            webview.postMessage({ type: 'updateScrollBeyondLastLine', value: scrollBeyondLastLine });
        }


    }

    private updateCount(content: string) {
        this.countStatus.text = `Line ${content.split(/\r\n|\r|\n/).length}    Count ${content.length}`
    }

    private updateTextDocument(document: vscode.TextDocument, content: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
        return vscode.workspace.applyEdit(edit);
    }

}