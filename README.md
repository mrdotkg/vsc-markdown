# Markdown Editor

## Introduction

A lightweight VS Code extension for instant Markdown editing and rendering using Vditor.

**Supported file formats:**

- Markdown: `.md`

## Features

- **Instant Rendering**: Real-time preview as you type
- **WYSIWYG Editor**: Visual editing with Vditor
- **Markdown Support**: Full CommonMark and GFM support
- **Code Highlighting**: Syntax highltighting with highlight.js
- **Math Support**: KaTeX for mathematical expressions
- **Mermaid Diagrams**: Support for Mermaid diagram syntax
- **Outline View**: Navigate document structure
- **Theme Support**: Multiple editor themes

## Keyboard Shortcuts

Based on [Vditor shortcuts](shortcut.md):

- **Move list up**: `Ctrl+Alt+I` / `⌘+^+I`
- **Move list down**: `Ctrl+Alt+J` / `⌘+^+J`
- **Edit in VS Code**: `Ctrl+Alt+E` / `⌘+^+E`

## Tips

- Resize editor via `Ctrl/Cmd + Mouse Scroll`
- Open hyperlinks with `Ctrl/Cmd + Click` or double-click
- Paste images directly into the editor

## Configuration

To use the default VS Code markdown editor instead:

```json
{
    "workbench.editorAssociations": {
        "*.md": "default",
        "*.markdown": "default"
    }
}
```

## Credits

- **Markdown Editor**: [Vanessa219/vditor](https://github.com/Vanessa219/vditor)
- **Syntax Highlighting**: [highlight.js](https://highlightjs.org/)
- **Math Rendering**: [KaTeX](https://katex.org/)
- **Diagrams**: [Mermaid](https://mermaid.js.org/)

## TODO

- Make sure there are no difference between native markdown preview and our own preview.
- remove whats not working and release first version of the extension.
- Remove vditor.css.

## System Design

```text
assets
  logo.png
src
  ui
    md-elements.css
    editor.css
    dark-light-theme.css
  api
    provider.js
    service.js
    events.js
  ext.js
  ext.html
  ext.css
package.json

```
