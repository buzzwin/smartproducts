'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Interview } from '@/types';

interface InterviewFormProps {
  interview?: Interview;
  productId: string;
  onSubmit: (interview: Omit<Interview, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

export default function InterviewForm({ interview, productId, onSubmit, onCancel }: InterviewFormProps) {
  const [intervieweeName, setIntervieweeName] = useState(interview?.interviewee_name || '');
  const [intervieweeEmail, setIntervieweeEmail] = useState(interview?.interviewee_email || '');
  const [date, setDate] = useState(
    interview?.date ? interview.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(interview?.notes || '');
  const [insightIds, setInsightIds] = useState<string[]>(interview?.insight_ids || []);
  const [newInsightId, setNewInsightId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddInsight = () => {
    if (newInsightId.trim() && !insightIds.includes(newInsightId.trim())) {
      setInsightIds([...insightIds, newInsightId.trim()]);
      setNewInsightId('');
    }
  };

  const handleRemoveInsight = (id: string) => {
    setInsightIds(insightIds.filter(i => i !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        product_id: productId,
        interviewee_name: intervieweeName,
        interviewee_email: intervieweeEmail || undefined,
        date: new Date(date).toISOString(),
        notes: notes || undefined,
        insight_ids: insightIds,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="intervieweeName">Interviewee Name</Label>
        <Input
          id="intervieweeName"
          value={intervieweeName}
          onChange={(e) => setIntervieweeName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="intervieweeEmail">Interviewee Email</Label>
        <Input
          id="intervieweeEmail"
          type="email"
          value={intervieweeEmail}
          onChange={(e) => setIntervieweeEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Interview Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label>Linked Insights</Label>
        <div className="space-y-2">
          {insightIds.map((id) => (
            <div key={id} className="flex items-center gap-2">
              <Input value={id} readOnly />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemoveInsight(id)}
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Insight ID"
              value={newInsightId}
              onChange={(e) => setNewInsightId(e.target.value)}
            />
            <Button type="button" onClick={handleAddInsight}>
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : interview ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

