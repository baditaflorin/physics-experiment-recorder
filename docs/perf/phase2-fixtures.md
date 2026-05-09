# Phase 2 Fixture Performance

Measured locally on May 9, 2026 with Vitest covering all ten real-data fixtures.

| Metric                                         | Result                   |
| ---------------------------------------------- | ------------------------ |
| Fixture count                                  | 10                       |
| Import + inference + JavaScript fit assertions | Passed                   |
| Full domain test suite                         | 17 tests in about 1 s    |
| Median target                                  | Below 300 ms per fixture |
| Worst-case target                              | Below 1 s per fixture    |

The CSV fixture set is small enough for synchronous parsing, while video frame
analysis remains off the main thread in the OpenCV worker with progress and
cancellation.
