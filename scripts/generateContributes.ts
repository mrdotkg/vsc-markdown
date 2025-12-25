import * as fs from "fs";
import * as path from "path";

/**
 * Generates VS Code commands and keybindings from hotkeys.ts
 * and updates package.json
 */

interface Hotkey {
  command: string;
  title: string;
  icon: string;
  text?: string;
  keybinding?: string;
}

const hotkeyPath = path.resolve(__dirname, "../src/common/hotkeys.ts");
const packagePath = path.resolve(__dirname, "../package.json");

// Parse hotkeys by extracting JSON-serializable fields only
function extractHotkeys(): Hotkey[] {
  const content = fs.readFileSync(hotkeyPath, "utf-8");
  const hotkeys: Hotkey[] = [];

  // Split into individual object definitions
  const objectPattern = /\{\s*command:\s*"([^"]+)"[\s\S]*?(?=\},|\])/g;
  let match;

  while ((match = objectPattern.exec(content)) !== null) {
    const objectStr = match[0];
    const hotkey: Hotkey = {
      command: "",
      title: "",
      icon: "",
    };

    // Extract each field
    const commandMatch = objectStr.match(/command:\s*"([^"]+)"/);
    if (commandMatch) hotkey.command = commandMatch[1];

    const titleMatch = objectStr.match(/title:\s*"([^"]+)"/);
    if (titleMatch) hotkey.title = titleMatch[1];

    const iconMatch = objectStr.match(/icon:\s*"([^"]+)"/);
    if (iconMatch) hotkey.icon = iconMatch[1];

    const textMatch = objectStr.match(/text:\s*"([^"]+)"/);
    if (textMatch) hotkey.text = textMatch[1];

    const keybindingMatch = objectStr.match(/keybinding:\s*"([^"]*)"/);
    if (keybindingMatch) hotkey.keybinding = keybindingMatch[1];

    if (hotkey.command) {
      hotkeys.push(hotkey);
    }
  }

  return hotkeys;
}

function generateCommands(hotkeys: Hotkey[]) {
  return hotkeys.map((hotkey) => ({
    command: hotkey.command,
    title: `BossMD : ${hotkey.title}`,
    icon: hotkey.icon,
  }));
}

function generateKeybindings(hotkeys: Hotkey[]) {
  const keybindings = hotkeys
    .filter((hotkey) => hotkey.keybinding && hotkey.keybinding.length > 0)
    .map((hotkey) => ({
      command: hotkey.command,
      key: hotkey.keybinding,
      when: "editorTextFocus && editorLangId == markdown",
    }));

  return keybindings;
}

function updatePackageJson() {
  const packageContent = fs.readFileSync(packagePath, "utf-8");
  const packageJson = JSON.parse(packageContent);

  // Extract hotkeys
  const hotkeys = extractHotkeys();

  // Generate commands and keybindings
  const commands = generateCommands(hotkeys);
  const keybindings = generateKeybindings(hotkeys);

  // Preserve existing commands that aren't in hotkeys
  const existingCommands = packageJson.contributes?.commands || [];
  const hotkeyCommands = new Set(hotkeys.map((h) => h.command));
  const otherCommands = existingCommands.filter(
    (cmd: any) => !hotkeyCommands.has(cmd.command)
  );

  // Merge: other commands + generated commands
  packageJson.contributes.commands = [...otherCommands, ...commands];

  // Preserve existing keybindings that aren't from hotkeys
  const existingKeybindings = packageJson.contributes?.keybindings || [];
  const generatedCommands = new Set(keybindings.map((k) => k.command));
  const otherKeybindings = existingKeybindings.filter(
    (kb: any) => !generatedCommands.has(kb.command)
  );

  // Merge: other keybindings + generated keybindings
  packageJson.contributes.keybindings = [...otherKeybindings, ...keybindings];

  // Write back to package.json
  fs.writeFileSync(
    packagePath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf-8"
  );

  console.log(`✓ Updated package.json`);
  console.log(`  - Generated ${commands.length} commands`);
  console.log(`  - Generated ${keybindings.length} keybindings`);
}

// Run if executed directly
if (require.main === module) {
  updatePackageJson();
}

export { extractHotkeys, generateCommands, generateKeybindings };
