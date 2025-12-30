"use client";

import { useEffect, useRef, useState } from "react";

interface DrawIOEditorProps {
  xmlContent: string;
  onXmlChange: (xml: string) => void;
  onClose?: () => void;
}

export default function DrawIOEditor({
  xmlContent,
  onXmlChange,
  onClose,
}: DrawIOEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initialXmlLoadedRef = useRef(false);
  const lastLoadedXmlRef = useRef<string>("");

  // Effect to reload XML when xmlContent changes (for sync with textarea)
  useEffect(() => {
    // Only sync if editor is ready and we have valid XML
    if (!isReady) return;

    const trimmedXml = xmlContent?.trim() || "";

    // Skip if empty or same as last loaded
    if (!trimmedXml || trimmedXml === lastLoadedXmlRef.current) {
      return;
    }

    // Only load if it's valid XML starting with <
    if (!trimmedXml.startsWith("<")) {
      // Empty or invalid - don't try to load, but update ref to prevent loops
      if (!trimmedXml) {
        lastLoadedXmlRef.current = "";
      }
      return;
    }

    // Validate XML before loading
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(trimmedXml, "text/xml");
      const parserError = xmlDoc.querySelector("parsererror");

      if (!parserError) {
        // Check if it's a Draw.io XML (has mxGraphModel)
        const mxGraphModel = xmlDoc.querySelector("mxGraphModel");
        if (
          mxGraphModel &&
          iframeRef.current &&
          iframeRef.current.contentWindow
        ) {
          // Clean XML for Draw.io (normalize whitespace but preserve structure)
          const cleanXml = trimmedXml
            .replace(/>\s+</g, "><") // Remove spaces between tags
            .trim();

          // Ensure XML starts with '<'
          if (!cleanXml.startsWith("<")) {
            console.error(
              "XML doesn't start with '<' during sync:",
              cleanXml.substring(0, 50)
            );
            return;
          }

          // Draw.io embed API - use standard format
          const loadMessage = {
            action: "load",
            xml: cleanXml,
          };

          // Log the full XML being sent for debugging
          console.log("=== DRAW.IO SYNC POSTMESSAGE ===");
          console.log("Action:", loadMessage.action);
          console.log("XML Length:", loadMessage.xml.length);
          console.log("Full XML being sent:");
          console.log(loadMessage.xml);
          console.log("Message object:", loadMessage);
          console.log("Target origin: https://embed.diagrams.net");
          console.log("=================================");

          // Try sending as object first
          iframeRef.current.contentWindow.postMessage(
            loadMessage,
            "https://embed.diagrams.net"
          );

          // Also try sending as JSON string (some Draw.io versions prefer this)
          setTimeout(() => {
            if (iframeRef.current?.contentWindow) {
              console.log("Trying JSON string format");
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify(loadMessage),
                "https://embed.diagrams.net"
              );
            }
          }, 500);

          lastLoadedXmlRef.current = trimmedXml; // Store original for comparison
          initialXmlLoadedRef.current = true;
        } else if (!mxGraphModel) {
          // Not a Draw.io XML - don't load
          console.warn(
            "Not a Draw.io XML (missing mxGraphModel), not loading during sync"
          );
        }
      } else if (parserError) {
        // Invalid XML - log but don't update ref to allow retry
        console.warn(
          "Invalid XML during sync, not loading:",
          parserError.textContent
        );
      }
    } catch (err) {
      console.warn("Failed to parse XML for sync:", err);
    }
  }, [xmlContent, isReady]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Log all messages for debugging (can be removed in production)
      console.log("Draw.io message received:", event.origin, event.data);

      // Security: Only accept messages from Draw.io domain
      if (
        !event.origin.includes("diagrams.net") &&
        !event.origin.includes("draw.io") &&
        !event.origin.includes("localhost") // Allow localhost for development
      ) {
        return;
      }

      let message = event.data;

      // Draw.io may send messages as JSON strings or objects
      if (typeof message === "string") {
        try {
          message = JSON.parse(message);
        } catch {
          // Not JSON, might be a direct string event
          if (message === "ready" || message === "init") {
            setIsReady(true);
            setIsLoading(false);
            setError(null);
            return;
          }
          return;
        }
      }

      // Handle different message types from Draw.io
      if (message.event === "init" || message.action === "init") {
        setIsReady(true);
        setIsLoading(false);
        setError(null);

        // Load initial XML if provided and valid
        const trimmedXml = xmlContent?.trim() || "";
        if (
          trimmedXml &&
          trimmedXml.startsWith("<") &&
          !initialXmlLoadedRef.current
        ) {
          // Validate it's proper XML before loading
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(trimmedXml, "text/xml");
            const parserError = xmlDoc.querySelector("parsererror");

            if (!parserError) {
              // Check if it's a Draw.io XML (has mxGraphModel)
              const mxGraphModel = xmlDoc.querySelector("mxGraphModel");
              if (mxGraphModel) {
                // Clean XML for Draw.io (remove spaces between tags, preserve content)
                // Draw.io can be picky about XML formatting
                const cleanXml = trimmedXml
                  .replace(/>\s+</g, "><") // Remove spaces between tags
                  .trim();

                console.log(
                  "Loading XML into Draw.io editor, length:",
                  cleanXml.length
                );

                // Small delay to ensure editor is fully ready
                setTimeout(() => {
                  if (iframeRef.current && iframeRef.current.contentWindow) {
                    try {
                      // Draw.io embed API - ensure XML is properly formatted
                      // The XML must start with '<' and be valid
                      if (!cleanXml.startsWith("<")) {
                        console.error(
                          "XML doesn't start with '<':",
                          cleanXml.substring(0, 50)
                        );
                        return;
                      }

                      // Draw.io embed API format
                      // According to Draw.io docs, we need to send the XML as a string
                      // in the 'xml' property of the load message

                      // Create a file-like object that Draw.io can parse
                      // Draw.io expects the XML to be sent as: {action: "load", xml: "<xml>"}
                      const loadMessage = {
                        action: "load",
                        xml: cleanXml,
                      };

                      // Log the full XML being sent for debugging
                      console.log("=== DRAW.IO POSTMESSAGE ===");
                      console.log("Action:", loadMessage.action);
                      console.log("XML Length:", loadMessage.xml.length);
                      console.log("Full XML being sent:");
                      console.log(loadMessage.xml);
                      console.log("Message object:", loadMessage);
                      console.log("Target origin: https://embed.diagrams.net");
                      console.log("===========================");

                      // Send the load message - Draw.io should receive this and parse the xml property
                      // Use the correct target origin for Draw.io embed API
                      // Try object format first
                      iframeRef.current.contentWindow.postMessage(
                        loadMessage,
                        "https://embed.diagrams.net"
                      );

                      // Also try JSON string format after a delay
                      setTimeout(() => {
                        if (iframeRef.current?.contentWindow) {
                          console.log(
                            "Trying JSON string format for initial load"
                          );
                          iframeRef.current.contentWindow.postMessage(
                            JSON.stringify(loadMessage),
                            "https://embed.diagrams.net"
                          );
                        }
                      }, 500);

                      initialXmlLoadedRef.current = true;
                      lastLoadedXmlRef.current = trimmedXml; // Store original
                    } catch (err) {
                      console.error("Error sending XML to Draw.io:", err);
                    }
                  }
                }, 2000); // Increased delay to ensure editor is fully initialized
              } else {
                console.warn(
                  "Not a Draw.io XML (missing mxGraphModel), not loading into editor"
                );
              }
            } else {
              console.warn(
                "Invalid XML, not loading into editor:",
                parserError.textContent
              );
            }
          } catch (err) {
            console.warn("Failed to parse XML, not loading into editor:", err);
          }
        } else if (!trimmedXml) {
          // Empty XML - editor will start blank, which is fine
          lastLoadedXmlRef.current = "";
        }
      } else if (message.event === "export" || message.action === "export") {
        // XML exported from editor
        if (message.data || message.xml) {
          const exportedXml = message.data || message.xml;
          lastLoadedXmlRef.current = exportedXml;
          onXmlChange(exportedXml);
        }
      } else if (message.event === "save" || message.action === "save") {
        // User saved in editor
        if (message.data || message.xml) {
          const savedXml = message.data || message.xml;
          lastLoadedXmlRef.current = savedXml;
          onXmlChange(savedXml);
        }
      } else if (
        message.event === "autosave" ||
        message.action === "autosave"
      ) {
        // Auto-save from editor (for real-time sync)
        if (message.data || message.xml) {
          const autoSavedXml = message.data || message.xml;
          // Only update if it's different to avoid loops
          if (autoSavedXml !== lastLoadedXmlRef.current) {
            lastLoadedXmlRef.current = autoSavedXml;
            onXmlChange(autoSavedXml);
          }
        }
      } else if (message.event === "exit" || message.action === "exit") {
        // User closed editor
        if (onClose) {
          onClose();
        }
      } else if (message.event === "configure") {
        // Editor configuration complete
        setIsReady(true);
        setIsLoading(false);
      }
    };

    // Handle iframe load event
    const handleIframeLoad = () => {
      console.log("Draw.io iframe loaded");
      // Give the iframe time to initialize
      setTimeout(() => {
        // Try to send init message
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ action: "init" }),
            "https://embed.diagrams.net"
          );
        }
      }, 2000);
    };

    window.addEventListener("message", handleMessage);

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener("load", handleIframeLoad);
    }

    // Set timeout for loading - but don't show error, just hide loading
    // The editor might still work even if we don't get the init message
    const loadingTimeout = setTimeout(() => {
      setIsLoading((prevLoading) => {
        if (prevLoading) {
          // Hide loading spinner but don't show error
          // The iframe might still be functional
          console.log("Draw.io loading timeout - showing iframe anyway");
          return false;
        }
        return prevLoading;
      });
    }, 10000); // 10 second timeout - then show iframe anyway

    return () => {
      window.removeEventListener("message", handleMessage);
      if (iframe) {
        iframe.removeEventListener("load", handleIframeLoad);
      }
      clearTimeout(loadingTimeout);
    };
  }, [xmlContent, onXmlChange, onClose, isReady]);

  const loadXmlIntoEditor = (xml: string) => {
    if (!iframeRef.current || !isReady) {
      return;
    }

    const trimmedXml = xml?.trim();

    // Only load if we have valid XML that starts with <
    if (!trimmedXml || !trimmedXml.startsWith("<")) {
      console.log("Skipping XML load - empty or invalid XML");
      return;
    }

    // Validate XML before sending
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(trimmedXml, "text/xml");
      const parserError = xmlDoc.querySelector("parsererror");

      if (parserError) {
        console.warn("Invalid XML, not loading:", parserError.textContent);
        return;
      }
    } catch (err) {
      console.warn("Failed to parse XML:", err);
      return;
    }

    // Clean XML for Draw.io (remove spaces between tags, preserve content)
    const cleanXml = trimmedXml
      .replace(/>\s+</g, "><") // Remove spaces between tags
      .trim();

    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    // Ensure XML starts with '<'
    if (!cleanXml.startsWith("<")) {
      console.error(
        "XML doesn't start with '<' in loadXmlIntoEditor:",
        cleanXml.substring(0, 50)
      );
      return;
    }

    // Draw.io embed API - use standard format
    const loadMessage = {
      action: "load",
      xml: cleanXml,
    };

    // Log the full XML being sent for debugging
    console.log("=== DRAW.IO LOADXMLINTOEDITOR POSTMESSAGE ===");
    console.log("Action:", loadMessage.action);
    console.log("XML Length:", loadMessage.xml.length);
    console.log("Full XML being sent:");
    console.log(loadMessage.xml);
    console.log("Message object:", loadMessage);
    console.log("Target origin: https://embed.diagrams.net");
    console.log("=============================================");

    // Try object format first
    iframe.contentWindow.postMessage(loadMessage, "https://embed.diagrams.net");

    // Also try JSON string format
    setTimeout(() => {
      if (iframe.contentWindow) {
        console.log("Trying JSON string format for loadXmlIntoEditor");
        iframe.contentWindow.postMessage(
          JSON.stringify(loadMessage),
          "https://embed.diagrams.net"
        );
      }
    }, 500);
  };

  // Build Draw.io embed URL with configuration
  const getEmbedUrl = () => {
    // Draw.io embed mode with proper configuration
    const params = new URLSearchParams({
      embed: "1", // Embed mode (required)
      ui: "min", // Minimal UI
      spin: "1", // Show loading spinner
      libraries: "1", // Enable shape libraries
      saveAndExit: "1", // Enable save and exit button
      proto: "json", // Use JSON protocol for messages (important!)
    });

    return `https://embed.diagrams.net/?${params.toString()}`;
  };

  return (
    <div className="relative w-full" style={{ minHeight: "600px" }}>
      {isLoading && (
        <div className="flex absolute inset-0 justify-center items-center bg-gray-50 rounded-lg border">
          <div className="text-center">
            <div className="mx-auto mb-2 w-8 h-8 rounded-full border-b-2 border-gray-900 animate-spin"></div>
            <p className="text-sm text-gray-600">Loading editor...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex absolute inset-0 justify-center items-center bg-red-50 rounded-lg border border-red-200">
          <div className="p-4 text-center">
            <p className="mb-2 text-sm text-red-600">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                setIsReady(false);
                initialXmlLoadedRef.current = false;
                if (iframeRef.current) {
                  iframeRef.current.src = getEmbedUrl();
                }
              }}
              className="text-sm text-red-600 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={getEmbedUrl()}
        className="w-full rounded-lg border"
        style={{
          minHeight: "600px",
          height: "100%",
          display: error ? "none" : "block", // Always show iframe unless there's an error
          opacity: isLoading ? 0.3 : 1, // Fade in when ready
          transition: "opacity 0.3s ease-in-out",
        }}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        allow="clipboard-read; clipboard-write"
        title="Draw.io Diagram Editor"
        onLoad={() => {
          console.log("Iframe onLoad event fired");
          // After iframe loads, wait a bit then hide loading
          setTimeout(() => {
            setIsLoading(false);
            setIsReady(true);
          }, 2000);
        }}
      />
    </div>
  );
}
