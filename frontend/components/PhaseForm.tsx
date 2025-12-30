"use client";

import { useState } from "react";
import { phasesAPI } from "@/lib/api";
import type { Phase } from "@/types";

interface PhaseFormProps {
  phase?: Phase;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PhaseForm({
  phase,
  onSuccess,
  onCancel,
}: PhaseFormProps) {
  const [name, setName] = useState(phase?.name || "");
  const [description, setDescription] = useState(phase?.description || "");
  const [order, setOrder] = useState<number>(phase?.order || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const phaseData = {
        name,
        description: description || undefined,
        order,
      };

      if (phase) {
        await phasesAPI.update(phase.id, phaseData);
      } else {
        await phasesAPI.create(phaseData);
      }
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save phase"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
      <h3 style={{ marginBottom: "20px" }}>
        {phase ? "Edit Phase" : "Create Phase"}
      </h3>

      {error && (
        <div
          className="error"
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}
        >
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}
        >
          Order *
        </label>
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
          required
          min={0}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />
        <p
          style={{
            marginTop: "4px",
            fontSize: "12px",
            color: "#666",
          }}
        >
          Lower numbers appear first. Used for sorting phases.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginTop: "24px",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#6c757d",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: loading ? "#ccc" : "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          {loading ? "Saving..." : phase ? "Update Phase" : "Create Phase"}
        </button>
      </div>
    </form>
  );
}

