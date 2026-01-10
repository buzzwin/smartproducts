'use client';

import { useState, useEffect } from 'react';
import { vendorsAPI } from '@/lib/api';
import type { Vendor } from '@/types';
import VendorForm from './VendorForm';
import VendorList from './VendorList';
import Modal from './Modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface VendorSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export default function VendorSelector({ value, onValueChange, disabled }: VendorSelectorProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  useEffect(() => {
    loadVendors();
    
    // Listen for vendor creation/update events
    const handleVendorCreated = () => {
      loadVendors();
    };
    
    const handleVendorUpdated = () => {
      loadVendors();
    };
    
    window.addEventListener('vendorCreated', handleVendorCreated);
    window.addEventListener('vendorUpdated', handleVendorUpdated);
    
    return () => {
      window.removeEventListener('vendorCreated', handleVendorCreated);
      window.removeEventListener('vendorUpdated', handleVendorUpdated);
    };
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vendorsAPI.getAll();
      setVendors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadVendors();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Select
            value={value || "none"}
            onValueChange={(val) => onValueChange(val === "none" ? "" : val)}
            disabled={disabled || loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading vendors..." : "Select a vendor"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No vendor</SelectItem>
              {vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No vendors available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          disabled={disabled}
        >
          + Create
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowManageModal(true)}
          disabled={disabled}
        >
          Manage
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}
      
      {!loading && vendors.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No vendors found. Click "Create" to add one.
        </p>
      )}

      {/* Create Vendor Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Vendor"
      >
        <VendorForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Manage Vendors Modal */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Manage Vendors"
      >
        <VendorList
          onUpdate={() => {
            loadVendors();
          }}
        />
      </Modal>
    </div>
  );
}

