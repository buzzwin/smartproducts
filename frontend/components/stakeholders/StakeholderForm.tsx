'use client';

import { useState } from 'react';
import { stakeholdersAPI } from '@/lib/api';
import type { Stakeholder } from '@/types';
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

interface StakeholderFormProps {
  stakeholder?: Stakeholder;
  productId: string;
  moduleId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StakeholderForm({ stakeholder, productId, moduleId, onSuccess, onCancel }: StakeholderFormProps) {
  const [name, setName] = useState(stakeholder?.name || '');
  const [email, setEmail] = useState(stakeholder?.email || '');
  const [companyName, setCompanyName] = useState(stakeholder?.company_name || '');
  const [role, setRole] = useState(stakeholder?.role || '');
  const [influenceLevel, setInfluenceLevel] = useState<string>(stakeholder?.influence_level || 'none');
  const [interests, setInterests] = useState<string[]>(stakeholder?.interests || []);
  const [interestInput, setInterestInput] = useState('');
  const [communicationPreferences, setCommunicationPreferences] = useState(stakeholder?.communication_preferences || '');
  const [updateFrequency, setUpdateFrequency] = useState<string>(stakeholder?.update_frequency || 'none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddInterest = () => {
    const interest = interestInput.trim();
    if (interest && !interests.includes(interest)) {
      setInterests([...interests, interest]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterests(interests.filter(i => i !== interestToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const stakeholderData = {
        product_id: productId,
        module_id: moduleId || undefined,
        name,
        email,
        company_name: companyName || undefined,
        role: role || undefined,
        influence_level: influenceLevel && influenceLevel !== 'none' ? influenceLevel : undefined,
        interests: interests.length > 0 ? interests : undefined,
        communication_preferences: communicationPreferences || undefined,
        update_frequency: updateFrequency && updateFrequency !== 'none' ? updateFrequency : undefined,
      };

      if (stakeholder) {
        await stakeholdersAPI.update(stakeholder.id, stakeholderData);
      } else {
        await stakeholdersAPI.create(stakeholderData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stakeholder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <h3 style={{ margin: 0, flex: '1 1 200px', fontSize: 'clamp(16px, 4vw, 20px)' }}>
          {stakeholder ? 'Edit Stakeholder' : 'Create Stakeholder'}
        </h3>
      </div>
      
      {error && (
        <div className="error" style={{ 
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c33',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Label htmlFor="company_name">Company Name</Label>
        <Input
          id="company_name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g., Acme Corp, Tech Solutions Inc"
          className="mt-1"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Product Manager, Engineering Lead"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="influence_level">Influence Level</Label>
          <Select
            value={influenceLevel}
            onValueChange={(value) => setInfluenceLevel(value)}
          >
            <SelectTrigger id="influence_level" className="mt-1">
              <SelectValue placeholder="Select influence level" />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              <SelectItem value="none">Not specified</SelectItem>
              <SelectItem value="low">Low - Limited influence on decisions</SelectItem>
              <SelectItem value="medium">Medium - Moderate influence on decisions</SelectItem>
              <SelectItem value="high">High - Significant influence on decisions</SelectItem>
              <SelectItem value="critical">Critical - Key decision maker</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="update_frequency">Update Frequency</Label>
          <Select
            value={updateFrequency}
            onValueChange={(value) => setUpdateFrequency(value)}
          >
            <SelectTrigger id="update_frequency" className="mt-1">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              <SelectItem value="none">Not specified</SelectItem>
              <SelectItem value="daily">Daily - Every day</SelectItem>
              <SelectItem value="weekly">Weekly - Once per week</SelectItem>
              <SelectItem value="biweekly">Biweekly - Every two weeks</SelectItem>
              <SelectItem value="monthly">Monthly - Once per month</SelectItem>
              <SelectItem value="quarterly">Quarterly - Once per quarter</SelectItem>
              <SelectItem value="on_release">On Release - When releases are published</SelectItem>
              <SelectItem value="as_needed">As Needed - On-demand updates</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Label htmlFor="interests">Areas of Interest</Label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', marginTop: '8px' }}>
          <Input
            id="interests"
            type="text"
            value={interestInput}
            onChange={(e) => setInterestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddInterest();
              }
            }}
            placeholder="Add an interest and press Enter"
          />
          <button
            type="button"
            onClick={handleAddInterest}
            disabled={!interestInput.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: interestInput.trim() ? '#007bff' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: interestInput.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add
          </button>
        </div>
        {interests.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {interests.map((interest, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  backgroundColor: '#e7f3ff',
                  borderRadius: '16px',
                  fontSize: '14px',
                }}
              >
                {interest}
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(interest)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#666',
                    padding: '0',
                    marginLeft: '4px',
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Label htmlFor="communication_preferences">Communication Preferences</Label>
        <Textarea
          id="communication_preferences"
          value={communicationPreferences}
          onChange={(e) => setCommunicationPreferences(e.target.value)}
          rows={3}
          placeholder="e.g., Prefers email updates, weekly sync meetings"
          className="mt-1"
        />
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            minWidth: '80px',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim() || !email.trim()}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: loading || !name.trim() || !email.trim() ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !name.trim() || !email.trim() ? 'not-allowed' : 'pointer',
            minWidth: '80px',
          }}
        >
          {loading ? 'Saving...' : stakeholder ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

