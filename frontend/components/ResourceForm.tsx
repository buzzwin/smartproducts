'use client';

import { useState } from 'react';
import { resourcesAPI } from '@/lib/api';
import type { Resource, ResourceType } from '@/types';

interface ResourceFormProps {
  resource?: Resource;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ResourceForm({ resource, onSuccess, onCancel }: ResourceFormProps) {
  const [name, setName] = useState(resource?.name || '');
  const [type, setType] = useState<ResourceType>(resource?.type || 'individual');
  const [skills, setSkills] = useState<string[]>(resource?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [email, setEmail] = useState(resource?.email || '');
  const [description, setDescription] = useState(resource?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSkill = () => {
    const skill = skillInput.trim();
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSkillInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const resourceData = {
        name,
        type,
        skills,
        email: email || undefined,
        description: description || undefined,
      };

      if (resource) {
        await resourcesAPI.update(resource.id, resourceData);
      } else {
        await resourcesAPI.create(resourceData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '20px' }}>{resource ? 'Edit Resource' : 'Create Resource'}</h3>
      
      {error && (
        <div className="error" style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Type *
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ResourceType)}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          <option value="individual">Individual</option>
          <option value="organization">Organization</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Skills
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillInputKeyDown}
            placeholder="Add a skill and press Enter"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <button
            type="button"
            onClick={handleAddSkill}
            disabled={!skillInput.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: skillInput.trim() ? '#007bff' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: skillInput.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add
          </button>
        </div>
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {skills.map((skill) => (
              <span
                key={skill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  backgroundColor: '#e7f3ff',
                  color: '#0066cc',
                  borderRadius: '16px',
                  fontSize: '13px',
                }}
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0066cc',
                    cursor: 'pointer',
                    fontSize: '16px',
                    lineHeight: 1,
                    padding: 0,
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

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Email (optional)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: loading || !name.trim() ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Saving...' : resource ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

