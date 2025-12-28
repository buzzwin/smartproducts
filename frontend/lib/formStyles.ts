/** Shared responsive form styles */

export const formStyles = {
  container: {
    padding: 'clamp(16px, 4vw, 24px)',
  },
  title: {
    marginBottom: '20px',
    fontSize: 'clamp(16px, 4vw, 20px)',
    fontWeight: 600,
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
  },
  error: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '6px',
    color: '#c33',
    fontSize: '14px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap' as const,
    marginTop: '20px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    minWidth: '80px',
    flex: '1 1 auto',
    maxWidth: '150px',
  },
  buttonCancel: {
    backgroundColor: '#6c757d',
    color: '#fff',
  },
  buttonSubmit: {
    backgroundColor: '#007bff',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    color: '#fff',
    cursor: 'not-allowed',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  gridSmall: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
};

