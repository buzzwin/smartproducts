# AI Assistant Architecture

## Overview

The AI Assistant is a context-aware form-filling system that uses Google's Gemini API to help users create product management artifacts (products, features, tasks, strategies, etc.) through natural language descriptions. It intelligently extracts structured data from free-form text and pre-fills form fields, significantly reducing manual data entry.

## Architecture Components

### 1. Frontend Component (`AIAssistant.tsx`)

**Location:** `frontend/components/AIAssistant.tsx`

**Purpose:** React component that provides the UI for interacting with the AI assistant.

**Key Features:**
- Modal-based interface with prompt input
- Review and edit screen for AI-generated data
- Field-by-field editing before applying to form
- Loading states and error handling
- Support for complex data types (arrays, objects, nested structures)

**Props:**
```typescript
interface AIAssistantProps {
  formType: string;              // Type of form (e.g., 'product', 'feature', 'task')
  context?: any;                 // Contextual information (product, module, etc.)
  fieldOptions?: Record<string, FieldOption>;  // Available options for dropdown fields
  section?: string;              // Workflow section (e.g., 'strategy', 'discovery', 'execution')
  onFillFields: (fields: Record<string, any>) => void;  // Callback to populate form
  className?: string;             // Optional CSS class
  initialPrompt?: string;        // Pre-populated prompt text
}
```

**State Management:**
- `open`: Controls modal visibility
- `prompt`: User's natural language input
- `loading`: API request status
- `error`: Error messages
- `reviewData`: Original AI response
- `editableData`: Editable copy of AI response

### 2. API Route (`/api/ai/assist`)

**Location:** `frontend/app/api/ai/assist/route.ts`

**Purpose:** Next.js API route that acts as a proxy between the frontend and Gemini API.

**Responsibilities:**
- Receives form type, prompt, and context from frontend
- Fetches product context from backend API (if productId provided)
- Builds context-aware system prompts
- Calls Gemini API with structured prompts
- Parses and validates JSON responses
- Returns structured data to frontend

**Key Functions:**

#### `POST /api/ai/assist`
Main handler that:
1. Extracts request parameters (prompt, formType, context, fieldOptions, section, productId)
2. Fetches product context from backend (`/api/products/{productId}/context`)
3. Builds system prompt using `buildSystemPrompt()`
4. Calls Gemini API (`gemini-3-flash-preview` model)
5. Extracts JSON from response
6. Returns parsed data

#### `buildSystemPrompt(formType, context, fieldOptions, section, productContext)`
Constructs the system prompt that guides the AI:
- **Expert Role Assignment:** Assigns domain-specific expert personas based on section/formType
- **Context Integration:** Incorporates product context (strategies, features, tasks, etc.)
- **Field Definitions:** Specifies available fields and their types
- **Field Options:** Lists valid values for dropdown fields
- **Format Instructions:** Provides JSON structure and validation rules

#### `buildContextSection(productContext, formType, section)`
Intelligently builds context sections based on:
- **Section Type:** Strategy, Discovery, Prioritization, Execution, Stakeholders, Metrics
- **Relevant Data:** Only includes context relevant to the current form type
- **Data Filtering:** Limits context to most relevant items (top 5-20 items)

### 3. Backend Product Context API

**Location:** `backend/app/routers/product_context.py`

**Purpose:** Provides comprehensive product context for AI assistant.

**Endpoint:** `GET /api/products/{product_id}/context`

**Returns:**
```typescript
interface ProductContext {
  product: Product;
  strategies: Strategy[];
  features: Feature[];
  tasks: Task[];
  problems: Problem[];
  insights: Insight[];
  releases: Release[];
  stakeholders: Stakeholder[];
  metrics: Metric[];
  workstreams: Workstream[];
  decisions: Decision[];
}
```

**Usage:** The AI assistant uses this context to:
- Avoid duplication (check existing items)
- Maintain consistency (align with existing strategies/features)
- Provide relevant references (link to related items)
- Understand product state (current priorities, active work)

### 4. Gemini API Integration

**Model:** `gemini-3-flash-preview`

**API Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`

**Authentication:** API key from `GEMINI_API_KEY` environment variable

**Request Format:**
```json
{
  "contents": [{
    "parts": [{
      "text": "<system_prompt>\n\nUser request: <user_prompt>\n\nPlease provide a JSON response..."
    }]
  }]
}
```

**Response Format:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "{ \"name\": \"...\", \"description\": \"...\" }"
      }]
    }
  }]
}
```

## Data Flow

```
┌─────────────┐
│   User      │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. User clicks "AI Assist" button
       │ 2. Enters natural language prompt
       │
       ▼
┌─────────────────────┐
│  AIAssistant.tsx    │
│  (React Component)  │
└──────┬──────────────┘
       │
       │ 3. POST /api/ai/assist
       │    { prompt, formType, context, fieldOptions, section, productId }
       │
       ▼
┌─────────────────────────────┐
│  /api/ai/assist (Next.js)    │
│  (API Route Handler)         │
└──────┬───────────────────────┘
       │
       │ 4. Fetch product context (if productId)
       │    GET /api/products/{productId}/context
       │
       ▼
┌─────────────────────────────┐
│  Backend API                │
│  (FastAPI)                   │
└──────┬───────────────────────┘
       │
       │ 5. Return ProductContext
       │
       ▼
┌─────────────────────────────┐
│  /api/ai/assist             │
│  (Continues processing)     │
└──────┬───────────────────────┘
       │
       │ 6. Build system prompt
       │    - Expert role assignment
       │    - Context integration
       │    - Field definitions
       │
       │ 7. Call Gemini API
       │    POST https://generativelanguage.googleapis.com/...
       │
       ▼
┌─────────────────────────────┐
│  Google Gemini API           │
│  (External Service)          │
└──────┬───────────────────────┘
       │
       │ 8. Return JSON response
       │
       ▼
┌─────────────────────────────┐
│  /api/ai/assist              │
│  (Parse & validate)          │
└──────┬───────────────────────┘
       │
       │ 9. Extract JSON from response
       │ 10. Return { data: parsedData }
       │
       ▼
┌─────────────────────────────┐
│  AIAssistant.tsx             │
│  (Display review screen)     │
└──────┬───────────────────────┘
       │
       │ 11. User reviews/edits fields
       │ 12. User clicks "Apply to Form"
       │
       ▼
┌─────────────────────────────┐
│  Form Component              │
│  (via onFillFields callback) │
└─────────────────────────────┘
```

## Expert Role System

The AI assistant uses domain-specific expert personas to provide contextually appropriate responses:

### Strategy Expert
- **Section:** `strategy` or `formType === 'strategy'`
- **Expertise:** Product vision, strategic roadmaps, OKRs, market analysis
- **Context Includes:** Existing strategies, vision documents, OKRs, related features

### Discovery Expert
- **Section:** `discovery` or `formType === 'problem' || 'interview'`
- **Expertise:** Customer problems, interviews, validation, customer segments
- **Context Includes:** Existing problems, customer insights, related features

### Prioritization Expert
- **Section:** `prioritization` or `formType === 'feature'`
- **Expertise:** RICE scoring, value vs. effort, Kano model, stakeholder alignment
- **Context Includes:** Existing features with RICE scores, active tasks, planned releases

### Execution Expert
- **Section:** `execution` or `formType === 'task'`
- **Expertise:** Task breakdown, effort estimation, dependencies, agile methodologies
- **Context Includes:** Existing tasks, related features, workstreams, blockers

### Stakeholders Expert
- **Section:** `stakeholders`
- **Expertise:** Stakeholder communication, status reports, executive communication
- **Context Includes:** Existing stakeholders, communication preferences

### Metrics Expert
- **Section:** `metrics`
- **Expertise:** KPIs, success metrics, outcome-based development
- **Context Includes:** Existing metrics, OKRs with targets

## Form Type System

Each form type has a specific configuration in `buildSystemPrompt()`:

### Supported Form Types

1. **`product`** - Product creation
   - Fields: `name`, `description`

2. **`feature`** - Feature creation with RICE scoring
   - Fields: `name`, `description`, `priority`, `status`, `rice_reach`, `rice_impact`, `rice_confidence`, `rice_effort`

3. **`task`** - Task creation
   - Fields: `title`, `description`, `status`, `priority`, `estimated_hours`, `due_date`
   - Context-aware: Includes module context if applicable

4. **`strategy`** - Strategy, vision, and OKR creation
   - Fields: `type` (vision/strategy/okr), `title`, `description`, `status`, `objectives` (OKR only), `key_results` (OKR only)
   - Intelligent type detection based on user description

5. **`problem`** - Problem statement creation
   - Fields: `title`, `description`, `status`, `priority`, `problem_statement`, `customer_segment`, `frequency`, `severity`

6. **`interview`** - Customer interview tracking
   - Fields: `interviewee_name`, `interviewee_email`, `date`, `notes`

7. **`module`** - Module creation
   - Fields: `name`, `description`, `status`
   - Field options: Status dropdown with labels

8. **`resource`** - Resource creation
   - Fields: `name`, `role`, `cost_per_hour`, `email`, `skills`

9. **`cost_item`** - Simple cost item creation
   - Fields: `name`, `amount`, `currency`, `description`

10. **`cost`** - Comprehensive cost creation
    - Fields: `name`, `scope`, `category`, `cost_type`, `amount`, `currency`, `recurrence`, `cost_classification`, `description`, `amortization_period`
    - Field options: All dropdown fields with labels

### Adding New Form Types

To add support for a new form type:

1. **Add case in `buildSystemPrompt()`:**
```typescript
case 'your_form_type':
  return `${basePrompt}
Form type: Your Form Type
Fields: field1 (type), field2 (type), ...
Context: ${JSON.stringify(context || {})}
Return JSON: { "field1": "...", "field2": ... }`;
```

2. **Use in component:**
```typescript
<AIAssistant
  formType="your_form_type"
  context={{ /* relevant context */ }}
  onFillFields={handleAIFill}
/>
```

## Context-Aware Prompting

### Product Context Integration

When `productId` is provided, the system:

1. **Fetches comprehensive product context** from backend
2. **Selectively includes relevant data** based on form type and section:
   - Strategy forms: Include strategies, vision, OKRs, related features
   - Discovery forms: Include problems, insights, customer feedback
   - Prioritization forms: Include features with RICE scores, tasks, releases
   - Execution forms: Include tasks, features, workstreams, blockers
   - Stakeholder forms: Include stakeholders, communication preferences
   - Metrics forms: Include metrics, OKRs with targets

3. **Provides guidance** to AI:
   - Avoid duplication (check existing items)
   - Maintain consistency (align with existing data)
   - Reference related items
   - Understand current product state

### Context Format

The context section in prompts follows this structure:

```
=== CURRENT PRODUCT CONTEXT ===
Product: "Product Name"
Description: Product description

--- Relevant Section Data ---
- Item 1 with metadata
- Item 2 with metadata
...

=== END PRODUCT CONTEXT ===
IMPORTANT: Use the above context to ensure consistency...
```

## Field Options System

The `fieldOptions` prop allows forms to specify valid values for dropdown fields:

```typescript
fieldOptions={{
  status: {
    options: ['todo', 'in_progress', 'done'],
    labels: {
      todo: 'To Do',
      in_progress: 'In Progress',
      done: 'Done'
    }
  },
  priority: {
    options: ['low', 'medium', 'high', 'critical'],
    labels: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical'
    }
  }
}}
```

The system prompt automatically includes these options with labels, ensuring the AI uses exact values.

## Integration Pattern

### Standard Integration Steps

1. **Import AIAssistant:**
```typescript
import AIAssistant from '../AIAssistant';
```

2. **Create handler function:**
```typescript
const handleAIFill = (fields: Record<string, any>) => {
  if (fields.name) setName(fields.name);
  if (fields.description) setDescription(fields.description);
  // Map all form fields
};
```

3. **Add to form header:**
```typescript
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <h3>Form Title</h3>
  {!existingItem && (
    <AIAssistant
      formType="form_type"
      context={{ product, productId: product.id }}
      fieldOptions={{ /* dropdown options */ }}
      section="workflow_section"
      initialPrompt="Pre-filled prompt"
      onFillFields={handleAIFill}
    />
  )}
</div>
```

### Best Practices

1. **Only show for new items:** Don't display AI assistant when editing existing items
2. **Provide rich context:** Include product, module, and related data in context
3. **Use field options:** Specify dropdown options to ensure valid values
4. **Set initial prompts:** Pre-fill prompts with context (e.g., "Create a feature for module X")
5. **Handle errors gracefully:** Show user-friendly error messages
6. **Validate AI output:** Always allow users to review and edit before applying

## Configuration

### Environment Variables

**Required:**
- `GEMINI_API_KEY`: Google Gemini API key

**Optional:**
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:8000`)

### Setup

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env.local`:
```bash
GEMINI_API_KEY=your_api_key_here
```
3. Restart development server

## Error Handling

### Frontend Errors
- **API key not configured:** Shows error message
- **Network errors:** Displays user-friendly error
- **Invalid JSON response:** Falls back to description field
- **Empty response:** Shows error message

### Backend Errors
- **Product context fetch fails:** Continues without context (graceful degradation)
- **Gemini API errors:** Returns error response with status code
- **JSON parsing fails:** Returns text as description field

## Security Considerations

1. **API Key Protection:**
   - Stored server-side in environment variables
   - Never exposed to client
   - Calls made from Next.js API route only

2. **Input Validation:**
   - User prompts are sanitized (trimmed)
   - JSON responses are validated before parsing
   - Field values are validated against expected types

3. **Rate Limiting:**
   - Gemini API has rate limits
   - Consider implementing client-side rate limiting for production

## Performance Considerations

1. **Product Context Caching:**
   - Context is fetched on each request
   - Consider caching for frequently accessed products

2. **Prompt Size:**
   - Context sections are filtered to most relevant items
   - Limits context to 5-20 items per section

3. **API Response Time:**
   - Gemini API typically responds in 1-3 seconds
   - Loading states provide user feedback

## Extension Points

### Custom Field Types

The review screen supports:
- **Simple fields:** Text, numbers
- **Long text:** Textareas for strings > 100 chars
- **Arrays:** JSON textarea with parsing
- **Objects:** JSON textarea with parsing
- **Special arrays:** Custom handling for `objectives` and `key_results`

To add custom field handling, modify the review screen rendering logic in `AIAssistant.tsx`.

### Custom Expert Roles

Add new expert roles in `buildSystemPrompt()`:
```typescript
if (section === 'your_section') {
  return `You are a Your Domain Expert...`;
}
```

### Custom Context Sections

Extend `buildContextSection()` to include new data types:
```typescript
if (isYourSection) {
  if (yourData.length > 0) {
    contextParts.push(`\n--- Your Data ---`);
    yourData.forEach(item => {
      contextParts.push(`  - "${item.name}"`);
    });
  }
}
```

## Testing

### Manual Testing
1. Test each form type with various prompts
2. Verify context integration works correctly
3. Test error handling (invalid API key, network errors)
4. Verify field options are respected

### Integration Testing
1. Test full flow from user input to form population
2. Test with and without product context
3. Test with various field option configurations

## Future Enhancements

1. **Conversation History:** Maintain conversation context across multiple interactions
2. **Multi-turn Refinement:** Allow users to refine AI suggestions through follow-up prompts
3. **Template System:** Pre-defined templates for common scenarios
4. **Learning from User Edits:** Use user corrections to improve future suggestions
5. **Batch Operations:** Generate multiple items from a single prompt
6. **Voice Input:** Support voice-to-text for prompts
7. **Image Analysis:** Support image uploads for visual requirements

## Related Documentation

- [AI Assistant Setup Guide](./AI_ASSISTANT_SETUP.md) - Setup and configuration
- [AI Assistant Integration Guide](./AI_ASSISTANT_INTEGRATION.md) - Integration patterns
- [README.md](../README.md) - Overall project documentation

