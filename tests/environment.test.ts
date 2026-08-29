import { describe, it, expect } from '@jest/globals';
import '@testing-library/jest-dom';

describe('Test Environment', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have jest-dom matchers', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello World';
    expect(div).toHaveTextContent('Hello World');
  });
});
