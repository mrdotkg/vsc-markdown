import * as vscode from "vscode";

export class Toolbar {
  private countStatus: vscode.StatusBarItem;
  private h1Button: vscode.StatusBarItem;
  private boldButton: vscode.StatusBarItem;
  private listButton: vscode.StatusBarItem;

  constructor() {
    this.countStatus = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.h1Button = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1000
    );
    this.boldButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      999
    );
    this.listButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      998
    );

    this.setupButtons();
  }

  private setupButtons() {
    this.h1Button.text = "H1";
    this.h1Button.tooltip = "Insert H1 Heading (ctrl+alt+1)";
    this.h1Button.command = "vsc-markdown.insertH1";

    this.boldButton.text = "$(bold)";
    this.boldButton.tooltip = "Make text bold (ctrl+alt+b)";
    this.boldButton.command = "vsc-markdown.insertBold";

    this.listButton.text = "$(list-unordered)";
    this.listButton.tooltip = "Insert unordered list (ctrl+alt+l)";
    this.listButton.command = "vsc-markdown.insertList";
  }

  updateCount(content: string) {
    this.countStatus.text = `${content.length} Words`;
  }

  show() {
    this.countStatus.show();
    this.h1Button.show();
    this.boldButton.show();
    this.listButton.show();
  }

  hide() {
    this.countStatus.hide();
    this.h1Button.hide();
    this.boldButton.hide();
    this.listButton.hide();
  }

  dispose() {
    this.countStatus.dispose();
    this.h1Button.dispose();
    this.boldButton.dispose();
    this.listButton.dispose();
  }
}
