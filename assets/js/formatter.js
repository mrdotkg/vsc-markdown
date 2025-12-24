// Markdown formatter for webview using window.vditor

class VditorFormatter {
  static waitForVditor(callback, maxAttempts = 50) {
    if (window.vditor) {
      callback();
    } else if (maxAttempts > 0) {
      setTimeout(() => this.waitForVditor(callback, maxAttempts - 1), 100);
    } else {
      console.warn("Vditor not ready after waiting");
    }
  }

  static insertHeading(level = 1) {
    this.waitForVditor(() => {
      window.vditor.focus();
      const headingPrefix = "#".repeat(level) + " ";
      const selectedText = window.vditor.getSelection();

      if (selectedText) {
        // If text is selected, wrap it with heading
        const cleanText = selectedText.replace(/^#{1,6}\s*/, ''); // Remove existing heading markers
        const headingText = headingPrefix + cleanText;
        window.vditor.updateValue(headingText);
      } else {
        // If no selection, insert heading prefix
        window.vditor.insertValue(headingPrefix, true);
      }

      window.vditor.focus();
    });
  }

  static toggleEmphasis(type = "bold") {
    this.waitForVditor(() => {
      const marker = type === "bold" ? "**" : "*";
      const selectedText = window.vditor.getSelection();

      if (selectedText) {
        // Check if already emphasized
        if (selectedText.startsWith(marker) && selectedText.endsWith(marker)) {
          // Remove emphasis
          const unemphasized = selectedText.slice(marker.length, -marker.length);
          window.vditor.updateValue(unemphasized);
        } else {
          // Add emphasis
          const emphasized = marker + selectedText + marker;
          window.vditor.updateValue(emphasized);
        }
      } else {
        // Insert markers for empty selection
        window.vditor.insertValue(marker + marker, true);
      }

      window.vditor.focus();
    });
  }

  static insertList(ordered = false) {
    this.waitForVditor(() => {
      const listMarker = ordered ? "1. " : "- ";
      const selectedText = window.vditor.getSelection();

      if (selectedText) {
        // If text is selected, convert each line to a list item
        const lines = selectedText.split('\n');
        const listItems = lines.map(line => {
          const trimmedLine = line.trim();
          if (trimmedLine === '') return '';
          // Remove existing list markers if present
          const cleanLine = trimmedLine.replace(/^[\-\*\+]\s*|^\d+\.\s*/, '');
          return listMarker + cleanLine;
        });
        window.vditor.updateValue(listItems.join('\n'));
      } else {
        // Insert list marker at cursor
        window.vditor.insertValue(listMarker, true);
      }

      window.vditor.focus();
    });
  }
}

// Listen for formatting commands from the extension
if (window.vscodeEvent) {
  window.vscodeEvent.on("vditorCommand", (message) => {
    if (!message || !message.command) {
      console.log("Invalid message or missing command");
      return;
    }
    switch (message.command) {
      case "insertHeading":
        console.log("Received insertHeading command with level:", message.data?.level); 
        VditorFormatter.insertHeading(message.data?.level || 1);
        break;
      case "toggleEmphasis":
        console.log("Received toggleEmphasis command with type:", message.data?.type);
        VditorFormatter.toggleEmphasis(message.data?.type || "bold");
        break;
      case "insertList":
        console.log("Received insertList command with ordered:", message.data?.ordered);
        VditorFormatter.insertList(message.data?.ordered || false);
        break;
      default:
        console.log("Unknown command:", message.command);
    }
  });
} else {
  console.log("vscodeEvent is not available");
}
