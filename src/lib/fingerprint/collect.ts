/**
 * src/lib/fingerprint/collect.ts
 *
 * Client-side browser fingerprint collection for Rovel Stars anti-fraud system.
 *
 * Produces a stable, opaque hash string that identifies a browser/device
 * combination without storing any personally-identifiable information.
 * The hash is computed entirely in the browser and only the final hex digest
 * is ever sent to the server — raw signal values never leave the client.
 *
 * Signal sources (in order of stability):
 *   1. Canvas 2D rendering  — GPU/driver differences produce subtly different
 *      pixel output across hardware+OS+driver combinations.
 *   2. WebGL renderer info  — GPU vendor & renderer strings from the graphics
 *      driver; very stable across browser restarts.
 *   3. Audio context        — The AudioContext's sample-rate and the output of
 *      an OscillatorNode → DynamicsCompressor pipeline vary across OS audio
 *      stacks and hardware.
 *   4. Screen geometry      — colorDepth, pixelRatio, screen dimensions.
 *   5. Hardware concurrency — logical CPU core count.
 *   6. Navigator strings    — platform, language list, UA brands (via hints API
 *      where available, falling back to userAgent).
 *   7. Timezone             — IANA timezone identifier.
 *   8. Installed fonts      — A small fixed probe list measured via canvas text
 *      width; which fonts are present differs between OS/user profiles.
 *   9. Touch support        — maxTouchPoints, presence of ontouchstart.
 *  10. Media devices        — Hashed count of audio/video input/output devices
 *      (labels omitted so no permission is required).
 *
 * Stability vs. uniqueness trade-off:
 *   All signals are chosen to be stable across normal browser restarts and
 *   minor browser updates while still being distinct enough to separate
 *   different physical machines.  Signals that change frequently (e.g. battery
 *   level, installed extensions, precise viewport size) are intentionally
 *   excluded to avoid false "new device" detections.
 *
 * Privacy note:
 *   No raw PII is collected.  Canvas and audio results are hashed immediately.
 *   Font probing uses only rendering dimensions, not actual font name strings
 *   in the final hash payload.  The final output is a single SHA-256 hex string.
 *
 * Usage:
 *   import { collectFingerprint } from '$lib/fingerprint/collect';
 *   const fp = await collectFingerprint();
 *   // fp === "a3f9c2…" (64-char hex string) or null on hard failure
 *
 * Browser compatibility:
 *   Requires SubtleCrypto (available in all modern browsers over HTTPS).
 *   Individual signal collectors degrade gracefully — a failed signal
 *   contributes an empty string rather than throwing.
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Collect all available browser signals, hash them with SHA-256, and return
 * the result as a lowercase hex string.
 *
 * Returns null only if SubtleCrypto is unavailable (non-HTTPS context or very
 * old browser).  Individual signal failures are silently treated as empty
 * strings so the overall fingerprint degrades gracefully rather than failing.
 */
export async function collectFingerprint(): Promise<string | null> {
	if (typeof window === "undefined") {
		// Server-side render context — fingerprinting is a client-only operation.
		return null;
	}

	if (!window.crypto?.subtle) {
		// SubtleCrypto unavailable (HTTP context or very old browser).
		console.warn("[fingerprint] SubtleCrypto unavailable — cannot compute fingerprint.");
		return null;
	}

	// Collect all signals in parallel where possible; each collector is
	// individually guarded so a single failure doesn't abort the whole run.
	const [
		canvasHash,
		webglInfo,
		audioHash,
		screenInfo,
		hardwareInfo,
		navigatorInfo,
		timezoneInfo,
		fontInfo,
		touchInfo,
		mediaInfo
	] = await Promise.all([
		safeCollect(collectCanvas),
		safeCollect(collectWebGL),
		safeCollect(collectAudio),
		safeCollect(collectScreen),
		safeCollect(collectHardware),
		safeCollect(collectNavigator),
		safeCollect(collectTimezone),
		safeCollect(collectFonts),
		safeCollect(collectTouch),
		safeCollect(collectMediaDevices)
	]);

	// Join all signals into a single string, then SHA-256 hash the whole thing.
	// Using a separator that cannot appear in any individual signal value avoids
	// trivial collisions between adjacent fields.
	const combined = [
		canvasHash,
		webglInfo,
		audioHash,
		screenInfo,
		hardwareInfo,
		navigatorInfo,
		timezoneInfo,
		fontInfo,
		touchInfo,
		mediaInfo
	].join("|FPSEP|");

	return sha256Hex(combined);
}

// ---------------------------------------------------------------------------
// Internal: graceful wrapper
// ---------------------------------------------------------------------------

/**
 * Run `fn` and return its string result, or an empty string if it throws.
 * Ensures that a broken signal collector never aborts the overall fingerprint.
 */
async function safeCollect(fn: () => string | Promise<string>): Promise<string> {
	try {
		return await fn();
	} catch {
		return "";
	}
}

// ---------------------------------------------------------------------------
// Signal: Canvas 2D
// ---------------------------------------------------------------------------

/**
 * Render a fixed sequence of drawing operations onto an OffscreenCanvas (or a
 * regular HTMLCanvasElement as fallback) and return the base64 data URL of the
 * result.
 *
 * Different GPU drivers / OS rendering paths produce subtly different pixel
 * values for text anti-aliasing, gradient interpolation, and arc rasterisation,
 * making this one of the most discriminating fingerprint signals.
 */
function collectCanvas(): string {
	const SIZE = 240;
	let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
	let canvas: HTMLCanvasElement | OffscreenCanvas;

	if (typeof OffscreenCanvas !== "undefined") {
		canvas = new OffscreenCanvas(SIZE, 80);
		ctx = (canvas as OffscreenCanvas).getContext("2d") as OffscreenCanvasRenderingContext2D;
	} else {
		canvas = document.createElement("canvas");
		(canvas as HTMLCanvasElement).width = SIZE;
		(canvas as HTMLCanvasElement).height = 80;
		ctx = (canvas as HTMLCanvasElement).getContext("2d");
	}

	if (!ctx) return "";

	// Background
	ctx.fillStyle = "#f0f0f0";
	ctx.fillRect(0, 0, SIZE, 80);

	// Gradient rectangle
	const grad = ctx.createLinearGradient(0, 0, SIZE, 0);
	grad.addColorStop(0, "#e74c3c");
	grad.addColorStop(0.5, "#3498db");
	grad.addColorStop(1, "#2ecc71");
	ctx.fillStyle = grad;
	ctx.fillRect(10, 10, SIZE - 20, 25);

	// Text with emoji — emoji rendering differs widely between platforms
	ctx.font = "16px Arial, sans-serif";
	ctx.fillStyle = "#1a1a2e";
	ctx.fillText("Rovel Stars 🌟 fp", 12, 60);

	// Arcs
	ctx.beginPath();
	ctx.arc(SIZE - 30, 40, 18, 0, Math.PI * 2);
	ctx.strokeStyle = "#9b59b6";
	ctx.lineWidth = 3;
	ctx.stroke();

	// Shadow text (shadow rendering varies by OS)
	ctx.shadowColor = "rgba(0,0,0,0.4)";
	ctx.shadowBlur = 4;
	ctx.fillStyle = "#e67e22";
	ctx.font = "bold 14px Georgia, serif";
	ctx.fillText("0123456789", 12, 78);
	ctx.shadowBlur = 0;

	// Extract pixel data rather than a data URL to avoid format-version drift
	const imageData = ctx.getImageData(0, 0, SIZE, 80);
	// Sample every 4th pixel (RGBA) for a compact but representative digest
	const sample: number[] = [];
	for (let i = 0; i < imageData.data.length; i += 16) {
		sample.push(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
	}
	return sample.join(",");
}

// ---------------------------------------------------------------------------
// Signal: WebGL renderer info
// ---------------------------------------------------------------------------

/**
 * Query the WebGL renderer and vendor strings exposed by the GPU driver.
 * On most systems these look like "NVIDIA GeForce RTX 3080/PCIe/SSE2" and
 * "NVIDIA Corporation" — stable across browser restarts, unique per GPU.
 *
 * Falls back to WebGL2 → WebGL1 → empty string.
 */
function collectWebGL(): string {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;

	const gl =
		(canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
		(canvas.getContext("webgl") as WebGLRenderingContext | null) ??
		(canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

	if (!gl) return "";

	const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

	const vendor = debugInfo
		? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
		: gl.getParameter(gl.VENDOR);
	const renderer = debugInfo
		? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
		: gl.getParameter(gl.RENDERER);

	const version = gl.getParameter(gl.VERSION);
	const glslVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
	const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
	const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

	// Clean up the canvas context to free GPU memory
	const ext = gl.getExtension("WEBGL_lose_context");
	ext?.loseContext();

	return [vendor, renderer, version, glslVersion, maxTextureSize, maxViewport].join(";");
}

// ---------------------------------------------------------------------------
// Signal: Audio context
// ---------------------------------------------------------------------------

/**
 * Process a short synthetic audio signal through an OscillatorNode →
 * DynamicsCompressorNode pipeline and capture the output sample values.
 *
 * The audio stack (OS mixer, sample-rate conversion, floating-point math
 * implementation) produces slightly different output values on different
 * OS + hardware combinations, giving this signal good discriminating power.
 *
 * The AudioContext is closed immediately after sampling to release resources.
 */
async function collectAudio(): Promise<string> {
	// OfflineAudioContext processes audio faster than real-time and never plays
	// through speakers — ideal for fingerprinting.
	const AudioCtx =
		window.OfflineAudioContext ??
		(window as any).webkitOfflineAudioContext;

	if (!AudioCtx) return "";

	const SAMPLE_RATE = 44100;
	const DURATION_SAMPLES = 4096;

	const ctx = new AudioCtx(1, DURATION_SAMPLES, SAMPLE_RATE) as OfflineAudioContext;

	// Oscillator: triangle wave at 440 Hz
	const oscillator = ctx.createOscillator();
	oscillator.type = "triangle";
	oscillator.frequency.setValueAtTime(440, ctx.currentTime);

	// Compressor: settings chosen to maximise cross-platform divergence
	const compressor = ctx.createDynamicsCompressor();
	compressor.threshold.setValueAtTime(-50, ctx.currentTime);
	compressor.knee.setValueAtTime(40, ctx.currentTime);
	compressor.ratio.setValueAtTime(12, ctx.currentTime);
	compressor.attack.setValueAtTime(0, ctx.currentTime);
	compressor.release.setValueAtTime(0.25, ctx.currentTime);

	oscillator.connect(compressor);
	compressor.connect(ctx.destination);
	oscillator.start(0);

	const buffer = await ctx.startRendering();
	const data = buffer.getChannelData(0);

	// Hash a sample of output values — full array is 4096 floats; we take
	// every 8th to keep the string manageable while retaining uniqueness.
	const samples: string[] = [];
	for (let i = 0; i < data.length; i += 8) {
		// Truncate to 6 decimal places to avoid float-serialisation noise
		samples.push(data[i].toFixed(6));
	}

	// Also include the sample rate (may vary between platforms)
	samples.unshift(String(ctx.sampleRate));

	return samples.join(",");
}

// ---------------------------------------------------------------------------
// Signal: Screen geometry
// ---------------------------------------------------------------------------

/**
 * Collect stable screen metrics.
 * window.innerWidth/innerHeight are intentionally excluded — they change on
 * resize and vary between browser window states.
 */
function collectScreen(): string {
	const s = window.screen;
	return [
		s.width,
		s.height,
		s.availWidth,
		s.availHeight,
		s.colorDepth,
		s.pixelDepth,
		window.devicePixelRatio ?? 1
	].join("x");
}

// ---------------------------------------------------------------------------
// Signal: Hardware concurrency
// ---------------------------------------------------------------------------

function collectHardware(): string {
	return [
		navigator.hardwareConcurrency ?? 0,
		(navigator as any).deviceMemory ?? 0
	].join(";");
}

// ---------------------------------------------------------------------------
// Signal: Navigator / platform
// ---------------------------------------------------------------------------

/**
 * Collect navigator strings that are stable but differ across OS/browser.
 * Uses the newer User-Agent Client Hints API where available, falling back
 * to the legacy userAgent string.
 */
async function collectNavigator(): Promise<string> {
	const parts: string[] = [];

	// Platform (deprecated but still widely supported and very stable)
	parts.push(navigator.platform ?? "");

	// Language list — first two entries are usually most stable
	parts.push((navigator.languages ?? [navigator.language]).slice(0, 3).join(","));

	// Cookie / service worker / storage availability
	parts.push(navigator.cookieEnabled ? "cookie1" : "cookie0");
	parts.push("serviceWorker" in navigator ? "sw1" : "sw0");
	parts.push("storage" in navigator ? "storage1" : "storage0");

	// UA Client Hints (Chrome 90+, Edge 90+) — more stable than UA string
	const uaData = (navigator as any).userAgentData;
	if (uaData) {
		try {
			const hints = await uaData.getHighEntropyValues([
				"architecture",
				"bitness",
				"model",
				"platform",
				"platformVersion"
			]);
			parts.push(hints.architecture ?? "");
			parts.push(hints.bitness ?? "");
			parts.push(hints.platform ?? "");
			parts.push(hints.platformVersion ?? "");
			// Brand list (excludes version to avoid churn on minor browser updates)
			const brands: string = (hints.brands ?? uaData.brands ?? [])
				.map((b: { brand: string }) => b.brand)
				.filter((b: string) => !b.includes("Not"))
				.join(",");
			parts.push(brands);
		} catch {
			parts.push(uaData.platform ?? "");
		}
	} else {
		// Fallback: include only the non-version part of the UA string to
		// reduce churn from minor browser updates.
		// Strip version numbers (e.g. "Chrome/120.0.0.0" → "Chrome")
		const ua = (navigator.userAgent ?? "").replace(/\/[\d.]+/g, "");
		parts.push(ua.slice(0, 120)); // cap length
	}

	return parts.join(";");
}

// ---------------------------------------------------------------------------
// Signal: Timezone
// ---------------------------------------------------------------------------

function collectTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
	} catch {
		return String(new Date().getTimezoneOffset());
	}
}

// ---------------------------------------------------------------------------
// Signal: Font probing via canvas
// ---------------------------------------------------------------------------

/**
 * Probe a fixed list of fonts by measuring the rendered width of a test
 * string using each font with a monospace fallback.  If the measurement
 * differs from the fallback baseline, the font is considered "installed".
 *
 * The resulting bitmask (which fonts are present) is encoded as a hex string.
 *
 * No font name strings appear in the final fingerprint — only the presence/
 * absence bitmask — so this probe leaks no information beyond what fonts
 * are installed.
 */
function collectFonts(): string {
	// A representative cross-platform probe list.
	// Each font is widely installed on exactly one or two major OS families,
	// giving good discriminating power between Windows / macOS / Linux.
	const PROBE_FONTS = [
		"Arial",
		"Helvetica Neue",
		"Times New Roman",
		"Courier New",
		"Georgia",
		"Verdana",
		"Trebuchet MS",
		"Impact",
		"Comic Sans MS",
		"Palatino Linotype",
		"Lucida Console",
		"Tahoma",
		"Calibri",
		"Cambria",
		"Segoe UI",       // Windows
		"San Francisco",  // macOS (renders as SF Pro)
		"Helvetica",      // macOS
		"Ubuntu",         // Ubuntu Linux
		"Cantarell",      // GNOME Linux
		"Roboto",         // Android / ChromeOS
		"Noto Sans",      // Google fonts (often pre-installed on Linux)
		"Malgun Gothic",  // Windows Korean
		"Yu Gothic",      // Windows Japanese
		"Hiragino Sans"   // macOS Japanese
	];

	const TEST_STRING = "mmmmmmmmmmlli";
	const BASELINE_FONT = "monospace";
	const FALLBACK_FONT = "serif";
	const SIZE = "72px";

	const canvas = document.createElement("canvas");
	canvas.width = 400;
	canvas.height = 100;
	const ctx = canvas.getContext("2d");
	if (!ctx) return "";

	// Measure baseline widths using fonts that are always available
	ctx.font = `${SIZE} ${BASELINE_FONT}`;
	const baselineMonospace = ctx.measureText(TEST_STRING).width;

	ctx.font = `${SIZE} ${FALLBACK_FONT}`;
	const baselineSerif = ctx.measureText(TEST_STRING).width;

	let bitmask = 0n; // BigInt to support up to 64 probe fonts
	for (let i = 0; i < PROBE_FONTS.length; i++) {
		const font = PROBE_FONTS[i];
		// Measure with the probe font + both fallbacks
		ctx.font = `${SIZE} '${font}',${BASELINE_FONT}`;
		const w1 = ctx.measureText(TEST_STRING).width;
		ctx.font = `${SIZE} '${font}',${FALLBACK_FONT}`;
		const w2 = ctx.measureText(TEST_STRING).width;

		// If either measurement differs from the baseline, the font is installed
		if (w1 !== baselineMonospace || w2 !== baselineSerif) {
			bitmask |= 1n << BigInt(i);
		}
	}

	return bitmask.toString(16);
}

// ---------------------------------------------------------------------------
// Signal: Touch support
// ---------------------------------------------------------------------------

function collectTouch(): string {
	const maxTouch = navigator.maxTouchPoints ?? 0;
	const hasTouchStart = "ontouchstart" in window ? 1 : 0;
	const hasPointer = "PointerEvent" in window ? 1 : 0;
	return `${maxTouch};${hasTouchStart};${hasPointer}`;
}

// ---------------------------------------------------------------------------
// Signal: Media devices (count only — no labels, no permission required)
// ---------------------------------------------------------------------------

/**
 * Enumerate media device kinds and count each type.
 * Device labels are intentionally excluded (require permission and change
 * based on whether permission has been granted).
 * The count of audio/video inputs and outputs is stable and differs between
 * laptops (one built-in mic, one speaker) and desktops (external peripherals).
 */
async function collectMediaDevices(): Promise<string> {
	if (!navigator.mediaDevices?.enumerateDevices) return "";

	const devices = await navigator.mediaDevices.enumerateDevices();
	let audioIn = 0;
	let audioOut = 0;
	let videoIn = 0;

	for (const d of devices) {
		if (d.kind === "audioinput") audioIn++;
		else if (d.kind === "audiooutput") audioOut++;
		else if (d.kind === "videoinput") videoIn++;
	}

	return `ai${audioIn};ao${audioOut};vi${videoIn}`;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 of a UTF-8 string and return the result as a lowercase
 * hexadecimal string (64 characters).
 *
 * Uses the Web Crypto API (SubtleCrypto), which is available in all modern
 * browsers when served over HTTPS (or localhost).
 */
async function sha256Hex(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Convenience: collect & cache within a single page session
// ---------------------------------------------------------------------------

/** Module-level cache so collectFingerprint() is only computed once per page load. */
let _cachedFingerprint: string | null | undefined = undefined;

/**
 * Like `collectFingerprint()` but memoises the result within the current page
 * session.  Subsequent calls return the cached value without re-running the
 * expensive collectors.
 *
 * Use this in components and hooks where the fingerprint may be requested
 * multiple times (e.g. from both a layout load and an API call interceptor).
 */
export async function getFingerprint(): Promise<string | null> {
	if (_cachedFingerprint !== undefined) return _cachedFingerprint;
	_cachedFingerprint = await collectFingerprint();
	return _cachedFingerprint;
}

/**
 * Synchronously clear the in-memory cache.
 * Useful in tests or when you deliberately want to re-collect signals
 * (e.g. after a major browser state change).
 */
export function clearFingerprintCache(): void {
	_cachedFingerprint = undefined;
}
