/* @ds-bundle: {"format":4,"namespace":"UseclisDesignSystem","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Checkbox","sourcePath":"components/core/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Select","sourcePath":"components/core/Select.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"FeedItem","sourcePath":"components/data/FeedItem.jsx"},{"name":"GrowthDelta","sourcePath":"components/data/GrowthDelta.jsx"},{"name":"LeaderboardRow","sourcePath":"components/data/LeaderboardRow.jsx"},{"name":"MetricStat","sourcePath":"components/data/MetricStat.jsx"},{"name":"SourceBadge","sourcePath":"components/data/SourceBadge.jsx"},{"name":"ToolCard","sourcePath":"components/data/ToolCard.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"edc538e8f65d","components/core/Badge.jsx":"ea247cb7f932","components/core/Button.jsx":"e77e0d11f61d","components/core/Card.jsx":"96f83c4a937a","components/core/Checkbox.jsx":"900e9db83bac","components/core/IconButton.jsx":"c734bee5ebda","components/core/Input.jsx":"bdff3996b04a","components/core/Select.jsx":"f053bb77067a","components/core/Switch.jsx":"fbfb3ba6c2db","components/core/Tag.jsx":"39e515b62fc6","components/data/FeedItem.jsx":"72a5c1bd20b1","components/data/GrowthDelta.jsx":"3df935f13cf4","components/data/LeaderboardRow.jsx":"9ff9cd432d2c","components/data/MetricStat.jsx":"34f3c87069df","components/data/SourceBadge.jsx":"07d8fb8e6af6","components/data/ToolCard.jsx":"db81ee5595bf"},"inlinedExternals":[],"unexposedExports":[]} */
window.UseclisDesignSystem = {};
// components/core/Avatar.jsx
(() => {
"use strict";
function Avatar({ src, name = "", size = 32, shape = "rounded", ring }) {
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    const radius = shape === "circle" ? "50%" : "var(--radius-avatar)";
    return React.createElement("span", { style: { width: size, height: size, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: radius,
            overflow: "hidden", background: "var(--surface-sunken)", color: "var(--text-muted)", font: "var(--fw-semibold) " + Math.round(size * 0.42) + "px/1 var(--font-sans)",
            border: ring ? "1px solid var(--border-subtle)" : "none" } }, src ? React.createElement("img", { src: src, alt: name, style: { width: "100%", height: "100%", objectFit: "cover" } }) : initial);
}

window.UseclisDesignSystem.Avatar = Avatar;
})();
// components/core/Badge.jsx
(() => {
"use strict";
const TONES = { neutral: ["var(--surface-sunken)", "var(--text-body)"], source: ["var(--source-bg)", "var(--source-fg)"], featured: ["var(--featured-bg)", "var(--featured-fg)"],
    positive: ["var(--green-50)", "var(--green-700)"], negative: ["var(--red-50)", "var(--red-700)"], info: ["var(--blue-50)", "var(--blue-700)"], inverse: ["var(--surface-inverse)", "var(--text-inverse)"] };
function Badge({ tone = "neutral", caps, dot, children, style, ...rest }) {
    const [bg, fg] = TONES[tone] || TONES.neutral;
    return React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: "var(--radius-sm)", background: bg, color: fg,
            font: caps ? "var(--text-caps)" : "var(--fw-semibold) var(--fs-xs)/1.2 var(--font-sans)", letterSpacing: caps ? "var(--tracking-caps)" : "0",
            textTransform: caps ? "uppercase" : "none", whiteSpace: "nowrap", ...style }, ...rest },
        dot && React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "currentColor" } }),
        children);
}

window.UseclisDesignSystem.Badge = Badge;
})();
// components/core/Button.jsx
(() => {
"use strict";
const SIZES = { sm: { font: "var(--fs-sm)", pad: "7px 12px", h: 32, radius: "var(--radius-control)" }, md: { font: "var(--fs-body)", pad: "var(--pad-control-y) var(--pad-control-x)", h: 38, radius: "var(--radius-control)" }, lg: { font: "var(--fs-body-lg)", pad: "13px 22px", h: 46, radius: "var(--radius-control)" } };
const VARIANTS = {
    primary: { background: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)", border: "1px solid var(--btn-primary-bg)" },
    brand: { background: "var(--btn-brand-bg)", color: "var(--btn-brand-fg)", border: "1px solid var(--btn-brand-bg)" },
    secondary: { background: "var(--surface-card)", color: "var(--text-strong)", border: "1px solid var(--border-default)" },
    ghost: { background: "transparent", color: "var(--text-body)", border: "1px solid transparent" },
    danger: { background: "var(--red-500)", color: "#fff", border: "1px solid var(--red-500)" }
};
const HOVER = { primary: "var(--btn-primary-bg-hover)", brand: "var(--btn-brand-bg-hover)", secondary: "var(--surface-hover)", ghost: "var(--surface-hover)", danger: "var(--red-700)" };
function Button({ variant = "primary", size = "md", iconLeft, iconRight, fullWidth, disabled, loading, children, style, ...rest }) {
    const [h, setH] = React.useState(false), [p, setP] = React.useState(false);
    const s = SIZES[size] || SIZES.md, v = VARIANTS[variant] || VARIANTS.primary;
    return (React.createElement("button", { disabled: disabled || loading, onMouseEnter: () => setH(true), onMouseLeave: () => { setH(false); setP(false); }, onMouseDown: () => setP(true), onMouseUp: () => setP(false), style: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--gap-inline)", minHeight: s.h, padding: s.pad, borderRadius: s.radius,
            font: "var(--fw-semibold) " + s.font + "/1 var(--font-sans)", letterSpacing: "var(--tracking-body)", cursor: disabled ? "not-allowed" : "pointer",
            width: fullWidth ? "100%" : undefined, opacity: disabled ? .45 : 1, transition: "var(--transition-control),transform var(--duration-instant) var(--ease-standard)",
            transform: p && !disabled ? "scale(var(--press-scale))" : "none", ...v,
            background: h && !disabled ? HOVER[variant] : v.background, ...style }, ...rest },
        loading ? React.createElement("span", { style: { width: 13, height: 13, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "useclis-spin .7s linear infinite" } }) : iconLeft,
        children,
        iconRight));
}

window.UseclisDesignSystem.Button = Button;
})();
// components/core/Card.jsx
(() => {
"use strict";
function Card({ as = "div", padding = "md", interactive, accentBg, children, style, ...rest }) {
    const [h, setH] = React.useState(false);
    const Tag = as;
    const pad = padding === "none" ? 0 : padding === "sm" ? "var(--space-4)" : padding === "lg" ? "var(--pad-card-lg)" : "var(--pad-card)";
    return React.createElement(Tag, { onMouseEnter: () => setH(true), onMouseLeave: () => setH(false), style: { background: accentBg || "var(--surface-card)", border: "var(--border-card)", borderRadius: "var(--radius-card)", padding: pad,
            boxShadow: interactive && h ? "var(--shadow-md)" : "var(--shadow-xs)", borderColor: interactive && h ? "var(--border-default)" : "var(--border-subtle)",
            transform: interactive && h ? "translateY(-1px)" : "none", transition: "box-shadow var(--duration-base) var(--ease-standard),transform var(--duration-base) var(--ease-standard),border-color var(--duration-base) var(--ease-standard)",
            display: "block", ...style }, ...rest }, children);
}

window.UseclisDesignSystem.Card = Card;
})();
// components/core/Checkbox.jsx
(() => {
"use strict";
function Checkbox({ label, checked, onChange, disabled, ...rest }) {
    return (React.createElement("label", { style: { display: "inline-flex", alignItems: "center", gap: "var(--space-3)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1 } },
        React.createElement("input", { type: "checkbox", checked: checked, onChange: onChange, disabled: disabled, style: { position: "absolute", opacity: 0, width: 0, height: 0 }, ...rest }),
        React.createElement("span", { style: { width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-xs)",
                border: "1px solid " + (checked ? "var(--btn-primary-bg)" : "var(--border-default)"), background: checked ? "var(--btn-primary-bg)" : "var(--surface-card)",
                color: "var(--btn-primary-fg)", font: "var(--fw-bold) 11px/1 var(--font-sans)", transition: "var(--transition-control)" } }, checked ? "✓" : ""),
        label && React.createElement("span", { style: { font: "var(--text-body-default)", color: "var(--text-body)" } }, label)));
}

window.UseclisDesignSystem.Checkbox = Checkbox;
})();
// components/core/IconButton.jsx
(() => {
"use strict";
function IconButton({ size = "md", variant = "ghost", label, children, style, ...rest }) {
    const [h, setH] = React.useState(false);
    const d = size === "sm" ? 30 : size === "lg" ? 42 : 36;
    const base = variant === "solid" ? { background: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)", border: "1px solid var(--btn-primary-bg)" }
        : variant === "outline" ? { background: "var(--surface-card)", color: "var(--text-body)", border: "1px solid var(--border-default)" }
            : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" };
    return React.createElement("button", { "aria-label": label, onMouseEnter: () => setH(true), onMouseLeave: () => setH(false), style: { width: d, height: d, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-control)", cursor: "pointer",
            transition: "var(--transition-control)", ...base,
            background: h ? (variant === "solid" ? "var(--btn-primary-bg-hover)" : "var(--surface-hover)") : base.background,
            color: h && variant === "ghost" ? "var(--text-strong)" : base.color, ...style }, ...rest }, children);
}

window.UseclisDesignSystem.IconButton = IconButton;
})();
// components/core/Input.jsx
(() => {
"use strict";
function Input({ label, hint, error, iconLeft, suffix, size = "md", style, ...rest }) {
    const [foc, setFoc] = React.useState(false);
    const h = size === "sm" ? 32 : size === "lg" ? 46 : 38;
    return (React.createElement("label", { style: { display: "flex", flexDirection: "column", gap: "var(--space-2)", width: "100%" } },
        label && React.createElement("span", { style: { font: "var(--text-label)", color: "var(--text-body)" } }, label),
        React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "var(--space-3)", minHeight: h, padding: "0 var(--pad-control-x)", background: "var(--surface-card)",
                border: "1px solid " + (error ? "var(--red-500)" : foc ? "var(--border-focus)" : "var(--border-default)"), borderRadius: "var(--radius-control)",
                boxShadow: foc && !error ? "var(--focus-ring)" : "none", transition: "var(--transition-control)" } },
            iconLeft && React.createElement("span", { style: { display: "flex", color: "var(--text-faint)" } }, iconLeft),
            React.createElement("input", { onFocus: () => setFoc(true), onBlur: () => setFoc(false), style: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: "var(--text-strong)", font: "var(--text-body-default)", ...style }, ...rest }),
            suffix && React.createElement("span", { style: { font: "var(--text-label)", color: "var(--text-muted)" } }, suffix)),
        (hint || error) && React.createElement("span", { style: { font: "var(--fw-regular) var(--fs-sm)/1.4 var(--font-sans)", color: error ? "var(--red-500)" : "var(--text-muted)" } }, error || hint)));
}

window.UseclisDesignSystem.Input = Input;
})();
// components/core/Select.jsx
(() => {
"use strict";
function Select({ label, options = [], size = "md", style, ...rest }) {
    const h = size === "sm" ? 32 : size === "lg" ? 46 : 38;
    return (React.createElement("label", { style: { display: "flex", flexDirection: "column", gap: "var(--space-2)" } },
        label && React.createElement("span", { style: { font: "var(--text-label)", color: "var(--text-body)" } }, label),
        React.createElement("span", { style: { position: "relative", display: "flex" } },
            React.createElement("select", { style: { appearance: "none", width: "100%", minHeight: h, padding: "0 34px 0 var(--pad-control-x)", background: "var(--surface-card)", color: "var(--text-strong)",
                    border: "1px solid var(--border-default)", borderRadius: "var(--radius-control)", font: "var(--text-body-default)", cursor: "pointer", ...style }, ...rest }, options.map(o => { const v = typeof o === "string" ? o : o.value, l = typeof o === "string" ? o : o.label; return React.createElement("option", { key: v, value: v }, l); })),
            React.createElement("span", { "aria-hidden": true, style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", font: "var(--fs-xs)/1 var(--font-sans)" } }, "\u25BE"))));
}

window.UseclisDesignSystem.Select = Select;
})();
// components/core/Switch.jsx
(() => {
"use strict";
function Switch({ checked, onChange, label, disabled }) {
    return (React.createElement("label", { style: { display: "inline-flex", alignItems: "center", gap: "var(--space-3)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1 } },
        React.createElement("span", { onClick: () => !disabled && onChange && onChange(!checked), style: { width: 38, height: 22, borderRadius: "var(--radius-pill)", padding: 2, display: "inline-flex",
                background: checked ? "var(--green-600)" : "var(--gray-300)", transition: "background-color var(--duration-base) var(--ease-standard)" } },
            React.createElement("span", { style: { width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-xs)",
                    transform: checked ? "translateX(16px)" : "none", transition: "transform var(--duration-base) var(--ease-out)" } })),
        label && React.createElement("span", { style: { font: "var(--text-body-default)", color: "var(--text-body)" } }, label)));
}

window.UseclisDesignSystem.Switch = Switch;
})();
// components/core/Tag.jsx
(() => {
"use strict";
function Tag({ href, active, children, style, ...rest }) {
    const [h, setH] = React.useState(false);
    const Tag2 = href ? "a" : "span";
    return React.createElement(Tag2, { href: href, onMouseEnter: () => setH(true), onMouseLeave: () => setH(false), style: { display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: "var(--radius-pill)",
            border: "1px solid " + (active ? "var(--border-strong)" : "var(--border-subtle)"),
            background: active ? "var(--surface-inverse)" : h ? "var(--surface-hover)" : "var(--surface-card)",
            color: active ? "var(--text-inverse)" : "var(--text-body)", font: "var(--text-label)", textDecoration: "none", whiteSpace: "nowrap",
            transition: "var(--transition-control)", ...style }, ...rest }, children);
}

window.UseclisDesignSystem.Tag = Tag;
})();
// components/data/FeedItem.jsx
(() => {
"use strict";
function FeedItem({ author, authorAvatar, project, projectLogo, time, children, likes = 0, comments = 0 }) {
    return (React.createElement("div", { style: { display: "flex", gap: "var(--space-4)", padding: "var(--space-5) 0", borderBottom: "1px solid var(--border-subtle)" } },
        React.createElement(window.UseclisDesignSystem.Avatar, { src: authorAvatar, name: author, size: 36, shape: "circle" }),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "var(--space-3)", minWidth: 0, flex: 1 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", font: "var(--fw-regular) var(--fs-sm)/1.3 var(--font-sans)", color: "var(--text-muted)" } },
                React.createElement("span", { style: { fontWeight: "var(--fw-semibold)", color: "var(--text-strong)" } }, author),
                React.createElement("span", null, "on"),
                React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-strong)", fontWeight: "var(--fw-medium)" } },
                    React.createElement(window.UseclisDesignSystem.Avatar, { src: projectLogo, name: project, size: 16 }),
                    project),
                React.createElement("span", null,
                    "\u00B7 ",
                    time)),
            React.createElement("div", { style: { font: "var(--text-body-default)", color: "var(--text-body)", textWrap: "pretty" } }, children),
            React.createElement("div", { style: { display: "flex", gap: "var(--space-5)", font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-muted)" } },
                React.createElement("span", null,
                    "\u2665 ",
                    likes),
                React.createElement("span", null,
                    "\uD83D\uDCAC ",
                    comments)))));
}

window.UseclisDesignSystem.FeedItem = FeedItem;
})();
// components/data/GrowthDelta.jsx
(() => {
"use strict";
function GrowthDelta({ value, period, size = "sm" }) {
    const n = typeof value === "number" ? value : parseFloat(value);
    const flat = !n || Number.isNaN(n);
    const up = n > 0;
    const color = flat ? "var(--growth-flat)" : up ? "var(--growth-up)" : "var(--growth-down)";
    const txt = Number.isNaN(n) ? "—" : (up ? "+" : "") + n + "%";
    return React.createElement("span", { className: "tabular", style: { display: "inline-flex", alignItems: "center", gap: 4, color,
            font: "var(--fw-semibold) " + (size === "md" ? "var(--fs-body)" : "var(--fs-sm)") + "/1 var(--font-mono)" } },
        React.createElement("span", { "aria-hidden": true, style: { fontSize: "0.85em" } }, flat ? "–" : up ? "▲" : "▼"),
        txt,
        period && React.createElement("span", { style: { color: "var(--text-faint)", font: "var(--fw-regular) var(--fs-xs)/1 var(--font-sans)" } }, period));
}

window.UseclisDesignSystem.GrowthDelta = GrowthDelta;
})();
// components/data/LeaderboardRow.jsx
(() => {
"use strict";
function LeaderboardRow({ rank, name, description, logo, command, stars, growth, href }) {
    return React.createElement("a", { href: href, style: { display: "grid", gridTemplateColumns: "32px minmax(140px,1fr) 90px 90px", gap: 12, alignItems: "center", padding: 16, borderBottom: "1px solid var(--border-subtle)", textDecoration: "none", color: "var(--text-strong)" } },
        React.createElement("span", { className: "tabular" }, rank),
        React.createElement("span", { style: { display: "flex", gap: 12, alignItems: "center" } },
            React.createElement(window.UseclisDesignSystem.Avatar, { src: logo, name: name, size: 32 }),
            React.createElement("span", null,
                React.createElement("strong", null, name),
                React.createElement("span", { style: { display: "block", fontSize: 13, color: "var(--text-muted)" } }, description),
                React.createElement("code", null, command))),
        React.createElement("span", { className: "tabular", style: { textAlign: "right" } }, stars ?? "—"),
        React.createElement(window.UseclisDesignSystem.GrowthDelta, { value: growth }));
}

window.UseclisDesignSystem.LeaderboardRow = LeaderboardRow;
})();
// components/data/MetricStat.jsx
(() => {
"use strict";
function MetricStat({ label, value, sub, align = "left", size = "md", tone }) {
    const fs = size === "lg" ? "28px" : size === "sm" ? "15px" : "20px";
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" } },
        React.createElement("span", { style: { font: "var(--text-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-muted)" } }, label),
        React.createElement("span", { className: "tabular", style: { font: "var(--fw-semibold) " + fs + "/1.1 var(--font-mono)", color: tone === "brand" ? "var(--text-brand)" : "var(--text-strong)" } }, value),
        sub && React.createElement("span", { style: { font: "var(--fw-regular) var(--fs-sm)/1.3 var(--font-sans)", color: "var(--text-muted)" } }, sub));
}

window.UseclisDesignSystem.MetricStat = MetricStat;
})();
// components/data/SourceBadge.jsx
(() => {
"use strict";
function SourceBadge({ source = "GitHub", compact, children }) {
    return React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, padding: compact ? "2px 7px" : "4px 9px", borderRadius: "var(--radius-pill)", background: "var(--source-bg)", color: "var(--source-fg)", font: "var(--fw-semibold) " + (compact ? "var(--fs-xs)" : "var(--fs-sm)") + "/1.2 var(--font-sans)" } },
        React.createElement("span", { "aria-hidden": "true", style: { width: 6, height: 6, borderRadius: "50%", background: "currentColor" } }),
        children || `Data from ${source}`);
}

window.UseclisDesignSystem.SourceBadge = SourceBadge;
})();
// components/data/ToolCard.jsx
(() => {
"use strict";
function ToolCard({ name, category, logo, command, stars, license, href, onClick }) {
    return React.createElement(window.UseclisDesignSystem.Card, { as: href ? "a" : onClick ? "button" : "div", href: href, onClick: onClick, interactive: !!(href || onClick), style: { textAlign: "left", color: "var(--text-body)", textDecoration: "none", display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center" } },
            React.createElement(window.UseclisDesignSystem.Avatar, { src: logo, name: name, size: 40 }),
            React.createElement("div", null,
                React.createElement("strong", null, name),
                React.createElement("div", { style: { fontSize: 13, color: "var(--text-muted)" } }, category))),
        React.createElement("code", { style: { fontFamily: "var(--font-mono)", overflowWrap: "anywhere" } }, command),
        React.createElement("div", { style: { display: "flex", gap: 24, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 } },
            React.createElement(window.UseclisDesignSystem.MetricStat, { label: "GitHub stars", value: stars ?? "—", size: "sm" }),
            React.createElement(window.UseclisDesignSystem.MetricStat, { label: "License", value: license ?? "See repository", size: "sm" })));
}

window.UseclisDesignSystem.ToolCard = ToolCard;
})();
