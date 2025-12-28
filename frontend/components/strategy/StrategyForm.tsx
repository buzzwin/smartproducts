'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Strategy, StrategyType, StrategyStatus, KeyResult } from '@/types';
import AIAssistant from '../AIAssistant';
import { Badge } from '@/components/ui/badge';

interface StrategyFormProps {
  strategy?: Strategy;
  productId: string;
  moduleId?: string;  // Optional - if provided, strategy will be module-specific
  moduleName?: string;  // Optional - module name for display
  onSubmit: (strategy: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

export default function StrategyForm({ strategy, productId, moduleId, moduleName, onSubmit, onCancel }: StrategyFormProps) {
  // Scope: 'product' or 'module' - default based on context
  // If editing, use the strategy's module_id to determine scope
  // If creating and moduleId is provided, this is a module-level form (always module scope)
  // If creating and moduleId is undefined, this is a product-level form (can choose)
  const [scope, setScope] = useState<'product' | 'module'>(
    strategy 
      ? (strategy.module_id ? 'module' : 'product')
      : (moduleId ? 'module' : 'product')
  );
  
  // When moduleId is provided and not editing, this form is for module-level strategies only
  // When moduleId is undefined, this form can create either product or module level
  const isModuleForm = !!moduleId && !strategy;
  
  // Ensure scope is 'module' when moduleId is provided (for module form)
  useEffect(() => {
    if (isModuleForm && scope !== 'module') {
      setScope('module');
    }
  }, [isModuleForm, scope]);
  const [type, setType] = useState<StrategyType>(strategy?.type || 'vision');
  const [title, setTitle] = useState(strategy?.title || '');
  const [description, setDescription] = useState(strategy?.description || '');
  const [status, setStatus] = useState<StrategyStatus>(strategy?.status || 'draft');
  const [targetDate, setTargetDate] = useState(
    strategy?.target_date ? strategy.target_date.split('T')[0] : ''
  );
  const [objectives, setObjectives] = useState<string[]>(strategy?.objectives || []);
  const [keyResults, setKeyResults] = useState<KeyResult[]>(strategy?.key_results || []);
  const [newObjective, setNewObjective] = useState('');
  const [newKR, setNewKR] = useState({ description: '', target: '', current: '' });
  const [loading, setLoading] = useState(false);

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleAddKeyResult = () => {
    if (newKR.description.trim() && newKR.target.trim()) {
      setKeyResults([...keyResults, { ...newKR, target: newKR.target, current: newKR.current || '' }]);
      setNewKR({ description: '', target: '', current: '' });
    }
  };

  const handleRemoveKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.type) setType(fields.type);
    if (fields.title) setTitle(fields.title);
    if (fields.description) setDescription(fields.description);
    if (fields.status) setStatus(fields.status);
    if (fields.target_date) setTargetDate(fields.target_date.split('T')[0]);
    if (fields.objectives && Array.isArray(fields.objectives)) {
      setObjectives(fields.objectives);
    }
    if (fields.key_results && Array.isArray(fields.key_results)) {
      setKeyResults(fields.key_results || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Determine module_id:
      // - If editing, preserve the existing module_id (don't change scope)
      // - If creating and moduleId prop is provided, use it (module-level)
      // - If creating and moduleId prop is undefined, use undefined (product-level)
      // - If creating without moduleId but scope is 'module', this shouldn't happen (scope selector disabled)
      let finalModuleId: string | undefined;
      
      if (strategy) {
        // Editing: preserve existing module_id
        finalModuleId = strategy.module_id;
      } else if (moduleId) {
        // Creating with moduleId prop: always module-level
        finalModuleId = moduleId;
      } else {
        // Creating without moduleId prop: always product-level
        finalModuleId = undefined;
      }
      
      const strategyPayload = {
        product_id: productId,
        module_id: finalModuleId,
        type,
        title,
        description: description || undefined,
        objectives: type === 'okr' ? objectives : undefined,
        key_results: type === 'okr' ? keyResults : undefined,
        status,
        target_date: targetDate ? new Date(targetDate).toISOString() : undefined,
      };
      
      console.log('StrategyForm - Submitting strategy:', {
        ...strategyPayload,
        module_id: finalModuleId,
        isModuleForm,
        moduleIdProp: moduleId,
        scope
      });
      
      // Double-check: if this is a module form, ensure module_id is set
      if (isModuleForm && !finalModuleId && moduleId) {
        console.warn('Module form but module_id not set, forcing it:', moduleId);
        strategyPayload.module_id = moduleId;
      }
      
      await onSubmit(strategyPayload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
      <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="text-lg font-semibold" style={{ flex: '1 1 200px', fontSize: 'clamp(16px, 4vw, 20px)' }}>
          {strategy ? 'Edit Strategy' : 'Create Strategy'}
        </h3>
        {!strategy && (
          <div style={{ flexShrink: 0 }}>
            <AIAssistant
              formType="strategy"
              context={{ 
                productId, 
                moduleId, 
                moduleName,
                strategyType: type, // Pass current strategy type (vision/strategy/okr)
                scope: isModuleForm ? 'module' : 'product'
              }}
              section="strategy"
              fieldOptions={{
                type: { options: ['vision', 'strategy', 'okr'], labels: { vision: 'Vision', strategy: 'Strategy', okr: 'OKR' } },
                status: { options: ['draft', 'active', 'archived'], labels: { draft: 'Draft', active: 'Active', archived: 'Archived' } }
              }}
              initialPrompt={
                isModuleForm && moduleName
                  ? `Create a vision, strategy, or OKR for the module "${moduleName}": `
                  : `Create a vision, strategy, or OKR: `
              }
              onFillFields={handleAIFill}
            />
          </div>
        )}
      </div>
      {/* Scope Selector - only show when creating and moduleId is not provided (allows switching) */}
      {/* When moduleId is provided, the scope is already determined (module-level) */}
      {!strategy && !isModuleForm && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
          <Label className="text-base font-semibold">Strategy Scope</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Choose whether this strategy applies to the entire product or a specific module.
          </p>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <input
                type="radio"
                id="scope-product"
                name="strategy-scope"
                value="product"
                checked={scope === 'product'}
                onChange={(e) => setScope(e.target.value as 'product' | 'module')}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="scope-product" className="font-normal cursor-pointer flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Product Level</span>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs">
                    Applies to entire product
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This strategy will be visible across all modules
                </p>
              </Label>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors opacity-50">
              <input
                type="radio"
                id="scope-module"
                name="strategy-scope"
                value="module"
                checked={scope === 'module'}
                onChange={(e) => setScope(e.target.value as 'product' | 'module')}
                disabled={true}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary cursor-not-allowed"
              />
              <Label 
                htmlFor="scope-module" 
                className="font-normal flex-1 cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">Module Level</span>
                  <Badge variant="outline" className="text-xs">
                    Use "Create Module Strategy" button
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  To create module-level strategies, use the "Create Module Strategy" button in the Module section below.
                </p>
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Show module info when creating module-level strategy */}
      {!strategy && isModuleForm && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              Module Strategy
            </Badge>
            <span className="text-sm font-medium text-foreground">
              This strategy will be created for: <strong>{moduleName || 'Selected Module'}</strong>
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This strategy will only apply to the "{moduleName || 'selected'}" module and will not be visible in other modules.
          </p>
        </div>
      )}

      {/* Show read-only scope indicator when editing */}
      {strategy && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Strategy Scope:</Label>
            {strategy.module_id ? (
              <Badge variant="secondary" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Module Level
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Product Level
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-2">
              (Scope cannot be changed after creation)
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select value={type} onValueChange={(value) => setType(value as StrategyType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vision">Vision</SelectItem>
            <SelectItem value="strategy">Strategy</SelectItem>
            <SelectItem value="okr">OKR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as StrategyStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetDate">Target Date</Label>
        <Input
          id="targetDate"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>

      {type === 'okr' && (
        <>
          <div className="space-y-4">
            <div>
              <Label>Objectives</Label>
              <div className="space-y-2 mt-2">
                {objectives.map((obj, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={obj} readOnly />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveObjective(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="New objective"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                  />
                  <Button type="button" onClick={handleAddObjective}>
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Key Results</Label>
              <div className="space-y-2 mt-2">
                {keyResults.map((kr, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex-1 space-y-1">
                      <Input value={kr.description} readOnly />
                      <div className="flex gap-2">
                        <Input value={kr.current || ''} placeholder="Current" readOnly />
                        <Input value={kr.target} placeholder="Target" readOnly />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveKeyResult(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder="Key result description"
                      value={newKR.description}
                      onChange={(e) => setNewKR({ ...newKR, description: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Current value"
                        value={newKR.current}
                        onChange={(e) => setNewKR({ ...newKR, current: e.target.value })}
                      />
                      <Input
                        placeholder="Target value"
                        value={newKR.target}
                        onChange={(e) => setNewKR({ ...newKR, target: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={handleAddKeyResult}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : strategy ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

