'use client';

import { useState, useEffect } from 'react';
import { modulesAPI } from '@/lib/api';
import type { Module, ModuleStatus, CostClassification } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@clerk/nextjs';
import AIAssistant from '../AIAssistant';

interface ModuleFormProps {
  module: Module | null;
  productId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const WORKFLOW_STEPS = [
  'overview',
  'strategy',
  'discovery',
  'prioritization',
  'roadmap',
  'execution',
  'stakeholders',
  'metrics',
  'cost',
] as const;

const MODULE_STATUSES: ModuleStatus[] = [
  'ideation',
  'in_development',
  'production',
  'maintenance',
  'archived',
];

export default function ModuleForm({ module, productId, onSuccess, onCancel }: ModuleFormProps) {
  const { user } = useUser();
  const [name, setName] = useState(module?.name || '');
  const [description, setDescription] = useState(module?.description || '');
  const [status, setStatus] = useState<ModuleStatus>(module?.status || 'ideation');
  const [isDefault, setIsDefault] = useState(module?.is_default || false);
  const [cost_classification, setCost_classification] = useState<CostClassification | ''>(module?.cost_classification || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.name) setName(fields.name);
    if (fields.description) setDescription(fields.description);
    if (fields.status && MODULE_STATUSES.includes(fields.status as ModuleStatus)) {
      setStatus(fields.status as ModuleStatus);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const moduleData: Omit<Module, 'id' | 'created_at' | 'updated_at'> = {
        product_id: productId || module?.product_id || '',
        name,
        description: description || undefined,
        owner_id: user?.id || module?.owner_id || undefined,
        is_default: isDefault,
        status: status,
        enabled_steps: module?.enabled_steps || ['strategy', 'discovery', 'execution', 'stakeholders', 'metrics', 'cost'],
        step_order: module?.step_order || [...WORKFLOW_STEPS],
        layout_config: undefined,
        settings: undefined,
        cost_classification: cost_classification || undefined,
      };

      if (module) {
        await modulesAPI.update(module.id, moduleData);
      } else {
        await modulesAPI.create(moduleData);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save module');
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <h3 style={{ margin: 0, flex: '1 1 200px', fontSize: 'clamp(16px, 4vw, 20px)' }}>
          {module ? 'Edit Module' : 'Create Module'}
        </h3>
        {!module && (
          <div style={{ flexShrink: 0 }}>
            <AIAssistant
              formType="module"
              context={{ module, productId }}
              fieldOptions={{
                status: {
                  options: MODULE_STATUSES,
                  labels: {
                    ideation: 'Ideation',
                    in_development: 'In Development',
                    production: 'Production',
                    maintenance: 'Maintenance',
                    archived: 'Archived',
                  },
                },
              }}
              onFillFields={handleAIFill}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm p-3 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="status">Status *</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as ModuleStatus)}
          required
        >
          <SelectTrigger id="status" className="mt-1">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {MODULE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {productId && (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_default"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="is_default" className="cursor-pointer">
            Set as default module for this product
          </Label>
        </div>
      )}

      <div>
        <Label htmlFor="cost_classification">Cost Classification (Optional)</Label>
        <Select
          value={cost_classification}
          onValueChange={(value) => setCost_classification(value as CostClassification | '')}
        >
          <SelectTrigger id="cost_classification" className="mt-1">
            <SelectValue placeholder="Select classification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not specified</SelectItem>
            <SelectItem value="run">Run/KTLO (Keep The Lights On)</SelectItem>
            <SelectItem value="change">Change/Growth (New Feature Development)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Run/KTLO = Ongoing maintenance. Change/Growth = New feature development.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : module ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

