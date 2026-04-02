[![](https://data.jsdelivr.com/v1/package/gh/Axsag/material-icons-picker/badge)](https://www.jsdelivr.com/package/gh/Axsag/material-icons-picker) 
# Material Symbols Picker

A lightweight, **zero-dependency** JavaScript icon picker designed for the [Material Symbols](https://fonts.google.com/icons) variable font.

This picker provides access to over 2,000+ icons with full-text search, category filtering, and support for variable font axes (Fill, Weight, Grade, Optical Size).

**[🌐 Live Demo & Documentation](https://axsag.github.io/material-icons-picker/)**

---

## ✨ Features

* 📦 **Zero Dependencies**: Pure Vanilla JS. No jQuery, no extra bloat.
* 🎨 **Variable Font Support**: Toggle between **Outlined**, **Rounded**, and **Sharp** variants natively. Restrict to a subset with the `variants` option — only the fonts you actually need are fetched.
* 🙈 **Broken Icon Filtering**: Icons present in metadata but missing from the font file are automatically detected and hidden.
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
    variant:  'rounded',               // 'outlined' | 'rounded' | 'sharp'
    variants: ['outlined', 'rounded'], // which variants to offer in the UI
    theme:    'auto',                  // 'light' | 'dark' | 'auto'
    fill:     0,                       // 0 or 1
    onChange: (name) => {
        console.log('Selected Icon:', name);
    }
});
```

## ⚙️ Options

| Option       | Type       | Default                          | Description                                                                                                                  |
|:-------------|:-----------|:---------------------------------|:-----------------------------------------------------------------------------------------------------------------------------|
| `variant`    | `string`   | `'outlined'`                     | The active Material Symbols style: `'outlined'`, `'rounded'`, or `'sharp'`.                                                  |
| `variants`   | `string[]` | `['outlined','rounded','sharp']` | Which variants to offer in the picker UI. When only one is given the variant pills are hidden and only that font is fetched. |
| `fill`       | `number`   | `0`                              | Fill axis (0 for stroke, 1 for solid).                                                                                       |
| `fills`      | `number[]` | `[0,1]`                          | Which fills to offer in the picker UI. When only one is given the fill pills are hidden.       |
| `weight`     | `number`   | `400`                            | Font weight (100 through 700).                                                                                               |
| `grade`      | `number`   | `0`                              | Weight fine-tuning (-25, 0, 200).                                                                                            |
| `size`       | `number`   | `24`                             | Icon size in pixels for the trigger preview.                                                                                 |
| `theme`      | `string`   | `'auto'`                         | Color mode: `'light'`, `'dark'`, or `'auto'`.                                                                                |
| `fetchIcons` | `boolean`  | `true`                           | Fetch the full metadata from Google (false uses a small fallback list).                                                      |
| `icons`      | `string[]` | `null`                           | Provide a custom icon list directly, skipping the fetch entirely.                                                            |
| `onChange`   | `function` | `null`                           | Callback function: `(name) => { ... }`.                                                                                      |

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
```

---

## 🎨 Variant control

By default the picker offers all three variants via toggle pills. You can narrow this down:

```javascript
// Lock to a single variant — pills disappear, only Rounded Fill is fetched
new MaterialSymbolsPicker(el, {
  variant:  'rounded',
  variants: ['rounded'],
  fill: 1,
  fills: [1]  
});

// Offer two variants — only those two fonts are fetched
new MaterialSymbolsPicker(el, {
  variants: ['outlined', 'sharp'],
});
```

When `variants` contains only one entry the variant pill row is hidden entirely and only that font family is requested from Google Fonts, saving one unnecessary network request.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/W7W41B9W0J)
