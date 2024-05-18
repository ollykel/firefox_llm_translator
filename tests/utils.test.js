const { formatJSON } = require('../utils');

const CASES_formatJSON =
[
  [{}, '{}'],
  [{'hello': 'world'}, '{"hello": "world"}']
];

describe('formatJSON', () =>
{
  for (const i in CASES_formatJSON)
  {
    const [input, expected] = CASES_formatJSON[i];
    const desc = `[${i}]: expect ${expected}`;

    test(desc, () => expect(formatJSON(input)).toBe(expected));
  }// end for (const i in CASES_formatJSON)
});
