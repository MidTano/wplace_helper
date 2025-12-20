declare module '*.mp3?inline' {
  const src: string;
  export default src;
}

declare module '*.mp3?url' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*?raw' {
  const src: string;
  export default src;
}

declare const __WPH_VERSION__: string;
declare const __WPH_BUILD_ID__: string;
declare const __WPH_BUILD_TIME__: string;
