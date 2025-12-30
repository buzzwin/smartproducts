"use client";

import { useState, useEffect } from "react";
import { phasesAPI } from "@/lib/api";
import type { Phase } from "@/types";
import PhaseForm from "./PhaseForm";
import Modal from "./Modal";

export default function PhaseList({
  onUpdate,
}: {
  onUpdate?: () => void;
}) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPhases();
  }, []);

  const loadPhases = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await phasesAPI.getAll();
      // Sort by order, then by name
      const sorted = data.sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return a.name.localeCompare(b.name);
      });
      setPhases(sorted);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load phases"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this phase?")) {
      return;
    }

    try {
      setDeletingId(id);
      await phasesAPI.delete(id);
      await loadPhases();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete phase");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading phases...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "24px" }}>Phases</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          + Add Phase
        </button>
      </div>

      {phases.length === 0 ? (
        <p style={{ color: "#666", textAlign: "center", padding: "20px" }}>
          No phases found. Create your first phase!
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Description</th>
              <th style={{ width: "150px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => (
              <tr key={phase.id}>
                <td style={{ fontWeight: 500 }}>{phase.order}</td>
                <td style={{ fontWeight: 500 }}>{phase.name}</td>
                <td>{phase.description || "-"}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => setEditingPhase(phase)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#007bff",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginRight: "8px",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(phase.id)}
                    disabled={deletingId === phase.id}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor:
                        deletingId === phase.id ? "#ccc" : "#dc3545",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor:
                        deletingId === phase.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {deletingId === phase.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Phase"
      >
        <PhaseForm
          onSuccess={() => {
            setShowCreateModal(false);
            loadPhases();
            if (onUpdate) onUpdate();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingPhase}
        onClose={() => setEditingPhase(null)}
        title="Edit Phase"
      >
        {editingPhase && (
          <PhaseForm
            phase={editingPhase}
            onSuccess={() => {
              setEditingPhase(null);
              loadPhases();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setEditingPhase(null)}
          />
        )}
      </Modal>
    </div>
  );
}

