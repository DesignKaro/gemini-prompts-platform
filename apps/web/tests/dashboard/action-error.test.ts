import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionError } from '../../app/components/dashboard/action-error';

describe('ActionError', () => {
  it('renders request id when present in message', () => {
    render(React.createElement(ActionError, { error: 'dashboard.test: failed (Request ID: req_123)' }));
    expect(screen.getByText('Request ID: req_123')).toBeInTheDocument();
  });
});
