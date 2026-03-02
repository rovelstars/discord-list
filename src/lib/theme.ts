/**
 * theme.ts
 *
 * Central theme registry for the application.
 *
 * Architecture:
 *  - Each "accent theme" defines a set of CSS custom-property overrides for
 *    both a `light` variant and a `dark` variant.
 *  - The `mode` (light | dark | system) is stored separately and controls
 *    which variant of the accent theme is active as well as the `.dark` class
 *    on <html>.
 *  - The combined state is serialised as two cookies / localStorage keys:
 *      • `theme-mode`   → "light" | "dark" | "system"
 *      • `theme-accent` → one of the THEME_IDS
 *  - `hooks.server.ts` reads both cookies and sets:
 *      • the `.dark` class when mode resolves to dark
 *      • a `data-theme` attribute so CSS variable overrides take effect
 *    This means the correct colours are always present in the first HTML byte,
 *    eliminating any flash of unstyled / wrong-theme content.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";

/** A record of CSS variable name → value pairs (without the leading --). */
export type CSSVars = Record<string, string>;

export interface AccentTheme {
	id: string;
	/** Human-readable display name shown in the picker. */
	label: string;
	/** Swatch colour shown in the picker UI (a plain CSS colour string). */
	swatch: string;
	/** Token overrides applied when the resolved mode is "light". */
	light: CSSVars;
	/** Token overrides applied when the resolved mode is "dark". */
	dark: CSSVars;
}

// ─── Default / Base theme ────────────────────────────────────────────────────
// "default" is the original brand palette from global.css.
// Its light/dark values are empty because global.css already defines them on
// :root and .dark — no extra overrides needed.

const defaultTheme: AccentTheme = {
	id: "default",
	label: "Default",
	swatch: "hsl(235 86% 65%)",
	light: {},
	dark: {}
};

// ─── Dracula ─────────────────────────────────────────────────────────────────
// https://draculatheme.com/contribute
// Dracula is inherently a dark theme; the "light" variant uses a softened
// version with the same hues but high-key backgrounds.

const draculaTheme: AccentTheme = {
	id: "dracula",
	label: "Dracula",
	swatch: "hsl(265 89% 78%)",
	dark: {
		"color-background": "hsl(231 15% 18%)", // #282a36
		"color-foreground": "hsl(60 30% 96%)", // #f8f8f2
		"color-card": "hsl(232 14% 22%)", // #353746 – slightly lighter bg
		"color-card-foreground": "hsl(60 30% 96%)",
		"color-popover": "hsl(232 14% 22%)",
		"color-popover-foreground": "hsl(60 30% 96%)",
		"color-primary": "hsl(265 89% 78%)", // #bd93f9 – purple
		"color-primary-foreground": "hsl(231 15% 18%)",
		"color-secondary": "hsl(135 94% 65%)", // #50fa7b – green
		"color-secondary-foreground": "hsl(231 15% 18%)",
		"color-muted": "hsl(232 14% 31%)",
		"color-muted-foreground": "hsl(229 13% 66%)", // #6272a4 – comment
		"color-accent": "hsl(326 100% 74%)", // #ff79c6 – pink
		"color-accent-foreground": "hsl(231 15% 18%)",
		"color-destructive": "hsl(0 100% 67%)", // #ff5555 – red
		"color-destructive-foreground": "hsl(60 30% 96%)",
		"color-border": "hsl(232 14% 28%)",
		"color-input": "hsl(232 14% 28%)",
		"color-ring": "hsl(265 89% 78%)"
	},
	light: {
		"color-background": "hsl(231 15% 95%)",
		"color-foreground": "hsl(231 15% 18%)",
		"color-card": "hsl(231 15% 90%)",
		"color-card-foreground": "hsl(231 15% 18%)",
		"color-popover": "hsl(231 15% 92%)",
		"color-popover-foreground": "hsl(231 15% 18%)",
		"color-primary": "hsl(265 60% 55%)",
		"color-primary-foreground": "hsl(60 30% 96%)",
		"color-secondary": "hsl(135 60% 40%)",
		"color-secondary-foreground": "hsl(60 30% 96%)",
		"color-muted": "hsl(231 15% 80%)",
		"color-muted-foreground": "hsl(231 15% 40%)",
		"color-accent": "hsl(326 70% 55%)",
		"color-accent-foreground": "hsl(60 30% 96%)",
		"color-destructive": "hsl(0 80% 55%)",
		"color-destructive-foreground": "hsl(60 30% 96%)",
		"color-border": "hsl(231 15% 82%)",
		"color-input": "hsl(231 15% 82%)",
		"color-ring": "hsl(265 60% 55%)"
	}
};

// ─── Catppuccin Mocha (dark) / Latte (light) ─────────────────────────────────
// https://github.com/catppuccin/catppuccin
// Mocha palette for dark, Latte for light.

const catppuccinTheme: AccentTheme = {
	id: "catppuccin",
	label: "Catppuccin",
	swatch: "hsl(267 84% 81%)",
	dark: {
		// Mocha
		"color-background": "hsl(240 21% 15%)", // base  #1e1e2e
		"color-foreground": "hsl(226 64% 88%)", // text  #cdd6f4
		"color-card": "hsl(240 21% 12%)", // crust #11111b
		"color-card-foreground": "hsl(226 64% 88%)",
		"color-popover": "hsl(240 23% 17%)", // mantle #181825
		"color-popover-foreground": "hsl(226 64% 88%)",
		"color-primary": "hsl(267 84% 81%)", // mauve #cba6f7
		"color-primary-foreground": "hsl(240 21% 15%)",
		"color-secondary": "hsl(316 72% 86%)", // pink  #f38ba8 (red for contrast)
		"color-secondary-foreground": "hsl(240 21% 15%)",
		"color-muted": "hsl(240 15% 30%)",
		"color-muted-foreground": "hsl(228 11% 65%)", // overlay2 #9399b2
		"color-accent": "hsl(189 71% 73%)", // teal  #94e2d5
		"color-accent-foreground": "hsl(240 21% 15%)",
		"color-destructive": "hsl(343 81% 75%)", // red   #f38ba8
		"color-destructive-foreground": "hsl(240 21% 15%)",
		"color-border": "hsl(240 15% 25%)",
		"color-input": "hsl(240 15% 25%)",
		"color-ring": "hsl(267 84% 81%)"
	},
	light: {
		// Latte
		"color-background": "hsl(220 23% 95%)", // base  #eff1f5
		"color-foreground": "hsl(234 16% 35%)", // text  #4c4f69
		"color-card": "hsl(220 22% 92%)", // crust #dce0e8
		"color-card-foreground": "hsl(234 16% 35%)",
		"color-popover": "hsl(220 22% 97%)",
		"color-popover-foreground": "hsl(234 16% 35%)",
		"color-primary": "hsl(266 85% 58%)", // mauve (darker for light bg)
		"color-primary-foreground": "hsl(220 23% 97%)",
		"color-secondary": "hsl(189 60% 40%)", // teal
		"color-secondary-foreground": "hsl(220 23% 97%)",
		"color-muted": "hsl(220 22% 85%)",
		"color-muted-foreground": "hsl(234 10% 52%)",
		"color-accent": "hsl(189 60% 40%)",
		"color-accent-foreground": "hsl(220 23% 97%)",
		"color-destructive": "hsl(343 70% 52%)",
		"color-destructive-foreground": "hsl(220 23% 97%)",
		"color-border": "hsl(220 22% 85%)",
		"color-input": "hsl(220 22% 85%)",
		"color-ring": "hsl(266 85% 58%)"
	}
};

// ─── Nord ─────────────────────────────────────────────────────────────────────
// https://www.nordtheme.com/

const nordTheme: AccentTheme = {
	id: "nord",
	label: "Nord",
	swatch: "hsl(213 32% 52%)",
	dark: {
		"color-background": "hsl(220 16% 22%)", // nord0  #2e3440
		"color-foreground": "hsl(219 28% 88%)", // nord6  #eceff4
		"color-card": "hsl(220 16% 18%)", // slightly darker
		"color-card-foreground": "hsl(219 28% 88%)",
		"color-popover": "hsl(222 16% 28%)", // nord1  #3b4252
		"color-popover-foreground": "hsl(219 28% 88%)",
		"color-primary": "hsl(213 32% 52%)", // nord9  #81a1c1
		"color-primary-foreground": "hsl(220 16% 22%)",
		"color-secondary": "hsl(193 43% 67%)", // nord8  #88c0d0 frost
		"color-secondary-foreground": "hsl(220 16% 22%)",
		"color-muted": "hsl(220 16% 32%)",
		"color-muted-foreground": "hsl(219 14% 60%)", // nord4  #d8dee9 dimmed
		"color-accent": "hsl(92 28% 65%)", // nord14 #a3be8c green
		"color-accent-foreground": "hsl(220 16% 22%)",
		"color-destructive": "hsl(354 42% 56%)", // nord11 #bf616a red
		"color-destructive-foreground": "hsl(219 28% 88%)",
		"color-border": "hsl(220 16% 30%)",
		"color-input": "hsl(220 16% 30%)",
		"color-ring": "hsl(213 32% 52%)"
	},
	light: {
		"color-background": "hsl(219 28% 95%)",
		"color-foreground": "hsl(220 16% 22%)",
		"color-card": "hsl(219 28% 90%)",
		"color-card-foreground": "hsl(220 16% 22%)",
		"color-popover": "hsl(219 28% 97%)",
		"color-popover-foreground": "hsl(220 16% 22%)",
		"color-primary": "hsl(213 40% 42%)",
		"color-primary-foreground": "hsl(219 28% 95%)",
		"color-secondary": "hsl(193 43% 40%)",
		"color-secondary-foreground": "hsl(219 28% 95%)",
		"color-muted": "hsl(219 28% 83%)",
		"color-muted-foreground": "hsl(220 16% 40%)",
		"color-accent": "hsl(92 28% 40%)",
		"color-accent-foreground": "hsl(219 28% 95%)",
		"color-destructive": "hsl(354 42% 50%)",
		"color-destructive-foreground": "hsl(219 28% 95%)",
		"color-border": "hsl(219 28% 82%)",
		"color-input": "hsl(219 28% 82%)",
		"color-ring": "hsl(213 40% 42%)"
	}
};

// ─── Gruvbox ─────────────────────────────────────────────────────────────────
// https://github.com/morhetz/gruvbox

const gruvboxTheme: AccentTheme = {
	id: "gruvbox",
	label: "Gruvbox",
	swatch: "hsl(34 78% 51%)",
	dark: {
		"color-background": "hsl(28 14% 15%)", // bg  #282828
		"color-foreground": "hsl(46 43% 86%)", // fg  #ebdbb2
		"color-card": "hsl(28 14% 12%)",
		"color-card-foreground": "hsl(46 43% 86%)",
		"color-popover": "hsl(28 10% 20%)", // bg1 #3c3836
		"color-popover-foreground": "hsl(46 43% 86%)",
		"color-primary": "hsl(34 78% 51%)", // orange #fabd2f → yellow-ish
		"color-primary-foreground": "hsl(28 14% 15%)",
		"color-secondary": "hsl(142 40% 55%)", // green  #b8bb26 (aqua)
		"color-secondary-foreground": "hsl(28 14% 15%)",
		"color-muted": "hsl(28 10% 28%)",
		"color-muted-foreground": "hsl(40 17% 60%)", // gray  #a89984
		"color-accent": "hsl(180 38% 54%)", // aqua  #8ec07c
		"color-accent-foreground": "hsl(28 14% 15%)",
		"color-destructive": "hsl(0 60% 60%)", // red   #fb4934
		"color-destructive-foreground": "hsl(46 43% 86%)",
		"color-border": "hsl(28 10% 25%)",
		"color-input": "hsl(28 10% 25%)",
		"color-ring": "hsl(34 78% 51%)"
	},
	light: {
		"color-background": "hsl(43 59% 91%)", // bg   #fbf1c7
		"color-foreground": "hsl(0 0% 20%)", // fg0  #282828
		"color-card": "hsl(43 40% 84%)",
		"color-card-foreground": "hsl(0 0% 20%)",
		"color-popover": "hsl(43 50% 88%)",
		"color-popover-foreground": "hsl(0 0% 20%)",
		"color-primary": "hsl(34 78% 38%)",
		"color-primary-foreground": "hsl(43 59% 91%)",
		"color-secondary": "hsl(98 46% 38%)",
		"color-secondary-foreground": "hsl(43 59% 91%)",
		"color-muted": "hsl(43 30% 78%)",
		"color-muted-foreground": "hsl(0 0% 40%)",
		"color-accent": "hsl(180 30% 42%)",
		"color-accent-foreground": "hsl(43 59% 91%)",
		"color-destructive": "hsl(0 65% 50%)",
		"color-destructive-foreground": "hsl(43 59% 91%)",
		"color-border": "hsl(43 30% 75%)",
		"color-input": "hsl(43 30% 75%)",
		"color-ring": "hsl(34 78% 38%)"
	}
};

// ─── Tokyo Night ─────────────────────────────────────────────────────────────
// https://github.com/enkia/tokyo-night-vscode-theme

const tokyoNightTheme: AccentTheme = {
	id: "tokyo-night",
	label: "Tokyo Night",
	swatch: "hsl(229 70% 68%)",
	dark: {
		"color-background": "hsl(225 27% 15%)", // bg  #1a1b26
		"color-foreground": "hsl(219 14% 71%)", // fg  #a9b1d6
		"color-card": "hsl(225 27% 11%)",
		"color-card-foreground": "hsl(219 14% 71%)",
		"color-popover": "hsl(225 22% 19%)", // bg_highlight #292e42
		"color-popover-foreground": "hsl(219 14% 71%)",
		"color-primary": "hsl(229 70% 68%)", // blue  #7aa2f7
		"color-primary-foreground": "hsl(225 27% 15%)",
		"color-secondary": "hsl(267 59% 74%)", // purple #bb9af7
		"color-secondary-foreground": "hsl(225 27% 15%)",
		"color-muted": "hsl(225 22% 26%)",
		"color-muted-foreground": "hsl(229 14% 55%)",
		"color-accent": "hsl(174 51% 59%)", // teal   #73daca
		"color-accent-foreground": "hsl(225 27% 15%)",
		"color-destructive": "hsl(355 65% 65%)", // red    #f7768e
		"color-destructive-foreground": "hsl(219 14% 71%)",
		"color-border": "hsl(225 22% 22%)",
		"color-input": "hsl(225 22% 22%)",
		"color-ring": "hsl(229 70% 68%)"
	},
	light: {
		// Tokyo Night Storm Light — a softer variant
		"color-background": "hsl(224 20% 94%)",
		"color-foreground": "hsl(225 27% 20%)",
		"color-card": "hsl(224 20% 88%)",
		"color-card-foreground": "hsl(225 27% 20%)",
		"color-popover": "hsl(224 20% 96%)",
		"color-popover-foreground": "hsl(225 27% 20%)",
		"color-primary": "hsl(229 60% 50%)",
		"color-primary-foreground": "hsl(224 20% 96%)",
		"color-secondary": "hsl(267 50% 52%)",
		"color-secondary-foreground": "hsl(224 20% 96%)",
		"color-muted": "hsl(224 20% 80%)",
		"color-muted-foreground": "hsl(225 20% 45%)",
		"color-accent": "hsl(174 45% 40%)",
		"color-accent-foreground": "hsl(224 20% 96%)",
		"color-destructive": "hsl(355 60% 52%)",
		"color-destructive-foreground": "hsl(224 20% 96%)",
		"color-border": "hsl(224 20% 80%)",
		"color-input": "hsl(224 20% 80%)",
		"color-ring": "hsl(229 60% 50%)"
	}
};

// ─── Solarized ────────────────────────────────────────────────────────────────
// https://ethanschoonover.com/solarized/

const solarizedTheme: AccentTheme = {
	id: "solarized",
	label: "Solarized",
	swatch: "hsl(205 69% 49%)",
	dark: {
		"color-background": "hsl(192 100% 11%)", // base03 #002b36
		"color-foreground": "hsl(44 87% 82%)", // base2  #eee8d5
		"color-card": "hsl(192 81% 14%)", // base02 #073642
		"color-card-foreground": "hsl(44 87% 82%)",
		"color-popover": "hsl(192 81% 14%)",
		"color-popover-foreground": "hsl(44 87% 82%)",
		"color-primary": "hsl(205 69% 49%)", // blue   #268bd2
		"color-primary-foreground": "hsl(44 87% 82%)",
		"color-secondary": "hsl(175 59% 40%)", // cyan   #2aa198
		"color-secondary-foreground": "hsl(44 87% 82%)",
		"color-muted": "hsl(192 56% 18%)",
		"color-muted-foreground": "hsl(186 13% 49%)", // base01 #657b83
		"color-accent": "hsl(68 100% 30%)", // green  #859900
		"color-accent-foreground": "hsl(44 87% 82%)",
		"color-destructive": "hsl(1 71% 52%)", // red    #dc322f
		"color-destructive-foreground": "hsl(44 87% 82%)",
		"color-border": "hsl(192 81% 18%)",
		"color-input": "hsl(192 81% 18%)",
		"color-ring": "hsl(205 69% 49%)"
	},
	light: {
		"color-background": "hsl(44 87% 94%)", // base3  #fdf6e3
		"color-foreground": "hsl(192 100% 11%)",
		"color-card": "hsl(44 60% 88%)",
		"color-card-foreground": "hsl(192 100% 11%)",
		"color-popover": "hsl(44 87% 96%)",
		"color-popover-foreground": "hsl(192 100% 11%)",
		"color-primary": "hsl(205 69% 40%)",
		"color-primary-foreground": "hsl(44 87% 94%)",
		"color-secondary": "hsl(175 59% 33%)",
		"color-secondary-foreground": "hsl(44 87% 94%)",
		"color-muted": "hsl(44 60% 82%)",
		"color-muted-foreground": "hsl(186 13% 40%)",
		"color-accent": "hsl(68 100% 28%)",
		"color-accent-foreground": "hsl(44 87% 94%)",
		"color-destructive": "hsl(1 71% 46%)",
		"color-destructive-foreground": "hsl(44 87% 94%)",
		"color-border": "hsl(44 60% 80%)",
		"color-input": "hsl(44 60% 80%)",
		"color-ring": "hsl(205 69% 40%)"
	}
};

// ─── Rose Pine ────────────────────────────────────────────────────────────────
// https://rosepinetheme.com/

const rosePineTheme: AccentTheme = {
	id: "rose-pine",
	label: "Rose Pine",
	swatch: "hsl(316 48% 69%)",
	dark: {
		"color-background": "hsl(249 22% 12%)", // base    #191724
		"color-foreground": "hsl(245 50% 91%)", // text    #e0def4
		"color-card": "hsl(248 21% 9%)", // surface #1f1d2e (darker)
		"color-card-foreground": "hsl(245 50% 91%)",
		"color-popover": "hsl(248 21% 17%)", // surface #1f1d2e
		"color-popover-foreground": "hsl(245 50% 91%)",
		"color-primary": "hsl(316 48% 69%)", // iris/rose #c4a7e7 → rose
		"color-primary-foreground": "hsl(249 22% 12%)",
		"color-secondary": "hsl(197 35% 70%)", // foam    #9ccfd8
		"color-secondary-foreground": "hsl(249 22% 12%)",
		"color-muted": "hsl(248 21% 25%)",
		"color-muted-foreground": "hsl(246 17% 55%)", // subtle  #6e6a86
		"color-accent": "hsl(35 65% 76%)", // gold    #f6c177
		"color-accent-foreground": "hsl(249 22% 12%)",
		"color-destructive": "hsl(343 45% 68%)", // love    #eb6f92
		"color-destructive-foreground": "hsl(245 50% 91%)",
		"color-border": "hsl(248 21% 22%)",
		"color-input": "hsl(248 21% 22%)",
		"color-ring": "hsl(316 48% 69%)"
	},
	light: {
		// Rose Pine Dawn
		"color-background": "hsl(32 57% 95%)", // base    #faf4ed
		"color-foreground": "hsl(247 9% 35%)", // text    #575279
		"color-card": "hsl(32 40% 90%)",
		"color-card-foreground": "hsl(247 9% 35%)",
		"color-popover": "hsl(32 57% 97%)",
		"color-popover-foreground": "hsl(247 9% 35%)",
		"color-primary": "hsl(316 45% 52%)",
		"color-primary-foreground": "hsl(32 57% 95%)",
		"color-secondary": "hsl(197 35% 42%)",
		"color-secondary-foreground": "hsl(32 57% 95%)",
		"color-muted": "hsl(32 30% 83%)",
		"color-muted-foreground": "hsl(247 9% 52%)",
		"color-accent": "hsl(35 65% 55%)",
		"color-accent-foreground": "hsl(32 57% 95%)",
		"color-destructive": "hsl(343 45% 52%)",
		"color-destructive-foreground": "hsl(32 57% 95%)",
		"color-border": "hsl(32 30% 80%)",
		"color-input": "hsl(32 30% 80%)",
		"color-ring": "hsl(316 45% 52%)"
	}
};

// ─── One Dark ────────────────────────────────────────────────────────────────
// Atom One Dark, popularised by VS Code

const oneDarkTheme: AccentTheme = {
	id: "one-dark",
	label: "One Dark",
	swatch: "hsl(207 82% 66%)",
	dark: {
		"color-background": "hsl(220 13% 18%)", // #282c34
		"color-foreground": "hsl(220 14% 71%)", // #abb2bf
		"color-card": "hsl(220 13% 14%)",
		"color-card-foreground": "hsl(220 14% 71%)",
		"color-popover": "hsl(220 13% 22%)", // #2c313c
		"color-popover-foreground": "hsl(220 14% 71%)",
		"color-primary": "hsl(207 82% 66%)", // blue   #61afef
		"color-primary-foreground": "hsl(220 13% 18%)",
		"color-secondary": "hsl(160 84% 57%)", // green  #98c379
		"color-secondary-foreground": "hsl(220 13% 18%)",
		"color-muted": "hsl(220 13% 26%)",
		"color-muted-foreground": "hsl(220 10% 50%)",
		"color-accent": "hsl(286 60% 67%)", // purple #c678dd
		"color-accent-foreground": "hsl(220 13% 18%)",
		"color-destructive": "hsl(355 65% 65%)", // red    #e06c75
		"color-destructive-foreground": "hsl(220 14% 71%)",
		"color-border": "hsl(220 13% 24%)",
		"color-input": "hsl(220 13% 24%)",
		"color-ring": "hsl(207 82% 66%)"
	},
	light: {
		// One Light palette
		"color-background": "hsl(230 1% 98%)",
		"color-foreground": "hsl(230 8% 24%)",
		"color-card": "hsl(230 1% 92%)",
		"color-card-foreground": "hsl(230 8% 24%)",
		"color-popover": "hsl(230 1% 99%)",
		"color-popover-foreground": "hsl(230 8% 24%)",
		"color-primary": "hsl(207 82% 45%)",
		"color-primary-foreground": "hsl(230 1% 98%)",
		"color-secondary": "hsl(99 28% 42%)",
		"color-secondary-foreground": "hsl(230 1% 98%)",
		"color-muted": "hsl(230 1% 84%)",
		"color-muted-foreground": "hsl(230 5% 48%)",
		"color-accent": "hsl(286 50% 50%)",
		"color-accent-foreground": "hsl(230 1% 98%)",
		"color-destructive": "hsl(355 60% 52%)",
		"color-destructive-foreground": "hsl(230 1% 98%)",
		"color-border": "hsl(230 1% 82%)",
		"color-input": "hsl(230 1% 82%)",
		"color-ring": "hsl(207 82% 45%)"
	}
};

// ─── Everforest ──────────────────────────────────────────────────────────────
// https://github.com/sainnhe/everforest

const everforestTheme: AccentTheme = {
	id: "everforest",
	label: "Everforest",
	swatch: "hsl(142 40% 55%)",
	dark: {
		"color-background": "hsl(220 14% 20%)", // #2d353b
		"color-foreground": "hsl(40 25% 78%)", // #d3c6aa
		"color-card": "hsl(220 14% 16%)",
		"color-card-foreground": "hsl(40 25% 78%)",
		"color-popover": "hsl(220 12% 25%)", // #3d484d
		"color-popover-foreground": "hsl(40 25% 78%)",
		"color-primary": "hsl(142 40% 55%)", // green  #a7c080
		"color-primary-foreground": "hsl(220 14% 20%)",
		"color-secondary": "hsl(175 30% 55%)", // aqua   #83c092
		"color-secondary-foreground": "hsl(220 14% 20%)",
		"color-muted": "hsl(220 12% 30%)",
		"color-muted-foreground": "hsl(40 12% 55%)", // grey1  #859289
		"color-accent": "hsl(39 65% 65%)", // yellow #dbbc7f
		"color-accent-foreground": "hsl(220 14% 20%)",
		"color-destructive": "hsl(0 45% 60%)", // red    #e67e80
		"color-destructive-foreground": "hsl(40 25% 78%)",
		"color-border": "hsl(220 12% 27%)",
		"color-input": "hsl(220 12% 27%)",
		"color-ring": "hsl(142 40% 55%)"
	},
	light: {
		"color-background": "hsl(30 30% 92%)", // #f2efdf
		"color-foreground": "hsl(220 14% 26%)",
		"color-card": "hsl(30 25% 85%)",
		"color-card-foreground": "hsl(220 14% 26%)",
		"color-popover": "hsl(30 30% 94%)",
		"color-popover-foreground": "hsl(220 14% 26%)",
		"color-primary": "hsl(142 35% 42%)",
		"color-primary-foreground": "hsl(30 30% 92%)",
		"color-secondary": "hsl(175 30% 40%)",
		"color-secondary-foreground": "hsl(30 30% 92%)",
		"color-muted": "hsl(30 20% 80%)",
		"color-muted-foreground": "hsl(220 8% 48%)",
		"color-accent": "hsl(39 60% 48%)",
		"color-accent-foreground": "hsl(30 30% 92%)",
		"color-destructive": "hsl(0 50% 50%)",
		"color-destructive-foreground": "hsl(30 30% 92%)",
		"color-border": "hsl(30 20% 78%)",
		"color-input": "hsl(30 20% 78%)",
		"color-ring": "hsl(142 35% 42%)"
	}
};

// ─── AMOLED Black ─────────────────────────────────────────────────────────────
// Pure black backgrounds for OLED displays. Dark variant uses true #000000
// backgrounds; light variant is a clean high-contrast white mode.

const amoledTheme: AccentTheme = {
	id: "amoled",
	label: "AMOLED",
	swatch: "#4D9FFF",
	dark: {
		"color-background": "hsl(0 0% 0%)", // #000000 — true black
		"color-foreground": "hsl(0 0% 95%)",
		"color-card": "hsl(0 0% 4%)", // near-black card
		"color-card-foreground": "hsl(0 0% 95%)",
		"color-popover": "hsl(0 0% 7%)",
		"color-popover-foreground": "hsl(0 0% 95%)",
		"color-primary": "hsl(210 100% 65%)", // #4D9FFF electric blue
		"color-primary-foreground": "hsl(0 0% 0%)",
		"color-secondary": "hsl(210 100% 80%)",
		"color-secondary-foreground": "hsl(0 0% 0%)",
		"color-muted": "hsl(0 0% 12%)",
		"color-muted-foreground": "hsl(0 0% 55%)",
		"color-accent": "hsl(0 0% 14%)",
		"color-accent-foreground": "hsl(0 0% 95%)",
		"color-destructive": "hsl(0 90% 60%)",
		"color-destructive-foreground": "hsl(0 0% 0%)",
		"color-border": "hsl(0 0% 10%)",
		"color-input": "hsl(0 0% 10%)",
		"color-ring": "hsl(210 100% 65%)"
	},
	light: {
		"color-background": "hsl(0 0% 100%)",
		"color-foreground": "hsl(0 0% 4%)",
		"color-card": "hsl(0 0% 94%)",
		"color-card-foreground": "hsl(0 0% 4%)",
		"color-popover": "hsl(0 0% 100%)",
		"color-popover-foreground": "hsl(0 0% 4%)",
		"color-primary": "hsl(0 0% 4%)",
		"color-primary-foreground": "hsl(0 0% 100%)",
		"color-secondary": "hsl(0 0% 30%)",
		"color-secondary-foreground": "hsl(0 0% 100%)",
		"color-muted": "hsl(0 0% 86%)",
		"color-muted-foreground": "hsl(0 0% 42%)",
		"color-accent": "hsl(0 0% 90%)",
		"color-accent-foreground": "hsl(0 0% 4%)",
		"color-destructive": "hsl(0 80% 50%)",
		"color-destructive-foreground": "hsl(0 0% 100%)",
		"color-border": "hsl(0 0% 85%)",
		"color-input": "hsl(0 0% 85%)",
		"color-ring": "hsl(210 100% 65%)"
	}
};

// ─── Hyper Ocean ──────────────────────────────────────────────────────────────
// Based on the Hyper Ocean terminal theme.
// Source palette (hex → HSL conversions):
//   backgroundColor  #0F111A  → hsl(231 28% 8%)
//   foregroundColor  #8F93A2  → hsl(228 10% 60%)
//   darkBlue         #0B0D14  → hsl(231 30% 6%)
//   lightBlue        #131622  → hsl(231 27% 10%)
//   blue             #3A75C4  → hsl(213 55% 49%)
//   cyan             #87D3F8  → hsl(199 89% 75%)
//   magenta          #703FAF  → hsl(276 47% 46%)
//   green            #14B37D  → hsl(158 79% 39%)
//   red/orange       #E25822  → hsl(18 74% 51%)
//   yellow           #F2F27A  → hsl(60 83% 71%)
//   white            #F3EFE0  → hsl(44 57% 92%)

const hyperOceanTheme: AccentTheme = {
	id: "hyper-ocean",
	label: "Hyper Ocean",
	swatch: "#3A75C4",
	dark: {
		"color-background": "hsl(231 28% 8%)", // #0F111A
		"color-foreground": "hsl(228 10% 60%)", // #8F93A2
		"color-card": "hsl(231 30% 6%)", // #0B0D14 darkBlue
		"color-card-foreground": "hsl(228 10% 60%)",
		"color-popover": "hsl(231 27% 10%)", // #131622 lightBlue
		"color-popover-foreground": "hsl(228 10% 60%)",
		"color-primary": "hsl(213 55% 49%)", // #3A75C4 blue
		"color-primary-foreground": "hsl(44 57% 92%)", // #F3EFE0 white
		"color-secondary": "hsl(199 89% 75%)", // #87D3F8 cyan
		"color-secondary-foreground": "hsl(231 28% 8%)",
		"color-muted": "hsl(231 27% 13%)",
		"color-muted-foreground": "hsl(228 10% 42%)",
		"color-accent": "hsl(276 47% 46%)", // #703FAF magenta
		"color-accent-foreground": "hsl(44 57% 92%)",
		"color-destructive": "hsl(18 74% 51%)", // #E25822 red/orange
		"color-destructive-foreground": "hsl(44 57% 92%)",
		"color-border": "hsl(231 30% 6%)", // darkBlue as border
		"color-input": "hsl(231 27% 13%)",
		"color-ring": "hsl(213 55% 49%)"
	},
	light: {
		// A lighter "ocean dawn" — desaturated sky palette derived from the same hues
		"color-background": "hsl(213 40% 96%)",
		"color-foreground": "hsl(231 28% 18%)",
		"color-card": "hsl(213 30% 90%)",
		"color-card-foreground": "hsl(231 28% 18%)",
		"color-popover": "hsl(213 40% 98%)",
		"color-popover-foreground": "hsl(231 28% 18%)",
		"color-primary": "hsl(213 55% 40%)",
		"color-primary-foreground": "hsl(213 40% 96%)",
		"color-secondary": "hsl(199 70% 38%)",
		"color-secondary-foreground": "hsl(213 40% 96%)",
		"color-muted": "hsl(213 25% 82%)",
		"color-muted-foreground": "hsl(231 15% 45%)",
		"color-accent": "hsl(276 47% 42%)",
		"color-accent-foreground": "hsl(213 40% 96%)",
		"color-destructive": "hsl(18 74% 45%)",
		"color-destructive-foreground": "hsl(213 40% 96%)",
		"color-border": "hsl(213 25% 82%)",
		"color-input": "hsl(213 25% 82%)",
		"color-ring": "hsl(213 55% 40%)"
	}
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const THEMES: AccentTheme[] = [
	defaultTheme,
	draculaTheme,
	catppuccinTheme,
	nordTheme,
	gruvboxTheme,
	tokyoNightTheme,
	solarizedTheme,
	rosePineTheme,
	oneDarkTheme,
	everforestTheme,
	amoledTheme,
	hyperOceanTheme
];

export const THEME_IDS = THEMES.map((t) => t.id);

export type ThemeId = (typeof THEME_IDS)[number];

/** Look up a theme by id, falling back to the default. */
export function getTheme(id: string): AccentTheme {
	return THEMES.find((t) => t.id === id) ?? defaultTheme;
}

// ─── CSS generation ──────────────────────────────────────────────────────────

/**
 * Serialise a CSSVars record into the inside of a CSS rule body.
 * e.g. { "color-background": "hsl(0 0% 100%)" }
 *   → "  --color-background: hsl(0 0% 100%);\n"
 */
export function varsToCSS(vars: CSSVars): string {
	return Object.entries(vars)
		.map(([k, v]) => `  --${k}: ${v};`)
		.join("\n");
}

/**
 * Build the complete <style> block that should be injected into <head> for a
 * given accent theme.  The selectors mirror the strategy used in global.css:
 *
 *   [data-theme="dracula"]           → light overrides (default mode)
 *   [data-theme="dracula"].dark      → dark overrides
 *   [data-theme="dracula"] .dark *   → propagate to dark children (belt+braces)
 *
 * For the "default" theme we emit nothing because global.css already handles
 * it via :root and .dark.
 */
export function buildThemeCSS(theme: AccentTheme): string {
	if (theme.id === "default") return "";

	const lightVars = varsToCSS(theme.light);
	const darkVars = varsToCSS(theme.dark);

	const parts: string[] = [];

	if (lightVars) {
		parts.push(`[data-theme="${theme.id}"] {\n${lightVars}\n}`);
	}

	if (darkVars) {
		parts.push(`[data-theme="${theme.id}"].dark {\n${darkVars}\n}`);
		// Also target the case where .dark is on a wrapper rather than <html>
		parts.push(
			`:is([data-theme="${theme.id}"]).dark,\n[data-theme="${theme.id}"] :where(.dark) {\n${darkVars}\n}`
		);
	}

	return parts.join("\n\n");
}

// ─── Serialisation helpers ───────────────────────────────────────────────────

/** Validate and return a ThemeMode, falling back to "system". */
export function parseMode(raw: string | undefined | null): ThemeMode {
	if (raw === "light" || raw === "dark" || raw === "system") return raw;
	return "system";
}

/** Validate and return a ThemeId, falling back to "default". */
export function parseAccent(raw: string | undefined | null): ThemeId {
	if (raw && THEME_IDS.includes(raw)) return raw as ThemeId;
	return "default";
}

/**
 * Resolve the actual light/dark polarity from a stored mode preference and
 * an optional `prefers-color-scheme` hint (passed from the client via a
 * cookie or a request header — absent on cold SSR).
 *
 * On the server, when mode is "system" and we have no hint, we default to
 * "light" to avoid a jarring dark flash on users whose system is actually
 * light.  The inline script in app.html corrects this immediately on the
 * client before any paint.
 */
export function resolveMode(
	mode: ThemeMode,
	systemPrefersDark: boolean | null = null
): "light" | "dark" {
	if (mode === "light") return "light";
	if (mode === "dark") return "dark";
	// system
	return systemPrefersDark === true ? "dark" : "light";
}
