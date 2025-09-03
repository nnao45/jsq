#!/bin/bash
(
  echo '{"message": [1,2,3]}'
  sleep 2
  echo '$.message'
  sleep 2
) | timeout 10 node dist/index.js --repl --repl-file-mode 2>&1 | grep -E "evaluate\(\) called|Request content:|Verified written|File stats changed|Output file changed|Found callback|No callback"