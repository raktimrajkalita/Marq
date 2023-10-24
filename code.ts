// Define the structure of the PluginMessage for type-safety.
interface PluginMessage {
  type: string;
  text?: string;
  emoji?: string;
  color?: string;
  preset?: string;
}

// Display the UI part of the plugin.
figma.showUI(__html__, { width: 370, height: 500 });

figma.notify('Welcome to Marq! 🚀', {
  error: false,
  timeout: 2000
});

// Initialize a variable to track whether presets are available.
let presetsAvailable = false;

// Send a message to the UI to display the "preset" section by default.
figma.ui.postMessage({ type: 'show-preset-default' });

// Send selection count to UI
figma.on('selectionchange', () => {
  let newSelectionCount = figma.currentPage.selection.length;
  figma.ui.postMessage({
    type: 'selectionChange',
    count: newSelectionCount
  });
});

// Listen for messages sent from the UI.
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'set-tag') {
    figma.notify('Applied!', {
      error: false,
      timeout: 2000
    });
    const nodes = figma.currentPage.selection;
    let newName: string | null = null;

    if (msg.emoji && msg.text) {
      newName = `${msg.emoji} ${msg.text}`;
    } else if (msg.emoji) {
      newName = `${msg.emoji}`;
    } else if (msg.text) {
      newName = `${msg.text}`;
    }

    if (nodes.length === 0) {
      if (newName) {
        let currentPage = figma.currentPage;
        let originalPageName = currentPage.name.split(" ➤ ")[1] || currentPage.name;
        currentPage.name = `${newName} ➤ ${originalPageName.trim()}`;
      }
    } else {
      nodes.forEach(node => {
        if ("name" in node && newName) {
          let originalName = node.name.split(" ➤ ")[1] || node.name;
          node.name = `${newName} ➤ ${originalName.trim()}`;
        }
        // Ensure color is not "none" before applying.
        if ("fills" in node && msg.color && msg.color !== "" && msg.color !== "none") {
          node.fills = [{ type: 'SOLID', color: hexToRgb(msg.color as string) }];
        }
      });
    }
  }

  // Saving a new preset.
  if (msg.type === 'save-preset') {
    let presetString: string = "";

    // Create the preset string based on the provided information
    if (msg.emoji) presetString += `${msg.emoji}|`;
    if (msg.text) presetString += `${msg.text}|`;
    if (msg.color && msg.color !== "#000000" && msg.color !== "none") presetString += `${msg.color}`;

    const existingPresets = await figma.clientStorage.getAsync('presets') || [];
    if (presetString !== "||" && !existingPresets.includes(presetString)) {
      existingPresets.push(presetString);
      await figma.clientStorage.setAsync('presets', existingPresets);
      sendPresetsToUI(existingPresets);
    } else {
      figma.notify('Missing information to save the preset!');
    }
    figma.notify('Preset saved', {
      error: false,
      timeout: 2000
    });
  }

  // Fetching the stored presets to populate the UI dropdown.
  if (msg.type === 'get-presets') {
    // Fetching the stored presets to populate the UI dropdown.
    const existingPresets = await figma.clientStorage.getAsync('presets') || [];
    sendPresetsToUI(existingPresets);
  }

  // Deleting a preset.
  if (msg.type === 'delete-preset' && msg.preset) {
    const presetToDelete = msg.preset;
    const existingPresets = await figma.clientStorage.getAsync('presets') || [];
    const updatedPresets = existingPresets.filter((preset: string) => preset !== presetToDelete);
    await figma.clientStorage.setAsync('presets', updatedPresets);
    sendPresetsToUI(updatedPresets);
    // Display a toast message when a preset is deleted
    figma.notify('Preset deleted', {
      error: true,
      timeout: 2000
    });
  }
};

// Send a message to the UI to toggle the visibility of the "Presets" section.
figma.ui.postMessage({ type: 'toggle-presets-section', presetsAvailable });

// Function to send the current presets to the UI.
function sendPresetsToUI(presets: string[]) {
  figma.ui.postMessage({ type: 'update-presets', presets });
}

// Convert a HEX color value to RGB.
function hexToRgb(hex: string): RGB {
  let bigint = parseInt(hex.slice(1), 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  return { r: r / 255, g: g / 255, b: b / 255 };
}

// When the plugin starts, ask the UI to request all stored presets.
figma.ui.postMessage({ type: 'get-presets' });

