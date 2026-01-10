"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Edit, Code, Sparkles } from "lucide-react";
import DrawIOEditor from "./DrawIOEditor";
import AIAssistant from "../AIAssistant";

interface DiagramInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function DiagramInput({
  value,
  onChange,
  label = "Diagram XML",
}: DiagramInputProps) {
  const [editorMode, setEditorMode] = useState<"textarea" | "editor">(
    "textarea"
  );
  const [xmlError, setXmlError] = useState<string | null>(null);
  const [editorXml, setEditorXml] = useState(value);

  // Sync value prop changes to editorXml state when in editor mode
  // This ensures the visual editor stays in sync with external changes
  useEffect(() => {
    if (editorMode === "editor") {
      // Only sync if value is actually different and not empty/invalid
      const trimmedValue = value?.trim() || "";
      const trimmedEditorXml = editorXml?.trim() || "";

      // If value is empty or invalid, don't force sync (let editor keep its state)
      if (
        trimmedValue &&
        trimmedValue.startsWith("<") &&
        trimmedValue !== trimmedEditorXml
      ) {
        setEditorXml(value);
      } else if (!trimmedValue && trimmedEditorXml) {
        // If value becomes empty, clear editorXml
        setEditorXml("");
      }
    }
  }, [value, editorMode, editorXml]);

  // Helper function to fix common XML issues
  const fixXmlIssues = (xml: string): string => {
    let fixed = xml;

    // Fix stray characters between tags (like periods, spaces after closing >)
    // Pattern: >.   < or >. < -> > <
    fixed = fixed.replace(/>\s*\.\s*</g, "><");
    fixed = fixed.replace(/>\s+</g, "><"); // Remove excessive whitespace between tags

    // Fix trailing &quot; entities in value attributes (like Due: 1/24/2026&quot;")
    // This is a common issue where &quot; appears at the end before the closing quote
    // Pattern: value="...&quot;" -> value="..."
    // Use a more flexible approach to catch this pattern
    fixed = fixed.replace(
      /value="([^"]*?)(&quot;)+"([^>]*>)/g,
      (match, content, quotes, rest) => {
        // Remove trailing &quot; entities
        const cleaned = content.replace(/&quot;+$/, "");
        return `value="${cleaned}"${rest}`;
      }
    );

    // Also handle cases where &quot; appears right before the closing quote
    // More aggressive fix: find any value="..."&quot;" pattern
    fixed = fixed.replace(
      /value="([^"]*?)&quot;"([^>]*>)/g,
      (match, content, rest) => {
        // Remove the trailing &quot; before closing quote
        return `value="${content}"${rest}`;
      }
    );

    // Fix unescaped quotes in attribute values
    fixed = fixed.replace(
      /value="([^"]*)"([^>]*>)/g,
      (match, content, rest) => {
        // If content has unescaped quotes (not &quot;), escape them
        if (content.includes('"') && !content.includes("&quot;")) {
          const escaped = content.replace(/"/g, "&quot;");
          return `value="${escaped}"${rest}`;
        }
        return match;
      }
    );

    // Fix trailing literal quotes in value attributes (like Due: 1/24/2026")
    fixed = fixed.replace(
      /value="([^"]*)"([^>]*>)/g,
      (match, content, rest) => {
        // Remove trailing quote if it exists
        const cleaned = content.replace(/"$/, "");
        return `value="${cleaned}"${rest}`;
      }
    );

    return fixed;
  };

  const handleChange = (newValue: string) => {
    // Try to fix common XML issues first
    let fixedValue = fixXmlIssues(newValue);

    // Only update if we actually fixed something
    if (fixedValue !== newValue) {
      onChange(fixedValue);
      setEditorXml(fixedValue);
      newValue = fixedValue; // Use fixed value for validation
    } else {
      onChange(newValue);
      setEditorXml(newValue);
    }

    // Basic XML validation
    if (newValue.trim()) {
      try {
        // Use the (potentially fixed) value for validation
        let xmlToValidate = newValue;

        // Attempt to fix and re-validate
        const parser = new DOMParser();
        let xmlDoc = parser.parseFromString(xmlToValidate, "text/xml");
        let parserError = xmlDoc.querySelector("parsererror");

        // If there's an error, try fixing common issues
        if (parserError) {
          xmlToValidate = fixXmlIssues(newValue);
          xmlDoc = parser.parseFromString(xmlToValidate, "text/xml");
          parserError = xmlDoc.querySelector("parsererror");

          // If still has error, show it but be more lenient
          if (parserError) {
            const errorText = parserError.textContent || "Invalid XML format";
            // Check if it's a minor issue we can ignore
            if (
              errorText.includes("quote") ||
              errorText.includes("attribute")
            ) {
              // Try one more time with a more aggressive fix
              xmlToValidate = xmlToValidate.replace(
                /value="([^"]*)"([^>]*>)/g,
                (match, content, rest) => {
                  // Remove any quotes from content and escape properly
                  const cleaned = content
                    .replace(/"/g, "")
                    .replace(/&quot;/g, '"');
                  return `value="${cleaned}"${rest}`;
                }
              );
              xmlDoc = parser.parseFromString(xmlToValidate, "text/xml");
              parserError = xmlDoc.querySelector("parsererror");
            }

            if (parserError) {
              setXmlError(`XML parsing error: ${errorText.substring(0, 100)}`);
              return;
            } else {
              // Fixed! Update the value
              onChange(xmlToValidate);
              setEditorXml(xmlToValidate);
            }
          } else {
            // Fixed! Update the value
            onChange(xmlToValidate);
            setEditorXml(xmlToValidate);
          }
        }

        // Check if it's a Draw.io XML
        const mxGraphModel = xmlDoc.querySelector("mxGraphModel");
        if (!mxGraphModel) {
          setXmlError("Not a valid Draw.io XML (missing mxGraphModel)");
        } else {
          setXmlError(null);
        }
      } catch (err) {
        setXmlError(
          `Failed to parse XML: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    } else {
      setXmlError(null);
    }
  };

  const handleEditorXmlChange = (xml: string) => {
    setEditorXml(xml);
    onChange(xml);
    // Clear error when XML comes from editor (assumed valid)
    setXmlError(null);
  };

  const handleToggleMode = () => {
    if (editorMode === "textarea") {
      // Switching to editor mode - sync current value to editorXml
      // This will trigger DrawIOEditor to load the XML
      const currentValue = value || "";
      setEditorXml(currentValue);
      setEditorMode("editor");
    } else {
      // Switching to textarea mode - sync editor value to textarea
      // The editorXml should already be up-to-date from autosave/save events
      // But we'll use it if it exists and is different from current value
      const valueToUse = editorXml && editorXml.trim() ? editorXml : value;
      if (valueToUse !== value && valueToUse.trim()) {
        onChange(valueToUse);
      }
      setEditorMode("textarea");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="diagram-xml">{label}</Label>
          <div className="flex items-center gap-2">
            {editorMode === "textarea" && (
              <AIAssistant
                formType="diagram"
                context={{}}
                onFillFields={(fields) => {
                  if (fields.diagram_xml || fields.xml) {
                    const generatedXml = fields.diagram_xml || fields.xml;
                    handleChange(generatedXml);
                  }
                }}
                className="flex items-center gap-2"
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleMode}
              className="flex items-center gap-2"
              title={
                editorMode === "textarea"
                  ? "Switch to Visual Editor"
                  : "Switch to XML Editor"
              }
            >
              {editorMode === "textarea" ? (
                <>
                  <Edit className="h-4 w-4" />
                  Visual Editor
                </>
              ) : (
                <>
                  <Code className="h-4 w-4" />
                  XML Editor
                </>
              )}
            </Button>
          </div>
        </div>

        {editorMode === "textarea" ? (
          <>
            <Textarea
              id="diagram-xml"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Paste your Draw.io XML here..."
              className="min-h-[200px] font-mono text-sm"
            />
            {xmlError && <p className="text-sm text-red-500">{xmlError}</p>}
            {!xmlError && value && value.trim() && (
              <p className="text-sm text-green-600">Valid Draw.io XML</p>
            )}
            <p className="text-xs text-muted-foreground">
              Paste the XML content from Draw.io, or switch to Visual Editor to
              create/edit diagrams visually.
            </p>
          </>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <DrawIOEditor
              xmlContent={editorXml || ""}
              onXmlChange={handleEditorXmlChange}
            />
            {(!editorXml || !editorXml.trim()) && (
              <div className="p-4 bg-blue-50 border-t">
                <p className="text-sm text-blue-700">
                  Start creating your diagram in the editor above. When you're
                  done, click "Save" in the editor to save your changes.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
