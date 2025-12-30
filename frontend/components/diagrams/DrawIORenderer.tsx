"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";

interface DrawIORendererProps {
  xmlContent: string;
  width?: number;
  height?: number;
  className?: string;
}

interface ParsedCell {
  id: string;
  value: string;
  style: Record<string, string>;
  geometry?: {
    x: number;
    y: number;
    width: number;
    height: number;
    relative?: boolean;
  };
  parent?: string;
  edge?: boolean;
  source?: string;
  target?: string;
  vertex?: boolean;
}

interface ParsedDiagram {
  cells: ParsedCell[];
  pageWidth: number;
  pageHeight: number;
}

export default function DrawIORenderer({
  xmlContent,
  width,
  height,
  className = "",
}: DrawIORendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [parsedDiagram, setParsedDiagram] = useState<ParsedDiagram | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!xmlContent || !xmlContent.trim()) {
      setParsedDiagram(null);
      setError(null);
      return;
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid XML format");
      }

      const diagram = parseDrawIOXML(xmlDoc);
      setParsedDiagram(diagram);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse diagram");
      setParsedDiagram(null);
    }
  }, [xmlContent]);

  const parseDrawIOXML = (xmlDoc: Document): ParsedDiagram => {
    const mxGraphModel = xmlDoc.querySelector("mxGraphModel");
    if (!mxGraphModel) {
      throw new Error("No mxGraphModel found");
    }

    // Get page dimensions
    const pageWidth = parseInt(
      mxGraphModel.getAttribute("pageWidth") || "1600"
    );
    const pageHeight = parseInt(
      mxGraphModel.getAttribute("pageHeight") || "900"
    );

    const root = mxGraphModel.querySelector("root");
    if (!root) {
      throw new Error("No root element found");
    }

    const cells: ParsedCell[] = [];
    const cellElements = root.querySelectorAll("mxCell");

    cellElements.forEach((cellEl) => {
      const id = cellEl.getAttribute("id") || "";
      const value = cellEl.getAttribute("value") || "";
      const styleStr = cellEl.getAttribute("style") || "";
      const parent = cellEl.getAttribute("parent") || undefined;
      const edge = cellEl.getAttribute("edge") === "1";
      const vertex = cellEl.getAttribute("vertex") === "1";
      const source = cellEl.getAttribute("source") || undefined;
      const target = cellEl.getAttribute("target") || undefined;

      // Parse style string into object
      const style: Record<string, string> = {};
      styleStr.split(";").forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          style[key.trim()] = value.trim();
        }
      });

      // Parse geometry
      const geometryEl = cellEl.querySelector("mxGeometry");
      let geometry;
      if (geometryEl) {
        geometry = {
          x: parseFloat(geometryEl.getAttribute("x") || "0"),
          y: parseFloat(geometryEl.getAttribute("y") || "0"),
          width: parseFloat(geometryEl.getAttribute("width") || "0"),
          height: parseFloat(geometryEl.getAttribute("height") || "0"),
          relative: geometryEl.getAttribute("relative") === "1",
        };
      }

      cells.push({
        id,
        value: decodeHTML(value),
        style,
        geometry,
        parent,
        edge,
        vertex,
        source,
        target,
      });
    });

    return { cells, pageWidth, pageHeight };
  };

  const decodeHTML = (html: string): string => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleResize = () => {
      if (isFullscreen && svgRef.current) {
        // Force re-render to update dimensions
        setParsedDiagram((prev) => (prev ? { ...prev } : null));
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleResize);
    };
  }, [isFullscreen]);

  const getCellById = (id: string): ParsedCell | undefined => {
    return parsedDiagram?.cells.find((c) => c.id === id);
  };

  const renderCell = (cell: ParsedCell): JSX.Element | null => {
    if (!cell.geometry) return null;

    const { x, y, width, height } = cell.geometry;
    const style = cell.style;

    // Skip root cells
    if (cell.id === "0" || cell.id === "1") return null;

    // Handle edges (connections)
    if (cell.edge && cell.source && cell.target) {
      const sourceCell = getCellById(cell.source);
      const targetCell = getCellById(cell.target);

      if (sourceCell?.geometry && targetCell?.geometry) {
        const sx = sourceCell.geometry.x + sourceCell.geometry.width / 2;
        const sy = sourceCell.geometry.y + sourceCell.geometry.height / 2;
        const tx = targetCell.geometry.x + targetCell.geometry.width / 2;
        const ty = targetCell.geometry.y + targetCell.geometry.height / 2;

        const isDashed = style.dashed === "1";
        const strokeColor = style.strokeColor || "#444444";
        const arrowType = style.endArrow || "block";

        return (
          <g key={cell.id}>
            <line
              x1={sx}
              y1={sy}
              x2={tx}
              y2={ty}
              stroke={strokeColor}
              strokeWidth={2}
              strokeDasharray={isDashed ? "5,5" : "none"}
              markerEnd={arrowType === "block" ? "url(#arrowhead)" : undefined}
            />
          </g>
        );
      }
      return null;
    }

    // Handle vertices (shapes)
    if (cell.vertex || !cell.edge) {
      const fillColor = style.fillColor || "#ffffff";
      const strokeColor = style.strokeColor || "#666666";
      const rounded = style.rounded === "1";
      const whiteSpace = style.whiteSpace || "wrap";
      const html = style.html === "1";
      const fontSize = parseInt(style.fontSize || "12");
      const fontStyle = style.fontStyle || "";
      const isSwimlane = style.swimlane === "1";
      const isText = style.text === "1";
      const wordWrapValue = whiteSpace === "wrap" ? "break-word" : "normal";

      // Handle swimlanes
      if (isSwimlane) {
        return (
          <g key={cell.id}>
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={2}
              rx={rounded ? 8 : 0}
            />
            {cell.value && (
              <text
                x={x + 10}
                y={y + 20}
                fontSize={fontSize}
                fontWeight={fontStyle.includes("1") ? "bold" : "normal"}
                fill={strokeColor}
              >
                {cell.value}
              </text>
            )}
          </g>
        );
      }

      // Handle text-only cells
      if (isText) {
        return (
          <text
            key={cell.id}
            x={x}
            y={y}
            fontSize={fontSize}
            fontWeight={fontStyle.includes("1") ? "bold" : "normal"}
            fill={strokeColor}
            textAnchor="middle"
          >
            {cell.value}
          </text>
        );
      }

      // Handle regular shapes
      return (
        <g key={cell.id}>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            rx={rounded ? 8 : 0}
          />
          {cell.value && (
            <foreignObject
              x={x + 5}
              y={y + 5}
              width={width - 10}
              height={height - 10}
            >
              {html ? (
                <div
                  style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: fontStyle.includes("1") ? "bold" : "normal",
                    color: strokeColor,
                    wordWrap: wordWrapValue,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: whiteSpace === "wrap" ? "normal" : "nowrap",
                  }}
                  dangerouslySetInnerHTML={{ __html: cell.value }}
                />
              ) : (
                <div
                  style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: fontStyle.includes("1") ? "bold" : "normal",
                    color: strokeColor,
                    wordWrap: wordWrapValue,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: whiteSpace === "wrap" ? "normal" : "nowrap",
                  }}
                >
                  {cell.value}
                </div>
              )}
            </foreignObject>
          )}
        </g>
      );
    }

    return null;
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!parsedDiagram) {
    if (!xmlContent || !xmlContent.trim()) {
      return null;
    }
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center">Loading diagram...</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate SVG dimensions - use fullscreen dimensions if in fullscreen
  const getSvgDimensions = () => {
    if (isFullscreen) {
      // In fullscreen, use viewport dimensions
      return {
        width: window.innerWidth - 40, // Account for padding
        height: window.innerHeight - 40,
      };
    }
    return {
      width: width || parsedDiagram.pageWidth,
      height: height || parsedDiagram.pageHeight,
    };
  };

  const svgDimensions = getSvgDimensions();
  const viewBox = `0 0 ${parsedDiagram.pageWidth} ${parsedDiagram.pageHeight}`;

  // Sort cells: edges first, then vertices
  const sortedCells = [...parsedDiagram.cells].sort((a, b) => {
    if (a.edge && !b.edge) return 1;
    if (!a.edge && b.edge) return -1;
    return 0;
  });

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="relative">
          <div className="absolute top-2 right-2 z-10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
              className="bg-white/90 hover:bg-white"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div
            ref={containerRef}
            className={`overflow-auto border rounded-lg bg-white ${
              isFullscreen ? "fixed inset-0 z-50 m-0 rounded-none" : ""
            }`}
          >
            <svg
              ref={svgRef}
              width={svgDimensions.width}
              height={svgDimensions.height}
              viewBox={viewBox}
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block" }}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#444444" />
                </marker>
              </defs>
              {sortedCells.map((cell) => renderCell(cell))}
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
