# State Taxonomy

| State             | Meaning                                         | User-actionable exit                                 |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------- |
| idle              | No active source.                               | Load demo, CSV, or video.                            |
| loading-source    | File is being decoded or parsed.                | Wait.                                                |
| loaded-empty      | A source loaded but produced no usable samples. | Load another file or inspect errors.                 |
| loaded-some       | A normal-size track is ready.                   | Fit, export, or replace input.                       |
| loaded-many       | A large track is ready.                         | Fit, export, or reduce sample rate.                  |
| analyzing         | Video frames are being sampled and tracked.     | Cancel or wait.                                      |
| fitting           | JavaScript or SciPy fit is running.             | Wait.                                                |
| cancelled         | The last long operation was cancelled.          | Run again or load another input.                     |
| error-recoverable | Input has domain errors but state is intact.    | Follow the suggested fix or load another file.       |
| error-fatal       | Browser storage or runtime failed unexpectedly. | Export available data, reload, or clear local state. |

No state is allowed to trap the user without a visible action.
