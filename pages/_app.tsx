import type { AppProps } from "next/app";
import { useEffect } from "react";
import "@/styles/globals.css";
import { initTheme } from "@/lib/theme";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initTheme();
  }, []);

  return <Component {...pageProps} />;
}
