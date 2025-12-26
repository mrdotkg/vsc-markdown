import * as vscode from "vscode";
import { Editor } from "./customMdEditor";
import { MarkdownService } from "./editorServices";
import { FileUtil } from "./common/fileUtil";
import { Output } from "./common/output";
import { Hotkeys } from "./common/hotkeys";
export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("workbench");
  const configKey = "editorAssociations";
  const editorAssociations = config.get(configKey);
  editorAssociations["git:/**/*.md"] = "default";
  editorAssociations["gitlens:/**/*.md"] = "default";
  editorAssociations["git-graph:/**/*.md"] = "default";
  config.update(configKey, editorAssociations, true);
  const viewOption = {
    webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true },
  };
  FileUtil.init(context);
  const markdownService = new MarkdownService(context);
  const markdownEditorProvider = new Editor(context);
  
  // Track when switching between editors
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      // Clear active webview if switching to a non-markdown editor
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
        MarkdownService.setActiveWebview(null);
        vscode.commands.executeCommand('setContext', 'vsc-markdown.isMarkdownEditorActive', false);
      }
    })
  );
  context.subscriptions.push(
    ...Hotkeys.map((config) =>
      vscode.commands.registerCommand(config.command, () => {
        if (config.keyEvent) {
          MarkdownService.format(config.text, config.keyEvent);
        }
      })
    ),
    vscode.commands.registerCommand("vsc-markdown.switch", (uri) => {
      markdownService.switchEditor(uri);
    }),
    vscode.commands.registerCommand("vsc-markdown.paste", () => {
      markdownService.loadClipboardImage();
    }),
    vscode.window.registerCustomEditorProvider(
      "vsc-markdown",
      markdownEditorProvider,
      viewOption
    )
  );
  
}

export function deactivate() {}
