/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** When "true", show OTP in the verify screen if the API returns it (staging/QA; not for public prod). */
  readonly VITE_SHOW_OTP_IN_UI?: string;
  /**
   * Optional full URL to a logo image for auth screens (PNG/SVG). When unset, uses
   * /brand/vendor-flow-mark.svg from public/.
   */
  readonly VITE_AUTH_LOGO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
