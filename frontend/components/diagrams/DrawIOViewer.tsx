"use client";

import { useEffect, useRef, useState } from "react";

interface DrawIOViewerProps {
  xmlContent: string;
  width?: number;
  height?: number;
  className?: string;
  onExportPng?: (pngDataUrl: string) => void;
}

export default function DrawIOViewer({
  xmlContent,
  width = 800,
  height = 600,
  className = "",
  onExportPng,
}: DrawIOViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedXmlRef = useRef<string>("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!xmlContent || !xmlContent.trim()) {
      setIsLoading(false);
      setError(null);
      setIsReady(false);
      lastLoadedXmlRef.current = "";
      return;
    }

    // Skip if same XML already loaded
    if (xmlContent.trim() === lastLoadedXmlRef.current) {
      return;
    }

    // Wait for iframe to be ready
    if (!isReady) {
      return;
    }

    // Wait for iframe to load and be ready to receive messages
    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          const trimmedXml = xmlContent.trim();

          // Validate XML
          if (!trimmedXml.startsWith("<")) {
            setError("Invalid XML format");
            setIsLoading(false);
            return;
          }

          // Validate XML structure
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(trimmedXml, "text/xml");
            const parserError = xmlDoc.querySelector("parsererror");
            if (parserError) {
              setError("Invalid XML format");
              setIsLoading(false);
              return;
            }
          } catch (parseErr) {
            setError("Invalid XML format");
            setIsLoading(false);
            return;
          }

          // Send XML to Draw.io viewer - use the format Draw.io expects
          const message = {
            action: "load",
            xml: trimmedXml,
          };

          console.log(
            "Loading diagram into Draw.io viewer, length:",
            trimmedXml.length
          );

          // Post message to iframe
          iframeRef.current.contentWindow.postMessage(
            message,
            "https://embed.diagrams.net"
          );

          // Also try JSON string format as fallback
          setTimeout(() => {
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify(message),
                "https://embed.diagrams.net"
              );
            }
          }, 100);

          lastLoadedXmlRef.current = trimmedXml;
          setIsLoading(false);
          setError(null);
        } catch (err) {
          console.error("Error loading diagram into viewer:", err);
          setError("Failed to load diagram");
          setIsLoading(false);
        }
      }
    }, 1000); // Increased timeout to ensure iframe is ready

    return () => clearTimeout(timer);
  }, [xmlContent, isReady]);

  // Export diagram to PNG
  const exportToPng = () => {
    if (!iframeRef.current?.contentWindow || !xmlContent || !xmlContent.trim()) {
      console.error("Cannot export: iframe not ready or no diagram content");
      return;
    }

    try {
      // Request PNG export from Draw.io
      const exportMessage = {
        action: "export",
        format: "png",
        xml: xmlContent.trim(),
        border: 0,
        transparent: false,
      };

      console.log("Requesting PNG export from Draw.io");
      iframeRef.current.contentWindow.postMessage(
        exportMessage,
        "https://embed.diagrams.net"
      );

      // Also try JSON string format
      setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify(exportMessage),
            "https://embed.diagrams.net"
          );
        }
      }, 100);
    } catch (err) {
      console.error("Error exporting to PNG:", err);
    }
  };

  // Expose export function via ref
  useEffect(() => {
    if (onExportPng) {
      // Store export function reference
      (window as any).__drawioViewerExportPng = exportToPng;
    }
    return () => {
      delete (window as any).__drawioViewerExportPng;
    };
  }, [xmlContent, onExportPng]);

  // Listen for messages from Draw.io
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check origin - Draw.io can send from different origins
      const allowedOrigins = [
        "https://embed.diagrams.net",
        "https://www.draw.io",
        "https://app.diagrams.net",
      ];
      
      if (!allowedOrigins.some(origin => event.origin.includes(origin.replace("https://", "")))) {
        return;
      }

      let message = event.data;
      if (typeof message === "string") {
        try {
          message = JSON.parse(message);
        } catch {
          if (message === "ready" || message === "init") {
            console.log("Draw.io viewer ready (string message)");
            setIsReady(true);
            setIsLoading(false);
            return;
          }
          // Check if it's a PNG data URL
          if (message.startsWith("data:image/png")) {
            if (onExportPng) {
              onExportPng(message);
            }
            return;
          }
          return;
        }
      }

      if (
        message?.event === "init" ||
        message?.action === "init" ||
        message === "ready" ||
        message === "init"
      ) {
        console.log("Draw.io viewer ready (object message)", message);
        setIsReady(true);
        setIsLoading(false);
        setError(null);
      }

      // Handle PNG export response
      if (message?.event === "export" && message?.data) {
        const pngData = message.data;
        if (typeof pngData === "string" && pngData.startsWith("data:image/png")) {
          if (onExportPng) {
            onExportPng(pngData);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onExportPng]);

  const getViewerUrl = () => {
    const params = new URLSearchParams({
      embed: "1",
      ui: "atlas", // Viewer UI (read-only)
      spin: "1",
      proto: "json",
    });
    return `https://embed.diagrams.net/?${params.toString()}`;
  };

  if (error) {
    return (
      <div className={`border rounded-lg p-4 bg-red-50 ${className}`}>
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative border rounded-lg overflow-hidden bg-white ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <div className="mx-auto mb-2 w-8 h-8 rounded-full border-b-2 border-gray-900 animate-spin"></div>
            <p className="text-sm text-gray-600">Loading diagram...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={getViewerUrl()}
        className="w-full border-0"
        style={{
          minHeight: `${height}px`,
          height: "100%",
          opacity: isLoading ? 0 : 1,
          visibility: isLoading ? "hidden" : "visible",
        }}
        sandbox="allow-same-origin allow-scripts allow-popups"
        title="Draw.io Diagram Viewer"
        onLoad={() => {
          // Iframe loaded, wait for Draw.io to initialize
          console.log("Draw.io iframe loaded, waiting for ready message...");
          // Set a fallback timeout in case message doesn't arrive
          setTimeout(() => {
            if (!isReady) {
              console.log("Draw.io ready timeout, marking as ready");
              setIsReady(true);
              setIsLoading(false);
            }
          }, 2000);
        }}
      />
    </div>
  );
}
