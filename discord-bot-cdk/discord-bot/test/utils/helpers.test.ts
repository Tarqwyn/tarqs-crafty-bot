import { capitalizeName } from '../../src/utils/helpers';

describe('capitalizeName', () => {
  test('capitalizes a single name', () => {
    expect(capitalizeName('john')).toBe('John');
  });

  test('capitalizes multiple words', () => {
    expect(capitalizeName('john doe')).toBe('John Doe');
  });

  test('handles mixed casing', () => {
    expect(capitalizeName('jOhN dOe')).toBe('John Doe');
  });

  test('handles extra spaces', () => {
    expect(capitalizeName('  john   doe  ')).toBe('  John   Doe  ');
  });

  test('handles empty string', () => {
    expect(capitalizeName('')).toBe('');
  });
});
