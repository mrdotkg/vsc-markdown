import * as vscode from "vscode";
import { Editor } from "./customMdEditor";
import { MarkdownService } from "./editorServices";
import { FileUtil } from "./common/fileUtil";
import { Output } from "./common/output";

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
  context.subscriptions.push(
    vscode.commands.registerCommand("vsc-markdown.switch", (uri) => {
      markdownService.switchEditor(uri);
    }),
    vscode.commands.registerCommand("vsc-markdown.paste", () => {
      markdownService.loadClipboardImage();
    }),
    vscode.commands.registerCommand("vsc-markdown.insertH1", () => {
      MarkdownService.insertHeading(1);
    }),
    vscode.commands.registerCommand("vsc-markdown.insertBold", () => {
      MarkdownService.toggleEmphasis("bold");
    }),
    vscode.commands.registerCommand("vsc-markdown.insertList", () => {
      MarkdownService.insertList(false);
    }),
    vscode.window.registerCustomEditorProvider(
      "vsc-markdown",
      markdownEditorProvider,
      viewOption
    )
  );
}

export function deactivate() {}
