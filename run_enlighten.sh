#!/bin/bash
cd /root/repos/LifeOS
claude --dangerously-skip-permissions --print 'Read ENLIGHTENMENT_TASK.md and follow every step. Do not stop until gh pr create has succeeded and you output the PR URL.'
