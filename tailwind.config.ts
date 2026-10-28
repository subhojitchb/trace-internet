import type { Config } from "tailwindcss";
export default { darkMode: ["class", '[data-theme="dark"]'], content: ["./app/**/*.tsx","./components/**/*.tsx"],
theme:{extend:{colors:{ink:"var(--ink)",panel:"var(--panel)",raised:"var(--raised)",line:"var(--line)",fg:"var(--fg)",mute:"var(--mute)",acc:"var(--acc)"},fontFamily:{display:["Georgia","Iowan Old Style","serif"],sans:["Inter","ui-sans-serif","system-ui","sans-serif"]}}},plugins:[]} satisfies Config;
