import { NextRequest, NextResponse } from 'next/server';

interface EntityExtraction {
  entityType: string;
  data: Record<string, any>;
  confidence: number;
}

interface ExtractionResponse {
  entities: EntityExtraction[];
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, productId } = await request.json();
    
    // Get Gemini API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Build system prompt for entity extraction
    const systemPrompt = `You are an intelligent entity extraction assistant for a product management system. 
Your job is to analyze user messages (which may be explicit requests or casual rants) and extract any entities that can be created.

Available entity types and their required fields (fields without ? are REQUIRED):
1. product: { name: string (REQUIRED), description?: string, status?: "active"|"archived"|"deprecated", owner?: string }
2. module: { name: string (REQUIRED), description?: string, product_id: string (REQUIRED), status?: "ideation"|"planning"|"development"|"testing"|"deployment"|"maintenance" }
3. feature: { name: string (REQUIRED), description?: string, product_id: string (REQUIRED), module_id?: string, priority?: "low"|"medium"|"high"|"critical", status?: "backlog"|"planned"|"in_progress"|"completed"|"cancelled" }
4. task: { title: string (REQUIRED), description?: string, product_id: string (REQUIRED), module_id?: string, feature_id?: string, phase_id?: string (can be phase name like "Phase 1" or phase ID), status: "todo"|"in_progress"|"blocked"|"done" (REQUIRED - default to "todo" if not specified), priority: "low"|"medium"|"high"|"critical" (REQUIRED - default to "medium" if not specified), assignee_ids?: string[] (default to []), estimated_hours?: number, due_date?: string }
5. resource: { name: string (REQUIRED), type: "individual"|"organization" (REQUIRED), email?: string, skills?: string[] (default to []), description?: string }
6. phase: { name: string (REQUIRED), description?: string, order: number (REQUIRED - default to 0 if not specified) }
7. workstream: { name: string (REQUIRED), description?: string, product_id: string (REQUIRED), order?: number (default to 0) }
8. problem: { title: string (REQUIRED), description?: string, product_id: string (REQUIRED), module_id?: string, problem_statement?: string, status: "identified"|"validating"|"prioritized"|"addressed"|"dismissed" (REQUIRED - default to "identified" if not specified), priority: "low"|"medium"|"high"|"critical" (REQUIRED - default to "medium" if not specified) }
9. strategy: { type: "vision"|"goals"|"themes"|"assumptions"|"risks"|"strategy"|"okr" (REQUIRED), title: string (REQUIRED), description?: string, product_id: string (REQUIRED), module_id?: string, status: "draft"|"active"|"archived" (REQUIRED - default to "draft" if not specified) }
10. cost: { name: string (REQUIRED), product_id: string (REQUIRED), module_id?: string, amount: number (REQUIRED), currency?: "USD" (default to "USD"), scope?: "product"|"module"|"feature"|"resource"|"hardware"|"software"|"database"|"consulting", category?: "build"|"run"|"maintain"|"scale"|"overhead", cost_type?: "labor"|"infra"|"license"|"vendor"|"other", recurrence?: "one_time"|"monthly"|"quarterly"|"annual", cost_classification?: "run"|"change", description?: string }

Rules:
- Extract ALL entities mentioned in the message, even if the user is just ranting or describing things casually
- If product_id is not provided but a product name is mentioned, try to infer it (but mark as uncertain)
- ALWAYS include REQUIRED fields. If a required field cannot be inferred, use the default value specified in the field definition
- For task: If status is not specified, use "todo". If priority is not specified, use "medium"
- For task: If user mentions "Phase 1", "phase 1", "Phase One", etc., set phase_id to the phase name/identifier (e.g., "Phase 1"). The frontend will match it to the actual phase ID.
- For problem: If status is not specified, use "identified". If priority is not specified, use "medium"
- For strategy: If status is not specified, use "draft"
- For phase: If order is not specified, use 0
- For resource: If skills is not specified, use []
- For task: If assignee_ids is not specified, use []
- Only include optional fields that can be reasonably inferred from the message
- Set confidence score (0-1) based on how certain you are about the extraction
- If the user is asking to edit something, return the entity with an "edit" action
- If the user says "add", "create", "make", "build", etc., mark for creation
- If user says "discard", "cancel", "ignore", mark for discard

Return a JSON object with this structure:
{
  "entities": [
    {
      "entityType": "task",
      "data": { ... },
      "confidence": 0.9
    }
  ],
  "message": "I found 2 entities to create: 1 task and 1 feature"
}

If no entities can be extracted, return:
{
  "entities": [],
  "message": "I couldn't find any entities to create in your message. Could you be more specific?"
}`;

    // Build conversation context
    const conversationContext = conversationHistory 
      ? `Previous conversation:\n${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}\n\n`
      : '';

    const fullPrompt = `${systemPrompt}\n\n${conversationContext}Current user message: ${message}\n\nAnalyze this message and extract any entities that can be created. Return only valid JSON.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }]
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to extract JSON from the response
    let parsedData: ExtractionResponse;
    try {
      // Look for JSON in the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, return empty
        parsedData = {
          entities: [],
          message: "I couldn't parse the response. Please try again."
        };
      }
    } catch (e) {
      console.error('JSON parsing error:', e);
      parsedData = {
        entities: [],
        message: "I had trouble understanding that. Could you rephrase?"
      };
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chatbot request' },
      { status: 500 }
    );
  }
}

