import { truncate, debounce, el } from '../src/utils.js';

describe('utils', () => {
  test('truncate short text unchanged', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  test('truncate long text appended ellipsis', () => {
    const s = 'a'.repeat(200);
    expect(truncate(s, 100).endsWith('…')).toBe(true);
  });

  test('debounce delays calls', (done) => {
    let called = 0;
    const fn = debounce(() => { called++; }, 50);
    fn(); fn(); fn();
    setTimeout(() => {
      expect(called).toBe(1);
      done();
    }, 150);
  });

  test('el creates element with attrs and class', () => {
    const d = el('div', 'myclass', { 'data-test': 'x' });
    expect(d.tagName.toLowerCase()).toBe('div');
    expect(d.className).toBe('myclass');
    expect(d.getAttribute('data-test')).toBe('x');
  });
});
