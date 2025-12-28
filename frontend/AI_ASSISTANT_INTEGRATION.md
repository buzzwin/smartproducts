# AI Assistant Integration Guide

This guide shows how to add the AI Assistant to any form component.

## Quick Integration Pattern

### 1. Import the AIAssistant component

```typescript
import AIAssistant from './AIAssistant';
```

### 2. Create a handler function

```typescript
const handleAIFill = (fields: Record<string, any>) => {
  if (fields.fieldName) setFieldName(fields.fieldName);
  if (fields.anotherField) setAnotherField(fields.anotherField);
  // ... map all form fields
};
```

### 3. Add the AI Assistant button to your form header

```typescript
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <h3>Form Title</h3>
  {!existingItem && ( // Only show for new items, not edits
    <AIAssistant
      formType="form_type_name"
      context={{ /* relevant context like product, etc. */ }}
      onFillFields={handleAIFill}
    />
  )}
</div>
```

## Form Types Supported

The following form types are configured in the AI assistant:

- `product` - Product creation
- `feature` - Feature creation with RICE scoring
- `task` - Task creation with estimates
- `strategy` - Strategy, vision, and OKR creation
- `problem` - Problem statement creation
- `interview` - Customer interview tracking
- `capability` - Capability definition
- `resource` - Resource creation
- `cost_item` - Cost item creation

## Example: Adding to a New Form

Here's a complete example for a hypothetical "Release" form:

```typescript
'use client';

import { useState } from 'react';
import AIAssistant from './AIAssistant';

export default function ReleaseForm({ release, productId, onSuccess, onCancel }) {
  const [name, setName] = useState(release?.name || '');
  const [description, setDescription] = useState(release?.description || '');
  const [targetDate, setTargetDate] = useState(release?.target_date || '');

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.name) setName(fields.name);
    if (fields.description) setDescription(fields.description);
    if (fields.target_date) setTargetDate(fields.target_date);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>{release ? 'Edit Release' : 'Create Release'}</h3>
        {!release && (
          <AIAssistant
            formType="release"
            context={{ productId }}
            onFillFields={handleAIFill}
          />
        )}
      </div>
      {/* ... rest of form fields ... */}
    </form>
  );
}
```

## Adding New Form Types

To add support for a new form type:

1. **Update the API route** (`frontend/app/api/ai/assist/route.ts`):
   - Add a new case in the `buildSystemPrompt` function
   - Define the fields and their types
   - Provide example JSON structure

2. **Use the form type** in your component:
   ```typescript
   <AIAssistant formType="your_new_type" ... />
   ```

## Best Practices

1. **Only show for new items**: Don't show AI assistant when editing existing items
2. **Provide context**: Pass relevant context (product, user, etc.) to help AI generate better suggestions
3. **Validate AI output**: Always validate and allow users to adjust AI-filled fields
4. **Handle errors gracefully**: Show user-friendly error messages if AI fails

## Context Examples

```typescript
// Product context
context={{ product: currentProduct }}

// Product ID context
context={{ productId: product.id }}

// Multiple context items
context={{ 
  product: currentProduct,
  existingFeatures: features,
  teamMembers: resources
}}
```

The more context you provide, the better the AI suggestions will be!

