# Material Symbols Picker

A lightweight, **zero-dependency** JavaScript icon picker designed for the [Material Symbols](https://fonts.google.com/icons) variable font.

This picker dynamically fetches the latest metadata directly from Google Fonts, providing access to over 2,500+ icons with full-text search, category filtering, and support for variable font axes (Fill, Weight, Grade, Optical Size).

**[🌐 Live Demo & Documentation](https://axsag.github.io/material-icons-picker/)**

---

## ✨ Features

* 📦 **Zero Dependencies**: Pure Vanilla JS. No jQuery, no extra bloat.
* 🌐 **Dynamic Metadata**: Fetches the official Google Fonts icon manifest so you always have the newest icons.
* 🎨 **Variable Font Support**: Toggle between **Outlined**, **Rounded**, and **Sharp** variants natively.
* 🌓 **Smart Theming**: Built-in Light and Dark modes, plus `auto` mode (follows system settings).
* ⚡ **High Performance**: Optimized rendering and virtual-style logic to handle the massive icon set smoothly.
* 🔍 **Smart Search**: Search by icon name or descriptive tags (e.g., searching "home" or "house").

---

## 🚀 Quick Start

### 1. Include the Script
The library automatically handles its own CSS injection and links the necessary Google Fonts.

```html
<script src="material-symbols-picker.js"></script>
```
You can also get it from jsdelivr:
[![jsDelivr CDN](https://img.shields.io/jsdelivr/gh/hm/Axsag/material-icons-picker)](https://www.jsdelivr.com/package/gh/Axsag/material-icons-picker)
```html
<script src="https://cdn.jsdelivr.net/gh/Axsag/material-icons-picker@latest/material-symbols-picker.js"></script>
```

### 2. Auto-initialization
The simplest way to start is by adding a `data-icon-picker` attribute to your input elements:
```html
<input type="text" data-icon-picker value="face">

<script>
  // Initializes all inputs with the data attribute
  MaterialSymbolsPicker.init('[data-icon-picker]');
</script>
```   

### 3. Manual Setup
If you need more control or want to react to changes:
```javascript
const el = document.getElementById('my-input');
const picker = new MaterialSymbolsPicker(el, {
    variant: 'rounded',   // 'outlined' | 'rounded' | 'sharp'
    theme: 'auto',        // 'light' | 'dark' | 'auto'
    fill: 0,              // 0 or 1
    onChange: (name) => {
        console.log('Selected Icon:', name);
    }
});
```

## ⚙️ Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `string` | `'outlined'` | The Material Symbols style: `'outlined'`, `'rounded'`, or `'sharp'`. |
| `fill` | `number` | `0` | Fill axis (0 for stroke, 1 for solid). |
| `weight` | `number` | `400` | Font weight (100 through 700). |
| `grade` | `number` | `0` | Weight fine-tuning (-25, 0, 200). |
| `size` | `number` | `24` | Icon size in pixels for the trigger preview. |
| `theme` | `string` | `'auto'` | Color mode: `'light'`, `'dark'`, or `'auto'`. |
| `fetchIcons`| `boolean`| `true` | Fetch the full metadata from Google (false uses a small fallback list). |
| `onChange` | `function`| `null` | Callback function: `(name) => { ... }`. |

---

## 🏗 API Methods

* `picker.getValue()`: Returns the name of the currently selected icon.
* `picker.setValue('icon_name')`: Updates the selected icon programmatically.
* `picker.setTheme('dark')`: Switches the UI theme on the fly (`'light'`, `'dark'`, or `'auto'`).
* `picker.destroy()`: Cleans up the DOM and restores the original input element.

---

## 📝 Localization (i18n)

You can customize the UI labels by passing a `strings` object during initialization:

```javascript
new MaterialSymbolsPicker(el, {
  strings: {
    placeholder: 'Select Icon...',
    searchPlaceholder: 'Search...',
    noResults: 'Nothing found',
    allCategories: 'All Categories',
    clear: 'Clear'
  }
});
