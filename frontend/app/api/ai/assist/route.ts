import { NextRequest, NextResponse } from 'next/server';
import type { ProductContext } from '@/lib/productContext';

// Mark this route as dynamic since it makes dynamic API calls
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { prompt, formType, context, fieldOptions, section, productId } = await request.json();
    
    // Fetch product context if productId is provided
    // Use internal API_URL (not NEXT_PUBLIC) to call backend directly from server
    let productContext: ProductContext | null = null;
    if (productId) {
      try {
        const backendUrl = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:8000';
        const contextResponse = await fetch(`${backendUrl}/api/products/${productId}/context`);
        if (contextResponse.ok) {
          productContext = await contextResponse.json();
        } else {
          console.warn(`Failed to fetch product context: ${contextResponse.status}`);
        }
      } catch (err) {
        console.error('Error fetching product context:', err);
        // Continue without context if fetch fails
      }
    }

    // Get Gemini API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Build the context-aware prompt
    const systemPrompt = buildSystemPrompt(formType, context, fieldOptions, section, productContext);
    const fullPrompt = `${systemPrompt}\n\nUser request: ${prompt}\n\nPlease provide a JSON response with the form fields filled in based on the user's request.`;

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
    let parsedData;
    try {
      // Look for JSON in the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, try to parse the whole response
        parsedData = JSON.parse(generatedText);
      }
    } catch (e) {
      // If JSON parsing fails, return the text as a description field
      parsedData = {
        description: generatedText,
        ai_suggestion: generatedText
      };
    }

    return NextResponse.json({ data: parsedData });
  } catch (error) {
    console.error('AI assist error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(
  formType: string, 
  context: any, 
  fieldOptions?: any, 
  section?: string,
  productContext?: ProductContext | null
): string {
  // Define role-based expert personas for each section
  const getExpertRole = (section?: string, formType?: string): string => {
    if (section === 'strategy' || formType === 'strategy') {
      return `You are a Product Strategy and Vision Expert Consultant with deep expertise in:
- Crafting compelling product visions that inspire teams and stakeholders
- Developing strategic roadmaps aligned with business objectives
- Creating effective OKRs (Objectives and Key Results) that drive measurable outcomes
- Balancing long-term vision with short-term execution
- Market analysis and competitive positioning
- Product-market fit strategies

Your responses should reflect strategic thinking, clarity of vision, and actionable insights.`;
    }
    
    if (section === 'discovery' || formType === 'problem' || formType === 'interview') {
      return `You are a Customer Discovery and Problem Definition Expert Consultant with deep expertise in:
- Identifying and articulating customer problems and pain points
- Conducting effective customer interviews and extracting insights
- Validating problem-solution fit
- Understanding customer segments and personas
- Analyzing customer feedback and sentiment
- Prioritizing problems based on frequency, severity, and business impact

Your responses should be customer-centric, data-driven, and focused on real user needs.`;
    }
    
    if (section === 'prioritization' || formType === 'feature') {
      return `You are a Product Prioritization and Decision-Making Expert Consultant with deep expertise in:
- RICE scoring (Reach, Impact, Confidence, Effort) methodology
- Value vs. Effort prioritization frameworks
- Kano model analysis (basic, performance, delight features)
- Making data-driven feature prioritization decisions
- Balancing user needs, business goals, and technical constraints
- Stakeholder alignment and communication

Your responses should include well-reasoned prioritization scores and clear rationale.`;
    }
    
    if (section === 'execution' || formType === 'task') {
      return `You are a Product Execution and Delivery Expert Consultant with deep expertise in:
- Breaking down features into actionable tasks
- Estimating effort and capacity planning
- Managing dependencies and blockers
- Tracking velocity and delivery metrics
- Agile and Scrum methodologies
- Risk management and mitigation strategies

Your responses should be practical, actionable, and focused on delivery excellence.`;
    }
    
    if (section === 'stakeholders') {
      return `You are a Stakeholder Communication and Management Expert Consultant with deep expertise in:
- Identifying and mapping stakeholders
- Tailoring communication for different audiences
- Creating effective status reports and updates
- Managing expectations and building alignment
- Executive communication and presentation
- Cross-functional collaboration

Your responses should be clear, concise, and appropriate for the stakeholder audience.`;
    }
    
    if (section === 'metrics') {
      return `You are a Product Metrics and Outcomes Expert Consultant with deep expertise in:
- Defining success metrics and KPIs
- Leading vs. lagging indicators
- Setting realistic targets and tracking progress
- Outcome-based product development
- Data analysis and interpretation
- Connecting metrics to business outcomes

Your responses should be metric-driven, specific, and measurable.`;
    }
    
    // Default role
    return `You are a Product Management Expert Consultant helping to fill out product management forms. Based on the user's free-form request, fill in the appropriate form fields with expert-level insights.`;
  };

  const expertRole = getExpertRole(section, formType);
  
  // Build context section if product context is available
  let contextSection = '';
  if (productContext) {
    contextSection = buildContextSection(productContext, formType, section);
  }
  
  const basePrompt = `${expertRole}${contextSection}\n\nYour task is to help fill out product management forms. Based on the user's free-form request, fill in the appropriate form fields with thoughtful, expert-level content.`;

  // Helper to format field options
  const formatFieldOptions = (fieldName: string, options?: any): string => {
    if (!options || !options.options) return '';
    const opts = options.options;
    const labels = options.labels || {};
    const formatted = opts.map((opt: string) => {
      const label = labels[opt] || opt;
      return `${opt} (${label})`;
    }).join(', ');
    return `\nAvailable ${fieldName} options: ${formatted}. You MUST use one of these exact values.`;
  };

  switch (formType) {
    case 'product':
      return `${basePrompt}
Form type: Product
Fields: name (string), description (string)
Context: ${JSON.stringify(context || {})}
Return JSON: { "name": "...", "description": "..." }`;

    case 'feature':
      return `${basePrompt}
Form type: Feature
Fields: name (string), description (string), priority (low/medium/high/critical), status (todo/in_progress/done/blocked), rice_reach (number), rice_impact (0-1), rice_confidence (0-1), rice_effort (number)
Context: ${JSON.stringify(context || {})}
Return JSON: { "name": "...", "description": "...", "priority": "...", "status": "...", "rice_reach": ..., "rice_impact": ..., "rice_confidence": ..., "rice_effort": ... }`;

    case 'task': {
      const statusOptions = formatFieldOptions('status', fieldOptions?.status);
      const priorityOptions = formatFieldOptions('priority', fieldOptions?.priority);
      const moduleContext = context?.moduleId && context?.moduleName
        ? `\nNOTE: This task is being created for the module "${context.moduleName}". The task should be specific to this module's context.`
        : context?.moduleId
        ? `\nNOTE: This task is being created for a specific module. Make it module-specific rather than product-wide.`
        : `\nNOTE: This task is being created at the product level.`;
      
      return `${basePrompt}
Form type: Task${statusOptions}${priorityOptions}${moduleContext}
Fields: title (string), description (string), status (todo/in_progress/blocked/done), priority (low/medium/high/critical), estimated_hours (number), due_date (ISO date string)
Context: ${JSON.stringify(context || {})}
Return JSON: { "title": "...", "description": "...", "status": "...", "priority": "...", "estimated_hours": ..., "due_date": "..." }`;
    }

    case 'strategy': {
      const typeOptions = formatFieldOptions('type', fieldOptions?.type);
      const statusOptions = formatFieldOptions('status', fieldOptions?.status);
      
      // Determine strategy type from context or user request
      const strategyType = context?.strategyType || 'strategy'; // Default to 'strategy' if not specified
      const moduleName = context?.moduleName;
      const scope = context?.scope || 'product';
      
      const typeGuidance = fieldOptions?.type 
        ? `\nIMPORTANT: The "type" field must be one of: ${fieldOptions.type.options.join(', ')}. Based on the user's request, determine the most appropriate type:
- "vision": For long-term product vision and direction
- "strategy": For strategic plans and approaches
- "okr": For Objectives and Key Results (must include objectives and key_results arrays)`
        : '';
      
      const moduleContext = moduleName 
        ? `\nNOTE: This strategy is being created for the module "${moduleName}". The strategy should be specific to this module's context and goals.`
        : scope === 'module' && context?.moduleId
        ? `\nNOTE: This strategy is being created for a specific module. Make it module-specific rather than product-wide.`
        : `\nNOTE: This strategy is being created at the product level and should apply to the entire product.`;
      
      const typeHint = strategyType && strategyType !== 'strategy'
        ? `\nHINT: The user may be creating a "${strategyType}" type strategy, but you should determine the most appropriate type based on their description.`
        : '';
      
      return `${basePrompt}
Form type: Strategy${typeOptions}${statusOptions}${typeGuidance}${moduleContext}${typeHint}
Fields: type (vision/strategy/okr), title (string), description (string), status (draft/active/archived), objectives (array of strings - only for OKR type), key_results (array of {description: string, target: string} - only for OKR type)
Context: ${JSON.stringify(context || {})}
Return JSON: { "type": "...", "title": "...", "description": "...", "status": "...", "objectives": [...], "key_results": [...] }
IMPORTANT: 
- Determine the most appropriate "type" (vision/strategy/okr) based on the user's description
- If the user mentions "vision", "long-term direction", "where we're going", use type "vision"
- If the user mentions "strategy", "plan", "approach", "how we'll achieve", use type "strategy"  
- If the user mentions "OKR", "objectives", "key results", "metrics", "targets", use type "okr"
- If type is "okr", you MUST include both objectives (array of strings) and key_results (array of {description: string, target: string}) arrays
- For "vision" or "strategy" types, omit objectives and key_results fields`;
    }

    case 'problem':
      return `${basePrompt}
Form type: Problem
Fields: title (string), description (string), status (identified/validating/prioritized/addressed/dismissed), priority (low/medium/high/critical), problem_statement (string), customer_segment (string), frequency (daily/weekly/monthly), severity (low/medium/high)
Context: ${JSON.stringify(context || {})}
Return JSON: { "title": "...", "description": "...", "status": "...", "priority": "...", "problem_statement": "...", "customer_segment": "...", "frequency": "...", "severity": "..." }`;

    case 'interview':
      return `${basePrompt}
Form type: Interview
Fields: interviewee_name (string), interviewee_email (string), date (ISO date string), notes (string)
Context: ${JSON.stringify(context || {})}
Return JSON: { "interviewee_name": "...", "interviewee_email": "...", "date": "...", "notes": "..." }`;

    case 'module': {
      const statusOptions = formatFieldOptions('status', fieldOptions?.status);
      return `${basePrompt}
Form type: Module${statusOptions}
Fields: name (string), description (string), status (ideation/in_development/production/maintenance/archived)
Context: ${JSON.stringify(context || {})}
Return JSON: { "name": "...", "description": "...", "status": "..." }
IMPORTANT: The "status" field must be one of: ideation, in_development, production, maintenance, archived. Choose the most appropriate status based on the user's description.`;
    }

    case 'resource':
      return `${basePrompt}
Form type: Resource
Fields: name (string), role (string), cost_per_hour (number), email (string), skills (array of strings)
Context: ${JSON.stringify(context || {})}
Return JSON: { "name": "...", "role": "...", "cost_per_hour": ..., "email": "...", "skills": [...] }`;

    case 'cost_item':
      return `${basePrompt}
Form type: Cost Item
Fields: name (string), amount (number), currency (string, default USD), description (string)
Context: ${JSON.stringify(context || {})}
Return JSON: { "name": "...", "amount": ..., "currency": "USD", "description": "..." }`;

    case 'cost': {
      const scopeOptions = formatFieldOptions('scope', fieldOptions?.scope);
      const categoryOptions = formatFieldOptions('category', fieldOptions?.category);
      const costTypeOptions = formatFieldOptions('cost_type', fieldOptions?.cost_type);
      const recurrenceOptions = formatFieldOptions('recurrence', fieldOptions?.recurrence);
      const classificationOptions = formatFieldOptions('cost_classification', fieldOptions?.cost_classification);
      
      return `${basePrompt}
Form type: Cost${scopeOptions}${categoryOptions}${costTypeOptions}${recurrenceOptions}${classificationOptions}
Fields: 
- name (string, required): Name of the cost item
- scope (string, required): One of: product, module, feature, resource, hardware, software, database, consulting
- category (string, required): One of: build, run, maintain, scale, overhead
- cost_type (string, required): One of: labor, infra, license, vendor, other
- amount (number, required): Cost amount
- currency (string, default "USD"): Currency code
- recurrence (string, required): One of: one-time, monthly, quarterly, annual
- cost_classification (string, optional): One of: run (Run/KTLO), change (Change/Growth)
- description (string, optional): Description of the cost
- amortization_period (number, optional): Amortization period in months (for one-time costs)
Context: ${JSON.stringify(context || {})}
Return JSON: { "name": "...", "scope": "...", "category": "...", "cost_type": "...", "amount": ..., "currency": "USD", "recurrence": "...", "cost_classification": "...", "description": "...", "amortization_period": ... }
IMPORTANT: 
- Determine the most appropriate "scope" based on the user's description (product-level, module-specific, feature-specific, etc.)
- Determine the most appropriate "category" (build for new development, run for ongoing operations, etc.)
- Determine the most appropriate "cost_type" (labor for people costs, infra for infrastructure, etc.)
- Determine the most appropriate "recurrence" (one-time for one-time costs, monthly/quarterly/annual for recurring)
- If the cost is for ongoing operations/maintenance, use cost_classification "run"
- If the cost is for new feature development, use cost_classification "change"`;
    }

    case 'diagram': {
      return `You are a Diagram Design Expert specializing in creating Draw.io (diagrams.net) XML diagrams.

Your task is to generate valid Draw.io XML based on the user's description of a diagram they want to create.

Draw.io XML Format Requirements:
- Must be valid XML starting with <mxfile> tag
- Must contain <diagram> and <mxGraphModel> elements
- Use mxCell elements for shapes, text, and connections
- Each cell needs: id, value (text content), style (comma-separated key=value pairs), and mxGeometry (x, y, width, height)
- Common shapes: rectangle (rounded=1 for rounded), ellipse, rhombus, hexagon
- Use edges (edge="1") to connect shapes with source and target attributes
- Colors: fillColor, strokeColor (hex colors like #ffffff, #000000)
- Text styling: fontSize, fontStyle (1 for bold), align (left/center/right)

CRITICAL XML VALIDATION RULES:
- ALL attribute values MUST be properly quoted with double quotes
- NEVER include unescaped quotes inside attribute values
- If you need quotes in text content, use HTML entities: &quot; for quotes, &lt; for <, &gt; for >, &amp; for &
- For HTML content in value attributes, use entities: &lt;b&gt; for <b>, &lt;br/&gt; for <br/>, etc.
- NEVER put a trailing quote after content in value attributes (e.g., value="text" is WRONG, should be value="text")
- All attribute values must be properly closed with a quote before the next attribute or closing tag

Example structure:
<mxfile host="app.diagrams.net" version="21.6.0">
  <diagram id="diagram1" name="My Diagram">
    <mxGraphModel dx="1422" dy="798" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="850">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="shape1" value="Start Process" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

Example with HTML content in value:
<mxCell id="task1" value="&lt;b&gt;Task Name&lt;/b&gt;&lt;br/&gt;Description text&lt;br/&gt;Due: 1/24/2026" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="200" height="80" as="geometry"/>
</mxCell>

Based on the user's description, create a complete, valid Draw.io XML diagram.
- Use appropriate shapes for different elements (rectangles for processes, diamonds for decisions, ellipses for start/end)
- Add meaningful labels and text
- Connect elements with arrows/edges where relationships exist
- Use colors and styling to make the diagram clear and professional
- Keep the diagram size reasonable (typically 800-1600 width, 600-1200 height)
- Use swimlanes for grouping related elements
- Use proper HTML entities for any special characters in text

Context: ${JSON.stringify(context || {})}
Return JSON: { "diagram_xml": "<mxfile>...</mxfile>" } or { "xml": "<mxfile>...</mxfile>" }
IMPORTANT: 
- Return ONLY the XML string in the diagram_xml or xml field
- The XML must be complete, valid, and well-formed
- ALL quotes in attribute values must be properly escaped or avoided
- Use HTML entities (&lt;, &gt;, &quot;, &amp;) for special characters in text content
- Test that your XML would parse correctly - no unescaped quotes in attributes
- Make the diagram visually clear and well-organized`;
    }

    default:
      return `${basePrompt}
Form type: ${formType}
Context: ${JSON.stringify(context || {})}
Return JSON with appropriate fields based on the form type.`;
  }
}

function buildContextSection(
  productContext: ProductContext,
  formType: string,
  section?: string
): string {
  const { product, strategies, features, tasks, problems, insights, releases, stakeholders, metrics, workstreams } = productContext;
  
  let contextParts: string[] = [];
  
  // Always include product name
  contextParts.push(`\n\n=== CURRENT PRODUCT CONTEXT ===`);
  contextParts.push(`Product: "${product.name}"`);
  if (product.description) {
    contextParts.push(`Description: ${product.description}`);
  }
  
  // Smart context selection based on formType and section
  const isStrategy = section === 'strategy' || formType === 'strategy';
  const isDiscovery = section === 'discovery' || formType === 'problem' || formType === 'interview';
  const isPrioritization = section === 'prioritization' || formType === 'feature';
  const isExecution = section === 'execution' || formType === 'task';
  const isStakeholders = section === 'stakeholders';
  const isMetrics = section === 'metrics';
  
  // Strategy section: Include strategies, vision, OKRs, related features
  if (isStrategy) {
    if (strategies.length > 0) {
      contextParts.push(`\n--- Existing Strategies & Vision ---`);
      strategies.forEach(s => {
        if (s.type === 'vision') {
          contextParts.push(`Vision: "${s.title}" - ${s.description || 'No description'}`);
        } else if (s.type === 'okr') {
          contextParts.push(`OKR: "${s.title}"`);
          if (s.objectives && s.objectives.length > 0) {
            contextParts.push(`  Objectives: ${s.objectives.join('; ')}`);
          }
          if (s.key_results && s.key_results.length > 0) {
            contextParts.push(`  Key Results: ${s.key_results.map(kr => `${kr.description} (Target: ${kr.target})`).join('; ')}`);
          }
        } else {
          contextParts.push(`Strategy: "${s.title}" - ${s.description || 'No description'} (Status: ${s.status})`);
        }
      });
    }
    
    // Include related features that might inform strategy
    if (features.length > 0) {
      const topFeatures = features.slice(0, 5);
      contextParts.push(`\n--- Related Features (for context) ---`);
      topFeatures.forEach(f => {
        const parts = [`"${f.name}"`];
        if ((f as any).priority) parts.push(`Priority: ${(f as any).priority}`);
        if ((f as any).rice_score !== undefined && (f as any).rice_score !== null) parts.push(`RICE: ${(f as any).rice_score}`);
        contextParts.push(`  - ${parts.join(', ')}`);
      });
    }
  }
  
  // Discovery section: Include problems, insights, customer feedback
  if (isDiscovery) {
    if (problems.length > 0) {
      contextParts.push(`\n--- Existing Problems ---`);
      problems.slice(0, 10).forEach(p => {
        const parts = [`"${p.title}"`];
        if (p.status) parts.push(`Status: ${p.status}`);
        if (p.priority) parts.push(`Priority: ${p.priority}`);
        if ((p as any).problem_statement) parts.push(`Problem: ${(p as any).problem_statement.substring(0, 100)}...`);
        contextParts.push(`  - ${parts.join(', ')}`);
      });
    }
    
    if (insights.length > 0) {
      contextParts.push(`\n--- Customer Insights ---`);
      insights.slice(0, 10).forEach(i => {
        const insightTitle = (i as any).observation || i.title || 'Insight';
        const parts = [`"${insightTitle}"`];
        if (i.source) parts.push(`Source: ${i.source}`);
        if (i.votes && i.votes > 0) parts.push(`Votes: ${i.votes}`);
        if (i.sentiment) parts.push(`Sentiment: ${i.sentiment}`);
        contextParts.push(`  - ${parts.join(', ')}`);
      });
    }
    
    // Include related features
    if (features.length > 0) {
      contextParts.push(`\n--- Features Addressing Problems ---`);
      features.filter(f => problems.some(p => p.feature_id === f.id)).slice(0, 5).forEach(f => {
        contextParts.push(`  - "${f.name}"`);
      });
    }
  }
  
  // Prioritization section: Include features with RICE scores, tasks, releases
  if (isPrioritization) {
    if (features.length > 0) {
      contextParts.push(`\n--- Existing Features ---`);
      features.slice(0, 15).forEach(f => {
        const parts = [`"${f.name}"`];
        if ((f as any).priority) parts.push(`Priority: ${(f as any).priority}`);
        if ((f as any).rice_score !== undefined && (f as any).rice_score !== null) {
          parts.push(`RICE: ${(f as any).rice_score}`);
          if ((f as any).rice_reach) parts.push(`Reach: ${(f as any).rice_reach}`);
          if ((f as any).rice_impact) parts.push(`Impact: ${(f as any).rice_impact}`);
          if ((f as any).rice_confidence) parts.push(`Confidence: ${(f as any).rice_confidence}`);
          if ((f as any).rice_effort) parts.push(`Effort: ${(f as any).rice_effort}`);
        }
        contextParts.push(`  - ${parts.join(', ')}`);
      });
    }
    
    if (tasks.length > 0) {
      const activeTasks = tasks.filter(t => t.status !== 'done').slice(0, 10);
      if (activeTasks.length > 0) {
        contextParts.push(`\n--- Active Tasks (for effort estimation) ---`);
        activeTasks.forEach(t => {
          const parts = [`"${t.title}"`];
          if (t.status) parts.push(`Status: ${t.status}`);
          if (t.priority) parts.push(`Priority: ${t.priority}`);
          if ((t as any).estimated_hours) parts.push(`Est: ${(t as any).estimated_hours}h`);
          contextParts.push(`  - ${parts.join(', ')}`);
        });
      }
    }
    
    if (releases.length > 0) {
      contextParts.push(`\n--- Planned Releases ---`);
      releases.slice(0, 5).forEach(r => {
        const parts = [`"${r.name}"`];
        if (r.status) parts.push(`Status: ${r.status}`);
        if (r.target_date) parts.push(`Target: ${r.target_date}`);
        contextParts.push(`  - ${parts.join(', ')}`);
      });
    }
  }
  
  // Execution section: Include tasks, features, workstreams, blockers
  if (isExecution) {
    if (tasks.length > 0) {
      contextParts.push(`\n--- Existing Tasks ---`);
      tasks.slice(0, 20).forEach(t => {
        const parts = [`"${t.title}"`];
        if (t.status) parts.push(`Status: ${t.status}`);
        if (t.priority) parts.push(`Priority: ${t.priority}`);
        if ((t as any).estimated_hours) parts.push(`Est: ${(t as any).estimated_hours}h`);
        if ((t as any).blockers) parts.push(`⚠️ Blocked: ${(t as any).blockers.substring(0, 50)}...`);
        contextParts.push(`  - ${parts.join(', ')}`);
      });
    }
    
    if (features.length > 0) {
      contextParts.push(`\n--- Related Features ---`);
      features.slice(0, 10).forEach(f => {
        contextParts.push(`  - "${f.name}" (${(f as any).priority || 'no priority'})`);
      });
    }
    
    if (workstreams.length > 0) {
      contextParts.push(`\n--- Workstreams ---`);
      workstreams.forEach(w => {
        contextParts.push(`  - "${w.name}"`);
      });
    }
  }
  
  // Stakeholders section: Include stakeholders, status reports
  if (isStakeholders) {
    if (stakeholders.length > 0) {
      contextParts.push(`\n--- Existing Stakeholders ---`);
      stakeholders.forEach(s => {
        const parts = [`"${s.name}"`];
        if (s.role) parts.push(`Role: ${s.role}`);
        if (s.communication_preferences) parts.push(`Prefs: ${s.communication_preferences}`);
        contextParts.push(`  - ${parts.join(', ')}`);
      });
    }
  }
  
  // Metrics section: Include metrics, outcomes, OKRs
  if (isMetrics) {
    if (metrics.length > 0) {
      contextParts.push(`\n--- Existing Metrics ---`);
      metrics.forEach(m => {
        const parts = [`"${m.name}"`];
        if (m.type) parts.push(`Type: ${m.type}`);
        if (m.target_value !== undefined) parts.push(`Target: ${m.target_value} ${m.unit || ''}`);
        if (m.current_value !== undefined) parts.push(`Current: ${m.current_value}`);
        contextParts.push(`  - ${parts.join(', ')}`);
      });
    }
    
    // Include OKRs that might have metrics
    const okrs = strategies.filter(s => s.type === 'okr');
    if (okrs.length > 0) {
      contextParts.push(`\n--- Related OKRs ---`);
      okrs.forEach(okr => {
        contextParts.push(`  - "${okr.title}"`);
        if (okr.key_results && okr.key_results.length > 0) {
          okr.key_results.forEach(kr => {
            contextParts.push(`    → ${kr.description} (Target: ${kr.target})`);
          });
        }
      });
    }
  }
  
  contextParts.push(`\n=== END PRODUCT CONTEXT ===`);
  contextParts.push(`\nIMPORTANT: Use the above context to ensure consistency with existing product data. Reference existing items when relevant, avoid duplication, and align new content with the product's vision and strategy.`);
  
  return contextParts.join('\n');
}

