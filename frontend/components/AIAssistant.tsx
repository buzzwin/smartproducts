'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface FieldOption {
  options: string[];
  labels?: Record<string, string>;
}

interface AIAssistantProps {
  formType: string;
  context?: any;
  fieldOptions?: Record<string, FieldOption>;
  section?: string; // e.g., 'strategy', 'discovery', 'prioritization', etc.
  onFillFields: (fields: Record<string, any>) => void;
  className?: string;
  initialPrompt?: string; // Pre-populate the prompt textarea
}

export default function AIAssistant({ 
  formType, 
  context, 
  fieldOptions,
  section,
  onFillFields,
  className,
  initialPrompt = ''
}: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<Record<string, any> | null>(null);
  const [editableData, setEditableData] = useState<Record<string, any> | null>(null);
  const [lastAutoPrompt, setLastAutoPrompt] = useState<string>(initialPrompt);
  
  // Update prompt when initialPrompt changes - only if user hasn't manually edited
  useEffect(() => {
    if (initialPrompt && initialPrompt !== lastAutoPrompt) {
      // Only update if prompt is empty or matches the previous auto-generated prompt
      if (!prompt || prompt === lastAutoPrompt || prompt.trim() === '') {
        setPrompt(initialPrompt);
        setLastAutoPrompt(initialPrompt);
      }
    }
  }, [initialPrompt, lastAutoPrompt, prompt]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Extract productId from context
      const productId = context?.productId || context?.product?.id || context?.product_id;
      
      console.log('Calling AI assistant API...', { prompt, formType, context, productId });
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          formType,
          context,
          fieldOptions,
          section,
          productId, // Add productId for shared memory
        }),
      });

      console.log('AI assistant response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const result = await response.json();
      console.log('AI assistant response data:', result);
      
      if (result.data) {
        setReviewData(result.data);
        setEditableData({ ...result.data });
      } else {
        throw new Error('No data received from AI assistant');
      }
    } catch (err) {
      console.error('AI assistant error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (editableData) {
      onFillFields(editableData);
      setOpen(false);
      setPrompt('');
      setReviewData(null);
      setEditableData(null);
    }
  };

  const handleCancelReview = () => {
    setReviewData(null);
    setEditableData(null);
    setPrompt('');
  };

  const updateEditableField = (key: string, value: any) => {
    if (editableData) {
      setEditableData({ ...editableData, [key]: value });
    }
  };

  const getFormTypeLabel = () => {
    const labels: Record<string, string> = {
      product: 'Product',
      feature: 'Feature',
      task: 'Task',
      strategy: 'Strategy',
      problem: 'Problem',
      interview: 'Interview',
      resource: 'Resource',
      cost_item: 'Cost Item',
    };
    return labels[formType] || formType;
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 500,
          backgroundColor: '#fff',
          color: '#333',
          border: '1px solid #ddd',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f8f9fa';
          e.currentTarget.style.borderColor = '#007bff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.borderColor = '#ddd';
        }}
      >
        <Sparkles style={{ width: '16px', height: '16px' }} />
        <span>AI Assist</span>
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
          onClick={() => {
            setOpen(false);
            setPrompt('');
            setError(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              padding: 'clamp(16px, 4vw, 24px)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
                AI Assistant - {getFormTypeLabel()}
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Describe what you want to create or fill in, and AI will help populate the form fields.
              </p>
            </div>
            
            {!reviewData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                    Describe what you want to create
                  </label>
                  <textarea
                    placeholder="Describe what you want to create..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    rows={5}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    Describe the {getFormTypeLabel().toLowerCase()} you want to create. Be as specific as possible.
                  </p>
                </div>

                {error && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#c33',
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: '8px', 
                  marginTop: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpen(false);
                      setPrompt('');
                      setError(null);
                    }}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      backgroundColor: '#6c757d',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      minWidth: '80px',
                      flex: '1 1 auto',
                      maxWidth: '150px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSubmit();
                    }}
                    disabled={loading || !prompt.trim()}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      backgroundColor: loading || !prompt.trim() ? '#ccc' : '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: loading || !prompt.trim() ? 0.6 : 1,
                      minWidth: '80px',
                      flex: '1 1 auto',
                      maxWidth: '150px',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#e7f3ff',
                  border: '1px solid #b3d9ff',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#0066cc',
                }}>
                  <strong>Review AI-generated data:</strong> Please review and edit the fields below before applying them to the form.
                </div>

                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '16px',
                  backgroundColor: '#fafafa',
                }}>
                  {editableData && Object.entries(editableData).map(([key, value]) => {
                    // Special handling for objectives (array of strings)
                    if (key === 'objectives' && Array.isArray(value) && value.every(v => typeof v === 'string')) {
                      return (
                        <div key={key} style={{ marginBottom: '16px' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '6px', 
                            fontWeight: 600,
                            fontSize: '13px',
                            color: '#333',
                            textTransform: 'capitalize',
                          }}>
                            {key.replace(/_/g, ' ')}
                          </label>
                          <textarea
                            value={value.join('\n')}
                            onChange={(e) => {
                              const lines = e.target.value.split('\n').filter(line => line.trim());
                              updateEditableField(key, lines);
                            }}
                            placeholder="Enter one objective per line"
                            rows={Math.max(value.length, 3)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '13px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                              fontFamily: 'inherit',
                            }}
                          />
                          <p style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                            One objective per line
                          </p>
                        </div>
                      );
                    }
                    
                    // Special handling for key_results (array of objects with description and target)
                    if (key === 'key_results' && Array.isArray(value) && value.every(v => typeof v === 'object' && v !== null)) {
                      return (
                        <div key={key} style={{ marginBottom: '16px' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '6px', 
                            fontWeight: 600,
                            fontSize: '13px',
                            color: '#333',
                            textTransform: 'capitalize',
                          }}>
                            {key.replace(/_/g, ' ')}
                          </label>
                          <textarea
                            value={value.map((kr: any, idx: number) => {
                              const desc = kr.description || '';
                              const target = kr.target || '';
                              return `${idx + 1}. ${desc} (Target: ${target})`;
                            }).join('\n\n')}
                            onChange={(e) => {
                              const lines = e.target.value.split('\n\n').filter(block => block.trim());
                              const parsed = lines.map((line, idx) => {
                                const match = line.match(/^\d+\.\s*(.+?)\s*\(Target:\s*(.+?)\)$/);
                                if (match) {
                                  return { description: match[1].trim(), target: match[2].trim() };
                                }
                                // Fallback: treat whole line as description
                                const simpleMatch = line.replace(/^\d+\.\s*/, '');
                                return { description: simpleMatch.trim(), target: '' };
                              });
                              updateEditableField(key, parsed);
                            }}
                            placeholder="Format: 1. Description (Target: value)&#10;&#10;2. Description (Target: value)"
                            rows={Math.max(value.length * 2, 4)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '13px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                              fontFamily: 'inherit',
                            }}
                          />
                          <p style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                            Format: Number. Description (Target: value). Separate key results with blank lines.
                          </p>
                        </div>
                      );
                    }
                    
                    // Default handling for other field types
                    return (
                      <div key={key} style={{ marginBottom: '16px' }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '6px', 
                          fontWeight: 600,
                          fontSize: '13px',
                          color: '#333',
                          textTransform: 'capitalize',
                        }}>
                          {key.replace(/_/g, ' ')}
                        </label>
                        {typeof value === 'object' && value !== null && !Array.isArray(value) ? (
                          <textarea
                            value={JSON.stringify(value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updateEditableField(key, parsed);
                              } catch {
                                // Invalid JSON, keep as string
                              }
                            }}
                            rows={4}
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '13px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : Array.isArray(value) ? (
                          <textarea
                            value={JSON.stringify(value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updateEditableField(key, parsed);
                              } catch {
                                // Invalid JSON, keep as string
                              }
                            }}
                            rows={Math.min(value.length + 1, 6)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '13px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : typeof value === 'string' && value.length > 100 ? (
                          <textarea
                            value={value}
                            onChange={(e) => updateEditableField(key, e.target.value)}
                            rows={4}
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '13px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          <input
                            type={typeof value === 'number' ? 'number' : 'text'}
                            value={value || ''}
                            onChange={(e) => {
                              const newValue = typeof value === 'number' 
                                ? parseFloat(e.target.value) || 0
                                : e.target.value;
                              updateEditableField(key, newValue);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '13px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={handleCancelReview}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      backgroundColor: '#6c757d',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      minWidth: '80px',
                      flex: '1 1 auto',
                      maxWidth: '150px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      minWidth: '80px',
                      flex: '1 1 auto',
                      maxWidth: '150px',
                    }}
                  >
                    ✓ Apply to Form
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

