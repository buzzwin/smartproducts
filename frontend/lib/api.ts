/** API client for backend communication */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      
      // Handle FastAPI validation errors (422)
      if (response.status === 422 && Array.isArray(error.detail)) {
        const validationErrors = error.detail
          .map((e: any) => {
            const field = e.loc?.slice(1).join('.') || 'unknown';
            return `${field}: ${e.msg}`;
          })
          .join(', ');
        throw new Error(`Validation error: ${validationErrors}`);
      }
      
      // Handle other error formats
      if (error.detail) {
        throw new Error(typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail));
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${API_URL}. Make sure the backend server is running.`);
    }
    
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timeout: Backend at ${API_URL} is not responding. Please check if the server is running.`);
    }
    
    throw err;
  }
}

// Products API
export const productsAPI = {
  getAll: () => fetchAPI<import('../types').Product[]>('/api/products'),
  getById: (id: string) => fetchAPI<import('../types').Product>(`/api/products/${id}`),
  create: (product: Omit<import('../types').Product, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  update: (id: string, product: Partial<import('../types').Product>) =>
    fetchAPI<import('../types').Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/products/${id}`, { method: 'DELETE' }),
  getTCO: (productId: string, timePeriodMonths: number = 12) =>
    fetchAPI<import('../types').TCOBreakdown>(`/api/products/${productId}/tco?time_period_months=${timePeriodMonths}`),
  updateTCO: (productId: string, timePeriodMonths: number = 12) =>
    fetchAPI<import('../types').Product>(`/api/products/${productId}/tco/update?time_period_months=${timePeriodMonths}`, {
      method: 'POST',
    }),
  getTCOBreakdown: (productId: string, timePeriodMonths: number = 12) =>
    fetchAPI<import('../types').TCOBreakdown>(`/api/products/${productId}/tco/breakdown?time_period_months=${timePeriodMonths}`),
  getTCOByScope: (productId: string, scope: string, timePeriodMonths: number = 12) =>
    fetchAPI<{ product_id: string; scope: string; total: number; currency: string; time_period_months: number; costs: any[] }>(
      `/api/products/${productId}/tco/scope/${scope}?time_period_months=${timePeriodMonths}`
    ),
};

// Costs API
export const costsAPI = {
  getAll: (params?: { product_id?: string; scenario_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.scenario_id) query.append('scenario_id', params.scenario_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').CostItem[]>(
      `/api/costs${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').CostItem>(`/api/costs/${id}`),
  getTotals: (params?: { product_id?: string; scenario_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.scenario_id) query.append('scenario_id', params.scenario_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').CostTotals>(
      `/api/costs/totals${queryString ? `?${queryString}` : ''}`
    );
  },
  create: (cost: Omit<import('../types').CostItem, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').CostItem>('/api/costs', {
      method: 'POST',
      body: JSON.stringify(cost),
    }),
  update: (id: string, cost: Partial<import('../types').CostItem>) =>
    fetchAPI<import('../types').CostItem>(`/api/costs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cost),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/costs/${id}`, { method: 'DELETE' }),
};

// Scenarios API
export const scenariosAPI = {
  getAll: () => fetchAPI<import('../types').CostScenario[]>('/api/scenarios'),
  getById: (id: string) => fetchAPI<import('../types').CostScenario>(`/api/scenarios/${id}`),
  create: (scenario: Omit<import('../types').CostScenario, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').CostScenario>('/api/scenarios', {
      method: 'POST',
      body: JSON.stringify(scenario),
    }),
};

// Features API
export const featuresAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; parent_feature_id?: string; owner?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.parent_feature_id) query.append('parent_feature_id', params.parent_feature_id);
    if (params?.owner) query.append('owner', params.owner);
    const queryString = query.toString();
    return fetchAPI<import('../types').Feature[]>(
      `/api/features${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Feature>(`/api/features/${id}`),
  create: (feature: Omit<import('../types').Feature, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Feature>('/api/features', {
      method: 'POST',
      body: JSON.stringify(feature),
    }),
  update: (id: string, feature: Partial<import('../types').Feature>) =>
    fetchAPI<import('../types').Feature>(`/api/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(feature),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/features/${id}`, { method: 'DELETE' }),
};

// Resources API
export const resourcesAPI = {
  getAll: (params?: { type?: string; skill?: string }) => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.skill) query.append('skill', params.skill);
    const queryString = query.toString();
    return fetchAPI<import('../types').Resource[]>(
      `/api/resources${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Resource>(`/api/resources/${id}`),
  create: (resource: Omit<import('../types').Resource, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Resource>('/api/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    }),
  update: (id: string, resource: Partial<import('../types').Resource>) =>
    fetchAPI<import('../types').Resource>(`/api/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(resource),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/resources/${id}`, { method: 'DELETE' }),
};

// Note: Capabilities API removed - use Features API with parent_feature_id for hierarchy

// Workstreams API
export const workstreamsAPI = {
  getAll: (params?: { product_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').Workstream[]>(
      `/api/workstreams${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Workstream>(`/api/workstreams/${id}`),
  create: (workstream: Omit<import('../types').Workstream, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Workstream>('/api/workstreams', {
      method: 'POST',
      body: JSON.stringify(workstream),
    }),
  update: (id: string, workstream: Partial<import('../types').Workstream>) =>
    fetchAPI<import('../types').Workstream>(`/api/workstreams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workstream),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/workstreams/${id}`, { method: 'DELETE' }),
};

// Phases API
export const phasesAPI = {
  getAll: () => fetchAPI<import('../types').Phase[]>('/api/phases'),
  getById: (id: string) => fetchAPI<import('../types').Phase>(`/api/phases/${id}`),
  create: (phase: Omit<import('../types').Phase, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Phase>('/api/phases', {
      method: 'POST',
      body: JSON.stringify(phase),
    }),
  update: (id: string, phase: Partial<import('../types').Phase>) =>
    fetchAPI<import('../types').Phase>(`/api/phases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(phase),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/phases/${id}`, { method: 'DELETE' }),
};

// Tasks API
export const tasksAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; feature_id?: string; problem_id?: string; workstream_id?: string; phase_id?: string; assignee_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.feature_id) query.append('feature_id', params.feature_id);
    if (params?.problem_id) query.append('problem_id', params.problem_id);
    if (params?.workstream_id) query.append('workstream_id', params.workstream_id);
    if (params?.phase_id) query.append('phase_id', params.phase_id);
    if (params?.assignee_id) query.append('assignee_id', params.assignee_id);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return fetchAPI<import('../types').Task[]>(
      `/api/tasks${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Task>(`/api/tasks/${id}`),
  create: (task: Omit<import('../types').Task, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),
  update: (id: string, task: Partial<import('../types').Task>) =>
    fetchAPI<import('../types').Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
};

// Strategies API
export const strategiesAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; type?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.type) query.append('strategy_type', params.type);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return fetchAPI<import('../types').Strategy[]>(
      `/api/strategies${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Strategy>(`/api/strategies/${id}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').Strategy[]>(`/api/strategies/product/${productId}${query}`);
  },
  create: (strategy: Omit<import('../types').Strategy, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Strategy>('/api/strategies', {
      method: 'POST',
      body: JSON.stringify(strategy),
    }),
  update: (id: string, strategy: Partial<import('../types').Strategy>) =>
    fetchAPI<import('../types').Strategy>(`/api/strategies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(strategy),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/strategies/${id}`, { method: 'DELETE' }),
};

// Problems API
export const problemsAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; capability_id?: string; status?: string; priority?: string; feature_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.capability_id) query.append('capability_id', params.capability_id);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.feature_id) query.append('feature_id', params.feature_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').Problem[]>(
      `/api/problems${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Problem>(`/api/problems/${id}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').Problem[]>(`/api/problems/product/${productId}${query}`);
  },
  create: (problem: Omit<import('../types').Problem, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Problem>('/api/problems', {
      method: 'POST',
      body: JSON.stringify(problem),
    }),
  update: (id: string, problem: Partial<import('../types').Problem>) =>
    fetchAPI<import('../types').Problem>(`/api/problems/${id}`, {
      method: 'PUT',
      body: JSON.stringify(problem),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/problems/${id}`, { method: 'DELETE' }),
  linkInsight: (problemId: string, insightId: string) =>
    fetchAPI<import('../types').Problem>(`/api/problems/${problemId}/link-insight?insight_id=${insightId}`, {
      method: 'POST',
    }),
  linkTask: (problemId: string, taskId: string) =>
    fetchAPI<import('../types').Problem>(`/api/problems/${problemId}/link-task?task_id=${taskId}`, {
      method: 'POST',
    }),
  unlinkTask: (problemId: string, taskId: string) =>
    fetchAPI<import('../types').Problem>(`/api/problems/${problemId}/unlink-task/${taskId}`, {
      method: 'DELETE',
    }),
};

// Interviews API
export const interviewsAPI = {
  getAll: (params?: { product_id?: string; module_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').Interview[]>(
      `/api/interviews${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Interview>(`/api/interviews/${id}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').Interview[]>(`/api/interviews/product/${productId}${query}`);
  },
  create: (interview: Omit<import('../types').Interview, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Interview>('/api/interviews', {
      method: 'POST',
      body: JSON.stringify(interview),
    }),
  update: (id: string, interview: Partial<import('../types').Interview>) =>
    fetchAPI<import('../types').Interview>(`/api/interviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(interview),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/interviews/${id}`, { method: 'DELETE' }),
};

// Decisions API
export const decisionsAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; entity_type?: string; entity_id?: string; decision_maker?: string; outcome?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.entity_id) query.append('entity_id', params.entity_id);
    if (params?.decision_maker) query.append('decision_maker', params.decision_maker);
    if (params?.outcome) query.append('outcome', params.outcome);
    const queryString = query.toString();
    return fetchAPI<import('../types').Decision[]>(
      `/api/decisions${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Decision>(`/api/decisions/${id}`),
  getByEntity: (entityType: string, entityId: string) => 
    fetchAPI<import('../types').Decision[]>(`/api/decisions/entity/${entityType}/${entityId}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').Decision[]>(`/api/decisions/product/${productId}${query}`);
  },
  create: (decision: Omit<import('../types').Decision, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Decision>('/api/decisions', {
      method: 'POST',
      body: JSON.stringify(decision),
    }),
  update: (id: string, decision: Partial<import('../types').Decision>) =>
    fetchAPI<import('../types').Decision>(`/api/decisions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(decision),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/decisions/${id}`, { method: 'DELETE' }),
};

// Releases API
export const releasesAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return fetchAPI<import('../types').Release[]>(
      `/api/releases${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Release>(`/api/releases/${id}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').Release[]>(`/api/releases/product/${productId}${query}`);
  },
  create: (release: Omit<import('../types').Release, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Release>('/api/releases', {
      method: 'POST',
      body: JSON.stringify(release),
    }),
  update: (id: string, release: Partial<import('../types').Release>) =>
    fetchAPI<import('../types').Release>(`/api/releases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(release),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/releases/${id}`, { method: 'DELETE' }),
  addFeature: (releaseId: string, featureId: string) =>
    fetchAPI<import('../types').Release>(`/api/releases/${releaseId}/add-feature?feature_id=${featureId}`, {
      method: 'POST',
    }),
};

// Stakeholders API
export const stakeholdersAPI = {
  getAll: (params?: { product_id?: string; module_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').Stakeholder[]>(
      `/api/stakeholders${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Stakeholder>(`/api/stakeholders/${id}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').Stakeholder[]>(`/api/stakeholders/product/${productId}${query}`);
  },
  create: (stakeholder: Omit<import('../types').Stakeholder, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Stakeholder>('/api/stakeholders', {
      method: 'POST',
      body: JSON.stringify(stakeholder),
    }),
  update: (id: string, stakeholder: Partial<import('../types').Stakeholder>) =>
    fetchAPI<import('../types').Stakeholder>(`/api/stakeholders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stakeholder),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/stakeholders/${id}`, { method: 'DELETE' }),
};

// Status Reports API
export const statusReportsAPI = {
  getAll: (params?: { product_id?: string; module_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').StatusReport[]>(
      `/api/status-reports${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').StatusReport>(`/api/status-reports/${id}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').StatusReport[]>(`/api/status-reports/product/${productId}${query}`);
  },
  create: (report: Omit<import('../types').StatusReport, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').StatusReport>('/api/status-reports', {
      method: 'POST',
      body: JSON.stringify(report),
    }),
  update: (id: string, report: Partial<import('../types').StatusReport>) =>
    fetchAPI<import('../types').StatusReport>(`/api/status-reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(report),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/status-reports/${id}`, { method: 'DELETE' }),
};

// Metrics API
export const metricsAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; scope?: string; scope_id?: string; metric_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.scope) query.append('scope', params.scope);
    if (params?.scope_id) query.append('scope_id', params.scope_id);
    if (params?.metric_type) query.append('metric_type', params.metric_type);
    const queryString = query.toString();
    return fetchAPI<import('../types').Metric[]>(
      `/api/metrics${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Metric>(`/api/metrics/${id}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').Metric[]>(`/api/metrics/product/${productId}${query}`);
  },
  getSummaryCounts: (productId: string, moduleId?: string) => {
    const query = moduleId ? `&module_id=${moduleId}` : '';
    return fetchAPI<{
      scope: 'product' | 'module';
      product_id: string;
      module_id?: string;
      module_name?: string;
      counts: {
        problems: number;
        features: number;
        tasks: number;
      };
      task_status: {
        todo: number;
        in_progress: number;
        blocked: number;
        done: number;
      };
      modules?: Array<{
        module_id: string;
        module_name: string;
        counts: {
          problems: number;
          features: number;
          tasks: number;
        };
        task_status: {
          todo: number;
          in_progress: number;
          blocked: number;
          done: number;
        };
      }>;
    }>(`/api/metrics/summary/counts?product_id=${productId}${query}`);
  },
  getAnalytics: (productId?: string) => {
    const query = productId ? `?product_id=${productId}` : '';
    return fetchAPI<{ total_metrics: number; outcome_metrics: number; output_metrics: number; health_metrics: number; on_track: number; metrics: any[] }>(
      `/api/metrics/analytics/summary${query}`
    );
  },
  create: (metric: Omit<import('../types').Metric, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Metric>('/api/metrics', {
      method: 'POST',
      body: JSON.stringify(metric),
    }),
  update: (id: string, metric: Partial<import('../types').Metric>) =>
    fetchAPI<import('../types').Metric>(`/api/metrics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(metric),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/metrics/${id}`, { method: 'DELETE' }),
};

// Outcomes API
export const outcomesAPI = {
  getAll: (params?: { product_id?: string; feature_id?: string; metric_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.feature_id) query.append('feature_id', params.feature_id);
    if (params?.metric_id) query.append('metric_id', params.metric_id);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return fetchAPI<import('../types').Outcome[]>(
      `/api/outcomes${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Outcome>(`/api/outcomes/${id}`),
  getByProduct: (productId: string) => 
    fetchAPI<import('../types').Outcome[]>(`/api/outcomes/product/${productId}`),
  create: (outcome: Omit<import('../types').Outcome, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Outcome>('/api/outcomes', {
      method: 'POST',
      body: JSON.stringify(outcome),
    }),
  update: (id: string, outcome: Partial<import('../types').Outcome>) =>
    fetchAPI<import('../types').Outcome>(`/api/outcomes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(outcome),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/outcomes/${id}`, { method: 'DELETE' }),
};

// Insights API
export const insightsAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; feature_id?: string; problem_id?: string; capability_id?: string; status?: string; source?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.feature_id) query.append('feature_id', params.feature_id);
    if (params?.problem_id) query.append('problem_id', params.problem_id);
    if (params?.capability_id) query.append('capability_id', params.capability_id);
    if (params?.status) query.append('status', params.status);
    if (params?.source) query.append('source', params.source);
    const queryString = query.toString();
    return fetchAPI<import('../types').Insight[]>(
      `/api/insights${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Insight>(`/api/insights/${id}`),
  getByProduct: (productId: string, moduleId?: string) => {
    const query = moduleId ? `?module_id=${moduleId}` : '';
    return fetchAPI<import('../types').Insight[]>(`/api/insights/product/${productId}${query}`);
  },
  create: (insight: Omit<import('../types').Insight, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Insight>('/api/insights', {
      method: 'POST',
      body: JSON.stringify(insight),
    }),
  update: (id: string, insight: Partial<import('../types').Insight>) =>
    fetchAPI<import('../types').Insight>(`/api/insights/${id}`, {
      method: 'PUT',
      body: JSON.stringify(insight),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/insights/${id}`, { method: 'DELETE' }),
};

// Prioritization Models API
export const prioritizationModelsAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; applies_to?: string; is_active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.applies_to) query.append('applies_to', params.applies_to);
    if (params?.is_active !== undefined) query.append('is_active', params.is_active.toString());
    const queryString = query.toString();
    return fetchAPI<import('../types').PrioritizationModel[]>(
      `/api/prioritization-models${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').PrioritizationModel>(`/api/prioritization-models/${id}`),
  getActive: (productId: string, appliesTo: string) =>
    fetchAPI<import('../types').PrioritizationModel>(`/api/prioritization-models/product/${productId}/active?applies_to=${appliesTo}`),
  create: (model: Omit<import('../types').PrioritizationModel, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').PrioritizationModel>('/api/prioritization-models', {
      method: 'POST',
      body: JSON.stringify(model),
    }),
  update: (id: string, model: Partial<import('../types').PrioritizationModel>) =>
    fetchAPI<import('../types').PrioritizationModel>(`/api/prioritization-models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(model),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/prioritization-models/${id}`, { method: 'DELETE' }),
};

// Priority Scores API
export const priorityScoresAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; entity_type?: string; entity_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.entity_id) query.append('entity_id', params.entity_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').PriorityScore[]>(
      `/api/priority-scores${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').PriorityScore>(`/api/priority-scores/${id}`),
  getLatest: (entityType: string, entityId: string) =>
    fetchAPI<import('../types').PriorityScore>(`/api/priority-scores/entity/${entityType}/${entityId}/latest`),
  create: (score: Omit<import('../types').PriorityScore, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').PriorityScore>('/api/priority-scores', {
      method: 'POST',
      body: JSON.stringify(score),
    }),
  update: (id: string, score: Partial<import('../types').PriorityScore>) =>
    fetchAPI<import('../types').PriorityScore>(`/api/priority-scores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(score),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/priority-scores/${id}`, { method: 'DELETE' }),
};

// Roadmaps API
export const roadmapsAPI = {
  getAll: (params?: { product_id?: string; module_id?: string; roadmap_type?: string; is_active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.roadmap_type) query.append('roadmap_type', params.roadmap_type);
    if (params?.is_active !== undefined) query.append('is_active', params.is_active.toString());
    const queryString = query.toString();
    return fetchAPI<import('../types').Roadmap[]>(
      `/api/roadmaps${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Roadmap>(`/api/roadmaps/${id}`),
  getActive: (productId: string) =>
    fetchAPI<import('../types').Roadmap[]>(`/api/roadmaps/product/${productId}/active`),
  create: (roadmap: Omit<import('../types').Roadmap, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Roadmap>('/api/roadmaps', {
      method: 'POST',
      body: JSON.stringify(roadmap),
    }),
  update: (id: string, roadmap: Partial<import('../types').Roadmap>) =>
    fetchAPI<import('../types').Roadmap>(`/api/roadmaps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roadmap),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/roadmaps/${id}`, { method: 'DELETE' }),
};

// Unified Costs API
export const unifiedCostsAPI = {
  getAll: (params?: { 
    product_id?: string; 
    module_id?: string;
    scope?: string; 
    scope_id?: string; 
    category?: string; 
    cost_type?: string;
    resource_id?: string;
    feature_id?: string;
    cost_classification?: 'run' | 'change';
  }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.scope) query.append('scope', params.scope);
    if (params?.scope_id) query.append('scope_id', params.scope_id);
    if (params?.category) query.append('category', params.category);
    if (params?.cost_type) query.append('cost_type', params.cost_type);
    if (params?.resource_id) query.append('resource_id', params.resource_id);
    if (params?.feature_id) query.append('feature_id', params.feature_id);
    if (params?.cost_classification) query.append('cost_classification', params.cost_classification);
    const queryString = query.toString();
    return fetchAPI<import('../types').Cost[]>(
      `/api/unified-costs${queryString ? `?${queryString}` : ''}`
    );
  },
  getByProduct: (productId: string) =>
    fetchAPI<import('../types').Cost[]>(`/api/unified-costs?product_id=${productId}`),
  getByModule: (productId: string, moduleId: string) =>
    fetchAPI<import('../types').Cost[]>(`/api/unified-costs?product_id=${productId}&module_id=${moduleId}`),
  getById: (id: string) => fetchAPI<import('../types').Cost>(`/api/unified-costs/${id}`),
  getSharedCosts: (productId: string) =>
    fetchAPI<import('../types').Cost[]>(`/api/unified-costs/product/${productId}/shared`),
  getTaskCosts: (productId: string, moduleId?: string, featureId?: string, costClassification?: 'run' | 'change') => {
    const query = new URLSearchParams();
    if (moduleId) query.append('module_id', moduleId);
    if (featureId) query.append('feature_id', featureId);
    if (costClassification) query.append('cost_classification', costClassification);
    const queryString = query.toString();
    return fetchAPI<any[]>(`/api/unified-costs/product/${productId}/task-costs${queryString ? `?${queryString}` : ''}`);
  },
  getFeatureCosts: (productId: string, moduleId?: string, costClassification?: 'run' | 'change') => {
    const query = new URLSearchParams();
    if (moduleId) query.append('module_id', moduleId);
    if (costClassification) query.append('cost_classification', costClassification);
    const queryString = query.toString();
    return fetchAPI<any[]>(`/api/unified-costs/product/${productId}/feature-costs${queryString ? `?${queryString}` : ''}`);
  },
  getResourceCosts: (productId: string, moduleId?: string, costClassification?: 'run' | 'change') => {
    const query = new URLSearchParams();
    if (moduleId) query.append('module_id', moduleId);
    if (costClassification) query.append('cost_classification', costClassification);
    const queryString = query.toString();
    return fetchAPI<any>(`/api/unified-costs/product/${productId}/resource-costs${queryString ? `?${queryString}` : ''}`);
  },
  getClassificationSummary: (productId: string, moduleId?: string) => {
    const query = new URLSearchParams();
    if (moduleId) query.append('module_id', moduleId);
    const queryString = query.toString();
    return fetchAPI<any>(`/api/unified-costs/product/${productId}/classification-summary${queryString ? `?${queryString}` : ''}`);
  },
  create: (cost: Omit<import('../types').Cost, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Cost>('/api/unified-costs', {
      method: 'POST',
      body: JSON.stringify(cost),
    }),
  update: (id: string, cost: Partial<import('../types').Cost>) =>
    fetchAPI<import('../types').Cost>(`/api/unified-costs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cost),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/unified-costs/${id}`, { method: 'DELETE' }),
};

// Revenue Models API
export const revenueModelsAPI = {
  getAll: (params?: { product_id?: string; is_active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.is_active !== undefined) query.append('is_active', params.is_active.toString());
    const queryString = query.toString();
    return fetchAPI<import('../types').RevenueModel[]>(
      `/api/revenue-models${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').RevenueModel>(`/api/revenue-models/${id}`),
  getActive: (productId: string) =>
    fetchAPI<import('../types').RevenueModel>(`/api/revenue-models/product/${productId}/active`),
  create: (model: Omit<import('../types').RevenueModel, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').RevenueModel>('/api/revenue-models', {
      method: 'POST',
      body: JSON.stringify(model),
    }),
  update: (id: string, model: Partial<import('../types').RevenueModel>) =>
    fetchAPI<import('../types').RevenueModel>(`/api/revenue-models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(model),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/revenue-models/${id}`, { method: 'DELETE' }),
};

// Pricing Tiers API
export const pricingTiersAPI = {
  getAll: (params?: { product_id?: string; revenue_model_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.revenue_model_id) query.append('revenue_model_id', params.revenue_model_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').PricingTier[]>(
      `/api/pricing-tiers${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').PricingTier>(`/api/pricing-tiers/${id}`),
  create: (tier: Omit<import('../types').PricingTier, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').PricingTier>('/api/pricing-tiers', {
      method: 'POST',
      body: JSON.stringify(tier),
    }),
  update: (id: string, tier: Partial<import('../types').PricingTier>) =>
    fetchAPI<import('../types').PricingTier>(`/api/pricing-tiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tier),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/pricing-tiers/${id}`, { method: 'DELETE' }),
};

// Usage Metrics API
export const usageMetricsAPI = {
  getAll: (params?: { product_id?: string; metric_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.metric_type) query.append('metric_type', params.metric_type);
    const queryString = query.toString();
    return fetchAPI<import('../types').UsageMetric[]>(
      `/api/usage-metrics${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').UsageMetric>(`/api/usage-metrics/${id}`),
  create: (metric: Omit<import('../types').UsageMetric, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').UsageMetric>('/api/usage-metrics', {
      method: 'POST',
      body: JSON.stringify(metric),
    }),
  update: (id: string, metric: Partial<import('../types').UsageMetric>) =>
    fetchAPI<import('../types').UsageMetric>(`/api/usage-metrics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(metric),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/usage-metrics/${id}`, { method: 'DELETE' }),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params?: { user_id?: string; organization_id?: string; read?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.user_id) query.append('user_id', params.user_id);
    if (params?.organization_id) query.append('organization_id', params.organization_id);
    if (params?.read !== undefined) query.append('read', params.read.toString());
    const queryString = query.toString();
    return fetchAPI<import('../types').Notification[]>(
      `/api/notifications${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Notification>(`/api/notifications/${id}`),
  getUnreadCount: (userId: string, organizationId?: string) => {
    const query = organizationId ? `?organization_id=${organizationId}` : '';
    return fetchAPI<{ user_id: string; organization_id?: string; unread_count: number }>(
      `/api/notifications/user/${userId}/unread-count${query}`
    );
  },
  create: (notification: Omit<import('../types').Notification, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Notification>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    }),
  update: (id: string, notification: Partial<import('../types').Notification>) =>
    fetchAPI<import('../types').Notification>(`/api/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(notification),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/notifications/${id}`, { method: 'DELETE' }),
  markAsRead: (id: string) =>
    fetchAPI<import('../types').Notification>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }),
};

// Modules API
export const modulesAPI = {
  getAll: (params?: { product_id?: string; owner_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', params.product_id);
    if (params?.owner_id) query.append('owner_id', params.owner_id);
    const queryString = query.toString();
    return fetchAPI<import('../types').Module[]>(
      `/api/modules${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: string) => fetchAPI<import('../types').Module>(`/api/modules/${id}`),
  getByProduct: (productId: string) => {
    // Add cache-busting timestamp to prevent stale data
    const timestamp = Date.now();
    return fetchAPI<import('../types').Module[]>(`/api/modules?product_id=${productId}&_t=${timestamp}`);
  },
  getByOwner: (ownerId: string) =>
    fetchAPI<import('../types').Module[]>(`/api/modules?owner_id=${ownerId}`),
  getDefault: (productId: string) =>
    fetchAPI<import('../types').Module>(`/api/modules/product/${productId}/default`),
  create: (module: Omit<import('../types').Module, 'id' | 'created_at' | 'updated_at'>) =>
    fetchAPI<import('../types').Module>('/api/modules', {
      method: 'POST',
      body: JSON.stringify(module),
    }),
  update: (id: string, module: Partial<import('../types').Module>) =>
    fetchAPI<import('../types').Module>(`/api/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(module),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/modules/${id}`, { method: 'DELETE' }),
};

// Cloud Configs API
export const cloudConfigsAPI = {
  getAll: (organizationId: string, provider?: string) => {
    const query = new URLSearchParams();
    query.append('organization_id', organizationId);
    if (provider) query.append('provider', provider);
    return fetchAPI<import('../types').CloudConfig[]>(
      `/api/cloud-configs?${query.toString()}`
    );
  },
  getById: (configId: string, organizationId: string) =>
    fetchAPI<import('../types').CloudConfig>(
      `/api/cloud-configs/${configId}?organization_id=${organizationId}`
    ),
  create: (organizationId: string, config: any) =>
    fetchAPI<import('../types').CloudConfig>(
      `/api/cloud-configs?organization_id=${organizationId}`,
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    ),
  update: (configId: string, organizationId: string, config: Partial<import('../types').CloudConfig>) =>
    fetchAPI<import('../types').CloudConfig>(
      `/api/cloud-configs/${configId}?organization_id=${organizationId}`,
      {
        method: 'PUT',
        body: JSON.stringify(config),
      }
    ),
  delete: (configId: string, organizationId: string) =>
    fetchAPI<void>(
      `/api/cloud-configs/${configId}?organization_id=${organizationId}`,
      { method: 'DELETE' }
    ),
  test: (configId: string, organizationId: string) =>
    fetchAPI<{ status: string; message: string }>(
      `/api/cloud-configs/${configId}/test?organization_id=${organizationId}`,
      { method: 'POST' }
    ),
  activate: (configId: string, organizationId: string) =>
    fetchAPI<import('../types').CloudConfig>(
      `/api/cloud-configs/${configId}/activate?organization_id=${organizationId}`,
      { method: 'POST' }
    ),
  deactivate: (configId: string, organizationId: string) =>
    fetchAPI<import('../types').CloudConfig>(
      `/api/cloud-configs/${configId}/deactivate?organization_id=${organizationId}`,
      { method: 'POST' }
    ),
};

// AWS Costs API
export const awsCostsAPI = {
  sync: (
    organizationId: string,
    productId: string,
    configId: string,
    options?: {
      moduleId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const body: any = {
      product_id: productId,
      config_id: configId,
      dry_run: false,
    };
    if (options?.moduleId) body.module_id = options.moduleId;
    if (options?.startDate) body.start_date = options.startDate;
    if (options?.endDate) body.end_date = options.endDate;
    
    return fetchAPI<{
      created_count: number;
      updated_count: number;
      skipped_count: number;
      costs: import('../types').Cost[];
      errors: string[];
    }>(
      `/api/aws-costs/sync?organization_id=${organizationId}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },
  preview: (
    organizationId: string,
    productId: string,
    configId: string,
    options?: {
      moduleId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const query = new URLSearchParams();
    query.append('organization_id', organizationId);
    query.append('product_id', productId);
    query.append('config_id', configId);
    if (options?.moduleId) query.append('module_id', options.moduleId);
    if (options?.startDate) query.append('start_date', options.startDate);
    if (options?.endDate) query.append('end_date', options.endDate);
    
    // Preview endpoint returns AWSCostSyncResponse (same as sync, but with dry_run=True)
    return fetchAPI<{
      created_count: number;
      updated_count: number;
      skipped_count: number;
      costs: import('../types').Cost[];
      errors: string[];
    }>(`/api/aws-costs/preview?${query.toString()}`);
  },
};

